-- Sprint 2: klienti + kontaktni_osoby tables

-- 1. Create typ_klienta enum
CREATE TYPE public.typ_klienta AS ENUM ('firma', 'fyzicka_osoba');

-- 2. Klienti table
CREATE TABLE public.klienti (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ                        public.typ_klienta NOT NULL DEFAULT 'firma',
  nazev                      TEXT NOT NULL DEFAULT '',
  jmeno                      TEXT NOT NULL DEFAULT '',
  prijmeni                   TEXT NOT NULL DEFAULT '',
  ico                        TEXT DEFAULT NULL,
  dic                        TEXT DEFAULT NULL,
  email                      TEXT DEFAULT NULL,
  telefon                    TEXT DEFAULT NULL,
  adresa                     TEXT NOT NULL DEFAULT '',
  poznamka                   TEXT DEFAULT NULL,
  dph_sazba                  NUMERIC(4,2) NOT NULL DEFAULT 21,
  individualni_sleva_procent NUMERIC(5,2) NOT NULL DEFAULT 0,
  platba_predem              BOOLEAN NOT NULL DEFAULT false,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ DEFAULT NULL
);

-- 3. moddatetime trigger for klienti
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.klienti
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexes for klienti
CREATE INDEX idx_klienti_ico ON public.klienti(ico);
CREATE INDEX idx_klienti_active ON public.klienti(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS for klienti
ALTER TABLE public.klienti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all klienti"
  ON public.klienti FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert klienti"
  ON public.klienti FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update klienti"
  ON public.klienti FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete klienti"
  ON public.klienti FOR DELETE
  USING (public.is_admin_or_super_admin());

-- 6. Kontaktni osoby table
CREATE TABLE public.kontaktni_osoby (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klient_id   UUID NOT NULL REFERENCES public.klienti(id) ON DELETE CASCADE,
  jmeno       TEXT NOT NULL DEFAULT '',
  funkce      TEXT DEFAULT NULL,
  telefon     TEXT DEFAULT NULL,
  email       TEXT DEFAULT NULL,
  poznamka    TEXT DEFAULT NULL,
  je_primarni BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- 7. moddatetime trigger for kontaktni_osoby
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.kontaktni_osoby
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 8. Indexes for kontaktni_osoby
CREATE INDEX idx_kontaktni_osoby_klient ON public.kontaktni_osoby(klient_id);
CREATE INDEX idx_kontaktni_osoby_active ON public.kontaktni_osoby(deleted_at) WHERE deleted_at IS NULL;

-- 9. RLS for kontaktni_osoby
ALTER TABLE public.kontaktni_osoby ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all kontaktni_osoby"
  ON public.kontaktni_osoby FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert kontaktni_osoby"
  ON public.kontaktni_osoby FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update kontaktni_osoby"
  ON public.kontaktni_osoby FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can delete kontaktni_osoby"
  ON public.kontaktni_osoby FOR DELETE
  USING (public.is_admin_or_super_admin());
