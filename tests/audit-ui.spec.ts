import { test } from '@playwright/test';

const REPORT_URL = 'http://localhost:5000/analysis/d472258c-35a4-4385-ac92-70137d4dad9d?key=Badboy007';

test('audit complet UI', async ({ page }) => {
  await page.goto(REPORT_URL);
  await page.waitForLoadState('networkidle');

  // Screenshot full page
  await page.screenshot({ path: '/tmp/screenshots/01-full-page.png', fullPage: true });

  // Cliquer sur chaque onglet et screenshot
  const tabs = ['overview', 'insights', 'protocol', 'trends'];
  const tabNames = ['Vue d\'ensemble', 'Insights', 'Protocole', 'Trends'];

  for (let i = 0; i < tabs.length; i++) {
    console.log(`Switching to tab: ${tabNames[i]}`);

    try {
      await page.click(`text="${tabNames[i]}"`, { timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `/tmp/screenshots/${String(i+2).padStart(2, '0')}-tab-${tabs[i]}.png`,
        fullPage: true
      });
    } catch (e) {
      console.log(`Failed to click tab ${tabNames[i]}`);
    }
  }

  // Screenshot sidebar
  await page.screenshot({
    path: '/tmp/screenshots/06-sidebar.png',
    clip: { x: 0, y: 0, width: 300, height: 800 }
  });

  console.log('✅ Screenshots done');
});
