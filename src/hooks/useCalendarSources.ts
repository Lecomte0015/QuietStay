import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CalendarSource, CalendarPlatform, SyncIcalResponse } from '@/types';

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non connecté');
  return session.access_token;
}

export function useCalendarSources(propertyId: string) {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null); // source id being synced
  const [testing, setTesting] = useState<CalendarPlatform | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/calendar-sources?property_id=${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const saveSource = useCallback(async (platform: CalendarPlatform, icalUrl: string) => {
    const token = await getToken();
    const res = await fetch('/api/calendar-sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ property_id: propertyId, platform, ical_url: icalUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    await fetchSources();
    return data as CalendarSource;
  }, [propertyId, fetchSources]);

  const deleteSource = useCallback(async (id: string) => {
    const token = await getToken();
    const res = await fetch(`/api/calendar-sources?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erreur');
    }
    await fetchSources();
  }, [fetchSources]);

  const testConnection = useCallback(async (icalUrl: string): Promise<{ valid: boolean; eventCount: number; message: string }> => {
    const token = await getToken();
    const res = await fetch('/api/test-ical', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ical_url: icalUrl }),
    });
    return res.json();
  }, []);

  const syncSource = useCallback(async (sourceId: string): Promise<SyncIcalResponse> => {
    setSyncing(sourceId);
    try {
      const token = await getToken();
      const res = await fetch('/api/sync-ical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ calendar_source_id: sourceId }),
      });
      const data: SyncIcalResponse = await res.json();
      await fetchSources();
      return data;
    } finally {
      setSyncing(null);
    }
  }, [fetchSources]);

  const getSource = useCallback((platform: CalendarPlatform): CalendarSource | undefined => {
    return sources.find(s => s.platform === platform);
  }, [sources]);

  return {
    sources,
    loading,
    syncing,
    testing,
    setTesting,
    fetchSources,
    saveSource,
    deleteSource,
    testConnection,
    syncSource,
    getSource,
  };
}
