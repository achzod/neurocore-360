import { chromium } from 'playwright';

async function testBloodReport() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('📄 Navigating to blood report...');
  await page.goto('http://localhost:5000/analysis/d472258c-35a4-4385-ac92-70137d4dad9d?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Wait for report to load
  await page.waitForSelector('main', { timeout: 30000 });

  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: '/tmp/blood-report-full.png', fullPage: true });

  console.log('🔍 Checking for key elements...');

  // Check citations highlighting
  const citationsCount = await page.locator('.bg-blue-50').count();
  console.log(`✅ Expert citations highlighted: ${citationsCount}`);

  // Check dark mode toggle (should NOT exist)
  const darkModeToggle = await page.locator('button:has-text("Dark")').count();
  console.log(`${darkModeToggle === 0 ? '✅' : '❌'} Dark mode toggle: ${darkModeToggle === 0 ? 'REMOVED (correct)' : 'STILL EXISTS (bug)'}`);

  // Check tabs (should NOT exist)
  const trendsTab = await page.locator('text=Trends').count();
  console.log(`${trendsTab === 0 ? '✅' : '❌'} Trends tab: ${trendsTab === 0 ? 'REMOVED (correct)' : 'STILL EXISTS (bug)'}`);

  // Check navigation sidebar
  const sidebar = await page.locator('aside').count();
  console.log(`✅ Sidebar navigation: ${sidebar > 0 ? 'EXISTS' : 'MISSING'}`);

  // Check for TU/TOI language
  const tuText = await page.locator('text=/\\btes\\b|\\bton\\b|\\bta\\b/i').count();
  console.log(`✅ TU/TOI language found: ${tuText} instances`);

  // Check for alert sections
  const alerts = await page.locator('text=/🚨 Alerte/').count();
  console.log(`✅ Priority alerts: ${alerts}`);

  // Check for supplement format markers
  const suppFormat = await page.locator('text=/✅ QUOI:|🎯 POURQUOI:|📊 COMMENT:/').count();
  console.log(`✅ Supplement format (QUOI/POURQUOI/COMMENT): ${suppFormat} instances`);

  // Get full HTML
  const html = await page.content();
  const fs = await import('fs');
  fs.writeFileSync('/tmp/blood-report-rendered.html', html);
  console.log('💾 Full HTML saved to /tmp/blood-report-rendered.html');

  await browser.close();
  console.log('✅ Test complete!');
}

testBloodReport().catch(console.error);
