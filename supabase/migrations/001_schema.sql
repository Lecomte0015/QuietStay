-- ============================================================
-- QuietStay Ops — Schema complet
-- Conciergerie immobilière courte durée (Suisse)
-- ============================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Profils utilisateurs (extension de Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'owner')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Propriétaires
CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  iban TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logements
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Genève',
  canton TEXT NOT NULL DEFAULT 'GE',
  postal_code TEXT,
  property_type TEXT NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'house', 'studio', 'chalet', 'villa')),
  bedrooms INT NOT NULL DEFAULT 1,
  max_guests INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Réservations
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'direct' CHECK (platform IN ('airbnb', 'booking', 'direct', 'other')),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_count INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2),
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- Ménages
CREATE TABLE public.cleanings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'validated', 'issue')),
  type TEXT NOT NULL DEFAULT 'checkout' CHECK (type IN ('checkout', 'checkin', 'deep', 'maintenance')),
  checklist JSONB DEFAULT '[]',
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accès logements
CREATE TABLE public.accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('code', 'key', 'lockbox', 'smartlock')),
  label TEXT NOT NULL DEFAULT 'Entrée principale',
  value TEXT NOT NULL,
  instructions TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Factures propriétaires
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  cleaning_costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs d'activité
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEX
-- ============================================================

CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_bookings_property ON public.bookings(property_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_cleanings_date ON public.cleanings(scheduled_date);
CREATE INDEX idx_cleanings_status ON public.cleanings(status);
CREATE INDEX idx_cleanings_assigned ON public.cleanings(assigned_to);
CREATE INDEX idx_accesses_property ON public.accesses(property_id);
CREATE INDEX idx_invoices_owner ON public.invoices(owner_id);
CREATE INDEX idx_invoices_period ON public.invoices(period_start, period_end);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: récupérer l'owner_id lié à l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_owner_id()
RETURNS UUID AS $$
  SELECT id FROM public.owners WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- OWNERS
CREATE POLICY "owners_admin_all" ON public.owners
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "owners_staff_read" ON public.owners
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "owners_self_read" ON public.owners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PROPERTIES
CREATE POLICY "properties_admin_all" ON public.properties
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "properties_staff_read" ON public.properties
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "properties_owner_read" ON public.properties
  FOR SELECT TO authenticated
  USING (owner_id = public.get_user_owner_id());

-- BOOKINGS
CREATE POLICY "bookings_admin_all" ON public.bookings
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "bookings_staff_all" ON public.bookings
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "bookings_owner_read" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = public.get_user_owner_id()
    )
  );

-- CLEANINGS
CREATE POLICY "cleanings_admin_all" ON public.cleanings
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "cleanings_staff_all" ON public.cleanings
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "cleanings_owner_read" ON public.cleanings
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = public.get_user_owner_id()
    )
  );

-- ACCESSES
CREATE POLICY "accesses_admin_all" ON public.accesses
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "accesses_staff_read" ON public.accesses
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'staff');

CREATE POLICY "accesses_owner_read" ON public.accesses
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = public.get_user_owner_id()
    )
  );

-- INVOICES
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "invoices_owner_read" ON public.invoices
  FOR SELECT TO authenticated
  USING (owner_id = public.get_user_owner_id());

-- ACTIVITY LOGS
CREATE POLICY "logs_admin_read" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- ============================================================
-- 4. TRIGGERS & FONCTIONS MÉTIER
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_owners BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_properties BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_cleanings BEFORE UPDATE ON public.cleanings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_accesses BEFORE UPDATE ON public.accesses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-créer un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Création automatique d'un ménage à chaque réservation
CREATE OR REPLACE FUNCTION public.auto_create_cleaning()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'pending') THEN
    INSERT INTO public.cleanings (booking_id, property_id, scheduled_date, type)
    VALUES (NEW.id, NEW.property_id, NEW.check_out, 'checkout')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_cleaning_on_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_cleaning();

-- Fonction de génération mensuelle de factures
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(
  p_year INT,
  p_month INT
)
RETURNS INT AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_count INT := 0;
  v_owner RECORD;
  v_revenue DECIMAL(10,2);
  v_commission DECIMAL(10,2);
BEGIN
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  FOR v_owner IN SELECT DISTINCT o.id FROM public.owners o
    JOIN public.properties p ON p.owner_id = o.id
    JOIN public.bookings b ON b.property_id = p.id
    WHERE b.check_out >= v_start AND b.check_in <= v_end
      AND b.status IN ('checked_out', 'confirmed', 'checked_in')
  LOOP
    SELECT
      COALESCE(SUM(b.total_amount), 0),
      COALESCE(SUM(b.total_amount * b.commission_rate / 100), 0)
    INTO v_revenue, v_commission
    FROM public.bookings b
    JOIN public.properties p ON p.id = b.property_id
    WHERE p.owner_id = v_owner.id
      AND b.check_out >= v_start AND b.check_in <= v_end
      AND b.status IN ('checked_out', 'confirmed', 'checked_in');

    INSERT INTO public.invoices (owner_id, period_start, period_end, total_revenue, commission_amount, net_amount)
    VALUES (v_owner.id, v_start, v_end, v_revenue, v_commission, v_revenue - v_commission);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue arrivées / départs du jour
CREATE OR REPLACE VIEW public.today_movements AS
SELECT
  b.id AS booking_id,
  b.guest_name,
  b.guest_phone,
  p.name AS property_name,
  p.address,
  b.check_in,
  b.check_out,
  CASE
    WHEN b.check_in = CURRENT_DATE THEN 'arrival'
    WHEN b.check_out = CURRENT_DATE THEN 'departure'
  END AS movement_type,
  b.status AS booking_status,
  a.type AS access_type,
  a.value AS access_value,
  a.instructions AS access_instructions
FROM public.bookings b
JOIN public.properties p ON p.id = b.property_id
LEFT JOIN public.accesses a ON a.property_id = p.id AND a.is_active = TRUE
WHERE (b.check_in = CURRENT_DATE OR b.check_out = CURRENT_DATE)
  AND b.status NOT IN ('cancelled');
