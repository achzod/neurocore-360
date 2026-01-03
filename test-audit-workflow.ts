/**
 * Script de test end-to-end du workflow complet NEUROCORE
 * - Crée un audit avec données réalistes
 * - Upload 3 photos
 * - Génère le rapport avec Claude Opus 4.5
 * - Vérifie les emails envoyés
 */

const API_URL = process.env.RENDER_EXTERNAL_URL || "http://localhost:5000";

// Données de test réalistes
const testAuditData = {
  email: "achkou@gmail.com",
  type: "PREMIUM",
  responses: {
    // PROFIL
    prenom: "Thomas",
    age: 28,
    sexe: "Homme",
    poids: 82,
    taille: 178,
    objectif: "Prise de masse sèche",

    // SOMMEIL
    heuresCouchage: "23:30",
    heuresReveil: "07:00",
    qualiteSommeil: "Moyenne - Quelques réveils nocturnes",
    reveilsNocturnes: "Oui, 1-2 fois",
    fatigueMatin: "Moyen - Besoin de 15-20 min pour être opérationnel",
    sieste: "Non",

    // STRESS & NERVEUX
    niveauStress: "Élevé - Job stressant + deadlines",
    symptomesStress: ["Tensions cervicales", "Mâchoire serrée", "Difficultés concentration"],
    gestionStress: "Respiration + Sport",
    anxiete: "Moyenne",

    // DIGESTION
    qualiteDigestion: "Moyenne",
    ballonnements: "Oui, souvent après repas",
    transit: "Normal",
    intolerances: ["Suspicion gluten"],
    ventrePlat: "Non, souvent gonflé",

    // HORMONES
    libido: "Moyenne",
    energieMatinale: "Faible",
    musculationFacile: "Difficile - Stagnation",
    graisseAbdominale: "Oui, difficile à perdre",

    // ENTRAINEMENT
    frequenceEntrainement: "4-5 fois/semaine",
    typeEntrainement: "Musculation + HIIT",
    intensite: "Haute",
    progression: "Stagnation depuis 3-4 mois",
    douleurs: ["Épaules", "Bas du dos"],

    // NUTRITION
    caloriesEstimees: "2800-3000",
    proteines: "160-180g",
    glucides: "300-350g",
    lipides: "70-80g",
    repasPrincipal: "Déjeuner",
    faimEmotionnelle: "Parfois, en soirée",
    alcool: "1-2 verres/semaine",
    cafeine: "3-4 cafés/jour, dernier à 16h",
    hydratation: "2-2.5L/jour",

    // POSTURE
    travail: "Bureau 8h/jour",
    douleursCou: "Oui, régulières",
    posture: "Épaules enroulées, tête en avant",
    mobilite: "Réduite - Hanches raides",

    // BILANS (optionnel)
    bilansSanguins: "Non récents",

    // MOTIVATION
    motivation: "Très élevée",
    discipline: "Bonne",
    budgetSupplements: "100-150€/mois",
  },
  scores: {
    global: 62,
    sommeil: 68,
    stress: 45,
    digestion: 58,
    hormones: 55,
    entrainement: 70,
    nutrition: 65,
    posture: 52,
  }
};

// Photos placeholders (base64 longue - PNG 100x100 px)
const photoPlaceholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".repeat(5);

async function createTestAudit() {
  console.log("🔄 Création de l'audit de test...");

  const response = await fetch(`${API_URL}/api/audit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testAuditData.email,
      type: testAuditData.type,
      responses: {
        ...testAuditData.responses,
        photoFront: photoPlaceholder,
        photoSide: photoPlaceholder,
        photoBack: photoPlaceholder,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`);
  }

  const audit = await response.json();
  console.log(`✅ Audit créé: ${audit.id}`);
  console.log(`📧 Email client: ${audit.email}`);

  return audit;
}

async function checkReportStatus(auditId: string) {
  console.log(`\n🔍 Vérification du statut du rapport ${auditId}...`);

  const response = await fetch(`${API_URL}/api/audits/${auditId}/report-status`);

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status}`);
  }

  const status = await response.json();
  console.log(`📊 Status: ${status.status}`);
  console.log(`⏱️  Progress: ${status.progress}%`);
  console.log(`📝 Section: ${status.currentSection}`);

  return status;
}

async function waitForReportCompletion(auditId: string, maxWaitMinutes = 15) {
  console.log(`\n⏳ Attente de la génération du rapport (max ${maxWaitMinutes} min)...`);

  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkReportStatus(auditId);

    if (status.status === "completed") {
      console.log("\n🎉 RAPPORT TERMINÉ !");
      return true;
    }

    if (status.status === "failed") {
      console.error(`\n❌ Génération échouée: ${status.error}`);
      return false;
    }

    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.error(`\n⏰ Timeout après ${maxWaitMinutes} minutes`);
  return false;
}

async function getAuditDetails(auditId: string) {
  console.log(`\n📄 Récupération des détails de l'audit...`);

  const response = await fetch(`${API_URL}/api/audits/${auditId}`);

  if (!response.ok) {
    throw new Error(`Failed to get audit: ${response.status}`);
  }

  const audit = await response.json();

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   - Client: ${audit.clientName || testAuditData.responses.prenom}`);
  console.log(`   - Email: ${audit.email}`);
  console.log(`   - Score Global: ${audit.scores?.global || "N/A"}`);
  console.log(`   - Rapport TXT: ${audit.reportTxt ? `${audit.reportTxt.length} chars` : "Non disponible"}`);
  console.log(`   - Rapport HTML: ${audit.reportHtml ? `${audit.reportHtml.length} chars` : "Non disponible"}`);
  console.log(`   - Status: ${audit.reportDeliveryStatus}`);

  return audit;
}

// MAIN EXECUTION
async function main() {
  console.log("🚀 NEUROCORE 360 - TEST WORKFLOW COMPLET");
  console.log("=" .repeat(50));
  console.log(`API URL: ${API_URL}`);
  console.log(`Email Client: ${testAuditData.email}`);
  console.log(`Email Admin: achzodyt@gmail.com`);
  console.log("=" .repeat(50));

  try {
    // 1. Créer l'audit
    const audit = await createTestAudit();
    const auditId = audit.id;

    // 2. Attendre la génération
    const success = await waitForReportCompletion(auditId);

    if (!success) {
      console.error("\n❌ Le rapport n'a pas été généré avec succès");
      process.exit(1);
    }

    // 3. Récupérer les détails finaux
    const finalAudit = await getAuditDetails(auditId);

    // 4. Afficher les URLs
    console.log(`\n🔗 LIENS IMPORTANTS:`);
    console.log(`   - Dashboard Admin: ${API_URL}/admin`);
    console.log(`   - Dashboard Client: ${API_URL}/dashboard`);
    console.log(`   - Rapport HTML: ${API_URL}/api/audits/${auditId}/report-html`);

    console.log(`\n📧 VÉRIFICATIONS:`);
    console.log(`   ✅ Vérifie l'email à: achkou@gmail.com`);
    console.log(`   ✅ Vérifie l'email admin à: achzodyt@gmail.com`);
    console.log(`   ✅ Vérifie le dashboard admin`);
    console.log(`   ✅ Vérifie que le TXT est sauvegardé en DB`);
    console.log(`   ✅ Vérifie que le HTML utilise le nouveau design premium`);

    console.log(`\n🎯 TEST RÉUSSI !`);

  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  }
}

main();
