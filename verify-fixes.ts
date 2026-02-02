/**
 * Verify all fixes are working correctly in the new test report
 */
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

// Dynamic imports after env is loaded
const { db } = await import("./server/db.js");
const { bloodTests } = await import("./shared/drizzle-schema.js");
const { eq } = await import("drizzle-orm");

const testId = "7e59bc99-ca77-4930-a031-07c27362d6e0";

const [test] = await db
  .select()
  .from(bloodTests)
  .where(eq(bloodTests.id, testId))
  .limit(1);

if (!test) {
  console.error("❌ Test not found");
  process.exit(1);
}

console.log("\n" + "=".repeat(80));
console.log("🔍 VÉRIFICATION COMPLÈTE DES FIXES - RAPPORT TEST PRODUCTION");
console.log("=".repeat(80) + "\n");

const markers = test.markers as Array<{ markerId: string; value: number; unit?: string }>;
const analysis = test.analysis as any;
const report = analysis?.aiReport || "";

// ============================================================================
// PHASE 1: EXTRACTION FIXES
// ============================================================================
console.log("📊 PHASE 1: VÉRIFICATION EXTRACTION DES MARQUEURS\n");

const markerMap = new Map(markers.map(m => [m.markerId, m]));

// Test 1: Insuline
const insuline = markerMap.get("insuline_jeun");
console.log("1️⃣  INSULINE À JEUN");
console.log(`   Valeur extraite: ${insuline?.value || "ABSENT"} ${insuline?.unit || ""}`);
if (insuline && insuline.value >= 45 && insuline.value <= 52) {
  console.log("   ✅ CORRECT (attendu: ~49.1 µIU/mL)");
} else {
  console.log(`   ❌ ERREUR (attendu: 49.1 µIU/mL, obtenu: ${insuline?.value || "ABSENT"})`);
}

// Test 2: HOMA-IR
const homaIr = markerMap.get("homa_ir");
console.log("\n2️⃣  HOMA-IR");
console.log(`   Valeur extraite: ${homaIr?.value || "ABSENT"}`);
if (homaIr && homaIr.value >= 12 && homaIr.value <= 13) {
  console.log("   ✅ CORRECT (attendu: ~12.60)");
} else {
  console.log(`   ❌ ERREUR (attendu: 12.60, obtenu: ${homaIr?.value || "ABSENT"})`);
}

// Test 3: Cortisol
const cortisol = markerMap.get("cortisol");
console.log("\n3️⃣  CORTISOL");
console.log(`   Valeur extraite: ${cortisol?.value || "ABSENT"} ${cortisol?.unit || ""}`);
if (cortisol && cortisol.value >= 65 && cortisol.value <= 75) {
  console.log("   ✅ CORRECT (attendu: ~70 nmol/L)");
} else {
  console.log(`   ❌ ERREUR (attendu: 70 nmol/L, obtenu: ${cortisol?.value || "ABSENT"})`);
}

// Test 4: Vitamine D
const vitD = markerMap.get("vitamine_d");
console.log("\n4️⃣  VITAMINE D");
console.log(`   Valeur extraite: ${vitD?.value || "ABSENT"} ${vitD?.unit || ""}`);
if (vitD && vitD.value >= 12 && vitD.value <= 13) {
  console.log("   ✅ CORRECT (attendu: ~12.3 ng/mL)");
} else {
  console.log(`   ❌ ERREUR (attendu: 12.3 ng/mL, obtenu: ${vitD?.value || "ABSENT"})`);
}

// Test 5: ApoA1 (nouveau marqueur)
const apoa1 = markerMap.get("apoa1");
console.log("\n5️⃣  ApoA1 (nouveau marqueur ajouté)");
console.log(`   Valeur extraite: ${apoa1?.value || "ABSENT"} ${apoa1?.unit || ""}`);
if (apoa1) {
  console.log("   ✅ PRÉSENT (fix vérifié)");
} else {
  console.log("   ❌ ABSENT");
}

// Test 6: Fructosamine (nouveau marqueur)
const fructosamine = markerMap.get("fructosamine");
console.log("\n6️⃣  FRUCTOSAMINE (nouveau marqueur ajouté)");
console.log(`   Valeur extraite: ${fructosamine?.value || "ABSENT"} ${fructosamine?.unit || ""}`);
if (fructosamine) {
  console.log("   ✅ PRÉSENT (fix vérifié)");
} else {
  console.log("   ❌ ABSENT");
}

// Summary Phase 1
const phase1Pass =
  insuline && insuline.value >= 45 && insuline.value <= 52 &&
  homaIr && homaIr.value >= 12 && homaIr.value <= 13 &&
  cortisol && cortisol.value >= 65 && cortisol.value <= 75 &&
  vitD && vitD.value >= 12 && vitD.value <= 13 &&
  apoa1 && fructosamine;

console.log("\n" + "-".repeat(80));
console.log(`Phase 1 Status: ${phase1Pass ? "✅ TOUS LES TESTS PASSÉS" : "❌ CERTAINS TESTS ÉCHOUÉS"}`);
console.log("-".repeat(80) + "\n");

// ============================================================================
// PHASE 2: UX IMPROVEMENTS
// ============================================================================
console.log("🎨 PHASE 2: VÉRIFICATION AMÉLIORATIONS UX\n");

// Test 7: Quick Start section
const hasQuickStart = report.includes("## Quick Start");
console.log("7️⃣  SECTION QUICK START");
console.log(`   Présent: ${hasQuickStart ? "✅ OUI" : "❌ NON"}`);
if (hasQuickStart) {
  const quickStartMatch = report.match(/## Quick Start.*?(?=##)/s);
  if (quickStartMatch) {
    const quickStartLength = quickStartMatch[0].length;
    console.log(`   Longueur: ${quickStartLength} chars`);
    const hasActions = report.includes("ACTION #1") || report.includes("🚨");
    console.log(`   Format actions: ${hasActions ? "✅ CORRECT" : "❌ ABSENT"}`);
  }
}

// Test 8: Dashboard visuel section
const hasDashboard = report.includes("## Dashboard");
console.log("\n8️⃣  SECTION DASHBOARD VISUEL");
console.log(`   Présent: ${hasDashboard ? "✅ OUI" : "❌ NON"}`);
if (hasDashboard) {
  const hasScores = report.match(/\d+\/100/);
  console.log(`   Format scores: ${hasScores ? "✅ CORRECT" : "❌ ABSENT"}`);
}

// Test 9: Risk Assessment section
const hasRiskAssessment = report.includes("## Risk Assessment") || report.includes("Risk assessment");
console.log("\n9️⃣  SECTION RISK ASSESSMENT");
console.log(`   Présent: ${hasRiskAssessment ? "✅ OUI" : "❌ NON"}`);
if (hasRiskAssessment) {
  const hasRisques = report.includes("RISQUE") || report.includes("risque");
  console.log(`   Format risques: ${hasRisques ? "✅ CORRECT" : "❌ ABSENT"}`);
}

// Test 10: Executive summary length
const execSummaryMatch = report.match(/## Synthese executive(.*?)(?=##)/s);
console.log("\n🔟 SYNTHÈSE EXECUTIVE (longueur)");
if (execSummaryMatch) {
  const execLength = execSummaryMatch[1].trim().length;
  const wordCount = execSummaryMatch[1].trim().split(/\s+/).length;
  console.log(`   Longueur: ${execLength} chars (~${wordCount} mots)`);
  if (wordCount <= 450) {
    console.log("   ✅ CORRECT (≤400-450 mots attendu)");
  } else {
    console.log(`   ⚠️  LONG (attendu: ≤400 mots, obtenu: ${wordCount} mots)`);
  }
} else {
  console.log("   ❌ SECTION NON TROUVÉE");
}

// Summary Phase 2
const phase2Pass = hasQuickStart && hasDashboard && hasRiskAssessment;

console.log("\n" + "-".repeat(80));
console.log(`Phase 2 Status: ${phase2Pass ? "✅ TOUS LES TESTS PASSÉS" : "❌ CERTAINS TESTS ÉCHOUÉS"}`);
console.log("-".repeat(80) + "\n");

// ============================================================================
// PHASE 3: CITATION FORMAT
// ============================================================================
console.log("📚 PHASE 3: VÉRIFICATION FORMAT CITATIONS\n");

// Test 11: [SRC:UUID] citations (should be ZERO)
const srcUuidMatches = report.match(/\[SRC:[a-f0-9-]+\]/g) || [];
console.log("1️⃣1️⃣  CITATIONS [SRC:UUID] (anciennes)");
console.log(`   Nombre trouvé: ${srcUuidMatches.length}`);
if (srcUuidMatches.length === 0) {
  console.log("   ✅ AUCUNE (attendu: 0)");
} else {
  console.log(`   ❌ ENCORE PRÉSENTES (attendu: 0, trouvé: ${srcUuidMatches.length})`);
  console.log("   Exemples:");
  srcUuidMatches.slice(0, 3).forEach(match => console.log(`     ${match}`));
}

// Test 12: Academic citations (should be present)
const academicCitations = [
  /selon.*études/i,
  /méta-analyse/i,
  /recherches.*montrent/i,
  /consensus.*médical/i,
  /études cliniques/i,
  /littérature.*médicale/i
];

console.log("\n1️⃣2️⃣  CITATIONS ACADÉMIQUES (nouvelles)");
let academicCount = 0;
const academicExamples: string[] = [];
for (const pattern of academicCitations) {
  const matches = report.match(new RegExp(pattern, "gi"));
  if (matches) {
    academicCount += matches.length;
    if (academicExamples.length < 3) {
      academicExamples.push(...matches.slice(0, 3 - academicExamples.length));
    }
  }
}

console.log(`   Nombre trouvé: ${academicCount}`);
if (academicCount > 5) {
  console.log("   ✅ PRÉSENTES (format académique utilisé)");
  console.log("   Exemples:");
  academicExamples.forEach(ex => console.log(`     "${ex.substring(0, 60)}..."`));
} else {
  console.log(`   ⚠️  PEU DE CITATIONS ACADÉMIQUES (trouvé: ${academicCount})`);
}

// Summary Phase 3
const phase3Pass = srcUuidMatches.length === 0 && academicCount > 5;

console.log("\n" + "-".repeat(80));
console.log(`Phase 3 Status: ${phase3Pass ? "✅ TOUS LES TESTS PASSÉS" : "❌ CERTAINS TESTS ÉCHOUÉS"}`);
console.log("-".repeat(80) + "\n");

// ============================================================================
// RÉSUMÉ FINAL
// ============================================================================
console.log("=".repeat(80));
console.log("📋 RÉSUMÉ FINAL DES TESTS");
console.log("=".repeat(80) + "\n");

console.log(`Phase 1 (Extraction):      ${phase1Pass ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Phase 2 (UX):              ${phase2Pass ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Phase 3 (Citations):       ${phase3Pass ? "✅ PASS" : "❌ FAIL"}`);

const allPass = phase1Pass && phase2Pass && phase3Pass;

console.log("\n" + "=".repeat(80));
if (allPass) {
  console.log("🎉 SUCCÈS TOTAL - TOUS LES FIXES FONCTIONNENT CORRECTEMENT!");
} else {
  console.log("⚠️  CERTAINS TESTS ONT ÉCHOUÉ - RÉVISION NÉCESSAIRE");
}
console.log("=".repeat(80) + "\n");

console.log(`📊 Rapport ID: ${testId}`);
console.log(`📊 URL: https://neurocore-360.onrender.com/analysis/${testId}`);
console.log(`📊 Taille rapport: ${report.length} chars`);
console.log(`📊 Nombre de marqueurs: ${markers.length}\n`);

process.exit(allPass ? 0 : 1);
