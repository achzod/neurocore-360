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

async function checkReport() {
  const { db } = await import("./server/db.js");
  const { sql } = await import("drizzle-orm");

  // Check if report exists
  const reportId = "806628cb-c8b6-4853-ad1f-8b22b76fdd1e";

  const reports = await db.execute(sql`
    SELECT id, user_id, status, file_name,
           jsonb_array_length(markers) as marker_count,
           length(analysis::text) as analysis_size,
           created_at, completed_at
    FROM blood_tests
    WHERE id = ${reportId}
  `);

  console.log("📊 Report in database:");
  console.log(reports.rows);

  if (reports.rows.length === 0) {
    console.log("\n❌ Report NOT found in blood_tests table");

    // Check all recent reports
    const allReports = await db.execute(sql`
      SELECT id, user_id, status, file_name, created_at
      FROM blood_tests
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log("\n📋 Recent reports:");
    console.log(allReports.rows);
  }

  process.exit(0);
}

checkReport();
