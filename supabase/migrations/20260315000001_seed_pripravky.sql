-- Sprint 15: Seed přípravků pro DDD
-- Realistické přípravky používané v deratizaci, dezinsekci a dezinfekci

INSERT INTO public.pripravky (nazev, ucinna_latka, protilatka, typ, forma, baleni, cilovy_skudce, omezeni_prostor, aktivni, poznamka) VALUES

-- === RODENTICIDY (deratizace) ===
('Ratimor Brodifacoum pasta', 'Brodifacoum 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'pasta', '150g sáček', '["Potkan obecný", "Myš domácí", "Krysa obecná"]', '["potravinarsky", "domacnost", "prumysl", "venkovni", "zemedelsky", "chov_zvirat"]', true, 'Antikoagulant 2. generace. Jednodávkový účinek.'),

('Storm Secure', 'Flocoumafen 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'voskovy_blok', '20×10g bloky', '["Potkan obecný", "Myš domácí"]', '["potravinarsky", "prumysl", "venkovni", "zemedelsky"]', true, 'Vosková kostka odolná vlhkosti. Pro vlhké prostory.'),

('Murin Forte granule', 'Bromadiolon 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'granule', '150g sáček', '["Potkan obecný", "Myš domácí", "Krysa obecná"]', '["potravinarsky", "domacnost", "prumysl", "venkovni", "zemedelsky", "chov_zvirat"]', true, 'Granulovaná nástraha. Vysoká palatabilita.'),

('Murin Facoum parafínové bloky', 'Brodifacoum 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'voskovy_blok', '20×20g bloky', '["Potkan obecný", "Myš domácí"]', '["potravinarsky", "prumysl", "venkovni"]', true, 'Parafínové bloky pro venkovní a vlhké aplikace.'),

('Difenacoum WB', 'Difenacoum 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'voskovy_blok', '10kg kbelík', '["Potkan obecný", "Myš domácí"]', '["potravinarsky", "prumysl", "venkovni", "zemedelsky"]', true, 'Ekonomické balení pro rozsáhlé deratizace.'),

('Ratimor pelety', 'Bromadiolon 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'granule', '150g sáček', '["Myš domácí", "Krysa obecná"]', '["domacnost", "prumysl", "venkovni"]', true, 'Peletovaná forma pro snadnou aplikaci.'),

('Racumin Foam', 'Kumatetralyl 0,75%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'pena', '500ml sprej', '["Potkan obecný", "Myš domácí"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Pěnová forma pro aplikaci do nor a dutin. Kontaktní účinek.'),

('Norat zrní', 'Bromadiolon 0,005%', 'Vitamin K1 (Fytomenadion)', 'rodenticid', 'granule', '150g sáček', '["Myš domácí", "Hraboš polní"]', '["zemedelsky", "venkovni"]', true, 'Zrnová nástraha pro polní hlodavce.'),

-- === INSEKTICIDY — postřik ===
('Demand CS', 'Lambda-cyhalothrin 10%', NULL, 'insekticid', 'mikrokapsule', '250ml', '["Šváb obecný", "Rus domácí", "Štěnice obecná", "Blecha obecná", "Mravenec obecný"]', '["potravinarsky", "domacnost", "prumysl", "venkovni"]', true, 'Mikrokapsulovaný insekticid s dlouhodobým reziduálním účinkem.'),

('K-Othrine WG 250', 'Deltamethrin 25%', NULL, 'insekticid', 'granule', '20g sáčky', '["Šváb obecný", "Rus domácí", "Blecha obecná", "Mravenec obecný", "Komár obecný"]', '["potravinarsky", "domacnost", "prumysl", "venkovni"]', true, 'Granule disperg. ve vodě. Bez zápachu, nebarví povrchy.'),

('Ficam W', 'Bendiocarb 80%', NULL, 'insekticid', 'prasek', '50g sáček', '["Vosa obecná", "Sršeň asijský"]', '["venkovni", "prumysl"]', true, 'Práškový insekticid pro likvidaci vosích a sršních hnízd.'),

('Cislin 25 EC', 'Deltamethrin 2,5%', NULL, 'insekticid', 'kapalina', '500ml', '["Štěnice obecná", "Šváb obecný", "Blecha obecná"]', '["domacnost", "prumysl"]', true, 'Koncentrát pro postřik proti lezoucímu hmyzu.'),

('Fendona 60 SC', 'Alphacypermethrin 6%', NULL, 'insekticid', 'kapalina', '500ml', '["Šváb obecný", "Rus domácí", "Blecha obecná", "Moucha domácí"]', '["potravinarsky", "domacnost", "prumysl", "venkovni"]', true, 'Suspenzní koncentrát. Rychlý knock-down efekt.'),

('Biopren 6 EC', 'S-methopren 6%', NULL, 'insekticid', 'kapalina', '100ml', '["Blecha obecná", "Moucha domácí"]', '["domacnost", "prumysl", "chov_zvirat"]', true, 'Regulátor růstu hmyzu. Přerušuje vývojový cyklus.'),

('Solfac EW 050', 'Cyfluthrin 5%', NULL, 'insekticid', 'kapalina', '1L', '["Moucha domácí", "Komár obecný", "Šváb obecný"]', '["potravinarsky", "domacnost", "prumysl", "zemedelsky", "chov_zvirat"]', true, 'Emulze pro profesionální postřik.'),

('Detmol Cap', 'Alphacypermethrin 5%', NULL, 'insekticid', 'mikrokapsule', '1L', '["Šváb obecný", "Rus domácí", "Mravenec obecný", "Štěnice obecná"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Mikrokapsulovaný pro dlouhodobý reziduální účinek.'),

-- === INSEKTICIDY — gel ===
('Goliath Gel', 'Fipronil 0,05%', NULL, 'insekticid', 'gel', '35g tuba', '["Šváb obecný", "Rus domácí"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Gelová nástraha. Kaskádový efekt — přenáší se na ostatní jedince.'),

('Advion Cockroach Gel', 'Indoxacarb 0,6%', NULL, 'insekticid', 'gel', '30g stříkačka', '["Šváb obecný", "Rus domácí"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Prémiový gel s vysokou atraktivitou. Metabolická aktivace.'),

('Maxforce Prime', 'Imidacloprid 2,15%', NULL, 'insekticid', 'gel', '30g stříkačka', '["Šváb obecný", "Rus domácí"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Profesionální gel. Rychlý nástup účinku.'),

('Maxforce Quantum', 'Imidacloprid 0,03%', NULL, 'insekticid', 'gel', '30g stříkačka', '["Mravenec faraón", "Mravenec obecný"]', '["potravinarsky", "domacnost", "prumysl"]', true, 'Gelová nástraha speciálně pro mravence. Tekutá konzistence.'),

-- === INSEKTICIDY — štěnice ===
('Temprid SC', 'Beta-cyfluthrin 10,5% + Imidacloprid 21%', NULL, 'insekticid', 'kapalina', '250ml', '["Štěnice obecná"]', '["domacnost", "prumysl"]', true, 'Kombinovaný přípravek pro profesionální hubení štěnic. Dvojí mechanismus účinku.'),

('Cimetrol Super', 'Pyrethriny 0,15% + PBO 1,5% + Permethrin 0,26%', NULL, 'insekticid', 'aerosol', '400ml', '["Štěnice obecná", "Blecha obecná"]', '["domacnost"]', true, 'Aerosolový přípravek s okamžitým knock-down účinkem.'),

-- === INSEKTICIDY — mouchy ===
('Agita 10 WG', 'Thiamethoxam 10%', NULL, 'insekticid', 'granule', '400g', '["Moucha domácí", "Masařka obecná"]', '["zemedelsky", "chov_zvirat", "prumysl"]', true, 'Nástrahový insekticid na mouchy. Nátěr nebo postřik na plochy.'),

('QuickBayt Spray', 'Imidacloprid 0,5%', NULL, 'insekticid', 'kapalina', '250ml', '["Moucha domácí"]', '["zemedelsky", "chov_zvirat", "potravinarsky"]', true, 'Postřikový přípravek na mouchy. Pro stájové prostory.'),

-- === INSEKTICIDY — mol/potravinoví škůdci ===
('Fury 10 EW', 'Zetacypermethrin 10%', NULL, 'insekticid', 'kapalina', '100ml', '["Mol šatní", "Zavíječ moučný", "Potemník moučný"]', '["domacnost", "potravinarsky", "prumysl"]', true, 'Přípravek proti skladištním škůdcům a molům.'),

-- === DEZINFEKCE ===
('Persteril 36%', 'Kyselina peroctová 36%', NULL, 'dezinfekce', 'kapalina', '1L', '[]', '["potravinarsky", "prumysl", "zemedelsky"]', true, 'Profesionální dezinfekční přípravek. Oxidační účinek.'),

('Savo Original', 'Chlornan sodný', NULL, 'dezinfekce', 'kapalina', '5L', '[]', '["domacnost", "prumysl", "potravinarsky"]', true, 'Univerzální dezinfekční prostředek na bázi chloru.'),

('Virkon S', 'Pentakalium-bis(peroxymonosulfát)bis(sulfát)', NULL, 'dezinfekce', 'prasek', '200g sáček', '[]', '["potravinarsky", "zemedelsky", "chov_zvirat", "prumysl"]', true, 'Širokospektrální dezinfekční přípravek. Virucidní, baktericidní, fungicidní.'),

-- === BIOCIDY / REPELENTY ===
('Bird Free optický gel', 'Optický gel (vizuální repelent)', NULL, 'repelent', 'gel', '15 misek', '["Holub domácí"]', '["venkovni", "prumysl"]', true, 'UV gel odrazující holuby. Neškodný, vizuální bariéra.'),

('Avithor gel', 'Metylantranilát', NULL, 'repelent', 'gel', '300ml kartuše', '["Holub domácí"]', '["venkovni", "prumysl"]', true, 'Repelentní gel proti holubům. Pachový a chuťový odpuzovač.'),

-- === FUMIGACE ===
('Phostoxin', 'Fosforovodík (z fosforidu hliníku)', NULL, 'biocid', 'tablety', '30 tablet', '["Potkan obecný", "Myš domácí", "Krysa obecná", "Hraboš polní"]', '["zemedelsky", "venkovni"]', true, 'Fumigační přípravek. Pouze pro vyškolené odborníky. Kategorie T+.'),

('Detia Gas-Ex-B', 'Fosforovodík (z fosforidu hořečnatého)', NULL, 'biocid', 'tablety', '36 sáčků', '["Potkan obecný", "Myš domácí", "Zavíječ moučný", "Potemník moučný"]', '["prumysl", "zemedelsky"]', true, 'Fumigační sáčky pro profesionální použití. Skladové prostory.');
