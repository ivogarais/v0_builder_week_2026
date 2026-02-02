-- App Brain Schema: Core tables for projects, documents, assets, and search
-- Designed for single developer first, scalable to multi-user

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- =============================================================================
-- PROJECTS: Top-level container for all knowledge
-- =============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived', 'paused')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

-- =============================================================================
-- DOCUMENTS: Notes, plans, specs, decisions (the knowledge layer)
-- =============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Document classification
  doc_type text not null check (doc_type in (
    'note',       -- Quick captures, thoughts
    'spec',       -- Technical specifications
    'plan',       -- Roadmaps, milestones
    'decision',   -- ADRs, choices made
    'reference'   -- External links, resources
  )),
  
  -- Core content
  title text not null,
  content text,  -- Markdown content
  summary text,  -- AI-generated or manual summary
  
  -- Organization
  tags text[] not null default '{}',
  parent_id uuid references public.documents(id) on delete set null,
  
  -- Status tracking
  status text not null default 'draft' check (status in ('draft', 'active', 'archived', 'superseded')),
  
  -- Versioning (lightweight)
  version integer not null default 1,
  superseded_by uuid references public.documents(id) on delete set null,
  
  -- Metadata
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- ASSETS: Files, images, PDFs stored in object storage
-- =============================================================================
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- File info
  filename text not null,
  storage_path text not null,  -- Path in Supabase Storage
  mime_type text not null,
  size_bytes bigint not null,
  
  -- Organization
  tags text[] not null default '{}',
  description text,
  
  -- Derived assets (e.g., thumbnail from image, extracted text from PDF)
  parent_asset_id uuid references public.assets(id) on delete cascade,
  asset_type text not null default 'original' check (asset_type in ('original', 'thumbnail', 'extracted', 'processed')),
  
  -- Extracted content for search
  extracted_text text,
  
  -- Metadata
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- =============================================================================
-- DOCUMENT_ASSETS: Link documents to assets (many-to-many)
-- =============================================================================
create table if not exists public.document_assets (
  document_id uuid not null references public.documents(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, asset_id)
);

-- =============================================================================
-- EMBEDDINGS: Vector storage for semantic search
-- =============================================================================
create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  
  -- Source reference (polymorphic)
  source_type text not null check (source_type in ('document', 'asset')),
  source_id uuid not null,
  
  -- The embedding
  embedding vector(1536),  -- OpenAI ada-002 dimension
  
  -- Chunk info (for long documents)
  chunk_index integer not null default 0,
  chunk_text text not null,
  
  -- Metadata
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- =============================================================================
-- ACTIVITY_LOG: Track changes for audit and sync
-- =============================================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- What happened
  action text not null check (action in ('create', 'update', 'delete', 'archive', 'restore')),
  entity_type text not null check (entity_type in ('project', 'document', 'asset')),
  entity_id uuid not null,
  
  -- Change details
  changes jsonb,
  
  created_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES for performance
-- =============================================================================

-- Projects
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_status on public.projects(status);

-- Documents
create index if not exists idx_documents_project_id on public.documents(project_id);
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_doc_type on public.documents(doc_type);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_tags on public.documents using gin(tags);
create index if not exists idx_documents_parent_id on public.documents(parent_id);

-- Full-text search index on documents
create index if not exists idx_documents_fts on public.documents 
  using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Assets
create index if not exists idx_assets_project_id on public.assets(project_id);
create index if not exists idx_assets_user_id on public.assets(user_id);
create index if not exists idx_assets_tags on public.assets using gin(tags);
create index if not exists idx_assets_parent_asset_id on public.assets(parent_asset_id);

-- Full-text search index on assets
create index if not exists idx_assets_fts on public.assets 
  using gin(to_tsvector('english', coalesce(filename, '') || ' ' || coalesce(description, '') || ' ' || coalesce(extracted_text, '')));

-- Embeddings
create index if not exists idx_embeddings_project_id on public.embeddings(project_id);
create index if not exists idx_embeddings_source on public.embeddings(source_type, source_id);

-- Vector similarity index (IVFFlat for faster queries)
create index if not exists idx_embeddings_vector on public.embeddings 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Activity log
create index if not exists idx_activity_log_project_id on public.activity_log(project_id);
create index if not exists idx_activity_log_user_id on public.activity_log(user_id);
create index if not exists idx_activity_log_entity on public.activity_log(entity_type, entity_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.assets enable row level security;
alter table public.document_assets enable row level security;
alter table public.embeddings enable row level security;
alter table public.activity_log enable row level security;

-- Projects: Users can only access their own projects
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

-- Documents: Users can only access documents in their projects
create policy "documents_select_own" on public.documents for select 
  using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert 
  with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update 
  using (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete 
  using (auth.uid() = user_id);

-- Assets: Users can only access assets in their projects
create policy "assets_select_own" on public.assets for select 
  using (auth.uid() = user_id);
create policy "assets_insert_own" on public.assets for insert 
  with check (auth.uid() = user_id);
create policy "assets_update_own" on public.assets for update 
  using (auth.uid() = user_id);
create policy "assets_delete_own" on public.assets for delete 
  using (auth.uid() = user_id);

-- Document assets: Access based on document ownership
create policy "document_assets_select" on public.document_assets for select 
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_assets_insert" on public.document_assets for insert 
  with check (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));
create policy "document_assets_delete" on public.document_assets for delete 
  using (exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()));

-- Embeddings: Access based on project ownership
create policy "embeddings_select_own" on public.embeddings for select 
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "embeddings_insert_own" on public.embeddings for insert 
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "embeddings_delete_own" on public.embeddings for delete 
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- Activity log: Users can only view their own activity
create policy "activity_log_select_own" on public.activity_log for select 
  using (auth.uid() = user_id);
create policy "activity_log_insert_own" on public.activity_log for insert 
  with check (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS: Helper functions for search and operations
-- =============================================================================

-- Full-text search function for documents
create or replace function search_documents(
  p_project_id uuid,
  p_query text,
  p_doc_types text[] default null,
  p_tags text[] default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  title text,
  doc_type text,
  content text,
  tags text[],
  status text,
  rank real,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    d.id,
    d.title,
    d.doc_type,
    d.content,
    d.tags,
    d.status,
    ts_rank(to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(d.content, '')), 
            plainto_tsquery('english', p_query)) as rank,
    d.created_at,
    d.updated_at
  from public.documents d
  where d.project_id = p_project_id
    and d.status != 'archived'
    and (p_query = '' or to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(d.content, '')) 
         @@ plainto_tsquery('english', p_query))
    and (p_doc_types is null or d.doc_type = any(p_doc_types))
    and (p_tags is null or d.tags && p_tags)
  order by rank desc, d.updated_at desc
  limit p_limit;
end;
$$;

-- Semantic search function using embeddings
create or replace function search_semantic(
  p_project_id uuid,
  p_embedding vector(1536),
  p_source_types text[] default null,
  p_limit integer default 10,
  p_threshold float default 0.7
)
returns table (
  source_type text,
  source_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    e.source_type,
    e.source_id,
    e.chunk_text,
    e.chunk_index,
    1 - (e.embedding <=> p_embedding) as similarity
  from public.embeddings e
  where e.project_id = p_project_id
    and (p_source_types is null or e.source_type = any(p_source_types))
    and 1 - (e.embedding <=> p_embedding) >= p_threshold
  order by e.embedding <=> p_embedding
  limit p_limit;
end;
$$;

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function update_updated_at();

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function update_updated_at();
