import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

// GET - Check status of a pairing code (for polling)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: pairingCode, error } = await supabase
    .from('pairing_codes')
    .select('status, device_name, used_at, expires_at')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !pairingCode) {
    return NextResponse.json({ error: 'Pairing code not found' }, { status: 404 });
  }

  // Check if expired
  if (pairingCode.status === 'pending' && new Date(pairingCode.expires_at) < new Date()) {
    return NextResponse.json({
      status: 'expired',
      message: 'Pairing code has expired',
    });
  }

  return NextResponse.json({
    status: pairingCode.status,
    device_name: pairingCode.device_name,
    used_at: pairingCode.used_at,
  });
}
