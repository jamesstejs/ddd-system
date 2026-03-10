-- Fix: přidat DEFAULT '' na kod sloupec, aby TypeScript Insert typ nebyl povinný
-- Trigger generate_klient_kod() přepíše prázdný kód na vygenerovaný

-- 1. Přidat default
ALTER TABLE public.klienti ALTER COLUMN kod SET DEFAULT '';

-- 2. Upravit trigger aby se spouštěl i pro prázdný string
DROP TRIGGER IF EXISTS set_klient_kod ON public.klienti;

CREATE TRIGGER set_klient_kod
  BEFORE INSERT ON public.klienti
  FOR EACH ROW
  WHEN (NEW.kod IS NULL OR NEW.kod = '')
  EXECUTE FUNCTION public.generate_klient_kod();
