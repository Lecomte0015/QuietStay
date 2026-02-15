import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { syncCalendarSource } from '@/lib/sync-bookings';
import type { CalendarSource } from '@/types';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  try {
    const serviceClient = createServiceClient();

    // Fetch all auto-sync enabled sources
    const { data: sources, error } = await serviceClient
      .from('calendar_sources')
      .select('*')
      .eq('auto_sync', true)
      .eq('is_active', true);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucune source auto-sync active', synced: 0 });
    }

    const results: { id: string; success: boolean; message: string }[] = [];

    for (const source of sources as CalendarSource[]) {
      try {
        const result = await syncCalendarSource(serviceClient, source);

        await serviceClient
          .from('calendar_sources')
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: 'success',
            last_sync_message: `${result.created} créées, ${result.updated} mises à jour, ${result.cancelled} annulées`,
            last_error: null,
            events_synced: result.events_found,
          })
          .eq('id', source.id);

        results.push({ id: source.id, success: true, message: 'OK' });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';

        await serviceClient
          .from('calendar_sources')
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: 'error',
            last_sync_message: errorMsg,
            last_error: errorMsg,
          })
          .eq('id', source.id);

        results.push({ id: source.id, success: false, message: errorMsg });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sync terminée : ${succeeded} réussies, ${failed} échouées`,
      synced: succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error('Sync-all error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur',
    }, { status: 500 });
  }
}
