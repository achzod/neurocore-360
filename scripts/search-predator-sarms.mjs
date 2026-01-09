import puppeteer from 'puppeteer';

async function searchPredatorArticles(searchTerms) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  // Get ALL supplement articles
  const url = 'https://www.predatornutrition.com/showarticles?fid=supplements';
  console.log(`🔍 Searching Predator Nutrition for: ${searchTerms.join(', ')}\n`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const articles = await page.evaluate((terms) => {
    const links = Array.from(document.querySelectorAll('a[href*="articlesdetail"]'));
    return links.map(a => ({
      title: a.textContent.trim(),
      url: a.href
    })).filter(a => {
      const lowerTitle = a.title.toLowerCase();
      return terms.some(term => lowerTitle.includes(term.toLowerCase())) && a.title.length > 5;
    });
  }, searchTerms);

  await browser.close();

  console.log(`Found ${articles.length} matching articles:\n`);
  articles.forEach((a, i) => {
    console.log(`${i + 1}. ${a.title}`);
    console.log(`   ${a.url}\n`);
  });

  return articles;
}

// Search for missing SARMs articles
await searchPredatorArticles(['lgd', 'ligandrol', 'andarine', 's4', 'yk-11', 'yk11', 'sr9009', 'stenabolic']);
