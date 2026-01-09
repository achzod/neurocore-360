import { readFileSync } from 'fs';

// Charger les articles originaux EN (FULL)
const originalArticles = JSON.parse(readFileSync('yamamoto-10-articles-FULL-EN.json', 'utf8'));

// Charger les articles traduits sur le blog
const blogArticles = JSON.parse(readFileSync('client/src/data/yamamotoArticles.json', 'utf8'));

console.log('📊 COMPARAISON ARTICLES BLOG vs ORIGINAUX\n');
console.log('='  .repeat(80));

let totalIssues = 0;

originalArticles.forEach((original, index) => {
  const blog = blogArticles[index];

  const originalLength = original.fullContent.length;
  const blogLength = blog.content.length;
  const diff = originalLength - blogLength;
  const diffPercent = ((diff / originalLength) * 100).toFixed(1);

  const status = Math.abs(diff) < originalLength * 0.3 ? '✅' : '❌';

  console.log(`\n${index + 1}. ${original.title}`);
  console.log(`   Original EN: ${originalLength} chars`);
  console.log(`   Blog FR:     ${blogLength} chars`);
  console.log(`   Différence:  ${diff} chars (${diffPercent}%)`);
  console.log(`   Status:      ${status} ${Math.abs(diffPercent) > 30 ? 'CONTENU MANQUANT!' : 'OK'}`);

  if (Math.abs(diffPercent) > 30) {
    totalIssues++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n🔍 RÉSULTAT: ${totalIssues}/10 articles ont du contenu manquant\n`);

if (totalIssues > 0) {
  console.log('❌ ACTION REQUISE: Retraduire les articles avec contenu manquant\n');
} else {
  console.log('✅ Tous les articles sont complets!\n');
}
