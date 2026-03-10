-- Sprint 17: Protokoly — kompletní DB schéma
-- 6 enumů + 6 tabulek + DB funkce pro generování čísla protokolu
-- + Storage bucket protokol-fotky

-- ============================================================
-- 1. ENUMY
-- ============================================================

CREATE TYPE public.status_protokolu AS ENUM (
  'rozpracovany',
  'ke_schvaleni',
  'schvaleny',
  'odeslany'
);

CREATE TYPE public.typ_stanicky AS ENUM (
  'zivolovna',
  'mys',
  'potkan',
  'sklopna_mys',
  'sklopna_potkan'
);

CREATE TYPE public.stav_stanicky AS ENUM (
  'zavedena',
  'odcizena',
  'znovu_zavedena',
  'poskozena',
  'ok'
);

CREATE TYPE public.typ_lapace AS ENUM (
  'lezouci_hmyz',
  'letajici_hmyz',
  'lepova',
  'elektronicka'
);

CREATE TYPE public.typ_zakroku AS ENUM (
  'postrik',
  'ulv',
  'poprash',
  'gelova_nastraha'
);

-- ============================================================
-- 2. TABULKA protokoly
-- ============================================================

CREATE TABLE public.protokoly (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zasah_id              UUID NOT NULL REFERENCES public.zasahy(id) ON DELETE CASCADE,
  technik_id            UUID NOT NULL REFERENCES public.profiles(id),
  status                public.status_protokolu NOT NULL DEFAULT 'rozpracovany',
  zodpovedny_technik    TEXT NOT NULL DEFAULT 'Pavel Horák',
  cislo_protokolu       TEXT UNIQUE,
  podpis_klient_url     TEXT DEFAULT NULL,
  poznamka              TEXT DEFAULT NULL,
  ai_hodnoceni          TEXT DEFAULT NULL,
  admin_komentar        TEXT DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokoly
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Indexy
CREATE INDEX idx_protokoly_zasah ON public.protokoly(zasah_id);
CREATE INDEX idx_protokoly_technik ON public.protokoly(technik_id);
CREATE INDEX idx_protokoly_status ON public.protokoly(status);
CREATE INDEX idx_protokoly_active ON public.protokoly(deleted_at) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.protokoly ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all protokoly"
  ON public.protokoly FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert protokoly"
  ON public.protokoly FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update protokoly"
  ON public.protokoly FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete protokoly"
  ON public.protokoly FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: vlastní protokoly
CREATE POLICY "Technik can view own protokoly"
  ON public.protokoly FOR SELECT
  USING (technik_id = auth.uid());

CREATE POLICY "Technik can insert own protokoly"
  ON public.protokoly FOR INSERT
  WITH CHECK (technik_id = auth.uid());

CREATE POLICY "Technik can update own protokoly"
  ON public.protokoly FOR UPDATE
  USING (technik_id = auth.uid())
  WITH CHECK (technik_id = auth.uid());

-- Komentáře
COMMENT ON TABLE public.protokoly IS 'Hlavní tabulka protokolů — 1 protokol = 1 zásah';
COMMENT ON COLUMN public.protokoly.cislo_protokolu IS 'Unikátní číslo: P-[KLIENT_KOD]-[SEKVENCE]';
COMMENT ON COLUMN public.protokoly.zodpovedny_technik IS 'Jméno zodpovědného technika v PDF (default Pavel Horák)';
COMMENT ON COLUMN public.protokoly.ai_hodnoceni IS 'AI-generované hodnocení zásahu (Sprint 26)';
COMMENT ON COLUMN public.protokoly.admin_komentar IS 'Komentář admina při vrácení k přepracování';

-- ============================================================
-- 3. TABULKA protokol_deratizacni_body
-- ============================================================

CREATE TABLE public.protokol_deratizacni_body (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protokol_id     UUID NOT NULL REFERENCES public.protokoly(id) ON DELETE CASCADE,
  cislo_bodu      TEXT NOT NULL,
  okruh_id        UUID DEFAULT NULL REFERENCES public.okruhy(id) ON DELETE SET NULL,
  typ_stanicky    public.typ_stanicky NOT NULL,
  pripravek_id    UUID DEFAULT NULL REFERENCES public.pripravky(id) ON DELETE SET NULL,
  pozer_procent   INT NOT NULL DEFAULT 0 CHECK (pozer_procent IN (0, 25, 50, 75, 100)),
  stav_stanicky   public.stav_stanicky NOT NULL DEFAULT 'ok',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokol_deratizacni_body
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_protokol_derat_body_protokol ON public.protokol_deratizacni_body(protokol_id);
CREATE INDEX idx_protokol_derat_body_active ON public.protokol_deratizacni_body(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.protokol_deratizacni_body ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all derat body"
  ON public.protokol_deratizacni_body FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert derat body"
  ON public.protokol_deratizacni_body FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update derat body"
  ON public.protokol_deratizacni_body FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete derat body"
  ON public.protokol_deratizacni_body FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: přes vlastní protokol
CREATE POLICY "Technik can view own derat body"
  ON public.protokol_deratizacni_body FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_deratizacni_body.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can insert own derat body"
  ON public.protokol_deratizacni_body FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_deratizacni_body.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can update own derat body"
  ON public.protokol_deratizacni_body FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_deratizacni_body.protokol_id
    AND technik_id = auth.uid()
  ));

COMMENT ON TABLE public.protokol_deratizacni_body IS 'Deratizační monitorovací body v protokolu';
COMMENT ON COLUMN public.protokol_deratizacni_body.cislo_bodu IS 'Číslo bodu s prefixem, např. L1, H3, P5';
COMMENT ON COLUMN public.protokol_deratizacni_body.pozer_procent IS 'Požer v procentech: 0, 25, 50, 75, 100';

-- ============================================================
-- 4. TABULKA protokol_dezinsekci_body
-- ============================================================

CREATE TABLE public.protokol_dezinsekci_body (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protokol_id     UUID NOT NULL REFERENCES public.protokoly(id) ON DELETE CASCADE,
  cislo_bodu      TEXT NOT NULL,
  okruh_id        UUID DEFAULT NULL REFERENCES public.okruhy(id) ON DELETE SET NULL,
  typ_lapace      public.typ_lapace NOT NULL,
  druh_hmyzu      TEXT DEFAULT NULL,
  pocet           INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokol_dezinsekci_body
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_protokol_dezins_body_protokol ON public.protokol_dezinsekci_body(protokol_id);
CREATE INDEX idx_protokol_dezins_body_active ON public.protokol_dezinsekci_body(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.protokol_dezinsekci_body ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all dezins body"
  ON public.protokol_dezinsekci_body FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert dezins body"
  ON public.protokol_dezinsekci_body FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update dezins body"
  ON public.protokol_dezinsekci_body FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete dezins body"
  ON public.protokol_dezinsekci_body FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: přes vlastní protokol
CREATE POLICY "Technik can view own dezins body"
  ON public.protokol_dezinsekci_body FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_dezinsekci_body.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can insert own dezins body"
  ON public.protokol_dezinsekci_body FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_dezinsekci_body.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can update own dezins body"
  ON public.protokol_dezinsekci_body FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_dezinsekci_body.protokol_id
    AND technik_id = auth.uid()
  ));

COMMENT ON TABLE public.protokol_dezinsekci_body IS 'Dezinsekční monitorovací body (lapače hmyzu) v protokolu';

-- ============================================================
-- 5. TABULKA protokol_postrik
-- ============================================================

CREATE TABLE public.protokol_postrik (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protokol_id     UUID NOT NULL REFERENCES public.protokoly(id) ON DELETE CASCADE,
  skudce          TEXT DEFAULT NULL,
  plocha_m2       NUMERIC(10,2) DEFAULT NULL,
  typ_zakroku     public.typ_zakroku DEFAULT NULL,
  poznamka        TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokol_postrik
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_protokol_postrik_protokol ON public.protokol_postrik(protokol_id);
CREATE INDEX idx_protokol_postrik_active ON public.protokol_postrik(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.protokol_postrik ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all postrik"
  ON public.protokol_postrik FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert postrik"
  ON public.protokol_postrik FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update postrik"
  ON public.protokol_postrik FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete postrik"
  ON public.protokol_postrik FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: přes vlastní protokol
CREATE POLICY "Technik can view own postrik"
  ON public.protokol_postrik FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_postrik.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can insert own postrik"
  ON public.protokol_postrik FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_postrik.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can update own postrik"
  ON public.protokol_postrik FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_postrik.protokol_id
    AND technik_id = auth.uid()
  ));

COMMENT ON TABLE public.protokol_postrik IS 'Záznam postřiku v protokolu — škůdce, plocha, typ zákroku';

-- ============================================================
-- 6. TABULKA protokol_postrik_pripravky
-- ============================================================

CREATE TABLE public.protokol_postrik_pripravky (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postrik_id            UUID NOT NULL REFERENCES public.protokol_postrik(id) ON DELETE CASCADE,
  pripravek_id          UUID NOT NULL REFERENCES public.pripravky(id) ON DELETE CASCADE,
  spotreba              TEXT DEFAULT NULL,
  koncentrace_procent   NUMERIC(5,2) DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokol_postrik_pripravky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_protokol_postrik_prip_postrik ON public.protokol_postrik_pripravky(postrik_id);
CREATE INDEX idx_protokol_postrik_prip_pripravek ON public.protokol_postrik_pripravky(pripravek_id);
CREATE INDEX idx_protokol_postrik_prip_active ON public.protokol_postrik_pripravky(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.protokol_postrik_pripravky ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all postrik pripravky"
  ON public.protokol_postrik_pripravky FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert postrik pripravky"
  ON public.protokol_postrik_pripravky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update postrik pripravky"
  ON public.protokol_postrik_pripravky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete postrik pripravky"
  ON public.protokol_postrik_pripravky FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: přes vlastní protokol → postřik
CREATE POLICY "Technik can view own postrik pripravky"
  ON public.protokol_postrik_pripravky FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protokol_postrik ps
    JOIN public.protokoly p ON p.id = ps.protokol_id
    WHERE ps.id = protokol_postrik_pripravky.postrik_id
    AND p.technik_id = auth.uid()
  ));

CREATE POLICY "Technik can insert own postrik pripravky"
  ON public.protokol_postrik_pripravky FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protokol_postrik ps
    JOIN public.protokoly p ON p.id = ps.protokol_id
    WHERE ps.id = protokol_postrik_pripravky.postrik_id
    AND p.technik_id = auth.uid()
  ));

CREATE POLICY "Technik can update own postrik pripravky"
  ON public.protokol_postrik_pripravky FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protokol_postrik ps
    JOIN public.protokoly p ON p.id = ps.protokol_id
    WHERE ps.id = protokol_postrik_pripravky.postrik_id
    AND p.technik_id = auth.uid()
  ));

COMMENT ON TABLE public.protokol_postrik_pripravky IS 'Přípravky použité v postřiku — spotřeba a koncentrace';

-- ============================================================
-- 7. TABULKA protokol_fotky
-- ============================================================

CREATE TABLE public.protokol_fotky (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protokol_id     UUID NOT NULL REFERENCES public.protokoly(id) ON DELETE CASCADE,
  soubor_url      TEXT NOT NULL,
  popis           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.protokol_fotky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE INDEX idx_protokol_fotky_protokol ON public.protokol_fotky(protokol_id);
CREATE INDEX idx_protokol_fotky_active ON public.protokol_fotky(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.protokol_fotky ENABLE ROW LEVEL SECURITY;

-- Admin: plný CRUD
CREATE POLICY "Admins can view all protokol fotky"
  ON public.protokol_fotky FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert protokol fotky"
  ON public.protokol_fotky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update protokol fotky"
  ON public.protokol_fotky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete protokol fotky"
  ON public.protokol_fotky FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: přes vlastní protokol
CREATE POLICY "Technik can view own protokol fotky"
  ON public.protokol_fotky FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_fotky.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can insert own protokol fotky"
  ON public.protokol_fotky FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_fotky.protokol_id
    AND technik_id = auth.uid()
  ));

CREATE POLICY "Technik can update own protokol fotky"
  ON public.protokol_fotky FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.protokoly
    WHERE id = protokol_fotky.protokol_id
    AND technik_id = auth.uid()
  ));

COMMENT ON TABLE public.protokol_fotky IS 'Fotodokumentace k protokolu (Supabase Storage)';

-- ============================================================
-- 8. DB FUNKCE pro generování čísla protokolu
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_cislo_protokolu(p_zasah_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  klient_kod TEXT;
  seq_num INT;
  klient_id_val UUID;
BEGIN
  -- Najdi klienta přes: zasah → zakazka → objekt → klient
  SELECT k.kod, k.id
  INTO klient_kod, klient_id_val
  FROM public.zasahy z
  JOIN public.zakazky zk ON zk.id = z.zakazka_id
  JOIN public.objekty o ON o.id = zk.objekt_id
  JOIN public.klienti k ON k.id = o.klient_id
  WHERE z.id = p_zasah_id;

  IF klient_kod IS NULL THEN
    RETURN NULL;
  END IF;

  -- Spočítej existující protokoly pro tohoto klienta + 1
  SELECT COUNT(*) + 1
  INTO seq_num
  FROM public.protokoly p
  JOIN public.zasahy z ON z.id = p.zasah_id
  JOIN public.zakazky zk ON zk.id = z.zakazka_id
  JOIN public.objekty o ON o.id = zk.objekt_id
  WHERE o.klient_id = klient_id_val
  AND p.deleted_at IS NULL;

  RETURN 'P-' || klient_kod || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_cislo_protokolu IS 'Generuje číslo protokolu: P-[KLIENT_KOD]-[SEQ:03d]';

-- ============================================================
-- 9. STORAGE BUCKET protokol-fotky
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'protokol-fotky',
  'protokol-fotky',
  true,
  20971520,  -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: technik + admin upload, authenticated view
CREATE POLICY "Authenticated can view protokol-fotky"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'protokol-fotky'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can upload protokol-fotky"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'protokol-fotky'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Technik can upload own protokol-fotky"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'protokol-fotky'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Admins can update protokol-fotky"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'protokol-fotky'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Admins can delete protokol-fotky"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'protokol-fotky'
    AND public.is_admin_or_super_admin()
  );
