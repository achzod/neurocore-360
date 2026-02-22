import { test, expect, Page } from "@playwright/test";

type Marker = {
  markerId: string;
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "optimal" | "normal" | "suboptimal" | "critical";
  normalRange: string;
  optimalRange: string;
  interpretation: string;
};

const RICH_MARKERS: Marker[] = [
  { markerId: "creatinine", id: "creatinine", name: "Creatinine", value: 1.04, unit: "mg/dL", status: "optimal", normalRange: "0.7-1.3", optimalRange: "0.9-1.1", interpretation: "Fonction renale" },
  { markerId: "egfr", id: "egfr", name: "eGFR", value: 101, unit: "mL/min", status: "optimal", normalRange: "90-999", optimalRange: "100-999", interpretation: "Filtration renale" },
  { markerId: "ferritine", id: "ferritine", name: "Ferritine", value: 196, unit: "ng/mL", status: "normal", normalRange: "20-300", optimalRange: "80-150", interpretation: "Fer stocke" },
  { markerId: "transferrine_sat", id: "transferrine_sat", name: "Transferrine sat.", value: 40, unit: "%", status: "optimal", normalRange: "20-50", optimalRange: "30-45", interpretation: "Utilisation fer" },
  { markerId: "b12", id: "b12", name: "B12", value: 432, unit: "pg/mL", status: "normal", normalRange: "200-900", optimalRange: "500-800", interpretation: "Energie neuro" },
  { markerId: "vitamine_d", id: "vitamine_d", name: "Vitamine D", value: 38, unit: "ng/mL", status: "normal", normalRange: "30-100", optimalRange: "50-80", interpretation: "Hormones immunite" },
  { markerId: "triglycerides", id: "triglycerides", name: "Triglycerides", value: 166, unit: "mg/dL", status: "suboptimal", normalRange: "0-150", optimalRange: "0-80", interpretation: "Energie" },
  { markerId: "lpa", id: "lpa", name: "Lp(a)", value: 100, unit: "mg/dL", status: "critical", normalRange: "0-30", optimalRange: "0-14", interpretation: "Risque cardio" },
  { markerId: "apo_a1", id: "apo_a1", name: "Apolipoproteines A1", value: 85, unit: "mg/dL", status: "suboptimal", normalRange: "125-999", optimalRange: "140-180", interpretation: "HDL particles" },
  { markerId: "hdl", id: "hdl", name: "HDL", value: 70, unit: "mg/dL", status: "optimal", normalRange: "40-999", optimalRange: "55-999", interpretation: "Protection cardio" },
  { markerId: "crp_us", id: "crp_us", name: "CRP-us", value: 0.7, unit: "mg/L", status: "normal", normalRange: "0-3", optimalRange: "0-0.5", interpretation: "Inflammation systemique" },
  { markerId: "ast", id: "ast", name: "AST", value: 34, unit: "U/L", status: "normal", normalRange: "10-40", optimalRange: "0-30", interpretation: "Foie muscle" },
  { markerId: "alt", id: "alt", name: "ALT", value: 56, unit: "U/L", status: "normal", normalRange: "7-56", optimalRange: "0-30", interpretation: "Foie" },
  { markerId: "ggt", id: "ggt", name: "GGT", value: 33, unit: "U/L", status: "normal", normalRange: "9-48", optimalRange: "0-25", interpretation: "Stress oxydatif" },
  { markerId: "estradiol", id: "estradiol", name: "Estradiol (E2)", value: 23, unit: "pg/mL", status: "optimal", normalRange: "10-40", optimalRange: "20-35", interpretation: "Equilibre testo/E2" },
  { markerId: "prolactine", id: "prolactine", name: "Prolactine", value: 6.7, unit: "ng/mL", status: "optimal", normalRange: "2-18", optimalRange: "5-12", interpretation: "Libido" },
  { markerId: "t4_libre", id: "t4_libre", name: "T4 libre", value: 1.14, unit: "ng/dL", status: "normal", normalRange: "0.8-1.8", optimalRange: "1.2-1.6", interpretation: "Hormone stockage" },
  { markerId: "tsh", id: "tsh", name: "TSH", value: 1.89, unit: "mIU/L", status: "optimal", normalRange: "0.4-4.5", optimalRange: "0.5-2", interpretation: "Thyroide" },
  { markerId: "testosterone_libre", id: "testosterone_libre", name: "Testosterone libre", value: 5, unit: "pg/mL", status: "normal", normalRange: "5-25", optimalRange: "15-25", interpretation: "Forme active" },
];

const AI_REPORT_FULL = `
## SYNTHESE EXECUTIVE
### Triage Prioritaire
- Priorite 1: Lp(a) tres eleve.
- Priorite 2: axe metabolique sous-optimal.

### Lecture Globale
Profil global coherent avec un risque cardio-metabolique ameliorable.

## QUALITE DES DONNEES & LIMITES
Les donnees sont coherentes. Un retest a jeun standardise est recommande.

## TABLEAU DE BORD (SCORES & PRIORITES)
Top priorites et quick wins identifies.

## POTENTIEL RECOMPOSITION (PERTE DE GRAS + GAIN DE MUSCLE)
Potentiel de recomposition eleve apres correction du risque metabolique.

## ANALYSE PAR AXE
### Axe 1 — Potentiel musculaire & androgenes
Signals anaboliques presents mais perfectibles.

### Axe 2 — Metabolisme & gestion du risque diabete
Triglycerides elevés, vigilance sur sensibilite insulinique.

## CORRELATIONS LIFESTYLE
Sommeil et gestion du stress a renforcer.

## DEEP DIVE MARQUEURS PRIORITAIRES
### Lp(a) — 100 mg/dL — CRITIQUE
Intervention prioritaire.

## PLAN D'ACTION 90 JOURS
### PHASE 1: ATTAQUE (Jours 1-30)
Nutrition anti-inflammatoire + marche post-prandiale.

### PHASE 2: OPTIMISATION (Jours 31-60)
Progression entrainement force.

### PHASE 3: CONSOLIDATION (Jours 61-90)
Consolidation habitudes.

### PHASE 4: RETEST (J+90)
Retest des biomarqueurs cibles.

## NUTRITION & ENTRAINEMENT (TRADUCTION PRATIQUE)
### Nutrition
Strategie proteique et controle glycémique.

### Entrainement
Zone 2 + force 3x/semaine.

## SUPPLEMENTS & STACK (MINIMALISTE MAIS IMPACT)
Omega-3, magnesium, vitamine D selon contexte.

## ANNEXES (ULTRA LONG)
### Annexe C — Glossaire utile
Definitions des marqueurs.

## VIGILANCE
Ce rapport ne remplace pas un avis medical.

## SOURCES (BIBLIOTHEQUE)
Huberman, Attia, Examine, publications revues par les pairs.
`.trim();

const summary = {
  optimal: ["Creatinine", "eGFR", "Transferrine sat.", "HDL", "Estradiol (E2)", "Prolactine", "TSH"],
  watch: ["Ferritine", "B12", "Vitamine D", "Triglycerides", "Apolipoproteines A1", "CRP-us", "AST", "ALT", "GGT", "T4 libre", "Testosterone libre"],
  action: ["Lp(a)"],
};

const buildReportPayload = (reportId: string, withAiReport: boolean) => ({
  success: true,
  report: {
    id: reportId,
    email: "test@example.com",
    profile: { prenom: "Alex", gender: "homme" },
    analysis: {
      markers: RICH_MARKERS,
      summary,
    },
    aiReport: withAiReport ? AI_REPORT_FULL : "",
    createdAt: "2026-02-22T13:45:14.513Z",
  },
});

const installReportRouteMock = async (page: Page) => {
  await page.route("**/api/blood-analysis/report/**", async (route) => {
    const url = new URL(route.request().url());
    const reportId = url.pathname.split("/").pop() || "fixture-rich";
    const withAiReport = reportId !== "fixture-no-ai";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildReportPayload(reportId, withAiReport)),
    });
  });
};

const openDashboard = async (page: Page, reportId = "fixture-rich") => {
  await page.goto(`/analysis/${reportId}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2300);
};

test.describe("Blood Analysis Dashboard - Production Readiness", () => {
  test.beforeEach(async ({ page }) => {
    await installReportRouteMock(page);
  });

  test("renders overview with visible scores and consistent widgets", async ({ page }) => {
    await openDashboard(page);

    await expect(page.getByRole("heading", { name: /Tableau de bord biomarqueurs/i })).toBeVisible();
    await expect(page.locator('div[role="figure"]')).toBeVisible();
    await expect(page.locator('div[role="region"][aria-label*="Heatmap"]')).toBeVisible();
    await expect(page.locator('div[role="article"]')).toHaveCount(6);

    const debug = await page.evaluate(() => {
      const values = Array.from(document.querySelectorAll('[role="article"] .text-4xl')).map((node) => {
        const style = getComputedStyle(node as HTMLElement);
        const rect = (node as HTMLElement).getBoundingClientRect();
        return {
          text: node.textContent?.trim() || "",
          position: style.position,
          left: style.left,
          width: rect.width,
        };
      });
      const radial = document.querySelector('[role="figure"] .text-7xl') as HTMLElement | null;
      const radialStyle = radial ? getComputedStyle(radial) : null;
      return {
        values,
        radialText: radial?.textContent?.trim() || "",
        radialPosition: radialStyle?.position || "",
        radialLeft: radialStyle?.left || "",
      };
    });

    for (const value of debug.values) {
      expect(Number(value.text)).toBeGreaterThan(0);
      expect(value.position).toBe("static");
      expect(value.left).toBe("auto");
      expect(value.width).toBeGreaterThan(10);
    }
    expect(Number(debug.radialText)).toBeGreaterThan(0);
    expect(debug.radialPosition).toBe("static");
    expect(debug.radialLeft).toBe("auto");
  });

  test("supports heatmap interaction and keyboard accessibility", async ({ page }) => {
    await openDashboard(page);
    await page.getByRole("tab", { name: /Overview/i }).click();
    await expect(page.getByRole("heading", { name: /Heatmap systémique/i })).toBeVisible();

    const firstCategory = page.getByRole("button", { name: /Panel Hormonal: score/i }).first();
    await firstCategory.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: /Biomarqueurs/i })).toHaveAttribute("data-state", "active");

    await page.getByRole("tab", { name: /Overview/i }).click();
    const firstCategoryAgain = page.getByRole("button", { name: /Panel Hormonal: score/i }).first();
    await firstCategoryAgain.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("tab", { name: /Biomarqueurs/i })).toHaveAttribute("data-state", "active");
  });

  test("opens all dashboard tabs with expected content blocks", async ({ page }) => {
    await openDashboard(page);

    const checks = [
      { tab: /Overview/i, expected: /Heatmap systémique/i },
      { tab: /Biomarqueurs/i, expected: /Creatinine/i },
      { tab: /Synthèse/i, expected: /Triage Prioritaire/i },
      { tab: /Données & Tests/i, expected: /QUALITE DES DONNEES/i },
      { tab: /Analyse Axes/i, expected: /Axe 1 — Potentiel musculaire/i },
      { tab: /Plan 90j/i, expected: /PHASE 1: ATTAQUE/i },
      { tab: /Protocoles/i, expected: /NUTRITION & ENTRAINEMENT/i },
      { tab: /Annexes/i, expected: /Glossaire utile/i },
    ];

    for (const { tab, expected } of checks) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByText(expected, { exact: false }).first()).toBeVisible();
    }
  });

  test("keeps metrics visible after theme switches", async ({ page }) => {
    await openDashboard(page);

    const themes = [/^M1$/i, /^Claude$/i, /^Titanium$/i, /^Sand$/i];
    for (const theme of themes) {
      await page.getByRole("button", { name: theme }).click();
      await page.waitForTimeout(200);
      const firstValue = await page.locator('[role="article"] .text-4xl').first().textContent();
      expect(Number((firstValue || "").trim())).toBeGreaterThan(0);
    }
  });

  test("has no horizontal overflow on desktop and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openDashboard(page);
    let overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return 0;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(12);

    await page.setViewportSize({ width: 390, height: 844 });
    await openDashboard(page);
    overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return 0;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(12);
  });

  test("shows explicit AI generation state when report text is absent", async ({ page }) => {
    await openDashboard(page, "fixture-no-ai");
    await page.getByRole("tab", { name: /Synthèse/i }).click();
    await expect(page.getByText(/Génération du rapport AI en cours/i)).toBeVisible();
  });
});
