import { readFileSync, writeFileSync } from 'fs';

interface TranslatedArticle {
  title: string;
  titleFr: string;
  url: string;
  category: string;
  categoryFr: string;
  author: string;
  excerpt: string;
  excerptFr: string;
  contentFr: string;
  imageUrl?: string;
  slug: string;
  metaDescr: string;
  keywords: string[];
}

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  featured?: boolean;
}

// Mapping catégories Yamamoto -> Neurocore
const CATEGORY_MAPPING: Record<string, string> = {
  'bodybuilding': 'musculation',
  'active ingredients': 'supplements',
  'health': 'longevite',
  'sport': 'performance',
  'endurance': 'performance',
  'nutrition': 'nutrition',
  'training': 'musculation',
  'wellness': 'biohacking',
  'supplements': 'supplements'
};

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min`;
}

function transformToNeurocore(articles: TranslatedArticle[]): BlogArticle[] {
  return articles.map((article, index) => {
    const category = CATEGORY_MAPPING[article.categoryFr?.toLowerCase()] || 'supplements';
    const readTime = estimateReadTime(article.contentFr);

    // Générer un ID unique basé sur le slug
    const id = `yamamoto-${index + 1}`;

    // Date d'aujourd'hui
    const date = new Date().toISOString().split('T')[0];

    return {
      id,
      slug: article.slug,
      title: article.titleFr,
      excerpt: article.excerptFr || article.metaDescr,
      content: article.contentFr,
      category,
      author: 'ACHZOD', // Toujours ACHZOD
      date,
      readTime,
      image: article.imageUrl || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop',
      featured: false
    };
  });
}

async function addToBlog() {
  console.log('📝 Ajout des articles au blog Neurocore...\n');

  // Charger les articles traduits
  const translatedRaw = readFileSync('/Users/achzod/Desktop/neurocore/yamamoto-translated.json', 'utf8');
  const translated: TranslatedArticle[] = JSON.parse(translatedRaw);

  console.log(`📚 ${translated.length} articles à ajouter\n`);

  // Transformer au format Neurocore
  const neurocoreArticles = transformToNeurocore(translated);

  // Lire le fichier blogArticles.ts actuel
  const blogFilePath = '/Users/achzod/Desktop/neurocore/client/src/data/blogArticles.ts';
  let blogFileContent = readFileSync(blogFilePath, 'utf8');

  // Trouver la fin du tableau BLOG_ARTICLES
  const insertMarker = 'export const BLOG_ARTICLES: BlogArticle[] = [';
  const markerIndex = blogFileContent.indexOf(insertMarker);

  if (markerIndex === -1) {
    console.error('❌ Impossible de trouver BLOG_ARTICLES dans le fichier');
    return;
  }

  // Générer le code TypeScript pour les nouveaux articles
  const articlesCode = neurocoreArticles.map(article => {
    const content = article.content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    return `  {
    id: "${article.id}",
    slug: "${article.slug}",
    title: "${article.title.replace(/"/g, '\\"')}",
    excerpt: "${article.excerpt.replace(/"/g, '\\"')}",
    category: "${article.category}",
    author: "${article.author}",
    date: "${article.date}",
    readTime: "${article.readTime}",
    image: "${article.image}",
    featured: ${article.featured},
    content: \`${content}\`
  }`;
  }).join(',\n');

  // Trouver où insérer (après le marker, avant les premiers articles existants)
  const afterMarker = blogFileContent.indexOf('[', markerIndex) + 1;

  // Insérer les nouveaux articles
  const before = blogFileContent.substring(0, afterMarker);
  const after = blogFileContent.substring(afterMarker);

  const newContent = `${before}\n  // ============================================================================\n  // ARTICLES YAMAMOTO NUTRITION (traduits par ACHZOD)\n  // ============================================================================\n${articlesCode},\n${after}`;

  // Sauvegarder
  writeFileSync(blogFilePath, newContent, 'utf8');

  console.log(`✅ ${neurocoreArticles.length} articles ajoutés au blog!`);
  console.log(`📍 Fichier mis à jour: ${blogFilePath}`);
  console.log(`\n🚀 Rebuild l'app pour voir les articles sur https://neurocore-360.onrender.com/blog`);
}

addToBlog().catch(console.error);
