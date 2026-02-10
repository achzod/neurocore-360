import fs from 'fs';

async function debugTestosterone() {
  const pdf = await import('pdf-parse/lib/pdf-parse.js');
  const dataBuffer = fs.readFileSync('data/Résultats prise de sang 23 Décembre 2025.pdf');
  const pdfData = await pdf.default(dataBuffer);
  const text = pdfData.text;
  const lines = text.split('\n');

  console.log('=== TESTOSTERONE LINE 192 ===');
  const line192 = lines[192];
  console.log('Raw line:', JSON.stringify(line192));
  console.log('Char codes:', [...line192].map((c, i) => `[${i}]='${c}' (${c.charCodeAt(0)})`).join(' '));

  // Test number extraction
  const matches = [...line192.matchAll(/[<>]?\s*\d+(?:[.,]\d+)?/g)];
  console.log('\n=== REGEX MATCHES ===');
  matches.forEach((match, i) => {
    console.log(`Match ${i}:`, match[0], 'at index', match.index);
  });

  // Test with the extractNumberFromSnippet logic
  console.log('\n=== EXTRACTION TEST ===');
  for (const match of matches) {
    const raw = match[0].replace(/[<>]/g, "").replace(",", ".").trim();
    const value = Number(raw);
    console.log(`Raw: "${match[0]}" -> "${raw}" -> value: ${value}`);
  }
}

debugTestosterone();
