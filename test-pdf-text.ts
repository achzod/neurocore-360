import fs from 'fs';

async function analyzePdf() {
  const pdf = await import('pdf-parse/lib/pdf-parse.js');
  const dataBuffer = fs.readFileSync('data/Résultats prise de sang 23 Décembre 2025.pdf');
  const pdfData = await pdf.default(dataBuffer);
  const text = pdfData.text;

  const lines = text.split('\n');

  // Find LDL sections with context (3 lines before and after)
  console.log('=== LDL SECTIONS (with context) ===');
  lines.forEach((line, i) => {
    if (/cholest.*l\.?d\.?l/i.test(line)) {
      console.log(`\n[${i}] ${line}`);
      if (i + 1 < lines.length) console.log(`[${i+1}] ${lines[i+1]}`);
      if (i + 2 < lines.length) console.log(`[${i+2}] ${lines[i+2]}`);
    }
  });

  console.log('\n=== CORTISOL SECTIONS (with context) ===');
  lines.forEach((line, i) => {
    if (/cortisol/i.test(line)) {
      console.log(`\n[${i}] ${line}`);
      if (i + 1 < lines.length) console.log(`[${i+1}] ${lines[i+1]}`);
      if (i + 2 < lines.length) console.log(`[${i+2}] ${lines[i+2]}`);
      if (i + 3 < lines.length) console.log(`[${i+3}] ${lines[i+3]}`);
      if (i + 4 < lines.length) console.log(`[${i+4}] ${lines[i+4]}`);
    }
  });

  console.log('\n=== TESTOSTERONE SECTIONS (with context) ===');
  lines.forEach((line, i) => {
    if (/testost/i.test(line)) {
      console.log(`\n[${i}] ${line}`);
      if (i + 1 < lines.length) console.log(`[${i+1}] ${lines[i+1]}`);
      if (i + 2 < lines.length) console.log(`[${i+2}] ${lines[i+2]}`);
    }
  });
}

analyzePdf();
