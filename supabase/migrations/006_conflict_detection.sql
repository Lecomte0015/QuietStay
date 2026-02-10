-- ============================================================
-- QuietStay Ops — Migration 006: Conflict Detection
-- ============================================================

-- 1. Add is_conflict column
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_conflict BOOLEAN DEFAULT false;

-- 2. Index for conflict queries
CREATE INDEX IF NOT EXISTS idx_bookings_conflict
  ON public.bookings(property_id, check_in, check_out)
  WHERE status NOT IN ('cancelled');

-- 3. Function to detect overlapping bookings
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  p_booking_id UUID,
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Cancelled bookings cannot be in conflict
  IF p_status = 'cancelled' THEN
    UPDATE public.bookings SET is_conflict = false WHERE id = p_booking_id;
    -- Re-check remaining bookings on this property
    UPDATE public.bookings
    SET is_conflict = EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id != bookings.id
        AND b.property_id = bookings.property_id
        AND b.status != 'cancelled'
        AND b.check_in < bookings.check_out
        AND b.check_out > bookings.check_in
    )
    WHERE property_id = p_property_id
      AND status != 'cancelled'
      AND id != p_booking_id;
    RETURN;
  END IF;

  -- Update all potentially affected bookings on this property
  UPDATE public.bookings
  SET is_conflict = EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id != bookings.id
      AND b.property_id = bookings.property_id
      AND b.status != 'cancelled'
      AND b.check_in < bookings.check_out
      AND b.check_out > bookings.check_in
  )
  WHERE property_id = p_property_id
    AND status != 'cancelled'
    AND (
      (check_in < p_check_out AND check_out > p_check_in)
      OR id = p_booking_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.handle_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.check_booking_conflicts(
    NEW.id, NEW.property_id, NEW.check_in, NEW.check_out, NEW.status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_conflicts_on_booking ON public.bookings;
CREATE TRIGGER check_conflicts_on_booking
  AFTER INSERT OR UPDATE OF property_id, check_in, check_out, status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_conflict();

-- 5. Backfill existing conflicts
DO $$
DECLARE
  booking RECORD;
BEGIN
  FOR booking IN
    SELECT id, property_id, check_in, check_out, status
    FROM public.bookings
    WHERE status != 'cancelled'
  LOOP
    PERFORM public.check_booking_conflicts(
      booking.id, booking.property_id, booking.check_in, booking.check_out, booking.status
    );
  END LOOP;
END $$;
