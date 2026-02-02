import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DashboardStats, ApiResponse } from '@/lib/types/app-brain'

// GET /api/stats - Get dashboard statistics
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: 'Unauthorized',
      success: false
    }, { status: 401 })
  }

  // Fetch all stats in parallel
  const [
    projectsResult,
    documentsResult,
    assetsResult,
    activityResult,
    storageResult
  ] = await Promise.all([
    // Total projects
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
    
    // Total documents
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    
    // Total assets
    supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    
    // Recent activity
    supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Storage used (sum of asset sizes)
    supabase
      .from('assets')
      .select('size_bytes')
      .eq('user_id', user.id)
  ])

  // Calculate total storage
  const storageUsed = (storageResult.data || []).reduce(
    (sum, asset) => sum + (asset.size_bytes || 0),
    0
  )

  const stats: DashboardStats = {
    totalProjects: projectsResult.count || 0,
    totalDocuments: documentsResult.count || 0,
    totalAssets: assetsResult.count || 0,
    recentActivity: activityResult.data || [],
    storageUsed
  }

  return NextResponse.json<ApiResponse<DashboardStats>>({
    data: stats,
    error: null,
    success: true
  })
}
