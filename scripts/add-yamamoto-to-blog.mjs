import { readFileSync, writeFileSync } from 'fs';

// Charger les articles traduits
const articles = JSON.parse(readFileSync('yamamoto-all-10-final.json', 'utf8'));

// Générer le code TS
const newArticles = articles.map(a => {
  const content = a.content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `  {
    id: "${a.id}",
    slug: "${a.slug}",
    title: "${a.title.replace(/"/g, '\\"')}",
    excerpt: "${a.excerpt.replace(/"/g, '\\"')}",
    category: "${a.category}",
    author: "${a.author}",
    date: "${a.date}",
    readTime: "${a.readTime}",
    image: "${a.image}",
    featured: ${a.featured},
    content: \`${content}\`
  }`;
}).join(',\n');

// Lire le fichier actuel
const blogFilePath = 'client/src/data/blogArticles.ts';
let content = readFileSync(blogFilePath, 'utf8');

// Trouver où insérer (après "export const BLOG_ARTICLES: BlogArticle[] = [")
const marker = 'export const BLOG_ARTICLES: BlogArticle[] = [';
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
  console.error('❌ Marker not found');
  process.exit(1);
}

const insertPoint = content.indexOf('[', markerIndex) + 1;

// Construire le nouveau contenu
const before = content.substring(0, insertPoint);
const after = content.substring(insertPoint);

const newContent = `${before}
  // ============================================================================
  // YAMAMOTO NUTRITION - Articles traduits par ACHZOD
  // ============================================================================
${newArticles},
${after}`;

// Sauvegarder
writeFileSync(blogFilePath, newContent, 'utf8');

console.log('✅ 10 articles Yamamoto ajoutés au blog!');
console.log('📍', blogFilePath);
