import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productionRoots = [resolve(repositoryRoot, "server"), resolve(repositoryRoot, "client/src")];
const allowedLiteralSources = new Set([
  "client/src/components/CoachingPromoBanner.tsx",
  "server/emailService.ts",
  "server/routes.ts",
  "server/storage.ts",
]);

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    if (!entry.isFile() || ![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (/\.test\.[^.]+$/u.test(entry.name)) return [];
    return [path];
  });
}

test("DISCOVERY20 exists only on the audited promo surfaces", () => {
  const occurrences = productionRoots
    .flatMap(productionSourceFiles)
    .filter((path) => readFileSync(path, "utf8").includes("DISCOVERY20"))
    .map((path) => relative(repositoryRoot, path))
    .sort();

  assert.deepEqual(occurrences, [...allowedLiteralSources].sort());
});

test("the retired Discovery promotion is absent from production sources", () => {
  const retiredCode = ["DISCOVERY", "30"].join("");
  const occurrences = productionRoots
    .flatMap(productionSourceFiles)
    .filter((path) => readFileSync(path, "utf8").toUpperCase().includes(retiredCode))
    .map((path) => relative(repositoryRoot, path));

  assert.deepEqual(occurrences, []);
});

test("stored Discovery report templates never contain the promo code before approval", () => {
  const reportGenerator = readFileSync(resolve(repositoryRoot, "server/discovery-scan.ts"), "utf8");
  assert.equal(reportGenerator.includes("DISCOVERY20"), false);
  assert.ok(reportGenerator.includes("Laisse un avis validé pour recevoir -20 % par email."));
});

test("public Discovery promo copy limits DISCOVERY20 to coaching 8 and 12 weeks", () => {
  const banner = readFileSync(resolve(repositoryRoot, "client/src/components/CoachingPromoBanner.tsx"), "utf8");
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");

  assert.ok(banner.includes('description: "-20% sur les formules coaching 8 et 12 semaines"'));
  assert.equal(banner.includes("-20% sur toutes les formules coaching"), false);
  assert.ok(emailService.includes("Les 4 semaines ne sont pas éligibles au code DISCOVERY20"));
});

test("every active Discovery CTA email uses the same code, percentage, scope and bridge", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const functions = [
    "sendRecoveryCtaEmail",
    "sendGratuitUpsellEmail",
    "sendGratuitJ5Email",
    "sendGratuitJ7Email",
    "sendDiscoveryJ14CoachingEmail",
    "sendDiscoveryJ30NurtureEmail",
  ];

  for (const name of functions) {
    const start = emailService.indexOf(`export async function ${name}`);
    assert.notEqual(start, -1, name);
    const next = emailService.indexOf("\nexport async function ", start + 1);
    const source = emailService.slice(start, next === -1 ? emailService.length : next);
    assert.ok(source.includes("DISCOVERY20"), `${name}: code`);
    assert.ok(source.includes("-20%"), `${name}: percentage`);
    assert.match(source, /8 (?:et|ou) 12 semaines|8 et 12 sem|8 à 12 semaines/u, `${name}: scope`);
    assert.ok(source.includes("discoveryCoachingBridgeUrl"), `${name}: bridge`);
    assert.equal(source.includes(["DISCOVERY", "30"].join("")), false, `${name}: retired code`);
    assert.equal(source.includes("-30%"), false, `${name}: competing percentage`);
  }
});

test("the coaching bridge exposes only eligible durations at exact 20 percent prices", () => {
  const routes = readFileSync(resolve(repositoryRoot, "server/routes.ts"), "utf8");
  const start = routes.indexOf('app.get("/go/coaching"');
  const end = routes.indexOf("\n  app.", start + 1);
  const bridge = routes.slice(start, end);
  const expected = [
    ["Essential 8 semaines", "319,20 EUR"],
    ["Elite 8 semaines", "519,20 EUR"],
    ["Private Lab 8 semaines", "639,20 EUR"],
    ["Essential 12 semaines", "439,20 EUR"],
    ["Elite 12 semaines", "719,20 EUR"],
    ["Private Lab 12 semaines", "959,20 EUR"],
  ];

  for (const [label, price] of expected) {
    assert.ok(bridge.includes(`label: "${label}"`), label);
    assert.ok(bridge.includes(`after: "${price}"`), price);
  }
  assert.equal(bridge.includes('label: "Essential 4 semaines"'), false);
  assert.equal(bridge.includes('label: "Elite 4 semaines"'), false);
  assert.equal(bridge.includes('label: "Private Lab 4 semaines"'), false);
});

test("banner, mappings, seeds and sequence plan share the 8 and 12 week definition", () => {
  const files = [
    "client/src/components/CoachingPromoBanner.tsx",
    "server/storage.ts",
    "init-db.sql",
    "server/init-db.sql",
    "EMAIL_SEQUENCE_PLAN.md",
  ];
  for (const file of files) {
    const source = readFileSync(resolve(repositoryRoot, file), "utf8");
    assert.ok(source.includes("DISCOVERY20"), `${file}: code`);
    assert.match(source, /8 et 12 semaines|8 ou 12 semaines/u, `${file}: scope`);
    assert.equal(source.includes(["DISCOVERY", "30"].join("")), false, `${file}: retired code`);
  }
  const plan = readFileSync(resolve(repositoryRoot, "EMAIL_SEQUENCE_PLAN.md"), "utf8");
  const discoveryDefinition = plan.slice(plan.indexOf("`{promoCode}`"), plan.indexOf("---", plan.indexOf("`{promoCode}`")));
  assert.ok(discoveryDefinition.includes("-20%"));
  assert.ok(discoveryDefinition.includes("jamais sur les 4 semaines ni sur un scan"));
});
