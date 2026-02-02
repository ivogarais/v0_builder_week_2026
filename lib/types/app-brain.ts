// App Brain TypeScript Types
// These types mirror the database schema for type-safe operations

export type ProjectStatus = 'active' | 'archived' | 'deleted'
export type DocumentType = 'markdown' | 'code' | 'note' | 'spec' | 'config'
export type AssetType = 'image' | 'video' | 'audio' | 'pdf' | 'file'
export type ActivityAction = 
  | 'project_created' 
  | 'project_updated' 
  | 'document_created' 
  | 'document_updated' 
  | 'asset_uploaded' 
  | 'search_performed'

// Core entities
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  status: ProjectStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  project_id: string
  user_id: string
  title: string
  content: string
  document_type: DocumentType
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  project_id: string | null
  document_id: string | null
  user_id: string
  filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
  asset_type: AssetType
  metadata: Record<string, unknown>
  created_at: string
}

export interface DocumentEmbedding {
  id: string
  document_id: string
  chunk_index: number
  chunk_text: string
  embedding: number[]
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  project_id: string | null
  action: ActivityAction
  details: Record<string, unknown>
  created_at: string
}

// API request/response types
export interface CreateProjectRequest {
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: ProjectStatus
  metadata?: Record<string, unknown>
}

export interface CreateDocumentRequest {
  project_id: string
  title: string
  content: string
  document_type?: DocumentType
  metadata?: Record<string, unknown>
}

export interface UpdateDocumentRequest {
  title?: string
  content?: string
  document_type?: DocumentType
  metadata?: Record<string, unknown>
}

export interface UploadAssetRequest {
  project_id?: string
  document_id?: string
  file: File
  metadata?: Record<string, unknown>
}

export interface SemanticSearchRequest {
  query: string
  project_id?: string
  limit?: number
  threshold?: number
}

export interface SemanticSearchResult {
  document_id: string
  chunk_text: string
  similarity: number
  document: {
    id: string
    title: string
    project_id: string
  }
}

// API response wrapper
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

// Dashboard stats
export interface DashboardStats {
  totalProjects: number
  totalDocuments: number
  totalAssets: number
  recentActivity: ActivityLog[]
  storageUsed: number
}
