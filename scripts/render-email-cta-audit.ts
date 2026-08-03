import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

process.env.DATABASE_URL ||= "postgres://qa:qa@127.0.0.1:5432/qa";
const { captureEmailCtaQaFixtures } = await import("../server/emailService");

const outputDir = path.resolve("output/email-cta-audit");
const fixtures = await captureEmailCtaQaFixtures();

const slugify = (value: string) => value
  .replace(/^send/, "")
  .replace(/Email$/, "")
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .toLowerCase();

const forbidden = [
  { label: "tiret long", pattern: /[\u2013\u2014]/ },
  { label: "offre Starter", pattern: /\bstarter\b/i },
  { label: "date avril expirée", pattern: /30\/04|avril 2026/i },
  { label: "fausse urgence", pattern: /plus que \d+ jours|avant que .* expire|sources? bient[oô]t coup/i },
  { label: "prix Essential obsolète", pattern: /Essential[^<\n]{0,80}249\s*€/i },
];

const failures: string[] = [];
const manifest: Array<Record<string, unknown>> = [];

await mkdir(outputDir, { recursive: true });

for (const fixture of fixtures) {
  const slug = slugify(fixture.emailType);
  const combined = `${fixture.subject}\n${fixture.text}\n${fixture.html}`;
  for (const rule of forbidden) {
    if (rule.pattern.test(combined)) failures.push(`${fixture.emailType}: ${rule.label}`);
  }

  const trackedLinks = [...fixture.html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url) => url.includes("/api/track/email/"));
  const whatsappLinks = trackedLinks.filter((url) => decodeURIComponent(url).includes("wa.me/971585210514"));
  const coachingLinks = trackedLinks.filter((url) => decodeURIComponent(url).includes("url=https://www.achzodcoaching.com"));
  const apexlabsLinks = trackedLinks.filter((url) => decodeURIComponent(url).includes("url=https://apexlabs.achzodcoaching.com"));

  if (trackedLinks.length < 2) failures.push(`${fixture.emailType}: moins de 2 CTA suivis`);
  if (whatsappLinks.length === 0) failures.push(`${fixture.emailType}: CTA WhatsApp absent ou non suivi`);
  if (coachingLinks.length + apexlabsLinks.length === 0) failures.push(`${fixture.emailType}: CTA commercial absent ou non suivi`);
  if (fixture.subject.length > 60) failures.push(`${fixture.emailType}: objet trop long (${fixture.subject.length})`);

  const fileName = `${slug}.html`;
  await writeFile(path.join(outputDir, fileName), fixture.html, "utf8");
  manifest.push({
    emailType: fixture.emailType,
    subject: fixture.subject,
    subjectLength: fixture.subject.length,
    trackedLinks: trackedLinks.length,
    whatsappLinks: whatsappLinks.length,
    coachingLinks: coachingLinks.length,
    apexlabsLinks: apexlabsLinks.length,
    file: fileName,
  });
}

await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

if (failures.length > 0) {
  console.error("Email CTA QA failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Email CTA QA passed: ${fixtures.length} templates rendered in ${outputDir}`);
