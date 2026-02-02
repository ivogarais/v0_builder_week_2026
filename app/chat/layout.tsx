import { ConversationList } from '../../components/chat/conversation-list'
import Link from 'next/link'
import { Bot, Settings, Plug, Smartphone } from 'lucide-react'

// Chat layout with sidebar
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border flex flex-col bg-card">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/chat" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">AgentHub</span>
          </Link>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-hidden">
          <ConversationList />
        </div>

        {/* Bottom Nav */}
        <nav className="border-t border-border p-2">
          <Link
            href="/integrations"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plug className="h-4 w-4" />
            <span className="text-sm">Integrations</span>
          </Link>
          <Link
            href="/devices"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">Devices</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
