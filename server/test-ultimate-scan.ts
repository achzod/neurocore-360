/**
 * Test Ultimate Scan - 2 scenarios:
 * 1. WITH wearables data
 * 2. WITHOUT wearables data
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "https://neurocore-360.onrender.com";
const TEST_EMAIL = process.env.ULTIMATE_TEST_EMAIL || "achkou@gmail.com";
const TEST_NAME = process.env.ULTIMATE_TEST_NAME || "Achkan";

// Test photos
const PHOTOS_DIR = path.join(__dirname, "test-data/photos");

function loadPhotoAsBase64(filename: string): string {
  const filePath = path.join(PHOTOS_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  const mimeType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// Complete responses for Ultimate Scan test
const baseResponses = {
  // PROFIL BASE
  sexe: "homme",
  prenom: TEST_NAME,
  email: TEST_EMAIL,
  instagram: "@testultimate",
  age: "32",
  taille: "180",
  poids: "80",
  objectif: "recomposition",

  // SANTÉ & HISTORIQUE
  "diagnostic-medical": ["aucun"],
  "traitement-medical": "non",
  "bilan-sanguin-recent": "moins-6mois",
  "plateau-metabolique": "une-fois",
  "tca-historique": "jamais",
  "experience-sportive": "avance",

  // SOMMEIL
  "heures-sommeil": "6-7",
  "qualite-sommeil": "moyenne",
  endormissement: "parfois",
  "reveils-nocturnes": "parfois",
  "reveil-fatigue": "souvent",
  "heure-coucher": "23h-00h",

  // STRESS & NERVEUX
  "niveau-stress": "modere",
  anxiete: "parfois",
  concentration: "bonne",
  irritabilite: "parfois",
  "humeur-fluctuation": "parfois",
  "gestion-stress": ["sport", "musique"],

  // ÉNERGIE
  "energie-matin": "moyenne",
  "energie-aprem": "baisse-moderee",
  "coup-fatigue": "souvent",
  "envies-sucre": "parfois",
  motivation: "eleve",
  thermogenese: "parfois",

  // DIGESTION
  "digestion-qualite": "bonne",
  ballonnements: "parfois",
  transit: "regulier",
  reflux: "rarement",
  intolerance: ["aucune"],
  "energie-post-repas": "legere-baisse",

  // TRAINING
  "sport-frequence": "5+",
  "type-sport": ["musculation", "cardio"],
  intensite: "intense",
  recuperation: "moyenne",
  courbatures: "souvent",
  "performance-evolution": "stagnation",

  // NUTRITION BASE
  "nb-repas": "4-5",
  "petit-dejeuner": "toujours",
  "proteines-jour": "bon",
  "eau-jour": "2-3L",
  "regime-alimentaire": "aucun",
  "aliments-transformes": "rarement",
  "sucres-ajoutes": "faible",
  alcool: "1-3",

  // LIFESTYLE
  "cafe-jour": "3-4",
  tabac: "non",
  "temps-ecran": "4-6h",
  "exposition-soleil": "parfois",
  profession: "bureau",
  "heures-assis": "6-8h",

  // MINDSET
  "frustration-passee": "J'ai l'impression de stagner depuis 6 mois malgré un entraînement régulier. Les gains que je faisais au début ne sont plus là.",
  "si-rien-change": "Je vais continuer à tourner en rond, perdre ma motivation et potentiellement abandonner la muscu comme j'ai fait avec d'autres sports.",
  "ideal-6mois": "Un physique sec et musclé, plus d'énergie le matin, moins de crashes l'après-midi, et retrouver le plaisir de progresser à la salle.",
  "plus-grosse-peur": "Que tous ces efforts ne servent à rien et que je sois juste pas fait pour avoir un bon physique.",
  "engagement-niveau": "8-9",
  "motivation-principale": "esthetique",
  "consignes-strictes": "oui",
  "temps-training-semaine": "6h+",

  // ============================================
  // NUTRITION DÉTAILLÉE (NOUVELLES QUESTIONS)
  // ============================================
  "petit-dej-heure": "7h-8h",
  "petit-dej-contenu": "2 tartines de pain complet avec beurre et confiture, 1 yaourt nature, café au lait avec 1 sucre",
  "petit-dej-type": "sucre",

  "dejeuner-heure": "12h-13h",
  "dejeuner-contenu": "Souvent un sandwich au poulet ou un plat de pâtes bolognaise de la cantine, parfois une salade composée",
  "dejeuner-lieu": "cantine",

  "diner-heure": "20h-21h",
  "diner-contenu": "Pâtes ou riz avec viande, parfois pizza le weekend. Fromage en dessert.",
  "diner-glucides": "beaucoup",
  "diner-coucher-delai": "1h-2h",

  "grignotage-frequence": "souvent",
  "grignotage-contenu": "Barres chocolatées, parfois des amandes, gâteaux secs du bureau",
  "grignotage-moment": ["aprem", "soir"],

  "cheatmeal-frequence": "1-semaine",
  "cheatmeal-contenu": "Pizza + glace ou burger + frites + soda. Parfois apéro avec chips et bières le samedi.",

  "huiles-cuisson": "tournesol",
  "aliments-inflammatoires": ["pain-blanc", "pates-blanches", "viennoiseries", "charcuterie", "plats-prepares"],

  // HORMONES HOMME
  "libido-niveau": "moyenne",
  "erections-matinales": "parfois",
  "fatigue-chronique": "parfois",
  "masse-musculaire": "difficile",
  "graisse-abdominale": "oui",
  "motivation-generale": "fluctuante",
  "pilosite-evolution": "stable",
  "testosterone-bilan": "non",
  "age-physiologique": "plus-vieux",
  "recuperation-sexuelle": "normale",
  "humeur-hormones": "parfois",

  // AXES CLINIQUES
  "thyroide-symptomes": ["frilosite", "fatigue"],
  "sii-symptomes": ["ballonnements"],
  "glycemie-symptomes": ["fringales"],
  "cortisol-symptomes": ["ventre-gras", "fatigue-matin"],
  "inflammation-symptomes": ["raideurs"],

  // SUPPLEMENTS
  "supplements-actuels": "Whey protein, créatine 5g/jour, vitamine D en hiver",
  "supplements-passes": "Pré-workout avec caféine (arrêté car palpitations)",
  "budget-supplements": "50-100",

  // BIOMARQUEURS
  "bilan-resultats": "Dernière prise de sang il y a 4 mois : tout normal sauf vitamine D un peu basse",
  "bilan-anormal": "Vitamine D à 28 ng/mL (seuil 30)",

  // COMPOSITION CORPORELLE
  "tour-taille": "86",
  "tour-hanches": "98",
  "bodyfat-estime": "18-20%",
  "objectif-bodyfat": "12-14%",

  // NUTRITION TIMING (ELITE)
  "pre-workout-timing": "1h-avant",
  "pre-workout-contenu": "Banane + flocons d'avoine",
  "intra-workout": "eau",
  "post-workout-timing": "30min",
  "post-workout-contenu": "Shaker whey + banane",
  "jours-repos-nutrition": "identique",

  // CARDIO & PERFORMANCE
  "cardio-type": "course",
  "cardio-frequence": "2-3",
  "cardio-intensite": "modere",
  "zone2-temps": "60-90",
  "hiit-ratio": "20-40",
  "essoufflement": "normal",

  // HRV & CARDIAQUE
  "hrv-mesure": "non",
  "fc-repos": "65-75",
  "fc-max": "inconnu",
  "variabilite-fc": "inconnu",
  "stress-cardiaque": "normal",

  // BLESSURES & DOULEURS
  "blessures-actuelles": "Légère douleur épaule droite depuis 2 mois",
  "blessures-passees": "Entorse cheville il y a 2 ans, tendinite coude il y a 1 an",
  "douleurs-chroniques": "Bas du dos raide le matin",
  "mobilite-limitee": ["epaules", "hanches"],
  "prevention-routine": "Quelques étirements après la séance, pas régulier",

  // PSYCHOLOGIE & MENTAL
  "mental-training": "focus",
  "blocages-mentaux": "Je doute de mes capacités quand je stagne",
  "gestion-echec": "Je me compare aux autres et ça me démotive",
  "visualisation": "parfois",
  "routines-mentales": "Musique avant l'entraînement pour me motiver",
};

// Wearable data simulation (Oura Ring style)
const wearableData = {
  terraConnected: true,
  terraProvider: "OURA",
  terraData: {
    sleep: {
      total_sleep_duration_seconds: 21600, // 6h
      deep_sleep_duration_seconds: 3600, // 1h
      rem_sleep_duration_seconds: 5400, // 1.5h
      light_sleep_duration_seconds: 10800, // 3h
      awake_duration_seconds: 1800, // 30min
      sleep_efficiency: 0.72,
      sleep_score: 68,
      bedtime_start: "23:45",
      bedtime_end: "06:45",
      hrv_average: 32,
      hr_lowest: 52,
      hr_average: 58,
      respiratory_rate: 15.2,
      temperature_delta: 0.3,
    },
    activity: {
      steps: 6500,
      calories_active: 420,
      calories_total: 2100,
      activity_score: 72,
      sedentary_seconds: 32400, // 9h
      low_intensity_seconds: 7200, // 2h
      medium_intensity_seconds: 3600, // 1h
      high_intensity_seconds: 1800, // 30min
      met_minutes: 380,
    },
    readiness: {
      score: 65,
      recovery_index: 0.68,
      temperature_deviation: 0.4,
      hrv_balance: -8,
      previous_night_score: 62,
      sleep_balance: -12,
      activity_balance: 5,
    },
    daily: {
      average_hrv_7days: 35,
      average_resting_hr_7days: 56,
      average_sleep_score_7days: 70,
      average_activity_score_7days: 74,
    },
  },
};

async function submitAudit(
  email: string,
  responses: Record<string, unknown>,
  testName: string
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const payload = {
      email,
      type: "ELITE",
      responses,
    };

    console.log(`📤 Submitting audit to ${API_BASE}/api/audit/create...`);
    console.log(`   Email: ${email}`);
    console.log(`   Type: ELITE (Ultimate Scan)`);

    const response = await fetch(`${API_BASE}/api/audit/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ Error: ${response.status}`, error);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Audit created: ${result.id}`);
    console.log(`   View: ${API_BASE}/audit/${result.id}`);
    return result;
  } catch (error) {
    console.error(`❌ Network error:`, error);
    return null;
  }
}

async function checkAuditStatus(auditId: string): Promise<void> {
  console.log(`\n⏳ Checking status for audit ${auditId}...`);

  let attempts = 0;
  const maxAttempts = 60; // 10 minutes max

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `${API_BASE}/api/audits/${auditId}/narrative-status`
      );
      const status = await response.json();

      if (status.status === "completed") {
        console.log(`\n✅ Report generation COMPLETED!`);
        console.log(`   View report: ${API_BASE}/audit/${auditId}`);
        return;
      } else if (status.status === "failed") {
        console.log(`\n❌ Report generation FAILED: ${status.error}`);
        return;
      } else {
        process.stdout.write(
          `\r   Progress: ${status.progress}% - ${status.currentSection || "..."}`
        );
      }
    } catch (e) {
      // Ignore fetch errors, keep polling
    }

    await new Promise((r) => setTimeout(r, 10000)); // 10s
    attempts++;
  }

  console.log(`\n⚠️ Timeout - check manually: ${API_BASE}/audit/${auditId}`);
}

async function runTests() {
  console.log("\n🚀 NEUROCORE 360 - Ultimate Scan Test Suite\n");

  // Load photos
  console.log("📷 Loading photos...");
  const photoFront = loadPhotoAsBase64("front.jpeg");
  const photoSide = loadPhotoAsBase64("side.jpeg");
  const photoBack = loadPhotoAsBase64("back.jpeg");
  console.log(`   ✅ Photos loaded (${Math.round(photoFront.length / 1024)}KB, ${Math.round(photoSide.length / 1024)}KB, ${Math.round(photoBack.length / 1024)}KB)`);

  // TEST 1: WITH WEARABLES
  const testEmail1 = TEST_EMAIL;
  const responsesWithWearables = {
    ...baseResponses,
    email: testEmail1,
    photoFront,
    photoSide,
    photoBack,
    ...wearableData,
  };

  const audit1 = await submitAudit(
    testEmail1,
    responsesWithWearables,
    "Ultimate Scan WITH Wearables (Oura Ring)"
  );

  // TEST 2: WITHOUT WEARABLES
  const testEmail2 = TEST_EMAIL;
  const responsesNoWearables = {
    ...baseResponses,
    email: testEmail2,
    photoFront,
    photoSide,
    photoBack,
    terraConnected: false,
  };

  const audit2 = await submitAudit(
    testEmail2,
    responsesNoWearables,
    "Ultimate Scan WITHOUT Wearables"
  );

  // Monitor both audits
  console.log("\n\n📊 MONITORING AUDIT GENERATION...\n");

  if (audit1) {
    console.log(`\n[TEST 1] Audit ID: ${audit1.id}`);
    await checkAuditStatus(audit1.id);
  }

  if (audit2) {
    console.log(`\n[TEST 2] Audit ID: ${audit2.id}`);
    await checkAuditStatus(audit2.id);
  }

  console.log("\n\n✅ TEST SUITE COMPLETE\n");
  console.log("URLs des rapports générés:");
  if (audit1) console.log(`  - WITH wearables: ${API_BASE}/audit/${audit1.id}`);
  if (audit2) console.log(`  - WITHOUT wearables: ${API_BASE}/audit/${audit2.id}`);
}

runTests().catch(console.error);
