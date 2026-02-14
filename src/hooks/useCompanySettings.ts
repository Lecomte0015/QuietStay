import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CompanySettings } from '@/types';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      setSettings(data as CompanySettings | null);
    } catch { /* table may not exist yet */ }
    setLoading(false);
  }, []);

  const saveSettings = useCallback(async (updates: Partial<CompanySettings>) => {
    setSaving(true);
    try {
      if (settings) {
        const { data } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (data) setSettings(data as CompanySettings);
      } else {
        const { data } = await supabase
          .from('company_settings')
          .insert(updates)
          .select()
          .single();
        if (data) setSettings(data as CompanySettings);
      }
    } catch { /* table may not exist yet */ }
    setSaving(false);
  }, [settings]);

  return { settings, loading, saving, fetchSettings, saveSettings };
}
