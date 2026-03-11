-- Sprint 25: Přidání zasah_id do email_log pro sledování pre-zásahových emailů
ALTER TABLE email_log ADD COLUMN zasah_id UUID REFERENCES zasahy(id);

-- Index pro rychlé vyhledávání dle zásahu
CREATE INDEX idx_email_log_zasah_id ON email_log(zasah_id) WHERE deleted_at IS NULL;
