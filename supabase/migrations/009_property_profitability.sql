-- ============================================================
-- QuietStay Ops — Migration 009: Property Profitability
-- ============================================================

-- Function: calculate all properties' profitability for a given month
CREATE OR REPLACE FUNCTION public.calculate_properties_profitability(
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  property_id UUID,
  property_name TEXT,
  property_type TEXT,
  city TEXT,
  canton TEXT,
  owner_name TEXT,
  bookings_count BIGINT,
  nights_booked BIGINT,
  days_in_month INT,
  occupancy_rate NUMERIC,
  gross_revenue NUMERIC,
  commission_amount NUMERIC,
  cleaning_costs NUMERIC,
  net_profit NUMERIC
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_days INT;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_days := EXTRACT(DAY FROM v_end);

  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.name AS property_name,
    p.property_type::TEXT,
    p.city,
    p.canton,
    o.name AS owner_name,
    COALESCE(bk.cnt, 0)::BIGINT AS bookings_count,
    COALESCE(bk.nights, 0)::BIGINT AS nights_booked,
    v_days AS days_in_month,
    CASE WHEN v_days > 0
      THEN ROUND((COALESCE(bk.nights, 0)::NUMERIC / v_days) * 100, 1)
      ELSE 0
    END AS occupancy_rate,
    COALESCE(bk.revenue, 0)::NUMERIC AS gross_revenue,
    COALESCE(bk.commission, 0)::NUMERIC AS commission_amount,
    COALESCE(cl.costs, 0)::NUMERIC AS cleaning_costs,
    (COALESCE(bk.revenue, 0) - COALESCE(bk.commission, 0) - COALESCE(cl.costs, 0))::NUMERIC AS net_profit
  FROM public.properties p
  JOIN public.owners o ON o.id = p.owner_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS cnt,
      SUM(LEAST(b.check_out, v_end + 1) - GREATEST(b.check_in, v_start)) AS nights,
      SUM(COALESCE(b.total_amount, 0)) AS revenue,
      SUM(COALESCE(b.total_amount, 0) * COALESCE(b.commission_rate, 20) / 100) AS commission
    FROM public.bookings b
    WHERE b.property_id = p.id
      AND b.status NOT IN ('cancelled')
      AND b.check_in <= v_end
      AND b.check_out > v_start
  ) bk ON true
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(c.cost, 80)) AS costs
    FROM public.cleanings c
    WHERE c.property_id = p.id
      AND c.scheduled_date >= v_start
      AND c.scheduled_date <= v_end
  ) cl ON true
  WHERE p.status = 'active'
  ORDER BY net_profit DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
