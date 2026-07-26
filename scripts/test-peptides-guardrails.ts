import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  estimateNeedMg,
  findOperationalPeptidesMissingFromArray,
  validatePeptidesReport,
  type PeptidesReport,
} from "../server/peptidesReportValidator";
import { repairPeptidesReportContent } from "../server/peptidesReportRepair";

const engineSource = readFileSync(new URL("../server/peptidesEngine.ts", import.meta.url), "utf8");
assert.match(engineSource, /PEPTIDES_PRIMARY_MODEL[\s\S]{0,120}"claude-sonnet-4-6"/);
assert.match(engineSource, /PEPTIDES_QUALITY_FALLBACK_MODEL[\s\S]{0,120}"gpt-5\.6-sol"/);
assert.match(engineSource, /effort:\s*"max"/);
assert.match(engineSource, /mode:\s*"pro"/);
assert.match(engineSource, /Candidate rejected[\s\S]{0,600}Switching to quality fallback/);

const now = new Date().toISOString();
const peptide = {
  name: "Retatrutide",
  route: "Sous cutanee uniquement apres accord medical",
  dosage: "Semaine 1 a 1 mg, semaine 2 a 2 mg, semaine 3 a 4 mg, semaines 4 a 12 a 8 mg, une fois par semaine",
  timing: "Jour fixe",
  purpose: "Exemple de verification mathematique, pas une automedication",
  purchaseUrl: "https://www.peptaura.com/catalog/Retatrutide",
  vialsNeeded: "8 vials de 10mg pour 12 semaines, total 79mg",
  priceEstimate: "Environ 8 vials, prix live controle avant livraison",
  cycleDuration: "12 semaines",
  reconstitution: "Vial de 10mg, manipulation uniquement apres formation par un professionnel",
  whyThisPeptide: "Molecule experimentale non approuvee, donnees humaines encore limitees",
};

assert.equal(estimateNeedMg(peptide), 79, "La titration naturelle doit totaliser 79 mg");
assert.equal(
  estimateNeedMg({
    dosage: "150 mcg au coucher",
    cycleDuration: "Cure de 4 semaines",
  }),
  4.2,
  "Une prise au coucher sur 4 semaines doit etre calculee comme quotidienne"
);

const safetyParagraph = [
  "Luca, la retatrutide reste une molecule experimentale non approuvee et ce document ne valide aucune automedication.",
  "Avant tout achat ou toute utilisation, demande a ton medecin ou a ton pharmacien de verifier le produit, la dose, tes allergies et tes analyses.",
].join(" ");

const report: PeptidesReport = {
  clientName: "Luca",
  tier: "solo",
  peptides: [peptide],
  sections: Array.from({ length: 12 }, (_, index) => ({
    id: `section-${index + 1}`,
    title: `Partie ${index + 1}`,
    content: [
      index === 0 ? safetyParagraph : "",
      ...Array.from({ length: 24 }, (_, paragraphIndex) =>
        `Luca, le repere ${index + 1}.${paragraphIndex + 1} relie ton objectif concret a une decision pratique differente; cette explication reste personnalisee, varie son angle et donne assez de contexte pour comprendre le choix sans recopier une formule standard.`
      ),
    ].filter(Boolean).join("\n\n"),
  })),
  weeklySchedule: "Calendrier complet du lundi au dimanche, avec les horaires et les jours de repos.",
  shoppingList: "Aucun achat avant verification du stock, du pays et accord du professionnel.",
  promoCodesGenerated: [],
  _peptauraLiveSync: {
    syncedAt: now,
    catalogRefreshedAt: now,
    shippingLive: true,
    applied: ["Retatrutide"],
    failures: [],
    listingSnapshots: [{
      peptide: "Retatrutide",
      fetchedAt: now,
      supplier: "Fournisseur test",
      dosage: "10mg",
      requestedVials: 8,
      deliveredVials: 8,
      packageCount: 8,
      boxSize: 1,
      totalPriceUsd: 100,
    }],
  },
};

const baseline = validatePeptidesReport(report);
assert.equal(baseline.ok, true, baseline.errors.join("\n"));

const historicalMentionOnly = structuredClone(report);
historicalMentionOnly.sections![1].content += [
  " MK-677 faisait partie de son historique.",
  " MK-677 explique une partie de son retour.",
  " MK-677 n'est pas retenu ici.",
  " MK-677 reste une ancienne experience.",
  " MK-677 sert uniquement de comparaison.",
  " MK-677 ne fait pas partie du stack actif.",
].join("");
assert.deepEqual(
  findOperationalPeptidesMissingFromArray(historicalMentionOnly),
  [],
  "Un peptide historique mentionne dans la narration ne doit pas etre exige dans le stack actif"
);

const truncatedOperationalStack = structuredClone(historicalMentionOnly);
truncatedOperationalStack.weeklySchedule =
  "LUNDI SOIR: DSIP 150 mcg au coucher | MARDI: repos";
truncatedOperationalStack.shoppingList =
  "DSIP 5 mg x 2 vials a commander apres verification du stock";
assert.deepEqual(
  findOperationalPeptidesMissingFromArray(truncatedOperationalStack),
  ["dsip"],
  "Un peptide actif dans le calendrier ou la liste de commande doit exister dans le tableau structure"
);

const explicitlyExcludedOperationalMention = structuredClone(report);
explicitlyExcludedOperationalMention.shoppingList =
  "MK-677 10 mg exclu, ne pas commander";
assert.deepEqual(
  findOperationalPeptidesMissingFromArray(explicitlyExcludedOperationalMention),
  [],
  "Une molecule explicitement exclue ne doit pas declencher une alerte de truncation"
);

const underOrder = structuredClone(report);
underOrder.peptides![0].vialsNeeded = "2 vials de 10mg pour 12 semaines";
const underOrderAudit = validatePeptidesReport(underOrder);
assert.equal(underOrderAudit.ok, false);
assert.match(underOrderAudit.errors.join("\n"), /sous-commande/);

const styleFailure = structuredClone(report);
styleFailure.sections![0].content += ` Tu dois vous preparer${String.fromCharCode(0x2014)}maintenant.`;
const styleAudit = validatePeptidesReport(styleFailure);
assert.equal(styleAudit.ok, false);
assert.match(styleAudit.errors.join("\n"), /ponctuation Unicode interdite/);
assert.match(styleAudit.errors.join("\n"), /vouvoiement interdit/);

const repetitionFailure = structuredClone(report);
const repeatedDisclaimer = "Ce bloc generique est repete partout et donne au rapport une voix artificielle qui ne correspond pas au dossier du client.";
for (let index = 0; index < 5; index++) {
  repetitionFailure.sections![index].content += `\n\n${repeatedDisclaimer}`;
}
const repetitionAudit = validatePeptidesReport(repetitionFailure);
assert.equal(repetitionAudit.ok, false);
assert.match(repetitionAudit.errors.join("\n"), /phrases repetees detectees/);

const repairableRoboticPhrase = structuredClone(report);
repairableRoboticPhrase.sections![0].content += " C'est plus simple que ca en a l'air.";
const repairedRoboticPhrase = repairPeptidesReportContent(
  repairableRoboticPhrase as any,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
const repairedRoboticAudit = validatePeptidesReport(repairedRoboticPhrase);
assert.equal(repairedRoboticAudit.ok, true, repairedRoboticAudit.errors.join("\n"));
assert.doesNotMatch(
  repairedRoboticPhrase.sections[0].content,
  /plus simple que ca en a l'air/i
);

const stale = structuredClone(report);
stale._peptauraLiveSync!.syncedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const staleAudit = validatePeptidesReport(stale);
assert.equal(staleAudit.ok, false);
assert.match(staleAudit.errors.join("\n"), /trop ancien/);

const legacyReport = structuredClone(report) as any;
legacyReport.tier = "standard";
legacyReport.bloodMarkers = [];
legacyReport.peptides[0].cycleDuration = "12 semaines avec descente progressive sur les 4 dernieres semaines";
legacyReport.peptides[0].timing = "Peut etre melange dans la meme seringue avec un autre produit.";
legacyReport.peptides[0].reconstitution = "Vial 10mg + 2ml. Pour 8mg, utilise deux vials et deux injections.";
const repaired = repairPeptidesReportContent(
  legacyReport,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
const repairedAudit = validatePeptidesReport(repaired);
assert.equal(repaired.tier, "solo");
assert.equal(repaired.qualityVersion, "expert-standard-v1");
assert.equal(repaired.sections.length, 12);
assert.ok(repaired.sections.reduce((sum: number, section: any) => sum + section.content.length, 0) >= 30_000);
assert.doesNotMatch(repaired.peptides[0].cycleDuration, /descente progressive/i);
assert.doesNotMatch(repaired.peptides[0].timing, /peut etre melange/i);
assert.match(repaired.peptides[0].reconstitution, /1\.60 ml/);
assert.doesNotMatch(repaired.peptides[0].purpose, /hypothese experimentale/i);
assert.match(repaired.peptides[0].whyThisPeptide, /appetit|perte du gras|titration/i);
assert.equal(repairedAudit.ok, true, repairedAudit.errors.join("\n"));

const unsupportedDescentVariants = [
  "12 semaines, puis une descente progressive sur les 2 dernieres semaines",
  "Cycle de 12 semaines dont 2 semaines de reduction progressive",
  "12 semaines (baisse progressive sur la fin)",
];
for (const cycleDuration of unsupportedDescentVariants) {
  const descentReport = structuredClone(report) as any;
  descentReport.peptides[0].cycleDuration = cycleDuration;
  descentReport.peptides[0].dosage = "1 mg par semaine pendant 12 semaines";
  const repairedDescent = repairPeptidesReportContent(
    descentReport,
    { pep_name: "Luca", pep_country: "France" },
    "solo"
  ) as any;
  assert.doesNotMatch(
    repairedDescent.peptides[0].cycleDuration,
    /descente|diminution progressive|reduction progressive|baisse progressive/i
  );
  const repairedDescentAudit = validatePeptidesReport(repairedDescent);
  assert.equal(
    repairedDescentAudit.ok,
    true,
    repairedDescentAudit.errors.join("\n")
  );
}

const supportedDescent = structuredClone(report) as any;
supportedDescent.peptides[0].cycleDuration =
  "12 semaines avec descente progressive sur les 2 dernieres semaines";
supportedDescent.peptides[0].dosage =
  "1 mg par semaine, puis descente a 0.5 mg les semaines 11 et 12";
const repairedSupportedDescent = repairPeptidesReportContent(
  supportedDescent,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
assert.match(
  repairedSupportedDescent.peptides[0].cycleDuration,
  /descente progressive/i,
  "Une descente detaillee dans le dosage doit rester visible"
);

const hardFlagReport = repairPeptidesReportContent(
  structuredClone(legacyReport),
  { pep_name: "Luca", pep_country: "France", pep_conditions: "Cancer en remission recente" },
  "solo"
) as any;
assert.equal(hardFlagReport.qualityVersion, "medical-review-v1");
assert.equal(hardFlagReport.sections.length, 15);

console.log("Peptides guardrails: OK");
