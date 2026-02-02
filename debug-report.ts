import { chromium } from 'playwright';

async function debugReport() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  console.log('📄 Navigating...');
  await page.goto('http://localhost:5000/analysis/d472258c-35a4-4385-ac92-70137d4dad9d?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  console.log('⏳ Waiting 5s for React to render...');
  await page.waitForTimeout(5000);

  console.log('📸 Taking screenshot of what loaded...');
  await page.screenshot({ path: '/tmp/debug-report.png', fullPage: true });

  console.log('🔍 Getting page title and body text...');
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();

  console.log(`Title: ${title}`);
  console.log(`Body text (first 500 chars):\n${bodyText.substring(0, 500)}`);

  // Check root element
  const rootHTML = await page.locator('#root').innerHTML().catch(() => 'NOT_FOUND');
  console.log(`\n#root innerHTML (first 500 chars):\n${rootHTML.substring(0, 500)}`);

  await browser.close();
}

debugReport().catch(console.error);
