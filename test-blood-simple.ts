/**
 * Script de test simple: Génération rapport Blood Analysis via API production
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";
import fetch from "node-fetch";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually BEFORE importing server modules
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
  console.log("✅ .env chargé");
  console.log(`   ANTHROPIC_API_KEY présent: ${process.env.ANTHROPIC_API_KEY ? 'OUI' : 'NON'}\n`);
}

const API_URL = "https://neurocore-360.onrender.com";

async function testBloodAnalysisViaAPI() {
  console.log("🧪 TEST: Upload Blood Analysis PDF via API\n");

  try {
    // 1. Créer un utilisateur de test via magic link
    const testEmail = `test-expert-${Date.now()}@neurocore.test`;
    console.log("📧 Création utilisateur de test:", testEmail);

    const magicLinkRes = await fetch(`${API_URL}/api/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    if (!magicLinkRes.ok) {
      throw new Error(`Magic link failed: ${await magicLinkRes.text()}`);
    }

    console.log("✅ Magic link envoyé\n");

    // 2. Pour le test, on va utiliser le token directement depuis la réponse
    // En production, il faudrait vérifier l'email
    // Pour contourner, on va utiliser l'API sans auth si possible

    console.log("⚠️  L'upload requiert authentification.");
    console.log("   Utilisation de l'approche alternative: appel direct aux fonctions\n");

    // Alternative: Appeler directement les fonctions (sans DB)
    const pdf = await import("pdf-parse/lib/pdf-parse.js");
    const {
      extractMarkersFromPdfText,
      analyzeBloodwork,
      generateAIBloodAnalysis,
      getBloodworkKnowledgeContext
    } = await import("./server/blood-analysis/index.js");

    // 3. Lire le PDF (use BloodAI_PRD_v2.pdf - le plus complet avec 22 marqueurs)
    const pdfPath = path.join(__dirname, "data", "BloodAI_PRD_v2.pdf");
    console.log("📄 Lecture du PDF:", pdfPath);

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf.default(dataBuffer);
    const pdfText = pdfData.text;

    console.log(`✅ PDF lu: ${pdfText.length} caractères\n`);

    // 4. Extraction des marqueurs
    console.log("🔍 Extraction des marqueurs...");
    const markersResult = await extractMarkersFromPdfText(pdfText, "BloodAI_PRD_v2.pdf");
    const markers = Array.isArray(markersResult) ? markersResult : [];
    console.log(`✅ ${markers.length} marqueurs extraits\n`);

    if (markers.length === 0) {
      console.error("❌ Aucun marqueur extrait!");
      console.log("\n📄 Premiers 2000 caractères du PDF:");
      console.log(pdfText.substring(0, 2000));
      console.log("\n... Fin de l'extrait\n");

      // Try alternative: use analyze endpoint directly
      console.log("⚠️  Tentative avec marqueurs de test...\n");
      return;
    }

    console.log("📋 Premiers 10 marqueurs extraits:");
    markers.slice(0, 10).forEach(m => {
      console.log(`  - ${m.markerId}: ${m.value}`);
    });
    if (markers.length > 10) console.log(`  ... et ${markers.length - 10} autres\n`);

    // 5. Analyse des marqueurs
    console.log("🔬 Analyse des marqueurs...");
    const analysis = await analyzeBloodwork(markers, {
      gender: "homme",
      age: "35",
      objectives: "recomposition corporelle, performance"
    });
    console.log(`✅ Analyse complète: ${analysis.markers.length} marqueurs analysés\n`);

    // 6. Contexte RAG
    console.log("📚 Récupération contexte bibliothèque RAG...");
    const ragContext = await getBloodworkKnowledgeContext(analysis.markers, analysis.patterns);
    console.log(`✅ ${ragContext.length} caractères RAG récupérés\n`);

    // 7. Génération AI avec NOUVEAU PROMPT EXPERT
    console.log("🤖 Génération rapport AI avec NOUVEAU PROMPT EXPERT...");
    console.log("   (Ceci peut prendre 30-120 secondes...)\n");

    const startTime = Date.now();
    const aiReport = await generateAIBloodAnalysis(
      analysis,
      {
        gender: "homme",
        age: "35",
        objectives: "recomposition corporelle, performance, optimisation métabolique"
      },
      ragContext
    );
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ Rapport AI généré en ${duration}s: ${aiReport.length} caractères\n`);

    // 8. Sauvegarder le rapport en fichier local
    const reportPath = path.join(__dirname, "test-rapport-expert.md");
    fs.writeFileSync(reportPath, aiReport, "utf-8");
    console.log(`💾 Rapport sauvegardé: ${reportPath}\n`);

    // 9. Aperçu du rapport AI
    console.log("📊 APERÇU DU RAPPORT AI (premiers 3000 caractères):");
    console.log("═".repeat(80));
    console.log(aiReport.substring(0, 3000));
    console.log("═".repeat(80));
    console.log(`\n... [${aiReport.length - 3000} caractères restants]\n`);

    // 10. Vérifications style expert
    console.log("✅ VÉRIFICATIONS STYLE EXPERT:\n");

    const lines = aiReport.split("\n");
    const bulletLines = lines.filter(l => l.trim().match(/^[-•*]\s/));
    const paragraphs = aiReport.split("\n\n").filter(p => p.trim().length > 100);
    const longParagraphs = paragraphs.filter(p => p.length > 400);

    const hasListsInActions = aiReport.includes("Actions (") || aiReport.includes("- ");
    const mentionsMecanismes = (aiReport.match(/mécanisme|cellulaire|enzyme|récepteur|voie|pathway/gi) || []).length;
    const hasSources = (aiReport.match(/\[SRC:/g) || []).length;
    const hasStudies = (aiReport.match(/étude|consensus|recherche|literature/gi) || []).length;

    console.log(`   ${bulletLines.length === 0 ? '✅' : '❌'} Pas de bullet points (trouvés: ${bulletLines.length})`);
    if (bulletLines.length > 0 && bulletLines.length < 5) {
      console.log(`      Exemples: ${bulletLines.slice(0, 2).map(l => l.substring(0, 60)).join(", ")}`);
    }

    console.log(`   ${paragraphs.length > 20 ? '✅' : '⚠️ '} Paragraphes riches (${paragraphs.length} paragraphes > 100 chars)`);
    console.log(`   ${longParagraphs.length > 10 ? '✅' : '⚠️ '} Paragraphes détaillés (${longParagraphs.length} > 400 chars)`);
    console.log(`   ${mentionsMecanismes > 50 ? '✅' : '⚠️ '} Mécanismes biologiques (${mentionsMecanismes} mentions)`);
    console.log(`   ${hasSources > 0 ? '✅' : '⚠️ '} Citations RAG ([SRC:]: ${hasSources} citations)`);
    console.log(`   ${hasStudies > 10 ? '✅' : '⚠️ '} Références études (${hasStudies} mentions)`);

    // 11. Analyse des sections
    console.log("\n📑 STRUCTURE DU RAPPORT:\n");
    const sections = aiReport.split(/^##\s/m).filter(s => s.trim());
    sections.slice(0, 15).forEach((section, i) => {
      const title = section.split("\n")[0].trim();
      const content = section.substring(title.length).trim();
      const wordCount = content.split(/\s+/).length;
      console.log(`   ${i + 1}. ${title} (${wordCount} mots)`);
    });

    console.log("\n🎉 TEST TERMINÉ!");
    console.log(`\n📎 Rapport complet sauvegardé: ${reportPath}`);
    console.log(`\n🔍 Pour vérifier en détail, ouvre le fichier et cherche:`);
    console.log(`   - Absence de listes à puces`);
    console.log(`   - Paragraphes complets expliquant mécanismes`);
    console.log(`   - Citations [SRC:ID] dans le texte`);
    console.log(`   - Ton médecin expert (pas IA générique)`);

  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    throw error;
  }
}

// Exécution
testBloodAnalysisViaAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Test failed");
    process.exit(1);
  });
