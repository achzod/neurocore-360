import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

test("Consent Mode v2 is denied before tags and trackers are absent from the initial HTML", () => {
  const html = read("client/index.html");
  const consentIndex = html.indexOf("window.gtag('consent', 'default'");
  assert.ok(consentIndex > 0);
  for (const field of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(html, new RegExp(`${field}: 'denied'`));
  }
  assert.doesNotMatch(html, /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(html, /connect\.facebook\.net/);
  assert.doesNotMatch(html, /facebook\.com\/tr\?/);
});

test("analytics and Meta loaders are gated by explicit acceptance", () => {
  const consent = read("client/src/components/CookieConsent.tsx");
  const analytics = read("client/src/lib/analytics.ts");
  assert.match(consent, /const granted = level === "all"/);
  assert.match(consent, /if \(granted\) \{\s*loadGoogleTags\(\);\s*loadMetaPixel\(\);/);
  assert.match(consent, /Tout refuser/);
  assert.match(consent, /Tout accepter/);
  assert.match(analytics, /localStorage\.getItem\('apexlabs_cookie_consent'\) === 'all'/);
});

test("cookie refusal and acceptance have equal visual weight", () => {
  const consent = read("client/src/components/CookieConsent.tsx");
  const equalClass = "text-white border border-white/30 rounded-sm hover:bg-white/5";
  assert.equal(consent.split(equalClass).length - 1, 2);
});

test("public stats expose rounded display aggregates only", () => {
  const routes = read("server/routes.ts");
  const statsBlock = routes.slice(routes.indexOf('app.get("/api/stats/live"'), routes.indexOf("// Pre-launch diagnostic"));
  assert.match(statsBlock, /publicAggregate: true/);
  assert.match(statsBlock, /clientsServed: publicBucket/);
  assert.doesNotMatch(statsBlock, /\n\s*totalClients,/);
  assert.doesNotMatch(statsBlock, /\n\s*discoveryScans:/);
  assert.doesNotMatch(statsBlock, /\n\s*peptidesProtocols:/);
  assert.doesNotMatch(statsBlock, /\n\s*bloodAnalyses:/);
});

test("FormCheck public copy is fully accented and localized", () => {
  const formCheck = read("client/src/pages/offers/FormCheck.tsx");
  for (const forbidden of ["Packs & Tarifs", "Ideal athletes serieux", "Analyses illimitees", "Commencer a 9,90€", "10 analyses/mois"]) {
    assert.doesNotMatch(formCheck, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(formCheck, /Formules et tarifs/);
  assert.match(formCheck, /Idéal pour les athlètes sérieux/);
  assert.match(formCheck, /Analyses illimitées/);
});

test("Blood Analysis requires and records explicit health-data consent", () => {
  const client = read("client/src/pages/BloodAnalysisStart.tsx");
  const routes = read("server/routes.ts");
  assert.match(client, /healthConsent/);
  assert.match(client, /J’accepte explicitement que mes/);
  assert.match(client, /blood-health-consent-v1/);
  assert.match(routes, /HEALTH_DATA_CONSENT_REQUIRED/);
  assert.match(routes, /healthDataConsent: planType === "BLOOD_ANALYSIS"/);
});

test("unknown pages are real 404/noindex and SARMs remain available but noindex", () => {
  const staticServer = read("server/static.ts");
  assert.match(staticServer, /return res\.status\(404\)\.type\("html"\)\.send\(renderNotFound\(pathname\)\)/);
  assert.match(staticServer, /return res\.status\(404\)\.type\("text\/plain"\)\.send\("Not Found"\)/);
  assert.match(staticServer, /robots: "noindex, follow"/);
  assert.match(staticServer, /const shouldNoindex = category === "sarms"/);
  assert.match(staticServer, /const shouldNoindex = slug === "sarms"/);
});

test("Open Graph fallback is a real 1200x630 PNG", () => {
  const png = readFileSync(path.join(root, "client/public/og-default.png"));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.match(read("client/index.html"), /og-default\.png/);
});

test("medical disclaimer and corrected subscription FAQ are present", () => {
  const disclaimer = read("client/src/components/MedicalDisclaimer.tsx");
  const faq = read("client/src/pages/FAQ.tsx");
  assert.match(disclaimer, /ne remplace ni un diagnostic, ni une prescription/);
  assert.match(faq, /FormCheck est différent : c'est un abonnement mensuel/);
  assert.match(faq, /Peptides Engine \(Solo 199€/);
});
