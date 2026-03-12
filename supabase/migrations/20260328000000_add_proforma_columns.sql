-- Sprint 28: Proforma faktura + QR platba on-site
-- Přidání sloupců pro rozlišení proformy a uložení public URL

ALTER TABLE faktury ADD COLUMN is_proforma BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE faktury ADD COLUMN proforma_public_url TEXT;

-- Index pro rychlé vyhledání proformy dle zakázky
CREATE INDEX idx_faktury_proforma_zakazka
  ON faktury (zakazka_id)
  WHERE is_proforma = true AND deleted_at IS NULL;
