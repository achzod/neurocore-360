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

async function traceCortisol() {
  const pdf = await import('pdf-parse/lib/pdf-parse.js');

  const dataBuffer = fs.readFileSync('data/Résultats prise de sang 23 Décembre 2025.pdf');
  const pdfData = await pdf.default(dataBuffer);
  const text = pdfData.text;

  // Manually trace through the extraction logic for cortisol
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const cortisolLine = lines.findIndex(l => /cortisol/i.test(l));
  console.log('=== CORTISOL EXTRACTION TRACE ===');
  console.log(`Found cortisol at line index: ${cortisolLine}`);
  console.log(`Line content: "${lines[cortisolLine]}"`);

  // Check next lines
  for (let offset = 1; offset <= 4; offset++) {
    const nextLine = lines[cortisolLine + offset];
    console.log(`\n[offset=${offset}] "${nextLine}"`);

    // Check skip conditions
    const SKIP_LINE_REGEX = /(objectif|recommand|valeur|référence|reference|score|esc|risque|guide|interpret|evaluation|page|\bhas\b)/i;
    const DATE_LINE_REGEX = /^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/;
    const RANGE_LINE_REGEX = /\d+(?:[.,]\d+)?\s*(?:à|a|–|-)\s*\d+(?:[.,]\d+)?/i;

    console.log(`  SKIP_LINE_REGEX: ${SKIP_LINE_REGEX.test(nextLine)}`);
    console.log(`  DATE_LINE_REGEX: ${DATE_LINE_REGEX.test(nextLine)}`);
    console.log(`  RANGE_LINE_REGEX: ${RANGE_LINE_REGEX.test(nextLine)}`);

    // Try to extract number
    const matches = [...nextLine.matchAll(/[<>]?\s*\d+(?:[.,]\d+)?/g)];
    console.log(`  Number matches: ${matches.length}`);
    matches.forEach((m, i) => {
      console.log(`    Match ${i}: "${m[0]}" at index ${m.index}`);
    });
  }

  // Now test normalization
  console.log('\n=== NORMALIZATION TEST ===');
  const module = await import('./server/blood-analysis/index.js');
  // @ts-ignore
  const normalizeMarkerValue = module.normalizeMarkerValue || ((id: string, val: number, unit?: string) => {
    // Manual test
    if (id === "cortisol" && unit === "nmol/L") {
      return val / 27.59;
    }
    return val;
  });

  const normalized = 70 / 27.59;
  console.log(`70 nmol/L cortisol normalized to: ${normalized} µg/dL`);
  console.log(`Plausible bounds: { min: 1, max: 600 }`);
  console.log(`Is plausible: ${normalized >= 1 && normalized <= 600}`);
}

traceCortisol();
