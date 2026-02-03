import { test, expect } from "@playwright/test";

const discoveryId =
  process.env.DISCOVERY_AUDIT_ID || "a0a39545-46c5-462b-b552-0d9151481582";
const anabolicId =
  process.env.ANABOLIC_AUDIT_ID || "43b9dba8-0fd8-4dcd-a3cf-b67c11ae8801";
const ultimateId =
  process.env.ULTIMATE_AUDIT_ID || "bac81808-3b1f-4c5d-9409-0ee32643f856";

test.describe("Report pages smoke tests", () => {
  test("Discovery Scan report renders", async ({ page }) => {
    await page.goto(`/scan/${discoveryId}`);
    await expect(page.getByText("Discovery Scan", { exact: true }).first()).toBeVisible({
      timeout: 60000,
    });
    await expect(page.locator("text=Rapport non disponible")).toHaveCount(0);
  });

  test("Anabolic Bioscan report renders", async ({ page }) => {
    await page.goto(`/anabolic/${anabolicId}`);
    await expect(page.getByText("Anabolic Bioscan", { exact: true }).first()).toBeVisible({
      timeout: 60000,
    });
    await expect(page.locator("text=Rapport non disponible")).toHaveCount(0);
  });

  test("Ultimate Scan report renders", async ({ page }) => {
    await page.goto(`/ultimate/${ultimateId}`);
    await expect(page.getByText("Ultimate Scan", { exact: true }).first()).toBeVisible({
      timeout: 60000,
    });
    await expect(page.locator("text=Rapport non disponible")).toHaveCount(0);
  });
});
