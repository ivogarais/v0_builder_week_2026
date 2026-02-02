import { createClient } from '../../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '../../../lib/types/app-brain'

// Configuration for chunking
const CHUNK_SIZE = 1000 // characters per chunk
const CHUNK_OVERLAP = 200 // overlap between chunks

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    start = end - CHUNK_OVERLAP
    if (start < 0) start = 0
    if (end === text.length) break
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0)
}

// POST /api/embeddings - Generate and store embeddings for a document
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

  let body: { document_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Invalid JSON body',
      success: false
    }, { status: 400 })
  }

  if (!body.document_id) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'document_id is required',
      success: false
    }, { status: 400 })
  }

  // Verify document exists and get content
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', body.document_id)
    .eq('user_id', user.id)
    .single()

  if (docError || !document) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Document not found',
      success: false
    }, { status: 404 })
  }

  // Delete existing embeddings for this document
  await supabase
    .from('document_embeddings')
    .delete()
    .eq('document_id', body.document_id)

  // Chunk the document content
  const chunks = chunkText(document.content)

  if (chunks.length === 0) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Document has no content to embed',
      success: false
    }, { status: 400 })
  }

  // Generate embeddings using OpenAI
  // Note: In production, you would call OpenAI's API here
  // For now, we'll store placeholder embeddings that can be updated
  // when the user provides their OpenAI API key
  
  const embeddingsToInsert = chunks.map((chunk, index) => ({
    document_id: body.document_id,
    chunk_index: index,
    chunk_text: chunk,
    // Placeholder: 1536 dimensions for text-embedding-3-small
    // In production, replace with actual embedding from OpenAI
    embedding: Array(1536).fill(0).map(() => Math.random() * 0.01 - 0.005)
  }))

  const { error: insertError } = await supabase
    .from('document_embeddings')
    .insert(embeddingsToInsert)

  if (insertError) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: `Failed to store embeddings: ${insertError.message}`,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ chunks_created: number }>>({
    data: { chunks_created: chunks.length },
    error: null,
    success: true
  }, { status: 201 })
}
