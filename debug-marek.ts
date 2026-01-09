import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debugMarekHealth() {
  console.log('Launching browser for debugging...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = 'https://marekhealth.com/blog/';
    console.log(`\nNavigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Take screenshot
    await page.screenshot({ path: '/Users/achzod/Desktop/neurocore/scraped-data/marek-debug.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Get page HTML
    const html = await page.content();
    fs.writeFileSync('/Users/achzod/Desktop/neurocore/scraped-data/marek-debug.html', html);
    console.log('HTML saved');
    
    // Extract and log useful info
    const info = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a')).map((a: any) => a.href);
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        linkCount: allLinks.length,
        sampleLinks: allLinks.slice(0, 10),
        h1Count: document.querySelectorAll('h1').length,
        h2Count: document.querySelectorAll('h2').length,
        articleCount: document.querySelectorAll('article').length,
      };
    });
    
    console.log('\n=== PAGE INFO ===');
    console.log(`Title: ${info.title}`);
    console.log(`URL: ${info.url}`);
    console.log(`Links: ${info.linkCount}`);
    console.log(`H1 tags: ${info.h1Count}`);
    console.log(`H2 tags: ${info.h2Count}`);
    console.log(`Article tags: ${info.articleCount}`);
    console.log(`\nFirst 500 chars:\n${info.bodyText}`);
    console.log(`\nSample links:`);
    info.sampleLinks.forEach((link: string) => console.log(`  - ${link}`));
    
  } finally {
    await browser.close();
  }
}

debugMarekHealth().catch(console.error);
