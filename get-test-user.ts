import fs from "fs";

// Load .env
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

async function getTestUser() {
  const { db } = await import("./server/db.js");
  const { sql } = await import("drizzle-orm");

  // Get first user
  const users = await db.execute(sql`SELECT id, email FROM users LIMIT 5`);

  console.log("📊 Available users:");
  console.log(users.rows);

  process.exit(0);
}

getTestUser();
