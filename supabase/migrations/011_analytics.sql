-- ============================================================
-- QuietStay Ops — Migration 011: Analytics Data Function
-- ============================================================

-- Returns monthly analytics data for a given year,
-- grouped by (month, property, platform) for chart rendering.
CREATE OR REPLACE FUNCTION public.calculate_analytics_data(
  p_year INT
)
RETURNS TABLE (
  month INT,
  property_id UUID,
  property_name TEXT,
  city TEXT,
  platform TEXT,
  bookings_count BIGINT,
  nights_booked BIGINT,
  days_in_month INT,
  occupancy_rate NUMERIC,
  gross_revenue NUMERIC,
  cleaning_costs NUMERIC,
  net_revenue NUMERIC
) AS $$
DECLARE
  m INT;
  v_start DATE;
  v_end DATE;
  v_days INT;
BEGIN
  FOR m IN 1..12 LOOP
    v_start := make_date(p_year, m, 1);
    v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_days := EXTRACT(DAY FROM v_end);

    RETURN QUERY
    SELECT
      m AS month,
      p.id AS property_id,
      p.name AS property_name,
      p.city,
      COALESCE(bk.platform, 'direct') AS platform,
      COALESCE(bk.cnt, 0)::BIGINT AS bookings_count,
      COALESCE(bk.nights, 0)::BIGINT AS nights_booked,
      v_days AS days_in_month,
      CASE WHEN v_days > 0
        THEN ROUND((COALESCE(bk.nights, 0)::NUMERIC / v_days) * 100, 1)
        ELSE 0
      END AS occupancy_rate,
      COALESCE(bk.revenue, 0)::NUMERIC AS gross_revenue,
      COALESCE(cl.costs, 0)::NUMERIC AS cleaning_costs,
      (COALESCE(bk.revenue, 0) - COALESCE(cl.costs, 0))::NUMERIC AS net_revenue
    FROM public.properties p
    LEFT JOIN LATERAL (
      SELECT
        b.platform,
        COUNT(*) AS cnt,
        SUM(LEAST(b.check_out, v_end + 1) - GREATEST(b.check_in, v_start)) AS nights,
        SUM(COALESCE(b.total_amount, 0)) AS revenue
      FROM public.bookings b
      WHERE b.property_id = p.id
        AND b.status NOT IN ('cancelled')
        AND b.check_in <= v_end
        AND b.check_out > v_start
      GROUP BY b.platform
    ) bk ON true
    LEFT JOIN LATERAL (
      SELECT SUM(COALESCE(c.cost, 80)) AS costs
      FROM public.cleanings c
      WHERE c.property_id = p.id
        AND c.scheduled_date >= v_start
        AND c.scheduled_date <= v_end
    ) cl ON true
    WHERE p.status = 'active';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
