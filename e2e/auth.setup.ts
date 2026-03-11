import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Playwright auth setup — runs once BEFORE all test projects.
 *
 * Logs in as each user role and persists cookies/localStorage to JSON files.
 * Test files then use `storageState` to start already-authenticated,
 * eliminating redundant Supabase Auth API calls and fixing desktop-chromium
 * timeouts caused by concurrent sign-in rate-limiting.
 */

const authDir = path.join(__dirname, ".auth");

export const TECHNIK_STORAGE = path.join(authDir, "technik.json");
export const SUPERADMIN_STORAGE = path.join(authDir, "superadmin.json");

setup("authenticate as technik", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', "technik@deraplus.cz");
  await page.fill('input[type="password"]', "Test1234");

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes("/auth/v1/token") && resp.status() === 200,
      { timeout: 45_000 },
    ),
    page.click('button[type="submit"]'),
  ]);

  // Wait for navigation to dashboard
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });
  await page.waitForLoadState("networkidle");

  // Verify we're on the dashboard
  await expect(page).toHaveURL("/");

  // Save storage state (cookies + localStorage) for reuse
  await page.context().storageState({ path: TECHNIK_STORAGE });
});

setup("authenticate as superadmin", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', "superadmin@deraplus.cz");
  await page.fill('input[type="password"]', "Test1234");

  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes("/auth/v1/token") && resp.status() === 200,
      { timeout: 45_000 },
    ),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveURL("/");

  await page.context().storageState({ path: SUPERADMIN_STORAGE });
});
