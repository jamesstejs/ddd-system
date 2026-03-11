import { test, expect } from "@playwright/test";
import path from "path";
import {
  seedProtokolData,
  cleanupSeedData,
  type SeedData,
} from "./helpers/supabase-seed";

const TECHNIK_STORAGE = path.join(__dirname, ".auth/technik.json");
const SUPERADMIN_STORAGE = path.join(__dirname, ".auth/superadmin.json");

// ============================================================
// Technik — deratizační protokol flow
// ============================================================

test.describe("Technik — Deratizační protokol", () => {
  test.use({ storageState: TECHNIK_STORAGE });

  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedProtokolData("technik@deraplus.cz", {
      typyZasahu: ["vnitrni_deratizace"],
    });
  });

  test.afterAll(async () => {
    if (seed) await cleanupSeedData(seed);
  });

  test("technik vidí protokol page s klient info", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Klient jméno
    await expect(page.getByText("E2E Test Klient s.r.o.")).toBeVisible();
    // Objekt název
    await expect(page.getByText("E2E Provozovna")).toBeVisible();
    // Status badge
    await expect(page.getByText("Rozpracovaný")).toBeVisible();
  });

  test("technik vidí prázdný stav a přidá deratizační bod", async ({
    page,
  }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Prázdný stav
    await expect(
      page.getByText("Žádné body. Přidejte první bod."),
    ).toBeVisible();

    // Klikni na "Přidat bod"
    await page.click('button:has-text("+ Přidat bod")');

    // Edit mode — vidíme formulář
    await expect(page.getByText("← Přehled")).toBeVisible();
    await expect(page.getByLabel("Číslo bodu")).toBeVisible();
    await expect(page.getByText("Typ staničky")).toBeVisible();
    await expect(page.getByText("Požer")).toBeVisible();
  });

  test("technik vyplní bod a uloží", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Přidat bod
    await page.click('button:has-text("+ Přidat bod")');
    await page.waitForTimeout(300);

    // Vyplnit číslo bodu
    const cisloBodu = page.getByLabel("Číslo bodu");
    await cisloBodu.fill("L1");

    // Kliknout na požer 25%
    await page.click('button[aria-label="Požer 25%"]');

    // Zpět na přehled
    await page.click('button:has-text("← Přehled")');

    // Vidíme bod L1 v seznamu
    await expect(page.getByText("L1")).toBeVisible();
    // 25% se zobrazí v summary bodu i v průměrném požeru — stačí najít alespoň jeden
    await expect(page.getByText("25%").first()).toBeVisible();

    // Uložit
    await page.click('button:has-text("Uložit změny")');

    // Měl by se zobrazit "Uloženo" úspěch
    await expect(page.getByText("Uloženo")).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================
// Technik — dezinsekční protokol flow
// ============================================================

test.describe("Technik — Dezinsekční protokol", () => {
  test.use({ storageState: TECHNIK_STORAGE });

  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedProtokolData("technik@deraplus.cz", {
      typyZasahu: ["vnitrni_dezinsekce"],
    });
  });

  test.afterAll(async () => {
    if (seed) await cleanupSeedData(seed);
  });

  test("technik vidí dezinsekci tab a přidá bod", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Prázdný stav
    await expect(
      page.getByText("Žádné body. Přidejte první bod."),
    ).toBeVisible();

    // Přidat bod
    await page.click('button:has-text("+ Přidat bod")');

    // Edit mode — dezinsekční pole
    await expect(page.getByText("← Přehled")).toBeVisible();
    await expect(page.getByLabel("Číslo bodu")).toBeVisible();
    await expect(page.getByText("Typ lapače")).toBeVisible();
    await expect(page.getByText("Druh hmyzu")).toBeVisible();
    await expect(page.getByText("Počet kusů")).toBeVisible();
  });
});

// ============================================================
// Technik — postřik protokol flow
// ============================================================

test.describe("Technik — Postřik protokol", () => {
  test.use({ storageState: TECHNIK_STORAGE });

  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedProtokolData("technik@deraplus.cz", {
      typyZasahu: ["postrik"],
    });
  });

  test.afterAll(async () => {
    if (seed) await cleanupSeedData(seed);
  });

  test("technik vidí postřik formulář", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Postřik form — vždy viditelné
    await expect(page.getByText("Postřik 1")).toBeVisible();
    await expect(page.getByText("Škůdce")).toBeVisible();
    await expect(page.getByText("Plocha (m²)")).toBeVisible();
    await expect(page.getByText("Typ zákroku")).toBeVisible();
    await expect(page.getByText("Přípravky")).toBeVisible();
  });

  test("technik přidá další postřik", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Přidat další postřik
    await page.click('button:has-text("+ Přidat další postřik")');

    // Vidíme Postřik 2
    await expect(page.getByText("Postřik 2")).toBeVisible();
  });
});

// ============================================================
// Technik — multi-tab protokol (deratizace + postřik)
// ============================================================

test.describe("Technik — Multi-tab protokol", () => {
  test.use({ storageState: TECHNIK_STORAGE });

  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedProtokolData("technik@deraplus.cz", {
      typyZasahu: ["vnitrni_deratizace", "postrik"],
    });
  });

  test.afterAll(async () => {
    if (seed) await cleanupSeedData(seed);
  });

  test("protokol zobrazuje záložky a přepínání funguje", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Tab bar — obě záložky
    await expect(page.getByRole("tab", { name: "Deratizace" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Postřik" })).toBeVisible();

    // Default = deratizace tab → vidíme "Přidat bod"
    await expect(page.getByText("+ Přidat bod")).toBeVisible();

    // Přepni na Postřik tab
    await page.click('[role="tab"]:has-text("Postřik")');

    // Vidíme postřik formulář
    await expect(page.getByText("Postřik 1")).toBeVisible();
    await expect(page.getByText("Škůdce")).toBeVisible();
  });
});

// ============================================================
// Super Admin — vidí protokol za technika
// ============================================================

test.describe("Super Admin — Protokol review", () => {
  test.use({ storageState: SUPERADMIN_STORAGE });

  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedProtokolData("technik@deraplus.cz", {
      typyZasahu: ["vnitrni_deratizace"],
    });
  });

  test.afterAll(async () => {
    if (seed) await cleanupSeedData(seed);
  });

  test("admin vidí protokol technika", async ({ page }) => {
    await page.goto(`/protokoly/${seed.protokolId}`);
    await page.waitForLoadState("networkidle");

    // Admin vidí data — na protokol stránce je klient info v headeru
    // Použijeme .first() protože admin dashboard může zobrazovat duplicitní záznamy
    await expect(page.getByText("E2E Test Klient s.r.o.").first()).toBeVisible();
    await expect(page.getByText("E2E Provozovna").first()).toBeVisible();
  });
});
