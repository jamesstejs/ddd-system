-- Sprint 16: Seed šablon poučení
-- 10 šablon: obecné per typ zásahu + specifické per škůdce

-- 1. Deratizace — obecné poučení
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni)
VALUES (
  'Deratizace — obecné poučení',
  'deratizace',
  'Byla provedena deratizace objektu pomocí rodenticidních přípravků umístěných v zajištěných deratizačních staničkách. Přípravky jsou umístěny na místech nepřístupných dětem a domácím zvířatům. Nemanipulujte s deratizačními staničkami ani s nástrahami. V případě náhodného požití přípravku ihned vyhledejte lékařskou pomoc a vezměte s sebou bezpečnostní list přípravku. Protilátkou je vitamín K1. Mrtvé hlodavce likvidujte v uzavřeném igelitovém pytli do směsného odpadu. Dodržujte zvýšenou hygienu rukou.',
  true
);

-- 2. Dezinsekce — postřik obecné
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni)
VALUES (
  'Dezinsekce — postřik obecné',
  'postrik',
  'Byl proveden insekticidní postřik objektu. Po dobu minimálně 4 hodin nevstupujte do ošetřených prostor. Po návratu důkladně vyvětrejte po dobu alespoň 30 minut. Kontaktní plochy (kliky, pracovní desky, stoly) otřete vlhkým hadříkem s čisticím prostředkem. Podlahy nemyjte minimálně 14 dní, aby zůstala reziduální účinnost přípravku. Domácí zvířata a děti do ošetřených prostor nevpouštějte po dobu 6 hodin. V případě zdravotních obtíží kontaktujte lékaře.',
  true
);

-- 3. Dezinsekce — gelová nástraha
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni)
VALUES (
  'Dezinsekce — gelová nástraha',
  'dezinsekce',
  'Byla provedena aplikace insekticidního gelového přípravku. Gel byl nanesen v malých kapkách na skrytá místa (za kuchyňskou linku, pod dřez, kolem rozvodů). Neodstraňujte nanesený gel. Přípravek je účinný po dobu 4–6 týdnů. Gel je hořký a obsahuje aversní látku, nicméně jej uchovávejte mimo dosah dětí a domácích zvířat. Úklid provádějte běžným způsobem, vyvarujte se však přímého kontaktu s místy aplikace.',
  true
);

-- 4. Dezinfekce — obecné
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni)
VALUES (
  'Dezinfekce — obecné poučení',
  'dezinfekce',
  'Byla provedena dezinfekce objektu schváleným biocidním přípravkem. Po aplikaci nevstupujte do prostor po dobu uvedenou technikem (obvykle 1–2 hodiny). Po uplynutí doby účinnosti prostory důkladně vyvětrejte. Kontaktní povrchy určené pro styk s potravinami otřete čistou vodou. Při práci s dezinfikovanými povrchy používejte ochranné rukavice. V případě podráždění kůže nebo dýchacích cest vyhledejte lékařskou pomoc.',
  true
);

-- 5. Poučení specifické — potkan/myš
INSERT INTO public.sablony_pouceni (
  nazev, typ_zasahu, obsah, aktivni, skudce_id
)
SELECT
  'Deratizace — hlodavci (potkan, myš)',
  'deratizace',
  'Byla provedena deratizace zaměřená na hlodavce. Rodenticidní nástrahy jsou umístěny v uzamčených deratizačních staničkách. Staničky jsou zajištěny proti otevření dětmi a necílovými zvířaty. Nemanipulujte se staničkami — při poškození nebo přemístění ihned kontaktujte naši firmu. Požer nástrah je kontrolován při každé návštěvě technika. Mrtvé hlodavce sbírejte pouze v ochranných rukavicích a likvidujte v uzavřeném obalu do komunálního odpadu. V okolí staniček udržujte pořádek pro snadnou kontrolu.',
  true,
  s.id
FROM public.skudci s
WHERE s.nazev = 'Potkan obecný' AND s.deleted_at IS NULL
LIMIT 1;

-- 6. Poučení specifické — šváb/rus
INSERT INTO public.sablony_pouceni (
  nazev, typ_zasahu, obsah, aktivni, skudce_id
)
SELECT
  'Dezinsekce — švábi a rusi',
  'dezinsekce',
  'Byla provedena dezinsekce zaměřená na šváby/rusy domácí pomocí gelové nástrahy. Přípravek byl aplikován na skrytá místa v kuchyni, koupelně a dalších rizikových prostorech. Efekt nastupuje postupně — hmyz přenáší účinnou látku do hnízda (kaskádový efekt). První výsledky jsou viditelné za 3–7 dní, plný účinek za 2–4 týdny. Během této doby můžete pozorovat zvýšený pohyb hmyzu — to je normální reakce. Nepoužívejte vlastní insekticidy, mohly by snížit účinnost profesionálního přípravku. Udržujte čistotu, nenechávejte zbytky jídla volně přístupné.',
  true,
  s.id
FROM public.skudci s
WHERE s.nazev = 'Rus domácí' AND s.deleted_at IS NULL
LIMIT 1;

-- 7. Poučení specifické — štěnice
INSERT INTO public.sablony_pouceni (
  nazev, typ_zasahu, obsah, aktivni, skudce_id
)
SELECT
  'Dezinsekce — štěnice',
  'postrik',
  'Byl proveden insekticidní postřik zaměřený na štěnice. Po ošetření nevstupujte do prostor minimálně 6 hodin. Před návratem důkladně vyvětrejte. Lůžkoviny a oblečení, které přišly do kontaktu s ošetřenými plochami, vyperte na minimálně 60 °C. Matrace a čalouněný nábytek nevyhazujte — postřik má reziduální účinek. Vysávejte pravidelně, sáček po každém vysávání ihned vyhoďte. Druhý zásah bude proveden za 14 dní — je nezbytný pro likvidaci nově vylíhlých jedinců z vajíček. Dodržujte termín druhého zásahu.',
  true,
  s.id
FROM public.skudci s
WHERE s.nazev = 'Štěnice domácí' AND s.deleted_at IS NULL
LIMIT 1;

-- 8. Poučení specifické — mravenec faraón
INSERT INTO public.sablony_pouceni (
  nazev, typ_zasahu, obsah, aktivni, skudce_id
)
SELECT
  'Dezinsekce — mravenec faraón',
  'dezinsekce',
  'Byla provedena dezinsekce zaměřená na mravence faraóna pomocí gelových nástrah. Mravenec faraón tvoří rozsáhlé kolonie s mnoha královnami. Gel funguje na principu pomalého účinku — dělnice přenášejí otravu do hnízda. NEPOUŽÍVEJTE sprejové insekticidy ani jiné přípravky — způsobily by rozprchnutí kolonie a zhoršení situace. Neodstraňujte nanesený gel. Udržujte čistotu, nenechávejte zbytky sladkých potravin. Plný účinek nastupuje za 4–8 týdnů. Kontrolní návštěva bude provedena za 4–6 týdnů.',
  true,
  s.id
FROM public.skudci s
WHERE s.nazev = 'Mravenec faraón' AND s.deleted_at IS NULL
LIMIT 1;

-- 9. Poučení specifické — myš domácí
INSERT INTO public.sablony_pouceni (
  nazev, typ_zasahu, obsah, aktivni, skudce_id
)
SELECT
  'Deratizace — myš domácí',
  'deratizace',
  'Byla provedena deratizace zaměřená na myš domácí. Deratizační staničky velikosti S jsou umístěny podél stěn a v rozích místností, kde byl zjištěn výskyt. Myši se pohybují podél stěn a staničky jsou umístěny na jejich přirozených cestách. Nekrmte myši a odstraňte všechny dostupné zdroje potravy (otevřené balíčky, drobky, krmivo pro domácí zvířata). Utěsněte otvory větší než 6 mm — myš se protáhne i velmi malým otvorem. Při zjištění mrtvého hlodavce použijte rukavice a likvidujte v uzavřeném pytli.',
  true,
  s.id
FROM public.skudci s
WHERE s.nazev = 'Myš domácí' AND s.deleted_at IS NULL
LIMIT 1;

-- 10. Obecné poučení (bez škůdce, bez typu)
INSERT INTO public.sablony_pouceni (nazev, typ_zasahu, obsah, aktivni)
VALUES (
  'Obecné poučení — všechny typy zásahů',
  'obecne',
  'Byl proveden odborný zásah dezinfekce, dezinsekce nebo deratizace (DDD) dle platné legislativy. Všechny použité přípravky jsou registrovány a schváleny pro profesionální použití v ČR. Bezpečnostní listy použitých přípravků jsou přílohou tohoto protokolu. V případě jakýchkoliv zdravotních obtíží ihned kontaktujte lékaře a předložte bezpečnostní listy. V případě dotazů nebo problémů kontaktujte naši firmu na tel. 800 130 303 nebo email info@deraplus.cz. Dodržujte pokyny technika uvedené v protokolu.',
  true
);
