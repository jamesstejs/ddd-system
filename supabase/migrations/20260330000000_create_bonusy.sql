-- Sprint 30: Bonusový systém
-- Prémie pro techniky (za zakázku, opakovanou zakázku) a adminy (fixní odměna)

-- Enums
CREATE TYPE public.typ_bonusu AS ENUM ('zakazka', 'opakovana_zakazka', 'fixni');
CREATE TYPE public.stav_bonusu AS ENUM ('pending', 'proplaceno');

-- Tabulka bonusů
CREATE TABLE public.bonusy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uzivatel_id UUID NOT NULL REFERENCES public.profiles(id),
  typ public.typ_bonusu NOT NULL,
  zakazka_id UUID REFERENCES public.zakazky(id),
  zasah_id UUID REFERENCES public.zasahy(id),
  castka NUMERIC(10,2) NOT NULL DEFAULT 100,
  obdobi_mesic DATE NOT NULL, -- první den měsíce (např. 2026-03-01)
  stav public.stav_bonusu NOT NULL DEFAULT 'pending',
  poznamka TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Systémové nastavení bonusů (key-value store)
CREATE TABLE public.nastaveni_bonusu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klic TEXT NOT NULL UNIQUE,
  hodnota NUMERIC(10,2) NOT NULL,
  popis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default hodnoty
INSERT INTO public.nastaveni_bonusu (klic, hodnota, popis) VALUES
  ('bonus_za_zakazku', 100, 'Bonus technikovi za dokončenou zakázku (Kč)'),
  ('bonus_za_opakovanou', 100, 'Bonus technikovi za domluvenou opakovanou zakázku (Kč)'),
  ('fixni_odmena_admin', 0, 'Fixní měsíční odměna admina (Kč)');

-- Triggers (moddatetime)
CREATE TRIGGER set_updated_at_bonusy
  BEFORE UPDATE ON public.bonusy
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER set_updated_at_nastaveni_bonusu
  BEFORE UPDATE ON public.nastaveni_bonusu
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Indexes
CREATE INDEX idx_bonusy_uzivatel ON public.bonusy(uzivatel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bonusy_obdobi ON public.bonusy(obdobi_mesic) WHERE deleted_at IS NULL;
CREATE INDEX idx_bonusy_zasah ON public.bonusy(zasah_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bonusy_stav ON public.bonusy(stav) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.bonusy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nastaveni_bonusu ENABLE ROW LEVEL SECURITY;

-- Policies: bonusy
-- Admin/super_admin: full access
CREATE POLICY "admin_all_bonusy" ON public.bonusy
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND deleted_at IS NULL
        AND ('admin' = ANY(role) OR 'super_admin' = ANY(role))
    )
  );

-- Technik: SELECT own bonuses only
CREATE POLICY "technik_select_own_bonusy" ON public.bonusy
  FOR SELECT
  USING (uzivatel_id = auth.uid());

-- Policies: nastaveni_bonusu
-- Everyone authenticated can read settings
CREATE POLICY "all_select_nastaveni_bonusu" ON public.nastaveni_bonusu
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super_admin: full CRUD on settings
CREATE POLICY "super_admin_modify_nastaveni_bonusu" ON public.nastaveni_bonusu
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND deleted_at IS NULL
        AND 'super_admin' = ANY(role)
    )
  );
