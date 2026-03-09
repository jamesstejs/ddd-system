-- Sprint 14: Připomínky dalšího termínu po zásahu
-- Technik po dokončení zásahu může naplánovat další termín nebo přeskočit → připomínka pro admina.

-- 1. Enumy
CREATE TYPE public.typ_pripominky AS ENUM ('technik_nenastavil', 'klient_nevybral');
CREATE TYPE public.stav_pripominky AS ENUM ('aktivni', 'vyreseno');

-- 2. Tabulka pripominky_terminu
CREATE TABLE public.pripominky_terminu (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zakazka_id             UUID NOT NULL REFERENCES public.zakazky(id),
  zasah_id               UUID NOT NULL REFERENCES public.zasahy(id),
  technik_id             UUID NOT NULL REFERENCES public.profiles(id),
  typ                    public.typ_pripominky NOT NULL DEFAULT 'technik_nenastavil',
  stav                   public.stav_pripominky NOT NULL DEFAULT 'aktivni',
  posledni_upozorneni_at TIMESTAMPTZ DEFAULT NULL,
  pocet_upozorneni       INT NOT NULL DEFAULT 0,
  max_upozorneni         INT NOT NULL DEFAULT 10,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ DEFAULT NULL
);

-- 3. Trigger pro updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pripominky_terminu
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 4. Indexy
CREATE INDEX idx_pripominky_zakazka ON public.pripominky_terminu(zakazka_id);
CREATE INDEX idx_pripominky_zasah ON public.pripominky_terminu(zasah_id);
CREATE INDEX idx_pripominky_technik ON public.pripominky_terminu(technik_id);
CREATE INDEX idx_pripominky_stav ON public.pripominky_terminu(stav);
CREATE INDEX idx_pripominky_active ON public.pripominky_terminu(deleted_at) WHERE deleted_at IS NULL;

-- 5. RLS
ALTER TABLE public.pripominky_terminu ENABLE ROW LEVEL SECURITY;

-- Admin/Super_admin: plný CRUD
CREATE POLICY "Admins can manage pripominky"
  ON public.pripominky_terminu FOR ALL
  USING (public.is_admin_or_super_admin());

-- Technik: SELECT vlastních
CREATE POLICY "Technik can view own pripominky"
  ON public.pripominky_terminu FOR SELECT
  USING (technik_id = auth.uid());

-- Technik: INSERT vlastních
CREATE POLICY "Technik can insert own pripominky"
  ON public.pripominky_terminu FOR INSERT
  WITH CHECK (technik_id = auth.uid());

-- 6. Technik INSERT na zasahy (follow-up zásahy po dokončení)
-- Technik zatím měl jen SELECT+UPDATE, potřebuje INSERT pro plánování dalšího termínu.
CREATE POLICY "Technik can insert own zasahy"
  ON public.zasahy FOR INSERT
  WITH CHECK (technik_id = auth.uid());
