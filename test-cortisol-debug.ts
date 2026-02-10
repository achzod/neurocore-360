import fs from 'fs';

// Load env
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function debugCortisol() {
  const pdf = await import('pdf-parse/lib/pdf-parse.js');
  const { extractMarkersFromPdfText } = await import('./server/blood-analysis/index.js');

  const dataBuffer = fs.readFileSync('data/Résultats prise de sang 23 Décembre 2025.pdf');
  const pdfData = await pdf.default(dataBuffer);
  const text = pdfData.text;
  const lines = text.split('\n');

  console.log('=== CORTISOL SECTION IN PDF ===');
  console.log('[172]', lines[172]);
  console.log('[173]', lines[173]);
  console.log('[174]', lines[174]);
  console.log('[175]', lines[175]);
  console.log('[176]', lines[176]);

  // Check if pattern matches
  const cortisolPatterns = [/cortisol/i];
  console.log('\n=== PATTERN MATCHING ===');
  cortisolPatterns.forEach((pattern, i) => {
    console.log(`Pattern ${i}: ${pattern}`);
    console.log(`  Matches line 172: ${pattern.test(lines[172])}`);
  });

  // Run full extraction
  console.log('\n=== FULL EXTRACTION ===');
  const markers = await extractMarkersFromPdfText(text, 'test.pdf');
  const cortisol = markers.find(m => m.markerId === 'cortisol');
  console.log('Cortisol marker:', cortisol ? cortisol : 'NOT FOUND');

  console.log('\n=== ALL EXTRACTED MARKERS ===');
  markers.forEach(m => console.log(`  ${m.markerId}: ${m.value}`));
}

debugCortisol();
