import { chromium } from 'playwright';
import * as fs from 'fs';

async function auditRapport() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('📄 Chargement du rapport...\n');
  await page.goto('http://localhost:5000/analysis/d472258c-35a4-4385-ac92-70137d4dad9d?key=Badboy007', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  await page.waitForTimeout(3000);

  console.log('=== AUDIT COMPLET DU RAPPORT ===\n');

  // 1. DESIGN
  console.log('🎨 DESIGN:');
  const bgColor = await page.locator('body').evaluate(el => window.getComputedStyle(el).backgroundColor);
  console.log(`  Background body: ${bgColor}`);

  const mainBg = await page.locator('main').evaluate(el => window.getComputedStyle(el).backgroundColor);
  console.log(`  Background main: ${mainBg}`);

  // 2. DARK MODE TOGGLE
  const darkModeBtn = await page.locator('button:has-text("Dark"), button:has-text("Sombre"), [aria-label*="theme"]').count();
  console.log(`  Dark mode toggle: ${darkModeBtn === 0 ? '✅ ABSENT (correct)' : '❌ PRÉSENT (à supprimer)'}`);

  // 3. TABS/ONGLETS
  console.log('\n📑 ONGLETS/TABS:');
  const trendsTab = await page.locator('text=/Trends|Tendances/i').count();
  console.log(`  Onglet Trends: ${trendsTab === 0 ? '✅ ABSENT' : `❌ PRÉSENT (${trendsTab} occurrences)`}`);

  const overviewTab = await page.locator('[role="tab"]:has-text("Overview"), [role="tab"]:has-text("Vue d\'ensemble")').count();
  console.log(`  Onglets actifs: ${overviewTab === 0 ? '✅ AUCUN' : `❌ ${overviewTab} trouvés`}`);

  // 4. CITATIONS EXPERTS
  console.log('\n💬 CITATIONS EXPERTS:');
  const citationsHighlight = await page.locator('.bg-blue-50, .text-blue-700').count();
  console.log(`  Citations highlight (bleu): ${citationsHighlight}`);

  const citationsText = await page.locator('text=/Derek|MPMD|Huberman|Attia|Masterjohn|Examine/i').allTextContents();
  console.log(`  Mentions experts trouvées: ${citationsText.length}`);
  if (citationsText.length > 0) {
    console.log(`  Exemples: ${citationsText.slice(0, 3).join(', ')}`);
  }

  // 5. LANGAGE TU/TOI
  console.log('\n👤 LANGAGE TU/TOI:');
  const bodyText = await page.locator('body').innerText();
  const tesCount = (bodyText.match(/\btes\b/gi) || []).length;
  const tonCount = (bodyText.match(/\bton\b/gi) || []).length;
  const taCount = (bodyText.match(/\bta\b/gi) || []).length;
  console.log(`  "tes": ${tesCount} occurrences`);
  console.log(`  "ton": ${tonCount} occurrences`);
  console.log(`  "ta": ${taCount} occurrences`);
  console.log(`  Total TU/TOI: ${tesCount + tonCount + taCount}`);

  // 6. ALERTES PRIORITAIRES
  console.log('\n🚨 ALERTES PRIORITAIRES:');
  const alertes = await page.locator('text=/🚨 Alerte/').count();
  console.log(`  Nombre d'alertes: ${alertes}`);

  const percentages = await page.locator('text=/%.*au-dessus/i').allTextContents();
  console.log(`  Pourcentages calculés: ${percentages.length}`);
  if (percentages.length > 0) {
    console.log(`  Exemples: ${percentages.slice(0, 3).join(' | ')}`);
  }

  // 7. FORMAT SUPPLEMENTS
  console.log('\n💊 FORMAT SUPPLEMENTS:');
  const quoi = await page.locator('text=/✅ QUOI:/').count();
  const pourquoi = await page.locator('text=/🎯 POURQUOI:/').count();
  const comment = await page.locator('text=/📊 COMMENT:/').count();
  const quand = await page.locator('text=/🕐 QUAND:/').count();
  const impact = await page.locator('text=/📈 IMPACT:/').count();
  const expert = await page.locator('text=/💬 EXPERT:/').count();

  console.log(`  ✅ QUOI: ${quoi}`);
  console.log(`  🎯 POURQUOI: ${pourquoi}`);
  console.log(`  📊 COMMENT: ${comment}`);
  console.log(`  🕐 QUAND: ${quand}`);
  console.log(`  📈 IMPACT: ${impact}`);
  console.log(`  💬 EXPERT: ${expert}`);

  // 8. NAVIGATION
  console.log('\n🧭 NAVIGATION:');
  const sidebar = await page.locator('aside').count();
  console.log(`  Sidebar: ${sidebar > 0 ? '✅ PRÉSENTE' : '❌ ABSENTE'}`);

  const navLinks = await page.locator('aside a').count();
  console.log(`  Liens navigation: ${navLinks}`);

  // 9. SECTIONS
  console.log('\n📋 SECTIONS:');
  const sections = await page.locator('section').count();
  console.log(`  Total sections: ${sections}`);

  const sectionIds = await page.locator('section[id]').evaluateAll(els => els.map(el => el.id));
  console.log(`  IDs: ${sectionIds.join(', ')}`);

  // 10. PROBLÈMES DÉTECTÉS
  console.log('\n❌ PROBLÈMES DÉTECTÉS:');
  const problems: string[] = [];

  if (darkModeBtn > 0) problems.push('Dark mode toggle encore présent');
  if (trendsTab > 0) problems.push('Onglet Trends encore visible');
  if (overviewTab > 0) problems.push('Tabs/onglets encore actifs');
  if (citationsHighlight === 0) problems.push('Aucune citation highlight en bleu');
  if (tesCount + tonCount + taCount < 10) problems.push('Pas assez de langage TU/TOI');
  if (alertes === 0) problems.push('Aucune alerte prioritaire');
  if (quoi === 0) problems.push('Format QUOI/POURQUOI/etc manquant');
  if (sidebar === 0) problems.push('Sidebar navigation absente');

  if (problems.length === 0) {
    console.log('  ✅ AUCUN - Rapport conforme !');
  } else {
    problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  }

  // 11. SCREENSHOTS
  console.log('\n📸 SCREENSHOTS:');
  await page.screenshot({ path: '/tmp/audit-full-page.png', fullPage: true });
  console.log('  Full page: /tmp/audit-full-page.png');

  await page.screenshot({ path: '/tmp/audit-viewport.png' });
  console.log('  Viewport: /tmp/audit-viewport.png');

  // 12. HTML COMPLET
  const html = await page.content();
  fs.writeFileSync('/tmp/audit-rapport-html.html', html);
  console.log('  HTML complet: /tmp/audit-rapport-html.html');

  // 13. EXTRAIRE CONTENU VISIBLE
  console.log('\n📝 CONTENU VISIBLE (premiers 2000 chars):');
  const visibleText = await page.locator('main').innerText();
  console.log(visibleText.substring(0, 2000));

  await browser.close();
  console.log('\n✅ Audit terminé!');
}

auditRapport().catch(console.error);
