import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// Generate a 6-character alphanumeric code
function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, 1, I
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// GET - Generate a new pairing code (for web client)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Expire any existing pending codes for this user
  await supabase
    .from('pairing_codes')
    .update({ status: 'expired' })
    .eq('user_id', user.id)
    .eq('status', 'pending');

  // Generate new code
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  const { data, error } = await supabase
    .from('pairing_codes')
    .insert({
      code,
      user_id: user.id,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to generate pairing code' }, { status: 500 });
  }

  return NextResponse.json({
    code: data.code,
    expires_at: data.expires_at,
    qr_data: JSON.stringify({
      type: 'agenthub_pairing',
      code: data.code,
      expires_at: data.expires_at,
    }),
  });
}

// POST - Pair a device using a code (for mobile/desktop client)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, device_name } = body;

  if (!code || !device_name) {
    return NextResponse.json({ error: 'Code and device_name are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Find the pairing code
  const { data: pairingCode, error: findError } = await supabase
    .from('pairing_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (findError || !pairingCode) {
    return NextResponse.json({ error: 'Invalid or expired pairing code' }, { status: 404 });
  }

  // Mark code as used and store device name
  const { error: updateError } = await supabase
    .from('pairing_codes')
    .update({
      status: 'used',
      device_name,
      used_at: new Date().toISOString(),
    })
    .eq('id', pairingCode.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to complete pairing' }, { status: 500 });
  }

  // Generate a session token for the device
  // In production, you'd want to use proper device authentication
  const sessionToken = randomBytes(32).toString('hex');

  // Log the pairing
  await supabase.from('audit_log').insert({
    user_id: pairingCode.user_id,
    action: 'device_paired',
    resource_type: 'pairing_code',
    resource_id: pairingCode.id,
    details: { device_name },
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    user_agent: req.headers.get('user-agent'),
  });

  return NextResponse.json({
    success: true,
    user_id: pairingCode.user_id,
    device_name,
    session_token: sessionToken,
    message: `Successfully paired ${device_name}`,
  });
}
