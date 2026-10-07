import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 320, height: 667 }, isMobile: true, hasTouch: true });

async function expectClickableAboveConsent(page: import("@playwright/test").Page, locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      ownsHitTarget: element === hit || element.contains(hit),
      bodyPaddingBottom: Number.parseFloat(getComputedStyle(document.body).paddingBottom),
      bannerHeight: document.querySelector('[aria-label="Préférences de cookies"]')?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(result.bannerHeight).toBeGreaterThan(0);
  expect(result.bodyPaddingBottom).toBeGreaterThan(result.bannerHeight);
  expect(result.ownsHitTarget).toBe(true);
}

test("Pré Peptides garde Continuer cliquable avec le consentement visible", async ({ page }) => {
  await page.goto("/peptides-preview");
  await expect(page.getByLabel("Préférences de cookies")).toBeVisible();
  await expect(page.getByTestId("global-whatsapp-form-toggle")).toHaveCount(0);

  await page.getByLabel("Prénom", { exact: true }).fill("Jean");
  await page.getByLabel("Email", { exact: true }).fill("jean.test@example.com");
  await page.getByLabel("Âge", { exact: true }).fill("35");
  await page.getByLabel("Poids actuel", { exact: true }).fill("80");
  await page.getByLabel("Taille", { exact: true }).fill("180");

  const next = page.getByRole("button", { name: "Continuer" });
  await expect(next).toBeEnabled();
  await expectClickableAboveConsent(page, next);
  await next.click();
  await expect(page.getByText("Étape 2 sur 6")).toBeVisible();
});

test("Discovery garde ses transitions cliquables avec le consentement visible", async ({ page }) => {
  await page.goto("/questionnaire?plan=gratuit");
  await expect(page.getByLabel("Préférences de cookies")).toBeVisible();
  await expect(page.getByTestId("global-whatsapp-form-toggle")).toHaveCount(0);

  await page.locator('input[type="email"]').fill("jean.test@example.com");
  await page.getByTestId("checkbox-rgpd-consent").click();
  await page.getByRole("button", { name: "Commencer le questionnaire" }).click();
  await page.getByText("Homme", { exact: true }).click();
  await page.getByTestId("button-confirm-sex").click();
  await page.locator("input").last().fill("Jean");

  const confirmName = page.getByTestId("button-confirm-prenom");
  await expectClickableAboveConsent(page, confirmName);
  await confirmName.click();
  await expect(page.getByTestId("button-next")).toBeVisible();
});

test("le header ne recouvre pas Continuer en paysage iPhone", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/peptides-engine?tier=solo");

  await page.locator('input[type="text"]').first().fill("Jean");
  await page.locator('input[type="email"]').fill("jean.test@example.com");
  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill("35");
  await numbers.nth(1).fill("80");
  await numbers.nth(2).fill("180");
  for (const combo of await page.locator('[role="combobox"]:visible').all()) {
    await combo.click();
    await page.locator('[role="option"]:visible').first().click();
  }

  const next = page.getByRole("button", { name: "Section suivante" });
  await expect(next).toBeEnabled();
  await expectClickableAboveConsent(page, next);
  await expect(page.getByRole("banner")).toHaveCSS("position", "relative");
});

test("les alias Discovery restent sans hub après le délai réel et le panneau public reste dans l'écran", async ({ context, page }) => {
  test.setTimeout(30_000);
  const checkoutPage = await context.newPage();
  const publicPage = await context.newPage();
  for (const candidate of [page, checkoutPage, publicPage]) {
    await candidate.setViewportSize({ width: 320, height: 667 });
  }

  await Promise.all([
    page.goto("/audit-complet/questionnaire?plan=gratuit"),
    checkoutPage.goto("/audit-complet/checkout?plan=gratuit"),
    publicPage.goto("/audit-complet"),
  ]);

  await expect(publicPage.getByLabel("Fermer le formulaire WhatsApp")).toBeVisible({ timeout: 16_000 });
  await expect(page.getByTestId("global-whatsapp-form-toggle")).toHaveCount(0);
  await expect(checkoutPage.getByTestId("global-whatsapp-form-toggle")).toHaveCount(0);

  const closeButtonBounds = await publicPage.getByLabel("Fermer le formulaire WhatsApp").boundingBox();
  expect(closeButtonBounds).not.toBeNull();
  expect(closeButtonBounds!.y).toBeGreaterThanOrEqual(8);
  expect(closeButtonBounds!.y + closeButtonBounds!.height).toBeLessThanOrEqual(659);
});
