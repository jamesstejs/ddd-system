-- Sprint 27: faktury tabulka pro Fakturoid integraci

-- 1. Enum pro stav faktury
DO $$ BEGIN
  CREATE TYPE public.stav_faktury AS ENUM (
    'vytvorena',
    'odeslana',
    'uhrazena',
    'po_splatnosti',
    'storno'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Faktury table
CREATE TABLE public.faktury (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zakazka_id      UUID REFERENCES public.zakazky(id) ON DELETE SET NULL,
  protokol_id     UUID REFERENCES public.protokoly(id) ON DELETE SET NULL,
  fakturoid_id    BIGINT,           -- Fakturoid invoice ID
  cislo           TEXT,              -- Fakturoid invoice number (e.g. "2026-0024")
  castka_bez_dph  NUMERIC(10,2),
  castka_s_dph    NUMERIC(10,2),
  dph_sazba       NUMERIC(5,2) DEFAULT 21,
  splatnost_dnu   INT DEFAULT 14,
  datum_vystaveni DATE DEFAULT CURRENT_DATE,
  datum_splatnosti DATE,
  stav            public.stav_faktury NOT NULL DEFAULT 'vytvorena',
  fakturoid_url   TEXT,              -- HTML link to Fakturoid invoice
  fakturoid_pdf_url TEXT,            -- PDF download URL
  poznamka        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

-- 3. moddatetime trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.faktury
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexes
CREATE INDEX idx_faktury_zakazka ON public.faktury(zakazka_id);
CREATE INDEX idx_faktury_protokol ON public.faktury(protokol_id);
CREATE INDEX idx_faktury_fakturoid ON public.faktury(fakturoid_id);
CREATE INDEX idx_faktury_stav ON public.faktury(stav);
CREATE INDEX idx_faktury_active ON public.faktury(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS
ALTER TABLE public.faktury ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin: full CRUD
CREATE POLICY "Admins can view all faktury"
  ON public.faktury FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert faktury"
  ON public.faktury FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update faktury"
  ON public.faktury FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete faktury"
  ON public.faktury FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: can view faktury for their zasahy
CREATE POLICY "Technik can view own faktury"
  ON public.faktury FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protokoly p
      WHERE p.id = faktury.protokol_id
        AND p.technik_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- 6. Add fakturoid_subject_id to klienti (for synced contacts)
ALTER TABLE public.klienti
  ADD COLUMN IF NOT EXISTS fakturoid_subject_id BIGINT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_klienti_fakturoid ON public.klienti(fakturoid_subject_id)
  WHERE fakturoid_subject_id IS NOT NULL;
