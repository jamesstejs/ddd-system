# FAZOVANI.md — Plán vývoje DDD Systém (Deraplus)

> Tento soubor říká Claude Code co je aktuální sprint a co je hotové.
> Po dokončení každého sprintu zaškrtni položky a přesuň ukazatel.
> Každý sprint = jeden Claude Code session. Nepřeskakuj.

## PRAVIDLO: Každý sprint MUSÍ končit kontrolním blokem (viz CLAUDE.md sekce "Testování & Kontrola")

Po implementaci vždy:
1. npx tsc --noEmit (TypeScript)
2. npx vitest run (Jednotkové testy business logiky)
3. npm run build (Build musí projít bez chyb)
4. Mobile audit kódu (Vizuální a strukturální kontrola mobilního zobrazení)
5. Supabase lint (Kontrola RLS a migrací)
6. Wiring kontrola (5 vrstev: DB, Typy, Query, Action, UI)
7. npx playwright test (E2E testy — automatické proklikání flow za super_admin, admin, technik, klient)
8. AI REVIEW: Vykonej příkaz níže ↓

**Příkaz pro Claude Code po dokončení bodů 1-7:**
"Claude, zkontroluj logy z `playwright test` a `vitest`. Pokud testy odhalily bugy nebo chybové stavy, autonomně je oprav a testy spusť znovu, dokud neprojdou. Následně proveď hloubkovou revizi kódu UI/UX u komponent z tohoto sprintu: zkontroluj tap targety, čitelnost, flow formulářů a navrhni případná vylepšení pro lepší uživatelský zážitek na mobilu i desktopu. Pokud najdeš prostor pro zlepšení, rovnou ho aplikuj."

---

## Aktuální sprint: SPRINT 12

---

## Sprint 0 — Kostra projektu + deploy
**Cíl:** Prázdná aplikace běží na Vercelu, auth funguje, testovací infra připravená

- [ ] Next.js projekt (`--typescript --tailwind --app --src-dir`)
- [ ] shadcn/ui init (New York theme, slate)
- [ ] **Vitest setup** (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`) + `vitest.config.ts`
- [ ] **Playwright setup** (`npm install -D @playwright/test`) + `playwright.config.ts` (mobilní viewport 375×812 jako default)
- [ ] Supabase init + link na projekt
- [ ] Povolit extension `moddatetime` v první migraci
- [ ] DB: tabulka `profiles` (id, role enum[], jmeno, prijmeni, email, telefon, aktivni_role, koeficient_rychlosti default 1.0, created_at, updated_at, deleted_at)
- [ ] Auth: Supabase Auth (email+heslo), trigger na vytvoření profilu po registraci
- [ ] Reset hesla (Supabase Auth built-in)
- [ ] Deploy na Vercel + env proměnné
- [ ] **Test:** auth flow unit test (login, logout, role check)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build`

---

## Sprint 1 — Layout + navigace + přepínání rolí
**Cíl:** Aplikace má kostru UI, rozlišuje role

- [ ] Bottom Navigation Bar (Dashboard, Klienti, Zakázky, Kalendář, Více)
- [ ] TopBar s názvem stránky + role switch toggle (pokud uživatel má víc rolí) + user menu
- [ ] BottomSheet komponenta (univerzální, reusable)
- [ ] Middleware: ochrana routes dle aktivní role
- [ ] Dashboard stránka (placeholder karty — obsah dle role)
- [ ] Stránka "Více" (profil, nastavení, odhlásit)
- [ ] Admin: stránka správy uživatelů (CRUD — vytváření účtů)
- [ ] **Testy:** middleware blokuje neoprávněný přístup, role switch mění UI, BottomSheet renderuje správně
- [ ] **Mobile audit:** BottomNav tap targety ≥44px, žádný center modal, font ≥14px
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 2 — Klienti: DB + seznam
**Cíl:** Tabulka klientů v DB, seznam na frontendu

- [ ] DB: `klienti` (typ: firma/fyzicka_osoba, nazev, jmeno, prijmeni, ico, dic, email, telefon, adresa, poznamka, dph_sazba default 21, individualni_sleva_procent default 0, platba_predem boolean default false, created_at, updated_at, deleted_at)
- [ ] DB: `kontaktni_osoby` (klient_id, jmeno, funkce, telefon, email, poznamka, je_primarni boolean)
- [ ] RLS policy: admin/super_admin vidí vše, technik vidí jen přiřazené
- [ ] TypeScript typy
- [ ] UI: seznam klientů (vyhledávání, filtr firma/fyzická, pagination)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 3 — Klienti: CRUD + ARES
**Cíl:** Plný CRUD klientů, kontaktní osoby, ARES

- [ ] UI: formulář přidání klienta (Bottom Sheet)
- [ ] UI: editace klienta (Bottom Sheet)
- [ ] Soft delete klienta (potvrzení dialogem)
- [ ] ARES API: lib/ares/ — IČO → prefill název, adresa, DIČ
- [ ] Kontrola duplicity dle IČO (varování při vytváření)
- [ ] CRUD kontaktních osob (v rámci detailu klienta)
- [ ] Detail klienta (info + kontaktní osoby)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 4 — Objekty + plánky
**Cíl:** Klient má objekty, každý s typem, plochou a plánkem

- [ ] DB: `objekty` (klient_id, nazev, adresa, plocha_m2, typ_objektu enum, poznamka, planek_url nullable, created_at, updated_at, deleted_at)
- [ ] DB: `okruhy` (objekt_id, nazev — např. "Kuchyně", "Sklad", "Venkovní")
- [ ] Typy objektů enum: gastro | sklad_nevyzivocisna | sklad_zivocisna | domacnost | kancelar | skola | hotel | nemocnice | ubytovna | vyrobni_hala | jiny
- [ ] RLS policy
- [ ] CRUD objektu (Bottom Sheet, v detailu klienta)
- [ ] Upload plánku objektu (Supabase Storage bucket `planky`)
- [ ] CRUD okruhů (v detailu objektu)
- [ ] Detail klienta: záložka/sekce s objekty
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 5 — Škůdci: DB + seed
**Cíl:** Kompletní seznam škůdců v DB ze CSV

- [ ] DB: `skudci` (nazev, latinsky_nazev, typ: hlodavec/lezouci_hmyz/letajici_hmyz/ostatni, kategorie, doporucena_cetnost_dny, pocet_zasahu text, poznamka, created_at, updated_at, deleted_at)
- [ ] DB: `skudce_pripravky` (skudce_id, pripravek_nazev, typ_prostoru: potravinarsky/domacnost/prumysl/venkovni/zemedelsky/chov_zvirat) — seed z CSV
- [ ] Seed.sql: všichni škůdci z nahraného CSV "Seznam škůdců"
- [ ] UI: admin seznam škůdců (read-only, filtr dle typu)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 6 — Kalkulačka bodů
**Cíl:** Systém doporučuje počty monitorovacích bodů

- [ ] DB: `sablony_bodu` (typ_objektu, typ_zasahu, rozsah_m2_od, rozsah_m2_do, bod_s_mys, bod_l_potkan, zivolovna, letajici, lezouci, vzorec_nad_max jsonb)
- [ ] Seed data: Gastro + Sklad neživočišný + Sklad živočišný + Domácnost × deratizace + dezinsekce + vnější deratizace
- [ ] Funkce `vypocetBodu(typ_objektu, plocha_m2, typ_zasahu)` → doporučené počty
- [ ] UI: na detailu objektu "Spočítat body" → zobrazí doporučení
- [ ] Admin CRUD pro editaci tabulek
- [ ] **Testy:** unit testy pro `vypocetBodu` — Gastro 50m² = 2 myš/1 potkan/1 živolovná, Gastro 3500m² = vzorec, edge cases (0 m², null)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 7 — Ceník: DB + seed
**Cíl:** Kompletní ceníky v DB

- [ ] DB: `cenik_obecne` (nazev: vyjezd/marny_vyjezd/doprava_km/vikend_priplatek/nocni_priplatek/minimalni_cena, hodnota, jednotka, poznamka)
- [ ] DB: `cenik_postriky` (kategorie: stenice_blechy/moli_rybenky/preventivni, plocha_od, plocha_do, cena)
- [ ] DB: `cenik_gely` (kategorie: rusi_svabi_1/rusi_svabi_2/mravenci_1, bytu_od, bytu_do, cena)
- [ ] DB: `cenik_specialni` (nazev, cena_od, cena_do)
- [ ] DB: `cenik_deratizace` (nazev, cena_za_kus)
- [ ] DB: `cenik_dezinfekce` (typ: postrik/aerosol, plocha_od, plocha_do, cena_za_m)
- [ ] Seed: vše z CSV ceníku
- [ ] UI: admin sekce "Ceník" — editace všech tabulek
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 8 — Zakázky: DB + CRUD
**Cíl:** Vytvoření zakázky na objektu

- [ ] DB: `zakazky` (objekt_id, typ: jednorazova/smluvni, status: nova/aktivni/pozastavena/ukoncena, typy_zasahu jsonb, skudci jsonb, cetnost_dny int, pocet_navstev_rocne int, platnost_do date nullable, platba_predem boolean, poznamka, created_at, updated_at, deleted_at)
- [ ] RLS policy
- [ ] UI: vytvoření zakázky (výběr klienta → objekt → typy zásahů → škůdci)
- [ ] Automatické doporučení bodů z kalkulačky
- [ ] Automatické doporučení četnosti dle škůdce
- [ ] Seznam zakázek (filtr: status, klient, technik)
- [ ] Detail zakázky
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 9 — Zakázky: cenová kalkulace
**Cíl:** Systém automaticky vypočítá cenu zakázky

- [ ] DB: `zakazka_polozky` (zakazka_id, nazev, pocet, cena_za_kus, cena_celkem)
- [ ] Logika: jednorázová → lookup v ceníku dle škůdce+plocha+byty | smluvní → výjezd + km + body × sazba + práce
- [ ] UI: na detailu zakázky "Cenová kalkulace" (auto, editovatelná)
- [ ] Sleva: admin do 50%, technik do 10% (% nebo Kč)
- [ ] Individuální sleva klienta se automaticky aplikuje
- [ ] DPH výpočet dle klienta
- [ ] Kontrola minimální ceny (2 500 Kč)
- [ ] **Testy:** cenová kalkulace — jednorázová (štěnice 50m² = 2958+690), smluvní (8 bodů potkan × 170 + výjezd + km), sleva 10% admin, sleva přes minimum (musí vrátit 2500), DPH 21% vs klient sazba, víkendový příplatek +10%
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 10 — Dostupnost techniků
**Cíl:** Technici zadávají svou pracovní dobu, systém je upozorňuje

- [ ] DB: `dostupnost` (technik_id, datum, cas_od, cas_do, poznamka, created_at, updated_at, deleted_at)
- [ ] UI: technik — "Moje dostupnost" (kalendářní view, kliká bloky 14–60 dní předem)
- [ ] Validace: technik musí mít vyplněnou dostupnost dle svého úvazku
- [ ] Dashboard widget (technik): "Vyplň dostupnost" (pokud chybí pro příští X dní)
- [ ] Dashboard widget (admin): "Technici bez směn" (kdo nemá vyplněno dle dohody)
- [ ] Notifikace/upozornění technikovi pokud nemá vyplněno
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 11 — Kalendář: admin view
**Cíl:** Admin vidí kalendář se všemi techniky

- [x] DB: `zasahy` (zakazka_id, technik_id, datum, cas_od, cas_do, status: naplanovano/potvrzeny/probiha/hotovo/zruseno, odhadovana_delka_min, poznamka, created_at, updated_at, deleted_at)
- [x] RLS policy
- [x] UI: kalendář měsíc/týden/den (admin — všichni technici, color-coded)
- [x] Zobrazení dostupnosti techniků v kalendáři (šedé = nedostupný)
- [x] Přiřazení zásahu: Bottom Sheet (zakázka + technik + datum + čas)
- [x] Odhad délky zásahu: dle typu + počtu bodů × koeficient technika
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 12 — Kalendář: technik "Můj den"
**Cíl:** Technik vidí svůj denní plán

- [x] UI: mobilní "Můj den" (chronologický seznam dnešních zásahů)
- [x] Karta zásahu: klient, adresa, typ, čas, počet bodů, odhadovaná délka
- [x] Navigační odkaz (Google Maps) na adresu objektu
- [x] Změna statusu: naplánováno → probíhá → hotovo
- [x] Kontakt na klienta (klik → volání, email)
- [x] Zobrazení kontaktní osoby na místě (jméno, telefon)
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 13 — Odhad přejezdů ✅
**Cíl:** Systém počítá čas na přejezd mezi zásahy

- [x] Integrace: vzdálenost mezi dvěma adresami (Haversine + koeficient 1.4× + Nominatim geocoding)
- [x] DB migrace: lat/lng sloupce na objekty tabulce
- [x] Na kartě zásahu v "Můj den": zobrazit odhadovaný čas přejezdu z předchozího (🚗 indikátor)
- [x] V admin kalendáři: vizuální indikace kolize (amber ring + "⚠ Kolize" badge)
- [x] Auto-geocoding objektů bez souřadnic (Nominatim OSM, rate-limited)
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` (294 testů) + `npm run build` + mobile audit + wiring check

---

## Sprint 14 — Další termín po zásahu
**Cíl:** Technik po zásahu domluvý nebo systém připomíná

- [ ] DB: `pripominky_terminu` (zakazka_id, typ: technik_nenastavil/klient_nevybral, stav: aktivni/vyreseno, posledni_upozorneni_at, pocet_upozorneni int, max_upozorneni int default 10, created_at)
- [ ] UI: po dokončení zásahu (status=hotovo) → Bottom Sheet "Další termín" (datum + čas)
- [ ] Pokud technik vyplní → nový zásah v kalendáři (status: potvrzený)
- [ ] Pokud nevyplní → vytvoří se připomínka pro admina
- [ ] Dashboard admin: "Nedomluvené termíny" widget
- [ ] Dashboard technik: "Klienti — domluvit termín" widget
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 15 — Přípravky: DB + CRUD
**Cíl:** Databáze přípravků ze CSV

- [ ] DB: `pripravky` (nazev, ucinna_latka, protilatka, typ: rodenticid/insekticid/biocid, forma, baleni, cilovy_skudce jsonb, omezeni_prostor jsonb, aktivni boolean, poznamka, created_at, updated_at, deleted_at)
- [ ] Seed: přípravky z nahraného CSV (cca 30+)
- [ ] RLS policy
- [ ] UI: admin seznam přípravků (search, filtr dle typu)
- [ ] UI: CRUD přípravku (Bottom Sheet)
- [ ] Vazba: přípravek × škůdce × typ prostoru (z CSV seed)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 16 — Bezpečnostní listy + poučení
**Cíl:** Upload BL, šablony poučení per škůdce

- [ ] DB: `bezpecnostni_listy` (pripravek_id, soubor_url, nazev_souboru, nahrano_datum)
- [ ] Supabase Storage bucket: `bezpecnostni-listy`
- [ ] UI: na detailu přípravku upload PDF + zobrazení BL
- [ ] DB: `sablony_pouceni` (skudce_id nullable, typ_zasahu nullable, nazev, obsah text, aktivni boolean)
- [ ] Seed: default šablony poučení per typ škůdce (admin dodá texty později, seed = placeholder)
- [ ] UI: admin CRUD šablon poučení (textarea + preview)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 17 — Protokoly: DB schéma
**Cíl:** Kompletní DB struktura pro všechny typy protokolů

- [ ] DB: `protokoly` (zasah_id, technik_id, status: rozpracovany/ke_schvaleni/schvaleny/odeslany, zodpovedny_technik text default 'Pavel Horák', cislo_protokolu text, podpis_klient_url nullable, poznamka, ai_hodnoceni text nullable, admin_komentar text nullable, created_at, updated_at, deleted_at)
- [ ] DB: `protokol_deratizacni_body` (protokol_id, cislo_bodu text, okruh_id nullable, typ_stanicky enum, pripravek_id nullable, pozer_procent enum 0/25/50/75/100, stav_stanicky enum)
- [ ] DB: `protokol_dezinsekci_body` (protokol_id, cislo_bodu text, okruh_id nullable, typ_lapace enum, druh_hmyzu text, pocet int)
- [ ] DB: `protokol_postrik` (protokol_id, skudce text, plocha_m2, typ_zakroku text, poznamka)
- [ ] DB: `protokol_postrik_pripravky` (postrik_id, pripravek_id, spotreba text, koncentrace_procent)
- [ ] DB: `protokol_fotky` (protokol_id, soubor_url, popis)
- [ ] Generování čísla protokolu: P-[KLIENT_KOD]-[SEKVENCE] (sekvenční per klient)
- [ ] RLS policies
- [ ] TypeScript typy
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 18 — Protokoly: deratizační formulář
**Cíl:** Technik vyplní deratizační kontrolu na mobilu

- [ ] UI: zahájení protokolu z "Můj den" karty (klik → nový protokol)
- [ ] **Předvyplnění bodů z předchozího protokolu** (pokud existuje — typy staniček, rozložení)
- [ ] Formulář: deratizační bod — po jednom (mobilní wizard)
- [ ] Každý bod: číslo (prefix+číslo), okruh, typ staničky, přípravek, požer (slider/select), stav
- [ ] Možnost přidat / odebrat bod
- [ ] Průměrný požer — automatický výpočet
- [ ] Uložení jako rozpracovaný
- [ ] **Testy:** předvyplnění z minulého protokolu, průměrný požer (8 bodů: 7×100% + 1×0% = 87.5%), přidání/odebrání bodu, uložení rozpracovaného
- [ ] **Mobile audit:** formulář po jednom bodu (ne seznam), slider/select ≥44px, klávesnice nepřekrývá pole
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 19 — Protokoly: dezinsekční formulář + postřik
**Cíl:** Technik vyplní dezinsekci a postřik

- [ ] UI: dezinsekční bod (číslo, okruh, typ lapače, hmyz ze seznamu, počet)
- [ ] Předvyplnění z předchozího protokolu
- [ ] UI: postřik (škůdce, plocha, typ zákroku: postřik/ULV/popraš/gel, přípravky, spotřeba, koncentrace)
- [ ] Výběr přípravku: filtrovaný dle škůdce + typu prostoru objektu
- [ ] Účinná látka + protilátka se zobrazí automaticky
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 20 — Protokoly: fotky + podpis + odeslání
**Cíl:** Kompletace protokolu na místě

- [ ] Supabase Storage bucket: `protokol-fotky`
- [ ] UI: fotodokumentace (capture kamerou nebo upload)
- [ ] UI: podpis klienta (canvas, touch-friendly → PNG do Storage)
- [ ] Poznámka k protokolu (textarea)
- [ ] Statistiky: automatické porovnání s předchozím protokolem (požer trend, počty hmyzu)
- [ ] Věta o účinnosti: výběr z template (admin definuje texty)
- [ ] Tlačítko "Odeslat ke schválení" → status = ke_schvaleni
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 21 — Protokoly: admin schválení + editace
**Cíl:** Admin kontroluje, edituje, schvaluje

- [ ] UI: admin seznam protokolů (filtr: ke_schvaleni / schvaleny / odeslany)
- [ ] UI: detail protokolu — zobrazení všech dat, fotek, podpisu, statistik
- [ ] Admin může **editovat** libovolné pole protokolu
- [ ] Tlačítko "Schválit" → status = schvaleny
- [ ] Tlačítko "Vrátit" + komentář → status = rozpracovany (technik vidí komentář)
- [ ] Dashboard: "Protokoly ke schválení" widget
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 22 — PDF: dezinsekční protokol
**Cíl:** PDF pro postřikové protokoly (dle vzoru)

- [ ] PDF šablona — dezinsekční: hlavička s logem "DEZINSEKČNÍ PROTOKOL", dodavatel/odběratel, další zásah (zelený text), škůdce, přípravek, účinná látka, protilátka, zákrok, množství+koncentrace, poznámka, BL odkazy, patička
- [ ] Generování: API route (html → PDF)
- [ ] PDF uložení: Supabase Storage bucket `protokoly-pdf`
- [ ] UI: na detailu protokolu "Náhled PDF" / "Stáhnout"
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 23 — PDF: deratizační protokol
**Cíl:** PDF pro deratizační protokoly (dle vzoru)

- [ ] PDF šablona — deratizační: hlavička "DERATIZAČNÍ PROTOKOL", dodavatel/odběratel, rodenticid+účinná látka+protilátka+počet staniček+průměrný požer, další kontrola (zelený text), **mřížka 120 polí** (č. | požer — aktivní body vyplněné), BL seznam, patička
- [ ] Podpora pro dezinsekční body (pokud protokol má obojí)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 24 — Auto-email: protokol + BL
**Cíl:** Po schválení se PDF + BL pošlou klientovi

- [ ] Email služba: Resend (branded — logo, barvy Deraplus)
- [ ] Po schválení protokolu → email klientovi: PDF protokolu + BL přípravků (přílohy)
- [ ] DB: `email_log` (prijemce, predmet, typ, stav, odeslano_at)
- [ ] UI: na detailu protokolu stav odeslání
- [ ] Status: schvaleny → odeslany
- [ ] Pro klienty bez emailu: placeholder pro SMS s odkazem (budoucí)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 25 — Email před zásahem: BL + poučení
**Cíl:** Klient dostane BL + poučení při potvrzení termínu

- [ ] Trigger: při zapsání/potvrzení zásahu v kalendáři → email klientovi
- [ ] Obsah: bezpečnostní listy přípravků (z zakázky) + text poučení (dle škůdce)
- [ ] DB: log do `email_log`
- [ ] Branded email template
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 26 — AI: doporučení přípravků + hodnocení
**Cíl:** AI pomáhá s výběrem přípravků a komentáři

- [ ] lib/ai/ — Anthropic API client
- [ ] AI endpoint: doporučení přípravků dle škůdce + typ prostoru → seřazený seznam
- [ ] UI: v postřikovém formuláři "AI doporučení" (předvyplní, technik potvrdí/změní)
- [ ] AI endpoint: analýza trendů per objekt (požery v čase, počty hmyzu) → komentář
- [ ] UI: na detailu protokolu AI komentář (admin vidí před schválením, může editovat)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 27 — Fakturoid: napojení + automatická faktura
**Cíl:** Faktura ve Fakturoidu po schváleném protokolu

- [ ] lib/fakturoid/ — API v3 client (OAuth 2 Client Credentials, slug: deratizacelevne)
- [ ] Sync klient → Fakturoid kontakt (vytvořit pokud neexistuje, dle IČO)
- [ ] Po schválení protokolu → automatická faktura:
  - Položky z `zakazka_polozky`
  - Sleva (zakázky + individuální klienta)
  - DPH dle klienta
  - Splatnost 14 dní
- [ ] DB: `faktury` (zakazka_id, protokol_id, fakturoid_id, cislo, castka, stav: vytvorena/odeslana/uhrazena/po_splatnosti, created_at)
- [ ] Admin: úprava faktury před odesláním
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 28 — Proforma faktura + QR platba on-site
**Cíl:** Technik na místě ukáže QR k platbě

- [ ] U zakázek s "platba_predem" → technik vidí tlačítko "Proforma"
- [ ] Generování proformy přes Fakturoid API
- [ ] Zobrazení QR kódu pro bankovní platbu (z Fakturoidu)
- [ ] Po spárování platby (Fakturoid polling/webhook) → status aktualizace
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 29 — Faktury: seznam + platby
**Cíl:** Admin vidí faktury, párování plateb

- [ ] UI: seznam faktur (filtr: uhrazeno/neuhrazeno/po_splatnosti)
- [ ] UI: detail faktury (odkaz na Fakturoid, položky, stav)
- [ ] Polling: sync stavu plateb z Fakturoidu (banka napojená)
- [ ] Dashboard: "Neuhrazené faktury" widget (počet + suma)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 30 — Bonusový systém
**Cíl:** Prémie pro techniky a adminy

- [ ] DB: `bonusy` (uzivatel_id, typ: zakázka/opakovaná_zakázka/fixní, zakazka_id nullable, castka, obdobi_mesic, stav: pending/proplaceno, created_at)
- [ ] Automatický bonus technikovi za dokončenou zakázku (default 100 Kč, nastavitelné)
- [ ] Bonus za domluvenou opakovanou zakázku (pokud klient zaplatí)
- [ ] Admin fixní odměna (super_admin nastavuje)
- [ ] UI technik: "Moje prémie" (seznam za období, celková suma)
- [ ] UI admin: "Moje odměny"
- [ ] Super_admin: nastavení sazeb bonusů
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 31 — Dashboard: reálná data
**Cíl:** Dashboard zobrazuje reálná data dle role

- [ ] Admin: protokoly ke schválení, k odeslání, nedomluvené termíny, technici bez směn, věci ve zpoždění, neuhrazené faktury, vlastní odměny
- [ ] Technik: "Můj den", klienti k domluvení, vyplnit dostupnost, moje prémie
- [ ] Super_admin: vše co admin + přehled odměn všech
- [ ] Quick actions (tlačítka pro nejčastější akce)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 32 — Klientský portál: základ
**Cíl:** Klient se přihlásí a vidí dokumenty

- [ ] Oddělená sekce `/portal` s vlastním layoutem
- [ ] Klientský login (Supabase Auth, role=klient)
- [ ] Klient vidí: své protokoly (PDF ke stažení)
- [ ] Klient vidí: své faktury (stav, PDF z Fakturoidu)
- [ ] Klient vidí: nadcházející termíny
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 33 — Klientský portál: výběr termínu
**Cíl:** Klient si sám vybere termín online

- [ ] UI: klient vidí volné sloty (jen pokud technik má vypsanou dostupnost, max 1 měsíc)
- [ ] Sloty filtrované dle lokace (správný technik pro region)
- [ ] Výběr → zásah v kalendáři (status: potvrzený klientem)
- [ ] Notifikace: technik + admin email o novém termínu
- [ ] Opakovaný email/SMS klientovi pokud nevybral (1. ihned, pak co 3 dny, max 10×)
- [ ] Systém čeká na dostupnost technika → pak posílá klientovi
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 34 — Statistiky + grafy
**Cíl:** Trendy, grafy, export

- [ ] Graf: vývoj infestace per objekt (požery v čase, počty hmyzu)
- [ ] Graf: počet zásahů per technik per měsíc
- [ ] Graf: tržby per měsíc (z Fakturoidu)
- [ ] AI komentář k trendům per objekt
- [ ] Export: CSV (klienti, zakázky, faktury, protokoly)
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 35 — Import dat
**Cíl:** Import existujících dat do systému

- [ ] Import klientů z CSV/Excel
- [ ] Import objektů
- [ ] Import kontaktů z Fakturoidu (sync existujících)
- [ ] Validace + deduplikace při importu
- [ ] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Budoucí sprinty (backlog)

- Mapa/trasa techniků (optimalizace denního plánu)
- SMS provider integrace (až vybrán)
- Offline mode (PWA + queue pro protokoly bez signálu)
- Multi-tenant (až bude potřeba)
- ISOH hlášení (odpad z DDD činností)
- Mobilní app (React Native nebo PWA)
- Pokročilá AI: automatická četnost dle historie požerů
- Datová schránka integrace
