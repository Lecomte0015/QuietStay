import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PropertyProfitability } from '@/types';

export function useProfitability() {
  const [data, setData] = useState<PropertyProfitability[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (year: number, month: number) => {
    setLoading(true);
    const { data: result, error } = await supabase.rpc('calculate_properties_profitability', {
      p_year: year,
      p_month: month,
    });

    if (!error && result) {
      setData(result as PropertyProfitability[]);
    }
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async (propertyId: string, year: number): Promise<PropertyProfitability[]> => {
    const promises = Array.from({ length: 12 }, (_, i) =>
      supabase.rpc('calculate_properties_profitability', { p_year: year, p_month: i + 1 })
    );
    const results = await Promise.all(promises);
    const months: PropertyProfitability[] = [];

    results.forEach((res) => {
      if (res.data) {
        const match = (res.data as PropertyProfitability[]).find(r => r.property_id === propertyId);
        if (match) {
          months.push(match);
        } else {
          months.push({
            property_id: propertyId, property_name: '', property_type: '', city: '', canton: '',
            owner_name: '', bookings_count: 0, nights_booked: 0, days_in_month: 0,
            occupancy_rate: 0, gross_revenue: 0, commission_amount: 0, cleaning_costs: 0, net_profit: 0
          });
        }
      }
    });
    return months;
  }, []);

  return { data, loading, fetch, fetchHistory };
}
