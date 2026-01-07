/**
 * Test script for Ultimate Scan with photos and optional wearable data
 * Usage: npx tsx scripts/test-ultimate-scan.ts [--with-wearables]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD_URL = 'https://neurocore-360.onrender.com';

// Test client data
const testResponses = {
  prenom: "Marc",
  nom: "Test",
  sexe: "homme",
  age: "35",
  taille: "182",
  poids: "88",
  objectif: "recomposition corporelle - perte de gras et gain musculaire",

  // Health
  "diagnostic-medical": [],
  "traitement-medical": "non",
  "bilan-sanguin-recent": "oui",
  "plateau-metabolique": "oui",
  "tca-historique": "non",
  "experience-sportive": "intermediaire",

  // Sleep
  "heures-sommeil": "6-7",
  "qualite-sommeil": "moyenne",
  "endormissement": "parfois",
  "reveils-nocturnes": "souvent",
  "reveil-fatigue": "souvent",
  "heure-coucher": "23h-00h",

  // Stress
  "niveau-stress": "modere",
  "anxiete": "parfois",
  "concentration": "moyenne",
  "irritabilite": "parfois",
  "humeur-fluctuation": "parfois",
  "gestion-stress": ["sport", "meditation"],

  // Energy
  "energie-matin": "moyenne",
  "energie-aprem": "baisse-moderee",
  "coup-fatigue": "parfois",
  "envies-sucre": "parfois",
  "motivation": "haute",
  "thermogenese": "normal",

  // Digestion
  "digestion-qualite": "bonne",
  "ballonnements": "rarement",
  "transit": "normal",
  "reflux": "non",
  "intolerance": [],
  "energie-post-repas": "normal",

  // Training
  "sport-frequence": "4-5",
  "type-sport": ["musculation", "cardio"],
  "intensite": "eleve",
  "recuperation": "moyenne",
  "courbatures": "parfois",
  "performance-evolution": "stagnation",

  // Nutrition
  "nb-repas": "4",
  "petit-dejeuner": "oui",
  "proteines-jour": "eleve",
  "eau-jour": "2-3L",
  "regime-alimentaire": "standard",
  "aliments-transformes": "rarement",
  "sucres-ajoutes": "faible",
  "alcool": "1-3",

  // Lifestyle
  "cafe-jour": "2",
  "tabac": "non",
  "temps-ecran": "4-6h",
  "exposition-soleil": "modere",
  "profession": "bureau",
  "heures-assis": "6-8h",

  // Mindset
  "engagement-niveau": "9-10",
  "consignes-strictes": "oui",
  "temps-training-semaine": "6-8h",
  "frustration-passee": "Je stagne depuis plusieurs mois malgre un training serieux et une nutrition calibree",
  "si-rien-change": "Ca serait vraiment frustrant de ne pas progresser malgre tous ces efforts",
  "ideal-6mois": "Avoir un physique sec et muscule, autour de 12% de bodyfat avec une bonne masse musculaire",
  "plus-grosse-peur": "Ne jamais atteindre mon potentiel physique",
  "motivation-principale": "Performance et esthetique"
};

// Wearable data (simulated Oura/Whoop style)
const wearableData = {
  hrv: {
    average: 42,
    trend: "declining",
    lastNight: 38
  },
  sleep: {
    duration: 6.2,
    efficiency: 78,
    deepSleepPct: 12,
    remSleepPct: 18,
    awakenings: 4,
    hrvDuringSleep: 45
  },
  recovery: {
    score: 62,
    trend: "stable"
  },
  activity: {
    steps: 8500,
    caloriesBurned: 2400,
    activeMinutes: 75
  },
  stress: {
    averageLevel: "moderate",
    peakMoments: 3
  }
};

async function loadPhotos(): Promise<{ front: string; side: string; back: string }> {
  const photosDir = path.join(__dirname, '../server/test-data/photos');

  const frontPath = path.join(photosDir, 'front.jpeg');
  const sidePath = path.join(photosDir, 'side.jpeg');
  const backPath = path.join(photosDir, 'back.jpeg');

  if (!fs.existsSync(frontPath) || !fs.existsSync(sidePath) || !fs.existsSync(backPath)) {
    throw new Error('Photos not found in server/test-data/photos/');
  }

  const front = fs.readFileSync(frontPath).toString('base64');
  const side = fs.readFileSync(sidePath).toString('base64');
  const back = fs.readFileSync(backPath).toString('base64');

  return {
    front: `data:image/jpeg;base64,${front}`,
    side: `data:image/jpeg;base64,${side}`,
    back: `data:image/jpeg;base64,${back}`
  };
}

async function createUltimateScanTest(withWearables: boolean) {
  console.log(`\n=== Creating Ultimate Scan Test (${withWearables ? 'WITH' : 'WITHOUT'} wearables) ===\n`);

  // Load photos
  console.log('Loading photos...');
  const photos = await loadPhotos();
  console.log(`Photos loaded: front=${photos.front.length} chars, side=${photos.side.length} chars, back=${photos.back.length} chars`);

  // Build request body
  const requestBody: any = {
    email: `test.ultimate.${withWearables ? 'wearables' : 'nowearables'}.${Date.now()}@example.com`,
    type: "ELITE",
    responses: {
      ...testResponses,
      photoFront: photos.front,
      photoSide: photos.side,
      photoBack: photos.back
    }
  };

  // Add wearable data if requested
  if (withWearables) {
    requestBody.responses.wearableData = wearableData;
    requestBody.responses.hasWearable = "oui";
    requestBody.responses.wearableType = "oura";
  } else {
    requestBody.responses.hasWearable = "non";
  }

  console.log(`\nSending request to ${PROD_URL}/api/audit/create...`);
  console.log(`Email: ${requestBody.email}`);
  console.log(`Type: ${requestBody.type}`);
  console.log(`Has photos: true (3 photos)`);
  console.log(`Has wearables: ${withWearables}`);

  try {
    const response = await fetch(`${PROD_URL}/api/audit/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\nError creating audit:', data);
      return null;
    }

    console.log('\nAudit created successfully!');
    console.log('Audit ID:', data.id);
    console.log('Status:', data.status);
    console.log('Report Delivery Status:', data.reportDeliveryStatus);
    console.log(`\nDashboard URL: ${PROD_URL}/ultimate/${data.id}`);

    return data.id;
  } catch (error) {
    console.error('\nRequest failed:', error);
    return null;
  }
}

async function checkReportStatus(auditId: string) {
  console.log(`\nChecking report status for ${auditId}...`);

  try {
    const response = await fetch(`${PROD_URL}/api/audits/${auditId}/narrative`);
    const data = await response.json();

    if (data.error) {
      console.log('Status:', data.status || 'Not ready');
      console.log('Message:', data.message || data.error);
      return false;
    }

    console.log('Report ready!');
    console.log('Global Score:', data.globalScore);
    console.log('Sections:', data.sections?.length || 0);
    console.log('Metrics:', data.metrics?.length || 0);
    return true;
  } catch (error) {
    console.error('Check failed:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const withWearables = args.includes('--with-wearables');
  const checkOnly = args.includes('--check');
  const auditIdToCheck = args.find(a => a.startsWith('--audit='))?.split('=')[1];

  if (checkOnly && auditIdToCheck) {
    await checkReportStatus(auditIdToCheck);
    return;
  }

  const auditId = await createUltimateScanTest(withWearables);

  if (auditId) {
    console.log('\n--- Waiting 10 seconds before checking status ---');
    await new Promise(r => setTimeout(r, 10000));
    await checkReportStatus(auditId);

    console.log('\n--- Instructions ---');
    console.log(`1. Open dashboard: ${PROD_URL}/ultimate/${auditId}`);
    console.log(`2. Check generation progress: curl ${PROD_URL}/api/audits/${auditId}/narrative`);
    console.log(`3. Re-run check: npx tsx scripts/test-ultimate-scan.ts --check --audit=${auditId}`);
  }
}

main().catch(console.error);
