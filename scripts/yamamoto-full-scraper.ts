import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

interface BlogArticle {
  title: string;
  url: string;
  category: string;
  author: string;
  excerpt: string;
  imageUrl?: string;
  fullContent?: string;
}

const CATEGORIES = [
  'https://www.yamamotonutrition.com/int/blog/category/bodybuilding',
  'https://www.yamamotonutrition.com/int/blog/category/sport',
  'https://www.yamamotonutrition.com/int/blog/category/active-ingredients',
  'https://www.yamamotonutrition.com/int/blog/category/health',
  'https://www.yamamotonutrition.com/int/blog/category/nutrition',
  'https://www.yamamotonutrition.com/int/blog/category/training',
  'https://www.yamamotonutrition.com/int/blog/category/endurance',
  'https://www.yamamotonutrition.com/int/blog/category/wellness',
  'https://www.yamamotonutrition.com/int/blog/category/video-workout',
  'https://www.yamamotonutrition.com/int/blog/category/coaching',
  'https://www.yamamotonutrition.com/int/blog/category/yamamoto-collection',
  'https://www.yamamotonutrition.com/int/blog/category/yamamoto-news'
];

async function scrapeCategoryArticles(page: any, categoryUrl: string): Promise<BlogArticle[]> {
  const articles: BlogArticle[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const pageUrl = currentPage === 1 ? categoryUrl : `${categoryUrl}?p=${currentPage}`;

    try {
      console.log(`  📄 Scraping ${pageUrl}...`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const pageArticles = await page.evaluate(() => {
        const articleElements = document.querySelectorAll('.post-block, .post-list-item, article');
        const results: BlogArticle[] = [];

        articleElements.forEach((article: any) => {
          const titleEl = article.querySelector('.post-title a, h2 a, h3 a');
          const linkEl = article.querySelector('.post-title a, h2 a, h3 a');
          const categoryEl = article.querySelector('.post-category-label, .category');
          const authorEl = article.querySelector('.post-author a, .author');
          const excerptEl = article.querySelector('.post-data-short-description, .excerpt, .post-excerpt');
          const imageEl = article.querySelector('img');

          if (titleEl && linkEl) {
            const url = (linkEl as HTMLAnchorElement).href;
            if (url.includes('/blog/post/')) {
              results.push({
                title: titleEl.textContent?.trim() || '',
                url: url,
                category: categoryEl?.textContent?.trim() || 'Uncategorized',
                author: authorEl?.textContent?.trim() || 'Staff Yamamoto',
                excerpt: excerptEl?.textContent?.trim().substring(0, 300) || '',
                imageUrl: (imageEl as HTMLImageElement)?.src || undefined
              });
            }
          }
        });

        return results;
      });

      if (pageArticles.length === 0) {
        hasMore = false;
      } else {
        articles.push(...pageArticles);
        console.log(`    ✅ Trouvé ${pageArticles.length} articles`);
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`    ❌ Erreur:`, error);
      hasMore = false;
    }
  }

  return articles;
}

async function scrapeFullBlog() {
  console.log('🚀 Lancement du scraping complet Yamamoto Blog...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const allArticles: BlogArticle[] = [];

  // 1. Scraper la page principale
  console.log('📂 Scraping page principale...');
  const mainArticles = await scrapeCategoryArticles(page, 'https://www.yamamotonutrition.com/int/blog/');
  allArticles.push(...mainArticles);

  // 2. Scraper chaque catégorie
  for (const categoryUrl of CATEGORIES) {
    console.log(`\n📂 Scraping catégorie: ${categoryUrl.split('/').pop()}...`);
    const categoryArticles = await scrapeCategoryArticles(page, categoryUrl);
    allArticles.push(...categoryArticles);
  }

  await browser.close();

  // Déduplication
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.url, article])).values()
  );

  // Sauvegarder
  writeFileSync(
    '/Users/achzod/Desktop/neurocore/yamamoto-all-articles.json',
    JSON.stringify(uniqueArticles, null, 2)
  );

  console.log(`\n✅ Scraping terminé!`);
  console.log(`📊 Total: ${uniqueArticles.length} articles uniques`);
  console.log(`💾 Sauvegardé dans yamamoto-all-articles.json`);

  return uniqueArticles;
}

scrapeFullBlog().catch(console.error);
