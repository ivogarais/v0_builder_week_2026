import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateDocumentRequest, Document, ApiResponse, PaginatedResponse } from '@/lib/types/app-brain'

// GET /api/documents - List documents with optional project filter
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
  const documentType = searchParams.get('document_type')

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Build query
  let countQuery = supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  let dataQuery = supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (projectId) {
    countQuery = countQuery.eq('project_id', projectId)
    dataQuery = dataQuery.eq('project_id', projectId)
  }

  if (documentType) {
    countQuery = countQuery.eq('document_type', documentType)
    dataQuery = dataQuery.eq('document_type', documentType)
  }

  const { count } = await countQuery
  const { data: documents, error } = await dataQuery

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<PaginatedResponse<Document>>({
    data: documents || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > to + 1
  })
}

// POST /api/documents - Create a new document
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

  let body: CreateDocumentRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Invalid JSON body',
      success: false
    }, { status: 400 })
  }

  if (!body.project_id || !body.title || body.content === undefined) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'project_id, title, and content are required',
      success: false
    }, { status: 400 })
  }

  // Verify project exists and belongs to user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Project not found',
      success: false
    }, { status: 404 })
  }

  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      project_id: body.project_id,
      user_id: user.id,
      title: body.title.trim(),
      content: body.content,
      document_type: body.document_type || 'note',
      metadata: body.metadata || {}
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    project_id: body.project_id,
    action: 'document_created',
    details: { document_id: document.id, document_title: document.title }
  })

  return NextResponse.json<ApiResponse<Document>>({
    data: document,
    error: null,
    success: true
  }, { status: 201 })
}
