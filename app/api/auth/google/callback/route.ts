import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GoogleTokenResponse } from '@/lib/types/agenthub';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'http://localhost:3000/api/auth/google/callback';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=oauth_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_request', request.url));
  }

  // Decode and verify state
  let stateData: { user_id: string; redirect: string; timestamp: number };
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_state', request.url));
  }

  // Check state timestamp (5 minute expiry)
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=state_expired', request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== stateData.user_id) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=unauthorized', request.url));
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', await tokenResponse.text());
    return NextResponse.redirect(new URL('/dashboard/integrations?error=token_exchange_failed', request.url));
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Upsert OAuth token
  const { error: upsertError } = await supabase
    .from('oauth_tokens')
    .upsert({
      user_id: user.id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_type: tokens.token_type,
      scope: tokens.scope,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (upsertError) {
    console.error('Failed to save tokens:', upsertError);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=save_failed', request.url));
  }

  // Enable Google integrations
  const integrationTypes = ['google_calendar', 'google_drive', 'google_gmail'];
  for (const type of integrationTypes) {
    await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        type,
        enabled: true,
        config: {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,type',
      });
  }

  // Log the action
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'google_oauth_connected',
    resource_type: 'integration',
    details: { scopes: tokens.scope?.split(' ') },
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  });

  return NextResponse.redirect(new URL(`${stateData.redirect}?success=google_connected`, request.url));
}
