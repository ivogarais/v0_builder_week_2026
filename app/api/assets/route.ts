import { createClient } from '../../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Asset, AssetType, ApiResponse, PaginatedResponse } from '../../../lib/types/app-brain'

function getAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'file'
}

// GET /api/assets - List assets with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Unauthorized',
      success: false
    }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const projectId = searchParams.get('project_id')
  const documentId = searchParams.get('document_id')
  const assetType = searchParams.get('asset_type')

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Build query
  let countQuery = supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  let dataQuery = supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (projectId) {
    countQuery = countQuery.eq('project_id', projectId)
    dataQuery = dataQuery.eq('project_id', projectId)
  }

  if (documentId) {
    countQuery = countQuery.eq('document_id', documentId)
    dataQuery = dataQuery.eq('document_id', documentId)
  }

  if (assetType) {
    countQuery = countQuery.eq('asset_type', assetType)
    dataQuery = dataQuery.eq('asset_type', assetType)
  }

  const { count } = await countQuery
  const { data: assets, error } = await dataQuery

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<PaginatedResponse<Asset>>({
    data: assets || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > to + 1
  })
}

// POST /api/assets - Upload a new asset
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Unauthorized',
      success: false
    }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('project_id') as string | null
  const documentId = formData.get('document_id') as string | null
  const metadataStr = formData.get('metadata') as string | null

  if (!file) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'File is required',
      success: false
    }, { status: 400 })
  }

  // Validate project if provided
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        error: 'Project not found',
        success: false
      }, { status: 404 })
    }
  }

  // Validate document if provided
  if (documentId) {
    const { data: document } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        error: 'Document not found',
        success: false
      }, { status: 404 })
    }
  }

  // Generate unique storage path
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${user.id}/${timestamp}-${safeName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: `Upload failed: ${uploadError.message}`,
      success: false
    }, { status: 500 })
  }

  // Parse metadata if provided
  let metadata = {}
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr)
    } catch {
      // Ignore invalid JSON
    }
  }

  // Create asset record
  const { data: asset, error: dbError } = await supabase
    .from('assets')
    .insert({
      project_id: projectId || null,
      document_id: documentId || null,
      user_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      asset_type: getAssetType(file.type),
      metadata
    })
    .select()
    .single()

  if (dbError) {
    // Try to clean up uploaded file
    await supabase.storage.from('assets').remove([storagePath])
    
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: dbError.message,
      success: false
    }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    project_id: projectId || null,
    action: 'asset_uploaded',
    details: { 
      asset_id: asset.id, 
      filename: file.name,
      size_bytes: file.size 
    }
  })

  return NextResponse.json<ApiResponse<Asset>>({
    data: asset,
    error: null,
    success: true
  }, { status: 201 })
}
