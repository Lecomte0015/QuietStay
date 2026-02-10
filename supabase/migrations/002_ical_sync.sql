-- ============================================================
-- QuietStay Ops — Migration 002: iCal Sync
-- ============================================================

-- 1. Table calendar_sources
CREATE TABLE public.calendar_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('airbnb', 'booking')),
  ical_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending')),
  last_sync_message TEXT,
  events_synced INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_property_platform UNIQUE (property_id, platform)
);

-- 2. Colonne ical_uid sur bookings (déduplication des imports)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ical_uid TEXT;

-- Index unique partiel : empêche les doublons iCal sans affecter les réservations manuelles
CREATE UNIQUE INDEX idx_bookings_ical_uid
  ON public.bookings (property_id, ical_uid)
  WHERE ical_uid IS NOT NULL;

-- 3. Index pour calendar_sources
CREATE INDEX idx_calendar_sources_property ON public.calendar_sources(property_id);
CREATE INDEX idx_calendar_sources_active ON public.calendar_sources(is_active) WHERE is_active = TRUE;

-- 4. Trigger updated_at (réutilise handle_updated_at() de 001_schema.sql)
CREATE TRIGGER set_updated_at_calendar_sources
  BEFORE UPDATE ON public.calendar_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. RLS
ALTER TABLE public.calendar_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_sources_admin_all" ON public.calendar_sources
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "calendar_sources_staff_read" ON public.calendar_sources
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "calendar_sources_owner_read" ON public.calendar_sources
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = public.get_user_owner_id()
    )
  );
