import { chromium } from 'playwright';

async function testNoEmoji() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5000/analysis/726f914f-171e-450e-9f8b-0369d49f47e1?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  const bodyText = await page.locator('main').innerText();

  // Count emojis
  const emojiMatches = bodyText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|🚨|✅|💊|📊|🎯|💬|🕐|📈/gu) || [];
  console.log(`Emojis trouvés: ${emojiMatches.length}`);

  if (emojiMatches.length > 0) {
    console.log(`❌ ÉCHEC - Emojis encore présents: ${[...new Set(emojiMatches)].join(', ')}`);
  } else {
    console.log(`✅ SUCCÈS - Aucun emoji`);
  }

  // Check text labels
  const hasQuoi = bodyText.includes('QUOI:');
  const hasPourquoi = bodyText.includes('POURQUOI:');
  const hasComment = bodyText.includes('COMMENT:');
  const hasAlerte = bodyText.includes('ALERTE');

  console.log(`\nLabels texte:`);
  console.log(`  ALERTE: ${hasAlerte ? '✅' : '❌'}`);
  console.log(`  QUOI: ${hasQuoi ? '✅' : '❌'}`);
  console.log(`  POURQUOI: ${hasPourquoi ? '✅' : '❌'}`);
  console.log(`  COMMENT: ${hasComment ? '✅' : '❌'}`);

  // Extract examples
  console.log(`\nExemples:`);
  const lines = bodyText.split('\n');
  lines.filter(l => l.includes('QUOI:')).slice(0, 3).forEach(l => console.log(`  ${l.trim()}`));

  await page.screenshot({ path: '/tmp/no-emoji-test.png', fullPage: true });
  console.log(`\nScreenshot: /tmp/no-emoji-test.png`);

  await browser.close();
}

testNoEmoji().catch(console.error);
