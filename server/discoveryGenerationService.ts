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
import { isDiscoveryTransactionalAutomationEligible } from "./discoveryAutomationPolicy";
import {
  claimDiscoveryGeneration,
  discoveryTransactionalSha256,
  failClaimedDiscoveryGeneration,
  persistClaimedDiscoveryGeneration,
} from "./discoveryTransactionalPersistence";

const activeDiscoveryGenerations = new Set<string>();

type DiscoveryAudit = NonNullable<Awaited<ReturnType<typeof storage.getAudit>>>;
type DiscoveryClaim = NonNullable<Awaited<ReturnType<typeof claimDiscoveryGeneration>>>;

function isEligibleDiscoveryAudit(audit: DiscoveryAudit | undefined): audit is DiscoveryAudit {
  return Boolean(
    audit
    && audit.type === "GRATUIT"
    && !audit.reportSentAt
    && !isDiscoverySupersededTerminal(audit)
    && isDiscoveryTransactionalAutomationEligible(audit),
  );
}

async function runClaimedDiscoveryGeneration(
  audit: DiscoveryAudit,
  claim: DiscoveryClaim,
): Promise<boolean> {
  const auditId = audit.id;
  try {
    const result = await analyzeDiscoveryScan(audit.responses as any, {
      costBudgetAuditId: audit.id,
      costBudgetGenerationToken: claim.token,
      costBudgetFenceToken: claim.fenceToken,
    });
    const report = await convertToNarrativeReport(result, audit.responses as any);
    const assets = buildDiscoveryReportAssets(report);
    const nonRenderedMetadata = { blocages: result.blocages, ctaMessage: result.ctaMessage };
    const validation = validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata);
    if (!validation.ok) {
      throw new Error(`Discovery premium quality gate: ${validation.errors.join(", ")}`);
    }
    const gate = evaluateDiscoveryDeliveryGate(report, assets, undefined, nonRenderedMetadata);
    const narrativeReport = attachDiscoveryDeliveryGateResult(report as any, gate);

    await persistClaimedDiscoveryGeneration({
      claim,
      narrativeReport,
      scores: {
        ...result.scoresByDomain,
        global: result.globalScore,
      },
      txt: assets.txt,
      html: assets.html,
      expectedTxtSha256: discoveryTransactionalSha256(assets.txt),
      expectedHtmlSha256: discoveryTransactionalSha256(assets.html),
      model: process.env.OPENAI_DISCOVERY_MODEL || process.env.OPENAI_REPORT_MODEL || "discovery",
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failClaimedDiscoveryGeneration(
      claim,
      "discovery_generation_service",
      message,
    ).catch(() => false);
    throw error;
  } finally {
    activeDiscoveryGenerations.delete(auditId);
  }
}

async function acquireDiscoveryGeneration(
  auditId: string,
): Promise<{ audit: DiscoveryAudit; claim: DiscoveryClaim } | null> {
  if (activeDiscoveryGenerations.has(auditId)) return null;
  const audit = await storage.getAudit(auditId);
  if (!isEligibleDiscoveryAudit(audit)) return null;
  activeDiscoveryGenerations.add(auditId);
  try {
    const claim = await claimDiscoveryGeneration(auditId);
    if (!claim) {
      activeDiscoveryGenerations.delete(auditId);
      return null;
    }
    return { audit, claim };
  } catch (error) {
    activeDiscoveryGenerations.delete(auditId);
    throw error;
  }
}

/**
 * Starts the dedicated Discovery runner after the audit and report job have
 * been claimed atomically. It returns the durable job immediately and never
 * sends email.
 */
export async function startPremiumDiscoveryReportGeneration(
  auditId: string,
): Promise<Awaited<ReturnType<typeof storage.getReportJob>> | null> {
  const acquired = await acquireDiscoveryGeneration(auditId);
  if (!acquired) return (await storage.getReportJob(auditId)) ?? null;
  void runClaimedDiscoveryGeneration(acquired.audit, acquired.claim).catch((error) => {
    console.error(`[DiscoveryGeneration] Transactional generation failed for ${auditId}:`, error);
  });
  return (await storage.getReportJob(auditId)) ?? null;
}

/** Durable generation-only runner used by recovery. It never sends email. */
export async function generateAndPersistPremiumDiscoveryReport(
  auditId: string,
): Promise<boolean> {
  const acquired = await acquireDiscoveryGeneration(auditId);
  if (!acquired) return false;
  return runClaimedDiscoveryGeneration(acquired.audit, acquired.claim);
}
