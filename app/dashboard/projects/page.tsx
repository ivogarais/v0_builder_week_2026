"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { 
  Plus, 
  FolderKanban, 
  MoreVertical,
  FileText,
  Calendar
} from "lucide-react"
import type { Project, PaginatedResponse } from "@/lib/types/app-brain"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

export default function ProjectsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")

  const { data, isLoading, mutate } = useSWR<PaginatedResponse<Project>>(
    "/api/projects",
    fetcher
  )

  const projects = data?.data ?? []

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription || null
        })
      })

      if (response.ok) {
        setNewProjectName("")
        setNewProjectDescription("")
        setIsCreating(false)
        mutate()
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your work into projects
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Create project form */}
      {isCreating && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create New Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="My Project"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Brief description of the project..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false)
                  setNewProjectName("")
                  setNewProjectDescription("")
                }}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="h-6 w-32 animate-pulse rounded bg-secondary mb-2" />
              <div className="h-4 w-full animate-pulse rounded bg-secondary mb-4" />
              <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to get started
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                </div>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              {project.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  0 docs
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(project.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
