import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const productionRoots = [resolve(repositoryRoot, "server"), resolve(repositoryRoot, "client/src")];
const allowedLiteralSources = new Set([
  "client/src/components/CoachingPromoBanner.tsx",
  // Discovery v3 shows the -20 % code directly in the report offer section
  // (owner decision 2026-11-18: the review no longer gates the discount).
  "server/discoveryCoachNarrative.ts",
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

test("legacy report templates keep the review-gated copy; v3 reports show the code with its scope and 7-day validity", () => {
  const reportGenerator = readFileSync(resolve(repositoryRoot, "server/discovery-scan.ts"), "utf8");
  assert.equal(reportGenerator.includes("DISCOVERY20"), false);
  assert.ok(reportGenerator.includes("Laisse un avis validé pour recevoir -20 % par email."));

  const coach = readFileSync(resolve(repositoryRoot, "server/discoveryCoachNarrative.ts"), "utf8");
  assert.ok(coach.includes('DISCOVERY_COACH_PROMO_CODE = "DISCOVERY20"'));
  assert.ok(coach.includes("DISCOVERY_COACH_PROMO_VALIDITY_DAYS = 7"));
  assert.ok(coach.includes("sur les formules 8 et 12 semaines (pas sur les 4 semaines)"));
  assert.ok(coach.includes("Il ne conditionne rien, ton code est déjà à toi."));
  assert.equal(coach.includes("4 semaines\", price"), false);
});
test("public Discovery promo copy limits DISCOVERY20 to coaching 8 and 12 weeks", () => {
  const banner = readFileSync(resolve(repositoryRoot, "client/src/components/CoachingPromoBanner.tsx"), "utf8");
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");

  assert.ok(banner.includes('description: "-20% sur les formules coaching 8 et 12 semaines"'));
  assert.equal(banner.includes("-20% sur toutes les formules coaching"), false);
  assert.ok(emailService.includes("Les 4 semaines ne sont pas éligibles au code DISCOVERY20"));
});

function emailFunctionSource(emailService: string, name: string): string {
  const start = emailService.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, name);
  const next = emailService.indexOf("\nexport async function ", start + 1);
  return emailService.slice(start, next === -1 ? emailService.length : next);
}

test("every Discovery CTA email that still carries the code uses the same code, percentage, scope and bridge", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const functions = [
    "sendRecoveryCtaEmail",
    "sendGratuitUpsellEmail",
    "sendGratuitJ5Email",
    "sendGratuitJ7Email",
  ];

  for (const name of functions) {
    const source = emailFunctionSource(emailService, name);
    assert.ok(source.includes("DISCOVERY20"), `${name}: code`);
    assert.ok(source.includes("-20%"), `${name}: percentage`);
    assert.match(source, /8 (?:et|ou) 12 semaines|8 et 12 sem|8 à 12 semaines/u, `${name}: scope`);
    assert.ok(source.includes("discoveryCoachingBridgeUrl"), `${name}: bridge`);
    assert.equal(source.includes(["DISCOVERY", "30"].join("")), false, `${name}: retired code`);
    assert.equal(source.includes("-30%"), false, `${name}: competing percentage`);
  }
});

test("J3, J5 and J7 restate DISCOVERY20 only inside the 7-day report window, with the report's until date", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const stages: Array<[string, string]> = [
    ["sendGratuitUpsellEmail", "j3"],
    ["sendGratuitJ5Email", "j5"],
    ["sendGratuitJ7Email", "j7"],
  ];
  for (const [name, stage] of stages) {
    const source = emailFunctionSource(emailService, name);
    assert.ok(source.includes("offerWindow?: DiscoveryOfferWindow | null"), `${name}: window parameter`);
    assert.ok(source.includes("const offer = activeDiscoveryOffer(offerWindow);"), `${name}: window gate`);
    const gate = source.indexOf("const offer = activeDiscoveryOffer(offerWindow);");
    const fallback = source.indexOf(`sendDiscoveryFollowupWithoutCode("${stage}"`);
    assert.ok(fallback > gate, `${name}: no-code fallback right after the gate`);
    assert.ok(gate < source.indexOf("DISCOVERY20"), `${name}: code appears only after the gate`);
    // The deadline is the report window, never "N days from now".
    assert.equal(source.includes("formatDeadlineFR("), false, `${name}: relative deadline`);
    assert.equal(source.includes("DAYS_LEFT"), false, `${name}: fixed days left`);
    assert.ok(source.includes("const deadlineDate = offer.label;"), `${name}: exact deadline`);
    const bridgeCalls = source.match(/discoveryCoachingBridgeUrl\([^;]*?\)/gu) ?? [];
    assert.ok(bridgeCalls.length > 0, `${name}: bridge calls`);
    for (const call of bridgeCalls) {
      assert.ok(call.includes("offer.untilIso"), `${name}: until= on ${call}`);
    }
    assert.ok(source.includes("withEmailClickTracking(baseUrl, trackingId,"), `${name}: click tracking`);
  }
});

test("J14 and J30 never carry DISCOVERY20 or the discount", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const stages: Array<[string, string]> = [
    ["sendDiscoveryJ14CoachingEmail", "j14"],
    ["sendDiscoveryJ30NurtureEmail", "j30"],
  ];
  for (const [name, stage] of stages) {
    const source = emailFunctionSource(emailService, name);
    assert.ok(source.includes(`sendDiscoveryFollowupWithoutCode("${stage}"`), `${name}: no-code follow-up`);
    assert.equal(source.includes("DISCOVERY20"), false, `${name}: code`);
    assert.equal(/-\s?20\s?%/u.test(source), false, `${name}: discount`);
    assert.equal(source.includes("discoveryCoachingBridgeUrl"), false, `${name}: promo bridge`);
    assert.equal(source.includes("getDiscoveryPromoBanner"), false, `${name}: promo banner`);
  }
});

test("the Discovery follow-up without code follows the content rules and keeps click tracking", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const start = emailService.indexOf("type DiscoveryNoCodeStage");
  const end = emailService.indexOf("\n}\n", emailService.indexOf("async function sendDiscoveryFollowupWithoutCode("));
  assert.ok(start > -1 && end > start);
  const source = emailService.slice(start, end);
  // Executable code only (comments state the rules themselves).
  const code = source.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");

  assert.equal(code.includes("DISCOVERY20"), false, "code");
  assert.equal(/-\s?20\s?%/u.test(code), false, "discount");
  assert.equal(/searchParams\.set\("(?:promo|code)"/u.test(code), false, "promo parameter");
  assert.ok(code.includes("promoCode: null"), "tracking metadata records no code");
  assert.equal(code.includes("/go/coaching"), false, "promo bridge");
  assert.equal(/\b(?:visio|visioconf[ée]rence|appel|t[ée]l[ée]phone|rendez-vous|rdv|zoom|google meet)\b/iu.test(code), false, "visio/appel/RDV");
  assert.equal(/\b\d+(?:[.,]\d+)?\s?(?:mg|g|mcg|µg|ui|iu|ml)\b/iu.test(code), false, "dosage");
  assert.equal(/\bdose|dosage|posologie\b/iu.test(code), false, "dosage wording");
  assert.equal(/\b(?:étude|etude|study|pubmed|publié)\b/iu.test(code), false, "study cited");
  assert.equal(/\bcoach\s+[A-Z][a-z]+/u.test(code), false, "other coach name");
  assert.equal(/\bvous\b/iu.test(code), false, "tutoiement");
  assert.ok(code.includes("/offers/anabolic-bioscan"), "Anabolic Bioscan");
  assert.ok(code.includes("https://www.achzodcoaching.com/formules-coaching"), "coaching at normal price");
  // Every link of the email goes through the first-party click redirect.
  for (const link of ["trackedReportLink", "trackedFormulasLink", "trackedBioscanLink", "trackedTierLink"]) {
    assert.match(code, new RegExp(`const ${link} = [^;]*withEmailClickTracking\\(baseUrl, trackingId,`, "u"), link);
  }
  const hrefs = [...code.matchAll(/href="\$\{([A-Za-z]+)\}"/gu)].map((match) => match[1]);
  for (const href of hrefs) assert.match(href, /^tracked/u, `untracked href ${href}`);
});

test("the report-ready email shows DISCOVERY20 only with a dated window and a bridge link with until=", () => {
  const emailService = readFileSync(resolve(repositoryRoot, "server/emailService.ts"), "utf8");
  const sectionStart = emailService.indexOf("function getCoachingSection(");
  const section = emailService.slice(sectionStart, emailService.indexOf("\nexport async function ", sectionStart));
  assert.ok(section.includes("const discoveryPromo = isDiscovery && discoveryOffer"), "code gated on the window");
  assert.ok(section.includes("Valable 7 jours, jusqu'au"), "dated validity");

  const ready = emailFunctionSource(emailService, "sendReportReadyEmail");
  assert.ok(ready.includes("resolveDiscoveryOfferWindow({ reportSentAt: new Date() })"), "window starts at delivery");
  assert.match(ready, /discoveryCoachingBridgeUrl\([^;]*discoveryWindow\.untilIso\)/u, "bridge link with until=");
  assert.ok(ready.includes("getCoachingSection(auditType, planColor, trackLink, discoveryOffer)"), "tracked coaching section");
});

test("the sequence schedulers hand J3, J5 and J7 the report-based offer window", () => {
  const routes = readFileSync(resolve(repositoryRoot, "server/routes.ts"), "utf8");
  for (const name of ["sendGratuitUpsellEmail", "sendGratuitJ5Email", "sendGratuitJ7Email"]) {
    const calls = routes.match(new RegExp(`await ${name}\\([\\s\\S]*?\\);`, "gu")) ?? [];
    assert.ok(calls.length > 0, name);
    for (const call of calls) {
      assert.match(call, /offerWindow|loadDiscoveryOfferWindow/u, `${name}: ${call}`);
    }
  }
  assert.ok(routes.includes('import { loadDiscoveryOfferWindow } from "./discoveryOfferWindow";'));
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
