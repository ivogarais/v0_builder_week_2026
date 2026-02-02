import { ChatInterface } from '@/components/chat/chat-interface';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatInterface conversationId={id} />;
}
