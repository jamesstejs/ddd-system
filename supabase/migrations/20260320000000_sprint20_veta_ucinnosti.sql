-- Sprint 20: Přidat sloupec veta_ucinnosti na protokoly
ALTER TABLE public.protokoly ADD COLUMN veta_ucinnosti TEXT DEFAULT NULL;

COMMENT ON COLUMN public.protokoly.veta_ucinnosti
  IS 'Věta o účinnosti zásahu — vybraná z šablony adminem definovaných textů';

-- Storage DELETE policy pro technika (fotky) — IF NOT EXISTS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Technik can delete own protokol-fotky'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Technik can delete own protokol-fotky"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'protokol-fotky'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
      );
  END IF;
END $$;

-- Seed šablon vět o účinnosti (reuse sablony_pouceni s typ_zasahu = 'ucinnost')
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni) VALUES
  ('Účinnost — dostatečná', 'ucinnost',
   'Účinnost zásahu byla vyhodnocena jako dostatečná.', true),
  ('Účinnost — zvýšený požer', 'ucinnost',
   'Při kontrole byl zjištěn zvýšený požer nástrah, je doporučeno zkrátit interval kontrol.', true),
  ('Účinnost — bez nálezu', 'ucinnost',
   'Při kontrole nebyl zjištěn žádný výskyt škůdců. Zásah je účinný.', true),
  ('Účinnost — opakovaný výskyt', 'ucinnost',
   'Byl zjištěn opakovaný výskyt škůdců. Je doporučen další zásah v kratším intervalu.', true),
  ('Účinnost — nedostatečná', 'ucinnost',
   'Účinnost předchozího zásahu byla vyhodnocena jako nedostatečná. Byl proveden opakovaný zásah se změnou přípravku.', true);
