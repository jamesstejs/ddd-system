-- Sprint 5: Seed škůdců z CLAUDE.md

-- =====================================================
-- HLODAVCI
-- =====================================================
INSERT INTO public.skudci (nazev, latinsky_nazev, typ, kategorie, doporucena_cetnost_dny, pocet_zasahu, poznamka)
VALUES
  ('Potkan obecný', 'Rattus norvegicus', 'hlodavec', 'přenašeč nemocí', 30, '1. návštěva, pak za 2 týdny, pak 1× měsíčně', 'Při vysokém požeru zkrátit na 2 týdny'),
  ('Myš domácí', 'Mus musculus', 'hlodavec', 'přenašeč nemocí', 30, '1. návštěva, pak za 2 týdny, pak 1× měsíčně', 'Při vysokém požeru zkrátit na 2 týdny'),
  ('Krysa obecná', 'Rattus rattus', 'hlodavec', 'přenašeč nemocí', 30, '1. návštěva, pak za 2 týdny, pak 1× měsíčně', 'Při vysokém požeru zkrátit na 2 týdny'),
  ('Hryzec vodní', 'Arvicola amphibius', 'hlodavec', 'škůdce zahrad', NULL, NULL, NULL),
  ('Hraboš polní', 'Microtus arvalis', 'hlodavec', 'škůdce zemědělský', NULL, NULL, NULL),
  ('Ondatra pižmová', 'Ondatra zibethicus', 'hlodavec', 'škůdce břehů', NULL, NULL, NULL),
  ('Myšice křovinná', 'Apodemus sylvaticus', 'hlodavec', 'škůdce zahrad', NULL, NULL, NULL),
  ('Bělozubka šedá', 'Crocidura suaveolens', 'hlodavec', 'hmyzožravec', NULL, NULL, 'Hmyzožravec, ne hlodavec, ale řešen stejným způsobem');

-- =====================================================
-- LEZOUCÍ HMYZ
-- =====================================================
INSERT INTO public.skudci (nazev, latinsky_nazev, typ, kategorie, doporucena_cetnost_dny, pocet_zasahu, poznamka)
VALUES
  ('Šváb obecný', 'Blatta orientalis', 'lezouci_hmyz', 'škůdce potravin', 28, '2 zásahy po 4–6 týdnech, 3. = reklamace', NULL),
  ('Rus domácí', 'Blattella germanica', 'lezouci_hmyz', 'škůdce potravin', 28, '2 zásahy po 4–6 týdnech, 3. = reklamace', NULL),
  ('Mravenec faraón', 'Monomorium pharaonis', 'lezouci_hmyz', 'škůdce potravin', 42, '2 placené zásahy, 3. = reklamace', NULL),
  ('Mravenec obecný', 'Lasius niger', 'lezouci_hmyz', 'obtížný hmyz', NULL, NULL, NULL),
  ('Štěnice obecná', 'Cimex lectularius', 'lezouci_hmyz', 'parazit', 14, '2 placené zásahy po 14 dnech, 3. = reklamace', NULL),
  ('Pisivka domácí', 'Lepisma saccharina', 'lezouci_hmyz', 'škůdce domácností', NULL, NULL, NULL),
  ('Rybenka domácí', 'Ctenolepisma longicaudata', 'lezouci_hmyz', 'škůdce domácností', NULL, NULL, NULL),
  ('Blecha obecná', 'Pulex irritans', 'lezouci_hmyz', 'parazit', 14, '1–2 zásahy dle výskytu', NULL),
  ('Mol šatní', 'Tineola bisselliella', 'lezouci_hmyz', 'škůdce textilu', NULL, NULL, NULL),
  ('Zavíječ moučný', 'Ephestia kuehniella', 'lezouci_hmyz', 'škůdce potravin', NULL, NULL, NULL),
  ('Potemník moučný', 'Tenebrio molitor', 'lezouci_hmyz', 'škůdce potravin', NULL, NULL, NULL),
  ('Pilous černý', 'Oryzaephilus surinamensis', 'lezouci_hmyz', 'škůdce potravin', NULL, NULL, 'Skladištní škůdce'),
  ('Roztoč', 'Acari', 'lezouci_hmyz', 'parazit', NULL, NULL, 'Různé druhy roztočů');

-- =====================================================
-- LÉTAJÍCÍ HMYZ
-- =====================================================
INSERT INTO public.skudci (nazev, latinsky_nazev, typ, kategorie, doporucena_cetnost_dny, pocet_zasahu, poznamka)
VALUES
  ('Moucha domácí', 'Musca domestica', 'letajici_hmyz', 'mouchy', NULL, NULL, NULL),
  ('Masařka obecná', 'Sarcophaga carnaria', 'letajici_hmyz', 'mouchy', NULL, NULL, NULL),
  ('Bzučivka zelená', 'Lucilia sericata', 'letajici_hmyz', 'mouchy', NULL, NULL, NULL),
  ('Komár pisklavý', 'Culex pipiens', 'letajici_hmyz', 'obtížný hmyz', NULL, NULL, NULL),
  ('Vosa obecná', 'Vespula vulgaris', 'letajici_hmyz', 'bodavý hmyz', NULL, '1 zásah', 'Likvidace hnízda'),
  ('Sršeň asijský', 'Vespa velutina', 'letajici_hmyz', 'bodavý hmyz', NULL, '1 zásah', 'Invazivní druh, likvidace hnízda'),
  ('Zavíječ voskový', 'Galleria mellonella', 'letajici_hmyz', 'škůdce včelstev', NULL, NULL, NULL),
  ('Bodalka stájová', 'Stomoxys calcitrans', 'letajici_hmyz', 'obtížný hmyz', NULL, NULL, 'Bodavá moucha');

-- =====================================================
-- OSTATNÍ
-- =====================================================
INSERT INTO public.skudci (nazev, latinsky_nazev, typ, kategorie, doporucena_cetnost_dny, pocet_zasahu, poznamka)
VALUES
  ('Holub domácí', 'Columba livia domestica', 'ostatni', 'ptáci', NULL, NULL, 'Mechanická ochrana, odchyt'),
  ('Kuna skalní', 'Martes foina', 'ostatni', 'savci', NULL, NULL, 'Odchyt do živolovných pastí'),
  ('Včela medonosná', 'Apis mellifera', 'ostatni', 'bodavý hmyz', NULL, '1 zásah', 'Chráněný druh — priorita přemístění'),
  ('Čmelák zemní', 'Bombus terrestris', 'ostatni', 'bodavý hmyz', NULL, '1 zásah', 'Chráněný druh — priorita přemístění');
