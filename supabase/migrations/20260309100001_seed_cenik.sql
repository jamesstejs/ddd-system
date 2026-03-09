-- Sprint 7: Seed data for ceník tables
-- Source: CLAUDE.md pricing tables

-- =====================================================
-- cenik_obecne (6 rows)
-- =====================================================
INSERT INTO public.cenik_obecne (nazev, hodnota, jednotka, poznamka) VALUES
  ('vyjezd',           690,   'Kč',    'Praha, krajská města'),
  ('marny_vyjezd',     950,   'Kč',    'Bez zásahu'),
  ('doprava_km',        16,   'Kč/km', 'Od krajského města pobočky'),
  ('vikend_priplatek',  10,   '%',     'Víkendový příplatek'),
  ('nocni_priplatek',   20,   '%',     'Noční hodiny 20:00–6:00'),
  ('minimalni_cena',  2500,   'Kč',    'Minimální cena zakázky bez DPH');

-- =====================================================
-- cenik_postriky (11 rows)
-- Postřiky domácnosti
-- =====================================================

-- Štěnice / Blechy (5 rows)
INSERT INTO public.cenik_postriky (kategorie, plocha_od, plocha_do, cena) VALUES
  ('stenice_blechy',  0,   30,  2188),
  ('stenice_blechy', 31,   50,  2958),
  ('stenice_blechy', 51,   80,  3178),
  ('stenice_blechy', 81,  100,  3728),
  ('stenice_blechy', 101, 150,  4619);

-- Moli, rybenky a další (5 rows)
INSERT INTO public.cenik_postriky (kategorie, plocha_od, plocha_do, cena) VALUES
  ('moli_rybenky',  0,   30,  2188),
  ('moli_rybenky', 31,   50,  2958),
  ('moli_rybenky', 51,   80,  3178),
  ('moli_rybenky', 81,  100,  3728),
  ('moli_rybenky', 101, 150,  4619);

-- Preventivní ošetření (1 row)
INSERT INTO public.cenik_postriky (kategorie, plocha_od, plocha_do, cena) VALUES
  ('preventivni', 0, NULL, 1529);

-- =====================================================
-- cenik_gely (15 rows)
-- Gelové nástrahy domácnosti
-- =====================================================

-- Rusi/Švábi — 1 zásah (5 rows)
INSERT INTO public.cenik_gely (kategorie, bytu_od, bytu_do, cena) VALUES
  ('rusi_svabi_1',  1,   2,  2188),
  ('rusi_svabi_1',  3,  10,  1528),
  ('rusi_svabi_1', 11,  20,   835),
  ('rusi_svabi_1', 21,  30,   648),
  ('rusi_svabi_1', 31, NULL,  538);

-- Rusi/Švábi — 2 zásahy (5 rows)
INSERT INTO public.cenik_gely (kategorie, bytu_od, bytu_do, cena) VALUES
  ('rusi_svabi_2',  1,   2,  4376),
  ('rusi_svabi_2',  3,  10,  3056),
  ('rusi_svabi_2', 11,  20,  1670),
  ('rusi_svabi_2', 21,  30,  1296),
  ('rusi_svabi_2', 31, NULL, 1076);

-- Mravenci faraón — 1 zásah (5 rows)
INSERT INTO public.cenik_gely (kategorie, bytu_od, bytu_do, cena) VALUES
  ('mravenci_1',  1,   2,  2188),
  ('mravenci_1',  3,  10,  1528),
  ('mravenci_1', 11,  20,   835),
  ('mravenci_1', 21,  30,   648),
  ('mravenci_1', 31, NULL,  538);

-- =====================================================
-- cenik_specialni (3 rows)
-- =====================================================
INSERT INTO public.cenik_specialni (nazev, cena_od, cena_do) VALUES
  ('Vosy a sršni',                2100, 3200),
  ('Ubytovny — za pokoj (max 3 postele)', 1989, NULL),
  ('Ubytovny — za další postel',  825, NULL);

-- =====================================================
-- cenik_deratizace (10 rows)
-- Smluvní monitoring
-- =====================================================
INSERT INTO public.cenik_deratizace (nazev, cena_za_kus) VALUES
  ('Plastová stanička MYŠ (8×4×8 cm)',    90),
  ('Sklapovací pastička na MYŠ',          90),
  ('Plastová stanice POTKAN (25×7×7 cm)', 170),
  ('Živolovka MYŠ (kovová)',              349),
  ('Živolovka POTKAN (kovová)',           849),
  ('Náplň do stanic (nástraha)',           99),
  ('Pěna Racumin — částečné ošetření',    999),
  ('Pěna Racumin — celé ošetření',       1299),
  ('Práce technika — firmy hlavní',      1639),
  ('Práce technika — krajánci + domácnosti', 999);

-- =====================================================
-- cenik_dezinfekce (8 rows)
-- =====================================================

-- Postřik (Kč/m²)
INSERT INTO public.cenik_dezinfekce (typ, plocha_od, plocha_do, cena_za_m) VALUES
  ('postrik',   0,  100, 70),
  ('postrik', 101,  200, 50),
  ('postrik', 201,  500, 30),
  ('postrik', 501, 1000, 11);

-- Aerosol (Kč/m³)
INSERT INTO public.cenik_dezinfekce (typ, plocha_od, plocha_do, cena_za_m) VALUES
  ('aerosol',   0,  100, 50),
  ('aerosol', 101,  200, 40),
  ('aerosol', 201,  500, 19),
  ('aerosol', 501, 1000, 11);
