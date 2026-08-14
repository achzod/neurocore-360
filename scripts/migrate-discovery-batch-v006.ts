import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { assertDiscoveryBatchSchemaV006, DISCOVERY_BATCH_SCHEMA_VERSION } from "../server/discoveryBatchSchema";

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
  const migrationPath = fileURLToPath(new URL("../migrations/006_discovery_rejected_candidate_retry.sql", import.meta.url));
  const sql = readFileSync(migrationPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='15s'");
    await client.query("SET LOCAL statement_timeout='60s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('discovery-schema-migration-v006'))");
    await client.query(sql);
    await assertDiscoveryBatchSchemaV006(client);
    await client.query("COMMIT");
    console.log(`DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v${DISCOVERY_BATCH_SCHEMA_VERSION}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(`DISCOVERY_BATCH_SCHEMA_MIGRATION_FAILED:${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
