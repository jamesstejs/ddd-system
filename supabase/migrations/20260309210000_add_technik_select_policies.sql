-- Sprint 8 fix: Allow technik role to SELECT from klienti and objekty
-- Required for getZakazky join queries to work for technik users

-- Technik can view klienti (needed for zakazky list/detail joins)
CREATE POLICY "Technik can view klienti"
  ON public.klienti FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );

-- Technik can view objekty (needed for zakazky list/detail joins)
CREATE POLICY "Technik can view objekty"
  ON public.objekty FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );
