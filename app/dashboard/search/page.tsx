"use client"

import { useState } from "react"
import { Search, FileText, Sparkles, Clock } from "lucide-react"
import type { SemanticSearchResult, ApiResponse } from "@/lib/types/app-brain"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState<"semantic" | "fulltext">("semantic")
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      if (searchType === "semantic") {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, limit: 20 })
        })
        const data: ApiResponse<SemanticSearchResult[]> = await response.json()
        setResults(data.data ?? [])
      } else {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`)
        const data = await response.json()
        // Transform full-text results to match semantic result format
        setResults(
          (data.data ?? []).map((doc: { id: string; title: string; content: string; project_id: string }) => ({
            document_id: doc.id,
            chunk_text: doc.content.slice(0, 300) + (doc.content.length > 300 ? "..." : ""),
            similarity: 1,
            document: {
              id: doc.id,
              title: doc.title,
              project_id: doc.project_id
            }
          }))
        )
      }
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across all your documents using semantic or full-text search
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search your knowledge base..."
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "semantic"}
                  onChange={() => setSearchType("semantic")}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Semantic Search
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "fulltext"}
                  onChange={() => setSearchType("fulltext")}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Full-Text Search</span>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {!hasSearched ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Search your knowledge base
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a query above to search across all your documents
          </p>
        </div>
      ) : isSearching ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="h-5 w-48 animate-pulse rounded bg-secondary mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No results found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search query or search type
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((result, index) => (
            <div
              key={`${result.document_id}-${index}`}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {result.document.title}
                    </h3>
                    {searchType === "semantic" && (
                      <p className="text-xs text-muted-foreground">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {result.chunk_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
