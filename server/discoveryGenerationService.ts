import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  validateDiscoveryReportForDelivery,
} from "./discovery-scan";
import {
  attachDiscoveryDeliveryGateResult,
  evaluateDiscoveryDeliveryGate,
} from "./discoveryDeliveryGate";
import { storage } from "./storage";
import { isDiscoverySupersededTerminal } from "./discoverySupersededPolicy";
import { isDiscoveryGlobalLockActive } from "./discoveryBatchControl";

const activeDiscoveryGenerations = new Set<string>();

/** Durable generation-only runner used by recovery. It never sends email. */
export async function generateAndPersistPremiumDiscoveryReport(
  auditId: string,
): Promise<boolean> {
  // Batch remediation uses its own audited generator. Generic recovery must
  // never race it or create an unledgered provider call.
  if (await isDiscoveryGlobalLockActive()) return false;
  if (activeDiscoveryGenerations.has(auditId)) return false;
  activeDiscoveryGenerations.add(auditId);
  try {
    const audit = await storage.getAudit(auditId);
    if (
      !audit ||
      audit.type !== "GRATUIT" ||
      audit.reportSentAt ||
      isDiscoverySupersededTerminal(audit)
    ) return false;
    if (audit.reportDeliveryStatus !== "GENERATING") return false;

    await storage.createOrUpdateReportJob({
      auditId,
      status: "generating" as any,
      progress: 10,
      currentSection: "Génération Discovery premium OpenAI...",
      error: null,
    });
    const result = await analyzeDiscoveryScan(audit.responses as any);
    const report = await convertToNarrativeReport(result, audit.responses as any);
    const assets = buildDiscoveryReportAssets(report);
    const validation = validateDiscoveryReportForDelivery(report, assets);
    if (!validation.ok) {
      throw new Error(`Discovery premium quality gate: ${validation.errors.join(", ")}`);
    }
    const gate = evaluateDiscoveryDeliveryGate(report, assets);
    const narrativeReport = attachDiscoveryDeliveryGateResult(report as any, gate);

    const current = await storage.getAudit(auditId);
    if (
      !current ||
      current.reportDeliveryStatus !== "GENERATING" ||
      current.reportSentAt ||
      isDiscoverySupersededTerminal(current)
    ) {
      throw new Error("Discovery generation ownership lost before persistence");
    }
    await storage.createReportArtifact({
      auditId,
      tier: "GRATUIT",
      engine: "discovery",
      model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_REPORT_MODEL || "discovery",
      txt: assets.txt,
      html: assets.html,
    }, { strict: true });
    const persisted = await storage.updateAudit(auditId, {
      narrativeReport,
      scores: {
        ...result.scoresByDomain,
        global: result.globalScore,
      },
      reportTxt: assets.txt,
      reportHtml: assets.html,
      reportGeneratedAt: new Date(),
      reportDeliveryStatus: "READY",
    });
    if (!persisted || persisted.reportDeliveryStatus !== "READY") {
      throw new Error("Discovery premium persistence verification failed");
    }
    await storage.completeReportJob(auditId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await storage.failReportJob(auditId, message).catch(() => {});
    const current = await storage.getAudit(auditId).catch(() => undefined);
    if (!isDiscoverySupersededTerminal(current)) {
      await storage.updateAudit(auditId, { reportDeliveryStatus: "NEEDS_REVIEW" }).catch(() => {});
    }
    throw error;
  } finally {
    activeDiscoveryGenerations.delete(auditId);
  }
}
