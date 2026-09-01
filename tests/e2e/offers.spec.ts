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

  test("FormCheck exposes working WhatsApp CTAs", async ({ page }) => {
    await page.goto("/offers/formcheck");

    await expect(page.getByText("Indisponible pour le moment")).toHaveCount(0);

    const heroCta = page.getByTestId("formcheck-whatsapp-hero");
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute("href", /^https:\/\/wa\.me\/971585210514\?text=.+/);
    await expect(heroCta).toHaveAttribute("target", "_blank");

    const finalCta = page.getByTestId("formcheck-whatsapp-final");
    await expect(finalCta).toBeVisible();
    await expect(finalCta).toHaveAttribute("href", /^https:\/\/wa\.me\/971585210514\?text=.+/);

    await expect(page.getByTestId("formcheck-whatsapp-pack-essai")).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/971585210514\?text=.+/
    );
    await expect(page.getByTestId("formcheck-whatsapp-pack-solo")).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/971585210514\?text=.+/
    );
  });
});
