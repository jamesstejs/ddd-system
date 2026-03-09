-- Sprint 12: Allow technik role to SELECT from kontaktni_osoby
-- Required for "Můj den" view — technik needs to see contact persons for clients

CREATE POLICY "Technik can view kontaktni_osoby"
  ON public.kontaktni_osoby FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.deleted_at IS NULL
        AND 'technik' = ANY(profiles.role)
    )
  );
