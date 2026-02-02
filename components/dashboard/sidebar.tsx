"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Brain,
  FolderKanban,
  FileText,
  Image,
  Search,
  Activity,
  Settings,
  LogOut
} from "lucide-react"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Brain },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Assets", href: "/dashboard/assets", icon: Image },
  { name: "Search", href: "/dashboard/search", icon: Search },
  { name: "Activity", href: "/dashboard/activity", icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Brain className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">App Brain</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
