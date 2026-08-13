import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { jsonrepair } from "jsonrepair";
import { pruneUnintegratedBonusPeptides, repairPeptidesReportContent } from "../server/peptidesReportRepair";
import { validatePeptidesReport } from "../server/peptidesReportValidator";
import type { PeptidesReport } from "../server/peptidesEngine";

type CandidateAudit = {
  responseId: string;
  parsed: boolean;
  repaired: boolean;
  validatorOk: boolean;
  errors: string[];
  warnings: string[];
  safetyErrors: string[];
  peptideNames: string[];
  sectionCount: number;
  totalChars: number;
  outputPath?: string;
};

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || value.startsWith("--")) throw new Error(`Missing ${name}`);
  return value;
}

async function parseCandidate(path: string): Promise<PeptidesReport> {
  let raw = (await readFile(path, "utf8")).trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) raw = raw.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(raw) as PeptidesReport;
  } catch {
    return JSON.parse(jsonrepair(raw)) as PeptidesReport;
  }
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "").split(/[|,;]/).map((entry) => entry.trim()).filter(Boolean);
}

function reportText(report: PeptidesReport): string {
  return [
    report.clientName,
    report.weeklySchedule,
    report.shoppingList,
    ...(report.sections || []).map((section) => `${section.title}\n${section.content}`),
    ...(report.peptides || []).flatMap((peptide) => Object.values(peptide).map(String)),
  ].join("\n");
}

function ensureRecoveryProfileFacts(
  report: PeptidesReport,
  responses: Record<string, unknown>,
): void {
  const synthesis = (report.sections || []).find((section) =>
    /profil-synthese|synthese de ton profil/i.test(`${section.id} ${section.title}`),
  );
  if (!synthesis) return;
  const weightKg = Number(responses.pep_weight || 0);
  if (Number.isFinite(weightKg) && weightKg > 0) {
    const normalizedWeight = String(weightKg).replace(".", ",");
    if (!new RegExp(`\\b${String(weightKg).replace(".", "[.,]")}\\s*kg\\b`, "i").test(synthesis.content)) {
      synthesis.content = `${synthesis.content.trim()}\n\nTon point de depart mesurable est ${normalizedWeight} kg pour ${String(responses.pep_height || "").trim()} cm. Ce repere sert au suivi et au calcul des doses exprimees par kilo.`;
    }
  }
}

function auditSafety(report: PeptidesReport, responses: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const text = reportText(report);
  const surgeryDeclared = /op[ée]ration|chirurg|varices?/i.test(String(responses.pep_questions || ""));
  if (surgeryDeclared) {
    if (!/op[ée]ration|chirurg|varices?/i.test(text)) {
      errors.push("chirurgie/varices absente du rapport");
    }
    if (!/(?:chirurgien|m[ée]decin|[ée]quipe de chirurgie)[\s\S]{0,260}(?:accord|validation|avis|confirm|relire|consigne|calendrier d'arr[êe]t)|(?:accord|validation|avis|confirm|relire|consigne|calendrier d'arr[êe]t)[\s\S]{0,260}(?:chirurgien|m[ée]decin|[ée]quipe de chirurgie)/i.test(text)) {
      errors.push("accord medical/chirurgical explicite absent");
    }
    if (!/(?:pause|arr[êe]t|suspend|ne commence pas|reprendre)[\s\S]{0,260}(?:op[ée]ration|chirurg|intervention)|(?:op[ée]ration|chirurg|intervention)[\s\S]{0,260}(?:pause|arr[êe]t|suspend|ne commence pas|reprendre)/i.test(text)) {
      errors.push("regle de pause/reprise peri-operatoire absente");
    }
  }
  if (!/exp[ée]rimental|non approuv[ée]|produit de recherche/i.test(text)) {
    errors.push("statut experimental/non approuve absent");
  }
  if (!/74[,.]5\s*kg/i.test(text)) errors.push("poids 74,5 kg absent");
  if (!/injection/i.test(text) || !/(?:anx|appr[ée]hension|progress|accompagn)/i.test(text)) {
    errors.push("anxiete injections insuffisamment prise en compte");
  }
  for (const peptide of report.peptides || []) {
    if (!/^https:\/\/(?:www\.)?peptaura\.com\/catalog\//i.test(peptide.purchaseUrl || "")) {
      errors.push(`${peptide.name}: lien Peptaura non canonique`);
    }
    if (!/\d/.test(peptide.priceEstimate || "") || /\$?0(?:[.,]0+)?\b/.test(peptide.priceEstimate || "")) {
      errors.push(`${peptide.name}: prix absent ou nul`);
    }
  }
  return errors;
}

async function main(): Promise<void> {
  const orderPath = argument("--order");
  const candidatesDir = argument("--candidates");
  const outputDir = argument("--output");
  const livePricing = process.argv.includes("--live-pricing");
  const candidateNames = process.argv
    .slice(process.argv.indexOf("--output") + 2)
    .filter((entry) => entry !== "--live-pricing");
  if (candidateNames.length === 0) throw new Error("Provide candidate filenames after --output");

  const orderEnvelope = JSON.parse(await readFile(orderPath, "utf8"));
  const order = orderEnvelope?.order;
  if (!order || order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") {
    throw new Error("Order is not a paid PEPTIDES_ENGINE order");
  }
  const responses = order.metadata?.peptidesResponses as Record<string, unknown> | undefined;
  if (!responses || Object.keys(responses).length < 20) throw new Error("Peptides questionnaire is incomplete");
  const tier = String(order.metadata?.peptidesTier || "");
  if (tier !== "coached") throw new Error(`Unexpected tier: ${tier}`);
  await mkdir(outputDir, { recursive: true, mode: 0o700 });

  const audits: CandidateAudit[] = [];
  for (const candidateName of candidateNames) {
    const responseId = basename(candidateName).replace(/\.txt$/, "");
    const audit: CandidateAudit = {
      responseId,
      parsed: false,
      repaired: false,
      validatorOk: false,
      errors: [],
      warnings: [],
      safetyErrors: [],
      peptideNames: [],
      sectionCount: 0,
      totalChars: 0,
    };
    try {
      let report = await parseCandidate(join(candidatesDir, candidateName));
      audit.parsed = true;
      report = pruneUnintegratedBonusPeptides(structuredClone(report));
      if (livePricing) {
        const { refreshPeptauraPricingForDelivery } = await import("../server/peptidesEngine");
        report = await refreshPeptauraPricingForDelivery(report, responses, tier);
      } else {
        report = repairPeptidesReportContent(report, responses, tier);
      }
      report.tier = tier;
      report.clientName = String(responses.pep_name || report.clientName || "Profil").trim().split(/\s+/)[0];
      report.promoCodesGenerated = [];
      ensureRecoveryProfileFacts(report, responses);
      report._validationContext = {
        confirmedLowTestosterone: String(responses.pep_testo_bloodwork || "").toLowerCase() === "recent-low",
        profile: {
          weightKg: Number(responses.pep_weight || 0),
          primaryGoal: String(responses.pep_primary_goal || ""),
          secondaryGoals: asList(responses.pep_secondary_goals),
          country: String(responses.pep_country || ""),
          budget: String(responses.pep_budget || ""),
          timeline: String(responses.pep_timeline || ""),
          experience: String(responses.pep_experience || ""),
          injectionComfort: String(responses.pep_injection_comfort || ""),
        },
      };
      audit.repaired = true;
      const validation = validatePeptidesReport(report);
      audit.validatorOk = validation.ok;
      audit.errors = validation.errors;
      audit.warnings = validation.warnings;
      audit.safetyErrors = auditSafety(report, responses);
      audit.peptideNames = (report.peptides || []).map((peptide) => peptide.name);
      audit.sectionCount = report.sections?.length || 0;
      audit.totalChars = (report.sections || []).reduce((sum, section) => sum + (section.content?.length || 0), 0);
      const outputPath = join(outputDir, `${responseId}.repaired.json`);
      await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
      audit.outputPath = outputPath;
    } catch (error) {
      audit.errors.push(error instanceof Error ? error.message : String(error));
    }
    audits.push(audit);
  }

  const summaryPath = join(outputDir, "audit-summary.json");
  await writeFile(summaryPath, `${JSON.stringify(audits, null, 2)}\n`, { mode: 0o600 });
  for (const audit of audits) {
    console.log(JSON.stringify({
      responseId: audit.responseId,
      repaired: audit.repaired,
      validatorOk: audit.validatorOk,
      validatorErrors: audit.errors.length,
      safetyErrors: audit.safetyErrors,
      peptideNames: audit.peptideNames,
      sectionCount: audit.sectionCount,
      totalChars: audit.totalChars,
    }));
  }
  console.log(`AUDIT_SUMMARY=${summaryPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
