-- ============================================================
-- QuietStay Ops — Migration 008: WhatsApp Notifications
-- ============================================================

-- 1. notification_settings table (one row per user)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whatsapp_phone TEXT,
  event_overbooking BOOLEAN NOT NULL DEFAULT true,
  event_booking_created BOOLEAN NOT NULL DEFAULT true,
  event_booking_cancelled BOOLEAN NOT NULL DEFAULT true,
  event_cleaning_not_validated BOOLEAN NOT NULL DEFAULT true,
  event_incident_reported BOOLEAN NOT NULL DEFAULT true,
  event_checkin_no_cleaning BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_user UNIQUE (user_id)
);

-- 2. notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  whatsapp_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  meta_message_id TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON public.notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON public.notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_entity ON public.notification_logs(entity_type, entity_id);

-- 4. RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on settings
CREATE POLICY "notif_settings_admin_all" ON public.notification_settings
  FOR ALL TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Users can manage their own settings
CREATE POLICY "notif_settings_self" ON public.notification_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can see all logs
CREATE POLICY "notif_logs_admin_read" ON public.notification_logs
  FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');

-- Users can see their own logs
CREATE POLICY "notif_logs_self_read" ON public.notification_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Anyone authenticated can insert logs (needed by API route via service_role)
CREATE POLICY "notif_logs_insert" ON public.notification_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 5. updated_at trigger
CREATE TRIGGER set_updated_at_notification_settings
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. REPLICA IDENTITY FULL for realtime change detection
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.cleanings REPLICA IDENTITY FULL;
