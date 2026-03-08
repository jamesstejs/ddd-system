-- Sprint 5: škůdci + škůdce_přípravky tables

-- 1. Create typ_skudce enum
CREATE TYPE public.typ_skudce AS ENUM (
  'hlodavec',
  'lezouci_hmyz',
  'letajici_hmyz',
  'ostatni'
);

-- 2. Create typ_prostoru enum
CREATE TYPE public.typ_prostoru AS ENUM (
  'potravinarsky',
  'domacnost',
  'prumysl',
  'venkovni',
  'zemedelsky',
  'chov_zvirat'
);

-- 3. Skudci table
CREATE TABLE public.skudci (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev                  TEXT NOT NULL,
  latinsky_nazev         TEXT DEFAULT NULL,
  typ                    public.typ_skudce NOT NULL,
  kategorie              TEXT DEFAULT NULL,
  doporucena_cetnost_dny INT DEFAULT NULL,
  pocet_zasahu           TEXT DEFAULT NULL,
  poznamka               TEXT DEFAULT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ DEFAULT NULL
);

-- 4. moddatetime trigger for skudci
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.skudci
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 5. Indexes for skudci
CREATE INDEX idx_skudci_typ ON public.skudci(typ);
CREATE INDEX idx_skudci_active ON public.skudci(deleted_at) WHERE deleted_at IS NULL;

-- 6. RLS for skudci
ALTER TABLE public.skudci ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view (technici need to read pests for protocols)
CREATE POLICY "Authenticated can view skudci"
  ON public.skudci FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert skudci"
  ON public.skudci FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update skudci"
  ON public.skudci FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete skudci"
  ON public.skudci FOR DELETE
  USING (public.is_admin_or_super_admin());

-- 7. Skudce_pripravky table (junction — přípravky zatím nemají vlastní tabulku)
CREATE TABLE public.skudce_pripravky (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skudce_id       UUID NOT NULL REFERENCES public.skudci(id) ON DELETE CASCADE,
  pripravek_nazev TEXT NOT NULL,
  typ_prostoru    public.typ_prostoru NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- 8. moddatetime trigger for skudce_pripravky
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.skudce_pripravky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 9. Indexes for skudce_pripravky
CREATE INDEX idx_skudce_pripravky_skudce ON public.skudce_pripravky(skudce_id);
CREATE INDEX idx_skudce_pripravky_active ON public.skudce_pripravky(deleted_at) WHERE deleted_at IS NULL;

-- 10. RLS for skudce_pripravky
ALTER TABLE public.skudce_pripravky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view skudce_pripravky"
  ON public.skudce_pripravky FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert skudce_pripravky"
  ON public.skudce_pripravky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update skudce_pripravky"
  ON public.skudce_pripravky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete skudce_pripravky"
  ON public.skudce_pripravky FOR DELETE
  USING (public.is_admin_or_super_admin());
