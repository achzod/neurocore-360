import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
const results = [];
for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5001/offers/peptides-engine", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const cookieAccept = page.getByRole("button", { name: "Tout accepter" });
  if (await cookieAccept.count()) await cookieAccept.click();
  await page.waitForTimeout(1000);
  const previewLinks = page.getByRole("link", { name: "Estimer mon stack gratuitement" });
  assert.ok(await previewLinks.count() >= 2, "hero and sitewide footer CTAs must both be present");
  const previewCta = previewLinks.first();
  await previewCta.waitFor();
  const href = await previewCta.getAttribute("href");
  assert.match(String(href), /^\/peptides-preview\?/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `/tmp/prepreview-${viewport.name}-offer-entry.png`, fullPage: true });
  results.push({ viewport: viewport.name, href, overflow, errors });
  await page.close();
}
await browser.close();
fs.writeFileSync("artifacts/peptides-preview/entrypoints-qa.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results));
