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

async function verifyReport() {
  const { db } = await import("./server/db.js");
  const { bloodTests } = await import("./shared/drizzle-schema.js");
  const { eq } = await import("drizzle-orm");

  const reportId = "25ccd9e0-7945-47e2-9e25-3714885425a0";

  console.log("📊 Fetching blood test report from database...\n");

  const [report] = await db
    .select()
    .from(bloodTests)
    .where(eq(bloodTests.id, reportId))
    .limit(1);

  if (!report) {
    console.error("❌ Report not found!");
    process.exit(1);
  }

  console.log("✅ Report found!\n");
  console.log("📋 EXTRACTED MARKER VALUES:\n");

  const markers = report.markers as any[];
  const sortedMarkers = markers.sort((a, b) => a.markerId.localeCompare(b.markerId));

  // Expected values from PDF
  const expected: Record<string, number> = {
    insuline_jeun: 49.1,
    homa_ir: 12.61,
    glycemie_jeun: 104,
    triglycerides: 530,
    hdl: 26,
    ldl: 105,
    cholesterol_total: 187,
    apob: 103,
    apo_a1: 109,
    vitamine_d: 12.3,
    crp_us: 8.6,
    fructosamine: 216,
    cortisol: 2.54,
    testosterone_total: 410,
    testosterone_libre: 6,
  };

  let allCorrect = true;

  for (const marker of sortedMarkers) {
    const expectedValue = expected[marker.markerId];
    if (expectedValue !== undefined) {
      const tolerance = expectedValue * 0.02; // 2% tolerance
      const diff = Math.abs(marker.value - expectedValue);
      const matches = diff <= tolerance;

      if (matches) {
        console.log(`✅ ${marker.markerId}: ${marker.value} (expected ${expectedValue})`);
      } else {
        console.log(`❌ ${marker.markerId}: ${marker.value} (expected ${expectedValue}) DIFF: ${diff.toFixed(2)}`);
        allCorrect = false;
      }
    } else {
      console.log(`ℹ️  ${marker.markerId}: ${marker.value} (no expected value)`);
    }
  }

  console.log(`\n${allCorrect ? "✅ ALL VALUES CORRECT!" : "❌ SOME VALUES INCORRECT"}\n`);

  // Check AI report content
  const aiReport = report.analysis?.aiReport as string;
  if (aiReport) {
    console.log(`📝 AI Report: ${aiReport.length} chars\n`);

    // Check for critical keywords
    const checks = [
      { keyword: "résistance", context: "résistance à l'insuline", present: aiReport.toLowerCase().includes("résistance") },
      { keyword: "HOMA", context: "mention HOMA-IR", present: /homa[-\s]?ir/i.test(aiReport) },
      { keyword: "cortisol", context: "mention cortisol", present: /cortisol/i.test(aiReport) },
      { keyword: "49", context: "insuline 49.1", present: aiReport.includes("49") },
      { keyword: "12.6", context: "HOMA-IR 12.6", present: aiReport.includes("12.6") || aiReport.includes("12,6") },
    ];

    console.log("🔍 AI REPORT CONTENT CHECKS:\n");
    checks.forEach(check => {
      console.log(`${check.present ? "✅" : "❌"} ${check.context}: ${check.present ? "PRESENT" : "MISSING"}`);
    });
  }
}

verifyReport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
