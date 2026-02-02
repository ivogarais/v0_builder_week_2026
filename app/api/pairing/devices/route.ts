import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

// GET - List all paired devices for current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: devices, error } = await supabase
    .from('pairing_codes')
    .select('id, device_name, used_at')
    .eq('user_id', user.id)
    .eq('status', 'used')
    .order('used_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }

  return NextResponse.json({
    devices: devices?.map(d => ({
      id: d.id,
      name: d.device_name,
      paired_at: d.used_at,
    })) || [],
  });
}

// DELETE - Unpair a device
export async function DELETE(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('id');

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('pairing_codes')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to unpair device' }, { status: 500 });
  }

  // Log the action
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'device_unpaired',
    resource_type: 'pairing_code',
    resource_id: deviceId,
  });

  return NextResponse.json({ success: true });
}
