-- Sprint 10: Dostupnost techniků
-- Technici zadávají svou pracovní dobu 14–60 dní předem

-- 1. Tabulka dostupnost
CREATE TABLE public.dostupnost (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technik_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  datum       DATE NOT NULL,
  cas_od      TIME NOT NULL,
  cas_do      TIME NOT NULL,
  poznamka    TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT check_cas_poradi CHECK (cas_do > cas_od)
);

-- 2. Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.dostupnost
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 3. Indexy
CREATE INDEX idx_dostupnost_technik_datum ON public.dostupnost(technik_id, datum);
CREATE INDEX idx_dostupnost_datum ON public.dostupnost(datum);
CREATE INDEX idx_dostupnost_active ON public.dostupnost(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_dostupnost_unique_slot
  ON public.dostupnost(technik_id, datum, cas_od)
  WHERE deleted_at IS NULL;

-- 4. RLS
ALTER TABLE public.dostupnost ENABLE ROW LEVEL SECURITY;

-- Admin/Super_admin: plný SELECT
CREATE POLICY "Admins can view all dostupnost"
  ON public.dostupnost FOR SELECT
  USING (public.is_admin_or_super_admin());

-- Technik: SELECT vlastních
CREATE POLICY "Technik can view own dostupnost"
  ON public.dostupnost FOR SELECT
  USING (technik_id = auth.uid());

-- Technik: INSERT vlastních
CREATE POLICY "Technik can insert own dostupnost"
  ON public.dostupnost FOR INSERT
  WITH CHECK (
    technik_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );

-- Technik: UPDATE vlastních
CREATE POLICY "Technik can update own dostupnost"
  ON public.dostupnost FOR UPDATE
  USING (technik_id = auth.uid())
  WITH CHECK (technik_id = auth.uid());

-- Technik: DELETE (soft) vlastních
CREATE POLICY "Technik can delete own dostupnost"
  ON public.dostupnost FOR DELETE
  USING (technik_id = auth.uid());

-- Admin: full CRUD
CREATE POLICY "Admins can insert dostupnost"
  ON public.dostupnost FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update dostupnost"
  ON public.dostupnost FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete dostupnost"
  ON public.dostupnost FOR DELETE
  USING (public.is_admin_or_super_admin());
