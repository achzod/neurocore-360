import { chromium } from 'playwright';

async function auditRapport27Marqueurs() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('📄 Chargement rapport 27 marqueurs...\n');
  await page.goto('http://localhost:5000/analysis/726f914f-171e-450e-9f8b-0369d49f47e1?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  console.log('=== AUDIT RAPPORT 27 MARQUEURS ===\n');

  // Design check
  const bgColor = await page.locator('body').evaluate(el => window.getComputedStyle(el).backgroundColor);
  console.log(`🎨 Background: ${bgColor === 'rgb(255, 255, 255)' ? '✅ BLANC' : '❌ ' + bgColor}`);

  // Content stats
  const bodyText = await page.locator('main').innerText();
  const wordCount = bodyText.split(/\s+/).length;
  console.log(`\n📊 STATS CONTENU:`);
  console.log(`  Mots total (visible): ${wordCount}`);

  // Marqueurs
  const alertes = await page.locator('text=/🚨 Alerte/').count();
  console.log(`\n🚨 ALERTES:`);
  console.log(`  Nombre: ${alertes}`);

  const forces = await page.locator('section#strengths .rounded-xl').count();
  console.log(`\n💪 FORCES (marqueurs optimaux):`);
  console.log(`  Nombre: ${forces}`);

  // Citations
  const citationsHighlight = await page.locator('.bg-blue-50').count();
  const derekMentions = await page.locator('text=/Derek|MPMD/i').allTextContents();
  const hubermanMentions = await page.locator('text=/Huberman/i').allTextContents();
  const attiaMentions = await page.locator('text=/Attia/i').allTextContents();
  const masterjohnMentions = await page.locator('text=/Masterjohn/i').allTextContents();

  console.log(`\n💬 CITATIONS EXPERTS:`);
  console.log(`  Citations highlight bleu: ${citationsHighlight}`);
  console.log(`  Derek/MPMD: ${derekMentions.length} mentions`);
  console.log(`  Huberman: ${hubermanMentions.length} mentions`);
  console.log(`  Attia: ${attiaMentions.length} mentions`);
  console.log(`  Masterjohn: ${masterjohnMentions.length} mentions`);
  console.log(`  Total experts: ${derekMentions.length + hubermanMentions.length + attiaMentions.length + masterjohnMentions.length}`);

  // Deep dive
  const hasDeepdive = bodyText.includes('Deep dive') || bodyText.includes('DEEP DIVE');
  console.log(`\n📖 DEEP DIVE:`);
  console.log(`  ${hasDeepdive ? '✅ PRÉSENT' : '❌ ABSENT'}`);

  // Plan 90 jours
  const hasPlan90 = bodyText.includes('90 jours') || bodyText.includes('Plan 90');
  console.log(`\n📅 PLAN 90 JOURS:`);
  console.log(`  ${hasPlan90 ? '✅ PRÉSENT' : '❌ ABSENT'}`);

  // Supplements
  const supplements = await page.locator('text=/✅ QUOI:/').count();
  console.log(`\n💊 SUPPLEMENTS:`);
  console.log(`  Nombre: ${supplements}`);

  // Sections
  const sections = await page.locator('section[id]').evaluateAll(els => els.map(el => el.id));
  console.log(`\n📋 SECTIONS (${sections.length}):`);
  console.log(`  ${sections.join(', ')}`);

  // TU/TOI
  const tesCount = (bodyText.match(/\btes\b/gi) || []).length;
  const tonCount = (bodyText.match(/\bton\b/gi) || []).length;
  const taCount = (bodyText.match(/\bta\b/gi) || []).length;
  console.log(`\n👤 LANGAGE TU/TOI:`);
  console.log(`  Total: ${tesCount + tonCount + taCount} (tes: ${tesCount}, ton: ${tonCount}, ta: ${taCount})`);

  // Percentages
  const percentages = await page.locator('text=/%.*au-dessus/i').allTextContents();
  console.log(`\n📐 POURCENTAGES CALCULÉS:`);
  console.log(`  ${percentages.length} trouvés`);
  if (percentages.length > 0) {
    console.log(`  Exemples: ${percentages.slice(0, 3).join(' | ')}`);
  }

  // Screenshots
  console.log(`\n📸 SCREENSHOTS:`);
  await page.screenshot({ path: '/tmp/rapport-27-marqueurs-full.png', fullPage: true });
  console.log(`  Full page: /tmp/rapport-27-marqueurs-full.png`);

  await page.screenshot({ path: '/tmp/rapport-27-marqueurs-viewport.png' });
  console.log(`  Viewport: /tmp/rapport-27-marqueurs-viewport.png`);

  // Extract first 3000 chars
  console.log(`\n📝 APERÇU CONTENU (premiers 3000 chars):`);
  console.log(bodyText.substring(0, 3000));
  console.log(`\n... [${bodyText.length - 3000} chars restants]`);

  await browser.close();
  console.log('\n✅ Audit terminé!');
}

auditRapport27Marqueurs().catch(console.error);
