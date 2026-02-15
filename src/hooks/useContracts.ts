import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Contract } from '@/types';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (err) {
      console.error('useContracts.fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (contract: Partial<Contract>) => {
    const { error } = await supabase.from('contracts').insert(contract);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  const update = useCallback(async (id: string, updates: Partial<Contract>) => {
    const { error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetch();
  }, [fetch]);

  const getByBooking = useCallback(async (bookingId: string): Promise<Contract | null> => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) {
      console.error('useContracts.getByBooking:', error);
      return null;
    }
    return data as Contract | null;
  }, []);

  return { contracts, loading, fetch, create, update, remove, getByBooking };
}
