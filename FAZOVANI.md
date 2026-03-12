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

## Aktuální sprint: SPRINT 34

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

- [x] DB: `pripominky_terminu` (zakazka_id, typ: technik_nenastavil/klient_nevybral, stav: aktivni/vyreseno, posledni_upozorneni_at, pocet_upozorneni int, max_upozorneni int default 10, created_at)
- [x] UI: po dokončení zásahu (status=hotovo) → Bottom Sheet "Další termín" (datum + čas)
- [x] Pokud technik vyplní → nový zásah v kalendáři (status: potvrzený)
- [x] Pokud nevyplní → vytvoří se připomínka pro admina
- [x] Dashboard admin: "Nedomluvené termíny" widget
- [x] Dashboard technik: "Klienti — domluvit termín" widget
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 15 — Přípravky: DB + CRUD
**Cíl:** Databáze přípravků ze CSV

- [x] DB: `pripravky` (nazev, ucinna_latka, protilatka, typ: rodenticid/insekticid/biocid/dezinfekce/repelent, forma, baleni, cilovy_skudce jsonb, omezeni_prostor jsonb, aktivni boolean, poznamka, created_at, updated_at, deleted_at)
- [x] Seed: přípravky z nahraného CSV (30 přípravků — rodenticidy, insekticidy, dezinfekce, repelenty, biocidy)
- [x] RLS policy (all authenticated SELECT, admin INSERT/UPDATE/DELETE)
- [x] UI: admin seznam přípravků (search, filtr dle typu, filtr aktivní/neaktivní)
- [x] UI: CRUD přípravku (Bottom Sheet) + navigace z Více
- [x] Vazba: přípravek × škůdce × typ prostoru (z seed — cilovy_skudce + omezeni_prostor JSONB)
- [x] Testy: 7 unit (queries) + 28 component (PripravkyList) = 35 nových testů
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 338/338 ✅ + `npm run build` ✅ + mobile audit ✅ + wiring check ✅

---

## Sprint 16 — Bezpečnostní listy + poučení
**Cíl:** Upload BL, šablony poučení per škůdce

- [x] DB: `bezpecnostni_listy` (pripravek_id, soubor_url, nazev_souboru, nahrano_datum)
- [x] Supabase Storage bucket: `bezpecnostni-listy`
- [x] UI: na detailu přípravku upload PDF + zobrazení BL
- [x] DB: `sablony_pouceni` (skudce_id nullable, typ_zasahu nullable, nazev, obsah text, aktivni boolean)
- [x] Seed: default šablony poučení per typ škůdce (admin dodá texty později, seed = placeholder)
- [x] UI: admin CRUD šablon poučení (textarea + preview)
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 17 — Protokoly: DB schéma ✅
**Cíl:** Kompletní DB struktura pro všechny typy protokolů

- [x] DB: `protokoly` (zasah_id, technik_id, status: rozpracovany/ke_schvaleni/schvaleny/odeslany, zodpovedny_technik text default 'Pavel Horák', cislo_protokolu text, podpis_klient_url nullable, poznamka, ai_hodnoceni text nullable, admin_komentar text nullable, created_at, updated_at, deleted_at)
- [x] DB: `protokol_deratizacni_body` (protokol_id, cislo_bodu text, okruh_id nullable, typ_stanicky enum, pripravek_id nullable, pozer_procent enum 0/25/50/75/100, stav_stanicky enum)
- [x] DB: `protokol_dezinsekci_body` (protokol_id, cislo_bodu text, okruh_id nullable, typ_lapace enum, druh_hmyzu text, pocet int)
- [x] DB: `protokol_postrik` (protokol_id, skudce text, plocha_m2, typ_zakroku text, poznamka)
- [x] DB: `protokol_postrik_pripravky` (postrik_id, pripravek_id, spotreba text, koncentrace_procent)
- [x] DB: `protokol_fotky` (protokol_id, soubor_url, popis)
- [x] Generování čísla protokolu: P-[KLIENT_KOD]-[SEKVENCE] (sekvenční per klient) — DB funkce `generate_cislo_protokolu()`
- [x] RLS policies (admin full CRUD, technik own via EXISTS subquery)
- [x] TypeScript typy (regenerated)
- [x] Klient `kod` sloupec (3 písmena + 3 číslice, trigger + backfill)
- [x] Storage bucket `protokol-fotky` (20MB, jpeg/png/webp/heic)
- [x] Queries: 20 functions v `src/lib/supabase/queries/protokoly.ts`
- [x] Testy: 18 test suites v `protokoly.test.ts` (384/384 celkem)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 384/384 ✅ + `npm run build` ✅ + wiring check ✅ (no UI this sprint)

---

## Sprint 18 — Protokoly: deratizační formulář ✅
**Cíl:** Technik vyplní deratizační kontrolu na mobilu

- [x] UI: zahájení protokolu z "Můj den" karty (klik → nový protokol) — tlačítko "Vyplnit protokol" na kartě zásahu se statusem "hotovo"
- [x] **Předvyplnění bodů z předchozího protokolu** (pokud existuje — typy staniček, rozložení) — `getPrefilledBodyAction` + `prefillBodyFromPrevious()`
- [x] Formulář: deratizační bod — po jednom (mobilní wizard) — `DeratBodForm.tsx` + `DeratFormView.tsx` wizard orchestrator
- [x] Každý bod: číslo (prefix+číslo), okruh, typ staničky, přípravek, požer (5 tlačítek 0/25/50/75/100%), stav
- [x] Možnost přidat / odebrat bod — přidání s auto-prefix, smazání s inline potvrzením
- [x] Průměrný požer — automatický výpočet (`prumernyPozer()` s barevným badge)
- [x] Uložení jako rozpracovaný — `saveDeratBodyAction` (batch create/update/delete)
- [x] **Testy:** 41 nových testů (30 protokolUtils + 2 query + 9 component) — celkem 434/434
- [x] **Mobile audit:** tap targets ≥44px, inputs text-base (16px), žádný center modal, aktivní stavy pro touch
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 434/434 ✅ + `npm run build` ✅ + mobile audit ✅ + wiring check ✅

---

## Sprint 19 — Protokoly: dezinsekční formulář + postřik ✅
**Cíl:** Technik vyplní dezinsekci a postřik

- [x] UI: dezinsekční bod (číslo, okruh, typ lapače, hmyz ze seznamu filtrovaný dle lapače, počet) — `DezinsBodForm.tsx` + `DezinsBodSummary.tsx` + `DezinsFormView.tsx` wizard
- [x] Předvyplnění z předchozího protokolu — `getPrefilledDezinsBodyAction` + `prefillDezinsBodyFromPrevious()`
- [x] UI: postřik (škůdce, plocha, typ zákroku: postřik/ULV/popraš/gel, přípravky, spotřeba, koncentrace) — `PostrikFormView.tsx`
- [x] Výběr přípravku: filtrovaný dle škůdce + typu prostoru objektu — `filterPripravkyForPostrik()` s `mapObjektTypToTypProstoru()`
- [x] Účinná látka + protilátka se zobrazí automaticky po výběru přípravku
- [x] Tab-based navigace: `ProtokolFormView.tsx` wrapper se shadcn Tabs (Deratizace/Dezinsekce/Postřik dle `typy_zasahu`)
- [x] Refaktor `DeratFormView.tsx` (extrakce header/poznámka do sdíleného wrapperu)
- [x] Server actions: `saveDezinsBodyAction` + `savePostrikAction` + `getPrefilledDezinsBodyAction`
- [x] Utility labels: `TYP_LAPACE_LABELS`, `TYP_ZAKROKU_LABELS`
- [x] Testy: 30 nových (15 protokolUtils + 6 DezinsFormView + 6 PostrikFormView + 3 updated DeratFormView) — celkem 464/464
- [x] E2E: 70 Playwright testů (69 passed + 1 skipped, 0 failed, ~48s) — auth-setup pattern eliminuje rate-limiting
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 464/464 ✅ + `npm run build` ✅ + `npx playwright test` 69+1 ✅ + mobile audit ✅ + wiring check ✅ + AI review ✅

---

## Sprint 20 — Protokoly: fotky + podpis + odeslání ✅
**Cíl:** Kompletace protokolu na místě

- [x] Supabase Storage bucket: `protokol-fotky`
- [x] UI: fotodokumentace (capture kamerou nebo upload)
- [x] UI: podpis klienta (canvas, touch-friendly → PNG do Storage)
- [x] Poznámka k protokolu (textarea)
- [x] Statistiky: automatické porovnání s předchozím protokolem (požer trend, počty hmyzu)
- [x] Věta o účinnosti: výběr z template (admin definuje texty)
- [x] Tlačítko "Odeslat ke schválení" → status = ke_schvaleni
- [x] Fix: protokol-fotky bucket musí být public (migrace 20260320000001)
- [x] Fix: Unicode escape sekvence v JSX textech ProtokolFormView
- [x] Fix: SelectItem tap target pod 44px → min-h-[44px]
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 506/506 ✅ + `npm run build` ✅ + `npx playwright test` 70+1 ✅ + mobile audit ✅ + wiring check ✅

---

## Sprint 21 — Protokoly: admin schválení + editace
**Cíl:** Admin kontroluje, edituje, schvaluje

- [x] UI: admin seznam protokolů (filtr: ke_schvaleni / schvaleny / odeslany / rozpracovany / vše) + vyhledávání
- [x] UI: detail protokolu — dual-role přístup (admin vidí vše, technik jen své)
- [x] Admin může **editovat** libovolné pole protokolu (toggle "Upravit" → forceEditable)
- [x] Tlačítko "Schválit" → status = schvaleny (adminApproveProtokolAction)
- [x] Tlačítko "Vrátit" + komentář min 10 znaků → status = rozpracovany (technik vidí žlutý komentář)
- [x] Dashboard: "Protokoly ke schválení" widget s reálnými daty + 3 preview
- [x] Navigace: Více → Protokoly link pro admin
- [x] requireProtokolEditor wrapper pro sdílené save akce (admin i technik)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 523/523 ✅ + `npm run build` ✅

---

## Sprint 22 — PDF: dezinsekční protokol ✅
**Cíl:** PDF pro postřikové protokoly (dle vzoru)

- [x] PDF šablona — dezinsekční: hlavička s logem "DEZINSEKČNÍ PROTOKOL", dodavatel/odběratel, další zásah (zelený text), škůdce, přípravek, účinná látka, protilátka, zákrok, množství+koncentrace, poznámka, BL odkazy, patička — `src/lib/pdf/dezinsekniProtokol.tsx` (@react-pdf/renderer)
- [x] Generování: API route `/api/protokoly/[id]/pdf` — autorizace (admin/technik), načte data z DB, renderuje PDF
- [x] PDF uložení: Supabase Storage bucket `protokoly-pdf` (migrace 20260322000000)
- [x] UI: na detailu protokolu "Náhled PDF" / "Stáhnout" — `PdfSection.tsx`, zobrazeno pro postřikové protokoly se statusem ke_schvaleni/schvaleny/odeslany
- [x] Rozšíření getProtokol query o klient ICO/DIČ/adresa pro PDF
- [x] buildDezinsekniPdfData helper pro mapping DB → PDF data
- [x] Testy: 18 nových (13 buildPdfData + 5 PdfSection component) — celkem 549/549
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 549/549 ✅ + `npm run build` ✅ + mobile audit ✅ + wiring check ✅

---

## Sprint 23 — PDF: deratizační protokol ✅
**Cíl:** PDF pro deratizační protokoly (dle vzoru)

- [x] PDF šablona — dynamický titul: "DERATIZAČNÍ PROTOKOL" (derat-only) / "DEZINSEKČNÍ PROTOKOL" (jinak)
- [x] Rodenticid summary box: přípravek, počet staniček, průměrný požer (%)
- [x] Dynamický label: "Další kontrola proběhne" (derat-only) / "Další zásah proběhne" (jinak)
- [x] Mřížka deratizačních bodů (120 polí — aktivní body vyplněné s požerem)
- [x] Dezinsekční monitoring tabulka: č. bodu, typ lapače, druh hmyzu, počet ks, okruh
- [x] `PdfDezinsBod` interface + `TYP_LAPACE_LABELS` + `buildDezinsekniPdfData` rozšíření
- [x] API route: `getProtokolDezinsBody` parallel loading + mapping
- [x] PdfSection: `hasDezinsBody` prop, dynamický subtitle pro všechny kombinace (postřik/deratizace/dezinsekce)
- [x] ProtokolFormView: předání `hasDezinsBody` do PdfSection
- [x] Testy: 20 nových (8 dezinsBody builder + 4 composition + 3 PdfSection + 5 existing updated) — celkem 569/569
- [x] Browser clickthrough: 3 taby, PdfSection, PDF content (17/17 checks pass)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 569/569 ✅ + `npm run build` ✅ + mobile audit ✅ + wiring check ✅

---

## Sprint 24 — Auto-email: protokol + BL ✅
**Cíl:** Po schválení se PDF + BL pošlou klientovi

- [x] Email služba: Resend (branded — logo, barvy Deraplus)
- [x] Po schválení protokolu → email klientovi: PDF protokolu + BL přípravků (přílohy)
- [x] DB: `email_log` (prijemce, predmet, typ, stav, odeslano_at) — migrace `20260323000000`
- [x] UI: na detailu protokolu stav odeslání (EmailStatusSection)
- [x] Status: schvaleny → odeslany (dvoustupňový flow: schválení → odeslání emailu)
- [x] Pro klienty bez emailu: disabled tlačítko + hláška o chybějícím emailu
- [x] Testy: 49 nových (resend: 5, template: 16, emailActions: 12, EmailStatusSection: 16) — celkem 695
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 695/695 ✅ + `npm run build` ✅

---

## Sprint 25 — Email před zásahem: BL + poučení
**Cíl:** Klient dostane BL + poučení při potvrzení termínu

- [x] Trigger: při zapsání/potvrzení zásahu v kalendáři → email klientovi
- [x] Obsah: bezpečnostní listy přípravků (z zakázky) + text poučení (dle škůdce)
- [x] DB: log do `email_log`
- [x] Branded email template
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` + mobile audit + wiring check

---

## Sprint 26 — AI: doporučení přípravků + hodnocení
**Cíl:** AI pomáhá s výběrem přípravků a komentáři

- [x] lib/ai/ — Anthropic API client (`client.ts`, `doporuceniPripravku.ts`, `analyzaTrendu.ts`)
- [x] AI endpoint: doporučení přípravků dle škůdce + typ prostoru → seřazený seznam
- [x] UI: v postřikovém formuláři "AI doporučení" (předvyplní, technik potvrdí/změní)
- [x] AI endpoint: analýza trendů per objekt (požery v čase, počty hmyzu) → komentář
- [x] UI: na detailu protokolu AI komentář (admin vidí před schválením, může editovat)
- [x] **Kontrola:** `npx tsc --noEmit` + `npx vitest run` (902 testů) + `npm run build` — vše čistě

---

## Sprint 27 — Fakturoid: napojení + automatická faktura
**Cíl:** Faktura ve Fakturoidu po schváleném protokolu

- [x] lib/fakturoid/ — API v3 client (OAuth 2 Client Credentials, slug: deratizacelevne)
- [x] Sync klient → Fakturoid kontakt (vytvořit pokud neexistuje, dle IČO)
- [x] Po schválení protokolu → automatická faktura:
  - Položky z `zakazka_polozky`
  - Sleva (zakázky + individuální klienta)
  - DPH dle klienta
  - Splatnost 14 dní
- [x] DB: `faktury` (zakazka_id, protokol_id, fakturoid_id, cislo, castka, stav: vytvorena/odeslana/uhrazena/po_splatnosti, created_at)
- [x] Admin: úprava faktury před odesláním (odkaz na Fakturoid) + odeslání klientovi
- [x] UI: admin seznam faktur (filtr dle stavu, search) + detail s položkami
- [x] Navigace: Více → Faktury link
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` 944/944 ✅ + `npm run build` ✅

---

## Sprint 28 — Proforma faktura + QR platba on-site ✅
**Cíl:** Technik na místě ukáže QR k platbě

- [x] U zakázek s "platba_predem" → technik vidí tlačítko "Proforma" + badge "💳 Předem"
- [x] Generování proformy přes Fakturoid API (`document_type: "proforma"`, `proforma_followup_document: "final_invoice_paid"`)
- [x] Zobrazení QR kódu pro bankovní platbu (SPD formát, `qrcode.react`, generováno lokálně)
- [x] Po kliknutí "Zkontrolovat platbu" → polling Fakturoid API → status aktualizace
- [x] ProformaSheet (Bottom Sheet) s QR, částkou, kontrolou platby
- [x] FakturyList badge "Proforma" + FakturaDetail QR kód + kontrola platby
- [x] 29 nových testů (qrPayment, createProformaInvoice, getProformaByZakazka, ProformaSheet)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` (973 testů) ✅ + `npm run build` ✅

---

## Sprint 29 — Faktury: seznam + platby ✅
**Cíl:** Admin vidí faktury, párování plateb

- [x] UI: seznam faktur (filtr: uhrazeno/neuhrazeno/po_splatnosti) — mega-filtr "Neuhrazené" + sumární karta
- [x] UI: detail faktury (odkaz na Fakturoid, položky, stav) — "Zkontrolovat platbu" i pro běžné faktury
- [x] Polling: sync stavu plateb z Fakturoidu (banka napojená) — `syncFakturoidPaymentsAction` + `checkSinglePaymentAction`
- [x] Dashboard: "Neuhrazené faktury" widget (počet + suma) — reálná data z `sumNeuhrazeneFaktury`
- [x] 17 nových testů (syncFakturoidPayments, checkSinglePayment, overdue detection)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` (990 testů) ✅ + `npm run build` ✅

---

## Sprint 30 — Bonusový systém ✅
**Cíl:** Prémie pro techniky a adminy

- [x] DB: `bonusy` tabulka + `nastaveni_bonusu` (key-value sazby) + enums typ_bonusu/stav_bonusu + RLS + seed
- [x] TypeScript typy v database.types.ts (bonusy + nastaveni_bonusu + enums)
- [x] Queries `bonusy.ts`: getBonusyForUser, getBonusySummary, getAllBonusy, createBonus, markBonusyProplaceno, checkBonusExists, getNastaveniBonusu, updateNastaveniBonusu, getBonusSazba, createBonusZaZakazku, createBonusZaOpakovanou
- [x] Auth guard `requireSuperAdmin.ts`
- [x] Automatický bonus technikovi za dokončenou zakázku (fire-and-forget v updateZasahStatusTechnikAction)
- [x] Bonus za domluvenou opakovanou zakázku (fire-and-forget v createDalsiTerminAction)
- [x] Admin fixní odměna (super_admin generuje přes createFixniBonusyAction)
- [x] UI: `/premie` — technik vidí své, admin vidí své, super_admin vidí všech + batch proplacení
- [x] UI: Dashboard widgety MojePremieWidget (technik + admin) s reálnými daty
- [x] UI: `/nastaveni/bonusy` — super_admin nastavení sazeb (3 pole)
- [x] Navigace: vice/page.tsx — linky "Moje prémie" (technik), "Moje odměny" / "Přehled bonusů" (admin/super_admin)
- [x] 26 nových testů (queries unit, bonus integration, nastavení actions)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` (1016 testů) ✅ + `npm run build` ✅

---

## Sprint 31 — Dashboard: reálná data ✅
**Cíl:** Dashboard zobrazuje reálná data dle role

- [x] Admin: protokoly ke schválení, k odeslání, nedomluvené termíny, technici bez směn, věci ve zpoždění, neuhrazené faktury, vlastní odměny
- [x] Technik: "Můj den", klienti k domluvení, vyplnit dostupnost, moje prémie
- [x] Super_admin: vše co admin + přehled odměn všech
- [x] Quick actions (tlačítka pro nejčastější akce)
- [x] Fix: premie page role check uses aktivni_role instead of role array
- [x] 12 nových testů (dashboard roles, overdue logic, premie role checks)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` (1028 testů) ✅ + `npm run build` ✅

---

## Sprint 32 — Klientský portál: základ ✅
**Cíl:** Klient se přihlásí a vidí dokumenty

- [x] Oddělená sekce `/portal` s vlastním layoutem
- [x] Klientský login (Supabase Auth, role=klient)
- [x] Klient vidí: své protokoly (PDF ke stažení)
- [x] Klient vidí: své faktury (stav, PDF z Fakturoidu)
- [x] Klient vidí: nadcházející termíny
- [x] DB migrace: klient_id na profiles + RLS policies pro portal
- [x] Middleware: klient redirect na /portal po přihlášení
- [x] Signout API route pro portal
- [x] 14 testů (portal role access, login redirect, data filtering, status display)
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` ✅ (1042 testů) + `npm run build` ✅

---

## Sprint 33 — Klientský portál: výběr termínu ✅
**Cíl:** Klient si sám vybere termín online

- [x] UI: klient vidí volné sloty (jen pokud technik má vypsanou dostupnost, max 1 měsíc)
- [x] Sloty generované z dostupnosti technika, odečteny existující zásahy (1h bloky)
- [x] Výběr → zásah v kalendáři (status: potvrzený klientem)
- [x] Pripomínka se automaticky označí jako vyřešená po výběru
- [x] Validace: UUID, datum, čas, existence slotu, vlastnictví zakázky
- [x] Portal termíny stránka: banner pro klienty s nevybranými termíny
- [x] 13 nových testů (slot generation, booking validation, pripominka filtering)
- [x] Notifikace: připraveno pro napojení emailů (Resend)
- [x] Systém čeká na dostupnost technika → UI zobrazí "žádné volné termíny"
- [x] **Kontrola:** `npx tsc --noEmit` ✅ + `npx vitest run` ✅ (1055 testů) + `npm run build` ✅

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
