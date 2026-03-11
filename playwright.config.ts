import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load .env.local so E2E seed helpers can access SUPABASE keys
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const authDir = path.join(__dirname, "e2e/.auth");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Limit workers to reduce concurrent Supabase Auth calls.
  workers: process.env.CI ? 1 : 3,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    viewport: { width: 375, height: 812 },
  },
  projects: [
    // ── Auth setup — runs FIRST, stores cookies for each user role ──
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ── Test projects — depend on auth-setup, reuse stored cookies ──
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 14"] },
      dependencies: ["auth-setup"],
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"], browserName: "webkit" },
      dependencies: ["auth-setup"],
    },
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
      timeout: 60_000,
      dependencies: ["auth-setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
