import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NotificationEventType } from '@/types';

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

export function useWhatsAppNotifier() {
  const sendNotification = useCallback(async (
    eventType: NotificationEventType,
    message: string,
    entityType?: string,
    entityId?: string
  ) => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          message,
          entity_type: entityType,
          entity_id: entityId,
        }),
      });
    } catch (err) {
      console.error('WhatsApp notification error:', err);
    }
  }, []);

  return { sendNotification };
}
