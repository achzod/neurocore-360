import puppeteer from 'puppeteer';

async function checkPredatorArticle(slug) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const url = `https://www.predatornutrition.com/articlesdetail?cid=${slug}`;
  console.log(`\n🔍 Checking: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const article = await page.evaluate(() => {
      const titleEl = document.querySelector('h1, .article-title, [class*="title"]');
      const title = titleEl ? titleEl.textContent.trim() : 'NOT FOUND';

      const contentEl = document.querySelector('article, .article-content, .content, main');
      const firstParagraph = contentEl ? contentEl.innerText.substring(0, 500) : 'NOT FOUND';

      return { title, firstParagraph };
    });

    console.log(`📝 Title: ${article.title}`);
    console.log(`📄 First 200 chars: ${article.firstParagraph.substring(0, 200)}...`);

    await browser.close();
    return article;

  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    await browser.close();
    return null;
  }
}

// Test avec quelques slugs probables
const slugs = [
  'ostarine-mk-2866',
  'rad-140',
  'lgd-4033',
  'cardarine-gw501516',
  'mk-677',
  'sarms-guide'
];

for (const slug of slugs) {
  await checkPredatorArticle(slug);
}
