import fs from 'fs';

// Load .env
const envPath = '.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const { db } = await import('./server/db.js');
const { bloodTests } = await import('./shared/drizzle-schema.js');
const { eq } = await import('drizzle-orm');

const testId = '7e59bc99-ca77-4930-a031-07c27362d6e0';

const [test] = await db.select().from(bloodTests).where(eq(bloodTests.id, testId)).limit(1);

if (!test) {
  console.error('Test not found');
  process.exit(1);
}

const analysis = test.analysis as any;
const report = analysis?.aiReport || '';

console.log('=== SECTIONS DU RAPPORT ===');
console.log('Longueur totale:', report.length, 'chars');
console.log('');

// Chercher toutes les sections ##
const sections = report.match(/^##\s+.+$/gm) || [];
console.log('Sections trouvées:', sections.length);
sections.forEach(s => console.log('  -', s));

console.log('');
console.log('=== PLAN 90J ===');
const plan90 = report.match(/## Plan.*90.*?(?=##|$)/s);
if (plan90) {
  console.log('Longueur:', plan90[0].length, 'chars');
  console.log('Preview:', plan90[0].substring(0, 500));
} else {
  console.log('❌ SECTION PLAN 90J NON TROUVÉE');
}

console.log('');
console.log('=== PROTOCOLES/SUPPLEMENTS ===');
const protocoles = report.match(/## (Protocoles|Supplements|Supplementation).*?(?=##|$)/si);
if (protocoles) {
  console.log('Longueur:', protocoles[0].length, 'chars');
  console.log('Preview:', protocoles[0].substring(0, 500));
} else {
  console.log('❌ SECTION PROTOCOLES NON TROUVÉE');
}

console.log('');
console.log('=== SOURCES/ANNEXES ===');
const sources = report.match(/## (Sources|References|Annexes).*$/si);
if (sources) {
  console.log('Longueur:', sources[0].length, 'chars');
  console.log('Preview:', sources[0].substring(0, 500));
} else {
  console.log('❌ SECTION SOURCES NON TROUVÉE');
}

console.log('');
console.log('=== INTRODUCTION/STORYTELLING ===');
const intro = report.substring(0, 2000);
if (intro.includes('histoire') || intro.includes('parcours') || intro.includes('découverte')) {
  console.log('✅ Introduction narrative trouvée');
} else {
  console.log('❌ PAS DE STORYTELLING');
}
console.log('Début du rapport:', intro.substring(0, 400));

process.exit(0);
