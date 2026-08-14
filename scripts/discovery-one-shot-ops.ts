/**
 * Exact Discovery one-shot remediation operations.
 *
 * This CLI cannot generate reports or deliver email. Both modes acquire the
 * durable discovery-global lock and delegate one all-or-nothing transaction
 * to discoveryBatchControl.
 */
import {
  acquireDiscoveryGlobalLock,
  promoteExactValidDiscoveryWithoutDelivery,
  quarantineExactDiscoveryPrelaunchTests,
  repairExactAlexandreDiscoveryCriticalCopyWithoutDelivery,
  repairExactLennyDiscoveryQualityWithoutDelivery,
  resolveExactSuzieDiscoveryDuplicateWithoutDelivery,
  releaseDiscoveryGlobalLock,
} from "../server/discoveryBatchControl";
import { assertDiscoveryBatchSchemaV005 } from "../server/discoveryBatchSchema";
import { pool } from "../server/db";

const argv = process.argv.slice(2);
const args = new Set(argv);
const valueAfter = (flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

function requireOfflineRemediationEnvironment(): void {
  if (String(process.env.REMEDIATION_SIDE_EFFECTS_DISABLED || "").toLowerCase() !== "true") {
    throw new Error("DISCOVERY_ONE_SHOT_SIDE_EFFECTS_MUST_BE_DISABLED");
  }
  if (String(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("DISCOVERY_ONE_SHOT_DELIVERY_MUST_BE_DISABLED");
  }
  if (String(process.env.DISCOVERY_UNIFIED_GENERATION_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("DISCOVERY_ONE_SHOT_GENERATION_MUST_BE_DISABLED");
  }
}

async function main(): Promise<void> {
  const quarantine = args.has("--quarantine-test");
  const promote = args.has("--promote-valid-no-delivery");
  const repairLenny = args.has("--repair-lenny-quality");
  const repairAlexandre = args.has("--repair-alexandre-critical-copy");
  const resolveSuzie = args.has("--resolve-suzie-duplicate");
  if (Number(quarantine) + Number(promote) + Number(repairLenny)
      + Number(repairAlexandre) + Number(resolveSuzie) !== 1) {
    throw new Error("DISCOVERY_ONE_SHOT_EXACTLY_ONE_OPERATION_REQUIRED");
  }
  requireOfflineRemediationEnvironment();
  await assertDiscoveryBatchSchemaV005(pool);

  const purpose = quarantine
    ? "one-shot:quarantine-test"
    : promote
      ? "one-shot:promote-valid-no-delivery"
      : repairLenny
        ? "one-shot:repair-lenny-quality"
        : repairAlexandre
          ? "one-shot:repair-alexandre-critical-copy"
          : "one-shot:resolve-suzie-duplicate";
  const lock = await acquireDiscoveryGlobalLock({
    owner: `discovery-one-shot:${process.pid}`,
    purpose,
    ttlMinutes: 20,
  }, pool);
  try {
    if (quarantine) {
      const result = await quarantineExactDiscoveryPrelaunchTests({ lockToken: lock.token }, pool);
      console.log(`DISCOVERY_ONE_SHOT_QUARANTINE_COMPLETE:${JSON.stringify(result)}`);
      return;
    }

    if (repairLenny) {
      const result = await repairExactLennyDiscoveryQualityWithoutDelivery({ lockToken: lock.token }, pool);
      console.log(`DISCOVERY_ONE_SHOT_LENNY_QUALITY_COMPLETE:${JSON.stringify(result)}`);
      return;
    }

    if (repairAlexandre) {
      const result = await repairExactAlexandreDiscoveryCriticalCopyWithoutDelivery(
        { lockToken: lock.token },
        pool,
      );
      console.log(`DISCOVERY_ONE_SHOT_ALEXANDRE_CRITICAL_COPY_COMPLETE:${JSON.stringify(result)}`);
      return;
    }

    if (resolveSuzie) {
      const result = await resolveExactSuzieDiscoveryDuplicateWithoutDelivery(
        { lockToken: lock.token },
        pool,
      );
      console.log(`DISCOVERY_ONE_SHOT_SUZIE_DUPLICATE_COMPLETE:${JSON.stringify(result)}`);
      return;
    }

    const expectedCurrentStatus = valueAfter("--expected-current-status");
    if (!expectedCurrentStatus
      || !["NEEDS_REVIEW", "BATCH_REVIEW", "BATCH_READY"].includes(expectedCurrentStatus)) {
      throw new Error("DISCOVERY_ONE_SHOT_EXPECTED_STATUS_REQUIRED");
    }
    const expectedTxtSha256 = valueAfter("--expected-txt-sha256") || "";
    const expectedHtmlSha256 = valueAfter("--expected-html-sha256") || "";
    const result = await promoteExactValidDiscoveryWithoutDelivery({
      lockToken: lock.token,
      expectedCurrentStatus: expectedCurrentStatus as "NEEDS_REVIEW" | "BATCH_REVIEW" | "BATCH_READY",
      expectedTxtSha256,
      expectedHtmlSha256,
    }, pool);
    console.log(`DISCOVERY_ONE_SHOT_PROMOTION_COMPLETE:${JSON.stringify(result)}`);
  } finally {
    const released = await releaseDiscoveryGlobalLock(lock.token, pool);
    if (!released) throw new Error("DISCOVERY_ONE_SHOT_LOCK_RELEASE_FAILED");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
