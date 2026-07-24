import assert from "node:assert/strict";
import {
  estimateNeedMg,
  validatePeptidesReport,
  type PeptidesReport,
} from "../server/peptidesReportValidator";
import { repairPeptidesReportContent } from "../server/peptidesReportRepair";

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

const longHumanParagraph = [
  "Luca, cette partie reprend ton profil concret et distingue clairement les faits des hypotheses.",
  "La retatrutide reste une molecule experimentale non approuvee et ce document ne valide aucune automedication.",
  "Avant tout achat ou toute utilisation, demande a ton medecin ou a ton pharmacien de verifier le produit, la dose, tes allergies et tes analyses.",
  "Si un element manque ou si un symptome apparait, tu suspends la demarche et tu demandes un avis medical.",
].join(" ");

const report: PeptidesReport = {
  clientName: "Luca",
  tier: "solo",
  peptides: [peptide],
  sections: Array.from({ length: 12 }, (_, index) => ({
    id: `section-${index + 1}`,
    title: `Partie ${index + 1}`,
    content: Array.from({ length: 24 }, () => longHumanParagraph).join("\n\n"),
  })),
  weeklySchedule: "Le calendrier reste suspendu tant que le medecin ou le pharmacien ne l'a pas valide.",
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
assert.equal(repaired.sections.length, 15);
assert.ok(repaired.sections.reduce((sum: number, section: any) => sum + section.content.length, 0) >= 30_000);
assert.doesNotMatch(repaired.peptides[0].cycleDuration, /descente progressive/i);
assert.doesNotMatch(repaired.peptides[0].timing, /peut etre melange/i);
assert.match(repaired.peptides[0].reconstitution, /1\.60 ml/);
assert.equal(repairedAudit.ok, true, repairedAudit.errors.join("\n"));

console.log("Peptides guardrails: OK");
