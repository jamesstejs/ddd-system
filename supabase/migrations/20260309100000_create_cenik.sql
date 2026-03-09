-- Sprint 7: Ceník tables (6 tables for pricing)

-- =====================================================
-- 1. cenik_obecne — general pricing (výjezd, doprava, příplatky)
-- =====================================================
CREATE TABLE public.cenik_obecne (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev       TEXT NOT NULL,
  hodnota     NUMERIC(10,2) NOT NULL,
  jednotka    TEXT NOT NULL,
  poznamka    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_obecne
  BEFORE UPDATE ON public.cenik_obecne
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_obecne_active
  ON public.cenik_obecne(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_obecne ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_obecne"
  ON public.cenik_obecne FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_obecne"
  ON public.cenik_obecne FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_obecne"
  ON public.cenik_obecne FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_obecne"
  ON public.cenik_obecne FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_obecne"
  ON public.cenik_obecne FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. cenik_postriky — postřiky domácnosti
-- =====================================================
CREATE TABLE public.cenik_postriky (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorie   TEXT NOT NULL,
  plocha_od   INT NOT NULL,
  plocha_do   INT DEFAULT NULL,
  cena        NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_postriky
  BEFORE UPDATE ON public.cenik_postriky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_postriky_lookup
  ON public.cenik_postriky(kategorie, plocha_od, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cenik_postriky_active
  ON public.cenik_postriky(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_postriky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_postriky"
  ON public.cenik_postriky FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_postriky"
  ON public.cenik_postriky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_postriky"
  ON public.cenik_postriky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_postriky"
  ON public.cenik_postriky FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_postriky"
  ON public.cenik_postriky FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. cenik_gely — gelové nástrahy domácnosti
-- =====================================================
CREATE TABLE public.cenik_gely (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorie   TEXT NOT NULL,
  bytu_od     INT NOT NULL,
  bytu_do     INT DEFAULT NULL,
  cena        NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_gely
  BEFORE UPDATE ON public.cenik_gely
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_gely_lookup
  ON public.cenik_gely(kategorie, bytu_od, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cenik_gely_active
  ON public.cenik_gely(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_gely ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_gely"
  ON public.cenik_gely FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_gely"
  ON public.cenik_gely FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_gely"
  ON public.cenik_gely FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_gely"
  ON public.cenik_gely FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_gely"
  ON public.cenik_gely FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 4. cenik_specialni — speciální zásahy
-- =====================================================
CREATE TABLE public.cenik_specialni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev       TEXT NOT NULL,
  cena_od     NUMERIC(10,2) NOT NULL,
  cena_do     NUMERIC(10,2) DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_specialni
  BEFORE UPDATE ON public.cenik_specialni
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_specialni_active
  ON public.cenik_specialni(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_specialni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_specialni"
  ON public.cenik_specialni FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_specialni"
  ON public.cenik_specialni FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_specialni"
  ON public.cenik_specialni FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_specialni"
  ON public.cenik_specialni FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_specialni"
  ON public.cenik_specialni FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. cenik_deratizace — smluvní monitoring
-- =====================================================
CREATE TABLE public.cenik_deratizace (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev         TEXT NOT NULL,
  cena_za_kus   NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_deratizace
  BEFORE UPDATE ON public.cenik_deratizace
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_deratizace_active
  ON public.cenik_deratizace(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_deratizace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_deratizace"
  ON public.cenik_deratizace FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_deratizace"
  ON public.cenik_deratizace FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_deratizace"
  ON public.cenik_deratizace FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_deratizace"
  ON public.cenik_deratizace FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_deratizace"
  ON public.cenik_deratizace FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. cenik_dezinfekce — dezinfekce dle plochy
-- =====================================================
CREATE TABLE public.cenik_dezinfekce (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ         TEXT NOT NULL,
  plocha_od   INT NOT NULL,
  plocha_do   INT DEFAULT NULL,
  cena_za_m   NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_cenik_dezinfekce
  BEFORE UPDATE ON public.cenik_dezinfekce
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_cenik_dezinfekce_lookup
  ON public.cenik_dezinfekce(typ, plocha_od, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cenik_dezinfekce_active
  ON public.cenik_dezinfekce(deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.cenik_dezinfekce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cenik_dezinfekce"
  ON public.cenik_dezinfekce FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert cenik_dezinfekce"
  ON public.cenik_dezinfekce FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update cenik_dezinfekce"
  ON public.cenik_dezinfekce FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete cenik_dezinfekce"
  ON public.cenik_dezinfekce FOR DELETE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Authenticated users can view cenik_dezinfekce"
  ON public.cenik_dezinfekce FOR SELECT
  USING (auth.role() = 'authenticated');
