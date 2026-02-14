import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Profile, Owner, Property, Booking, Cleaning,
  Access, Invoice, DashboardKPIs, TodayMovement, Report
} from '../types';

// ─── Auth Hook ───────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        resolveUser(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await resolveUser(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function resolveUser(userId: string, email: string) {
    // Try to fetch full profile, but use session data as fallback
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(AbortSignal.timeout(5000))
        .single();
      if (data) {
        setUser(data);
        setLoading(false);
        return;
      }
    } catch {
      // Profile fetch failed/timed out
    }
    // Fallback: create minimal profile from session so dashboard still renders
    setUser({
      id: userId,
      email,
      full_name: null,
      role: 'admin',
      phone: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile);
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return { user, loading, signIn, signOut };
}

// ─── Generic CRUD Hook ──────────────────────────────────────
function useCrud<T extends { id: string }>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (query?: Record<string, unknown>) => {
    setLoading(true);
    try {
      let q = supabase.from(table).select('*');
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          q = q.eq(key, value);
        });
      }
      const { data: result, error: err } = await q
        .order('created_at', { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (err) setError(err.message);
      else setData(result as T[]);
    } catch {
      setError('Timeout — réessayez');
    }
    setLoading(false);
  }, [table]);

  const create = async (item: Partial<T>) => {
    const { data: result, error: err } = await supabase
      .from(table)
      .insert(item)
      .select()
      .single();
    if (err) throw err;
    setData(prev => [result as T, ...prev]);
    return result;
  };

  const update = async (id: string, updates: Partial<T>) => {
    const { data: result, error: err } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    setData(prev => prev.map(item => item.id === id ? (result as T) : item));
    return result;
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id);
    if (err) throw err;
    setData(prev => prev.filter(item => item.id !== id));
  };

  return { data, setData, loading, error, fetch, create, update, remove };
}

// ─── Specific Hooks ─────────────────────────────────────────
export function useOwners() {
  return useCrud<Owner>('owners');
}

export function useProperties() {
  const crud = useCrud<Property>('properties');

  const fetchWithOwners = useCallback(async () => {
    crud.setData([]); // signal loading
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, owner:owners(*)')
        .order('created_at', { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (!error && data) {
        crud.setData(data as Property[]);
      }
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  return { ...crud, fetchWithOwners };
}

export function useBookings() {
  const crud = useCrud<Booking>('bookings');

  const fetchWithProperty = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, property:properties(*, owner:owners(name))')
        .order('check_in', { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (!error && data) {
        crud.setData(data as Booking[]);
      }
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  return { ...crud, fetchWithProperty };
}

export function useCleanings() {
  const crud = useCrud<Cleaning>('cleanings');

  const fetchFull = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cleanings')
        .select('*, property:properties(name, property_type), booking:bookings(guest_name), assignee:profiles!assigned_to(full_name)')
        .order('scheduled_date', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000));
      if (!error && data) {
        crud.setData(data as Cleaning[]);
      }
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  const validate = async (id: string, validatorId: string) => {
    const cleaning = crud.data.find(c => c.id === id);
    if (!cleaning || cleaning.photos.length === 0) {
      throw new Error('Photos obligatoires avant validation');
    }
    return crud.update(id, {
      status: 'validated',
      validated_at: new Date().toISOString(),
      validated_by: validatorId,
    } as Partial<Cleaning>);
  };

  return { ...crud, fetchFull, validate };
}

export function useAccesses() {
  const crud = useCrud<Access>('accesses');

  const fetch = useCallback(async (propertyId?: string) => {
    try {
      let q = supabase.from('accesses').select('*').eq('is_active', true);
      if (propertyId) q = q.eq('property_id', propertyId);
      const { data: result } = await q.abortSignal(AbortSignal.timeout(10000));
      if (result) crud.setData(result as Access[]);
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  return { ...crud, fetch };
}

export function useInvoices() {
  const crud = useCrud<Invoice>('invoices');

  const fetchWithOwners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, owner:owners(name, company, email)')
        .order('period_start', { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (!error && data) {
        crud.setData(data as Invoice[]);
      }
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  const generateMonthly = async (year: number, month: number) => {
    const { data, error } = await supabase.rpc('generate_monthly_invoices', {
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    await fetchWithOwners();
    return data;
  };

  return { ...crud, fetchWithOwners, generateMonthly };
}

// ─── Profiles (team management) ─────────────────────────────
export function useProfiles() {
  return useCrud<Profile>('profiles');
}

// ─── Dashboard KPIs ─────────────────────────────────────────
export function useDashboardKPIs() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [movements, setMovements] = useState<TodayMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 7) + '-01';

      const signal = AbortSignal.timeout(10000);
      const results = await Promise.allSettled([
        supabase.from('properties').select('id, status').abortSignal(signal),
        supabase.from('bookings').select('id, status, check_in, check_out, total_amount, is_conflict').abortSignal(signal),
        supabase.from('cleanings').select('id, status').in('status', ['pending', 'in_progress']).abortSignal(signal),
        supabase.from('today_movements').select('*').abortSignal(signal),
      ]);

      const getData = (r: PromiseSettledResult<{ data: unknown[] | null }>) =>
        r.status === 'fulfilled' ? (r.value.data || []) : [];

      const props = getData(results[0]) as { id: string; status: string }[];
      const bookings = getData(results[1]) as { id: string; status: string; check_in: string; check_out: string; total_amount: number; is_conflict: boolean }[];
      const cleanings = getData(results[2]) as { id: string; status: string }[];
      const movementsData = getData(results[3]) as TodayMovement[];

      const activeBookings = bookings.filter(b =>
        ['confirmed', 'checked_in'].includes(b.status)
      );

      const monthRevenue = bookings
        .filter(b => b.check_in >= monthStart && b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const activeProps = props.filter(p => p.status === 'active').length;
      const occupiedToday = bookings.filter(
        b => b.check_in <= today && b.check_out > today && !['cancelled', 'checked_out'].includes(b.status)
      ).length;

      setKpis({
        total_properties: activeProps,
        active_bookings: activeBookings.length,
        pending_cleanings: cleanings.length,
        monthly_revenue: monthRevenue,
        occupancy_rate: activeProps > 0 ? Math.round((occupiedToday / activeProps) * 100) : 0,
        arrivals_today: movementsData.filter(m => m.movement_type === 'arrival').length,
        departures_today: movementsData.filter(m => m.movement_type === 'departure').length,
        conflicts_count: bookings.filter(b => b.is_conflict === true).length,
      });

      setMovements(movementsData);
    } catch {
      // If everything fails, set empty KPIs so the dashboard still renders
      setKpis({ total_properties: 0, active_bookings: 0, pending_cleanings: 0, monthly_revenue: 0, occupancy_rate: 0, arrivals_today: 0, departures_today: 0, conflicts_count: 0 });
    }
    setLoading(false);
  }, []);

  return { kpis, movements, loading, fetch };
}

// ─── Owner Reports ──────────────────────────────────────────
export function useReports() {
  const crud = useCrud<Report>('reports');

  const fetchByOwner = useCallback(async (ownerId: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('owner_id', ownerId)
        .order('period', { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (!error && data) {
        crud.setData(data as Report[]);
      }
    } catch { /* timeout */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crud.setData]);

  const generate = async (ownerId: string, year: number, month: number) => {
    const { data, error } = await supabase.rpc('generate_owner_report', {
      p_owner_id: ownerId,
      p_year: year,
      p_month: month,
    });
    if (error) throw error;
    await fetchByOwner(ownerId);
    return data;
  };

  return { ...crud, fetchByOwner, generate };
}

// ─── Realtime Subscriptions ─────────────────────────────────
// Use refs to avoid re-subscribing on every render when callbacks change
export function useRealtimeBookings(callback: (payload: unknown) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        callbackRef.current(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}

export function useRealtimeCleanings(callback: (payload: unknown) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const channel = supabase
      .channel('cleanings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanings' }, (payload) => {
        callbackRef.current(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
