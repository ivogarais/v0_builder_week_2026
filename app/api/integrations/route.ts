import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { revokeGoogleToken } from '../../../lib/google/tokens'

// GET - List user's integrations
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', user.id)
    .order('type');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }

  // Check if Google OAuth is connected
  const { data: googleToken } = await supabase
    .from('oauth_tokens')
    .select('expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single();

  const googleConnected = !!googleToken;
  const googleExpired = googleToken?.expires_at 
    ? new Date(googleToken.expires_at) < new Date()
    : false;

  return NextResponse.json({
    integrations: integrations || [],
    google: {
      connected: googleConnected,
      expired: googleExpired,
    },
  });
}

// PATCH - Update integration settings
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { type, enabled, config } = body;

  if (!type) {
    return NextResponse.json({ error: 'Integration type is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (enabled !== undefined) updates.enabled = enabled;
  if (config !== undefined) updates.config = config;

  const { data, error } = await supabase
    .from('integrations')
    .update(updates)
    .eq('user_id', user.id)
    .eq('type', type)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}

// DELETE - Disconnect Google (revokes all Google integrations)
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Revoke Google token and disable integrations
  const success = await revokeGoogleToken(user.id);

  if (!success) {
    return NextResponse.json({ error: 'Failed to disconnect Google' }, { status: 500 });
  }

  // Log the action
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'google_oauth_disconnected',
    resource_type: 'integration',
  });

  return NextResponse.json({ success: true });
}
