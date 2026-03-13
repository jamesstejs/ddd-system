-- Sprint 39: Přidání pobočky/regionu k technikům pro dispečerský pohled

ALTER TABLE profiles
  ADD COLUMN pobocka TEXT DEFAULT NULL
  CONSTRAINT chk_pobocka CHECK (pobocka IS NULL OR pobocka IN (
    'praha','stredocesky','jihocesky','plzensky','karlovarsky',
    'ustecky','liberecky','kralovehradecky','pardubicky',
    'vysocina','jihomoravsky','olomoucky','zlinsky','moravskoslezsky'
  ));

COMMENT ON COLUMN profiles.pobocka IS 'Krajská pobočka technika (14 českých krajů)';
