-- Sprint 8: zakazky (zakázky) table

-- 1. Create enums
CREATE TYPE public.typ_zakazky AS ENUM ('jednorazova', 'smluvni');
CREATE TYPE public.status_zakazky AS ENUM ('nova', 'aktivni', 'pozastavena', 'ukoncena');

-- 2. Zakazky table
CREATE TABLE public.zakazky (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objekt_id            UUID NOT NULL REFERENCES public.objekty(id) ON DELETE CASCADE,
  typ                  public.typ_zakazky NOT NULL DEFAULT 'jednorazova',
  status               public.status_zakazky NOT NULL DEFAULT 'nova',
  typy_zasahu          JSONB NOT NULL DEFAULT '[]'::jsonb,
  skudci               JSONB NOT NULL DEFAULT '[]'::jsonb,
  cetnost_dny          INT DEFAULT NULL,
  pocet_navstev_rocne  INT DEFAULT NULL,
  platnost_do          DATE DEFAULT NULL,
  platba_predem        BOOLEAN NOT NULL DEFAULT false,
  poznamka             TEXT DEFAULT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ DEFAULT NULL
);

-- 3. moddatetime trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.zakazky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexes
CREATE INDEX idx_zakazky_objekt ON public.zakazky(objekt_id);
CREATE INDEX idx_zakazky_status ON public.zakazky(status);
CREATE INDEX idx_zakazky_typ ON public.zakazky(typ);
CREATE INDEX idx_zakazky_active ON public.zakazky(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS
ALTER TABLE public.zakazky ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin: full CRUD
CREATE POLICY "Admins can view all zakazky"
  ON public.zakazky FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert zakazky"
  ON public.zakazky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update zakazky"
  ON public.zakazky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete zakazky"
  ON public.zakazky FOR DELETE
  USING (public.is_admin_or_super_admin());

-- Technik: can SELECT all (route middleware handles role-level visibility,
-- future sprints will add technik assignment filtering)
CREATE POLICY "Technik can view zakazky"
  ON public.zakazky FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );
