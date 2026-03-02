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
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
