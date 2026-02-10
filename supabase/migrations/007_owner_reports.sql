-- ============================================================
-- QuietStay Ops — Migration 007: Owner Reports
-- ============================================================

-- 1. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_owner_period UNIQUE (owner_id, period)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_reports_owner ON public.reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.reports(period DESC);

-- 3. RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_authenticated_all" ON public.reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Function to generate a monthly report for an owner
CREATE OR REPLACE FUNCTION public.generate_owner_report(
  p_owner_id UUID,
  p_year INT,
  p_month INT
)
RETURNS UUID AS $$
DECLARE
  v_period TEXT;
  v_start DATE;
  v_end DATE;
  v_days_in_month INT;
  v_report_id UUID;
  v_properties JSONB := '[]'::JSONB;
  v_prop RECORD;
  v_bk RECORD;
  v_cl RECORD;
  v_total_bookings INT := 0;
  v_total_nights INT := 0;
  v_total_revenue NUMERIC := 0;
  v_total_cleanings INT := 0;
BEGIN
  v_period := p_year || '-' || LPAD(p_month::TEXT, 2, '0');
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  v_days_in_month := EXTRACT(DAY FROM v_end);

  FOR v_prop IN
    SELECT id, name, property_type, city, canton, bedrooms, max_guests
    FROM public.properties
    WHERE owner_id = p_owner_id
    ORDER BY name
  LOOP
    -- Booking stats for this property in this period
    SELECT
      COALESCE(COUNT(*), 0) AS cnt,
      COALESCE(SUM(
        LEAST(check_out, v_end + 1) - GREATEST(check_in, v_start)
      ), 0) AS nights,
      COALESCE(SUM(total_amount), 0) AS revenue
    INTO v_bk
    FROM public.bookings
    WHERE property_id = v_prop.id
      AND status NOT IN ('cancelled')
      AND check_in <= v_end
      AND check_out > v_start;

    -- Cleaning stats
    SELECT COALESCE(COUNT(*), 0) AS cnt
    INTO v_cl
    FROM public.cleanings
    WHERE property_id = v_prop.id
      AND scheduled_date >= v_start
      AND scheduled_date <= v_end;

    v_total_bookings := v_total_bookings + v_bk.cnt;
    v_total_nights := v_total_nights + v_bk.nights;
    v_total_revenue := v_total_revenue + v_bk.revenue;
    v_total_cleanings := v_total_cleanings + v_cl.cnt;

    v_properties := v_properties || jsonb_build_object(
      'property_id', v_prop.id,
      'property_name', v_prop.name,
      'property_type', v_prop.property_type,
      'city', v_prop.city,
      'canton', v_prop.canton,
      'bedrooms', v_prop.bedrooms,
      'max_guests', v_prop.max_guests,
      'bookings_count', v_bk.cnt,
      'nights_booked', v_bk.nights,
      'revenue', v_bk.revenue,
      'cleanings_count', v_cl.cnt,
      'occupancy_rate', CASE WHEN v_days_in_month > 0
        THEN ROUND((v_bk.nights::NUMERIC / v_days_in_month) * 100)
        ELSE 0 END
    );
  END LOOP;

  -- Upsert report
  INSERT INTO public.reports (owner_id, period, data)
  VALUES (
    p_owner_id,
    v_period,
    jsonb_build_object(
      'properties', v_properties,
      'summary', jsonb_build_object(
        'total_properties', jsonb_array_length(v_properties),
        'total_bookings', v_total_bookings,
        'total_nights', v_total_nights,
        'total_revenue', v_total_revenue,
        'total_cleanings', v_total_cleanings,
        'period', v_period,
        'period_start', v_start,
        'period_end', v_end
      )
    )
  )
  ON CONFLICT (owner_id, period)
  DO UPDATE SET data = EXCLUDED.data, generated_at = NOW()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
