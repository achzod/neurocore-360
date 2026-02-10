/**
 * Quick test: Extract markers from PDF and verify values
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

async function testExtraction() {
  console.log("🧪 Testing Blood PDF Extraction\n");

  try {
    // 1. Import modules
    const pdf = await import("pdf-parse/lib/pdf-parse.js");
    const { extractMarkersFromPdfText } = await import("./server/blood-analysis/index.js");

    // 2. Read PDF
    const pdfPath = path.join(__dirname, "data", "Résultats prise de sang 23 Décembre 2025.pdf");
    console.log("📄 Reading PDF:", pdfPath);

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(dataBuffer);
    const pdfText = pdfData.text;

    console.log(`✅ PDF loaded: ${pdfText.length} chars\n`);

    // 3. Extract markers
    console.log("🔍 Extracting markers...\n");
    const markers = await extractMarkersFromPdfText(pdfText, "test.pdf");
    console.log(`✅ ${markers.length} markers extracted\n`);

    // 4. Display critical markers for verification
    console.log("🎯 CRITICAL MARKERS (Expected vs Extracted):\n");

    const criticalTests = [
      { id: "insuline_jeun", expected: 49.1, unit: "mUI/L" },
      { id: "homa_ir", expected: 12.60, unit: "" },
      { id: "glycemie_jeun", expected: 104, unit: "mg/dL" },
      { id: "triglycerides", expected: 530, unit: "mg/dL" },
      { id: "hdl", expected: 26, unit: "mg/dL" },
      { id: "ldl", expected: 105, unit: "mg/dL" },
      { id: "cholesterol_total", expected: 187, unit: "mg/dL" },
      { id: "apob", expected: 103, unit: "mg/dL" },
      { id: "apo_a1", expected: 109, unit: "mg/dL" },
      { id: "vitamine_d", expected: 12.3, unit: "ng/mL" },
      { id: "crp_us", expected: 8.6, unit: "mg/L" },
      { id: "fructosamine", expected: 216, unit: "µmol/L" },
      { id: "cortisol", expected: 70, unit: "nmol/L" },
      { id: "testosterone_total", expected: 4.10, unit: "ng/mL" },
    ];

    let passCount = 0;
    let failCount = 0;

    for (const test of criticalTests) {
      const marker = markers.find(m => m.markerId === test.id);
      if (!marker) {
        console.log(`❌ ${test.id.toUpperCase()}: MISSING (expected ${test.expected} ${test.unit})`);
        failCount++;
        continue;
      }

      const tolerance = test.expected * 0.02; // 2% tolerance
      const diff = Math.abs(marker.value - test.expected);
      const matches = diff <= tolerance;

      if (matches) {
        console.log(`✅ ${test.id.toUpperCase()}: ${marker.value} ${test.unit} (expected ${test.expected})`);
        passCount++;
      } else {
        console.log(`❌ ${test.id.toUpperCase()}: ${marker.value} ${test.unit} (expected ${test.expected}) DIFF: ${diff.toFixed(2)}`);
        failCount++;
      }
    }

    console.log(`\n📊 RESULTS: ${passCount} passed, ${failCount} failed\n`);

    // 5. Display all extracted markers
    console.log("📋 ALL EXTRACTED MARKERS:\n");
    markers
      .sort((a, b) => a.markerId.localeCompare(b.markerId))
      .forEach(m => {
        console.log(`   ${m.markerId}: ${m.value}`);
      });

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    throw error;
  }
}

testExtraction()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
