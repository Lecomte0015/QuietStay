-- ============================================================
-- QuietStay Ops — Contracts table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),
  owner_id UUID REFERENCES public.owners(id),
  guest_name TEXT NOT NULL,
  guest_address TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  signed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (public.get_user_role() IN ('admin', 'staff'));

CREATE POLICY "owner_read_own_contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (owner_id = public.get_user_owner_id());
