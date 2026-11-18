import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDiscoveryCoachProviderRequest,
  buildDiscoveryReportAssets,
  calculateDiscoveryDeterministicProfile,
  generateDiscoveryCoachNarrative,
  isDiscoveryRejectedCandidateError,
  validateDiscoveryCoachCandidateForDelivery,
  validateDiscoveryPersistenceContract,
  validateDiscoveryReportAgainstResponses,
  type DiscoveryCoachProvider,
} from "./discovery-scan";
import {
  DISCOVERY_COACH_SECTION_IDS,
  describeDiscoveryAnswer,
  discoveryCoachNarrativeSha256,
  findDiscoveryRawCodes,
  sanitizeDiscoveryFreeText,
  validateDiscoveryCoachNarrative,
} from "./discoveryCoachNarrative";
import {
  DISCOVERY_COACH_FIXTURE_NARRATIVE,
  DISCOVERY_COACH_FIXTURE_RESPONSES,
} from "./discoveryCoachNarrative.fixture";

const R = DISCOVERY_COACH_FIXTURE_RESPONSES as any;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const GENERATED_AT = "2026-11-18T12:00:00.000Z";

function provenanceFor(narrative: unknown) {
  return {
    version: "discovery-coach-v3" as const,
    providerResponseId: "resp_fixture",
    narrativeSha256: discoveryCoachNarrativeSha256(narrative),
    attempts: 1,
  };
}

function validate(narrative: unknown) {
  const deterministic = calculateDiscoveryDeterministicProfile(R);
  const { answerIds } = buildDiscoveryCoachProviderRequest(R);
  return validateDiscoveryCoachNarrative(narrative, {
    responses: deterministic.normalized as Record<string, unknown>,
    safety: { strictEatingSafety: true, tcaMode: "history", hasMedicalContext: false },
    answerIds,
  });
}

function providerReturning(...candidates: unknown[]): { provider: DiscoveryCoachProvider; calls: number[] } {
  const calls: number[] = [];
  const provider: DiscoveryCoachProvider = async (request) => {
    calls.push(request.attempt);
    const candidate = candidates[Math.min(calls.length - 1, candidates.length - 1)];
    return {
      text: typeof candidate === "string" ? candidate : JSON.stringify(candidate),
      responseId: `resp_${calls.length}`,
      model: "gpt-test",
      inputTokens: 2500,
      outputTokens: 3500,
      totalTokens: 6000,
      actualCostUsd: 0.12,
    };
  };
  return { provider, calls };
}

test("provider input carries French answers, scores and free texts but no identity data", () => {
  const { request, answerIds } = buildDiscoveryCoachProviderRequest(R);
  const sent = `${request.instructions}\n${request.input}`;
  assert.doesNotMatch(sent, /Lina|lina\.test@example\.org|lina_fit/);
  assert.match(request.input, /moins d'1 litre d'eau par jour/);
  assert.match(request.input, /Ventre plat, forte et tonique, Mentalement plus forte/);
  assert.match(request.input, /Entraînement \(score 2\/10\)/);
  assert.match(request.input, /SIGNAUX REPÉRÉS/);
  assert.match(request.instructions, /\[PRENOM\]/);
  // TCA history: internal, never-to-be-mentioned caution instruction.
  assert.match(request.instructions, /CONSIGNE INTERNE CONFIDENTIELLE/);
  assert.match(request.instructions, /aucun chiffre de calories/);
  assert.ok(answerIds.includes("eau-jour"));
  assert.equal(answerIds.includes("tca-historique"), false);
  assert.equal(answerIds.includes("traitement-medical"), false);
  assert.equal(request.maxOutputTokens, 6_000);
});

test("free texts are stripped of emails, handles, phones, links and the first name", () => {
  const cleaned = sanitizeDiscoveryFreeText(
    "Lina veut changer, ecris a lina.test@example.org ou @lina_fit, 06 12 34 56 78, https://x.y/z",
    R,
  );
  assert.doesNotMatch(cleaned, /Lina|example\.org|lina_fit|12 34 56|https/);
});

test("every typed answer used by the report has a natural French phrase", () => {
  assert.equal(describeDiscoveryAnswer("eau-jour", "moins-1L", R), "moins d'1 litre d'eau par jour");
  assert.equal(describeDiscoveryAnswer("energie-aprem", "baisse-moderee", R), "une baisse d'énergie modérée l'après-midi");
  assert.equal(describeDiscoveryAnswer("transit", "constipe", R), "un transit lent, souvent avec de la constipation");
  assert.equal(describeDiscoveryAnswer("proteines-jour", "inconnu", R), "aucune idée de la quantité de protéines que tu manges");
  assert.equal(describeDiscoveryAnswer("cafe-jour", "1-2", R), "1 à 2 cafés par jour");
  assert.equal(describeDiscoveryAnswer("heures-assis", "6-8h", R), "6 à 8 heures assise par jour");
  const { request } = buildDiscoveryCoachProviderRequest(R);
  for (const line of request.input.split("\n").filter((value) => /^\s+\[/.test(value))) {
    assert.deepEqual(findDiscoveryRawCodes(line.replace(/^\s+\[[^\]]+\]\s*/, "")), [], line);
  }
});

test("the fixture narrative passes every delivery, factual and persistence gate", () => {
  const validation = validate(DISCOVERY_COACH_FIXTURE_NARRATIVE);
  assert.deepEqual(validation.errors, []);
  assert.ok(validation.wordCount >= 850 && validation.wordCount <= 1_550, String(validation.wordCount));

  const assembled = validateDiscoveryCoachCandidateForDelivery(
    R, DISCOVERY_COACH_FIXTURE_NARRATIVE as any, provenanceFor(DISCOVERY_COACH_FIXTURE_NARRATIVE), GENERATED_AT,
  );
  assert.deepEqual(assembled.errors, []);
  const report = assembled.report!;
  assert.deepEqual(report.sections.map((section) => section.id), [...DISCOVERY_COACH_SECTION_IDS]);
  assert.equal(report.generationQuality?.version, 3);
  assert.equal(report.metrics.length, 8);

  const visible = report.sections.map((section) => section.content.replace(/<[^>]+>/g, " ")).join("\n");
  assert.match(visible, /^\s*Lina, tu m'as écrit/m);
  assert.doesNotMatch(visible, /\[PRENOM\]/);
  assert.deepEqual(findDiscoveryRawCodes(visible), []);
  assert.doesNotMatch(visible, /toute recommandation nutritionnelle doit rester encadrée|non chiffrée/);
  assert.doesNotMatch(visible, /\b\d+\s*(?:mg|UI|kcal)\b/i);
  assert.match(visible, /Ce qui me fait dire ça : aucune séance de sport dans la semaine/);
  // Offer: Bioscan + coaching -20 %, 7-day validity, review after the offer and not a condition.
  const offer = report.sections.find((section) => section.id === "offre")!.content;
  assert.match(offer, /Anabolic Bioscan/);
  assert.match(offer, /59 €/);
  assert.match(offer, /DISCOVERY20/);
  assert.match(offer, /Valable 7 jours, jusqu'au 25 novembre 2026/);
  assert.match(offer, /until=2026-11-25/);
  assert.match(offer, /319,20 €/);
  assert.doesNotMatch(offer, /4 semaines<\/td>/);
  assert.ok(offer.indexOf("DISCOVERY20") < offer.indexOf("ton avis"));
  assert.match(offer, /Il ne conditionne rien/);
  // The "3 freins" count is the only count announced, everywhere.
  assert.doesNotMatch(visible, /\b\d+\s+blocages?\b/i);

  const assets = buildDiscoveryReportAssets(report);
  const deterministic = calculateDiscoveryDeterministicProfile(R);
  const persisted = {
    ...report,
    validationResult: {
      deliveryGate: { name: "discovery_delivery", version: 4, ok: true, errors: [], checkedAt: GENERATED_AT, retryable: false },
    },
  };
  const persistence = validateDiscoveryPersistenceContract({
    narrativeReport: persisted,
    scores: { ...deterministic.scoresByDomain, global: deterministic.globalScore },
    txt: assets.txt,
    html: assets.html,
    responses: R,
  });
  assert.deepEqual(persistence.errors, []);
  assert.doesNotMatch(assets.txt, /&#39;|&quot;/);
});

test("a tampered persisted narrative fails the deterministic reconstruction gate", () => {
  const assembled = validateDiscoveryCoachCandidateForDelivery(
    R, DISCOVERY_COACH_FIXTURE_NARRATIVE as any, provenanceFor(DISCOVERY_COACH_FIXTURE_NARRATIVE), GENERATED_AT,
  );
  const report = clone(assembled.report!);
  report.sections[1].content = "<p>Texte modifié après validation, sans lien avec la narration scellée du rapport.</p>";
  const result = validateDiscoveryReportAgainstResponses(report, R, report.analysisMetadata);
  assert.ok(result.errors.includes("report:coach_deterministic_reconstruction_mismatch"), result.errors.join("|"));

  const hashed = clone(assembled.report!);
  (hashed.analysisMetadata as any).coachNarrative.offre += " Ajout.";
  const hashResult = validateDiscoveryReportAgainstResponses(hashed, R, hashed.analysisMetadata);
  assert.ok(hashResult.errors.includes("coach:coach_narrative_hash_mismatch"), hashResult.errors.join("|"));
});

test("validator rejects raw codes, dosages, products, studies, other coaches, calls and internal notes", () => {
  const cases: Array<[string, (narrative: any) => void, RegExp]> = [
    ["raw code", (n) => { n.lecture += " Ton énergie est baisse-moderee."; }, /raw_code:baisse-moderee/],
    ["numeric range", (n) => { n.domaines.lifestyle = n.domaines.lifestyle.replace("Bureau assise", "Bureau 6-8h assise"); }, /raw_code:numeric_range/],
    ["dosage", (n) => { n.actions[0].texte += " Prends 300 mg le soir."; }, /forbidden:dosage_unit/],
    ["supplement", (n) => { n.domaines.sommeil += " Ajoute du magnésium."; }, /forbidden:substance/],
    ["peptide", (n) => { n.offre += " Les peptides aident aussi."; }, /forbidden:substance/],
    ["study", (n) => { n.lecture += " Selon une étude récente, c'est fréquent."; }, /forbidden:study_or_source/],
    ["brand", (n) => { n.actions[1].texte += " Utilise MyFitnessPal."; }, /forbidden:brand_or_app/],
    ["diagnosis", (n) => { n.domaines.digestion += " Tu as sûrement un syndrome de l'intestin irritable."; }, /forbidden:diagnosis/],
    ["other coach", (n) => { n.offre += " Mon associé, coach Julien, te suivra."; }, /forbidden:other_coach/],
    ["call", (n) => { n.offre += " Réserve un appel en visio."; }, /forbidden:call_or_meeting/],
    ["internal note", (n) => { n.offre += " Pour ton profil, toute recommandation nutritionnelle doit rester encadrée et non chiffrée."; }, /forbidden:internal_note/],
    ["tca restriction", (n) => { n.actions[2].texte += " Supprime les gâteaux pendant un mois."; }, /forbidden:tca_restriction/],
    ["tca calories", (n) => { n.lecture += " Réduis tes calories."; }, /forbidden:calories/],
    ["action quantity", (n) => { n.actions[1].texte += " Vise 2 litres par jour."; }, /forbidden:action_quantity/],
    ["first name token twice", (n) => { n.intro += " [PRENOM], vas-y."; }, /first_name_token_count:2\/1/],
    ["own words", (n) => { n.intro = "[PRENOM], j'ai lu ton dossier en détail. " + "Ton objectif est clair et ce scan va t'aider à avancer avec méthode et régularité chaque semaine. ".repeat(4); }, /intro:own_words_missing/],
    ["voice", (n) => { n.dans_6_mois = n.dans_6_mois.replace("Si tu t'y mets avec moi", "Si on s'y met"); }, /forbidden:voice_on_nous/],
    ["price", (n) => { n.offre += " Le Bioscan coûte 59 €."; }, /forbidden:price_or_code/],
  ];
  for (const [label, mutate, expected] of cases) {
    const narrative = clone(DISCOVERY_COACH_FIXTURE_NARRATIVE);
    mutate(narrative);
    const result = validate(narrative);
    assert.equal(result.ok, false, label);
    assert.ok(result.errors.some((error) => expected.test(error)), `${label}: ${result.errors.join("|")}`);
  }
  const wrongCount = clone(DISCOVERY_COACH_FIXTURE_NARRATIVE) as any;
  wrongCount.freins.pop();
  assert.deepEqual(validate(wrongCount).errors, ["json:freins_count"]);
  const badIds = clone(DISCOVERY_COACH_FIXTURE_NARRATIVE) as any;
  badIds.freins[0].reponses = ["prenom", "email"];
  assert.ok(validate(badIds).errors.includes("frein1.reponses_invalid"));
});

test("one corrective retry: a rejected first candidate is regenerated once, with its errors", async () => {
  const bad = clone(DISCOVERY_COACH_FIXTURE_NARRATIVE) as any;
  bad.lecture += " Ton transit est constipe.";
  const seenInputs: string[] = [];
  const { provider, calls } = providerReturning(bad, DISCOVERY_COACH_FIXTURE_NARRATIVE);
  const outcome = await generateDiscoveryCoachNarrative(R, async (request) => {
    seenInputs.push(request.input);
    return provider(request);
  }, { generatedAt: GENERATED_AT });
  assert.deepEqual(calls, [1, 2]);
  assert.equal(outcome.coachProvenance.attempts, 2);
  assert.equal(outcome.coachProvenance.providerResponseId, "resp_2");
  assert.equal(outcome.providerEvidence.attemptsActualCostUsd, 0.24);
  assert.match(seenInputs[1], /TA VERSION PRÉCÉDENTE A ÉTÉ REFUSÉE/);
  assert.match(seenInputs[1], /code brut interdit \(constipe\)/);
});

test("two rejected candidates stop after exactly two provider calls and fail closed", async () => {
  const bad = clone(DISCOVERY_COACH_FIXTURE_NARRATIVE) as any;
  bad.offre += " Prends 5 mg de mélatonine.";
  const { provider, calls } = providerReturning(bad, "not json");
  let caught: unknown;
  try {
    await generateDiscoveryCoachNarrative(R, provider, { generatedAt: GENERATED_AT });
  } catch (error) {
    caught = error;
  }
  assert.deepEqual(calls, [1, 2]);
  assert.ok(isDiscoveryRejectedCandidateError(caught));
  assert.match(String((caught as Error).message), /attempt1:forbidden:dosage_unit:offre/);
  assert.match(String((caught as Error).message), /attempt2:json:invalid/);
});

test("budget, idempotence and single-send guards are preserved around the v3 retry", () => {
  const scan = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");
  const budget = readFileSync(new URL("./aiCostBudgetController.ts", import.meta.url), "utf8");
  assert.match(scan, /estimatedCostUsd: DISCOVERY_COACH_MAX_COST_PER_CALL_USD/);
  assert.match(scan, /discoveryValidationRetry: request\.attempt > 1/);
  assert.match(scan, /if \(request\.attempt > 1 && !hasGenericOwnership\)/);
  assert.match(budget, /DISCOVERY_PER_CALL_RESERVATION_USD = 0\.25/);
  assert.match(budget, /perOrderUsd: 0\.75/);
  assert.match(budget, /validationRetryAuthorized = hasGenericOwnership\s*&& context\.discoveryValidationRetry === true\s*&& previousCount === 1\s*&& unsettled === 0/);
  assert.match(budget, /DISCOVERY_MONO_CALL_ALREADY_RESERVED/);
});

test("report-ready email links go through the first-party click tracker", () => {
  const email = readFileSync(new URL("./emailService.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = email.indexOf("export async function sendReportReadyEmail(");
  const body = email.slice(start, email.indexOf("\nexport async function ", start + 1));
  assert.match(body, /const trackedReportLink = withEmailClickTracking\(baseUrl, pixelTrackingId, reportLink\)/);
  assert.match(body, /getPrimaryButton\('Consulter le rapport', trackedReportLink/);
  assert.match(body, /getReviewSection\(reportLink, trackedReviewLink\)/);
  assert.match(body, /getCoachingSection\(auditType, planColor, trackLink\)/);
  assert.match(body, /<a href="\$\{trackedReportLink\}"/);
  assert.match(routes, /isApexReportDestination =[\s\S]{0,200}\(\?:scan\|anabolic\|ultimate\|analysis\|offers\)/);
  assert.match(routes, /"apexlabs\.onrender\.com"/);
});

test("the coaching bridge stops handing out the code after the report's validity date", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = routes.indexOf('app.get("/go/coaching"');
  const bridge = routes.slice(start, routes.indexOf("\n  app.", start + 1));
  assert.match(bridge, /const untilRaw = String\(req\.query\.until \|\| ""\)\.trim\(\)/);
  assert.match(bridge, /if \(todayParis > untilRaw\)/);
  assert.match(bridge, /res\.status\(410\)/);
});
