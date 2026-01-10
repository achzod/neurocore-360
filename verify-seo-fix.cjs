
const fs = require('fs');

const files = ['client/src/data/musclephdArticles.ts', 'client/src/data/ultrahumanArticles.ts'];
const targets = ['mph-5', 'uh-4', 'uh-13', 'uh-17', 'uh-22', 'mph-32', 'mph-39', 'mph-65', 'uh-3', 'uh-21'];

console.log('--- VERIFICATION SEO ---');

files.forEach(path => {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf-8');
  targets.forEach(id => {
    const regex = new RegExp('id:\\s*["\']' + id + '["\'][\\s\\S]*?content:\\s*[`"\']([\\s\\S]*?)[`"\']');
    const match = content.match(regex);
    if (match) {
      const articleContent = match[1];
      const hasH1 = articleContent.trim().startsWith('# ');
      const h2Count = (articleContent.match(/## /g) || []).length;
      
      console.log(`[${id}] H1: ${hasH1 ? 'OK' : 'MANQUANT'}, H2: ${h2Count} sections found.`);
    }
  });
});
