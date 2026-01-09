import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

interface BlogArticle {
  title: string;
  url: string;
  category: string;
  author: string;
  excerpt: string;
  imageUrl?: string;
}

async function scrapeYamamotoBlog() {
  console.log('🚀 Lancement du scraper Yamamoto Blog...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const allArticles: BlogArticle[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(`📄 Scraping page ${currentPage}...`);

    const url = currentPage === 1
      ? 'https://www.yamamotonutrition.com/int/blog/'
      : `https://www.yamamotonutrition.com/int/blog/page/${currentPage}/`;

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extraire les articles de la page
      const articles = await page.evaluate(() => {
        const articleElements = document.querySelectorAll('.post-block');
        const results: BlogArticle[] = [];

        articleElements.forEach((article) => {
          const titleEl = article.querySelector('.post-title a');
          const linkEl = article.querySelector('.post-title a');
          const categoryEl = article.querySelector('.post-category-label');
          const authorEl = article.querySelector('.post-author a');
          const excerptEl = article.querySelector('.post-data-short-description');
          const imageEl = article.querySelector('img');

          if (titleEl && linkEl) {
            const url = (linkEl as HTMLAnchorElement).href;
            // Ne garder que les liens vers des articles (pas les catégories)
            if (url.includes('/blog/post/')) {
              results.push({
                title: titleEl.textContent?.trim() || '',
                url: url,
                category: categoryEl?.textContent?.trim() || 'Uncategorized',
                author: authorEl?.textContent?.trim() || 'Staff Yamamoto',
                excerpt: excerptEl?.textContent?.trim() || '',
                imageUrl: (imageEl as HTMLImageElement)?.src || undefined
              });
            }
          }
        });

        return results;
      });

      if (articles.length === 0) {
        hasMorePages = false;
        break;
      }

      allArticles.push(...articles);
      console.log(`✅ Trouvé ${articles.length} articles sur la page ${currentPage}`);

      // Vérifier s'il y a une page suivante
      const hasNext = await page.evaluate(() => {
        const nextButton = document.querySelector('.next, .pagination .next, a[rel="next"]');
        return nextButton !== null;
      });

      if (!hasNext) {
        hasMorePages = false;
      } else {
        currentPage++;
      }

      // Délai pour ne pas surcharger le serveur
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Erreur sur la page ${currentPage}:`, error);
      hasMorePages = false;
    }
  }

  await browser.close();

  // Déduplication par URL
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.url, article])).values()
  );

  // Sauvegarder les résultats
  writeFileSync(
    '/Users/achzod/Desktop/neurocore/yamamoto-articles.json',
    JSON.stringify(uniqueArticles, null, 2)
  );

  console.log(`\n✅ Scraping terminé!`);
  console.log(`📊 Total: ${uniqueArticles.length} articles uniques trouvés (${allArticles.length - uniqueArticles.length} doublons supprimés)`);
  console.log(`💾 Sauvegardé dans yamamoto-articles.json`);

  return uniqueArticles;
}

// Lancer le scraper
scrapeYamamotoBlog().catch(console.error);
