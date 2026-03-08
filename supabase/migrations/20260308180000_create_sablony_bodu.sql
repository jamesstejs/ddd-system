-- Sprint 6: sablony_bodu table for monitoring point calculator

-- 1. Create typ_zasahu_kalkulacka enum
CREATE TYPE public.typ_zasahu_kalkulacka AS ENUM (
  'vnitrni_deratizace',
  'vnejsi_deratizace',
  'vnitrni_dezinsekce',
  'postrik'
);

-- 2. sablony_bodu table
CREATE TABLE public.sablony_bodu (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ_objektu     public.typ_objektu NOT NULL,
  typ_zasahu      public.typ_zasahu_kalkulacka NOT NULL,
  rozsah_m2_od    INT NOT NULL DEFAULT 0,
  rozsah_m2_do    INT DEFAULT NULL,
  bod_s_mys       INT NOT NULL DEFAULT 0,
  bod_l_potkan    INT NOT NULL DEFAULT 0,
  zivolovna       INT NOT NULL DEFAULT 0,
  letajici        INT NOT NULL DEFAULT 0,
  lezouci         INT NOT NULL DEFAULT 0,
  vzorec_nad_max  JSONB DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- 3. moddatetime trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sablony_bodu
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexes
CREATE INDEX idx_sablony_bodu_lookup
  ON public.sablony_bodu(typ_objektu, typ_zasahu, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_sablony_bodu_active
  ON public.sablony_bodu(deleted_at)
  WHERE deleted_at IS NULL;

-- 5. RLS
ALTER TABLE public.sablony_bodu ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "Admins can view all sablony_bodu"
  ON public.sablony_bodu FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert sablony_bodu"
  ON public.sablony_bodu FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update sablony_bodu"
  ON public.sablony_bodu FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete sablony_bodu"
  ON public.sablony_bodu FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Authenticated users (technici) can read
CREATE POLICY "Authenticated users can view sablony_bodu"
  ON public.sablony_bodu FOR SELECT
  USING (auth.role() = 'authenticated');
