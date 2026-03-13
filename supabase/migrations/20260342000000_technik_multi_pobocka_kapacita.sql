-- Sprint 42: Multi-region technici + kapacitní požadavky
-- =======================================================
-- 1. Junction tabulka pro multi-region přiřazení techniků
-- 2. Kapacitní pole na profiles (požadované hodiny/dny za týden)

-- -------------------------------------------------------
-- 1a. Junction tabulka technik_pobocky
-- -------------------------------------------------------
CREATE TABLE technik_pobocky (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technik_id  UUID NOT NULL REFERENCES profiles(id),
  pobocka     TEXT NOT NULL CHECK (pobocka IN (
    'praha','stredocesky','jihocesky','plzensky','karlovarsky',
    'ustecky','liberecky','kralovehradecky','pardubicky',
    'vysocina','jihomoravsky','olomoucky','zlinsky','moravskoslezsky'
  )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT uq_technik_pobocka UNIQUE (technik_id, pobocka)
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON technik_pobocky
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE technik_pobocky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON technik_pobocky FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role @> '{admin}' OR role @> '{super_admin}')
  ));

CREATE POLICY "technik_read_own" ON technik_pobocky FOR SELECT
  USING (technik_id = auth.uid());

-- -------------------------------------------------------
-- 1b. Migrate existující data z profiles.pobocka
-- -------------------------------------------------------
INSERT INTO technik_pobocky (technik_id, pobocka)
SELECT id, pobocka FROM profiles
WHERE pobocka IS NOT NULL
  AND deleted_at IS NULL
  AND role @> '{technik}'
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- 2. Kapacitní požadavky na profiles
-- -------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pozadovane_hodiny_tyden NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pozadovane_dny_tyden INTEGER DEFAULT NULL
    CHECK (pozadovane_dny_tyden IS NULL OR (pozadovane_dny_tyden BETWEEN 1 AND 7));
