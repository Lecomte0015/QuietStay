import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guidebook } from '@/types';

export function useGuidebooks() {
  const [guidebooks, setGuidebooks] = useState<Guidebook[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guidebooks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGuidebooks((data || []) as Guidebook[]);
    } catch (err) {
      console.error('useGuidebooks.fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByProperty = useCallback(async (propertyId: string): Promise<Guidebook | null> => {
    const { data, error } = await supabase
      .from('guidebooks')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();
    if (error) {
      console.error('useGuidebooks.fetchByProperty:', error);
      return null;
    }
    return data as Guidebook | null;
  }, []);

  const upsert = useCallback(async (guidebook: Partial<Guidebook> & { property_id: string }) => {
    const { data: existing } = await supabase
      .from('guidebooks')
      .select('id')
      .eq('property_id', guidebook.property_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('guidebooks')
        .update(guidebook)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('guidebooks')
        .insert(guidebook);
      if (error) throw error;
    }
    await fetch();
  }, [fetch]);

  const togglePublish = useCallback(async (id: string, isPublished: boolean) => {
    const { error } = await supabase
      .from('guidebooks')
      .update({ is_published: isPublished })
      .eq('id', id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  return { guidebooks, loading, fetch, fetchByProperty, upsert, togglePublish };
}
