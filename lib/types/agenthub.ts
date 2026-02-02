// AgentHub TypeScript Types

export type IntegrationType = 'google_calendar' | 'google_drive' | 'google_gmail' | 'notion' | 'slack';
export type PairingCodeStatus = 'pending' | 'used' | 'expired';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

// Database row types
export interface PairingCode {
  id: string;
  code: string;
  user_id: string | null;
  device_name: string | null;
  status: PairingCodeStatus;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  system_prompt: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_calls: ToolCall[] | null;
  tool_results: ToolResult[] | null;
  tokens_used: number | null;
  created_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  type: IntegrationType;
  enabled: boolean;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  scope: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolRun {
  id: string;
  message_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown> | null;
  status: ToolStatus;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Tool calling types
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  result: unknown;
  error?: string;
}

// API request/response types
export interface CreateConversationRequest {
  title?: string;
  model?: string;
  system_prompt?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  model?: string;
}

export interface ChatStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
  message_id?: string;
  error?: string;
}

// Google OAuth types
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  attendees?: { email: string; displayName?: string }[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
}

export interface GoogleGmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
  };
}

// Pairing types
export interface PairingSession {
  code: string;
  device_name: string;
  expires_at: string;
}

export interface PairedDevice {
  id: string;
  device_name: string;
  paired_at: string;
}

// Dashboard stats
export interface AgentHubStats {
  total_conversations: number;
  total_messages: number;
  total_tool_runs: number;
  active_integrations: number;
  paired_devices: number;
}

// LLM abstraction types
export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
}

export interface ToolContext {
  user_id: string;
  conversation_id: string;
  getOAuthToken: (provider: string) => Promise<OAuthToken | null>;
}
