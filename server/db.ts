import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/drizzle-schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const dbUrl = process.env.DATABASE_URL!;
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: (dbUrl.includes('render.com') || dbUrl.includes('neon.tech'))
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.DB_POOL_MAX || "5"),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || "15000"),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || "30000"),
});

pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected error on idle client:", err.message);
});

export const db = drizzle(pool, { schema });
