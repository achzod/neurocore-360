
const fs = require('fs');
const path = require('path');

const files = [
  { name: 'blogArticles.ts', path: 'client/src/data/blogArticles.ts', isOriginal: true },
  { name: 'musclephdArticles.ts', path: 'client/src/data/musclephdArticles.ts' },
  { name: 'ultrahumanArticles.ts', path: 'client/src/data/ultrahumanArticles.ts' },
  { name: 'sarmsArticles.ts', path: 'client/src/data/sarmsArticles.ts' },
  { name: 'peptidesArticles.ts', path: 'client/src/data/peptidesArticles.ts' },
  { name: 'yamamotoArticles.json', path: 'client/src/data/yamamotoArticles.json' }
];

const CLICHES_IA = [
  'en conclusion', 'il est important de noter', 'il convient de souligner',
  'dans cet article', 'nous avons vu', 'comme mentionné précédemment',
  'en résumé', 'pour conclure', 'pour résumer'
];

const FORBIDDEN_BRANDS = [
  'themusclephd', 'musclephd', 'the muscle phd', 'ultrahuman', 'yamamoto', 'ring air'
];

function getField(block, fieldName) {
  const fieldIndex = block.indexOf(fieldName + ':');
  if (fieldIndex === -1) return '';
  const afterField = block.substring(fieldIndex + fieldName.length + 1).trim();
  const quoteChar = afterField[0];
  if (quoteChar === "'" || quoteChar === '"' || quoteChar === "`") {
    let value = '';
    for (let i = 1; i < afterField.length; i++) {
      if (afterField[i] === quoteChar && afterField[i-1] !== '\\') break;
      value += afterField[i];
    }
    return value;
  }
  const commaIndex = afterField.indexOf(',');
  const braceIndex = afterField.indexOf('}');
  const endIndex = (commaIndex !== -1 && (braceIndex === -1 || commaIndex < braceIndex)) ? commaIndex : braceIndex;
  return afterField.substring(0, endIndex).trim();
}

console.log('--- DÉBUT DE L\'AUDIT DÉTAILLÉ ---\n');

files.forEach(fileInfo => {
  if (!fs.existsSync(fileInfo.path)) return;
  console.log(`\n📄 FICHIER : ${fileInfo.name.toUpperCase()}`);
  
  let content = fs.readFileSync(fileInfo.path, 'utf-8');
  let articles = [];

  if (fileInfo.path.endsWith('.json')) {
    articles = JSON.parse(content);
  } else {
    const articleRegex = /\{\s*id:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = articleRegex.exec(content)) !== null) {
      const id = match[1];
      const startIdx = match.index;
      let braceCount = 1;
      let endIdx = -1;
      for (let i = startIdx + 1; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
      if (endIdx !== -1) {
        const block = content.substring(startIdx, endIdx);
        articles.push({
          id,
          title: getField(block, 'title'),
          readTime: getField(block, 'readTime'),
          author: getField(block, 'author'),
          image: getField(block, 'image'),
          content: getField(block, 'content')
        });
      }
    }
  }

  articles.forEach((a, index) => {
    if (a.id.length < 3 || (!a.id.includes('-') && isNaN(a.id))) return;

    let status = '✅ OK';
    const issues = [];

    const lowerContent = (a.content || '').toLowerCase();
    const lowerTitle = (a.title || '').toLowerCase();
    const lowerExcerpt = (a.excerpt || '').toLowerCase();
    
    const foundBrands = FORBIDDEN_BRANDS.filter(b => lowerContent.includes(b) || lowerTitle.includes(b) || lowerExcerpt.includes(b));
    if (foundBrands.length > 0) issues.push('REBRANDING (' + foundBrands.join(', ') + ')');
    
    const hasCTA = lowerContent.includes('achzodcoaching.com') || lowerContent.includes('anabolic code');
    if (!hasCTA && !fileInfo.isOriginal) issues.push('SANS CTA');
    
    const cliches = CLICHES_IA.filter(p => lowerContent.includes(p.toLowerCase()));
    if (cliches.length >= 2) issues.push('STYLE IA (' + cliches.slice(0, 2).join(', ') + ')');
    
    if (!a.author || !a.author.toUpperCase().includes('ACHZOD')) issues.push('AUTEUR (' + (a.author || 'VIDE') + ')');

    if (!a.image || a.image.length < 10) issues.push('VIGNETTE');
    else if (a.image.includes('themusclephd.com') || a.image.includes('website-files.com')) issues.push('HOTLINK');

    if (issues.length > 0) status = '❌ ' + issues.join(', ');

    console.log(`${(index + 1).toString().padStart(3)}. [${a.id}] ${a.title.substring(0, 50).padEnd(50)} | ${status}`);
  });
});
