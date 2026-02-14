-- ============================================================
-- QuietStay Ops — Migration 010: Company Settings
-- ============================================================

-- 1. company_settings table (singleton — one row for the org)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  canton TEXT NOT NULL DEFAULT 'GE',
  phone TEXT,
  email TEXT,
  iban TEXT,
  tva_number TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_authenticated" ON public.company_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. updated_at trigger (reuses handle_updated_at from migration 008)
CREATE TRIGGER set_updated_at_company_settings
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
