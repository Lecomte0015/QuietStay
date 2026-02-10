import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { syncCalendarSource } from '@/lib/sync-bookings';
import type { SyncIcalResponse, CalendarSource } from '@/types';

export const runtime = 'nodejs';

// POST /api/sync-ical — trigger sync for a calendar source
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate caller
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Token invalide' }, { status: 401 });
    }

    // 2. Check admin role
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    // 3. Parse request
    const body = await request.json();
    const { calendar_source_id } = body;

    if (!calendar_source_id) {
      return NextResponse.json({ success: false, message: 'calendar_source_id requis' }, { status: 400 });
    }

    // 4. Fetch calendar source
    const { data: source, error: sourceError } = await serviceClient
      .from('calendar_sources')
      .select('*')
      .eq('id', calendar_source_id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ success: false, message: 'Source calendrier introuvable' }, { status: 404 });
    }

    // 5. Mark as syncing
    await serviceClient
      .from('calendar_sources')
      .update({ last_sync_status: 'pending', last_sync_message: 'Synchronisation en cours...' })
      .eq('id', calendar_source_id);

    // 6. Run sync
    let result;
    try {
      result = await syncCalendarSource(serviceClient, source as CalendarSource);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Erreur réseau';
      await serviceClient
        .from('calendar_sources')
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_message: `Erreur : ${message}`,
          events_synced: 0,
        })
        .eq('id', calendar_source_id);

      return NextResponse.json({
        success: false,
        message: `Impossible de récupérer le calendrier : ${message}`,
      }, { status: 502 });
    }

    // 7. Update source with results
    const syncMessage = `${result.events_found} événements, ${result.created} créés, ${result.updated} mis à jour, ${result.cancelled} annulés${result.errors.length > 0 ? `, ${result.errors.length} erreurs` : ''}`;

    await serviceClient
      .from('calendar_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: result.errors.length > 0 ? 'error' : 'success',
        last_sync_message: syncMessage,
        events_synced: result.events_found,
      })
      .eq('id', calendar_source_id);

    // 8. Log activity
    await serviceClient.from('activity_logs').insert({
      user_id: user.id,
      action: 'ical_sync',
      entity_type: 'calendar_source',
      entity_id: calendar_source_id,
      details: {
        property_id: source.property_id,
        platform: source.platform,
        events_found: result.events_found,
        created: result.created,
        updated: result.updated,
        cancelled: result.cancelled,
        errors: result.errors,
      },
    });

    const response: SyncIcalResponse = {
      success: true,
      message: syncMessage,
      events_found: result.events_found,
      bookings_created: result.created,
      bookings_updated: result.updated,
      bookings_cancelled: result.cancelled,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sync iCal error:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur interne du serveur',
    }, { status: 500 });
  }
}
