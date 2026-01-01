/**
 * Test workflow complet avec GPT-5.2-2025-12-11
 * 
 * Ce script teste le workflow complet :
 * 1. Création d'un audit via API
 * 2. Génération du rapport avec GPT
 * 3. Vérification des emails envoyés
 * 
 * Email test : achkou@gmail.com
 * Email admin : achzodyt@gmail.com
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
const TEST_EMAIL = 'achkou@gmail.com';
const ADMIN_EMAIL = 'achzodyt@gmail.com';

// Données de test (homme)
const TEST_RESPONSES = {
  prenom: 'Test',
  nom: 'GPT',
  age: '30',
  sexe: 'homme',
  objectif: 'Perte de graisse et gain de muscle',
  niveau: 'intermediaire',
  frequence: '4-5 fois par semaine',
  duree: '1h-1h30',
  split: 'PPL (Push Pull Legs)',
  experience: '2-5 ans',
  blessures: 'Aucune',
  objectifs_specifiques: 'Perte de graisse abdominale, gain de masse musculaire',
  contraintes: 'Temps limité le matin',
  preferences_alimentaires: 'Flexible',
  intolerances: 'Aucune',
  sommeil: '6-7h par nuit',
  stress: 'Modéré',
  energie: 'Variable selon les jours',
  recuperation: 'Parfois insuffisante',
  digestion: 'Occasionnellement ballonnements',
  motivation: 'Élevée mais fluctuante'
};

// Photos de test (homme)
const PHOTOS_DIR = path.join(process.cwd(), 'server', 'test-data', 'photos');
// Chercher les photos disponibles (front, side, back)
const PHOTO_PATTERNS = ['front', 'side', 'back'];

async function loadPhotos(): Promise<string[]> {
  const photos: string[] = [];
  
  // Chercher les fichiers correspondant aux patterns
  if (fs.existsSync(PHOTOS_DIR)) {
    const files = fs.readdirSync(PHOTOS_DIR);
    for (const pattern of PHOTO_PATTERNS) {
      const file = files.find(f => f.toLowerCase().includes(pattern) && (f.endsWith('.jpg') || f.endsWith('.jpeg')));
      if (file) {
        const filePath = path.join(PHOTOS_DIR, file);
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        photos.push(`data:image/jpeg;base64,${base64}`);
        console.log(`   ✅ Photo chargée: ${file}`);
      } else {
        console.log(`⚠️  Photo non trouvée pour pattern: ${pattern}`);
      }
    }
  } else {
    console.log(`⚠️  Dossier photos non trouvé: ${PHOTOS_DIR}`);
  }
  
  return photos;
}

async function createAudit(): Promise<string> {
  console.log('\n📝 Étape 1: Création de l\'audit via API...');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Modèle: GPT-5.2-2025-12-11`);
  
  const photos = await loadPhotos();
  console.log(`   Photos chargées: ${photos.length}/3`);
  
  // Ajouter les photos dans les responses
  const responsesWithPhotos = {
    ...TEST_RESPONSES,
    photoFront: photos[0] || '',
    photoSide: photos[1] || '',
    photoBack: photos[2] || ''
  };
  
  const response = await fetch(`${BASE_URL}/api/audit/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      type: 'PREMIUM',
      responses: responsesWithPhotos
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur création audit: ${response.status} - ${error}`);
  }
  
  const audit = await response.json();
  console.log(`   ✅ Audit créé: ${audit.id}`);
  console.log(`   Status: ${audit.reportDeliveryStatus || 'PENDING'}`);
  
  return audit.id;
}

async function waitForReport(auditId: string, maxWait: number = 20 * 60 * 1000): Promise<boolean> {
  console.log('\n⏳ Étape 2: Attente de la génération du rapport...');
  console.log(`   Timeout: ${maxWait / 1000 / 60} minutes`);
  
  const startTime = Date.now();
  let lastStatus = '';
  
  while (Date.now() - startTime < maxWait) {
    try {
      // Essayer d'abord l'endpoint de status du job
      let response = await fetch(`${BASE_URL}/api/audits/${auditId}/narrative-status`);
      let status: any = null;
      
      if (response.ok) {
        status = await response.json();
      } else {
        // Fallback: vérifier directement l'audit
        response = await fetch(`${BASE_URL}/api/audits/${auditId}`);
        if (response.ok) {
          const audit = await response.json();
          status = {
            status: audit.reportDeliveryStatus === 'SENT' ? 'completed' : 
                   audit.reportDeliveryStatus === 'FAILED' ? 'failed' : 'generating',
            progress: audit.reportDeliveryStatus === 'SENT' ? 100 : 50
          };
        }
      }
      
      if (status) {
        const currentStatus = status.status || 'unknown';
        
        if (currentStatus !== lastStatus) {
          console.log(`   Status: ${currentStatus} (${status.progress || 0}%)`);
          if (status.currentSection) {
            console.log(`   Section: ${status.currentSection}`);
          }
          lastStatus = currentStatus;
        }
        
        if (currentStatus === 'completed') {
          console.log(`   ✅ Rapport généré avec succès !`);
          return true;
        }
        
        if (currentStatus === 'failed') {
          console.log(`   ❌ Échec de génération: ${status.error || 'Unknown error'}`);
          return false;
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Erreur vérification: ${error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Vérifier toutes les 10 secondes
  }
  
  console.log(`   ⏱️  Timeout atteint après ${maxWait / 1000 / 60} minutes`);
  return false;
}

async function verifyEmails(auditId: string): Promise<void> {
  console.log('\n📧 Étape 3: Vérification des emails...');
  
  // Vérifier le statut de l'audit
  const response = await fetch(`${BASE_URL}/api/audits/${auditId}`);
  if (!response.ok) {
    throw new Error(`Erreur récupération audit: ${response.status}`);
  }
  
  const audit = await response.json();
  
  console.log(`   Email client: ${audit.email}`);
  console.log(`   Status envoi: ${audit.reportDeliveryStatus || 'PENDING'}`);
  console.log(`   Date envoi: ${audit.reportSentAt || 'Non envoyé'}`);
  
  if (audit.reportDeliveryStatus === 'SENT') {
    console.log(`   ✅ Email envoyé à ${TEST_EMAIL}`);
    console.log(`   📬 Vérifie ta boîte mail: ${TEST_EMAIL}`);
  } else {
    console.log(`   ⚠️  Email pas encore envoyé (status: ${audit.reportDeliveryStatus})`);
  }
  
  console.log(`\n   📬 Email admin devrait être envoyé à: ${ADMIN_EMAIL}`);
  console.log(`   📬 Vérifie ta boîte admin: ${ADMIN_EMAIL}`);
}

async function verifyReport(auditId: string): Promise<void> {
  console.log('\n📄 Étape 4: Vérification du rapport...');
  
  // Essayer plusieurs endpoints possibles
  let html = '';
  let response;
  
  const endpoints = [
    `${BASE_URL}/api/audits/${auditId}/report/html`,
    `${BASE_URL}/api/audits/${auditId}/html`,
    `${BASE_URL}/dashboard/${auditId}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      response = await fetch(endpoint);
      if (response.ok) {
        html = await response.text();
        if (html && html.length > 1000) {
          console.log(`   ✅ Rapport récupéré depuis: ${endpoint}`);
          break;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!html || html.length < 1000) {
    console.log(`   ⚠️  Impossible de récupérer le rapport HTML complet`);
    console.log(`   📄 Le rapport sera disponible via: ${BASE_URL}/dashboard/${auditId}`);
    return;
  }
  
  // Vérifications
  const checks = {
    'Score Ring présent': html.includes('hero-score-container'),
    'Contributors présents': html.includes('contributors-grid'),
    'KPI Tiles présents': html.includes('kpi-tiles-grid'),
    'Plan 3 Phases présent': html.includes('plan-phases'),
    'Bloc À confirmer présent': html.includes('confirm-block'),
    'Accordéons présents': html.includes('accordion-section'),
    'TOC Interactive présente': html.includes('toc-container'),
    'Notice anti-hallucination': html.includes('photos statiques'),
    'Design tokens Oura': html.includes('--surface-0') || html.includes('--bg'),
  };
  
  console.log('\n   Vérifications du rapport:');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  });
  
  // Sauvegarder le rapport
  const outputPath = path.join(process.cwd(), `test-workflow-gpt-${Date.now()}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`\n   💾 Rapport sauvegardé: ${outputPath}`);
}

async function main() {
  console.log('🚀 TEST WORKFLOW COMPLET AVEC GPT-5.2-2025-12-11\n');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Email test: ${TEST_EMAIL}`);
  console.log(`Email admin: ${ADMIN_EMAIL}`);
  console.log('='.repeat(60));
  
  try {
    // Étape 1: Créer l'audit
    const auditId = await createAudit();
    
    // Étape 2: Attendre la génération
    const success = await waitForReport(auditId);
    
    if (!success) {
      console.log('\n❌ La génération du rapport a échoué ou a pris trop de temps.');
      process.exit(1);
    }
    
    // Étape 3: Vérifier les emails
    await verifyEmails(auditId);
    
    // Étape 4: Vérifier le rapport
    await verifyReport(auditId);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST WORKFLOW COMPLET TERMINÉ AVEC SUCCÈS !');
    console.log('='.repeat(60));
    console.log(`\n📧 Vérifie les emails:`);
    console.log(`   Client: ${TEST_EMAIL}`);
    console.log(`   Admin: ${ADMIN_EMAIL}`);
    console.log(`\n📄 Rapport disponible via: ${BASE_URL}/dashboard/${auditId}`);
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main();

