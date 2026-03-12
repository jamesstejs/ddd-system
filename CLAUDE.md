# CLAUDE.md — DDD Systém (Deraplus)

> Čti tento soubor jako první při každém spuštění. Obsahuje vše co potřebuješ vědět.

---

## Firma

| | |
|---|---|
| Obchodní název | AHELP Group, s.r.o. |
| Brand | Deraplus / deraplus.cz |
| Sídlo | Dvořákova 475, 252 64 Velké Přílepy |
| IČO | 01483056 |
| DIČ | CZ01483056 |
| Plátce DPH | Ano |
| Telefon | 800 130 303 |
| Email | info@deraplus.cz |
| Web | www.deraplus.cz |
| Pobočky | Všechna krajská města ČR |

Logo: soubor `logo.png` v kořeni projektu (bude dodáno).

---

## Co je systém

Business management platforma pro českou DDD firmu **Deraplus** (dezinfekce, dezinsekce, deratizace). Systém pokrývá celý provozní cyklus:

klienti → objekty → zakázky + ceník → plánování techniků → terénní protokoly → PDF → fakturace (Fakturoid) → klientský portál

**Jediný tenant** (jen pro Deraplus). Jazyk: **čeština**.

---

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Next.js 14+ (App Router), TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Migrace | Supabase CLI — `supabase/migrations/` |
| Deploy | Vercel (auto z GitHub `main`) |
| AI | Anthropic API `claude-sonnet-4-20250514` |
| Fakturace | Fakturoid API v3 (slug: `ahelpgroup`) |
| Firmy | ARES API (načítání dle IČO) |
| Email | Resend (nebo Supabase Edge Function) — odesílatel: info@deraplus.cz |
| SMS | Provider TBD — připravit abstrakci |

---

## Role uživatelů

| Role | Popis | Počet na startu |
|------|-------|-----------------|
| `super_admin` | Vlastník — vše + správa uživatelů, ceník, nastavení | 1 (Jakub) |
| `admin` | Dispečer — vše kromě systémového nastavení | 3 |
| `technik` | Terén — své zakázky, protokoly, kalendář, dostupnost | 15 |
| `klient` | Zákazník — protokoly, faktury, výběr termínů (budoucí fáze) | – |

**Jeden člověk může mít více rolí** (technik i admin). V UI = **přepínání rolí** (toggle v top baru, UI se mění dle aktuální role).

**Vytváření uživatelů:** admin vytváří účty v systému (ne self-registrace).
**Zapomenuté heslo:** klasický email reset (Supabase Auth).

---

## Moduly systému

### 1. Klienti

- B2B firmy i fyzické osoby
- ARES integrace: načtení firmy podle IČO → prefill názvu, adresy, DIČ
- Duplicita se kontroluje podle IČO
- **Kontaktní údaje:** email + telefon (email nemusí být povinný — někteří klienti ho nemají, těm se posílá SMS)
- **Více kontaktních osob** per klient (jednatel, provozní, kontakt na místě...)
- Poznámky u klienta (volný text, interní)
- **Individuální sleva/přirážka** per klient (% na celé zakázky — přepisuje default ceník)
- DPH sazba nastavitelná per klient (default 21 %)

### 2. Objekty

- Patří jednomu klientovi (1 objekt = 1 klient)
- Adresa, plocha m², typ objektu
- **Plánek objektu:** upload fotky/obrázku (Supabase Storage) s rozmístěním bodů
- **Vlastní číselné řady monitorovacích bodů** (bod může mít prefix: L1, H3, P5...)
- **Dílčí okruhy** v rámci jednoho objektu (např. okruh "Kuchyně", okruh "Sklad", okruh "Venkovní")

**Typy objektů** (enum, admin může přidávat):
gastro | sklad_nevyzivocisna | sklad_zivocisna | domacnost | kancelar | skola | hotel | nemocnice | ubytovna | vyrobni_hala | jiny

Typ objektu určuje:
- Šablonu monitorovacích bodů (kalkulačka)
- Omezení přípravků (ne všechny přípravky se mohou použít v domácnosti vs potravinářský provoz)

### 3. Kalkulačka monitorovacích bodů

Systém navrhuje počty bodů dle **typu objektu + plochy (m²)**. Data v DB tabulce `sablony_bodu`. Admin může editovat.

Seed data pro typy: Gastro, Sklad neživočišný, Sklad živočišný, Domácnost — viz `supabase/seed.sql`.

**Příklad — GASTRO, Vnitřní deratizace:**

| do m² | Bod S (myš) | Bod L (potkan) | Živolovná past |
|-------|-------------|----------------|----------------|
| 50 | 2 | 1 | 1 |
| 100 | 3 | 1 | 1 |
| 150 | 5 | 2 | 1 |
| 200 | 7 | 2 | 2 |
| 300 | 9 | 3 | 2 |
| 400 | 11 | 3 | 2 |
| 600 | 13 | 4 | 2 |
| 800 | 15 | 5 | 3 |
| 1000 | 17 | 6 | 3 |
| 1500 | 22 | 7 | 3 |
| 2000 | 27 | 8 | 4 |
| 2500 | 32 | 10 | 5 |
| 3000 | 37 | 12 | 6 |
| >3000 | 37+8/1000m² | 12+2/1000m² | 6+1/1000m² |

*(Kompletní tabulky pro všechny typy objektů + dezinsekci + vnější deratizaci v seed.sql)*

### 4. Zakázky

- Zakázka je vázaná na **objekt**
- Typy zásahů (lze kombinovat): **vnitřní deratizace | vnější deratizace | vnitřní dezinsekce | postřik**
- Typ zakázky: **jednorázová** (domácnosti, ad-hoc) | **smluvní** (opakovaná, firmy)
- Smluvní zakázka: může mít platnost (do data) nebo neomezenou (do nekonečna)
- Četnost návštěv nastavitelná (systém doporučuje dle škůdce — viz sekce Škůdci)
- Po zásahu technik navrhuje další termín (viz Logika dalšího termínu)
- Označení: u kterých zakázek musí proběhnout **platba předem** (přes QR)

### 5. Ceník

Ceník je uložen v DB, admin ho může editovat. Systém automaticky počítá cenu zakázky.

#### Obecné sazby

| Položka | Cena |
|---------|------|
| Výjezd (Praha, krajská města) | 690 Kč |
| Marný výjezd bez zásahu | 950 Kč |
| Doprava mimo město | 16 Kč/km (od krajského města pobočky) |
| Víkendový příplatek | +10 % |
| Noční hodiny (20:00–6:00) | +20 % |
| Minimální cena zakázky | 2 500 Kč bez DPH |

#### Postřiky — domácnosti

| Velikost bytu | Štěnice / Blechy | Moli, rybenky a další | Preventivní ošetření |
|---------------|------------------|-----------------------|---------------------|
| do 30 m² | 2 188 Kč | 2 188 Kč | – |
| do 50 m² | 2 958 Kč | 2 958 Kč | – |
| do 80 m² | 3 178 Kč | 3 178 Kč | – |
| do 100 m² | 3 728 Kč | 3 728 Kč | – |
| do 150 m² | 4 619 Kč | 4 619 Kč | – |
| Preventivní | – | – | 1 529 Kč |

Štěnice: 2 placené zásahy, 3. = reklamace. Blechy: 1–2 zásahy dle výskytu. + výjezd 690 Kč.

#### Gelové nástrahy — domácnosti (i ubytovny, bytové domy)

| Počet bytů | Rusi/Švábi (1 zásah) | Rusi/Švábi (2 zásahy) | Mravenci faraón (1 zásah) |
|------------|---------------------|-----------------------|--------------------------|
| 1–2 | 2 188 Kč | 4 376 Kč | 2 188 Kč |
| 3–10 | 1 528 Kč | 3 056 Kč | 1 528 Kč |
| 11–20 | 835 Kč | 1 670 Kč | 835 Kč |
| 21–30 | 648 Kč | 1 296 Kč | 648 Kč |
| nad 30 | 538 Kč | 1 076 Kč | 538 Kč |

Rusi/švábi: 20 min/byt. Mravenci faraón: 2 placené zásahy, 3. = reklamace.

#### Speciální zásahy

| Služba | Cena od | Cena do |
|--------|---------|---------|
| Vosy a sršni | 2 100 Kč | 3 200 Kč |
| Ubytovny — za pokoj (max 3 postele) | 1 989 Kč | – |
| Ubytovny — za další postel | 825 Kč | – |

#### Deratizace — smluvní monitoring (firmy)

| Položka | Cena/ks |
|---------|---------|
| Plastová stanička MYŠ (8×4×8 cm) | 90 Kč |
| Sklapovací pastička na MYŠ | 90 Kč |
| Plastová stanice POTKAN (25×7×7 cm) | 170 Kč |
| Živolovka MYŠ (kovová) | 349 Kč |
| Živolovka POTKAN (kovová) | 849 Kč |
| Náplň do stanic (nástraha) | 99 Kč |
| Pěna Racumin — částečné ošetření | 999 Kč |
| Pěna Racumin — celé ošetření | 1 299 Kč |
| Práce technika — firmy hlavní | 1 639 Kč |
| Práce technika — krajánci + domácnosti | 999 Kč |

Ceny staniček se liší dle typu (myš vs potkan vs živolovná). Kontrola bodů (follow-up) = jednotná sazba.

#### Dezinfekce

| Plocha | 100 m² | 200 m² | 500 m² | 1 000 m² |
|--------|--------|--------|--------|----------|
| Cena/m² (postřik) | 70 Kč | 50 Kč | 30 Kč | 11 Kč |
| Cena/m³ (aerosol) | 50 Kč | 40 Kč | 19 Kč | 11 Kč |

Krajánci: × 0,70. Pravidelné postřiky: −30 %.

#### Cenová logika

**Jednorázová zakázka:** lookup dle škůdce × plocha/byty → cena z tabulky + výjezd + doprava km

**Smluvní monitoring:**
- **První návštěva:** výjezd + doprava km + zavedení bodů (cena dle typu staničky × počet) + práce technika
- **Další návštěvy:** výjezd + doprava km + kontrola bodů (jednotná sazba × počet) + práce technika
- Pokud se přidávají nové body → + zavedení za nově přidané

**Společné:**
- Sleva: admin může dát **do 50 %**, technik **do 10 %** (% nebo Kč na celou zakázku)
- Individuální sleva/přirážka per klient (přepisuje default)
- DPH dle nastavení klienta (default 21 %)
- Minimum 2 500 Kč bez DPH

### 6. Škůdci

Seznam škůdců uložen v DB (`skudci`), seed z CSV. Hlavní kategorie:

**Hlodavci:** Potkan obecný, Myš domácí, Krysa obecná, Hryzec vodní, Hraboš polní, Ondatra pižmová, Myšice křovinná, Bělozubka šedá

**Lezoucí hmyz:** Šváb obecný, Rus domácí, Mravenec faraón, Mravenec obecný, Štěnice obecná, Pisivka domácí, Rybenka domácí, Blecha obecná, Mol šatní, Zavíječ moučný, Potemník moučný, Pilous, Roztoč...

**Létající hmyz:** Moucha domácí, Masařka obecná, Bzučivka, Komár, Vosa obecná, Sršeň asijský, Zavíječ voskový, Bodalka stájová...

**Ostatní:** Holub domácí, Kuna skalní, Včela, Čmelák...

*(Kompletní seznam se seed daty z CSV — cca 50+ druhů)*

Každý škůdce má v DB:
- latinský název
- typ (hlodavec / lezoucí hmyz / létající hmyz / ostatní)
- kategorie (mouchy, přenašeč nemocí, škůdce potravin...)
- přiřazené přípravky dle typu prostoru (potravinářský provoz, domácnost, průmysl, venkovní, zemědělský, chov zvířat)
- doporučený počet zásahů

#### Doporučená četnost návštěv dle škůdce

| Škůdce | Četnost |
|--------|---------|
| Potkan / Myš / Krysa | 1. návštěva, pak za 2 týdny, pak 1× měsíčně (při vysokém požeru zkrátit na 2 týdny) |
| Štěnice | 2 zásahy po 14 dnech (3. = reklamace) |
| Šváb / Rus / Mravenec faraón | 2 zásahy po 4–6 týdnech (3. = reklamace) |
| Pravidelný monitoring (obecně) | 1× za 2 týdny / 1 měsíc / 2 měsíce / 3 měsíce / 4 měsíce / 5 měsíců / 6 měsíců |

U smluvních klientů se nastavuje individuální četnost s cílem ji postupně snižovat.

### 7. Monitorovací body

- Body jsou na objektu **číslované trvale** (1, 2, 3... nebo s prefixem: L1, H3, P5)
- Objekt může mít více **okruhů** (kuchyně, sklad, venkovní...) — body jsou přiřazené k okruhu
- Technik vidí **plánek objektu** s rozložením bodů (upload foto/obrázek)
- Při opakovaných návštěvách systém **předvyplní body z předchozího protokolu** (typy staniček, rozložení) — technik jen aktualizuje hodnoty
- Každý bod má svou historii (požer v čase → trend)

### 8. Přípravky & Bezpečnostní listy

- Cca **30 přípravků** v DB (admin spravuje)
- Každý přípravek: název, účinná látka, cílový škůdce, typ (rodenticid/insekticid/biocid), forma, balení
- **Omezení použití dle typu prostoru** (domácnost, potravinářský provoz, průmysl, venkovní, zemědělský, chov zvířat)
- Technik vybírá přípravek **pouze z předem zadaného seznamu** v systému
- PDF bezpečnostní list v Supabase Storage (cca 30 BL na začátku)
- **Poučení k zásahu: per typ škůdce** (každý zásah má vlastní text poučení — admin edituje šablony)
- Poučení + BL se posílají klientovi **při potvrzení termínu** (spolu s potvrzením)

### 9. Terénní protokoly

- Vyplňuje technik **na místě na mobilu**, 1 protokol = 1 zásah
- **Musí být hotový do konce pracovního dne** (důraz na vyplnění přímo na místě)
- Technik může uložit rozpracovaný protokol a pokračovat (ale cíl = vše na místě)
- Admin může **editovat** protokol (nejen schválit/vrátit)
- Status: rozpracovaný → ke_schválení → schválený → odeslaný

**Číslování protokolů:** sekvenční per klient (P-[KLIENT_KOD]-001, P-[KLIENT_KOD]-002...)

**Zodpovědný technik v protokolu:** fixní jméno hlavního technika firmy (Pavel Horák) — ale systém interně eviduje kdo zásah skutečně provedl.

**Věta o účinnosti:** pevný template (admin edituje text, ne AI). Např. "Účinnost zásahu byla vyhodnocena jako dostatečná."

**Statistiky v protokolu:** porovnání s předchozí návštěvou — požer byl X%, teď Y%, trend (klesající/stoupající/stabilní). Celkové statistiky objektu.

#### Deratizační bod zaznamenává:
- Číslo bodu (prefix + číslo)
- Okruh
- Typ staničky: živolovná / myš / potkan / sklopná myš / sklopná potkan
- Přípravek (nebo bez přípravku)
- Požer: 0 / 25 / 50 / 75 / 100 %
- Stav: zavedená / odcizená / znovu zavedená / poškozená / ok

#### Dezinsekční bod zaznamenává:
- Číslo bodu (prefix + číslo)
- Okruh
- Typ lapače: lezoucí hmyz / létající hmyz / lepová / elektronická
- Druh hmyzu (výběr ze seznamu škůdců)
- Počet kusů

#### Postřik zaznamenává:
- Škůdce, plocha (m²)
- Přípravky (technik vybírá ze seznamu, admin může přednastavit na zakázce)
- Spotřeba a koncentrace (%)
- Účinná látka (automaticky z DB přípravků)
- Typ zákroku (postřik, ULV, popraš, gelová nástraha — viz vzorový protokol)
- Fotodokumentace

#### PDF protokolu (vzor viz nahrané PDF soubory)

**Dezinsekční protokol** (postřik) obsahuje:
- Hlavička: logo Deraplus, "DEZINSEKČNÍ PROTOKOL"
- Datum provedení, odpovědný technik
- Dodavatel (AHELP Group data) | Odběratel (klient data)
- **Další zásah proběhne: [datum od] - [datum do]** (zelený text, výrazný)
- Zásah proti: [škůdce]
- Použitý insekticid, účinná látka, protilátka
- Provedený zákrok (typ)
- Množství a koncentrace
- Poznámka
- Bezpečnostní listy (odkazy/přílohy)
- Patička: kontakt, slogan

**Deratizační protokol** (monitoring) obsahuje:
- Hlavička: logo Deraplus, "DERATIZAČNÍ PROTOKOL"
- Datum provedení, odpovědný technik
- Dodavatel | Odběratel | Použitý rodenticid + účinná látka + protilátka + počet staniček + průměrný požer
- **Další kontrola proběhne: [datum od] - [datum do]** (zelený text)
- Tabulka bodů: Č. | požer (120 polí v mřížce, aktivní body vyplněné)
- Bezpečnostní listy (seznam)
- Patička

### 10. Kalendář & Plánování

**Pracovní doba techniků:**
- Individuální! Technici zadávají svoji dostupnost **14–60 dní předem**
- Zkrácené úvazky (0,1–0,5 FTE)
- Systém je **upozorňuje** aby si naklikali pracovní dobu (notifikace/dashboard widget)
- Víkendové zásahy existují (s příplatkem 10 %)

**Plánování:**
- Admini přiřazují zakázky technikům
- Technici si domlouvají opakované zásahy sami
- Kalendář: měsíc / týden / den, filtr dle technika
- **Systém počítá čas na přejezd** mezi zásahy (vzdálenost mezi objekty)
- Mobilní "Můj den" pro technika

**Délka zásahů:** systém odhaduje dle:
- Typu zásahu (postřik, monitoring, gel)
- Počtu bodů / bytů
- **Koeficient rychlosti technika** (individuální, admin nastavuje, default 1.0)

### 11. Logika dalšího termínu po zásahu

**3 scénáře v pořadí priority:**

1. **Technik domluvý na místě** → po dokončení protokolu formulář "Další termín" → datum+čas → zásah ihned v kalendáři jako "potvrzený"
2. **Technik nedomluví** → vytvoří se úkol pro admina "Domluvit termín" → admin vidí v dashboardu → ručně domluví
3. **Klient si vybírá sám (budoucí fáze)** → systém posílá email/SMS s odkazem na výběr z volných slotů

**Připomínky:**
- 1. připomínka: ten samý den (po vytvoření protokolu)
- Další připomínky: co 3 dny
- Maximum: 10 připomínek (nastavitelné)
- Klient vidí sloty na **1 měsíc dopředu** (jen pokud technik má vypsanou dostupnost)
- Sloty se přiřazují dle **lokace** (správný technik pro daný region)
- Systém čeká dokud technik nevyplní dostupnost → pak pošle klientovi; urgence pokud technik nemá

### 12. Fakturace — Fakturoid

- **Fakturoid slug:** `ahelpgroup`
- Fakturoid API v3 (OAuth 2 Client Credentials)
- Fakturuje se **per zásah** (ne měsíčně)
- Faktura se vystaví **po schválení protokolu**
- Mapování: klient → Fakturoid kontakt (sync)
- Položky z ceníku zakázky
- Sleva, DPH dle klienta
- **Splatnost:** 14 dní (nastavitelné)
- Fakturoid má napojenou banku → automatické párování plateb
- Admin může fakturu **upravit před odesláním**
- Fakturoid již obsahuje existující kontakty a faktury

**Proforma faktura (on-site):**
- Technik může na místě vygenerovat **proformu s QR kódem** pro okamžitou platbu
- U některých zakázek je nastaveno "platba předem" → technik vidí QR, klient platí na místě
- Po spárování platby (Fakturoid webhook/polling) → status se změní

**Email:** protokol a faktura chodí **zvlášť** (faktura přes Fakturoid API, protokol přes systémový email)

### 13. Notifikace

**Email (info@deraplus.cz, branded — logo, barvy):**
- Protokol PDF (po schválení)
- Bezpečnostní listy + poučení (při potvrzení termínu)
- Nabídka termínů (pokud klient nemá domluvený)
- Připomínky výběru termínu

**Fakturoid email (přes Fakturoid API):**
- Faktura

**SMS (provider TBD):**
- Pro klienty bez emailu: odkaz na protokol, termíny
- Připravit abstrakci pro budoucí napojení

### 14. Dashboard

**Admin vidí:**
- Protokoly ke schválení (počet)
- Protokoly k odeslání
- Nedomluvené termíny (zakázky bez dalšího termínu)
- Technici bez naplánovaných směn (dle dohody)
- Věci ve zpoždění (prošlé termíny, zpožděné kontroly)
- Neuhrazené faktury (počet + suma)
- Vlastní odměny (fixní částka nastavitelná super_adminem)

**Technik vidí:**
- "Můj den" (chronologický seznam zásahů)
- Klienti u kterých si brzy domluvit zásah
- Upozornění: vyplnit pracovní dobu
- Prémie: 100 Kč za zakázku / za domluvenou opakovanou zakázku (proplacené = zobrazit)

### 15. Bonusový systém

- Technik: fixní částka za každou zakázku (default 100 Kč, nastavitelné)
- Technik: bonus za domluvenou opakovanou zakázku (pokud ji klient zaplatí)
- Admin: fixní odměna (nastavuje super_admin)
- Dashboard zobrazuje aktuální prémie za období

---

## DB pravidla — ABSOLUTNÍ

```sql
-- Supabase extension (povolit v první migraci):
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Každá tabulka MUSÍ mít:
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at  TIMESTAMPTZ  -- soft delete, NIKDY fyzický DELETE

-- VŽDY trigger pro updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tabulka
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- VŽDY RLS
ALTER TABLE tabulka ENABLE ROW LEVEL SECURITY;

-- VŽDY migrace přes CLI, NIKDY schema přímo v dashboardu
-- Po každé migraci: npx supabase db push

-- Soft delete: všechny SELECT queries WHERE deleted_at IS NULL
```

---

## Mobile-First — ABSOLUTNÍ

```
✅ Tap target min 44×44px
✅ Font min 14px (body), 16px (input — zabraňuje zoom iOS)
✅ Modaly = Bottom Sheet (nikdy center modal)
✅ Navigace = Bottom Navigation Bar
✅ Formuláře = jedno pole na řádek
✅ Offline indikátor viditelný při ztrátě sítě

❌ Hover-only interakce
❌ Side-scroll tabulky bez alternativy
❌ Malá tlačítka blízko sebe
❌ Center modaly na mobilu
```

---

## Wiring — ABSOLUTNÍ

Každá funkce musí být zapojena na všech 5 vrstvách nebo není hotová:

```
1. DB migrace       → sloupec/tabulka existuje
2. TypeScript typy  → types/database.ts aktualizován
3. Supabase query   → lib/supabase/queries/*.ts
4. Server Action    → app/api/* nebo server component
5. UI komponenta    → zobrazuje a zapisuje data
```

---

## Testování & Kontrola — ABSOLUTNÍ

Po každém sprintu MUSÍŠ projít celý checklist. Sprint není hotový dokud neprojdou všechny body.

### 1. TypeScript kontrola
```bash
npx tsc --noEmit
```
Musí projít čistě, žádné errory.

### 2. Automatické testy
```bash
# Jednotkové testy (business logika, výpočty cen, kalkulačka bodů)
npx vitest run

# Pokud sprint obsahuje API endpoint nebo server action:
# test že vrací správná data a správně filtruje dle role
```

**Pravidla pro testy:**
- Každý sprint MUSÍ přidat testy pro novou funkcionalitu
- Business logika (výpočet ceny, kalkulačka bodů, četnost) = povinné unit testy
- API endpointy = povinné testy (správná data + autorizace dle role)
- Testy v `__tests__/` vedle testovaného souboru, nebo v `src/__tests__/`
- Framework: **Vitest** (nastavit v Sprint 0)
- Minimálně: happy path + edge case + chybový stav

### 3. Mobile-first kontrola
Po každém sprintu který obsahuje UI komponenty:

```bash
# Lighthouse audit na mobile
npx lighthouse http://localhost:3000 --only-categories=accessibility,best-practices --output=json --chrome-flags="--headless" --emulated-form-factor=mobile
```

**Manuální kontrola (Claude Code udělá vizuální audit kódu):**
- [ ] Žádný element nemá `width` nebo `height` pod 44px na klikatelných prvcích
- [ ] Žádný `<input>` nemá font menší než 16px
- [ ] Žádný modal není `position: fixed; top: 50%` (musí být Bottom Sheet)
- [ ] Žádná tabulka nemá horizontální scroll bez mobilní alternativy (karty nebo accordion)
- [ ] Formuláře mají jedno pole na řádek (ne side-by-side na mobilu)
- [ ] Žádné hover-only interakce (`:hover` musí mít alternativu)

### 4. Supabase kontrola
Po každém sprintu s DB migracemi:
```bash
npx supabase db push
# Ověř že migrace proběhla bez chyb

# Kontrola RLS
npx supabase db lint
```
- [ ] Každá nová tabulka má RLS zapnutou
- [ ] Každá nová tabulka má `deleted_at` sloupec
- [ ] Každá nová tabulka má trigger `set_updated_at`
- [ ] SELECT queries filtrují `WHERE deleted_at IS NULL`

### 5. Wiring kontrola
Pro každou novou funkci ověř 5 vrstev:
- [ ] DB migrace existuje a prošla
- [ ] TypeScript typy v `types/database.ts` aktualizovány
- [ ] Supabase query v `lib/supabase/queries/` existuje
- [ ] Server Action / API route existuje
- [ ] UI komponenta zobrazuje a zapisuje data

### 6. Build kontrola
```bash
npm run build
```
Musí projít bez warningů. Pokud jsou warningy, oprav je.

---

## Autonomní režim

Pracuješ plně autonomně. Po každém sprintu projdi celý checklist z "Testování & Kontrola".

Zastav se a zeptej se **pouze pokud:**
- Byznys logika není jednoznačná
- Dvě architektonické volby s různými trade-offs
- Potřeba nových externích přístupů

---

## Struktura

```
ddd-system/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # bottom nav, auth guard, role switch
│   │   │   ├── page.tsx             # dashboard (role-specific)
│   │   │   ├── klienti/
│   │   │   ├── objekty/
│   │   │   ├── zakazky/
│   │   │   ├── kalendar/
│   │   │   ├── protokoly/
│   │   │   ├── pripravky/
│   │   │   ├── faktury/
│   │   │   ├── cenik/
│   │   │   ├── uzivatele/
│   │   │   └── nastaveni/
│   │   ├── (portal)/               # klientský portál (budoucí)
│   │   └── api/
│   ├── components/
│   │   ├── ui/                      # shadcn
│   │   ├── layout/                  # BottomNav, TopBar, BottomSheet, RoleSwitch
│   │   └── modules/
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── supabase/server.ts
│   │   ├── supabase/queries/
│   │   ├── fakturoid/
│   │   ├── ares/
│   │   ├── ai/
│   │   └── utils/
│   └── types/database.ts
├── public/
│   └── logo.png
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── CLAUDE.md
├── FAZOVANI.md
└── .env.local
```

---

## Environment

```bash
# .env.local — NIKDY NECOMMITUJ
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
FAKTUROID_API_KEY=
FAKTUROID_SLUG=ahelpgroup
RESEND_API_KEY=
```

Všechny env proměnné musí být nastaveny i ve Vercel Project Settings.

> Aktuální sprint viz **FAZOVANI.md**
