import type { Page } from "@playwright/test";

/**
 * Shared login helper for E2E tests.
 *
 * Two-phase approach to avoid desktop-chromium timeouts:
 *
 * Phase 1: Wait for the Supabase Auth API response (`/auth/v1/token`).
 *   Under concurrent load (parallel workers × 3 projects), this call can
 *   take 10–30 s due to Supabase rate-limits.
 *
 * Phase 2: Wait for Next.js App Router navigation away from `/login`.
 *   Once auth cookies are set, `router.push("/")` triggers server-side
 *   rendering (middleware + layout), which is fast after auth succeeds.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Phase 1: Click submit and wait for Supabase Auth API to respond.
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes("/auth/v1/token") && resp.status() === 200,
      { timeout: 45_000 },
    ),
    page.click('button[type="submit"]'),
  ]);

  // Phase 2: Auth succeeded — wait for client-side navigation to dashboard.
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });

  // Ensure destination page has fully loaded (RSC payloads, dynamic imports).
  await page.waitForLoadState("networkidle");
}
