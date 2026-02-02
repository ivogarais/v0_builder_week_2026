import { createClient } from '../supabase/server'
import type { OAuthToken, GoogleTokenResponse } from '../types/agenthub'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const supabase = await createClient();

  // Get current token
  const { data: token } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (!token) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
  const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    return token.access_token;
  }

  // Token is expired, try to refresh
  if (!token.refresh_token) {
    console.error('No refresh token available');
    return null;
  }

  const refreshedToken = await refreshGoogleToken(token.refresh_token);
  if (!refreshedToken) {
    return null;
  }

  // Update token in database
  const newExpiresAt = new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString();
  
  const { error } = await supabase
    .from('oauth_tokens')
    .update({
      access_token: refreshedToken.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', token.id);

  if (error) {
    console.error('Failed to update token:', error);
    return null;
  }

  return refreshedToken.access_token;
}

async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

export async function revokeGoogleToken(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: token } = await supabase
    .from('oauth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  if (token) {
    // Revoke token with Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
      method: 'POST',
    });
  }

  // Delete from database
  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google');

  // Disable Google integrations
  await supabase
    .from('integrations')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('type', ['google_calendar', 'google_drive', 'google_gmail']);

  return !error;
}
