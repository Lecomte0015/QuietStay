import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// GET /api/calendar-sources?property_id=xxx
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const propertyId = request.nextUrl.searchParams.get('property_id');
  if (!propertyId) {
    return NextResponse.json({ error: 'property_id requis' }, { status: 400 });
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await client
    .from('calendar_sources')
    .select('*')
    .eq('property_id', propertyId)
    .order('platform');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/calendar-sources — create or update a calendar source
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Verify admin role
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
  }

  const body = await request.json();
  const { property_id, platform, ical_url } = body;

  if (!property_id || !platform || !ical_url) {
    return NextResponse.json({ error: 'property_id, platform et ical_url requis' }, { status: 400 });
  }

  // Upsert: update URL if source already exists for this property+platform
  const { data, error } = await serviceClient
    .from('calendar_sources')
    .upsert(
      { property_id, platform, ical_url, is_active: true },
      { onConflict: 'property_id,platform' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/calendar-sources — update auto_sync settings
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
  }

  const body = await request.json();
  const { id, auto_sync, sync_interval_hours } = body;

  if (!id) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (auto_sync !== undefined) updates.auto_sync = auto_sync;
  if (sync_interval_hours !== undefined) updates.sync_interval_hours = sync_interval_hours;

  const { error } = await serviceClient
    .from('calendar_sources')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/calendar-sources?id=xxx
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
  }

  await serviceClient.from('calendar_sources').delete().eq('id', id);

  return NextResponse.json({ success: true });
}
