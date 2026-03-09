-- Sprint 9: zakazka_polozky (cenová kalkulace) + rozšíření zakazky

-- 1. Zakazka polozky table (line items)
CREATE TABLE public.zakazka_polozky (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zakazka_id      UUID NOT NULL REFERENCES public.zakazky(id) ON DELETE CASCADE,
  nazev           TEXT NOT NULL,
  pocet           NUMERIC(10,2) NOT NULL DEFAULT 1,
  cena_za_kus     NUMERIC(10,2) NOT NULL,
  cena_celkem     NUMERIC(10,2) NOT NULL,
  poradi          INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- 2. moddatetime trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.zakazka_polozky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 3. Indexes
CREATE INDEX idx_zakazka_polozky_zakazka ON public.zakazka_polozky(zakazka_id);
CREATE INDEX idx_zakazka_polozky_active ON public.zakazka_polozky(deleted_at) WHERE deleted_at IS NULL;

-- 4. RLS
ALTER TABLE public.zakazka_polozky ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin: full CRUD
CREATE POLICY "Admins can view all zakazka_polozky"
  ON public.zakazka_polozky FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert zakazka_polozky"
  ON public.zakazka_polozky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update zakazka_polozky"
  ON public.zakazka_polozky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete zakazka_polozky"
  ON public.zakazka_polozky FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: can SELECT
CREATE POLICY "Technik can view zakazka_polozky"
  ON public.zakazka_polozky FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );

-- 5. ALTER zakazky — new pricing columns
ALTER TABLE public.zakazky
  ADD COLUMN doprava_km          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN je_prvni_navsteva   BOOLEAN DEFAULT true,
  ADD COLUMN je_vikend           BOOLEAN DEFAULT false,
  ADD COLUMN je_nocni            BOOLEAN DEFAULT false,
  ADD COLUMN pocet_bytu          INT DEFAULT NULL,
  ADD COLUMN sleva_typ           TEXT DEFAULT NULL,
  ADD COLUMN sleva_hodnota       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN sleva_zadal         TEXT DEFAULT NULL,
  ADD COLUMN cena_zaklad         NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN cena_po_sleve       NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN cena_s_dph          NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN dph_sazba_snapshot  NUMERIC(5,2) DEFAULT NULL;
