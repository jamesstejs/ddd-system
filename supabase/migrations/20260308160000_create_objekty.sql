-- Sprint 4: objekty + okruhy tables

-- 1. Create typ_objektu enum
CREATE TYPE public.typ_objektu AS ENUM (
  'gastro',
  'sklad_nevyzivocisna',
  'sklad_zivocisna',
  'domacnost',
  'kancelar',
  'skola',
  'hotel',
  'nemocnice',
  'ubytovna',
  'vyrobni_hala',
  'jiny'
);

-- 2. Objekty table
CREATE TABLE public.objekty (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klient_id    UUID NOT NULL REFERENCES public.klienti(id) ON DELETE CASCADE,
  nazev        TEXT NOT NULL DEFAULT '',
  adresa       TEXT NOT NULL DEFAULT '',
  plocha_m2    NUMERIC(10,2) DEFAULT NULL,
  typ_objektu  public.typ_objektu NOT NULL DEFAULT 'jiny',
  poznamka     TEXT DEFAULT NULL,
  planek_url   TEXT DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ DEFAULT NULL
);

-- 3. moddatetime trigger for objekty
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.objekty
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexes for objekty
CREATE INDEX idx_objekty_klient ON public.objekty(klient_id);
CREATE INDEX idx_objekty_active ON public.objekty(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS for objekty
ALTER TABLE public.objekty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all objekty"
  ON public.objekty FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert objekty"
  ON public.objekty FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update objekty"
  ON public.objekty FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete objekty"
  ON public.objekty FOR DELETE
  USING (public.is_admin_or_super_admin());

-- 6. Okruhy table
CREATE TABLE public.okruhy (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objekt_id   UUID NOT NULL REFERENCES public.objekty(id) ON DELETE CASCADE,
  nazev       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- 7. moddatetime trigger for okruhy
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.okruhy
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 8. Indexes for okruhy
CREATE INDEX idx_okruhy_objekt ON public.okruhy(objekt_id);
CREATE INDEX idx_okruhy_active ON public.okruhy(deleted_at) WHERE deleted_at IS NULL;

-- 9. RLS for okruhy
ALTER TABLE public.okruhy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all okruhy"
  ON public.okruhy FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert okruhy"
  ON public.okruhy FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update okruhy"
  ON public.okruhy FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete okruhy"
  ON public.okruhy FOR DELETE
  USING (public.is_admin_or_super_admin());

-- 10. Storage bucket for planky
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('planky', 'planky', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 11. Storage policies for planky bucket
CREATE POLICY "Admins can upload planky"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'planky'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Anyone authenticated can view planky"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'planky'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update planky"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'planky'
    AND public.is_admin_or_super_admin()
  );

CREATE POLICY "Admins can delete planky"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'planky'
    AND public.is_admin_or_super_admin()
  );
