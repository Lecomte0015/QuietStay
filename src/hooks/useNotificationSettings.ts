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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error: err } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (err) {
        console.warn('notification_settings fetch:', err.message);
      } else {
        setSettings(data as NotificationSettings | null);
      }
    } catch (e) {
      console.warn('notification_settings fetch exception:', e);
    }
    setLoading(false);
  }, []);

  const saveSettings = useCallback(async (updates: Partial<NotificationSettings>): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return false; }

      if (settings) {
        const { data, error: err } = await supabase
          .from('notification_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (err) {
          console.error('notification_settings update error:', err);
          setSaving(false);
          return false;
        }
        if (data) setSettings(data as NotificationSettings);
      } else {
        const { data, error: err } = await supabase
          .from('notification_settings')
          .insert({ ...updates, user_id: user.id })
          .select()
          .single();
        if (err) {
          console.error('notification_settings insert error:', err);
          setSaving(false);
          return false;
        }
        if (data) setSettings(data as NotificationSettings);
      }
    } catch (e) {
      console.error('notification_settings save exception:', e);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [settings]);

  const fetchLogs = useCallback(async (limit = 20) => {
    try {
      const { data, error: err } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!err) setLogs((data || []) as NotificationLog[]);
    } catch { /* ignore */ }
  }, []);

  return { settings, logs, loading, saving, fetchSettings, saveSettings, fetchLogs };
}
