import fs from 'fs';
import path from 'path';
import { analyzeBodyPhotosWithAI } from '../server/photoAnalysisAI';
import { generateAuditTxt } from '../server/geminiPremiumEngine';
import { generateExportHTMLFromTxt } from '../server/exportService';

async function testFullAnalysis() {
  console.log("🚀 Test analyse complète avec vraies photos...\n");

  // 1. Charger les photos
  const photosDir = '/Users/achzod/Desktop/neurocore/photos test/homme 1';
  const photoFiles = fs.readdirSync(photosDir).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
  
  if (photoFiles.length < 3) {
    throw new Error("Pas assez de photos (besoin de 3 minimum)");
  }

  console.log(`📸 Photos trouvées: ${photoFiles.join(', ')}\n`);

  // Convertir en base64
  const photos = {
    front: fs.readFileSync(path.join(photosDir, photoFiles[0]), 'base64'),
    back: fs.readFileSync(path.join(photosDir, photoFiles[1]), 'base64'),
    side: fs.readFileSync(path.join(photosDir, photoFiles[2]), 'base64')
  };

  // 2. Analyser les photos avec l'IA
  console.log("🔍 Analyse des photos avec Gemini...");
  const photoAnalysis = await analyzeBodyPhotosWithAI(photos, {
    sexe: 'homme',
    age: 30,
    poids: 80,
    taille: 180
  });

  console.log("✅ Analyse photo terminée:");
  console.log(`  - Confiance: ${photoAnalysis.confidence}%`);
  console.log(`  - Sections: ${photoAnalysis.sections.length}\n`);

  // 3. Données client de test
  const clientData = {
    nom: "Test Homme 1",
    prenom: "Jean",
    email: "test@example.com",
    sexe: "homme",
    age: 30,
    poids: 80,
    taille: 180,
    objectifPrincipal: "recomposition",
    niveauActivite: "actif",
    frequenceEntrainement: "4-5",
    typeEntrainement: ["musculation", "hiit"],
    heuresAssis: "8-10h",
    qualiteSommeil: "moyenne",
    heureCoucher: "00h-1h",
    heureReveil: "7h-8h",
    niveauStress: "moyen",
    energie: "moyenne",
    digestion: "ballonnements"
  };

  // 4. Générer le rapport TXT complet
  console.log("📝 Génération du rapport premium...");
  const auditTxt = await generateAuditTxt(clientData, photoAnalysis);
  
  console.log(`✅ Rapport généré: ${auditTxt.length} caractères\n`);

  // 5. Sauvegarder le TXT
  const txtPath = 'audit_test_photos.txt';
  fs.writeFileSync(txtPath, auditTxt);
  console.log(`💾 TXT sauvegardé: ${txtPath}\n`);

  // 6. Générer le HTML avec les photos intégrées
  console.log("🎨 Génération du HTML...");
  
  // Créer des data URIs pour les photos
  const photoUrls = [
    `data:image/jpeg;base64,${photos.front}`,
    `data:image/jpeg;base64,${photos.back}`,
    `data:image/jpeg;base64,${photos.side}`
  ];

  const html = generateExportHTMLFromTxt(auditTxt, 'TEST-HOMME-1', photoUrls);

  const htmlPath = 'audit_test_photos.html';
  fs.writeFileSync(htmlPath, html);
  
  console.log(`✅ HTML généré: ${htmlPath} (${html.length} bytes)\n`);
  console.log("🎉 Test terminé ! Ouvre le fichier HTML pour voir le résultat.");
}

testFullAnalysis().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});

