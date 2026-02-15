"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AnalyticsRow, AnalyticsData } from "@/types";

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

const PLATFORM_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direct: "Direct",
  other: "Autre",
};

function transformForCharts(rows: AnalyticsRow[]): AnalyticsData {
  // Revenue by month
  const revenueMap = new Map<number, number>();
  const occupancyMap = new Map<number, { nights: number; days: number }>();
  const bookingsMap = new Map<number, number>();
  const propertyMap = new Map<string, number>();
  const platformMap = new Map<string, number>();

  for (const r of rows) {
    // Revenue by month
    revenueMap.set(r.month, (revenueMap.get(r.month) || 0) + r.gross_revenue);

    // Occupancy: accumulate nights and days per month
    const prev = occupancyMap.get(r.month) || { nights: 0, days: 0 };
    occupancyMap.set(r.month, {
      nights: prev.nights + r.nights_booked,
      days: Math.max(prev.days, r.days_in_month), // same for all properties in a month
    });

    // Bookings count by month
    bookingsMap.set(r.month, (bookingsMap.get(r.month) || 0) + r.bookings_count);

    // Revenue by property
    if (r.gross_revenue > 0) {
      propertyMap.set(r.property_name, (propertyMap.get(r.property_name) || 0) + r.gross_revenue);
    }

    // Revenue by platform
    const platformLabel = PLATFORM_LABELS[r.platform] || r.platform;
    if (r.gross_revenue > 0) {
      platformMap.set(platformLabel, (platformMap.get(platformLabel) || 0) + r.gross_revenue);
    }
  }

  // Get unique property count for occupancy calculation
  const propertiesPerMonth = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!propertiesPerMonth.has(r.month)) propertiesPerMonth.set(r.month, new Set());
    propertiesPerMonth.get(r.month)!.add(r.property_id);
  }

  const revenueByMonth = Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_LABELS[i],
    revenue: Math.round((revenueMap.get(i + 1) || 0) * 100) / 100,
  }));

  const occupancyByMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const occ = occupancyMap.get(m);
    const propCount = propertiesPerMonth.get(m)?.size || 1;
    const totalAvailableDays = (occ?.days || 30) * propCount;
    const rate = totalAvailableDays > 0
      ? Math.round(((occ?.nights || 0) / totalAvailableDays) * 1000) / 10
      : 0;
    return { month: MONTH_LABELS[i], rate };
  });

  const bookingsByMonth = Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_LABELS[i],
    count: bookingsMap.get(i + 1) || 0,
  }));

  const revenueByProperty = Array.from(propertyMap.entries())
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByPlatform = Array.from(platformMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));

  const totalRevenue = revenueByMonth.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = bookingsByMonth.reduce((s, r) => s + r.count, 0);
  const monthsWithData = occupancyByMonth.filter(o => o.rate > 0);
  const avgOccupancy = monthsWithData.length > 0
    ? Math.round(monthsWithData.reduce((s, o) => s + o.rate, 0) / monthsWithData.length * 10) / 10
    : 0;

  return {
    revenueByMonth,
    occupancyByMonth,
    revenueByProperty,
    revenueByPlatform,
    bookingsByMonth,
    totalRevenue,
    totalBookings,
    avgOccupancy,
  };
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (year: number) => {
    setLoading(true);
    try {
      // Try RPC first
      const { data: result, error } = await supabase
        .rpc('calculate_analytics_data', { p_year: year })
        .abortSignal(AbortSignal.timeout(15000));

      if (!error && result) {
        setData(transformForCharts(result as AnalyticsRow[]));
      } else {
        // Fallback: use profitability RPC for each month
        const results = await Promise.allSettled(
          Array.from({ length: 12 }, (_, i) =>
            supabase.rpc('calculate_properties_profitability', {
              p_year: year,
              p_month: i + 1,
            }).abortSignal(AbortSignal.timeout(10000))
          )
        );

        const rows: AnalyticsRow[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value.data) {
            for (const p of r.value.data) {
              rows.push({
                month: i + 1,
                property_id: p.property_id,
                property_name: p.property_name,
                city: p.city,
                platform: 'direct',
                bookings_count: p.bookings_count,
                nights_booked: p.nights_booked,
                days_in_month: p.days_in_month,
                occupancy_rate: p.occupancy_rate,
                gross_revenue: p.gross_revenue,
                cleaning_costs: p.cleaning_costs,
                net_revenue: p.gross_revenue - p.commission_amount - p.cleaning_costs,
              });
            }
          }
        });
        setData(transformForCharts(rows));
      }
    } catch {
      setData({
        revenueByMonth: [], occupancyByMonth: [], revenueByProperty: [],
        revenueByPlatform: [], bookingsByMonth: [],
        totalRevenue: 0, totalBookings: 0, avgOccupancy: 0,
      });
    }
    setLoading(false);
  }, []);

  return { data, loading, fetch };
}
