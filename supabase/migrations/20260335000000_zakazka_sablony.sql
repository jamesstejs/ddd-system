-- Sprint 35: Šablony zakázek pro rychlý dispečink
-- ================================================

CREATE TABLE IF NOT EXISTS zakazka_sablony (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev       TEXT NOT NULL,
  typ         TEXT NOT NULL DEFAULT 'jednorazova' CHECK (typ IN ('jednorazova', 'smluvni')),
  typy_zasahu TEXT[] NOT NULL DEFAULT '{}',
  skudci      TEXT[] NOT NULL DEFAULT '{}',
  poznamka_template TEXT,
  poradi      INT NOT NULL DEFAULT 0,
  aktivni     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON zakazka_sablony
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE zakazka_sablony ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin čtení
CREATE POLICY "zakazka_sablony_select"
  ON zakazka_sablony FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Super_admin CRUD
CREATE POLICY "zakazka_sablony_insert"
  ON zakazka_sablony FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "zakazka_sablony_update"
  ON zakazka_sablony FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL);

-- Seed 5 šablon pro rychlý dispečink
INSERT INTO zakazka_sablony (nazev, typ, typy_zasahu, skudci, poznamka_template, poradi) VALUES
  ('Vosy / Sršně', 'jednorazova', '{postrik}', '{vosy,sršně}', 'Likvidace vosího/sršního hnízda', 1),
  ('Štěnice', 'jednorazova', '{postrik}', '{štěnice}', 'Postřik proti štěnicím — 2 zásahy po 14 dnech', 2),
  ('Hlodavci — jednorázově', 'jednorazova', '{vnitrni_deratizace}', '{myš domácí,potkan obecný}', 'Jednorázová deratizace', 3),
  ('Hlodavci — monitoring', 'smluvni', '{vnitrni_deratizace,vnejsi_deratizace}', '{myš domácí,potkan obecný}', 'Smluvní monitoring hlodavců', 4),
  ('Postřik domácnost', 'jednorazova', '{postrik}', '{šváb obecný,rus domácí}', 'Postřik proti hmyzu v domácnosti', 5);
