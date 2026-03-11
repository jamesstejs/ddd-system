-- Sprint 24: Email log pro sledování odeslaných emailů
-- Typy emailů a stavů
CREATE TYPE typ_emailu AS ENUM ('protokol', 'faktura', 'terminy', 'pripominky');
CREATE TYPE stav_emailu AS ENUM ('odeslano', 'doruceno', 'chyba', 'cekajici');

CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protokol_id UUID REFERENCES protokoly(id),
  prijemce TEXT NOT NULL,
  predmet TEXT NOT NULL,
  typ typ_emailu NOT NULL DEFAULT 'protokol',
  stav stav_emailu NOT NULL DEFAULT 'cekajici',
  resend_id TEXT,
  chyba_detail TEXT,
  odeslano_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Trigger pro updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_log
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin: full CRUD
CREATE POLICY "admin_full_access" ON email_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role::jsonb) ?| ARRAY['admin', 'super_admin']
    )
  );

-- Index pro rychlé vyhledávání dle protokolu
CREATE INDEX idx_email_log_protokol_id ON email_log(protokol_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_log_stav ON email_log(stav) WHERE deleted_at IS NULL;
