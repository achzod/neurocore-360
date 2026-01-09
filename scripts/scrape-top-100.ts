import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import pLimit from 'p-limit';

interface Article {
  title: string;
  url: string;
  category: string;
  author: string;
  excerpt: string;
  imageUrl?: string;
  content: string;
}

const limit = pLimit(3); // 3 articles en parallèle

async function scrapeArticleContent(url: string, browser: any): Promise<string> {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const content = await page.evaluate(() => {
      // Chercher le contenu principal
      const selectors = [
        '.post-content',
        '.entry-content',
        'article .content',
        '.blog-post-content',
        '[class*="post-view"]',
        '[class*="post-full"]'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('script, style, .ad, .advertisement, .share, .social').forEach(e => e.remove());
          return clone.innerText.trim();
        }
      }

      // Fallback
      const paragraphs = Array.from(document.querySelectorAll('article p, .post p, [class*="post"] p'));
      return paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
    });

    await page.close();
    return content;

  } catch (error) {
    console.error(`    ❌ Erreur ${url}`);
    await page.close();
    return '';
  }
}

async function scrapeTop100() {
  console.log('🎯 Scraping top 100 articles Yamamoto...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const articles: Article[] = [];
  let currentPage = 1;

  // Scraper jusqu'à avoir 100 articles
  while (articles.length < 100) {
    const url = currentPage === 1
      ? 'https://www.yamamotonutrition.com/int/blog/'
      : `https://www.yamamotonutrition.com/int/blog/?p=${currentPage}`;

    console.log(`📄 Page ${currentPage}...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const pageArticles = await page.evaluate(() => {
        const articleElements = document.querySelectorAll('.post-block');
        const results: any[] = [];

        articleElements.forEach((article: any) => {
          const titleEl = article.querySelector('.post-title a');
          const linkEl = article.querySelector('.post-title a');
          const categoryEl = article.querySelector('.post-category-label');
          const authorEl = article.querySelector('.post-author a');
          const excerptEl = article.querySelector('.post-data-short-description');
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
                imageUrl: (imageEl as HTMLImageElement)?.src || undefined,
                content: '' // Sera rempli après
              });
            }
          }
        });

        return results;
      });

      if (pageArticles.length === 0) break;

      articles.push(...pageArticles);
      console.log(`  ✅ ${pageArticles.length} articles (total: ${articles.length})`);

      currentPage++;
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ❌ Erreur page ${currentPage}`);
      break;
    }
  }

  // Limiter à 100
  const top100 = articles.slice(0, 100);
  console.log(`\n📚 ${top100.length} articles à scraper en détail\n`);

  // Scraper le contenu complet en parallèle
  const promises = top100.map((article, index) =>
    limit(async () => {
      console.log(`[${index + 1}/100] ${article.title}`);
      article.content = await scrapeArticleContent(article.url, browser);
      console.log(`  ✅ ${article.content.length} chars`);
      return article;
    })
  );

  const fullArticles = await Promise.all(promises);

  await browser.close();

  // Sauvegarder
  writeFileSync(
    '/Users/achzod/Desktop/neurocore/yamamoto-top100.json',
    JSON.stringify(fullArticles, null, 2)
  );

  console.log(`\n✅ Top 100 articles scrapés!`);
  console.log(`💾 Sauvegardé dans yamamoto-top100.json`);

  return fullArticles;
}

scrapeTop100().catch(console.error);
