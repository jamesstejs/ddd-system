-- Fix migrace po AI Review Sprint 17
-- Opravuje: BUG-1 (race condition), BUG-2 (technik RLS), BUG-3 (storage delete),
--           BUG-4 (TRANSLATE Ž→Z), IMP-3 (storage public→private)

-- ============================================================
-- BUG-4: TRANSLATE chybí Z pro Ž (FROM má 16, TO 15 znaků)
-- ============================================================
-- Oprava: přidat Z na konec TO řetězce

CREATE OR REPLACE FUNCTION public.generate_klient_kod()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  candidate TEXT;
  attempts INT := 0;
BEGIN
  -- Vezmi první 3 písmena z názvu (firma) nebo příjmení (fyzická osoba)
  prefix := UPPER(LEFT(
    REGEXP_REPLACE(
      COALESCE(NULLIF(NEW.nazev, ''), COALESCE(NEW.prijmeni, 'XXX')),
      '[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]', '', 'g'
    ),
    3
  ));

  -- Nahraď diakritiku (FIX: přidáno Z na konec TO řetězce pro Ž)
  prefix := TRANSLATE(prefix,
    'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ',
    'ACDEEINORSTUUYZ'
  );

  -- Fallback pokud je prefix příliš krátký
  prefix := RPAD(COALESCE(NULLIF(prefix, ''), 'XXX'), 3, 'X');

  -- Generuj unikátní kód (prefix + 3 číslic)
  LOOP
    suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
    candidate := prefix || suffix;

    -- Zkontroluj unikátnost (včetně soft-deleted)
    IF NOT EXISTS (SELECT 1 FROM public.klienti WHERE kod = candidate AND id != NEW.id) THEN
      NEW.kod := candidate;
      RETURN NEW;
    END IF;

    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback: použij 6 náhodných znaků
      NEW.kod := UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 6));
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

-- Backfill klienty které mají špatný kód kvůli chybějícímu Z (Ž-klienti)
-- Najdi klienty kde nazev začíná na Ž ale kod nezačíná na Z
UPDATE public.klienti
SET kod = NULL
WHERE (nazev LIKE 'Ž%' OR prijmeni LIKE 'Ž%')
  AND kod NOT LIKE 'Z%'
  AND deleted_at IS NULL;

-- Trigger znovu vygeneruje kód pro tyto záznamy (NULL → trigger)
-- Note: Trigger reaguje na INSERT, ne UPDATE. Musíme ručně opravit.
DO $$
DECLARE
  rec RECORD;
  prefix TEXT;
  suffix TEXT;
  candidate TEXT;
  attempts INT;
BEGIN
  FOR rec IN SELECT id, nazev, prijmeni FROM public.klienti WHERE kod IS NULL LOOP
    prefix := UPPER(LEFT(
      REGEXP_REPLACE(
        COALESCE(NULLIF(rec.nazev, ''), COALESCE(rec.prijmeni, 'XXX')),
        '[^a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]', '', 'g'
      ),
      3
    ));
    prefix := TRANSLATE(prefix,
      'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ',
      'ACDEEINORSTUUYZ'
    );
    prefix := RPAD(COALESCE(NULLIF(prefix, ''), 'XXX'), 3, 'X');

    attempts := 0;
    LOOP
      suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
      candidate := prefix || suffix;

      IF NOT EXISTS (SELECT 1 FROM public.klienti WHERE kod = candidate AND id != rec.id) THEN
        UPDATE public.klienti SET kod = candidate WHERE id = rec.id;
        EXIT;
      END IF;

      attempts := attempts + 1;
      IF attempts > 100 THEN
        UPDATE public.klienti SET kod = UPPER(SUBSTR(MD5(rec.id::TEXT), 1, 6)) WHERE id = rec.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- BUG-2: Technik UPDATE policy — omezit na status 'rozpracovany'
-- ============================================================

DROP POLICY IF EXISTS "Technik can update own protokoly" ON public.protokoly;

CREATE POLICY "Technik can update own protokoly"
  ON public.protokoly FOR UPDATE
  USING (technik_id = auth.uid() AND status = 'rozpracovany')
  WITH CHECK (technik_id = auth.uid());

-- ============================================================
-- BUG-1: generate_cislo_protokolu — přidat advisory lock
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_cislo_protokolu(p_zasah_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  klient_kod TEXT;
  seq_num INT;
  klient_id_val UUID;
BEGIN
  -- Najdi klienta přes: zasah → zakazka → objekt → klient
  SELECT k.kod, k.id
  INTO klient_kod, klient_id_val
  FROM public.zasahy z
  JOIN public.zakazky zk ON zk.id = z.zakazka_id
  JOIN public.objekty o ON o.id = zk.objekt_id
  JOIN public.klienti k ON k.id = o.klient_id
  WHERE z.id = p_zasah_id;

  IF klient_kod IS NULL THEN
    RETURN NULL;
  END IF;

  -- Advisory lock na klient_id pro prevenci race condition
  PERFORM pg_advisory_xact_lock(hashtext(klient_id_val::TEXT));

  -- Spočítej existující protokoly pro tohoto klienta + 1
  SELECT COUNT(*) + 1
  INTO seq_num
  FROM public.protokoly p
  JOIN public.zasahy z ON z.id = p.zasah_id
  JOIN public.zakazky zk ON zk.id = z.zakazka_id
  JOIN public.objekty o ON o.id = zk.objekt_id
  WHERE o.klient_id = klient_id_val
  AND p.deleted_at IS NULL;

  RETURN 'P-' || klient_kod || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

-- ============================================================
-- BUG-3 + IMP-3: Storage bucket — private + technik delete
-- ============================================================

-- Změna bucketu na private (signed URLs místo public access)
UPDATE storage.buckets
SET public = false
WHERE id = 'protokol-fotky';

-- Přidat DELETE policy pro technika (vlastní složka)
CREATE POLICY "Technik can delete own protokol-fotky"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'protokol-fotky'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================
-- KOMENTÁŘE
-- ============================================================
COMMENT ON FUNCTION public.generate_cislo_protokolu IS 'Generuje číslo protokolu: P-[KLIENT_KOD]-[SEQ:03d] s advisory lock pro atomicitu';
