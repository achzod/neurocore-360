
const fs = require('fs');
const path = require('path');

const files = [
  'client/src/data/musclephdArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/yamamotoArticles.ts',
  'client/src/data/sarmsArticles.ts',
  'client/src/data/peptidesArticles.ts',
  'client/src/data/blogArticles.ts',
  'client/src/data/articles_31_32_33_complets.ts',
  'client/src/data/articles_7_8_9_new.ts'
];

const forbiddenKeywords = [
  'MusclePhD', 'TheMusclePhD', 'Ultrahuman', 'Yamamoto', 'Cyborg', 'Ring AIR', 
  'traduit', 'translation', 'source:', 'original article', 'originally published',
  'http://', 'https://themusclephd.com', 'https://blog.ultrahuman.com', 'https://yamamotonutrition.com'
];

const report = {
  totalArticles: 0,
  issues: []
};

files.forEach(filePath => {
  const fullPath = path.resolve('/Users/achzod/Desktop/neurocore', filePath);
  if (!fs.existsSync(fullPath)) return;
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Use a more robust split to catch all articles
  const blocks = content.split(/\n\s*{\s*id:/);
  
  blocks.forEach((block, idx) => {
    if (idx === 0 && !block.includes('id:')) return;
    
    report.totalArticles++;
    const articleIdMatch = block.match(/["']([^"']+)["']/);
    const id = articleIdMatch ? articleIdMatch[1] : `unknown-${idx}`;
    
    // Skip categories
    if (['all', 'musculation', 'sarms', 'peptides', 'supplements', 'hormones', 'sommeil', 'stress', 'nutrition', 'performance', 'metabolisme', 'longevite', 'biohacking', 'femmes'].includes(id)) {
      report.totalArticles--;
      return;
    }

    const titleMatch = block.match(/title:\s*[`"']([^`"']+)[`"']/);
    const contentMatch = block.match(/content:\s*`([\s\S]*?)`/);
    const excerptMatch = block.match(/excerpt:\s*[`"']([^`"']+)[`"']/);
    const authorMatch = block.match(/author:\s*[`"']([^`"']+)[`"']/);
    const imageMatch = block.match(/image:\s*[`"']([^`"']+)[`"']/);
    const slugMatch = block.match(/slug:\s*[`"']([^`"']+)[`"']/);

    const title = titleMatch ? titleMatch[1] : '';
    const body = contentMatch ? contentMatch[1] : '';
    const excerpt = excerptMatch ? excerptMatch[1] : '';
    const author = authorMatch ? authorMatch[1] : '';
    const image = imageMatch ? imageMatch[1] : '';
    const slug = slugMatch ? slugMatch[1] : '';

    const articleIssues = [];

    // 1. Structure Check
    if (!body.trim().startsWith('# ')) articleIssues.push('Manque H1 (doit commencer par #)');
    if (!body.includes('## ')) articleIssues.push('Manque H2 (structure SEO faible)');
    
    // 2. Branding & Translation artifacts
    forbiddenKeywords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (title.match(regex) || body.match(regex) || excerpt.match(regex)) {
        articleIssues.push(`Keyword interdit détecté: "${word}"`);
      }
    });

    // 3. Language check (English leaks)
    const engWords = [' the ', ' and ', ' with ', ' from ', ' study ', ' research '];
    let engCount = 0;
    engWords.forEach(w => {
      if (body.toLowerCase().includes(w)) engCount++;
    });
    if (engCount >= 4) articleIssues.push('Anglais suspect détecté');

    // 4. CTA Check
    if (!body.includes('Anabolic Code') && !body.includes('achzodcoaching.com')) {
      articleIssues.push('CTA Anabolic Code manquant');
    }

    // 5. Author Check
    if (author !== 'ACHZOD') articleIssues.push(`Auteur incorrect: "${author}"`);

    // 6. Image Check
    if (image && !image.includes('unsplash.com') && !image.includes('achzodcoaching.com') && !image.startsWith('/')) {
      articleIssues.push(`Source image externe suspecte: ${image}`);
    }

    // 7. Length Check
    if (body.length < 1500) articleIssues.push(`Contenu trop court (${body.length} chars)`);

    // 8. Slug Check
    if (slug.includes('ACHZOD') || slug.includes('ultrahuman') || slug.includes('musclephd')) {
      articleIssues.push(`Slug malpropre: ${slug}`);
    }

    if (articleIssues.length > 0) {
      report.issues.push({ id, title, file: filePath, issues: articleIssues });
    }
  });
});

console.log(JSON.stringify(report, null, 2));
