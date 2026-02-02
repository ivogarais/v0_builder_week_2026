import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateProjectRequest, Project, ApiResponse, PaginatedResponse } from '@/lib/types/app-brain'

// GET /api/projects - List all projects for the current user
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
  const status = searchParams.get('status') || 'active'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Get total count
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', status)

  // Get paginated results
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error.message,
      success: false
    }, { status: 500 })
  }

  return NextResponse.json<PaginatedResponse<Project>>({
    data: projects || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > to + 1
  })
}

// POST /api/projects - Create a new project
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

  let body: CreateProjectRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Invalid JSON body',
      success: false
    }, { status: 400 })
  }

  if (!body.name || body.name.trim() === '') {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Project name is required',
      success: false
    }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
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
    project_id: project.id,
    action: 'project_created',
    details: { project_name: project.name }
  })

  return NextResponse.json<ApiResponse<Project>>({
    data: project,
    error: null,
    success: true
  }, { status: 201 })
}
