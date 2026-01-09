import puppeteer from 'puppeteer';

async function debugArticleStructure() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  await page.goto('https://www.yamamotonutrition.com/int/blog/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Extraire le HTML d'un seul post-block
  const firstPostHTML = await page.evaluate(() => {
    const firstPost = document.querySelector('.post-block');
    if (!firstPost) return 'Aucun post-block trouvé';

    // Extraire tous les liens dans le post-block
    const links = Array.from(firstPost.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.textContent?.trim(),
      class: a.className
    }));

    return {
      html: firstPost.outerHTML,
      links,
      innerHTML: firstPost.innerHTML
    };
  });

  console.log('Premier article:', JSON.stringify(firstPostHTML, null, 2));

  await browser.close();
}

debugArticleStructure().catch(console.error);
