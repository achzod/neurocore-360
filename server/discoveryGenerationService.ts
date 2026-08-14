import {
  analyzeDiscoveryScan,
  buildDiscoveryReportAssets,
  convertToNarrativeReport,
  DiscoveryRejectedCandidateError,
  isDiscoveryRejectedCandidateError,
  validateDiscoveryReportAgainstResponses,
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
    const nonRenderedMetadata = {
      blocages: result.blocages,
      ctaMessage: result.ctaMessage,
      questionnaireCoverage: result.questionnaireCoverage,
    };
    let report: Awaited<ReturnType<typeof convertToNarrativeReport>> | undefined;
    let assets: ReturnType<typeof buildDiscoveryReportAssets> | undefined;
    let gate: ReturnType<typeof evaluateDiscoveryDeliveryGate> | undefined;
    try {
      report = await convertToNarrativeReport(result, audit.responses as any);
      assets = buildDiscoveryReportAssets(report);
      const validation = validateDiscoveryReportForDelivery(report, assets, nonRenderedMetadata);
      const factual = validateDiscoveryReportAgainstResponses(
        report,
        audit.responses as any,
        nonRenderedMetadata,
      );
      gate = evaluateDiscoveryDeliveryGate(report, assets, undefined, nonRenderedMetadata);
      if (!validation.ok || !factual.ok || !gate.ok) {
        throw new Error([...validation.errors, ...factual.errors, ...gate.errors].join("|"));
      }
    } catch (assemblyError) {
      const evidence = result.providerEvidence;
      if (!evidence?.responseId || evidence.totalTokens <= 0 || evidence.actualCostUsd <= 0) {
        throw assemblyError;
      }
      throw new DiscoveryRejectedCandidateError({
        providerRaw: evidence.rawCandidate,
        assembledCandidate: report,
        assembledAssets: assets,
        responseId: evidence.responseId,
        model: evidence.model,
        validationErrors: [`assembly_or_gate_failure:${assemblyError instanceof Error ? assemblyError.message : String(assemblyError)}`],
        usage: {
          inputTokens: evidence.inputTokens,
          outputTokens: evidence.outputTokens,
          totalTokens: evidence.totalTokens,
          actualCostUsd: evidence.actualCostUsd,
        },
      });
    }
    if (!report || !assets || !gate) throw new Error("DISCOVERY_GENERIC_ASSEMBLY_EVIDENCE_MISSING");
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
    try {
      const failed = await failClaimedDiscoveryGeneration(
        claim,
        "discovery_generation_service",
        message,
        isDiscoveryRejectedCandidateError(error) ? error.payload : undefined,
      );
      if (!failed) throw new Error("DISCOVERY_GENERIC_FAILURE_NOT_DURABLY_RECORDED");
    } catch (failureError) {
      throw new AggregateError(
        [error, failureError],
        "DISCOVERY_GENERIC_FAILURE_RECORDING_FAILED",
      );
    }
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
