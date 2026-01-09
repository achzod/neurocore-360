import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function inspectPage() {
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

  // Extraire le HTML complet
  const html = await page.content();

  // Sauvegarder pour inspection
  writeFileSync('/Users/achzod/Desktop/neurocore/yamamoto-page.html', html);

  // Extraire aussi la structure des classes
  const structure = await page.evaluate(() => {
    const body = document.body;
    const allElements = body.querySelectorAll('*');
    const classNames = new Set<string>();

    allElements.forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(c => {
          if (c.includes('post') || c.includes('blog') || c.includes('article')) {
            classNames.add(c);
          }
        });
      }
    });

    return Array.from(classNames);
  });

  console.log('Classes trouvées avec "post", "blog", ou "article":', structure);

  await browser.close();
}

inspectPage().catch(console.error);
