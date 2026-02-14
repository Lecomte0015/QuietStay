import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CompanySettings } from '@/types';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (err) {
        console.warn('company_settings fetch:', err.message);
      } else {
        setSettings(data as CompanySettings | null);
      }
    } catch (e) {
      console.warn('company_settings fetch exception:', e);
    }
    setLoading(false);
  }, []);

  const saveSettings = useCallback(async (updates: Partial<CompanySettings>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      if (settings) {
        const { data, error: err } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();
        if (err) {
          console.error('company_settings update error:', err);
          setError(err.message);
          setSaving(false);
          return false;
        }
        if (data) setSettings(data as CompanySettings);
      } else {
        const { data, error: err } = await supabase
          .from('company_settings')
          .insert(updates)
          .select()
          .single();
        if (err) {
          console.error('company_settings insert error:', err);
          setError(err.message);
          setSaving(false);
          return false;
        }
        if (data) setSettings(data as CompanySettings);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      console.error('company_settings save exception:', e);
      setError(msg);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [settings]);

  return { settings, loading, saving, error, fetchSettings, saveSettings };
}
