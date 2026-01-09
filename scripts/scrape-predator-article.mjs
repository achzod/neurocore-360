import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function scrapePredatorArticle(cid) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const url = `https://www.predatornutrition.com/articlesdetail?cid=${cid}`;
  console.log(`\n🔍 Scraping: ${url}\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const article = await page.evaluate(() => {
      // Titre
      const titleEl = document.querySelector('h1');
      const title = titleEl ? titleEl.textContent.trim() : '';

      // Contenu complet - chercher le conteneur principal de l'article
      const contentSelectors = [
        '.article-content',
        '.article-body',
        'article',
        '.content-wrapper',
        'main',
        '.page-content'
      ];

      let contentEl = null;
      for (const sel of contentSelectors) {
        contentEl = document.querySelector(sel);
        if (contentEl && contentEl.innerText.length > 1000) break;
      }

      const content = contentEl ? contentEl.innerText : document.body.innerText;

      return {
        title,
        content,
        contentLength: content.length,
        url: window.location.href
      };
    });

    await browser.close();

    console.log(`📝 Title: ${article.title}`);
    console.log(`📄 Content length: ${article.contentLength} chars`);
    console.log(`\n📖 First 500 chars:\n${article.content.substring(0, 500)}...`);

    return article;

  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    await browser.close();
    return null;
  }
}

// Scrape Ostarine article
const cid = process.argv[2] || 'mk-2866-ostarine-side-effects-benefits-review';
const article = await scrapePredatorArticle(cid);

if (article) {
  writeFileSync(`scraped-data/predator-${cid}.json`, JSON.stringify(article, null, 2));
  console.log(`\n💾 Saved to scraped-data/predator-${cid}.json`);
}
