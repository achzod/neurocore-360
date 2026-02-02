import fs from "fs";

// Load .env BEFORE importing db
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function checkSchema() {
  try {
    // Import db and sql AFTER env is loaded
    const { db } = await import("./server/db.js");
    const { sql } = await import("drizzle-orm");

    // Check which blood tables exist
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name LIKE 'blood%'
    `);

    console.log("📊 Blood-related tables:");
    console.log(tables.rows);

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkSchema();
