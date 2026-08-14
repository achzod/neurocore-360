/**
 * Exact Alexandre Discovery replay.
 *
 * --inspect is read-only and emits the exact manifest/hash to approve.
 * --apply requires that hash, re-locks and recomputes it in the write
 * transaction, and performs deterministic catalogue reconstruction only.
 * There is no provider or email import in this executable.
 */
import { Pool } from "pg";

import {
  acquireAlexandreOfflineReplayLock,
  inspectExactAlexandreOfflineReplay,
  releaseAlexandreOfflineReplayLock,
  replayExactAlexandreDiscoveryOffline,
  assertDiscoveryOfflineReplaySchemaV010,
} from "../server/discoveryAlexandreOfflineReplay";

const argv = process.argv.slice(2);
const args = new Set(argv);
const valueAfter = (flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

function requireOfflineEnvironment(): void {
  if (String(process.env.REMEDIATION_SIDE_EFFECTS_DISABLED || "").toLowerCase() !== "true") {
    throw new Error("ALEXANDRE_REPLAY_SIDE_EFFECTS_MUST_BE_DISABLED");
  }
  if (String(process.env.DISCOVERY_REPORT_DELIVERY_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("ALEXANDRE_REPLAY_DELIVERY_MUST_BE_DISABLED");
  }
  if (String(process.env.DISCOVERY_UNIFIED_GENERATION_ENABLED || "").toLowerCase() !== "false") {
    throw new Error("ALEXANDRE_REPLAY_GENERATION_MUST_BE_DISABLED");
  }
}

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
  max: 1,
});

async function main(): Promise<void> {
  const inspect = args.has("--inspect");
  const apply = args.has("--apply");
  if (Number(inspect) + Number(apply) !== 1) {
    throw new Error("ALEXANDRE_REPLAY_EXACTLY_ONE_MODE_REQUIRED");
  }
  requireOfflineEnvironment();
  await assertDiscoveryOfflineReplaySchemaV010(pool);
  if (inspect) {
    const result = await inspectExactAlexandreOfflineReplay(pool);
    console.log(`ALEXANDRE_OFFLINE_REPLAY_MANIFEST:${JSON.stringify(result)}`);
    return;
  }

  const expectedManifestSha256 = String(valueAfter("--expected-manifest-sha256") || "");
  if (!/^[a-f0-9]{64}$/.test(expectedManifestSha256)) {
    throw new Error("ALEXANDRE_REPLAY_EXPECTED_MANIFEST_SHA256_REQUIRED");
  }
  const lock = await acquireAlexandreOfflineReplayLock(pool);
  try {
    const result = await replayExactAlexandreDiscoveryOffline({
      lockToken: lock.token,
      expectedManifestSha256,
    }, pool);
    console.log(`ALEXANDRE_OFFLINE_REPLAY_COMPLETE:${JSON.stringify(result)}`);
  } finally {
    const released = await releaseAlexandreOfflineReplayLock(pool, lock.token);
    if (!released) throw new Error("ALEXANDRE_REPLAY_GLOBAL_LOCK_RELEASE_FAILED");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
