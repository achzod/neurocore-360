/**
 * Script de test: Upload PDF et génération rapport Blood Analysis
 */

import fs from "fs";
import path from "path";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { storage } from "./server/storage";
import {
  extractMarkersFromPdfText,
  extractPatientInfoFromPdfText,
  analyzeBloodwork,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext
} from "./server/blood-analysis";

async function testBloodAnalysis() {
  console.log("🧪 TEST: Upload Blood Analysis PDF\n");

  // 1. Lire le PDF
  const pdfPath = path.join(__dirname, "data", "Résultats octobre 25.pdf");
  console.log("📄 Lecture du PDF:", pdfPath);

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);
  const pdfText = pdfData.text;

  console.log(`✅ PDF lu: ${pdfText.length} caractères\n`);

  // 2. Extraction des données
  console.log("🔍 Extraction des marqueurs...");
  const markers = extractMarkersFromPdfText(pdfText);
  console.log(`✅ ${markers.length} marqueurs extraits\n`);

  if (markers.length === 0) {
    console.error("❌ Aucun marqueur extrait!");
    return;
  }

  console.log("📋 Marqueurs extraits:");
  markers.slice(0, 5).forEach(m => {
    console.log(`  - ${m.name}: ${m.value} ${m.unit}`);
  });
  if (markers.length > 5) console.log(`  ... et ${markers.length - 5} autres\n`);

  // 3. Extraction profil patient
  console.log("👤 Extraction profil patient...");
  const patientInfo = extractPatientInfoFromPdfText(pdfText);
  console.log("✅ Profil extrait:", patientInfo, "\n");

  // 4. Analyse des marqueurs
  console.log("🔬 Analyse des marqueurs...");
  const analysis = analyzeBloodwork(markers, {
    gender: "homme",
    age: "35",
    objectives: "recomposition corporelle, performance"
  });
  console.log(`✅ Analyse complète: ${analysis.markers.length} marqueurs analysés\n`);

  // 5. Contexte RAG
  console.log("📚 Récupération contexte bibliothèque...");
  const ragContext = await getBloodworkKnowledgeContext(markers);
  console.log(`✅ ${ragContext.length} chunks RAG récupérés\n`);

  // 6. Génération AI (NOUVEAU PROMPT EXPERT)
  console.log("🤖 Génération rapport AI avec NOUVEAU PROMPT EXPERT...");
  console.log("   (Ceci peut prendre 30-60 secondes...)\n");

  const aiReport = await generateAIBloodAnalysis(
    markers,
    {
      gender: "homme",
      age: "35",
      objectives: "recomposition corporelle, performance"
    },
    ragContext
  );

  console.log(`✅ Rapport AI généré: ${aiReport.length} caractères\n`);

  // 7. Sauvegarder dans storage
  console.log("💾 Sauvegarde du rapport...");
  const reportId = await storage.saveBloodReport({
    email: "test-expert@neurocore.test",
    profile: {
      prenom: "Test",
      nom: "Expert",
      email: "test-expert@neurocore.test",
      gender: "M",
      dob: "1990-01-01",
      poids: 80,
      taille: 180,
    },
    markers,
    analysis,
    aiReport,
    fileName: "Résultats octobre 25.pdf",
  });

  console.log(`✅ Rapport sauvegardé avec ID: ${reportId}\n`);

  // 8. URL du rapport
  const reportUrl = `https://neurocore-360.onrender.com/analysis/${reportId}`;
  console.log("🌐 URL du rapport:");
  console.log(`   ${reportUrl}\n`);

  // 9. Aperçu du rapport AI
  console.log("📊 APERÇU DU RAPPORT AI (premiers 2000 caractères):");
  console.log("─".repeat(80));
  console.log(aiReport.substring(0, 2000));
  console.log("─".repeat(80));
  console.log(`\n... [${aiReport.length - 2000} caractères restants]\n`);

  // 10. Vérification style expert
  console.log("✅ VÉRIFICATIONS STYLE EXPERT:");

  const hasBulletPoints = aiReport.includes("\n- ") || aiReport.includes("\n• ");
  const hasParagraphs = aiReport.split("\n\n").length > 10;
  const hasLongSections = aiReport.split("\n\n").some(p => p.length > 300);
  const mentionsMecanismes = aiReport.toLowerCase().includes("mécanisme") ||
                             aiReport.toLowerCase().includes("cellulaire") ||
                             aiReport.toLowerCase().includes("niveau");
  const hasSources = aiReport.includes("[SRC:") || aiReport.includes("étude");

  console.log(`   ${hasBulletPoints ? '❌' : '✅'} Pas de bullet points: ${!hasBulletPoints}`);
  console.log(`   ${hasParagraphs ? '✅' : '❌'} Paragraphes (${aiReport.split("\n\n").length} sections)`);
  console.log(`   ${hasLongSections ? '✅' : '❌'} Sections longues (>300 chars)`);
  console.log(`   ${mentionsMecanismes ? '✅' : '❌'} Mécanismes biologiques mentionnés`);
  console.log(`   ${hasSources ? '✅' : '❌'} Citations/sources présentes`);

  console.log("\n🎉 TEST TERMINÉ!");
  console.log(`\n📎 Ouvre le rapport: ${reportUrl}`);
}

// Exécution
testBloodAnalysis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  });
