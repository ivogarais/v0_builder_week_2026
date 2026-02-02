import { NextRequest } from 'next/server';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
  validateUIMessages,
} from 'ai';
import { createClient } from '@/lib/supabase/server';
import { createGoogleCalendarTools } from '@/lib/tools/google-calendar';
import { createGoogleDriveTools } from '@/lib/tools/google-drive';
import { createGoogleGmailTools } from '@/lib/tools/google-gmail';

export const maxDuration = 60;

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to Google Calendar, Google Drive, and Gmail.

You can help users:
- View and manage calendar events
- Search and read files from Google Drive
- Read and send emails

Always confirm before taking actions that modify data (creating events, sending emails).
When listing items, summarize them clearly and offer to provide more details.
If a Google service is not connected, inform the user and suggest they connect it in settings.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const {
    messages: rawMessages,
    conversationId,
    model = 'openai/gpt-4o',
    systemPrompt,
  } = body;

  // Validate and convert messages
  const tools = {
    ...createGoogleCalendarTools(user.id),
    ...createGoogleDriveTools(user.id),
    ...createGoogleGmailTools(user.id),
  };

  const messages = await validateUIMessages<UIMessage>({
    messages: rawMessages,
    tools,
  });

  // Get or create conversation
  let conversation;
  if (conversationId) {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();
    conversation = data;
  }

  if (!conversation) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
        model,
        system_prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    conversation = data;
  }

  // Stream the response
  const result = streamText({
    model,
    system: systemPrompt || conversation.system_prompt || DEFAULT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        userId: user.id,
        conversationId: conversation.id,
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendUsage: true,
    onFinish: async ({ messages: resultMessages, usage }) => {
      // Save the last user message
      const lastUserMsg = rawMessages.findLast((m: UIMessage) => m.role === 'user');
      if (lastUserMsg) {
        const textContent = lastUserMsg.parts
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { type: string; text?: string }) => p.text)
          .join('') || '';
        
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'user',
          content: textContent,
        });
      }

      // Save assistant response
      const lastAssistantMsg = resultMessages.findLast((m) => m.role === 'assistant');
      if (lastAssistantMsg) {
        const textContent = lastAssistantMsg.parts
          ?.filter((p) => p.type === 'text')
          .map((p) => (p as { type: 'text'; text: string }).text)
          .join('') || '';

        const toolCalls = lastAssistantMsg.parts
          ?.filter((p) => p.type === 'tool-invocation')
          .map((p) => p as { type: 'tool-invocation'; toolInvocation: { toolCallId: string; toolName: string; args: unknown } })
          .map((p) => ({
            id: p.toolInvocation.toolCallId,
            name: p.toolInvocation.toolName,
            arguments: p.toolInvocation.args,
          }));

        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: textContent,
          tool_calls: toolCalls?.length ? toolCalls : null,
          tokens_used: usage?.totalTokens,
        });
      }

      // Update conversation title if it's the first message
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id);

      if (count && count <= 2) {
        // Generate a title from the first message
        const firstMessage = rawMessages[0];
        const textContent = firstMessage?.parts
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { type: string; text?: string }) => p.text)
          .join('') || '';
        
        const title = textContent.slice(0, 50) + (textContent.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', conversation.id);
      } else {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }

      // Log the chat interaction
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'chat_message',
        resource_type: 'conversation',
        resource_id: conversation.id,
        details: { model, tokens: usage?.totalTokens },
      });
    },
  });
}
