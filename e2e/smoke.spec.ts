import { test, expect } from "@playwright/test";

// ---------- Helpers ----------

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login page (longer timeout for slower mobile browsers)
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20000,
  });
}

// ---------- Basic ----------

test("homepage redirects to login when not authenticated", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login/);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// ---------- Super Admin flow ----------

test.describe("Super Admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "superadmin@deraplus.cz", "Test1234");
  });

  test("sees admin dashboard with real data", async ({ page }) => {
    await expect(page).toHaveURL("/");
    // Admin dashboard cards
    await expect(page.getByText("Protokoly ke schválení")).toBeVisible();
    await expect(page.getByText("Nedomluvené termíny", { exact: true })).toBeVisible();
    await expect(page.getByText("Technici bez směn")).toBeVisible();
    await expect(page.getByText("Neuhrazené faktury")).toBeVisible();
    // Role badge
    await expect(page.getByText("Super Admin")).toBeVisible();
  });

  test("admin bottom nav has correct items", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Klienti" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Zakázky" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kalendář" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Více" })).toBeVisible();
  });

  test("kalendar shows admin week view with zasahy", async ({ page }) => {
    await page.click('a[href="/kalendar"]');
    await page.waitForURL("**/kalendar");
    // View mode toggles
    await expect(page.getByRole("button", { name: "Měsíc" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Týden" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Den", exact: true })).toBeVisible();
    // Technik filter buttons
    await expect(page.getByRole("button", { name: "Všichni" })).toBeVisible();
  });

  test("kalendar month view works", async ({ page }) => {
    await page.goto("/kalendar");
    await page.click('button:has-text("Měsíc")');
    // Month grid should have day names
    await expect(page.getByText("Po")).toBeVisible();
    await expect(page.getByText("Pá")).toBeVisible();
  });

  test("kalendar day view works", async ({ page }) => {
    await page.goto("/kalendar");
    await page.click('button:has-text("Den"):not(:has-text("Týden"))');
    // Day view should show add button (text includes date, e.g. "Přidat zásah na 9. 3. 2026")
    await expect(page.getByText(/Přidat zásah na/)).toBeVisible();
  });

  test("vice page shows admin profile", async ({ page }) => {
    await page.goto("/vice");
    await expect(page.getByText("superadmin@deraplus.cz")).toBeVisible();
    await expect(page.getByRole("main").getByText("Super Admin")).toBeVisible();
    await expect(page.getByText("Správa uživatelů")).toBeVisible();
    await expect(page.getByText("Nastavení systému")).toBeVisible();
  });
});

// ---------- Technik flow ----------

test.describe("Technik", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "technik@deraplus.cz", "Test1234");
  });

  test("sees technik dashboard with Můj den card", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Můj den")).toBeVisible();
    await expect(page.getByText("Klienti k domluvení", { exact: true })).toBeVisible();
    await expect(page.getByText("Vyplnit dostupnost")).toBeVisible();
    await expect(page.getByText("Moje prémie")).toBeVisible();
  });

  test("technik bottom nav has correct items (no Klienti)", async ({
    page,
  }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Zakázky" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kalendář" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Více" })).toBeVisible();
    // Klienti should NOT be visible for technik
    await expect(
      page.getByRole("link", { name: "Klienti" }),
    ).not.toBeVisible();
  });

  test("kalendar shows technik Můj den view", async ({ page }) => {
    await page.click('a[href="/kalendar"]');
    await page.waitForURL("**/kalendar");
    // Should show day navigation
    await expect(
      page.getByRole("button", { name: "Předchozí den" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Další den" }),
    ).toBeVisible();
    // Should NOT show admin view mode buttons
    await expect(
      page.getByRole("button", { name: "Měsíc" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Týden" }),
    ).not.toBeVisible();
  });

  test("technik can navigate between days", async ({ page }) => {
    await page.goto("/kalendar");
    // Click next day
    await page.click('button[aria-label="Další den"]');
    // Wait for content to update (might show empty or different day)
    await page.waitForTimeout(1000);
    // Navigation should still be present
    await expect(
      page.getByRole("button", { name: "Předchozí den" }),
    ).toBeVisible();
  });

  test("vice page shows technik profile", async ({ page }) => {
    await page.goto("/vice");
    await expect(page.getByText("technik@deraplus.cz")).toBeVisible();
    await expect(page.getByText("Technik", { exact: true })).toBeVisible();
    await expect(page.getByText("Moje dostupnost")).toBeVisible();
    // Should NOT see admin-only items
    await expect(page.getByText("Správa uživatelů")).not.toBeVisible();
    await expect(page.getByText("Nastavení systému")).not.toBeVisible();
  });
});

// ---------- Mobile-first checks ----------

test.describe("Mobile UI", () => {
  test("login form inputs have 16px font on mobile (prevent iOS zoom)", async ({
    page,
    browserName,
  }, testInfo) => {
    // This check only matters for mobile (iOS zoom prevention)
    if (testInfo.project.name.includes("desktop")) {
      test.skip();
      return;
    }
    await page.goto("/login");
    const emailInput = page.locator('input[type="email"]');
    const fontSize = await emailInput.evaluate(
      (el) => window.getComputedStyle(el).fontSize,
    );
    const size = parseFloat(fontSize);
    expect(size).toBeGreaterThanOrEqual(16);
  });

  test("bottom nav buttons are at least 44px tall", async ({ page }) => {
    await login(page, "superadmin@deraplus.cz", "Test1234");
    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const box = await navLinks.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
