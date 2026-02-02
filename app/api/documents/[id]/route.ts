import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateDocumentRequest, Document, ApiResponse } from '@/lib/types/app-brain'

// GET /api/documents/[id] - Get a single document
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

  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !document) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Document not found',
      success: false
    }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Document>>({
    data: document,
    error: null,
    success: true
  })
}

// PATCH /api/documents/[id] - Update a document
export async function PATCH(
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

  let body: UpdateDocumentRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Invalid JSON body',
      success: false
    }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.content !== undefined) updates.content = body.content
  if (body.document_type !== undefined) updates.document_type = body.document_type
  if (body.metadata !== undefined) updates.metadata = body.metadata

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'No updates provided',
      success: false
    }, { status: 400 })
  }

  const { data: document, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !document) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error?.message || 'Document not found',
      success: false
    }, { status: error ? 500 : 404 })
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    project_id: document.project_id,
    action: 'document_updated',
    details: { document_id: document.id, updates: Object.keys(updates) }
  })

  return NextResponse.json<ApiResponse<Document>>({
    data: document,
    error: null,
    success: true
  })
}

// DELETE /api/documents/[id] - Delete a document
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

  // First get the document to delete associated embeddings
  const { data: document } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!document) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Document not found',
      success: false
    }, { status: 404 })
  }

  // Delete embeddings first (due to foreign key)
  await supabase
    .from('document_embeddings')
    .delete()
    .eq('document_id', id)

  // Delete the document
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
    data: { deleted: true },
    error: null,
    success: true
  })
}
