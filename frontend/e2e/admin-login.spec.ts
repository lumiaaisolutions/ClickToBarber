import { test, expect } from "@playwright/test";

/**
 * Happy path: login admin demo → dashboard → audit log → logout.
 *
 *   npm run e2e
 *
 * Requiere:
 *  - backend en :8000 con seeders aplicados.
 *  - cuenta `admin@elnavajazo.test / password`.
 */
test("admin demo puede entrar al dashboard y ver audit log", async ({ page }) => {
  await page.goto("/login");

  await page.fill('input[type="email"]', "admin@elnavajazo.test");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]:has-text("Iniciar sesión")');

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // El sidebar debe tener al menos Bitácora visible (admin puede entrar)
  await page.click('a:has-text("Bitácora")');
  await expect(page).toHaveURL(/\/admin\/audit/);
  await expect(page.getByRole("heading", { name: /bitácora/i })).toBeVisible();
});

test("Cmd+K abre el command palette", async ({ page, browserName }) => {
  // Login
  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@elnavajazo.test");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);

  // Presiona Cmd+K (Mac) o Ctrl+K (otros)
  await page.keyboard.press(browserName === "webkit" ? "Meta+k" : "Control+k");
  await expect(page.getByPlaceholder(/Ir a/i)).toBeVisible();
  await page.fill('input[placeholder*="Ir a"]', "agenda");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/agenda/);
});
