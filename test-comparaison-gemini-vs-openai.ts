/**
 * TEST COMPARAISON - Gemini 2.5 Pro vs GPT-5.2-2025-12-11
 * Utilise les photos "homme 1" pour comparer les deux modèles
 */

import { generateAndConvertAudit } from './server/geminiPremiumEngine';
import { generateAndConvertAuditWithOpenAI } from './server/openaiPremiumEngine';
import { analyzeBodyPhotosWithAI } from './server/photoAnalysisAI';
import { generateExportHTML } from './server/exportService';
import * as fs from 'fs';
import * as path from 'path';

const TEST_CLIENT_DATA: Record<string, unknown> = {
  prenom: "Marc",
  nom: "D.",
  sexe: "homme",
  age: "26-35",
  taille: "171-180",
  poids: "81-90",
  objectif: "recomposition",
  profession: "bureau",
  "niveau-activite": "modere",
  "historique-medical": ["aucun"],
  medicaments: "non",
  allergies: ["aucune"],
  "masse-grasse": "21-25",
  "objectif-poids": "perdre-5-10",
  "evolution-poids": "stable",
  "regimes-passes": "3-5",
  morphologie: "mesomorphe",
  "zones-stockage": ["ventre", "hanches"],
  "retention-eau": "parfois",
  cellulite: "aucune",
  "stress-niveau": "modere",
  "sommeil-heures": "6-7",
  "sommeil-qualite": "moyenne",
  "energie-matin": "moyenne",
  "digestion-problemes": ["ballonnements"],
  "alimentation-type": "mixte",
  "repas-freq": "3",
  "faim-emotions": "parfois",
  "grignotage": "parfois",
  "alcool-freq": "1-2/semaine",
  "cafe-apres-14h": "non",
  "sport-freq": "3-4/semaine",
  "sport-type": ["musculation", "cardio"],
  "entrainement-intensite": "moderee",
  "blessures": "aucune",
  "douleurs-articulaires": "non",
  "humeur": "stable",
  "motivation": "elevee",
  "libido": "normale",
  "peau-problemes": "non",
  "cheveux-problemes": "non",
  "ongles-problemes": "non",
  "chambre-temperature": "chaud",
  "hrv-mesure": "non",
  "hrv-valeur": "inconnu",
};

async function runComparison() {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 TEST COMPARAISON - Gemini 2.5 Pro vs GPT-5.2-2025-12-11");
  console.log("=".repeat(80));
  console.log(`📸 Photos: homme 1\n`);

  // Utiliser les photos de server/test-data/photos (homme 1)
  const photosDir = path.join(process.cwd(), "server", "test-data", "photos");
  console.log(`📁 Dossier photos: ${photosDir}`);

  const photoFiles = {
    front: path.join(photosDir, "front.jpeg"),
    side: path.join(photosDir, "side.jpeg"),
    back: path.join(photosDir, "back.jpeg"),
  };

  const photosBase64: { [key: string]: string } = {};
  console.log("\n[1/6] 📸 Chargement des photos...");
  for (const key of Object.keys(photoFiles) as Array<keyof typeof photoFiles>) {
    const filePath = photoFiles[key];
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      photosBase64[key] = `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
      console.log(`  ✅ ${key}: ${path.basename(filePath)} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`  ⚠️ Photo manquante pour ${key}: ${filePath}`);
    }
  }

  console.log("\n[2/6] 🔍 Analyse des photos posturales (avec Gemini)...");
  let photoAnalysis = null;
  try {
    photoAnalysis = await analyzeBodyPhotosWithAI(photosBase64, {
      sexe: TEST_CLIENT_DATA.sexe as string,
      age: TEST_CLIENT_DATA.age as string,
      objectif: TEST_CLIENT_DATA.objectif as string,
    });
    console.log("  ✅ Analyse photo terminée");
    console.log(`  📊 Confiance: ${photoAnalysis.confidenceLevel}%`);
  } catch (error: any) {
    console.log("❌ ERREUR lors de l'analyse photo:");
    console.log(`   ${error.message || "Erreur inconnue"}`);
  }

  const timestamp = Date.now();
  const auditIdGemini = `TEST-GEMINI-${timestamp}`;
  const auditIdOpenAI = `TEST-OPENAI-${timestamp}`;

  // ===== TEST 1: GEMINI 2.5 PRO =====
  console.log("\n" + "-".repeat(80));
  console.log("[3/6] 🚀 TEST 1: Génération avec Gemini 2.5 Pro");
  console.log("-".repeat(80));
  console.log("  ⏱️  Cela peut prendre 3-5 minutes...\n");

  const startGemini = Date.now();
  let resultGemini = null;
  try {
    resultGemini = await generateAndConvertAudit(
      TEST_CLIENT_DATA,
      photoAnalysis || undefined,
      "PREMIUM",
      auditIdGemini
    );
    const durationGemini = ((Date.now() - startGemini) / 1000 / 60).toFixed(1);
    
    if (resultGemini.success && resultGemini.txt) {
      console.log(`  ✅ Gemini terminé en ${durationGemini} minutes`);
      console.log(`  📏 Taille TXT: ${(resultGemini.txt.length / 1024).toFixed(1)} KB`);
      
      const txtFilenameGemini = `audit_GEMINI_${timestamp}.txt`;
      fs.writeFileSync(txtFilenameGemini, resultGemini.txt, "utf-8");
      console.log(`  💾 Fichier TXT: ${txtFilenameGemini}`);

      // Génération HTML Gemini
      const photoUrls = Object.keys(photosBase64).map(key => photosBase64[key as keyof typeof photosBase64]).filter(Boolean) as string[];
      const htmlContentGemini = generateExportHTML(
        { txt: resultGemini.txt, clientName: TEST_CLIENT_DATA.prenom as string },
        auditIdGemini,
        photoUrls
      );
      const htmlFilenameGemini = `neurocore-360-rapport-GEMINI-${timestamp}.html`;
      fs.writeFileSync(htmlFilenameGemini, htmlContentGemini, "utf-8");
      console.log(`  🌐 HTML: ${htmlFilenameGemini}`);
    } else {
      console.log(`  ❌ Échec Gemini: ${resultGemini?.error || "Erreur inconnue"}`);
    }
  } catch (error: any) {
    console.log(`  ❌ EXCEPTION Gemini: ${error.message || error}`);
  }

  // ===== TEST 2: GPT-5.2-2025-12-11 =====
  console.log("\n" + "-".repeat(80));
  console.log("[4/6] 🚀 TEST 2: Génération avec GPT-5.2-2025-12-11");
  console.log("-".repeat(80));
  console.log("  ⏱️  Cela peut prendre 3-5 minutes...\n");

  const startOpenAI = Date.now();
  let resultOpenAI = null;
  try {
    resultOpenAI = await generateAndConvertAuditWithOpenAI(
      TEST_CLIENT_DATA,
      photoAnalysis || undefined,
      "PREMIUM",
      auditIdOpenAI
    );
    const durationOpenAI = ((Date.now() - startOpenAI) / 1000 / 60).toFixed(1);
    
    if (resultOpenAI.success && resultOpenAI.txt) {
      console.log(`  ✅ OpenAI terminé en ${durationOpenAI} minutes`);
      console.log(`  📏 Taille TXT: ${(resultOpenAI.txt.length / 1024).toFixed(1)} KB`);
      
      const txtFilenameOpenAI = `audit_OPENAI_${timestamp}.txt`;
      fs.writeFileSync(txtFilenameOpenAI, resultOpenAI.txt, "utf-8");
      console.log(`  💾 Fichier TXT: ${txtFilenameOpenAI}`);

      // Génération HTML OpenAI
      const photoUrls = Object.keys(photosBase64).map(key => photosBase64[key as keyof typeof photosBase64]).filter(Boolean) as string[];
      const htmlContentOpenAI = generateExportHTML(
        { txt: resultOpenAI.txt, clientName: TEST_CLIENT_DATA.prenom as string },
        auditIdOpenAI,
        photoUrls
      );
      const htmlFilenameOpenAI = `neurocore-360-rapport-OPENAI-${timestamp}.html`;
      fs.writeFileSync(htmlFilenameOpenAI, htmlContentOpenAI, "utf-8");
      console.log(`  🌐 HTML: ${htmlFilenameOpenAI}`);
    } else {
      console.log(`  ❌ Échec OpenAI: ${resultOpenAI?.error || "Erreur inconnue"}`);
    }
  } catch (error: any) {
    console.log(`  ❌ EXCEPTION OpenAI: ${error.message || error}`);
  }

  // ===== RÉSUMÉ COMPARAISON =====
  console.log("\n" + "=".repeat(80));
  console.log("[5/6] 📊 RÉSUMÉ COMPARAISON");
  console.log("=".repeat(80));

  if (resultGemini?.success && resultOpenAI?.success) {
    const durationGemini = ((Date.now() - startGemini) / 1000 / 60).toFixed(1);
    const durationOpenAI = ((Date.now() - startOpenAI) / 1000 / 60).toFixed(1);
    
    console.log("\n✅ Les deux modèles ont réussi!");
    console.log(`\n⏱️  Temps de génération:`);
    console.log(`   Gemini 2.5 Pro: ${durationGemini} minutes`);
    console.log(`   GPT-5.2-2025-12-11: ${durationOpenAI} minutes`);
    console.log(`\n📏 Taille des rapports:`);
    console.log(`   Gemini: ${((resultGemini.txt?.length || 0) / 1024).toFixed(1)} KB`);
    console.log(`   OpenAI: ${((resultOpenAI.txt?.length || 0) / 1024).toFixed(1)} KB`);
    console.log(`\n📄 Fichiers générés:`);
    console.log(`   Gemini TXT: audit_GEMINI_${timestamp}.txt`);
    console.log(`   Gemini HTML: neurocore-360-rapport-GEMINI-${timestamp}.html`);
    console.log(`   OpenAI TXT: audit_OPENAI_${timestamp}.txt`);
    console.log(`   OpenAI HTML: neurocore-360-rapport-OPENAI-${timestamp}.html`);
    console.log(`\n💡 Compare les fichiers HTML pour voir les différences de qualité`);
  } else {
    console.log("\n⚠️  Au moins un des modèles a échoué");
    if (!resultGemini?.success) {
      console.log(`   Gemini: ${resultGemini?.error || "Échec"}`);
    }
    if (!resultOpenAI?.success) {
      console.log(`   OpenAI: ${resultOpenAI?.error || "Échec"}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST TERMINÉ");
  console.log("=".repeat(80) + "\n");
}

runComparison().catch(console.error);

