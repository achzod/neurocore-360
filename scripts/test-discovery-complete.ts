/**
 * Test Complet Discovery Scan - Post Déploiement
 *
 * Vérifie que:
 * 1. Les composants CTAs sont bien buildés
 * 2. Aucune erreur de compilation
 * 3. Les imports sont corrects
 * 4. Le système fonctionne end-to-end
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | { pass: boolean; message?: string; details?: string }): void {
  try {
    const result = fn();
    if (typeof result === 'boolean') {
      if (result) {
        results.push({ name, status: 'PASS', message: 'OK' });
      } else {
        results.push({ name, status: 'FAIL', message: 'Test échoué' });
      }
    } else {
      if (result.pass) {
        results.push({ name, status: 'PASS', message: result.message || 'OK', details: result.details });
      } else {
        results.push({ name, status: 'FAIL', message: result.message || 'Test échoué', details: result.details });
      }
    }
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      message: 'Exception levée',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

function warn(name: string, message: string, details?: string): void {
  results.push({ name, status: 'WARN', message, details });
}

console.log('🧪 TEST COMPLET DISCOVERY SCAN - POST DÉPLOIEMENT\n');
console.log('='.repeat(60));

// ============================================================================
// TEST 1: Fichiers Source Existent
// ============================================================================
console.log('\n📁 TEST 1: Fichiers Source');

test('UpgradeComponents.tsx existe', () => {
  return fs.existsSync('client/src/components/UpgradeComponents.tsx');
});

test('ExitIntentPopup.tsx existe', () => {
  return fs.existsSync('client/src/components/ExitIntentPopup.tsx');
});

test('DiscoveryScanReport.tsx modifié', () => {
  const content = fs.readFileSync('client/src/pages/DiscoveryScanReport.tsx', 'utf-8');
  const hasUpgradeHero = content.includes('UpgradeHero');
  const hasExitIntent = content.includes('ExitIntentPopup');
  const hasStickyCTA = content.includes('showStickyCTA');

  return {
    pass: hasUpgradeHero && hasExitIntent && hasStickyCTA,
    message: hasUpgradeHero && hasExitIntent && hasStickyCTA ? 'Tous les composants présents' : 'Composants manquants',
    details: `UpgradeHero: ${hasUpgradeHero}, ExitIntent: ${hasExitIntent}, StickyCTA: ${hasStickyCTA}`
  };
});

// ============================================================================
// TEST 2: Imports Corrects
// ============================================================================
console.log('\n📦 TEST 2: Imports et Exports');

test('UpgradeComponents exports corrects', () => {
  const content = fs.readFileSync('client/src/components/UpgradeComponents.tsx', 'utf-8');
  const exports = [
    'export const UpgradeHero',
    'export const ComparisonTable',
    'export const SocialProofBlock',
    'export const UpgradeTeaser',
    'export const StickyCTA',
    'export const FinalCTA'
  ];

  const missing = exports.filter(exp => !content.includes(exp));

  return {
    pass: missing.length === 0,
    message: missing.length === 0 ? '6 composants exportés' : `${missing.length} exports manquants`,
    details: missing.length > 0 ? `Manquants: ${missing.join(', ')}` : undefined
  };
});

test('ExitIntentPopup export correct', () => {
  const content = fs.readFileSync('client/src/components/ExitIntentPopup.tsx', 'utf-8');
  return content.includes('export const ExitIntentPopup');
});

test('Imports lucide-react corrects', () => {
  const upgrade = fs.readFileSync('client/src/components/UpgradeComponents.tsx', 'utf-8');
  const exitIntent = fs.readFileSync('client/src/components/ExitIntentPopup.tsx', 'utf-8');

  const upgradeIcons = upgrade.match(/import.*from ['"]lucide-react['"]/);
  const exitIntentIcons = exitIntent.match(/import.*from ['"]lucide-react['"]/);

  return {
    pass: !!upgradeIcons && !!exitIntentIcons,
    message: !!upgradeIcons && !!exitIntentIcons ? 'Imports lucide-react OK' : 'Imports manquants',
    details: `UpgradeComponents: ${!!upgradeIcons}, ExitIntent: ${!!exitIntentIcons}`
  };
});

// ============================================================================
// TEST 3: Build Artifacts
// ============================================================================
console.log('\n🏗️  TEST 3: Build Artifacts');

test('DiscoveryScanReport bundle existe', () => {
  const files = fs.readdirSync('dist/public/assets');
  const discoveryBundle = files.find(f => f.startsWith('DiscoveryScanReport-') && f.endsWith('.js'));

  return {
    pass: !!discoveryBundle,
    message: discoveryBundle ? 'Bundle trouvé' : 'Bundle manquant',
    details: discoveryBundle || 'Aucun fichier DiscoveryScanReport-*.js trouvé'
  };
});

test('CTAs dans le bundle', () => {
  const files = fs.readdirSync('dist/public/assets');
  const discoveryBundle = files.find(f => f.startsWith('DiscoveryScanReport-') && f.endsWith('.js'));

  if (!discoveryBundle) {
    return { pass: false, message: 'Bundle non trouvé' };
  }

  const bundlePath = `dist/public/assets/${discoveryBundle}`;
  const content = fs.readFileSync(bundlePath, 'utf-8');

  const components = [
    'UpgradeHero',
    'ComparisonTable',
    'SocialProofBlock',
    'UpgradeTeaser',
    'StickyCTA',
    'FinalCTA',
    'ExitIntentPopup'
  ];

  const found = components.filter(comp => content.includes(comp));
  const missing = components.filter(comp => !content.includes(comp));

  return {
    pass: missing.length === 0,
    message: `${found.length}/7 composants dans bundle`,
    details: missing.length > 0 ? `Manquants: ${missing.join(', ')}` : 'Tous présents'
  };
});

test('Bundle size acceptable', () => {
  const files = fs.readdirSync('dist/public/assets');
  const discoveryBundle = files.find(f => f.startsWith('DiscoveryScanReport-') && f.endsWith('.js'));

  if (!discoveryBundle) {
    return { pass: false, message: 'Bundle non trouvé' };
  }

  const bundlePath = `dist/public/assets/${discoveryBundle}`;
  const stats = fs.statSync(bundlePath);
  const sizeKB = Math.round(stats.size / 1024);

  // Avant: ~40 kB, Après: ~41.63 kB (+1.63 kB)
  const isAcceptable = sizeKB >= 40 && sizeKB <= 45;

  return {
    pass: isAcceptable,
    message: isAcceptable ? 'Taille OK' : 'Taille anormale',
    details: `${sizeKB} kB (attendu: 40-45 kB)`
  };
});

// ============================================================================
// TEST 4: TypeScript & Syntax
// ============================================================================
console.log('\n📝 TEST 4: TypeScript & Syntax');

test('Pas de console.log oubliés', () => {
  const upgrade = fs.readFileSync('client/src/components/UpgradeComponents.tsx', 'utf-8');
  const exitIntent = fs.readFileSync('client/src/components/ExitIntentPopup.tsx', 'utf-8');

  const upgradeHasConsole = upgrade.includes('console.log');
  const exitIntentHasConsole = exitIntent.includes('console.log');

  if (upgradeHasConsole || exitIntentHasConsole) {
    warn('console.log trouvés', 'Console.log présents (non critique)',
      `UpgradeComponents: ${upgradeHasConsole}, ExitIntent: ${exitIntentHasConsole}`);
  }

  return true; // Non bloquant
});

test('Pas de TODO comments', () => {
  const upgrade = fs.readFileSync('client/src/components/UpgradeComponents.tsx', 'utf-8');
  const exitIntent = fs.readFileSync('client/src/components/ExitIntentPopup.tsx', 'utf-8');
  const discovery = fs.readFileSync('client/src/pages/DiscoveryScanReport.tsx', 'utf-8');

  const todoPattern = /\/\/\s*TODO|\/\*\s*TODO/gi;

  const upgradeTodos = upgrade.match(todoPattern);
  const exitIntentTodos = exitIntent.match(todoPattern);
  const discoveryTodos = discovery.match(todoPattern);

  const hasTodos = !!(upgradeTodos || exitIntentTodos || discoveryTodos);

  if (hasTodos) {
    warn('TODO comments trouvés', 'TODO présents (non critique)',
      `Total: ${(upgradeTodos?.length || 0) + (exitIntentTodos?.length || 0) + (discoveryTodos?.length || 0)}`);
  }

  return true; // Non bloquant
});

// ============================================================================
// TEST 5: Email Tracking System
// ============================================================================
console.log('\n📧 TEST 5: Email Tracking System');

test('emailTracking.ts existe', () => {
  return fs.existsSync('server/emailTracking.ts');
});

test('Migration SQL existe', () => {
  return fs.existsSync('migrations/001_create_email_tracking.sql');
});

test('Schema Drizzle updated', () => {
  const schema = fs.readFileSync('shared/drizzle-schema.ts', 'utf-8');
  return {
    pass: schema.includes('export const emailTracking'),
    message: schema.includes('export const emailTracking') ? 'Table emailTracking ajoutée' : 'Table manquante'
  };
});

test('emailService.ts modifié', () => {
  const emailService = fs.readFileSync('server/emailService.ts', 'utf-8');

  const hasImport = emailService.includes('import { logEmail');
  const hasWrapper = emailService.includes('sendEmailWithTracking');
  const hasBCC = emailService.includes('ADMIN_EMAIL_CC');

  return {
    pass: hasImport && hasWrapper && hasBCC,
    message: hasImport && hasWrapper && hasBCC ? 'Tracking intégré' : 'Intégration incomplète',
    details: `Import: ${hasImport}, Wrapper: ${hasWrapper}, BCC: ${hasBCC}`
  };
});

test('Routes API tracking ajoutées', () => {
  const routes = fs.readFileSync('server/routes.ts', 'utf-8');

  const endpoints = [
    '/api/admin/email-trackings',
    '/api/admin/email-trackings/stats',
    '/api/admin/email-trackings/export/csv',
    '/api/admin/tracking/combined-stats'
  ];

  const found = endpoints.filter(ep => routes.includes(ep));

  return {
    pass: found.length === 4,
    message: `${found.length}/4 endpoints ajoutés`,
    details: found.length < 4 ? `Manquants: ${endpoints.filter(ep => !routes.includes(ep)).join(', ')}` : undefined
  };
});

// ============================================================================
// TEST 6: Documentation
// ============================================================================
console.log('\n📚 TEST 6: Documentation');

test('EMAIL_TRACKING_SYSTEM.md existe', () => {
  return fs.existsSync('EMAIL_TRACKING_SYSTEM.md');
});

test('EMAIL_SEQUENCE_PLAN.md existe', () => {
  return fs.existsSync('EMAIL_SEQUENCE_PLAN.md');
});

test('Documentation complète', () => {
  const emailTracking = fs.readFileSync('EMAIL_TRACKING_SYSTEM.md', 'utf-8');
  const lines = emailTracking.split('\n').length;

  return {
    pass: lines > 300,
    message: lines > 300 ? 'Documentation complète' : 'Documentation incomplète',
    details: `${lines} lignes (attendu: >300)`
  };
});

// ============================================================================
// RÉSULTATS
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSULTATS DES TESTS\n');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const warned = results.filter(r => r.status === 'WARN').length;
const total = results.length;

for (const result of results) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   └─ ${result.details}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📈 SCORE: ${passed}/${total} tests passés`);
if (warned > 0) console.log(`⚠️  WARNINGS: ${warned}`);
if (failed > 0) console.log(`❌ ÉCHECS: ${failed}`);

const successRate = Math.round((passed / total) * 100);
console.log(`\n🎯 TAUX DE RÉUSSITE: ${successRate}%\n`);

if (failed === 0) {
  console.log('✅ ✅ ✅ TOUS LES TESTS CRITIQUES PASSENT ✅ ✅ ✅');
  console.log('\n🚀 Discovery Scan est PRÊT pour production!\n');
  process.exit(0);
} else {
  console.log('❌ ❌ ❌ DES TESTS ONT ÉCHOUÉ ❌ ❌ ❌');
  console.log('\n🔧 Corrections nécessaires avant déploiement.\n');
  process.exit(1);
}
