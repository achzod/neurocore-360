import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:5001").replace(/\/$/, "");
const routes = [
  { path: "/", testId: "homepage-peptides-preview-cta", requireAboveFold: true },
  { path: "/apexlabs", testId: "homepage-peptides-preview-cta", requireAboveFold: false },
  { path: "/offers/peptides-engine", testId: "peptides-offer-preview-cta", requireAboveFold: true },
  { path: "/peptides-engine", testId: "peptides-questionnaire-preview-cta", requireAboveFold: true },
];
const browser = await chromium.launch({ headless: true });
const results = [];
for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const cookieAccept = page.getByRole("button", { name: "Tout accepter" });
    if (await cookieAccept.count()) await cookieAccept.click();
    await page.waitForTimeout(400);
    const previewCta = page.getByTestId(route.testId);
    await previewCta.waitFor({ state: "visible" });
    const href = await previewCta.getAttribute("href");
    assert.match(String(href), /^\/peptides-preview\?/);
    const box = await previewCta.boundingBox();
    const aboveFold = Boolean(box && box.y < viewport.height);
    if (route.requireAboveFold) assert.equal(aboveFold, true, `${route.path} CTA must be visible above the fold`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert.equal(overflow, false);
    const unexpectedErrors = errors.filter((message) => {
      if (/<(?:line|circle)> attribute (?:x1|x2|y1|y2|cx|cy): Expected length, "undefined"\./.test(message)) return false;
      if (baseUrl.startsWith("http://127.0.0.1:") && message.startsWith("Failed to load reviews: SyntaxError:")) return false;
      return true;
    });
    assert.deepEqual(unexpectedErrors, []);
    await page.screenshot({ path: `/tmp/prepreview-${viewport.name}-${route.path.replace(/\W+/g, "-") || "home"}.png`, fullPage: true });
    results.push({ viewport: viewport.name, route: route.path, href, aboveFold, overflow, unexpectedErrors });
    await page.close();
  }
}
await browser.close();
fs.writeFileSync("artifacts/peptides-preview/entrypoints-qa.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results));
