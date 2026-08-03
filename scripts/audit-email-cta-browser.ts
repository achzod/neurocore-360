import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const outputDir = path.resolve("output/email-cta-audit");
const manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8")) as Array<{
  emailType: string;
  file: string;
}>;

assert.ok(manifest.length >= 11, "all critical CTA templates must be present");

const browser = await chromium.launch({ headless: true });
const failures: string[] = [];

try {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 900, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport });
    for (const template of manifest) {
      await page.goto(pathToFileURL(path.join(outputDir, template.file)).href, { waitUntil: "load" });
      const audit = await page.evaluate(() => {
        const root = document.documentElement;
        const trackedLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/track/email/"]')];
        const visibleTrackedLinks = trackedLinks.filter((link) => {
          const rect = link.getBoundingClientRect();
          const style = getComputedStyle(link);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        });
        const overflowingLinks = visibleTrackedLinks.filter((link) => {
          const rect = link.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        });
        return {
          horizontalOverflow: root.scrollWidth > window.innerWidth + 1,
          trackedLinks: trackedLinks.length,
          visibleTrackedLinks: visibleTrackedLinks.length,
          overflowingLinks: overflowingLinks.length,
          text: document.body.innerText,
        };
      });

      const label = `${template.emailType} (${viewport.name})`;
      if (audit.horizontalOverflow) failures.push(`${label}: débordement horizontal`);
      if (audit.trackedLinks < 2) failures.push(`${label}: moins de 2 liens suivis`);
      if (audit.visibleTrackedLinks !== audit.trackedLinks) failures.push(`${label}: CTA suivi masqué`);
      if (audit.overflowingLinks > 0) failures.push(`${label}: CTA hors écran`);
      if (/[\u2013\u2014]/.test(audit.text)) failures.push(`${label}: tiret long rendu`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error("Browser CTA audit failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Browser CTA audit passed: ${manifest.length} templates, mobile and desktop, without overflow or hidden CTA`);
