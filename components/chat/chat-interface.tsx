'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Loader2, Bot, User, Calendar, FileText, Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          conversationId,
        },
      }),
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('Calendar')) return <Calendar className="h-4 w-4" />;
    if (toolName.includes('Drive')) return <FileText className="h-4 w-4" />;
    if (toolName.includes('mail') || toolName.includes('Email')) return <Mail className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">How can I help you today?</h2>
            <p className="text-muted-foreground max-w-md">
              I can help you manage your Google Calendar, search files in Drive, and handle your emails.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                "What's on my calendar today?",
                "Find documents about project X",
                "Show my unread emails",
                "Schedule a meeting tomorrow at 2pm",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 max-w-3xl',
              message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                'rounded-lg px-4 py-3 max-w-[80%]',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border'
              )}
            >
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <p key={index} className="whitespace-pre-wrap text-sm">
                      {part.text}
                    </p>
                  );
                }

                if (part.type === 'tool-invocation') {
                  const toolInvocation = part.toolInvocation;
                  return (
                    <div
                      key={index}
                      className="mt-2 p-2 rounded bg-muted/50 border border-border text-sm"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        {getToolIcon(toolInvocation.toolName)}
                        <span className="font-medium">{toolInvocation.toolName}</span>
                        {toolInvocation.state === 'call' && (
                          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                        )}
                      </div>
                      {toolInvocation.state === 'result' && toolInvocation.result && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {typeof toolInvocation.result === 'object' && 'error' in (toolInvocation.result as Record<string, unknown>) ? (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>{String((toolInvocation.result as Record<string, unknown>).error)}</span>
                            </div>
                          ) : (
                            <span>Completed successfully</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg px-4 py-3 bg-card border border-border">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
