import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      model,
      created_at,
      updated_at,
      messages:messages(count)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  return NextResponse.json({
    conversations: conversations?.map(c => ({
      ...c,
      message_count: c.messages?.[0]?.count || 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, model = 'openai/gpt-4o', system_prompt } = body;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title || 'New Conversation',
      model,
      system_prompt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}
