import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const EVENT_COLUMN_MAP: Record<string, string> = {
  overbooking: 'event_overbooking',
  booking_created: 'event_booking_created',
  booking_cancelled: 'event_booking_cancelled',
  cleaning_not_validated: 'event_cleaning_not_validated',
  incident_reported: 'event_incident_reported',
  checkin_no_cleaning: 'event_checkin_no_cleaning',
};

async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    return { success: false, error: 'WhatsApp non configuré (variables manquantes)' };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await res.json();
  if (res.ok && data.messages?.[0]?.id) {
    return { success: true, messageId: data.messages[0].id };
  }
  return { success: false, error: data.error?.message || 'Erreur WhatsApp API' };
}

// POST /api/whatsapp/send
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

    // 2. Parse body
    const body = await request.json();
    const { event_type, message, entity_type, entity_id } = body;

    if (!event_type || !message) {
      return NextResponse.json({ success: false, message: 'event_type et message requis' }, { status: 400 });
    }

    const eventColumn = EVENT_COLUMN_MAP[event_type];
    if (!eventColumn) {
      return NextResponse.json({ success: false, message: 'Type d\'événement invalide' }, { status: 400 });
    }

    // 3. Find all users who want this notification
    const serviceClient = createServiceClient();
    const { data: settings } = await serviceClient
      .from('notification_settings')
      .select('*')
      .eq('is_active', true)
      .eq(eventColumn, true)
      .not('whatsapp_phone', 'is', null);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun destinataire configuré', sent_count: 0 });
    }

    // 4. Send to each user
    let sentCount = 0;
    const errors: string[] = [];

    for (const s of settings) {
      const result = await sendWhatsAppMessage(s.whatsapp_phone, message);

      // Log the attempt
      await serviceClient.from('notification_logs').insert({
        user_id: s.user_id,
        event_type,
        message,
        whatsapp_phone: s.whatsapp_phone,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        meta_message_id: result.messageId || null,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
      });

      if (result.success) {
        sentCount++;
      } else {
        errors.push(`${s.whatsapp_phone}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount}/${settings.length} message(s) envoyé(s)`,
      sent_count: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
