import { test, expect } from "@playwright/test";

test.describe("Offer pages smoke tests", () => {
  test("Discovery Scan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/discovery-scan");
    await expect(page.getByText("Discovery Scan", { exact: false })).toBeVisible();
    await expect(page.getByText("Lancer mon Discovery Scan", { exact: false })).toBeVisible();
  });

  test("Anabolic Bioscan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/anabolic-bioscan");
    await expect(page.getByText("Anabolic Bioscan", { exact: false })).toBeVisible();
    await expect(page.getByText("Lancer mon Anabolic Bioscan", { exact: false })).toBeVisible();
  });

  test("Ultimate Scan offer renders CTA", async ({ page }) => {
    await page.goto("/offers/ultimate-scan");
    await expect(page.getByText("Ultimate Scan", { exact: false })).toBeVisible();
    await expect(page.getByText("Lancer mon Ultimate Scan", { exact: false })).toBeVisible();
  });
});
