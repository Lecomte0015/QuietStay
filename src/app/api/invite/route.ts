import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, full_name, role } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Invite user via Supabase Auth (sends invitation email)
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create profile row linked to the auth user
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name: full_name || null,
    role: role || 'staff',
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, user_id: authData.user.id });
}
