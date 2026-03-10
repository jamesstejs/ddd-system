-- Sprint 15: Přípravky — DB + CRUD
-- Databáze přípravků pro DDD (rodenticidy, insekticidy, biocidy)

-- 1. Enum pro typ přípravku
CREATE TYPE public.typ_pripravku AS ENUM (
  'rodenticid',
  'insekticid',
  'biocid',
  'dezinfekce',
  'repelent'
);

-- 2. Enum pro formu přípravku
CREATE TYPE public.forma_pripravku AS ENUM (
  'pasta',
  'granule',
  'gel',
  'kapalina',
  'prasek',
  'aerosol',
  'pena',
  'tablety',
  'voskovy_blok',
  'mikrokapsule',
  'jiny'
);

-- 3. Tabulka pripravky
CREATE TABLE public.pripravky (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev             TEXT NOT NULL,
  ucinna_latka      TEXT DEFAULT NULL,
  protilatka        TEXT DEFAULT NULL,
  typ               public.typ_pripravku NOT NULL,
  forma             public.forma_pripravku NOT NULL DEFAULT 'jiny',
  baleni            TEXT DEFAULT NULL,
  cilovy_skudce     JSONB DEFAULT '[]'::jsonb,
  omezeni_prostor   JSONB DEFAULT '[]'::jsonb,
  aktivni           BOOLEAN NOT NULL DEFAULT true,
  poznamka          TEXT DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

-- 4. Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pripravky
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 5. Indexy
CREATE INDEX idx_pripravky_typ ON public.pripravky(typ);
CREATE INDEX idx_pripravky_aktivni ON public.pripravky(aktivni);
CREATE INDEX idx_pripravky_active ON public.pripravky(deleted_at) WHERE deleted_at IS NULL;

-- 6. RLS
ALTER TABLE public.pripravky ENABLE ROW LEVEL SECURITY;

-- Všichni přihlášení mohou číst (technik potřebuje vidět při výběru v protokolu)
CREATE POLICY "Authenticated can view pripravky"
  ON public.pripravky FOR SELECT
  USING (auth.role() = 'authenticated');

-- Jen admin/super_admin mohou spravovat
CREATE POLICY "Admins can insert pripravky"
  ON public.pripravky FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update pripravky"
  ON public.pripravky FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete pripravky"
  ON public.pripravky FOR DELETE
  USING (public.is_admin_or_super_admin());

-- 7. Komentáře
COMMENT ON TABLE public.pripravky IS 'Přípravky pro DDD — rodenticidy, insekticidy, biocidy, dezinfekce';
COMMENT ON COLUMN public.pripravky.cilovy_skudce IS 'JSON pole názvů škůdců, např. ["Potkan obecný", "Myš domácí"]';
COMMENT ON COLUMN public.pripravky.omezeni_prostor IS 'JSON pole typů prostoru kde je přípravek povolen, např. ["potravinarsky", "domacnost", "prumysl", "venkovni", "zemedelsky", "chov_zvirat"]';
