import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const URLS = [
  'https://www.yamamotonutrition.com/int/blog/post/ashwagandha-a-valuable-ally-against-stress-a1952',
  'https://www.yamamotonutrition.com/int/blog/post/beta-alanine-a-supplement-to-support-resistance-a1982',
  'https://www.yamamotonutrition.com/int/blog/post/creatine-the-queen-of-performance-supplements-a1768',
  'https://www.yamamotonutrition.com/int/blog/post/cycling-nutrition-a1978',
  'https://www.yamamotonutrition.com/int/blog/post/dehydration-and-mineral-salts-role-and-functions-a1938',
  'https://www.yamamotonutrition.com/int/blog/post/guarana-properties-benefits-and-curiosities-a987',
  'https://www.yamamotonutrition.com/int/blog/post/how-to-deal-with-psychophysical-work-and-emotional-stress-a1793',
  'https://www.yamamotonutrition.com/int/blog/post/the-diseases-of-well-being-a1975',
  'https://www.yamamotonutrition.com/int/blog/post/the-secret-of-youthfulness-for-quality-ageing-a1977',
  'https://www.yamamotonutrition.com/int/blog/post/wada-the-world-anti-doping-agency-actions-and-directives-a1976'
];

async function scrapeArticle(browser, url, index) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  console.log(`\n📄 [${index + 1}/10] Scraping: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.single-post__content', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const article = await page.evaluate(() => {
      const contentElement = document.querySelector('.single-post__content');
      if (!contentElement) {
        return { error: 'Content not found' };
      }

      // Titre
      const titleEl = document.querySelector('h1');
      const title = titleEl ? titleEl.textContent.trim() : '';

      // Auteur
      const authorEl = document.querySelector('.post-author a, .author-name');
      const author = authorEl ? authorEl.textContent.trim() : '';

      // Date
      const dateEl = document.querySelector('.post-date, time');
      const date = dateEl ? dateEl.textContent.trim() : '';

      // Catégorie
      const categoryEl = document.querySelector('.post-category, [class*="category"]');
      const category = categoryEl ? categoryEl.textContent.trim() : '';

      // Contenu COMPLET
      const fullContent = contentElement.innerText;

      // Slug depuis l'URL
      const slug = window.location.pathname.split('/').pop().replace('a\\d+$', '');

      return {
        title,
        author,
        date,
        category,
        fullContent,
        contentLength: fullContent.length,
        url: window.location.href,
        slug
      };
    });

    await page.close();

    if (article.error) {
      console.log(`❌ Error: ${article.error}`);
      return null;
    }

    console.log(`✅ Scraped: ${article.title}`);
    console.log(`   Length: ${article.contentLength} chars`);
    console.log(`   Author: ${article.author}`);

    return article;

  } catch (error) {
    console.error(`❌ Failed to scrape: ${error.message}`);
    await page.close();
    return null;
  }
}

async function scrapeAll() {
  console.log('🚀 Starting scrape of 10 articles...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const articles = [];

  for (let i = 0; i < URLS.length; i++) {
    const article = await scrapeArticle(browser, URLS[i], i);
    if (article) {
      articles.push(article);
    }
  }

  await browser.close();

  console.log(`\n\n📊 SUMMARY:`);
  console.log(`✅ Successfully scraped: ${articles.length}/10 articles`);
  console.log(`\nTotal content: ${articles.reduce((sum, a) => sum + a.contentLength, 0)} characters`);

  // Sauvegarder
  writeFileSync('yamamoto-10-articles-FULL-EN.json', JSON.stringify(articles, null, 2));
  console.log(`\n💾 Saved to: yamamoto-10-articles-FULL-EN.json`);

  // Afficher le résumé
  console.log(`\n📋 ARTICLES:`);
  articles.forEach((a, i) => {
    console.log(`${i + 1}. ${a.title} (${a.contentLength} chars)`);
  });
}

scrapeAll().catch(console.error);
