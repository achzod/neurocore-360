import { chromium } from 'playwright';

async function extractProblems() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5000/analysis/726f914f-171e-450e-9f8b-0369d49f47e1?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  console.log('=== EXTRACTION DES PROBLÈMES ===\n');

  // Section Strengths
  console.log('📋 SECTION STRENGTHS:');
  const strengthsHTML = await page.locator('section#strengths').innerHTML();
  console.log(strengthsHTML.substring(0, 2000));
  console.log('\n---\n');

  // Section Alerts
  console.log('📋 SECTION ALERTS (premier alerte):');
  const alertHTML = await page.locator('section#alerts .rounded-2xl').first().innerHTML();
  console.log(alertHTML.substring(0, 2000));
  console.log('\n---\n');

  // Section Protocol
  console.log('📋 SECTION PROTOCOL (premier supplement):');
  const protocolHTML = await page.locator('section#protocol').innerHTML();
  console.log(protocolHTML.substring(0, 2000));
  console.log('\n---\n');

  // Emojis trouvés
  console.log('🔍 EMOJIS TROUVÉS:');
  const bodyText = await page.locator('main').innerText();
  const emojiMatches = bodyText.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|🚨|✅|💊|📊|🎯|💬|🕐|📈|🔍|📋|💪|⚠️|❌/gu) || [];
  const uniqueEmojis = [...new Set(emojiMatches)];
  console.log(`Total emojis: ${emojiMatches.length}`);
  console.log(`Emojis uniques: ${uniqueEmojis.join(', ')}`);

  // Extract HTML sections with emojis
  console.log('\n📍 CONTEXTE DES EMOJIS:');
  const lines = bodyText.split('\n');
  lines.forEach((line, idx) => {
    if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|🚨|✅|💊|📊|🎯|💬|🕐|📈/gu.test(line)) {
      console.log(`Ligne ${idx}: ${line.substring(0, 150)}`);
    }
  });

  await browser.close();
}

extractProblems().catch(console.error);
