import { ConversationList } from '../../components/chat/conversation-list'
import Link from 'next/link'
import { Bot, Settings, Plug, Smartphone } from 'lucide-react'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/chat" className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">AgentHub</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ConversationList />
        </div>
        
        <nav className="p-2 border-t border-border space-y-1">
          <Link
            href="/integrations"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Plug className="h-4 w-4" />
            Integrations
          </Link>
          <Link
            href="/devices"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            Devices
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
