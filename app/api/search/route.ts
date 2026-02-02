import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { SemanticSearchRequest, SemanticSearchResult, ApiResponse } from '@/lib/types/app-brain'

// POST /api/search - Semantic search across documents
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

  let body: SemanticSearchRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Invalid JSON body',
      success: false
    }, { status: 400 })
  }

  if (!body.query || body.query.trim() === '') {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Search query is required',
      success: false
    }, { status: 400 })
  }

  const limit = body.limit || 10
  const threshold = body.threshold || 0.5

  // Generate embedding for query
  // Note: In production, call OpenAI's embedding API
  // For demonstration, using a random vector that would be replaced
  const queryEmbedding = Array(1536).fill(0).map(() => Math.random() * 0.01 - 0.005)

  // Build the RPC call for semantic search
  // Using the match_documents function created in our schema
  const { data: results, error: searchError } = await supabase.rpc(
    'match_documents',
    {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: user.id,
      filter_project_id: body.project_id || null
    }
  )

  if (searchError) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: `Search failed: ${searchError.message}`,
      success: false
    }, { status: 500 })
  }

  // Format results
  const formattedResults: SemanticSearchResult[] = (results || []).map((r: {
    document_id: string
    chunk_text: string
    similarity: number
    title: string
    project_id: string
  }) => ({
    document_id: r.document_id,
    chunk_text: r.chunk_text,
    similarity: r.similarity,
    document: {
      id: r.document_id,
      title: r.title,
      project_id: r.project_id
    }
  }))

  // Log search activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    project_id: body.project_id || null,
    action: 'search_performed',
    details: { 
      query: body.query,
      results_count: formattedResults.length
    }
  })

  return NextResponse.json<ApiResponse<SemanticSearchResult[]>>({
    data: formattedResults,
    error: null,
    success: true
  })
}

// GET /api/search - Full-text search across documents
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
  const query = searchParams.get('q')
  const projectId = searchParams.get('project_id')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!query || query.trim() === '') {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Search query (q) is required',
      success: false
    }, { status: 400 })
  }

  // Full-text search using PostgreSQL text search
  let searchQuery = supabase
    .from('documents')
    .select('id, project_id, title, content, document_type, created_at')
    .eq('user_id', user.id)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(limit)

  if (projectId) {
    searchQuery = searchQuery.eq('project_id', projectId)
  }

  const { data: documents, error } = await searchQuery

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<typeof documents>>({
    data: documents,
    error: null,
    success: true
  })
}
