import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function scrapeArticleFull(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  console.log(`📄 Scraping: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Attendre que le contenu soit chargé
  await page.waitForSelector('.single-post__content', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const article = await page.evaluate(() => {
    // Le contenu principal
    const contentElement = document.querySelector('.single-post__content');

    if (!contentElement) {
      return { error: 'Content element not found' };
    }

    // Extraire le titre
    const titleEl = document.querySelector('.single-post__content h1, h1');
    const title = titleEl ? titleEl.textContent.trim() : '';

    // Extraire l'auteur
    const authorEl = document.querySelector('.post-author a, .author-name');
    const author = authorEl ? authorEl.textContent.trim() : '';

    // Extraire la date
    const dateEl = document.querySelector('.post-date, time');
    const date = dateEl ? dateEl.textContent.trim() : '';

    // Extraire le contenu COMPLET - innerText pour avoir le texte formaté
    const fullContent = contentElement.innerText;

    // Extraire aussi le HTML pour voir la structure
    const htmlContent = contentElement.innerHTML;

    return {
      title,
      author,
      date,
      fullContent,
      htmlContent,
      contentLength: fullContent.length
    };
  });

  await browser.close();

  return article;
}

// Article 1: Ashwagandha
const url = 'https://www.yamamotonutrition.com/int/blog/post/ashwagandha-a-valuable-ally-against-stress-a1952';

try {
  const article = await scrapeArticleFull(url);

  if (article.error) {
    console.error('❌ Error:', article.error);
    process.exit(1);
  }

  console.log('\n📊 STATS:');
  console.log(`Title: ${article.title}`);
  console.log(`Author: ${article.author}`);
  console.log(`Date: ${article.date}`);
  console.log(`Content length: ${article.contentLength} characters`);
  console.log(`\n📝 FIRST 500 CHARS:\n${article.fullContent.substring(0, 500)}...`);

  // Sauvegarder
  writeFileSync('yamamoto-ashwagandha-FULL.json', JSON.stringify(article, null, 2));
  console.log('\n✅ Saved to yamamoto-ashwagandha-FULL.json');

} catch (error) {
  console.error('❌ Scraping failed:', error.message);
  process.exit(1);
}
