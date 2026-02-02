-- AgentHub Schema Migration
-- Tables for conversations, messages, pairing, integrations, and tool runs

-- Pairing codes for QR device linking
create table if not exists public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.pairing_codes enable row level security;

create policy "Users can view their own pairing codes"
  on public.pairing_codes for select
  using (auth.uid() = user_id);

create policy "Users can create pairing codes"
  on public.pairing_codes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pairing codes"
  on public.pairing_codes for update
  using (auth.uid() = user_id);

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'New Conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Messages
create type message_role as enum ('user', 'assistant', 'system', 'tool');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role message_role not null,
  content text,
  tool_call_id text,
  tool_calls jsonb,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can create messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Integrations (Google, etc.)
create type integration_provider as enum ('google', 'whatsapp', 'slack');
create type integration_status as enum ('connected', 'disconnected', 'error', 'pending');

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider integration_provider not null,
  status integration_status default 'pending',
  scopes text[],
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

alter table public.integrations enable row level security;

create policy "Users can view their own integrations"
  on public.integrations for select
  using (auth.uid() = user_id);

create policy "Users can create integrations"
  on public.integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on public.integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on public.integrations for delete
  using (auth.uid() = user_id);

-- OAuth tokens (stored securely)
create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade unique,
  access_token text not null,
  refresh_token text,
  token_type text default 'Bearer',
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.oauth_tokens enable row level security;

create policy "Users can view tokens for their integrations"
  on public.oauth_tokens for select
  using (
    exists (
      select 1 from public.integrations i
      where i.id = integration_id and i.user_id = auth.uid()
    )
  );

create policy "Users can create tokens for their integrations"
  on public.oauth_tokens for insert
  with check (
    exists (
      select 1 from public.integrations i
      where i.id = integration_id and i.user_id = auth.uid()
    )
  );

create policy "Users can update tokens for their integrations"
  on public.oauth_tokens for update
  using (
    exists (
      select 1 from public.integrations i
      where i.id = integration_id and i.user_id = auth.uid()
    )
  );

-- Tool runs (audit log for tool executions)
create type tool_run_status as enum ('pending', 'confirmed', 'executed', 'cancelled', 'error');

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  tool_name text not null,
  args_json jsonb,
  result_json jsonb,
  status tool_run_status default 'pending',
  requires_confirmation boolean default false,
  confirmed_at timestamptz,
  executed_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

alter table public.tool_runs enable row level security;

create policy "Users can view tool runs in their conversations"
  on public.tool_runs for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can create tool runs in their conversations"
  on public.tool_runs for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can update tool runs in their conversations"
  on public.tool_runs for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Audit log for all actions
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.audit_log enable row level security;

create policy "Users can view their own audit logs"
  on public.audit_log for select
  using (auth.uid() = user_id);

create policy "Users can create audit logs"
  on public.audit_log for insert
  with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_pairing_codes_code on public.pairing_codes(code);
create index if not exists idx_pairing_codes_expires on public.pairing_codes(expires_at);
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_created on public.messages(created_at);
create index if not exists idx_integrations_user_provider on public.integrations(user_id, provider);
create index if not exists idx_tool_runs_conversation on public.tool_runs(conversation_id);
create index if not exists idx_tool_runs_status on public.tool_runs(status);
create index if not exists idx_audit_log_user on public.audit_log(user_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

-- Function to update conversation timestamp on new message
create or replace function update_conversation_timestamp()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row
  execute function update_conversation_timestamp();

-- Function to generate conversation title from first message
create or replace function generate_conversation_title()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role = 'user' then
    update public.conversations
    set title = left(new.content, 50)
    where id = new.conversation_id
      and title = 'New Conversation';
  end if;
  return new;
end;
$$;

drop trigger if exists on_first_message on public.messages;
create trigger on_first_message
  after insert on public.messages
  for each row
  execute function generate_conversation_title();
