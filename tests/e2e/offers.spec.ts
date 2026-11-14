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

  test("FormCheck shows the 3 paid packs with Stripe checkout and no WhatsApp", async ({ page }) => {
    await page.goto("/offers/formcheck");

    await expect(page.getByTestId("formcheck-hero-cta")).toBeVisible();
    await expect(page.getByTestId("formcheck-pack-1")).toContainText("9,90 €");
    await expect(page.getByTestId("formcheck-pack-3")).toContainText("24,90 €");
    await expect(page.getByTestId("formcheck-pack-6")).toContainText("44,90 €");
    await expect(page.locator('#packs a[href*="wa.me"]')).toHaveCount(0);

    // Sans email, le checkout ne part pas et un message clair s'affiche.
    await page.getByTestId("formcheck-checkout-1").click();
    await expect(page.getByRole("alert")).toContainText("email");
  });
});
