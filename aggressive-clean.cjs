
const fs = require('fs');
const path = require('path');

const files = [
  'client/src/data/musclephdArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/yamamotoArticles.ts',
  'client/src/data/sarmsArticles.ts',
  'client/src/data/peptidesArticles.ts',
  'client/src/data/blogArticles.ts'
];

function clean(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove lines starting with // that contain suspicious keywords
  const lines = content.split('\n');
  const cleanedLines = lines.filter(line => {
    const lower = line.toLowerCase();
    if (line.trim().startsWith('//')) {
      if (lower.includes('traduit') || lower.includes('source') || lower.includes('translated') || lower.includes('content') || lower.includes('original')) {
        return false;
      }
    }
    return true;
  });
  
  let newContent = cleanedLines.join('\n');
  
  // Also search inside strings (content, excerpt)
  newContent = newContent.replace(/Traduit par ACHZOD/gi, '');
  newContent = newContent.replace(/Source: [^`"'\n]*/gi, '');
  newContent = newContent.replace(/100% translated content/gi, '');
  
  fs.writeFileSync(filePath, newContent);
  console.log(`Cleaned ${filePath}`);
}

files.forEach(clean);
