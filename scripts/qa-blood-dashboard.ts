import { chromium } from "playwright";

type TabAudit = {
  tab: string;
  textLength: number;
  minLength: number;
  hasPlaceholder: boolean;
  hasBadRangeFormat: boolean;
  hasUltraLong: boolean;
  passed: boolean;
};

const DEFAULT_URL = "https://neurocore-360.onrender.com/analysis/156c0b54-aaf8-40f2-a6b0-475a811308e4";
const url = process.argv[2] || DEFAULT_URL;

const tabs = [
  { name: "Overview", minLength: 1200 },
  { name: "Biomarqueurs", minLength: 1800 },
  { name: "Synthèse", minLength: 1800 },
  { name: "Données & Tests", minLength: 800 },
  { name: "Analyse Axes", minLength: 2500 },
  { name: "Plan 90j", minLength: 900 },
  { name: "Protocoles", minLength: 1500 },
  { name: "Annexes", minLength: 900 },
] as const;

const placeholderPattern =
  /(Cette section sera disponible une fois le rapport complet généré|Génération du rapport AI en cours|Le rapport complet sera disponible sous peu)/i;
const badRangePattern = /\ba\s+-\d/;
const ultraLongPattern = /ultra long/i;

const isStaticAsset = (urlString: string) => {
  return /\.(css|js|mjs|map|png|jpg|jpeg|svg|woff2?)($|\?)/i.test(urlString);
};

async function getVisibleTabPanelText(page: import("playwright").Page): Promise<string> {
  const panels = page.locator('[role="tabpanel"]');
  const count = await panels.count();
  for (let i = 0; i < count; i++) {
    const panel = panels.nth(i);
    if (await panel.isVisible()) {
      return (await panel.innerText()).replace(/\s+/g, " ").trim();
    }
  }
  return "";
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const httpFailures: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !isStaticAsset(response.url())) {
      httpFailures.push(`${status} ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3500);

  const tabAudits: TabAudit[] = [];

  for (const tab of tabs) {
    await page.getByRole("tab", { name: tab.name, exact: true }).click();
    await page.waitForTimeout(500);

    const text = await getVisibleTabPanelText(page);

    const hasPlaceholder = placeholderPattern.test(text);
    const hasBadRangeFormat = badRangePattern.test(text);
    const hasUltraLong = ultraLongPattern.test(text);
    const passed =
      text.length >= tab.minLength &&
      !hasPlaceholder &&
      !hasBadRangeFormat &&
      !hasUltraLong;

    tabAudits.push({
      tab: tab.name,
      textLength: text.length,
      minLength: tab.minLength,
      hasPlaceholder,
      hasBadRangeFormat,
      hasUltraLong,
      passed,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(1200);

  const mobileOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      hasGlobalOverflow: doc.scrollWidth > doc.clientWidth,
    };
  });

  await browser.close();

  const failedTabs = tabAudits.filter((t) => !t.passed);
  const hasBlockingIssues =
    failedTabs.length > 0 ||
    consoleErrors.length > 0 ||
    httpFailures.length > 0 ||
    mobileOverflow.hasGlobalOverflow;

  const result = {
    url,
    timestamp: new Date().toISOString(),
    tabAudits,
    consoleErrors,
    httpFailures,
    mobileOverflow,
    passed: !hasBlockingIssues,
  };

  console.log(JSON.stringify(result, null, 2));

  if (hasBlockingIssues) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[qa-blood-dashboard] fatal error", error);
  process.exitCode = 1;
});
