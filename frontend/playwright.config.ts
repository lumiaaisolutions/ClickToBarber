import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite — corre con `npm run e2e`.
 * Asume backend en :8000 y frontend en :3000 ya levantados.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.LUMIA_E2E_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    locale: "es-MX",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile",   use: { ...devices["iPhone 14"] } },
  ],
});
