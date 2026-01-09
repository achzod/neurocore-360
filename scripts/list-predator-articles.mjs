import puppeteer from 'puppeteer';

async function listPredatorArticles() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const url = 'https://www.predatornutrition.com/showarticles?fid=supplements';
  console.log(`🔍 Listing articles from: ${url}\n`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const articles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="articlesdetail"]'));
      return links.map(a => ({
        title: a.textContent.trim(),
        url: a.href
      })).filter(a => a.title.length > 5);
    });

    console.log(`Found ${articles.length} articles:\n`);
    articles.forEach((a, i) => {
      console.log(`${i + 1}. ${a.title}`);
      console.log(`   ${a.url}\n`);
    });

    await browser.close();
    return articles;

  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    await browser.close();
    return [];
  }
}

await listPredatorArticles();
