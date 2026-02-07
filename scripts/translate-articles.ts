import { readFileSync, writeFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Article {
  title: string;
  url: string;
  category: string;
  author: string;
  excerpt: string;
  imageUrl?: string;
  content?: string;
}

interface TranslatedArticle extends Article {
  titleFr: string;
  excerptFr: string;
  contentFr: string;
  categoryFr: string;
  slug: string;
  metaDescr: string;
  keywords: string[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function translateArticle(article: Article): Promise<TranslatedArticle> {
  // Vérifier si c'est un article sponsor Yamamoto à skip
  if (
    article.title.toLowerCase().includes('yamamoto') ||
    article.category.toLowerCase().includes('yamamoto-collection') ||
    article.category.toLowerCase().includes('yamamoto-news')
  ) {
    console.log(`  ⏭️  Skip article sponsor: ${article.title}`);
    return null as any;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Tu es un expert en traduction FR et en SEO. Traduis cet article de blog nutrition/sport en français de qualité, optimisé SEO.

ARTICLE ORIGINAL:
Titre: ${article.title}
Catégorie: ${article.category}
Extrait: ${article.excerpt}
Contenu: ${article.content || article.excerpt}

CONSIGNES:
1. Titre FR: Traduis le titre en français, optimisé SEO (60 chars max)
2. Extrait FR: Traduis l'extrait en français engageant (155 chars max pour meta)
3. Contenu FR: Traduis le contenu complet en français de qualité, ton pro mais accessible
4. Catégorie FR: Traduis la catégorie
5. Slug: Génère un slug URL-friendly (ex: "ashwagandha-allie-contre-stress")
6. Meta description: Crée une meta description SEO de 150-155 chars
7. Keywords: 5-8 mots-clés SEO pertinents en français

IMPORTANT:
- Auteur: TOUJOURS "Achzod"
- Garde le ton scientifique mais accessible
- Utilise des termes fitness/nutrition français courants
- Optimise pour le SEO français

Réponds UNIQUEMENT en JSON:
{
  "titleFr": "...",
  "excerptFr": "...",
  "contentFr": "...",
  "categoryFr": "...",
  "slug": "...",
  "metaDescription": "...",
  "keywords": ["...", "..."]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extraire le JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('  ❌ Pas de JSON trouvé dans la réponse');
      return null as any;
    }

    const translated = JSON.parse(jsonMatch[0]);

    return {
      ...article,
      titleFr: translated.titleFr,
      excerptFr: translated.excerptFr,
      contentFr: translated.contentFr,
      categoryFr: translated.categoryFr,
      slug: translated.slug,
      metaDescr: translated.metaDescription,
      keywords: translated.keywords,
      author: 'Achzod' // TOUJOURS Achzod comme auteur
    };
  } catch (error) {
    console.error(`  ❌ Erreur traduction "${article.title}":`, error);
    return null as any;
  }
}

async function translateAll() {
  console.log('🌍 Démarrage de la traduction...\n');

  // Charger les 10 articles uniques
  const articlesRaw = readFileSync('/Users/achzod/Desktop/neurocore/yamamoto-10-unique.json', 'utf8');
  const articles: Article[] = JSON.parse(articlesRaw);

  console.log(`📚 ${articles.length} articles à traduire\n`);

  const translated: TranslatedArticle[] = [];
  let skipped = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[${i + 1}/${articles.length}] ${article.title}`);

    const result = await translateArticle(article);

    if (result) {
      translated.push(result);
      console.log(`  ✅ Traduit: ${result.titleFr}`);
    } else {
      skipped++;
    }

    // Délai pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sauvegarder
  writeFileSync(
    '/Users/achzod/Desktop/neurocore/yamamoto-translated.json',
    JSON.stringify(translated, null, 2)
  );

  console.log(`\n✅ Traduction terminée!`);
  console.log(`📊 ${translated.length} articles traduits`);
  console.log(`⏭️  ${skipped} articles skippés (sponsors Yamamoto)`);
  console.log(`💾 Sauvegardé dans yamamoto-translated.json`);
}

translateAll().catch(console.error);
