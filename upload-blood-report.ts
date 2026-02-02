/**
 * Upload blood test PDF and generate report in DB
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";
import fetch from "node-fetch";
import { sql, eq } from "drizzle-orm";

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

async function uploadBloodTest() {
  console.log("🩸 Generate Blood Test Report in DB\n");

  try {
    const testEmail = `achzod-test-${Date.now()}@neurocore.test`;
    console.log("📧 Test user:", testEmail, "\n");

    // 1. Import modules
    const pdf = await import("pdf-parse/lib/pdf-parse.js");
    const {
      extractMarkersFromPdfText,
      analyzeBloodwork,
      generateAIBloodAnalysis,
      getBloodworkKnowledgeContext
    } = await import("./server/blood-analysis/index.js");

    // 3. Read PDF
    const pdfPath = path.join(__dirname, "data", "Résultats prise de sang 23 Décembre 2025.pdf");
    console.log("📄 Reading PDF:", pdfPath);

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(dataBuffer);
    const pdfText = pdfData.text;

    console.log(`✅ PDF loaded: ${pdfText.length} chars\n`);

    // 4. Extract markers
    console.log("🔍 Extracting markers...");
    const markers = await extractMarkersFromPdfText(pdfText, "BloodAI_PRD_v2.pdf");
    console.log(`✅ ${markers.length} markers extracted\n`);

    // 5. Analyze
    console.log("🔬 Analyzing bloodwork...");
    const analysis = await analyzeBloodwork(markers, {
      gender: "homme",
      age: "35",
      objectives: "recomposition corporelle, performance, optimisation métabolique"
    });
    console.log(`✅ Analysis complete: ${analysis.markers.length} markers\n`);

    // 6. RAG context
    console.log("📚 Getting RAG context...");
    const ragContext = await getBloodworkKnowledgeContext(analysis.markers, analysis.patterns);
    console.log(`✅ RAG context: ${ragContext.length} chars\n`);

    // 7. Generate AI report with NEW EXPERT PROMPT (tutoiement)
    console.log("🤖 Generating EXPERT AI report with tutoiement...");
    console.log("   (This will take 15-30 minutes...)\n");

    const startTime = Date.now();
    const aiReport = await generateAIBloodAnalysis(
      analysis,
      {
        gender: "homme",
        age: "35",
        objectives: "recomposition corporelle, performance, optimisation métabolique",
        prenom: "Test"
      },
      ragContext
    );
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ AI report generated in ${duration}s: ${aiReport.length} chars\n`);

    // 8. Insert into DB
    console.log("💾 Saving to database...\n");

    const { db } = await import("./server/db.js");
    const { bloodTests } = await import("./shared/drizzle-schema.js");
    const { sql } = await import("drizzle-orm");

    // Use existing user ID from database
    const testUserId = "cmjmoobz8000fqjbdacro2yhd"; // achkou@gmail.com

    // Insert blood test report
    const [bloodTest] = await db.insert(bloodTests).values({
      userId: testUserId, // Use existing user ID
      fileName: "BloodAI_PRD_v2.pdf",
      fileType: "application/pdf",
      fileSize: 30825,
      status: "completed",
      markers: analysis.markers,
      analysis: {
        summary: analysis.summary,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        followUp: analysis.followUp,
        alerts: analysis.alerts,
        aiReport: aiReport,  // Store the full AI report here
      },
      patientProfile: {
        gender: "homme",
        age: "35",
        objectives: "recomposition corporelle, performance, optimisation métabolique",
        prenom: "Test",
        email: testEmail
      },
      completedAt: new Date()
    }).returning();

    console.log(`✅ Blood test saved to DB\n`);
    console.log(`🎉 SUCCESS!\n`);
    console.log(`📊 View your report on the dashboard:\n`);
    console.log(`   https://neurocore-360.onrender.com/analysis/${bloodTest.id}\n`);
    console.log(`💡 Report details:`);
    console.log(`   - ID: ${bloodTest.id}`);
    console.log(`   - Markers: ${analysis.markers.length}`);
    console.log(`   - Report size: ${aiReport.length} chars`);
    console.log(`   - Citations: ${(aiReport.match(/\[SRC:/g) || []).length}\n`);

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    throw error;
  }
}

uploadBloodTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
