/**
 * Quick audit script: extract markers from the Marti Remy PDF,
 * run analyzeBloodwork, and print results for audit.
 *
 * Mocks DB-dependent modules to run purely locally.
 */

// Stub the knowledge/storage module so we don't need a DB
import Module from "module";
const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request.includes("knowledge/storage") || request.includes("knowledge/search")) {
    return origResolve.call(this, request, ...args);
  }
  return origResolve.call(this, request, ...args);
};

// Set env to avoid DB requirement
process.env.DATABASE_URL = "postgresql://stub:stub@localhost:5432/stub";
process.env.SKIP_DB_INIT = "true";

import pdf from "pdf-parse";
import { readFileSync } from "fs";

async function main() {
  // Dynamic import after env setup
  const bloodModule = await import("./server/blood-analysis/index");
  const {
    extractMarkersFromPdfText,
    extractPatientInfoFromPdfText,
    analyzeBloodwork,
    BIOMARKER_RANGES,
  } = bloodModule;

  const pdfPath = "/tmp/blood-test-marti-remy.pdf";
  const buffer = readFileSync(pdfPath);
  const parsed = await pdf(buffer);
  const text = parsed.text || "";

  console.log("=== PDF TEXT (first 4000 chars) ===");
  console.log(text.slice(0, 4000));
  console.log("...\n");

  console.log("=== PATIENT INFO ===");
  const patient = extractPatientInfoFromPdfText(text);
  console.log(JSON.stringify(patient, null, 2));

  console.log("\n=== EXTRACTED MARKERS ===");
  const markers = await extractMarkersFromPdfText(text, "bilan_marti_remy.pdf");
  console.log(`Found ${markers.length} markers:`);
  for (const m of markers) {
    const range = BIOMARKER_RANGES[m.markerId];
    console.log(
      `  ${m.markerId.padEnd(22)} = ${String(m.value).padStart(8)} ${(range?.unit || "").padEnd(8)}  [optimal: ${range ? `${range.optimalMin}-${range.optimalMax}` : "?"}]`
    );
  }

  if (markers.length === 0) {
    console.log("\n❌ No markers extracted. Dumping full PDF text for debug:");
    console.log(text);
    return;
  }

  console.log("\n=== ANALYSIS RESULT ===");
  const analysis = await analyzeBloodwork(markers, {
    gender: patient.gender || "homme",
    age: undefined,
  });

  console.log(`\nSummary:`);
  console.log(`  Optimal: ${analysis.summary.optimal.join(", ") || "(none)"}`);
  console.log(`  Watch:   ${analysis.summary.watch.join(", ") || "(none)"}`);
  console.log(`  Action:  ${analysis.summary.action.join(", ") || "(none)"}`);

  console.log(`\nDetected Patterns:`);
  for (const p of analysis.patterns) {
    console.log(`  - ${p.name}: ${p.causes.join(", ")}`);
  }

  console.log(`\nMarker Details:`);
  for (const m of analysis.markers) {
    const statusIcon =
      m.status === "optimal" ? "✅" :
      m.status === "normal" ? "🟡" :
      m.status === "suboptimal" ? "🟠" : "🔴";
    console.log(
      `  ${statusIcon} ${m.name.padEnd(24)} ${String(m.value).padStart(8)} ${m.unit.padEnd(8)} [${m.status}] ${m.normalRange || ""} / optimal ${m.optimalRange || ""}`
    );
    if (m.interpretation) {
      console.log(`     → ${m.interpretation}`);
    }
  }

  console.log(`\nRecommendations (Priority 1):`);
  for (const r of analysis.recommendations.priority1) {
    console.log(`  - ${r.action} ${r.dosage ? `(${r.dosage})` : ""} — ${r.why}`);
  }

  console.log(`\nFollow-up tests:`);
  for (const f of analysis.followUp) {
    console.log(`  - ${f.test} in ${f.delay}: ${f.objective}`);
  }

  console.log(`\nAlerts:`);
  for (const a of analysis.alerts) {
    console.log(`  ⚠️  ${a}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
