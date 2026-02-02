import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateProjectRequest, Project, ApiResponse } from '@/lib/types/app-brain'

// GET /api/projects/[id] - Get a single project
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

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Project not found',
      success: false
    }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<Project>>({
    data: project,
    error: null,
    success: true
  })
}

// PATCH /api/projects/[id] - Update a project
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

  let body: UpdateProjectRequest
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
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.status !== undefined) updates.status = body.status
  if (body.metadata !== undefined) updates.metadata = body.metadata

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'No updates provided',
      success: false
    }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !project) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error?.message || 'Project not found',
      success: false
    }, { status: error ? 500 : 404 })
  }

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    project_id: project.id,
    action: 'project_updated',
    details: { updates: Object.keys(updates) }
  })

  return NextResponse.json<ApiResponse<Project>>({
    data: project,
    error: null,
    success: true
  })
}

// DELETE /api/projects/[id] - Soft delete a project
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

  // Soft delete by setting status to 'deleted'
  const { data: project, error } = await supabase
    .from('projects')
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !project) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: error?.message || 'Project not found',
      success: false
    }, { status: error ? 500 : 404 })
  }

  return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
    data: { deleted: true },
    error: null,
    success: true
  })
}
