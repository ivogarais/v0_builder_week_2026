"use client"

import { FolderKanban, FileText, Image, HardDrive } from "lucide-react"
import type { DashboardStats } from "@/lib/types/app-brain"

interface StatsCardsProps {
  stats: DashboardStats | null
  isLoading: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      name: "Projects",
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      description: "Active projects",
    },
    {
      name: "Documents",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      description: "Total documents",
    },
    {
      name: "Assets",
      value: stats?.totalAssets ?? 0,
      icon: Image,
      description: "Uploaded files",
    },
    {
      name: "Storage",
      value: formatBytes(stats?.storageUsed ?? 0),
      icon: HardDrive,
      description: "Total used",
      isString: true,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.name}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {card.name}
            </span>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-secondary" />
            ) : (
              <span className="text-2xl font-bold text-foreground">
                {card.isString ? card.value : card.value.toLocaleString()}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
        </div>
      ))}
    </div>
  )
}
