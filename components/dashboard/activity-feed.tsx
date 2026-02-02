"use client"

import { 
  FolderPlus, 
  FileEdit, 
  FilePlus, 
  Upload, 
  Search,
  Clock 
} from "lucide-react"
import type { ActivityLog, ActivityAction } from "@/lib/types/app-brain"

interface ActivityFeedProps {
  activities: ActivityLog[]
  isLoading: boolean
}

const actionConfig: Record<ActivityAction, { icon: typeof FolderPlus; label: string; color: string }> = {
  project_created: { icon: FolderPlus, label: "Created project", color: "text-primary" },
  project_updated: { icon: FileEdit, label: "Updated project", color: "text-blue-400" },
  document_created: { icon: FilePlus, label: "Created document", color: "text-primary" },
  document_updated: { icon: FileEdit, label: "Updated document", color: "text-blue-400" },
  asset_uploaded: { icon: Upload, label: "Uploaded asset", color: "text-amber-400" },
  search_performed: { icon: Search, label: "Searched", color: "text-muted-foreground" },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          activities.map((activity) => {
            const config = actionConfig[activity.action]
            const Icon = config.icon
            const details = activity.details as Record<string, string>

            return (
              <div key={activity.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`rounded-full p-2 bg-secondary ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {config.label}
                    {details?.project_name && (
                      <span className="text-muted-foreground"> - {details.project_name}</span>
                    )}
                    {details?.document_title && (
                      <span className="text-muted-foreground"> - {details.document_title}</span>
                    )}
                    {details?.filename && (
                      <span className="text-muted-foreground"> - {details.filename}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
