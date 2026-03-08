-- Sprint 6: Seed data for sablony_bodu (monitoring point calculator templates)
-- Source: CLAUDE.md "Kalkulačka monitorovacích bodů" section

-- =====================================================
-- GASTRO × VNITŘNÍ DERATIZACE (from CLAUDE.md exact data)
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('gastro', 'vnitrni_deratizace', 0, 50, 2, 1, 1, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 51, 100, 3, 1, 1, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 101, 150, 5, 2, 1, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 151, 200, 7, 2, 2, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 201, 300, 9, 3, 2, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 301, 400, 11, 3, 2, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 401, 600, 13, 4, 2, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 601, 800, 15, 5, 3, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 801, 1000, 17, 6, 3, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 1001, 1500, 22, 7, 3, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 1501, 2000, 27, 8, 4, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 2001, 2500, 32, 10, 5, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 2501, 3000, 37, 12, 6, 0, 0, NULL),
  ('gastro', 'vnitrni_deratizace', 3001, NULL, 37, 12, 6, 0, 0,
    '{"zaklad_m2": 3000, "bod_s_mys": {"zaklad": 37, "prirustek": 8, "za_m2": 1000}, "bod_l_potkan": {"zaklad": 12, "prirustek": 2, "za_m2": 1000}, "zivolovna": {"zaklad": 6, "prirustek": 1, "za_m2": 1000}}'::jsonb);

-- =====================================================
-- GASTRO × VNĚJŠÍ DERATIZACE (lower counts, outdoor stations)
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('gastro', 'vnejsi_deratizace', 0, 100, 0, 2, 0, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 101, 300, 0, 3, 0, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 301, 600, 0, 4, 1, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 601, 1000, 0, 6, 1, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 1001, 2000, 0, 8, 2, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 2001, 3000, 0, 10, 2, 0, 0, NULL),
  ('gastro', 'vnejsi_deratizace', 3001, NULL, 0, 10, 2, 0, 0,
    '{"zaklad_m2": 3000, "bod_l_potkan": {"zaklad": 10, "prirustek": 2, "za_m2": 1000}, "zivolovna": {"zaklad": 2, "prirustek": 1, "za_m2": 1000}}'::jsonb);

-- =====================================================
-- GASTRO × VNITŘNÍ DEZINSEKCE (flying + crawling insects)
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('gastro', 'vnitrni_dezinsekce', 0, 50, 0, 0, 0, 1, 2, NULL),
  ('gastro', 'vnitrni_dezinsekce', 51, 100, 0, 0, 0, 2, 3, NULL),
  ('gastro', 'vnitrni_dezinsekce', 101, 200, 0, 0, 0, 3, 4, NULL),
  ('gastro', 'vnitrni_dezinsekce', 201, 400, 0, 0, 0, 4, 6, NULL),
  ('gastro', 'vnitrni_dezinsekce', 401, 600, 0, 0, 0, 5, 8, NULL),
  ('gastro', 'vnitrni_dezinsekce', 601, 1000, 0, 0, 0, 6, 10, NULL),
  ('gastro', 'vnitrni_dezinsekce', 1001, 2000, 0, 0, 0, 8, 14, NULL),
  ('gastro', 'vnitrni_dezinsekce', 2001, NULL, 0, 0, 0, 8, 14,
    '{"zaklad_m2": 2000, "letajici": {"zaklad": 8, "prirustek": 2, "za_m2": 1000}, "lezouci": {"zaklad": 14, "prirustek": 4, "za_m2": 1000}}'::jsonb);

-- =====================================================
-- SKLAD NEŽIVOČIŠNÝ × VNITŘNÍ DERATIZACE
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 0, 100, 2, 1, 1, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 101, 300, 4, 2, 1, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 301, 600, 7, 3, 1, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 601, 1000, 10, 4, 2, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 1001, 2000, 15, 6, 2, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 2001, 3000, 20, 8, 3, 0, 0, NULL),
  ('sklad_nevyzivocisna', 'vnitrni_deratizace', 3001, NULL, 20, 8, 3, 0, 0,
    '{"zaklad_m2": 3000, "bod_s_mys": {"zaklad": 20, "prirustek": 6, "za_m2": 1000}, "bod_l_potkan": {"zaklad": 8, "prirustek": 2, "za_m2": 1000}, "zivolovna": {"zaklad": 3, "prirustek": 1, "za_m2": 1000}}'::jsonb);

-- =====================================================
-- SKLAD ŽIVOČIŠNÝ × VNITŘNÍ DERATIZACE (higher counts due to food attractants)
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('sklad_zivocisna', 'vnitrni_deratizace', 0, 100, 3, 2, 1, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 101, 300, 6, 3, 1, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 301, 600, 10, 4, 2, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 601, 1000, 14, 6, 2, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 1001, 2000, 20, 8, 3, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 2001, 3000, 28, 10, 4, 0, 0, NULL),
  ('sklad_zivocisna', 'vnitrni_deratizace', 3001, NULL, 28, 10, 4, 0, 0,
    '{"zaklad_m2": 3000, "bod_s_mys": {"zaklad": 28, "prirustek": 8, "za_m2": 1000}, "bod_l_potkan": {"zaklad": 10, "prirustek": 3, "za_m2": 1000}, "zivolovna": {"zaklad": 4, "prirustek": 1, "za_m2": 1000}}'::jsonb);

-- =====================================================
-- DOMÁCNOST × VNITŘNÍ DERATIZACE (smaller areas, fewer points)
-- =====================================================
INSERT INTO public.sablony_bodu (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max) VALUES
  ('domacnost', 'vnitrni_deratizace', 0, 30, 1, 1, 0, 0, 0, NULL),
  ('domacnost', 'vnitrni_deratizace', 31, 50, 2, 1, 1, 0, 0, NULL),
  ('domacnost', 'vnitrni_deratizace', 51, 80, 3, 1, 1, 0, 0, NULL),
  ('domacnost', 'vnitrni_deratizace', 81, 100, 4, 2, 1, 0, 0, NULL),
  ('domacnost', 'vnitrni_deratizace', 101, 150, 5, 2, 1, 0, 0, NULL),
  ('domacnost', 'vnitrni_deratizace', 151, NULL, 5, 2, 1, 0, 0,
    '{"zaklad_m2": 150, "bod_s_mys": {"zaklad": 5, "prirustek": 2, "za_m2": 50}, "bod_l_potkan": {"zaklad": 2, "prirustek": 1, "za_m2": 100}, "zivolovna": {"zaklad": 1, "prirustek": 1, "za_m2": 150}}'::jsonb);
