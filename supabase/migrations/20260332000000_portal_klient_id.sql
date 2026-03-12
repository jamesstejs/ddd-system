-- Sprint 32: Klientský portál — přidání klient_id do profiles
-- Propojuje uživatele s rolí "klient" na záznam v tabulce klienti

ALTER TABLE public.profiles
  ADD COLUMN klient_id UUID REFERENCES public.klienti(id);

CREATE INDEX idx_profiles_klient ON public.profiles(klient_id)
  WHERE klient_id IS NOT NULL AND deleted_at IS NULL;

-- RLS policies pro portal access:
-- Klient vidí své protokoly (přes klienti → objekty → zakazky → zasahy → protokoly)
-- Klient vidí své faktury (přes klienti → objekty → zakazky → faktury)
-- Klient vidí své nadcházející zásahy

-- Policy: klient může číst protokoly svých zakázek
CREATE POLICY "klient_select_own_protokoly" ON public.protokoly
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.zasahy z
      JOIN public.zakazky zak ON zak.id = z.zakazka_id
      JOIN public.objekty o ON o.id = zak.objekt_id
      JOIN public.profiles p ON p.klient_id = o.klient_id
      WHERE z.id = protokoly.zasah_id
        AND p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Policy: klient může číst faktury svých zakázek
CREATE POLICY "klient_select_own_faktury" ON public.faktury
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.zakazky zak
      JOIN public.objekty o ON o.id = zak.objekt_id
      JOIN public.profiles p ON p.klient_id = o.klient_id
      WHERE zak.id = faktury.zakazka_id
        AND p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Policy: klient může číst zásahy svých zakázek
CREATE POLICY "klient_select_own_zasahy" ON public.zasahy
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.zakazky zak
      JOIN public.objekty o ON o.id = zak.objekt_id
      JOIN public.profiles p ON p.klient_id = o.klient_id
      WHERE zak.id = zasahy.zakazka_id
        AND p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );
