-- Sprint 40: Přehled zásahů & Odložení termínu
-- Přidává sloupce pro tracking odložení zásahů

-- Sloupce pro tracking odložení na zasahy
ALTER TABLE zasahy
  ADD COLUMN puvodni_datum DATE,
  ADD COLUMN odlozeno_at TIMESTAMPTZ,
  ADD COLUMN odlozeni_duvod TEXT,
  ADD COLUMN odlozeno_kym TEXT CHECK (odlozeno_kym IS NULL OR odlozeno_kym IN ('admin', 'klient'));

-- Nový typ emailu pro odložení
ALTER TYPE typ_emailu ADD VALUE 'odlozeni';
