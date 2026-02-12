import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// POST /api/notifications/check — check for time-based alerts
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
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

    const serviceClient = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const alerts: { event_type: string; message: string; entity_type: string; entity_id: string }[] = [];

    // 2. Check: cleaning not validated after checkout (today)
    const { data: checkouts } = await serviceClient
      .from('bookings')
      .select('id, guest_name, property_id, properties(name)')
      .eq('status', 'checked_out')
      .lte('check_out', today)
      .gte('check_out', today);

    if (checkouts) {
      for (const b of checkouts) {
        // Check if associated cleaning is validated
        const { data: cleanings } = await serviceClient
          .from('cleanings')
          .select('id, status')
          .eq('property_id', b.property_id)
          .eq('scheduled_date', today);

        const hasValidated = cleanings?.some(c => c.status === 'validated' || c.status === 'done');
        if (!hasValidated) {
          // Deduplication: check if already sent today
          const { data: existing } = await serviceClient
            .from('notification_logs')
            .select('id')
            .eq('event_type', 'cleaning_not_validated')
            .eq('entity_id', b.id)
            .gte('created_at', `${today}T00:00:00`)
            .limit(1);

          if (!existing || existing.length === 0) {
            const propName = (b as Record<string, unknown>).properties
              ? ((b as Record<string, unknown>).properties as { name: string }).name
              : 'Logement';
            alerts.push({
              event_type: 'cleaning_not_validated',
              message: `Ménage non validé après le départ de ${b.guest_name} à ${propName}`,
              entity_type: 'bookings',
              entity_id: b.id,
            });
          }
        }
      }
    }

    // 3. Check: check-in tomorrow without validated cleaning
    const { data: checkins } = await serviceClient
      .from('bookings')
      .select('id, guest_name, property_id, properties(name)')
      .in('status', ['pending', 'confirmed'])
      .eq('check_in', tomorrow);

    if (checkins) {
      for (const b of checkins) {
        const { data: cleanings } = await serviceClient
          .from('cleanings')
          .select('id, status')
          .eq('property_id', b.property_id)
          .gte('scheduled_date', today)
          .lte('scheduled_date', tomorrow);

        const hasValidated = cleanings?.some(c => c.status === 'validated' || c.status === 'done');
        if (!hasValidated) {
          const { data: existing } = await serviceClient
            .from('notification_logs')
            .select('id')
            .eq('event_type', 'checkin_no_cleaning')
            .eq('entity_id', b.id)
            .gte('created_at', `${today}T00:00:00`)
            .limit(1);

          if (!existing || existing.length === 0) {
            const propName = (b as Record<string, unknown>).properties
              ? ((b as Record<string, unknown>).properties as { name: string }).name
              : 'Logement';
            alerts.push({
              event_type: 'checkin_no_cleaning',
              message: `Check-in demain pour ${b.guest_name} à ${propName} — ménage non validé`,
              entity_type: 'bookings',
              entity_id: b.id,
            });
          }
        }
      }
    }

    // 4. Send all alerts via the send endpoint
    let sentCount = 0;
    for (const alert of alerts) {
      const res = await fetch(new URL('/api/whatsapp/send', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(alert),
      });
      const result = await res.json();
      if (result.success) sentCount += result.sent_count || 0;
    }

    return NextResponse.json({
      success: true,
      message: `${alerts.length} alerte(s) détectée(s), ${sentCount} message(s) envoyé(s)`,
      alerts_count: alerts.length,
      sent_count: sentCount,
    });
  } catch (err) {
    console.error('Notifications check error:', err);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
