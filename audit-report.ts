/**
 * Audit complet du rapport de prise de sang
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function auditReport() {
  console.log("🔍 AUDIT COMPLET - Rapport vs PDF\n");

  try {
    // 1. Extract PDF text
    const pdf = await import("pdf-parse/lib/pdf-parse.js");
    const pdfPath = path.join(__dirname, "data", "Résultats prise de sang 23 Décembre 2025.pdf");
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(dataBuffer);
    const pdfText = pdfData.text;

    console.log("📄 PDF TEXT:");
    console.log("=".repeat(80));
    console.log(pdfText);
    console.log("=".repeat(80));
    console.log("\n");

    // 2. Get report from DB
    const { db } = await import("./server/db.js");
    const { bloodTests } = await import("./shared/drizzle-schema.js");
    const { eq } = await import("drizzle-orm");

    const results = await db.select().from(bloodTests).where(eq(bloodTests.id, "5ba99d4f-ad5c-43f2-bae1-17c18748f85b"));

    if (results.length === 0) {
      console.error("❌ Report not found");
      return;
    }

    const report = results[0];
    const analysis = typeof report.analysis === 'object' ? report.analysis as any : {};

    console.log("📊 MARKERS IN DB:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(report.markers, null, 2));
    console.log("=".repeat(80));
    console.log("\n");

    console.log("📝 AI REPORT:");
    console.log("=".repeat(80));
    console.log(analysis.aiReport);
    console.log("=".repeat(80));
    console.log("\n");

    console.log("✅ Audit data extracted");
    console.log(`   - PDF: ${pdfText.length} chars`);
    console.log(`   - Markers: ${report.markers.length}`);
    console.log(`   - AI Report: ${analysis.aiReport.length} chars`);

  } catch (error) {
    console.error("❌ ERROR:", error);
    throw error;
  }
}

auditReport()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
