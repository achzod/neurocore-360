import { test, expect } from "@playwright/test";

test.describe("Offer pages smoke tests", () => {
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
