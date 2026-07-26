import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateBacWaterNeedMl,
  estimateNeedMg,
  findOperationalPeptidesMissingFromArray,
  findStructuredPeptideCoverageIssues,
  validatePeptidesReport,
  type PeptidesReport,
} from "../server/peptidesReportValidator";
import {
  pruneUnintegratedBonusPeptides,
  repairPeptidesReportContent,
} from "../server/peptidesReportRepair";
import { splitWeeklyScheduleEntries } from "../client/src/lib/peptidesSchedule";

const engineSource = readFileSync(new URL("../server/peptidesEngine.ts", import.meta.url), "utf8");
assert.match(engineSource, /PEPTIDES_PRIMARY_MODEL[\s\S]{0,120}"claude-sonnet-4-6"/);
assert.match(engineSource, /PEPTIDES_QUALITY_FALLBACK_MODEL[\s\S]{0,120}"gpt-5\.6-sol"/);
assert.match(engineSource, /effort:\s*"max"/);
assert.match(engineSource, /mode:\s*"pro"/);
assert.match(engineSource, /Candidate rejected[\s\S]{0,600}Switching to quality fallback/);

const renderedScheduleEntries = splitWeeklyScheduleEntries(
  "LUNDI SOIR: CJC 200 mcg | MERCREDI SOIR: CJC 200 mcg | DIMANCHE MATIN: Retatrutide (S1: 20 unites | S2: 40 unites | S3: 80 unites)"
);
assert.equal(renderedScheduleEntries.length, 3);
assert.match(
  renderedScheduleEntries[2],
  /S1: 20 unites \| S2: 40 unites \| S3: 80 unites/,
  "Le tableau ne doit pas couper une titration qui contient des pipes"
);

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
assert.equal(
  calculateBacWaterNeedMl({
    peptides: [
      {
        name: "Retatrutide",
        vialsNeeded: "8 vials de 10mg",
        reconstitution: "Vial 10mg + 2ml BAC water",
      },
      {
        name: "CJC-1295 + Ipamorelin",
        vialsNeeded: "1 vial de 10mg",
        reconstitution: "Vial 10mg + 2ml BAC water",
      },
      {
        name: "DSIP",
        vialsNeeded: "1 vial de 5mg",
        reconstitution: "Vial 5mg + 1ml BAC water",
      },
    ],
  }),
  19,
  "La BAC water doit couvrir chaque vial du cycle, pas seulement le premier vial ouvert"
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
  weeklySchedule: "JEUDI: Retatrutide 1 mg, injection hebdomadaire selon la titration.",
  shoppingList: "Retatrutide: 8 vials de 10mg, stock et pays a verifier avant achat.",
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

const coherentCoverage = structuredClone(report);
coherentCoverage.sections![0].id = "rationale";
coherentCoverage.sections![0].title = "Pourquoi ce choix";
coherentCoverage.sections![0].content += " Retatrutide relie le choix a l'objectif prioritaire.";
coherentCoverage.sections![1].id = "reconstitution-guide";
coherentCoverage.sections![1].title = "Guide de reconstitution";
coherentCoverage.sections![1].content +=
  ` Retatrutide garde une fiche de reconstitution distincte: ${peptide.reconstitution}.`;
coherentCoverage.sections![2].id = "protocole-pratique";
coherentCoverage.sections![2].title = "Protocole pratique";
coherentCoverage.sections![2].content +=
  ` Retatrutide. Dose: ${peptide.dosage}. Duree: ${peptide.cycleDuration}.`;
assert.deepEqual(
  findStructuredPeptideCoverageIssues(coherentCoverage),
  [],
  "Chaque peptide structure doit etre couvert par les sections operationnelles"
);

const missingCoverage = structuredClone(coherentCoverage);
missingCoverage.weeklySchedule = "LUNDI: repos";
missingCoverage.sections![2].content =
  "Calendrier sans molecule active, uniquement des jours de repos.";
assert.match(
  findStructuredPeptideCoverageIssues(missingCoverage).join("\n"),
  /absent du calendrier operationnel/
);

const unresolvedOperationalPlaceholder = structuredClone(report);
unresolvedOperationalPlaceholder.weeklySchedule =
  "LUNDI: Retatrutide [dose selon semaine]";
const unresolvedOperationalPlaceholderAudit = validatePeptidesReport(
  unresolvedOperationalPlaceholder
);
assert.equal(unresolvedOperationalPlaceholderAudit.ok, false);
assert.match(
  unresolvedOperationalPlaceholderAudit.errors.join("\n"),
  /placeholder operationnel non resolu/
);

const legacyBloodDomain = structuredClone(report);
legacyBloodDomain.sections![0].content +=
  " Envoie ensuite ton bilan sur apexlabs.fr.";
const legacyBloodDomainAudit = validatePeptidesReport(legacyBloodDomain);
assert.equal(legacyBloodDomainAudit.ok, false);
assert.match(
  legacyBloodDomainAudit.errors.join("\n"),
  /ancien domaine Blood Analysis interdit/
);

const legacyBloodDotCom = structuredClone(report);
legacyBloodDotCom.sections![0].content +=
  " Envoie ensuite ton bilan sur https://apexlabs.com/checklist.";
const legacyBloodDotComAudit = validatePeptidesReport(legacyBloodDotCom);
assert.equal(legacyBloodDotComAudit.ok, false);
assert.match(
  legacyBloodDotComAudit.errors.join("\n"),
  /ancien domaine Blood Analysis interdit/
);

const supplierDelayPromise = structuredClone(report);
supplierDelayPromise.sections![0].content +=
  " Compte generalement 5 a 15 jours ouvres pour la livraison.";
const supplierDelayPromiseAudit = validatePeptidesReport(supplierDelayPromise);
assert.equal(supplierDelayPromiseAudit.ok, false);
assert.match(
  supplierDelayPromiseAudit.errors.join("\n"),
  /promesse de delai fournisseur interdite/
);

const contradictoryDoseAdvice = structuredClone(report);
contradictoryDoseAdvice.sections![3].content +=
  " Commence a 50% de la dose cible pour les deux peptides pendant la premiere semaine.";
contradictoryDoseAdvice.sections![4].content +=
  " Si les nausees sont fortes, reste au palier precedent une semaine de plus avant de monter.";
contradictoryDoseAdvice.sections![5].content +=
  " Un cycle court de 4 a 6 semaines a dose reduite est possible.";
const contradictoryDoseAdviceAudit = validatePeptidesReport(
  contradictoryDoseAdvice
);
assert.equal(contradictoryDoseAdviceAudit.ok, false);
assert.match(
  contradictoryDoseAdviceAudit.errors.join("\n"),
  /ajustement de dose contradictoire hors fiche/
);

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

const reportWithUnintegratedBonus = structuredClone(report) as any;
reportWithUnintegratedBonus.peptides.push({
  ...structuredClone(peptide),
  name: "BPC-157",
  purpose: "BONUS: ajout facultatif",
  whyThisPeptide: "Peptide bonus hors du stack principal",
});
pruneUnintegratedBonusPeptides(reportWithUnintegratedBonus);
assert.deepEqual(
  reportWithUnintegratedBonus.peptides.map((entry: any) => entry.name),
  ["Retatrutide"],
  "Un bonus absent du calendrier ne doit pas survivre dans les cartes"
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

const repairableOperationalVariants = structuredClone(report) as any;
repairableOperationalVariants.weeklySchedule =
  "LUNDI: Retatrutide [dose precise selon semaine], sous cutanee.";
repairableOperationalVariants.sections[0].content +=
  " Compte generalement 5 a 15 jours ouvres pour la livraison.";
repairableOperationalVariants.sections[1].content +=
  " Checklist disponible sur https://apexlabs.com/checklist. REATATRUTIDE reste le peptide structure.";
repairableOperationalVariants.sections[2].content +=
  " Ce protocole est fourni a titre educatif. Consulte un medecin si tu as le moindre doute avant de continuer.";
const repairedOperationalVariants = repairPeptidesReportContent(
  repairableOperationalVariants,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
const repairedOperationalVariantsText = [
  repairedOperationalVariants.weeklySchedule,
  ...repairedOperationalVariants.sections.map((section: any) => section.content),
].join("\n");
assert.match(
  repairedOperationalVariants.weeklySchedule,
  new RegExp(peptide.dosage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
);
assert.doesNotMatch(
  repairedOperationalVariantsText,
  /valeur indiquee dans la fiche|dose exacte indiquee dans la fiche|apexlabs\.(?:fr|com)|\b5 a 15 jours ouvres\b|REATATRUTIDE|ce protocole est fourni a titre educatif|consulte un medecin si tu as le moindre doute/i
);
assert.equal(
  validatePeptidesReport(repairedOperationalVariants).ok,
  true,
  validatePeptidesReport(repairedOperationalVariants).errors.join("\n")
);

const previouslyDegradedOperationalVariant = structuredClone(report) as any;
previouslyDegradedOperationalVariant.weeklySchedule =
  "LUNDI: Retatrutide valeur indiquee dans la fiche, sous cutanee.";
const repairedPreviouslyDegraded = repairPeptidesReportContent(
  previouslyDegradedOperationalVariant,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
assert.match(
  repairedPreviouslyDegraded.weeklySchedule,
  new RegExp(peptide.dosage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
);
assert.doesNotMatch(
  JSON.stringify(repairedPreviouslyDegraded),
  /valeur indiquee dans la fiche|dose exacte indiquee dans la fiche/i
);
assert.equal(
  validatePeptidesReport(repairedPreviouslyDegraded).ok,
  true,
  validatePeptidesReport(repairedPreviouslyDegraded).errors.join("\n")
);

const repairedContradictoryDoseAdvice = repairPeptidesReportContent(
  contradictoryDoseAdvice as any,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
assert.doesNotMatch(
  JSON.stringify(repairedContradictoryDoseAdvice),
  /commence a 50% de la dose cible|reste au palier precedent|cycle court de 4 a 6 semaines a dose reduite est possible/i
);
assert.equal(
  validatePeptidesReport(repairedContradictoryDoseAdvice).ok,
  true,
  validatePeptidesReport(repairedContradictoryDoseAdvice).errors.join("\n")
);

const falseSoloCredits = structuredClone(report) as any;
falseSoloCredits.tier = "solo";
falseSoloCredits.qualityVersion = "expert-standard-v1";
falseSoloCredits.sections[0].content +=
  " Tu as 2 credits Blood Analysis APEXLABS deja sur ton compte.";
const falseSoloCreditsAudit = validatePeptidesReport(falseSoloCredits);
assert.equal(falseSoloCreditsAudit.ok, false);
assert.match(
  falseSoloCreditsAudit.errors.join("\n"),
  /faux credit Blood Analysis/
);
const repairedSoloCredits = repairPeptidesReportContent(
  falseSoloCredits,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
assert.doesNotMatch(
  repairedSoloCredits.sections[0].content,
  /tu as 2 credits Blood Analysis/i
);
assert.equal(
  validatePeptidesReport(repairedSoloCredits).ok,
  true,
  validatePeptidesReport(repairedSoloCredits).errors.join("\n")
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
  "12 semaines (descente progressive: 4 mg, 2 mg, 1 mg, arret). Pause de 8 semaines",
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

const singleVialsGrammar = structuredClone(report) as any;
singleVialsGrammar.peptides[0].vialsNeeded = "1 vials de 10mg pour 12 semaines";
singleVialsGrammar.peptides[0].priceEstimate =
  "Environ $20 par vial, 1 vials, total $20";
const repairedSingleVial = repairPeptidesReportContent(
  singleVialsGrammar,
  { pep_name: "Luca", pep_country: "France" },
  "solo"
) as any;
assert.doesNotMatch(
  `${repairedSingleVial.peptides[0].vialsNeeded} ${repairedSingleVial.peptides[0].priceEstimate}`,
  /\b1\s+vials\b/i
);

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
assert.doesNotMatch(
  hardFlagReport.sections.map((section: any) => `${section.title}\n${section.content}`).join("\n"),
  /\b2 credits Blood Analysis\b/i,
  "Le mode medical doit respecter le tier Solo lui aussi"
);

console.log("Peptides guardrails: OK");
