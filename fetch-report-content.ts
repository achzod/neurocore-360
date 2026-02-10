import fs from "fs";

// Load env
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

async function fetchReport() {
  const { db } = await import("./server/db.js");
  const { bloodTests } = await import("./shared/drizzle-schema.js");
  const { eq } = await import("drizzle-orm");

  const reportId = "25ccd9e0-7945-47e2-9e25-3714885425a0";

  const [report] = await db
    .select()
    .from(bloodTests)
    .where(eq(bloodTests.id, reportId))
    .limit(1);

  if (!report) {
    console.error("❌ Report not found!");
    process.exit(1);
  }

  const aiReport = report.analysis?.aiReport as string;

  // Save to file for inspection
  fs.writeFileSync('/tmp/blood-report-ai.md', aiReport);
  console.log('✅ Report saved to /tmp/blood-report-ai.md');
  console.log(`\nReport length: ${aiReport.length} chars`);

  // Show first 3000 chars
  console.log('\n=== FIRST 3000 CHARS ===\n');
  console.log(aiReport.substring(0, 3000));

  // Check for sections
  console.log('\n\n=== SECTIONS FOUND ===\n');
  const sections = aiReport.match(/^##\s+.+$/gm) || [];
  sections.forEach((section, i) => {
    console.log(`${i + 1}. ${section}`);
  });
}

fetchReport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
