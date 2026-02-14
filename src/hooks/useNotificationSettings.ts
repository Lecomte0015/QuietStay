import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NotificationSettings, NotificationLog } from '@/types';

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setSettings(data as NotificationSettings | null);
    setLoading(false);
  }, []);

  const saveSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (settings) {
      const { data } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();
      if (data) setSettings(data as NotificationSettings);
    } else {
      const { data } = await supabase
        .from('notification_settings')
        .insert({ ...updates, user_id: user.id })
        .select()
        .single();
      if (data) setSettings(data as NotificationSettings);
    }
    setSaving(false);
  }, [settings]);

  const fetchLogs = useCallback(async (limit = 20) => {
    const { data } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    setLogs((data || []) as NotificationLog[]);
  }, []);

  return { settings, logs, loading, saving, fetchSettings, saveSettings, fetchLogs };
}
