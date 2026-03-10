-- Sprint 16: Bezpečnostní listy + Šablony poučení
-- 1) bezpecnostni_listy — PDF soubory ke každému přípravku (Supabase Storage)
-- 2) sablony_pouceni — textové šablony per škůdce/typ zásahu
-- 3) Storage bucket bezpecnostni-listy

-- ============================================================
-- 1. Tabulka bezpecnostni_listy
-- ============================================================
CREATE TABLE public.bezpecnostni_listy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pripravek_id    UUID NOT NULL REFERENCES public.pripravky(id) ON DELETE CASCADE,
  soubor_url      TEXT NOT NULL,
  nazev_souboru   TEXT NOT NULL,
  velikost_bytes  BIGINT DEFAULT NULL,
  nahrano_datum   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bezpecnostni_listy
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Indexy
CREATE INDEX idx_bezpecnostni_listy_pripravek
  ON public.bezpecnostni_listy(pripravek_id);
CREATE INDEX idx_bezpecnostni_listy_active
  ON public.bezpecnostni_listy(deleted_at) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.bezpecnostni_listy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bezpecnostni_listy"
  ON public.bezpecnostni_listy FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert bezpecnostni_listy"
  ON public.bezpecnostni_listy FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update bezpecnostni_listy"
  ON public.bezpecnostni_listy FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete bezpecnostni_listy"
  ON public.bezpecnostni_listy FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Komentáře
COMMENT ON TABLE public.bezpecnostni_listy IS 'PDF bezpečnostní listy přiřazené k přípravkům';
COMMENT ON COLUMN public.bezpecnostni_listy.soubor_url IS 'Veřejná URL k PDF v Supabase Storage';
COMMENT ON COLUMN public.bezpecnostni_listy.velikost_bytes IS 'Velikost souboru v bajtech';

-- ============================================================
-- 2. Storage bucket pro bezpečnostní listy
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bezpecnostni-listy', 'bezpecnostni-listy', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload bezpecnostni-listy"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bezpecnostni-listy'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Anyone authenticated can view bezpecnostni-listy"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bezpecnostni-listy'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update bezpecnostni-listy"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bezpecnostni-listy'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Admins can delete bezpecnostni-listy"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bezpecnostni-listy'
    AND public.is_admin_or_super_admin()
  );

-- ============================================================
-- 3. Tabulka sablony_pouceni
-- ============================================================
CREATE TABLE public.sablony_pouceni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skudce_id     UUID DEFAULT NULL REFERENCES public.skudci(id) ON DELETE SET NULL,
  typ_zasahu    TEXT DEFAULT NULL,
  nazev         TEXT NOT NULL,
  obsah         TEXT NOT NULL DEFAULT '',
  aktivni       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sablony_pouceni
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Indexy
CREATE INDEX idx_sablony_pouceni_skudce
  ON public.sablony_pouceni(skudce_id);
CREATE INDEX idx_sablony_pouceni_typ_zasahu
  ON public.sablony_pouceni(typ_zasahu);
CREATE INDEX idx_sablony_pouceni_active
  ON public.sablony_pouceni(deleted_at) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.sablony_pouceni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sablony_pouceni"
  ON public.sablony_pouceni FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert sablony_pouceni"
  ON public.sablony_pouceni FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update sablony_pouceni"
  ON public.sablony_pouceni FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete sablony_pouceni"
  ON public.sablony_pouceni FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Komentáře
COMMENT ON TABLE public.sablony_pouceni IS 'Šablony textů poučení per škůdce/typ zásahu, admin CRUD';
COMMENT ON COLUMN public.sablony_pouceni.typ_zasahu IS 'Typ zásahu: deratizace, dezinsekce, postrik, dezinfekce, obecne';
COMMENT ON COLUMN public.sablony_pouceni.obsah IS 'Plný text poučení, může obsahovat HTML nebo markdown';
