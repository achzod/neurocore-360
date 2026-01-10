
const fs = require('fs');

const files = [
  'client/src/data/musclephdArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/blogArticles.ts',
  'client/src/data/sarmsArticles.ts',
  'client/src/data/peptidesArticles.ts'
];

let issues = [];
let total = 0;

files.forEach(path => {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf-8');
  
  // Match objects in the array
  const articleRegex = /\{\s*id:\s*["']([^"']+)["'][\s\S]*?content:\s*`([\s\S]*?)`/g;
  let match;
  
  while ((match = articleRegex.exec(content)) !== null) {
    total++;
    const id = match[1];
    const text = match[2];
    
    const hasH1 = text.trim().startsWith('# ');
    const h2Count = (text.match(/## /g) || []).length;
    
    if (!hasH1 || h2Count < 1) {
      issues.push({ id, hasH1, h2Count });
    }
  }
});

console.log(`--- SEO AUDIT FINAL ---`);
console.log(`Articles audités : ${total}`);
console.log(`Articles avec problèmes : ${issues.length}`);
issues.forEach(iss => {
  console.log(`[${iss.id}] H1: ${iss.hasH1 ? 'OK' : 'MANQUANT'}, H2: ${iss.h2Count} sections.`);
});
