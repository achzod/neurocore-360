/**
 * E2E Test Script for Neurocore 360 Report Generation
 * Tests:
 * 1. Pro Panel report with Apple wearable data
 * 2. Pro Panel report with Ultrahuman wearable data
 * 3. Anabolic report without wearable data
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'https://neurocore-360.onrender.com';

// Load photos as base64
function loadPhotoBase64(photoPath: string): string {
  const fullPath = path.join(__dirname, photoPath);
  const buffer = fs.readFileSync(fullPath);
  const ext = path.extname(photoPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Complete questionnaire responses (homme)
const baseResponses = {
  // Profil de Base
  sexe: "homme",
  prenom: "Test_Apple_Wearable",
  age: "26-35",
  taille: "181-190",
  poids: "81-90",
  objectif: "recomposition",
  profession: "bureau",
  "niveau-activite": "actif",
  "historique-medical": ["aucun"],
  medicaments: "non",
  allergies: ["aucune"],

  // Composition Corporelle
  "masse-grasse": "16-20",
  "objectif-poids": "maintenir",
  "evolution-poids": "stable",
  "regimes-passes": "1-2",
  morphologie: "mesomorphe",
  "zones-stockage": ["ventre"],
  "retention-eau": "parfois",
  cellulite: "aucune",

  // Metabolisme & Energie
  "niveau-energie-matin": "bon",
  "niveau-energie-aprem": "moyen",
  "niveau-energie-soir": "bon",
  "coup-fatigue": "parfois",
  "heure-coup-fatigue": "aprem",
  thermogenese: "parfois",
  sudation: "normal",
  "metabolisme-percu": "normal",
  "envies-sucre": "parfois",
  "faim-frequence": "3-repas",

  // Nutrition & Tracking
  "nb-repas": "3",
  "petit-dejeuner": "toujours",
  "type-petit-dej": "sale",
  "tracking-calories": "parfois",
  "calories-jour": "2000-2500",
  "proteines-jour": "bonne",
  "eau-jour": "2-3L",
  "regime-alimentaire": "aucun",
  supplements: ["whey", "creatine", "omega3"],
  "repas-exterieur": "1-2",
  "glucides-reveil": "oui-complexes",
  "diner-glucides": "modere",
  "huiles-cuisson": "olive",
  "aliments-transformes": "rarement",
  "ble-gluten-freq": "modere",
  "sucres-ajoutes": "faible",
  "omega6-omega3": "optimal",

  // Digestion & Microbiome
  "digestion-qualite": "bonne",
  ballonnements: "parfois",
  transit: "normal",
  reflux: "jamais",
  intolerance: ["aucune"],
  probiotiques: "parfois",
  "aliments-fermentes": "parfois",
  "antibiotiques-recent": "non",
  "selles-aspect": "3-4",
  "douleurs-abdominales": "rarement",

  // Activite & Performance
  "sport-frequence": "3-4",
  "type-sport": ["musculation", "cardio"],
  "duree-seance": "60-90",
  "intensite-entrainement": "intense",
  recuperation: "bonne",
  courbatures: "parfois",
  "performance-evolution": "progression",
  blessures: ["aucune"],
  echauffement: "toujours",
  etirements: "parfois",
  "cardio-jeun": "parfois",
  "glucides-pre-cardio": "non",
  "glucides-pre-muscu": "oui-collation",
  "glucides-intra": "non",
  "bcaa-eaa-intra": "non",
  "repas-post-training": "1h",
  "shake-post": "whey-simple",
  "timing-training": "soir",

  // Sommeil & Recuperation
  "heures-sommeil": "7-8",
  "qualite-sommeil": "bonne",
  "heure-coucher": "23h-00h",
  "heure-lever": "7h-8h",
  endormissement: "normal",
  "reveils-nocturnes": "parfois",
  "reveil-repose": "souvent",
  sieste: "parfois",
  "ecrans-soir": "souvent",
  "chambre-temperature": "optimal",

  // HRV & Cardiaque
  "hrv-mesure": "regulierement",
  "hrv-valeur": "70+",
  "fc-repos": "50-60",
  "tension-arterielle": "normale",
  "montre-connectee": "oui",
  "type-montre": "apple",
  palpitations: "jamais",
  essoufflement: "effort-intense",

  // Cardio & Endurance
  "cardio-frequence": "1-2",
  "cardio-type": ["marche", "velo"],
  "cardio-duree": "30-45",
  "zone2-connaissance": "oui-pratique",
  "zone2-frequence": "60-120",
  "vo2max-estime": "40-50",
  "lactate-threshold": "oui-estime",
  "hiit-ratio": "20-hiit",
  "fc-cardio": "120-140",
  "endurance-objectif": "sante-cardiaque",

  // Analyses & Biomarqueurs
  "bilan-sanguin-recent": "3-mois",
  "glycemie-statut": "normale",
  "cholesterol-statut": "normal",
  "vitamine-d-statut": "optimal",
  "fer-statut": "normal",
  "thyroide-statut": "normale",
  "testosterone-statut": "normal",
  "inflammation-statut": "non",
  "foie-statut": "normaux",
  "reins-statut": "normaux",

  // Hormones & Stress
  "niveau-stress": "modere",
  "sources-stress": ["travail"],
  "gestion-stress": ["sport", "meditation"],
  anxiete: "legere",
  "humeur-fluctuation": "parfois",
  libido: "bonne",
  "cortisol-symptomes": ["aucun"],
  "thyroide-symptomes": ["aucun"],
  "erection-qualite": "quotidiennes",
  prostate: "non",
  calvitie: "non",
  motivation: "bon",

  // Lifestyle & Substances
  "cafe-jour": "1-2",
  "dernier-cafe": "avant-12h",
  "alcool-semaine": "1-3",
  tabac: "non",
  cannabis: "non",
  "temps-ecran": "2-4h",
  "exposition-soleil": "regulier",
  "nature-frequence": "hebdo",
  "meditation-pratique": "parfois",
  "douche-froide": "parfois",

  // Biomecanique & Mobilite
  "douleurs-chroniques": ["aucune"],
  "posture-travail": "assis",
  "heures-assis": "6-8h",
  "mobilite-generale": "bonne",
  "squat-profond": "oui",
  "toucher-orteils": "oui",
  asymetrie: "non",
  "travail-mobilite": "parfois",
  "foam-roller": "parfois",
  "kine-osteo": "rarement",

  // Psychologie & Mental
  "tca-historique": "jamais",
  "tca-type": ["aucun"],
  "relation-nourriture": "saine",
  "depression-vecu": "jamais",
  "depression-symptomes": ["aucun"],
  "trauma-vecu": "non",
  "trauma-impact": "na",
  "estime-soi": "bonne",
  "motivation-profonde": "sante",
  "modele-inspiration": "ancien-moi",
  "blocages-perso": ["manque-temps"],
  "soutien-social": "bien",
  "suivi-psy": "non",
  "objectif-transformation": "Optimiser ma sante globale et atteindre un niveau de performance durable",

  // Neurotransmetteurs
  concentration: "bonne",
  memoire: "bonne",
  "brain-fog": "parfois",
  "humeur-generale": "positive",
  procrastination: "parfois",
  impulsivite: "reflechi",
  creativite: "bonne",
  apprentissage: "facile",
};

// Terra wearable data from Apple
const appleWearableData = {
  "hrv-actuelle": 90,
  "hrv-moyenne": 90,
  "hrv-sdnn": 90,
  "hrv-rmssd": 60,
  "duree-sommeil": 8.7,
  "sommeil-profond": 60,
  "sommeil-leger": 295,
  "sommeil-rem": 85,
  "fc-repos": 49,
  "frequence-cardiaque-repos": 49,
  "fc-moyenne": 68,
  "fc-max": 100,
  "fc-min": 39,
  "pas-quotidiens": 4550,
  "nombre-pas": 4550,
  "distance-parcourue": 3.2,
  "etages-montes": 3,
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createAudit(email: string, type: string, responses: any) {
  console.log(`\n📝 Creating ${type} audit for ${email}...`);

  const res = await fetch(`${BASE_URL}/api/audit/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type, responses }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Failed to create audit:', data);
    throw new Error(`Failed to create audit: ${JSON.stringify(data)}`);
  }

  console.log(`✅ Audit created: ${data.id}`);
  return data;
}

async function waitForReport(auditId: string, maxWaitMs: number = 300000) {
  console.log(`⏳ Waiting for report generation (max ${maxWaitMs/1000}s)...`);

  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(`${BASE_URL}/api/audits/${auditId}/narrative-status`);
    const status = await res.json();

    if (status.status !== lastStatus) {
      console.log(`  Status: ${status.status} | Progress: ${status.progress || 0}% | Section: ${status.currentSection || 'N/A'}`);
      lastStatus = status.status;
    }

    if (status.status === 'completed') {
      console.log(`✅ Report completed in ${Math.round((Date.now() - startTime) / 1000)}s`);
      return true;
    }

    if (status.status === 'failed') {
      console.error(`❌ Report generation failed: ${status.error}`);
      return false;
    }

    await sleep(5000);
  }

  console.error('❌ Report generation timed out');
  return false;
}

async function verifyDashboard(auditId: string) {
  console.log(`🔍 Verifying dashboard for audit ${auditId}...`);

  const res = await fetch(`${BASE_URL}/api/audits/${auditId}/dashboard`);
  const dashboard = await res.json();

  if (!res.ok || dashboard.error) {
    console.error('❌ Dashboard fetch failed:', dashboard);
    return false;
  }

  console.log(`✅ Dashboard loaded:`);
  console.log(`   - Client: ${dashboard.clientName || 'N/A'}`);
  console.log(`   - Sections: ${dashboard.sections?.length || 0}`);
  console.log(`   - Resume: ${(dashboard.resumeExecutif || '').substring(0, 100)}...`);

  if (dashboard.sections && dashboard.sections.length > 0) {
    console.log(`   - Section titles:`);
    dashboard.sections.slice(0, 5).forEach((s: any) => {
      console.log(`     • ${s.title}`);
    });
  }

  return dashboard.sections && dashboard.sections.length > 0;
}

async function verifyAuditEmail(auditId: string) {
  console.log(`📧 Checking email status for audit ${auditId}...`);

  const res = await fetch(`${BASE_URL}/api/audits/${auditId}`);
  const audit = await res.json();

  console.log(`   - Delivery Status: ${audit.reportDeliveryStatus}`);
  console.log(`   - Report Sent At: ${audit.reportSentAt || 'Not sent yet'}`);

  return audit.reportDeliveryStatus === 'SENT';
}

async function runTest1_AppleWearable() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Pro Panel with Apple Wearable Data');
  console.log('='.repeat(60));

  // Load photos
  const photoFront = loadPhotoBase64('test-data/photos/front.jpeg');
  const photoSide = loadPhotoBase64('test-data/photos/side.jpeg');
  const photoBack = loadPhotoBase64('test-data/photos/back.jpeg');

  // Merge base responses with wearable data and photos
  const responses = {
    ...baseResponses,
    ...appleWearableData,
    prenom: "Julien_Apple",
    photoFront,
    photoSide,
    photoBack,
    terraProvider: "APPLE",
    terraConnected: true,
  };

  const audit = await createAudit('achkou@gmail.com', 'PREMIUM', responses);
  const reportOk = await waitForReport(audit.id);

  if (reportOk) {
    const dashboardOk = await verifyDashboard(audit.id);
    const emailOk = await verifyAuditEmail(audit.id);

    console.log('\n📊 Test 1 Results:');
    console.log(`   - Report Generated: ${reportOk ? '✅' : '❌'}`);
    console.log(`   - Dashboard Valid: ${dashboardOk ? '✅' : '❌'}`);
    console.log(`   - Email Sent: ${emailOk ? '✅' : '⏳ Pending'}`);
    console.log(`   - Audit ID: ${audit.id}`);
    console.log(`   - Dashboard URL: ${BASE_URL}/audit/${audit.id}`);

    return { success: reportOk && dashboardOk, auditId: audit.id };
  }

  return { success: false, auditId: audit.id };
}

async function runTest2_UltrahumanWearable() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Pro Panel with Ultrahuman Wearable Data');
  console.log('='.repeat(60));

  // Load photos
  const photoFront = loadPhotoBase64('test-data/photos/front.jpeg');
  const photoSide = loadPhotoBase64('test-data/photos/side.jpeg');
  const photoBack = loadPhotoBase64('test-data/photos/back.jpeg');

  // Ultrahuman-specific data (simulated from real Ultrahuman data)
  const ultrahumanWearableData = {
    "hrv-actuelle": 85,
    "hrv-moyenne": 82,
    "hrv-sdnn": 78,
    "hrv-rmssd": 55,
    "duree-sommeil": 7.5,
    "sommeil-profond": 55,
    "sommeil-leger": 280,
    "sommeil-rem": 75,
    "fc-repos": 52,
    "frequence-cardiaque-repos": 52,
    "fc-moyenne": 65,
    "fc-max": 95,
    "fc-min": 42,
    "pas-quotidiens": 6200,
    "nombre-pas": 6200,
    "distance-parcourue": 4.8,
    "etages-montes": 5,
  };

  const responses = {
    ...baseResponses,
    ...ultrahumanWearableData,
    prenom: "Marc_Ultrahuman",
    photoFront,
    photoSide,
    photoBack,
    terraProvider: "ULTRAHUMAN",
    terraConnected: true,
  };

  const audit = await createAudit('achkou@gmail.com', 'PREMIUM', responses);
  const reportOk = await waitForReport(audit.id);

  if (reportOk) {
    const dashboardOk = await verifyDashboard(audit.id);
    const emailOk = await verifyAuditEmail(audit.id);

    console.log('\n📊 Test 2 Results:');
    console.log(`   - Report Generated: ${reportOk ? '✅' : '❌'}`);
    console.log(`   - Dashboard Valid: ${dashboardOk ? '✅' : '❌'}`);
    console.log(`   - Email Sent: ${emailOk ? '✅' : '⏳ Pending'}`);
    console.log(`   - Audit ID: ${audit.id}`);
    console.log(`   - Dashboard URL: ${BASE_URL}/audit/${audit.id}`);

    return { success: reportOk && dashboardOk, auditId: audit.id };
  }

  return { success: false, auditId: audit.id };
}

async function runTest3_NoWearable() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Anabolic Report (No Wearable Data)');
  console.log('='.repeat(60));

  // Load photos
  const photoFront = loadPhotoBase64('test-data/photos/front.jpeg');
  const photoSide = loadPhotoBase64('test-data/photos/side.jpeg');
  const photoBack = loadPhotoBase64('test-data/photos/back.jpeg');

  // Override some values for anabolic-focused profile
  const anabolicResponses = {
    ...baseResponses,
    prenom: "Thomas_Anabolic",
    objectif: "prise-muscle",
    "objectif-poids": "prendre-5+",
    morphologie: "ectomorphe",
    "calories-jour": "3000+",
    "proteines-jour": "haute",
    "sport-frequence": "5+",
    "type-sport": ["musculation"],
    "duree-seance": "90+",
    "intensite-entrainement": "extreme",
    "shake-post": "whey-glucides",
    supplements: ["whey", "creatine", "vitamines"],
    // Manual HRV/HR values (no wearable)
    "hrv-mesure": "parfois",
    "hrv-valeur": "50-70",
    "fc-repos": "60-70",
    terraConnected: false,
    photoFront,
    photoSide,
    photoBack,
  };

  const audit = await createAudit('achkou@gmail.com', 'PREMIUM', anabolicResponses);
  const reportOk = await waitForReport(audit.id);

  if (reportOk) {
    const dashboardOk = await verifyDashboard(audit.id);
    const emailOk = await verifyAuditEmail(audit.id);

    console.log('\n📊 Test 3 Results:');
    console.log(`   - Report Generated: ${reportOk ? '✅' : '❌'}`);
    console.log(`   - Dashboard Valid: ${dashboardOk ? '✅' : '❌'}`);
    console.log(`   - Email Sent: ${emailOk ? '✅' : '⏳ Pending'}`);
    console.log(`   - Audit ID: ${audit.id}`);
    console.log(`   - Dashboard URL: ${BASE_URL}/audit/${audit.id}`);

    return { success: reportOk && dashboardOk, auditId: audit.id };
  }

  return { success: false, auditId: audit.id };
}

async function main() {
  console.log('🚀 Starting Neurocore 360 E2E Report Tests');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`📅 ${new Date().toISOString()}`);

  const results: { test: string; success: boolean; auditId: string }[] = [];

  // Run Test 1: Apple Wearable
  try {
    const test1 = await runTest1_AppleWearable();
    results.push({ test: 'Pro Panel + Apple', ...test1 });
  } catch (error) {
    console.error('Test 1 failed with error:', error);
    results.push({ test: 'Pro Panel + Apple', success: false, auditId: '' });
  }

  // Wait between tests
  await sleep(5000);

  // Run Test 2: Ultrahuman Wearable
  try {
    const test2 = await runTest2_UltrahumanWearable();
    results.push({ test: 'Pro Panel + Ultrahuman', ...test2 });
  } catch (error) {
    console.error('Test 2 failed with error:', error);
    results.push({ test: 'Pro Panel + Ultrahuman', success: false, auditId: '' });
  }

  // Wait between tests
  await sleep(5000);

  // Run Test 3: No Wearable
  try {
    const test3 = await runTest3_NoWearable();
    results.push({ test: 'Anabolic (No Wearable)', ...test3 });
  } catch (error) {
    console.error('Test 3 failed with error:', error);
    results.push({ test: 'Anabolic (No Wearable)', success: false, auditId: '' });
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL TEST SUMMARY');
  console.log('='.repeat(60));

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.test}: ${r.success ? '✅ PASS' : '❌ FAIL'} (${r.auditId || 'N/A'})`);
  });

  const allPassed = results.every(r => r.success);
  console.log(`\n🏁 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  // Reminder about emails
  console.log('\n📧 Email Verification:');
  console.log('   - Check achkou@gmail.com for dashboard links');
  console.log('   - Check achzodyt@gmail.com for admin notifications');

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
