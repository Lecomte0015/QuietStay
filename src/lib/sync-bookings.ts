import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAndParseIcal } from './ical-parser';
import type { CalendarSource } from '@/types';

export interface SyncResult {
  events_found: number;
  created: number;
  updated: number;
  cancelled: number;
  errors: string[];
}

/**
 * Sync a single calendar source: fetch iCal, parse events, upsert bookings.
 * Uses service_role client to bypass RLS.
 */
export async function syncCalendarSource(
  serviceClient: SupabaseClient,
  source: CalendarSource
): Promise<SyncResult> {
  const events = await fetchAndParseIcal(
    source.ical_url,
    source.platform
  );

  let created = 0;
  let updated = 0;
  let cancelled = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      // Check if booking already exists by ical_uid
      const { data: existing } = await serviceClient
        .from('bookings')
        .select('id, status')
        .eq('property_id', source.property_id)
        .eq('ical_uid', event.ical_uid)
        .maybeSingle();

      if (event.is_cancelled) {
        if (existing && existing.status !== 'cancelled') {
          await serviceClient
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', existing.id);
          cancelled++;
        }
        continue;
      }

      if (existing) {
        // Update dates/name only if booking hasn't been manually advanced
        if (['pending', 'confirmed'].includes(existing.status)) {
          await serviceClient
            .from('bookings')
            .update({
              check_in: event.check_in,
              check_out: event.check_out,
              guest_name: event.guest_name,
            })
            .eq('id', existing.id);
        }
        updated++;
      } else {
        // Create new booking — auto_cleaning trigger will fire
        const commissionRate = source.platform === 'airbnb' ? 20.0 : 18.0;

        const { error: insertError } = await serviceClient
          .from('bookings')
          .insert({
            property_id: source.property_id,
            platform: source.platform,
            check_in: event.check_in,
            check_out: event.check_out,
            guest_name: event.guest_name,
            guest_count: 1,
            status: 'confirmed',
            ical_uid: event.ical_uid,
            commission_rate: commissionRate,
            notes: `Import iCal ${source.platform}`,
          });

        if (insertError) {
          // 23505 = unique constraint violation → already exists, skip
          if (insertError.code === '23505') continue;
          throw insertError;
        }
        created++;
      }
    } catch (eventError) {
      const msg = eventError instanceof Error ? eventError.message : String(eventError);
      errors.push(`UID ${event.ical_uid}: ${msg}`);
    }
  }

  return { events_found: events.length, created, updated, cancelled, errors };
}
