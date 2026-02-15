-- ============================================================
-- QuietStay Ops — Guidebooks table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guidebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE UNIQUE,
  is_published BOOLEAN DEFAULT false,
  welcome_message TEXT,
  wifi_name TEXT,
  wifi_password TEXT,
  check_in_time TEXT DEFAULT '15:00',
  check_out_time TEXT DEFAULT '11:00',
  access_instructions TEXT,
  house_rules TEXT,
  parking_info TEXT,
  transport_info TEXT,
  restaurants TEXT,
  activities TEXT,
  emergency_contacts TEXT,
  custom_sections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_guidebooks_updated_at
  BEFORE UPDATE ON public.guidebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.guidebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_guidebooks" ON public.guidebooks
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (public.get_user_role() IN ('admin', 'staff'));

CREATE POLICY "owner_read_own_guidebooks" ON public.guidebooks
  FOR SELECT TO authenticated
  USING (property_id IN (
    SELECT id FROM public.properties WHERE owner_id = public.get_user_owner_id()
  ));
