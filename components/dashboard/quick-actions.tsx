"use client"

import Link from "next/link"
import { 
  FolderPlus, 
  FilePlus, 
  Upload, 
  Search,
  ArrowRight 
} from "lucide-react"

const actions = [
  {
    name: "New Project",
    description: "Create a new project to organize your work",
    href: "/dashboard/projects/new",
    icon: FolderPlus,
  },
  {
    name: "New Document",
    description: "Add a document to an existing project",
    href: "/dashboard/documents/new",
    icon: FilePlus,
  },
  {
    name: "Upload Asset",
    description: "Upload files, images, or media",
    href: "/dashboard/assets/upload",
    icon: Upload,
  },
  {
    name: "Semantic Search",
    description: "Search across all your knowledge",
    href: "/dashboard/search",
    icon: Search,
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-sm font-medium text-foreground">Quick Actions</h3>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className="group flex items-center gap-4 bg-card p-6 transition-colors hover:bg-secondary/50"
          >
            <div className="rounded-lg bg-secondary p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{action.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {action.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  )
}
