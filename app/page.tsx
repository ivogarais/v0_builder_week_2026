import Link from "next/link"
import { 
  Brain, 
  Database, 
  Search, 
  Upload, 
  Shield, 
  Zap,
  ArrowRight,
  Github
} from "lucide-react"

const features = [
  {
    name: "Postgres Database",
    description: "Full PostgreSQL database with pgvector for semantic search capabilities.",
    icon: Database,
  },
  {
    name: "Semantic Search",
    description: "Vector embeddings enable natural language search across all your content.",
    icon: Search,
  },
  {
    name: "Asset Storage",
    description: "Store and manage images, documents, and files with Supabase Storage.",
    icon: Upload,
  },
  {
    name: "Row Level Security",
    description: "Built-in authentication and RLS policies protect your data.",
    icon: Shield,
  },
  {
    name: "Real-time APIs",
    description: "RESTful APIs for projects, documents, assets, and search operations.",
    icon: Zap,
  },
  {
    name: "Activity Logging",
    description: "Track all changes and searches with comprehensive activity logs.",
    icon: Brain,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">App Brain</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Production Ready
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-balance">
            The Foundation for Your{" "}
            <span className="text-primary">AI-Powered Apps</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground text-pretty">
            App Brain provides a production-ready backend foundation with Postgres, 
            pgvector semantic search, object storage, and comprehensive APIs. 
            Build knowledge management systems, RAG applications, and more.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="mt-4 text-muted-foreground">
              A complete backend foundation for building AI-powered applications
            </p>
          </div>
          
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.name}</h3>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to Build?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start building your AI-powered application with App Brain
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          <p>Built with Supabase, Next.js, and pgvector</p>
        </div>
      </footer>
    </div>
  )
}
