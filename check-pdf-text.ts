import pdf from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';

const pdfPath = './data/Résultats prise de sang 23 Décembre 2025.pdf';
const dataBuffer = fs.readFileSync(pdfPath);
const pdfData = await (pdf as any)(dataBuffer);
const text = pdfData.text;

console.log('=== RECHERCHE INSULINE ===');
const insulinLines = text.split('\n').filter(l => /insuline/i.test(l));
insulinLines.forEach(l => console.log(l));

console.log('\n=== RECHERCHE HOMA ===');
const homaLines = text.split('\n').filter(l => /homa/i.test(l));
homaLines.forEach(l => console.log(l));

console.log('\n=== RECHERCHE CORTISOL ===');
const cortisolLines = text.split('\n').filter(l => /cortisol/i.test(l));
cortisolLines.forEach(l => console.log(l));

console.log('\n=== RECHERCHE VITAMINE D ===');
const vitDLines = text.split('\n').filter(l => /vitamine.*d|25.*oh|cholécalciférol/i.test(l));
vitDLines.forEach(l => console.log(l));

console.log('\n=== TEXT COMPLET (premiers 3000 chars) ===');
console.log(text.substring(0, 3000));
