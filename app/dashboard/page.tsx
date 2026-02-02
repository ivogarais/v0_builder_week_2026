"use client"

import useSWR from "swr"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { DashboardStats, ApiResponse } from "@/lib/types/app-brain"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DashboardPage() {
  const { data, isLoading } = useSWR<ApiResponse<DashboardStats>>("/api/stats", fetcher)
  
  const stats = data?.data ?? null
  const recentActivity = stats?.recentActivity ?? []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your knowledge base and recent activity
        </p>
      </div>

      <div className="space-y-8">
        <StatsCards stats={stats} isLoading={isLoading} />
        
        <div className="grid gap-8 lg:grid-cols-2">
          <QuickActions />
          <ActivityFeed activities={recentActivity} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
