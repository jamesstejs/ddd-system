-- Sprint 17: Přidat sloupec `kod` na tabulku klienti
-- Kód klienta se používá pro číslování protokolů: P-[KOD]-001
-- Formát: 3 velká písmena z názvu + 3 číslice z UUID (unikátní)

-- 1. Přidat sloupec (nullable nejprve pro backfill)
ALTER TABLE public.klienti ADD COLUMN kod TEXT;

-- 2. Funkce pro generování kódu klienta
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

  -- Nahraď diakritiku
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

    -- Zkontroluj unikátnost
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

-- 3. Trigger na automatické generování kódu pro nové klienty
CREATE TRIGGER set_klient_kod
  BEFORE INSERT ON public.klienti
  FOR EACH ROW
  WHEN (NEW.kod IS NULL)
  EXECUTE FUNCTION public.generate_klient_kod();

-- 4. Backfill existujících klientů
DO $$
DECLARE
  rec RECORD;
  prefix TEXT;
  suffix TEXT;
  candidate TEXT;
  attempts INT;
BEGIN
  FOR rec IN SELECT id, nazev, prijmeni FROM public.klienti WHERE kod IS NULL LOOP
    -- Stejná logika jako trigger
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

      IF NOT EXISTS (SELECT 1 FROM public.klienti WHERE kod = candidate) THEN
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

-- 5. Nastavit NOT NULL constraint po backfillu
ALTER TABLE public.klienti ALTER COLUMN kod SET NOT NULL;

-- 6. Unikátní index
CREATE UNIQUE INDEX idx_klienti_kod ON public.klienti(kod);

-- Komentář
COMMENT ON COLUMN public.klienti.kod IS 'Unikátní 6-znakový kód klienta (3 písmena + 3 číslice) pro číslování protokolů';
