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

  const reportId = "bb7c8437-eefa-4730-84cd-33cb40d4ae7a";

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

  // Save to file
  fs.writeFileSync('/tmp/blood-report-v2.md', aiReport);
  console.log('✅ Report saved to /tmp/blood-report-v2.md');
  console.log(`\nReport length: ${aiReport.length} chars`);

  // Check for tutoiement
  console.log('\n=== STYLE CONVERSATIONNEL CHECKS ===\n');

  const checks = {
    'Tutoiement "Tu"': aiReport.match(/\bTu\b/g)?.length || 0,
    'Tutoiement "ton/ta/tes"': (aiReport.match(/\bton\b/gi)?.length || 0) + (aiReport.match(/\bta\b/gi)?.length || 0) + (aiReport.match(/\btes\b/gi)?.length || 0),
    'Expert "je"': aiReport.match(/\bJe\b/g)?.length || 0,
    'Impersonnel "Le patient"': aiReport.match(/Le patient/gi)?.length || 0,
    'Impersonnel "On observe"': aiReport.match(/On observe/gi)?.length || 0,
  };

  Object.entries(checks).forEach(([label, count]) => {
    const status = label.includes('Impersonnel') ? (count === 0 ? '✅' : '❌') : (count > 10 ? '✅' : '⚠️');
    console.log(`${status} ${label}: ${count} occurrences`);
  });

  // Show first 4000 chars
  console.log('\n=== FIRST 4000 CHARS ===\n');
  console.log(aiReport.substring(0, 4000));

  // Show example from middle
  console.log('\n=== EXEMPLE MILIEU (chars 20000-24000) ===\n');
  console.log(aiReport.substring(20000, 24000));
}

fetchReport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
