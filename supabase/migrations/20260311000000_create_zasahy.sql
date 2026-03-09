-- Sprint 11: Zásahy (plánování techniků — admin kalendář)
-- Tabulka pro evidenci naplánovaných a provedených zásahů

-- 1. Enum pro status zásahu
CREATE TYPE public.status_zasahu AS ENUM (
  'naplanovano',
  'potvrzeny',
  'probiha',
  'hotovo',
  'zruseno'
);

-- 2. Tabulka zasahy
CREATE TABLE public.zasahy (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zakazka_id            UUID NOT NULL REFERENCES public.zakazky(id) ON DELETE CASCADE,
  technik_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  datum                 DATE NOT NULL,
  cas_od                TIME NOT NULL,
  cas_do                TIME NOT NULL,
  status                public.status_zasahu NOT NULL DEFAULT 'naplanovano',
  odhadovana_delka_min  INT DEFAULT NULL,
  poznamka              TEXT DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT check_zasah_cas_poradi CHECK (cas_do > cas_od)
);

-- 3. Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.zasahy
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexy
CREATE INDEX idx_zasahy_zakazka ON public.zasahy(zakazka_id);
CREATE INDEX idx_zasahy_technik ON public.zasahy(technik_id);
CREATE INDEX idx_zasahy_datum ON public.zasahy(datum);
CREATE INDEX idx_zasahy_technik_datum ON public.zasahy(technik_id, datum);
CREATE INDEX idx_zasahy_status ON public.zasahy(status);
CREATE INDEX idx_zasahy_active ON public.zasahy(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS
ALTER TABLE public.zasahy ENABLE ROW LEVEL SECURITY;

-- Admin/Super_admin: plný CRUD
CREATE POLICY "Admins can view all zasahy"
  ON public.zasahy FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert zasahy"
  ON public.zasahy FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update zasahy"
  ON public.zasahy FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete zasahy"
  ON public.zasahy FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: SELECT vlastních zásahů
CREATE POLICY "Technik can view own zasahy"
  ON public.zasahy FOR SELECT
  USING (technik_id = auth.uid());

-- Technik: UPDATE vlastních zásahů (změna statusu)
CREATE POLICY "Technik can update own zasahy"
  ON public.zasahy FOR UPDATE
  USING (technik_id = auth.uid())
  WITH CHECK (technik_id = auth.uid());
