// DISCOVERY20 window for the emails outside the J3/J5/J7 sequence:
// recovery CTA (all cohorts, clicked_no_conversion included), formula-choice
// lead, and the Discovery review reward. Owner rule (2026-11-18): the code is
// valid 7 days after the report delivery (report_sent_at + 7 days, Paris
// time, last day included), everywhere. Nothing here sends an email.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DISCOVERY_OFFER_AUDIT_TYPES,
  LATEST_DISCOVERY_REPORT_SQL,
  activeDiscoveryOffer,
  loadDiscoveryOfferWindowForEmail,
} from "./discoveryOfferWindow";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const emailService = read("server/emailService.ts");
const routes = read("server/routes.ts");

const SENT_AT = new Date(Date.UTC(2026, 10, 18, 10, 0, 0)); // delivered 18 Nov 2026
const inside = new Date(Date.UTC(2026, 10, 21, 9, 0, 0)); // 21 Nov
const lastDay = new Date(Date.UTC(2026, 10, 25, 21, 0, 0)); // 25 Nov, 22:00 Paris
const after = new Date(Date.UTC(2026, 10, 25, 23, 30, 0)); // 26 Nov, 00:30 Paris

// ---------------------------------------------------------------------------
// Behaviour: window of a recipient known only by email
// ---------------------------------------------------------------------------

test("a recipient's window is the latest delivered Discovery report + 7 days", async () => {
  const seen: string[] = [];
  const find = async (email: string) => {
    seen.push(email);
    return { id: "audit-1", reportSentAt: SENT_AT };
  };
  const getAudit = async () => ({ narrativeReport: null });

  const during = await loadDiscoveryOfferWindowForEmail("  Lead@Example.COM ", find, getAudit, inside);
  assert.ok(during);
  assert.equal(during.untilIso, "2026-11-25");
  assert.equal(during.label, "mercredi 25 novembre 2026");
  assert.equal(during.active, true);
  assert.ok(activeDiscoveryOffer(during));
  assert.equal(seen[0], "lead@example.com", "email normalized before lookup");

  const last = await loadDiscoveryOfferWindowForEmail("lead@example.com", find, getAudit, lastDay);
  assert.equal(last?.active, true, "last day included (Paris time)");

  const over = await loadDiscoveryOfferWindowForEmail("lead@example.com", find, getAudit, after);
  assert.equal(over?.untilIso, "2026-11-25");
  assert.equal(over?.active, false);
  assert.equal(activeDiscoveryOffer(over), null, "clicked_no_conversion and every cohort lose the code after the window");
});

test("no delivered Discovery report, or a failed lookup, means no window and no code", async () => {
  const getAudit = async () => null;
  assert.equal(await loadDiscoveryOfferWindowForEmail("a@b.co", async () => null, getAudit, inside), null);
  assert.equal(await loadDiscoveryOfferWindowForEmail("a@b.co", async () => ({ id: "x", reportSentAt: null }), getAudit, inside), null);
  assert.equal(
    await loadDiscoveryOfferWindowForEmail("a@b.co", async () => { throw new Error("db down"); }, getAudit, inside),
    null,
  );
  assert.equal(await loadDiscoveryOfferWindowForEmail("", async () => ({ id: "x", reportSentAt: SENT_AT }), getAudit, inside), null);
});

test("an earlier until= printed in the stored report still wins for email recipients", async () => {
  const window = await loadDiscoveryOfferWindowForEmail(
    "lead@example.com",
    async () => ({ id: "audit-1", reportSentAt: SENT_AT }),
    async () => ({ narrativeReport: { offer: "https://apexlabs.achzodcoaching.com/go/coaching?code=DISCOVERY20&until=2026-11-23" } }),
    inside,
  );
  assert.equal(window?.untilIso, "2026-11-23");
});

test("the recipient lookup only reads delivered Discovery reports, latest first", () => {
  assert.deepEqual([...DISCOVERY_OFFER_AUDIT_TYPES], ["GRATUIT", "DISCOVERY"]);
  assert.match(LATEST_DISCOVERY_REPORT_SQL, /LOWER\(email\) = \$1/u);
  assert.match(LATEST_DISCOVERY_REPORT_SQL, /type = ANY\(\$2::text\[\]\)/u);
  assert.match(LATEST_DISCOVERY_REPORT_SQL, /report_sent_at IS NOT NULL/u);
  assert.match(LATEST_DISCOVERY_REPORT_SQL, /ORDER BY report_sent_at DESC\s+LIMIT 1/u);
});

// ---------------------------------------------------------------------------
// Source: the emails gate the code on the window
// ---------------------------------------------------------------------------

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, endMarker);
  return source.slice(start, end);
}

const codeOnly = (source: string) => source.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");

test("recovery CTA and formula-choice emails show DISCOVERY20 only inside the window, with its exact date and until=", () => {
  const variants: Array<[string, string, string]> = [
    [
      "sendRecoveryCtaEmail",
      sliceBetween(emailService, "export async function sendRecoveryCtaEmail(", "// Recovery CTA WITHOUT code"),
      "sendRecoveryCtaEmailWithoutCode(email, opts)",
    ],
    [
      "sendCoachingFormulaChoiceLeadEmail",
      sliceBetween(emailService, "export async function sendCoachingFormulaChoiceLeadEmail(", "function coachingFormulaContextRows("),
      "sendCoachingFormulaChoiceLeadEmailWithoutCode(email, lead, opts)",
    ],
  ];
  for (const [name, source, fallback] of variants) {
    assert.ok(source.includes("offerWindow?: DiscoveryOfferWindow | null"), `${name}: window parameter`);
    const gate = source.indexOf("const offer = activeDiscoveryOffer(opts.offerWindow);");
    assert.ok(gate > -1, `${name}: window gate`);
    assert.ok(source.indexOf(fallback) > gate, `${name}: no-code fallback right after the gate`);
    assert.ok(gate < source.indexOf("DISCOVERY20"), `${name}: code appears only after the gate`);
    assert.ok(source.includes("const deadlineDate = offer.label;"), `${name}: exact deadline`);
    assert.equal(source.includes("formatDeadlineFR("), false, `${name}: relative deadline`);
    assert.equal(source.includes("expiresText"), false, `${name}: own validity text`);
    assert.equal(/\b(?:72 heures|5 jours)\b/u.test(source), false, `${name}: own validity`);
    const bridgeCalls = source.match(/discoveryCoachingBridgeUrl\([^;]*?\)/gu) ?? [];
    assert.ok(bridgeCalls.length > 0, `${name}: bridge calls`);
    for (const call of bridgeCalls) assert.ok(call.includes("offer.untilIso"), `${name}: until= on ${call}`);
    assert.ok(source.includes("withEmailClickTracking(opts.baseUrl, opts.trackingId,"), `${name}: click tracking`);
    assert.ok(source.includes('offerVariant: "code"') && source.includes("offerUntil: offer.untilIso"), `${name}: metadata`);
  }
  assert.equal(emailService.includes("function formatDeadlineFR("), false, "no more 'N days from now' deadline helper");
});

test("the versions without code follow the content rules, point to normal-price coaching or the 59 € Bioscan, and keep click tracking", () => {
  const sections: Array<[string, string]> = [
    ["recovery CTA", sliceBetween(emailService, "const RECOVERY_NO_CODE_SUBJECT", "\nexport async function ")],
    ["formula choice", sliceBetween(emailService, "async function sendCoachingFormulaChoiceLeadEmailWithoutCode(", "\n// Reactivation campaign")],
    ["review thanks", sliceBetween(emailService, "async function sendDiscoveryReviewThanksWithoutCode(", "\n// Admin notification when a new review is submitted")],
  ];
  for (const [name, section] of sections) {
    const code = codeOnly(section);
    assert.equal(code.includes("DISCOVERY20"), false, `${name}: code`);
    assert.equal(/-\s?20\s?%/u.test(code), false, `${name}: discount`);
    assert.equal(code.includes("discoveryCoachingBridgeUrl"), false, `${name}: promo bridge`);
    assert.equal(code.includes("/go/coaching"), false, `${name}: promo bridge path`);
    assert.equal(code.includes("getDiscoveryPromoBanner"), false, `${name}: promo banner`);
    assert.equal(/searchParams\.set\("(?:promo|code)"/u.test(code), false, `${name}: promo parameter`);
    assert.ok(code.includes("promoCode: null"), `${name}: metadata records no code`);
    assert.ok(code.includes('offerVariant: "no_code"'), `${name}: metadata variant`);
    assert.ok(code.includes("/offers/anabolic-bioscan"), `${name}: Anabolic Bioscan`);
    assert.ok(code.includes("59 €"), `${name}: Bioscan price`);
    assert.ok(code.includes("https://www.achzodcoaching.com/formules-coaching"), `${name}: coaching at normal price`);
    assert.equal(/\b(?:visio|visioconf[ée]rence|appel|t[ée]l[ée]phone|rendez-vous|rdv|zoom|google meet)\b/iu.test(code), false, `${name}: visio/appel/RDV`);
    assert.equal(/\b\d+(?:[.,]\d+)?\s?(?:mg|g|mcg|µg|ui|iu|ml)\b/iu.test(code), false, `${name}: dosage`);
    assert.equal(/\b(?:dose|dosage|posologie)\b/iu.test(code), false, `${name}: dosage wording`);
    assert.equal(/\b(?:étude|etude|study|pubmed|publié)\b/iu.test(code), false, `${name}: study cited`);
    assert.equal(/\bcoach\s+[A-Z][a-z]+/u.test(code), false, `${name}: other coach name`);
    assert.equal(/\bvous\b/iu.test(code), false, `${name}: tutoiement`);
    assert.match(code, /trackedFormulasLink = [^;]*withEmailClickTracking\(baseUrl, trackingId, formulasLink\)/u, `${name}: tracked formulas`);
    assert.match(code, /trackedBioscanLink = [^;]*withEmailClickTracking\(baseUrl, trackingId, bioscanLink\)/u, `${name}: tracked Bioscan`);
    // Every href goes through the click redirect, except the questionnaire
    // resume link (its host is not on the redirect allow-list, as before).
    const hrefs = [...code.matchAll(/href="\$\{([A-Za-z]+)\}"/gu)].map((match) => match[1]);
    for (const href of hrefs) assert.match(href, /^tracked/u, `${name}: untracked href ${href}`);
  }
});

test("the Discovery review reward follows the same window", () => {
  const source = sliceBetween(emailService, "export async function sendPromoCodeEmail(", "\nconst DISCOVERY_DEFAULT_BASE_URL");
  const gate = source.indexOf('const offer = isDiscoveryCode ? activeDiscoveryOffer(discovery?.offerWindow) : null;');
  assert.ok(gate > -1, "window gate");
  const fallback = source.indexOf("sendDiscoveryReviewThanksWithoutCode(");
  assert.ok(fallback > gate, "no-code thank-you right after the gate");
  assert.match(source, /discoveryCoachingBridgeUrl\([^;]*offer\.untilIso\)/u, "bridge with until=");
  assert.ok(source.includes("Valable jusqu'au"), "exact deadline");

  const approve = sliceBetween(routes, 'app.post("/api/admin/reviews/:reviewId/approve"', "\n  app.");
  assert.ok(approve.includes("loadDiscoveryOfferWindow("), "window loaded from the reviewed audit");
  assert.match(approve, /sendPromoCodeEmail\([\s\S]*?discovery\s*\)/u, "window handed to the email");
  assert.ok(approve.includes("if (emailSent && codeIncluded)"), "code marked as sent only when it was in the email");
});

test("the campaign routes hand every recovery and formula-choice email the recipient's window", () => {
  assert.ok(routes.includes('import { discoveryOfferWindowForRecipient } from "./discoveryOfferRecipient";'));
  for (const name of ["sendRecoveryCtaEmail", "sendCoachingFormulaChoiceLeadEmail"]) {
    const calls = routes.match(new RegExp(`await ${name}\\([\\s\\S]*?\\);`, "gu")) ?? [];
    assert.ok(calls.length > 0, name);
    for (const call of calls) {
      assert.match(call, /offerWindow/u, `${name}: ${call}`);
      assert.equal(call.includes("expiresText"), false, `${name}: own validity`);
    }
  }
  const recipientGlue = read("server/discoveryOfferRecipient.ts");
  assert.ok(recipientGlue.includes("LATEST_DISCOVERY_REPORT_SQL"));
  assert.ok(recipientGlue.includes("loadDiscoveryOfferWindowForEmail("));
});
