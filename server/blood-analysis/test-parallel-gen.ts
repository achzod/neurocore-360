/**
 * Test script for parallel HTML generation.
 * Run with: ANTHROPIC_API_KEY=<key> npx tsx server/blood-analysis/test-parallel-gen.ts
 */

import { generateParallelHtmlReport } from "./parallel-html-generator";
import type { BloodAnalysisResult } from "./index";
import fs from "fs";

const mockAnalysis: BloodAnalysisResult = {
  summary: {
    optimal: ["HDL", "B12"],
    watch: ["Ferritine", "Vitamine D", "TSH"],
    action: ["Insuline a jeun", "HOMA-IR", "Triglycerides"],
  },
  markers: [
    { markerId: "testosterone_total", name: "Testosterone totale", value: 520, unit: "ng/dL", normalRange: "300-1000", optimalRange: "600-900", status: "suboptimal", interpretation: "<500 = suboptimal pour muscu" },
    { markerId: "shbg", name: "SHBG", value: 55, unit: "nmol/L", normalRange: "10-80", optimalRange: "20-40", status: "suboptimal", interpretation: "Trop haut = moins de testo libre" },
    { markerId: "estradiol", name: "Estradiol (E2)", value: 28, unit: "pg/mL", normalRange: "10-40", optimalRange: "20-35", status: "optimal", interpretation: "" },
    { markerId: "tsh", name: "TSH", value: 3.2, unit: "mIU/L", normalRange: "0.4-4.5", optimalRange: "0.5-2.0", status: "suboptimal", interpretation: ">2.5 = thyroide paresseuse" },
    { markerId: "t4_libre", name: "T4 libre", value: 1.1, unit: "ng/dL", normalRange: "0.8-1.8", optimalRange: "1.2-1.6", status: "suboptimal", interpretation: "" },
    { markerId: "glycemie_jeun", name: "Glycemie a jeun", value: 97, unit: "mg/dL", normalRange: "70-100", optimalRange: "75-90", status: "suboptimal", interpretation: ">95 = resistance insuline" },
    { markerId: "insuline_jeun", name: "Insuline a jeun", value: 14, unit: "uIU/mL", normalRange: "2-25", optimalRange: "3-8", status: "critical", interpretation: "" },
    { markerId: "homa_ir", name: "HOMA-IR", value: 3.4, unit: "", normalRange: "0-2.5", optimalRange: "0-1.5", status: "critical", interpretation: "" },
    { markerId: "triglycerides", name: "Triglycerides", value: 185, unit: "mg/dL", normalRange: "0-150", optimalRange: "0-80", status: "critical", interpretation: "" },
    { markerId: "hdl", name: "HDL", value: 58, unit: "mg/dL", normalRange: ">40", optimalRange: ">55", status: "optimal", interpretation: "" },
    { markerId: "ldl", name: "LDL", value: 125, unit: "mg/dL", normalRange: "0-100", optimalRange: "70-100", status: "suboptimal", interpretation: "" },
    { markerId: "crp_us", name: "CRP-us", value: 1.8, unit: "mg/L", normalRange: "0-3", optimalRange: "0-0.5", status: "suboptimal", interpretation: "" },
    { markerId: "ferritine", name: "Ferritine", value: 45, unit: "ng/mL", normalRange: "20-300", optimalRange: "80-150", status: "suboptimal", interpretation: "" },
    { markerId: "vitamine_d", name: "Vitamine D", value: 28, unit: "ng/mL", normalRange: "30-100", optimalRange: "50-80", status: "critical", interpretation: "" },
    { markerId: "b12", name: "B12", value: 650, unit: "pg/mL", normalRange: "200-900", optimalRange: "500-800", status: "optimal", interpretation: "" },
    { markerId: "alt", name: "ALT", value: 35, unit: "U/L", normalRange: "7-56", optimalRange: "0-30", status: "suboptimal", interpretation: "" },
    { markerId: "ggt", name: "GGT", value: 42, unit: "U/L", normalRange: "9-48", optimalRange: "0-25", status: "suboptimal", interpretation: "" },
    { markerId: "cortisol", name: "Cortisol matin", value: 22, unit: "ug/dL", normalRange: "5-25", optimalRange: "12-18", status: "suboptimal", interpretation: "" },
  ],
  patterns: [
    {
      name: "Insulin Resistance",
      markers: { insuline_jeun: "high", homa_ir: "high", triglycerides: "high", hba1c: "high" },
      causes: ["Exces glucides raffines", "Sedentarite", "Graisse viscerale"],
      protocol: ["Reduire glucides raffines", "Marche post-prandiale 15min", "Musculation 3x/semaine"],
    },
  ],
  recommendations: {
    priority1: [
      { action: "Reduire glucides raffines", why: "Pattern: Insulin Resistance" },
      { action: "Marche post-prandiale 15min", why: "Pattern: Insulin Resistance" },
    ],
    priority2: [
      { action: "Musculation 3x/semaine", why: "Pattern: Insulin Resistance" },
    ],
  },
  followUp: [
    { test: "Insuline a jeun", delay: "6-8 semaines", objective: "Verifier evolution vers range optimal" },
    { test: "HOMA-IR", delay: "6-8 semaines", objective: "Verifier evolution vers range optimal" },
  ],
  alerts: ["Consulte un medecin pour les marqueurs critiques", "Risque metabolique detecte"],
};

const mockProfile = {
  gender: "homme" as const,
  age: "32",
  objectives: "Recomposition corporelle, performance",
  medications: "Aucun",
  prenom: "Alex",
  nom: "Dupont",
  poids: 84,
  taille: 178,
  sleepHours: 6.5,
  trainingHours: 5,
  calorieDeficit: 15,
  alcoholWeekly: 4,
  stressLevel: 7,
};

async function main() {
  console.log("=== PARALLEL HTML REPORT GENERATION TEST ===");
  console.log(`Markers: ${mockAnalysis.markers.length}`);
  console.log(`Patterns: ${mockAnalysis.patterns.length}`);
  console.log(`Profile: ${mockProfile.prenom} ${mockProfile.nom}, ${mockProfile.gender} ${mockProfile.age} ans`);
  console.log("");

  const startTime = Date.now();

  try {
    const result = await generateParallelHtmlReport(mockAnalysis, mockProfile);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== GENERATION COMPLETE in ${elapsed}s ===`);
    console.log(`HTML: ${result.html.length} chars`);
    console.log(`Markdown: ${result.markdown.length} chars`);
    console.log(`Sections: ${Object.keys(result.sections).length}`);

    for (const [key, content] of Object.entries(result.sections)) {
      console.log(`  - ${key}: ${content.length} chars`);
    }

    // Write HTML to file
    const outPath = "/tmp/blood-report-test.html";
    fs.writeFileSync(outPath, result.html, "utf-8");
    console.log(`\nHTML written to: ${outPath}`);

    // Write markdown to file
    const mdPath = "/tmp/blood-report-test.md";
    fs.writeFileSync(mdPath, result.markdown, "utf-8");
    console.log(`Markdown written to: ${mdPath}`);
  } catch (err) {
    console.error("GENERATION FAILED:", err);
    process.exit(1);
  }
}

main();
