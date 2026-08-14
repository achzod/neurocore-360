import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { assertDiscoveryBatchSchemaV009 } from "../server/discoveryBatchSchema";

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
  const migrationPath = fileURLToPath(new URL(
    "../migrations/009_discovery_generation_active_artifact_binding.sql",
    import.meta.url,
  ));
  const sql = readFileSync(migrationPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='15s'");
    await client.query("SET LOCAL statement_timeout='60s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('discovery-schema-migration-v009'))");
    await client.query(sql);
    await assertDiscoveryBatchSchemaV009(client);
    await client.query("COMMIT");
    console.log("DISCOVERY_BATCH_SCHEMA_MIGRATION_OK:v9");
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
