import { test, expect } from "@playwright/test";

test.describe("Offer pages smoke tests", () => {
  test("Blood dashboard redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/blood-dashboard");
    await expect(page).toHaveURL(/\/auth\/login\?next=\/blood-dashboard/);
  });

  test("Blood Analysis offer renders CTA", async ({ page }) => {
    await page.goto("/offers/blood-analysis");
    await expect(page.getByRole("heading", { name: /Blood Analysis/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Analyser mon bilan/i })).toBeVisible();
  });

  test("Discovery Scan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/discovery-scan");
    await expect(page.getByRole("button", { name: /Lancer mon Discovery Scan/i })).toBeVisible();
  });

  test("Anabolic Bioscan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/anabolic-bioscan");
    await expect(page.getByRole("button", { name: /Lancer mon Anabolic Bioscan/i })).toBeVisible();
  });

  test("Ultimate Scan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/ultimate-scan");
    await expect(page.getByRole("button", { name: /Lancer mon Ultimate Scan/i })).toBeVisible();
  });
});
