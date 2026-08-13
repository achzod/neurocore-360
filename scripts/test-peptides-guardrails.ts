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
import {
  buildPeptidesBloodCreditsBlock,
  buildPeptidesCoachingDeductionBlock,
} from "../server/cta";
import { hasValidPeptidesConsent } from "../server/peptidesConsent";

const engineSource = readFileSync(new URL("../server/peptidesEngine.ts", import.meta.url), "utf8");
const routesSource = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
const reportPageSource = readFileSync(new URL("../client/src/pages/PeptidesEngineReport.tsx", import.meta.url), "utf8");
const peptidesPageSource = readFileSync(new URL("../client/src/pages/PeptidesEnginePage.tsx", import.meta.url), "utf8");
assert.match(engineSource, /PEPTIDES_PRIMARY_MODEL[\s\S]{0,120}OPENAI_REPORT_MODEL/);
assert.match(engineSource, /effort:\s*"xhigh"/);
assert.match(engineSource, /mode:\s*"pro"/);
assert.match(engineSource, /PEPTIDES_MAX_OUTPUT_TOKENS[\s\S]{0,180}32_000/);
assert.match(engineSource, /Math\.min\(40_000, Math\.max\(28_000/);
assert.doesNotMatch(engineSource, /PEPTIDES_OPENAI_MAX_OUTPUT_TOKENS \|\| 48_000/);
assert.match(engineSource, /entre 30000 et 38000 caracteres au total/);
assert.match(engineSource, /Candidate rejected[\s\S]{0,600}strict full regeneration/);
assert.match(engineSource, /Provider failure is terminal, duplicate paid generation blocked/);
assert.doesNotMatch(engineSource, /@anthropic-ai\/sdk|ANTHROPIC_API_KEY|callClaudeForPeptides/);
assert.match(peptidesPageSource, /peptides-engine-consent-v2-2026-08-13/);
assert.match(peptidesPageSource, /assumer mes décisions d'achat et d'utilisation/);
assert.match(engineSource, /sourceReport\._validationContext\?\.consentAccepted === true/);
assert.match(routesSource, /generatePeptidesProtocol\(responses, email, autoGenTier,[\s\S]{0,180}consentAccepted/);
assert.match(routesSource, /generatePeptidesProtocol\(responses, order\.email, forcePaidTier,[\s\S]{0,180}consentAccepted/);
assert.match(routesSource, /generatePeptidesProtocol\(responses, email, "coached",[\s\S]{0,180}consentAccepted/);
assert.match(routesSource, /generatePeptidesProtocol\(responses, email, manualTier,[\s\S]{0,180}consentAccepted/);
assert.match(
  routesSource,
  /const repaired = await refreshPeptauraPricingForDelivery\([\s\S]{0,900}const validation = validatePeptidesReport\(repaired\)/,
  "Le recovery doit reparer le meme artefact puis le revalider avant toute livraison"
);
const signedConsent = {
  accepted: true,
  version: "peptides-engine-consent-v2-2026-08-13",
  text: "Je demande la creation immediate d'un protocole personnalise et je comprends le statut educatif du contenu, les contre-indications, les criteres d'arret, la confidentialite et ma responsabilite dans les decisions d'achat et d'utilisation.",
};
assert.equal(hasValidPeptidesConsent(signedConsent), true);
assert.equal(hasValidPeptidesConsent({ ...signedConsent, text: "court" }), false);
assert.match(engineSource, /PROTOCOLE OBLIGATOIRE SI TESTOSTERONE BASSE CONFIRMEE/i);
assert.match(engineSource, /1\. Enclomiphene Citrate/);
assert.match(engineSource, /2\. KissPeptin-10/);
assert.match(engineSource, /https:\/\/receptorchem\.co\.uk\/enclomiphene-citrate\//);
assert.match(routesSource, /DELIVERY BLOCKED[\s\S]{0,1800}continue;/);
assert.doesNotMatch(routesSource, /Tes 2 Blood Analysis offertes/);
assert.match(reportPageSource, /data-testid=\{`peptides-whatsapp-/);
assert.match(reportPageSource, /placement="report_primary"/);
assert.match(reportPageSource, /placement="report_sticky"/);
assert.match(reportPageSource, /peptidesTier=\{reportTier\}/);
assert.doesNotMatch(reportPageSource, /PEPTIDES150/);
assert.equal(buildPeptidesBloodCreditsBlock("solo", "https://example.com/blood"), "");
assert.match(buildPeptidesBloodCreditsBlock("coached", "https://example.com/blood"), /1 credit Blood Analysis/);
assert.doesNotMatch(buildPeptidesBloodCreditsBlock("coached", "https://example.com/blood"), /2 credits/);
assert.match(buildPeptidesBloodCreditsBlock("tracked", "https://example.com/blood"), /2 credits Blood Analysis/);
assert.match(buildPeptidesCoachingDeductionBlock("solo"), /PEPTIDES199/);
assert.match(buildPeptidesCoachingDeductionBlock("tracked"), /PEPTIDES399/);
assert.match(buildPeptidesCoachingDeductionBlock("tracked"), /wa\.me\/971585210514/);
assert.match(
  reportPageSource,
  /_generationMeta\?\.generatedAt[\s\S]{0,180}Mis a jour le/,
  "Une regeneration doit afficher sa vraie date de mise a jour"
);

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
  priceEstimate: "Environ 8 vials, total $100, prix live controle avant livraison",
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

const personalizedReport = structuredClone(coherentCoverage) as any;
personalizedReport.qualityVersion = "expert-standard-v1";
personalizedReport._validationContext = {
  confirmedLowTestosterone: false,
  profile: {
    weightKg: 80,
    primaryGoal: "fatloss",
    country: "France",
    budget: "100-200",
    timeline: "solid",
    experience: "none",
    injectionComfort: "anxious",
  },
};
personalizedReport.sections[3].id = "profil-synthese";
personalizedReport.sections[3].title = "Synthese de ton profil";
personalizedReport.sections[3].content +=
  " Luca, tu peses 80 kg et ton objectif principal est la perte de graisse. Tu es debutant total, avec une apprehension sur les injections. Tu veux une trajectoire solide sur 8 a 12 semaines et ton budget se situe entre 100 et 200 EUR par mois.";
personalizedReport.sections[4].id = "nutrition-protocole";
personalizedReport.sections[4].title = "Nutrition pendant ton protocole";
personalizedReport.sections[4].content +=
  " A 80 kg, vise 144 a 176 g de proteines par jour. Le calcul vient de 1,8 a 2,2 g/kg/jour et garde une marge utile pour ta perte de graisse.";
personalizedReport.peptides[0].whyThisPeptide =
  "Je retiens ce levier parce que ton objectif prioritaire est la perte de graisse, que la gestion de l'appetit compte dans ton dossier et que ton budget de 100 a 200 EUR impose un stack lisible. Chez toi, la titration doit rester identique dans la fiche et le calendrier. Les donnees humaines restent encore limitees.";
personalizedReport.peptides[0].timing = "Jour fixe, 1 fois par semaine.";
personalizedReport.sections[2].content += " LUNDI: injection au dosage de la fiche. Les autres jours sont des jours de repos hors protocole.";
const personalizedAudit = validatePeptidesReport(personalizedReport);
assert.equal(personalizedAudit.ok, true, personalizedAudit.errors.join("\n"));

const genericProfileFailure = structuredClone(personalizedReport) as any;
genericProfileFailure.sections[3].content = genericProfileFailure.sections[3].content
  .replace(/tu peses 80 kg[^.]*\./i, "Ton profil demande une approche adaptee.")
  .replace(/Tu es debutant total[^.]*\./i, "Ton niveau est pris en compte.");
const genericProfileAudit = validatePeptidesReport(genericProfileFailure);
assert.equal(genericProfileAudit.ok, false);
assert.match(genericProfileAudit.errors.join("\n"), /personnalisation/);

const genericRationaleFailure = structuredClone(personalizedReport) as any;
genericRationaleFailure.peptides[0].whyThisPeptide =
  "Je retiens ce levier pour ton objectif de perte de graisse. Ton objectif de perte de graisse guide ce choix et ton objectif de perte de graisse reste le fil conducteur de la fiche, du calendrier et de la liste de commande.";
const genericRationaleAudit = validatePeptidesReport(genericRationaleFailure);
assert.equal(genericRationaleAudit.ok, false);
assert.match(genericRationaleAudit.errors.join("\n"), /moins de 2 faits concrets/);

const repairedGenericRationale = repairPeptidesReportContent(
  structuredClone(genericRationaleFailure),
  {
    pep_name: "Luca",
    pep_weight: 80,
    pep_primary_goal: "fatloss",
    pep_country: "France",
    pep_budget: "100-200",
    pep_timeline: "solid",
    pep_experience: "none",
    pep_injection_comfort: "anxious",
  },
  "solo"
) as any;
const repairedGenericRationaleAudit = validatePeptidesReport(repairedGenericRationale);
assert.equal(
  repairedGenericRationaleAudit.ok,
  true,
  repairedGenericRationaleAudit.errors.join("\n")
);
assert.match(repairedGenericRationale.peptides[0].whyThisPeptide, /80\s*kg/i);
assert.match(repairedGenericRationale.peptides[0].whyThisPeptide, /perte de (?:gras|graisse)/i);

const onceAnchoredRationale = repairedGenericRationale.peptides[0].whyThisPeptide;
const twiceRepairedGenericRationale = repairPeptidesReportContent(
  repairedGenericRationale,
  {
    pep_name: "Luca",
    pep_weight: 80,
    pep_primary_goal: "fatloss",
    pep_country: "France",
    pep_budget: "100-200",
    pep_timeline: "solid",
    pep_experience: "none",
    pep_injection_comfort: "anxious",
  },
  "solo"
) as any;
assert.equal(
  twiceRepairedGenericRationale.peptides[0].whyThisPeptide,
  onceAnchoredRationale,
  "La reparation personnalisee doit rester idempotente"
);

const wrongProteinTarget = structuredClone(personalizedReport) as any;
wrongProteinTarget.sections[4].content = wrongProteinTarget.sections[4].content
  .replace(/144 a 176 g de proteines par jour/i, "90 g de proteines par jour");
const wrongProteinAudit = validatePeptidesReport(wrongProteinTarget);
assert.equal(wrongProteinAudit.ok, false);
assert.match(wrongProteinAudit.errors.join("\n"), /cible calculee 144 a 176 g\/jour absente/);

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

const medicalWallFailure = structuredClone(report) as any;
medicalWallFailure.qualityVersion = "expert-standard-v1";
medicalWallFailure.sections[0].content +=
  ` ${Array.from({ length: 13 }, (_, index) => `Renvoi medecin numero ${index + 1}`).join(". ")}.`;
const medicalWallAudit = validatePeptidesReport(medicalWallFailure);
assert.equal(medicalWallAudit.ok, false);
assert.match(medicalWallAudit.errors.join("\n"), /surcouche medicale excessive/);

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
  { ...structuredClone(legacyReport), qualityVersion: "medical-review-v1" },
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

const standardHardFlagReport = repairPeptidesReportContent(
  { ...structuredClone(legacyReport), qualityVersion: "expert-standard-v1" },
  { pep_name: "Luca", pep_country: "France", pep_conditions: "Cancer en remission recente" },
  "solo"
) as any;
assert.equal(
  standardHardFlagReport.qualityVersion,
  "expert-standard-v1",
  "Le repair ne doit jamais transformer lui-meme un protocole standard en medical-review"
);
assert.doesNotMatch(
  standardHardFlagReport.sections.map((section: any) => `${section.title}\n${section.content}`).join("\n"),
  /projet de protocole [àa] faire valider|s'il manque une seule case, tu ne commences pas/i
);

const standardWithoutMedicalVerification = structuredClone(repaired) as any;
standardWithoutMedicalVerification.qualityVersion = "expert-standard-v1";
standardWithoutMedicalVerification._validationContext = {
  ...(standardWithoutMedicalVerification._validationContext || {}),
  consentAccepted: hasValidPeptidesConsent(signedConsent),
};
for (const section of standardWithoutMedicalVerification.sections) {
  section.content = String(section.content)
    .replace(/m[ée]decin/gi, "support")
    .replace(/pharmacien/gi, "support");
}
const noGlobalMedicalGateAudit = validatePeptidesReport(standardWithoutMedicalVerification);
assert.equal(
  noGlobalMedicalGateAudit.ok,
  true,
  `Contrat consentement -> repair -> validation casse:\n${noGlobalMedicalGateAudit.errors.join("\n")}`
);
assert.doesNotMatch(
  noGlobalMedicalGateAudit.errors.join("\n"),
  /warning de verification medecin ou pharmacien manquant/,
  "Un protocole standard consenti ne depend plus d'un gate medecin/pharmacien herite"
);

const missingLowTestosteroneStack = structuredClone(report) as any;
missingLowTestosteroneStack._validationContext = { confirmedLowTestosterone: true };
const missingLowTestosteroneAudit = validatePeptidesReport(missingLowTestosteroneStack);
assert.equal(missingLowTestosteroneAudit.ok, false);
assert.match(
  missingLowTestosteroneAudit.errors.join("\n"),
  /Enclomiphene obligatoire absent[\s\S]*KissPeptin-10 obligatoire absent/
);

const validLowTestosteroneStack = structuredClone(report) as any;
validLowTestosteroneStack._validationContext = { confirmedLowTestosterone: true };
validLowTestosteroneStack._enclomipheneSourceSync = {
  url: "https://receptorchem.co.uk/enclomiphene-citrate/",
  fetchedAt: now,
  available: true,
  format: "30 ml a 12,5 mg/ml",
  priceGbp: 39.99,
};
validLowTestosteroneStack.peptides.push(
  {
    name: "Enclomiphene Citrate",
    route: "Voie orale",
    dosage: "12,5 mg par jour",
    timing: "Chaque matin a heure fixe",
    purpose: "Soutien de l'axe HPG dans le contexte documente par le questionnaire",
    purchaseUrl: "https://receptorchem.co.uk/enclomiphene-citrate/",
    vialsNeeded: "2 flacons de 30 ml a 12,5 mg/ml pour 8 semaines",
    priceEstimate: "Environ £39,99 par flacon, 2 flacons, total £79,98",
    cycleDuration: "8 semaines",
    reconstitution: "Aucune reconstitution, solution liquide de 30 ml concentree a 12,5 mg/ml",
    whyThisPeptide: "Ce choix structure la partie orale du stack et donne un levier distinct de KissPeptin-10, avec un timing, une duree et une quantite totale clairement calcules.",
  },
  {
    name: "KissPeptin-10",
    route: "Sous cutanee",
    dosage: "100 mcg trois fois par semaine",
    timing: "Lundi, mercredi et vendredi le soir",
    purpose: "Peptide central du stack oriente axe HPG",
    purchaseUrl: "https://www.peptaura.com/catalog/KissPeptin-10",
    vialsNeeded: "1 vial de 5mg pour 8 semaines",
    priceEstimate: "Environ $16 par vial, 1 vial, total $16",
    cycleDuration: "8 semaines",
    reconstitution: "Vial 5mg + 2ml BAC water = 2500 mcg/ml, 4 unites soit 0,04 ml pour 100 mcg",
    whyThisPeptide: "KissPeptin-10 complete la logique du stack avec une action differente de la solution orale, ce qui permet d'expliquer clairement le role de chaque molecule sans doublon.",
  }
);
validLowTestosteroneStack.weeklySchedule +=
  " | LUNDI MATIN: Enclomiphene Citrate 12,5 mg oral | LUNDI SOIR: KissPeptin-10 100 mcg sous cutanee";
validLowTestosteroneStack.shoppingList +=
  "\nEnclomiphene Citrate: 2 flacons, https://receptorchem.co.uk/enclomiphene-citrate/" +
  "\nKissPeptin-10: 1 vial, https://www.peptaura.com/catalog/KissPeptin-10";
validLowTestosteroneStack.bloodMarkers = [
  "Testosterone totale",
  "Testosterone libre",
  "LH",
  "FSH",
  "E2 estradiol",
  "SHBG",
  "Prolactine",
];
validLowTestosteroneStack.sections[0].content +=
  " Enclomiphene Citrate organise la partie orale du protocole tandis que KissPeptin-10 apporte le peptide retenu pour l'axe HPG.";
validLowTestosteroneStack.sections[1].content +=
  " Le calcul Enclomiphene couvre le cycle complet. Le calcul KissPeptin-10 relie la concentration, les unites et le volume injecte.";
validLowTestosteroneStack._peptauraLiveSync.applied.push("Enclomiphene Citrate", "KissPeptin-10");
validLowTestosteroneStack._peptauraLiveSync.listingSnapshots.push(
  {
    peptide: "Enclomiphene Citrate",
    fetchedAt: now,
    supplier: "ReceptorChem",
    dosage: "30 ml a 12,5 mg/ml",
    requestedVials: 2,
    deliveredVials: 2,
    packageCount: 2,
    boxSize: 1,
    totalPriceGbp: 79.98,
  },
  {
    peptide: "KissPeptin-10",
    fetchedAt: now,
    supplier: "Fournisseur test",
    dosage: "5mg",
    requestedVials: 1,
    deliveredVials: 1,
    packageCount: 1,
    boxSize: 1,
    totalPriceUsd: 16,
  }
);
const validLowTestosteroneAudit = validatePeptidesReport(validLowTestosteroneStack);
assert.equal(validLowTestosteroneAudit.ok, true, validLowTestosteroneAudit.errors.join("\n"));

const wrongEnclomipheneSource = structuredClone(validLowTestosteroneStack);
wrongEnclomipheneSource.peptides.find((entry: any) => /enclomiphene/i.test(entry.name)).purchaseUrl =
  "https://www.peptaura.com/catalog/Enclomiphene";
const wrongEnclomipheneSourceAudit = validatePeptidesReport(wrongEnclomipheneSource);
assert.equal(wrongEnclomipheneSourceAudit.ok, false);
assert.match(wrongEnclomipheneSourceAudit.errors.join("\n"), /source Enclomiphene invalide|URL ReceptorChem/);

const staleEnclomipheneSource = structuredClone(validLowTestosteroneStack);
staleEnclomipheneSource._enclomipheneSourceSync.fetchedAt = new Date(
  Date.now() - 2 * 60 * 60 * 1000
).toISOString();
const staleEnclomipheneSourceAudit = validatePeptidesReport(staleEnclomipheneSource);
assert.equal(staleEnclomipheneSourceAudit.ok, false);
assert.match(
  staleEnclomipheneSourceAudit.errors.join("\n"),
  /verification ReceptorChem trop ancienne/
);

console.log("Peptides guardrails: OK");
