import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Asset, ApiResponse } from '@/lib/types/app-brain'

// GET /api/assets/[id] - Get a single asset with signed URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Unauthorized',
      success: false
    }, { status: 401 })
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !asset) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Asset not found',
      success: false
    }, { status: 404 })
  }

  // Generate signed URL for download (valid for 1 hour)
  const { data: signedUrl } = await supabase.storage
    .from('assets')
    .createSignedUrl(asset.storage_path, 3600)

  return NextResponse.json<ApiResponse<Asset & { download_url?: string }>>({
    data: {
      ...asset,
      download_url: signedUrl?.signedUrl
    },
    error: null,
    success: true
  })
}

// DELETE /api/assets/[id] - Delete an asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Unauthorized',
      success: false
    }, { status: 401 })
  }

  // Get asset to find storage path
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !asset) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Asset not found',
      success: false
    }, { status: 404 })
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('assets')
    .remove([asset.storage_path])

  if (storageError) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: `Failed to delete file: ${storageError.message}`,
      success: false
    }, { status: 500 })
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (dbError) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: dbError.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
    data: { deleted: true },
    error: null,
    success: true
  })
}
