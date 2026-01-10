
const fs = require('fs');

const mphPath = 'client/src/data/musclephdArticles.ts';
const uhPath = 'client/src/data/ultrahumanArticles.ts';

function fix(filePath, id, h1Title, h2Insertions = []) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find the content property for the given id
  const regex = new RegExp('(id:\\s*["\']' + id + '["\'][\\s\\S]*?content:\\s*[`])([\\s\\S]*?)([`])', 'g');
  
  const newContent = content.replace(regex, (match, prefix, articleContent, suffix) => {
    let newC = articleContent;
    
    // Add H1 if not present
    if (!newC.trim().startsWith('# ')) {
      newC = `# ${h1Title}\n\n` + newC.trim();
    }
    
    // Add H2 insertions
    h2Insertions.forEach(ins => {
      if (!newC.includes(ins.tag)) {
        newC = newC.replace(ins.after, `${ins.tag}\n\n${ins.after}`);
      }
    });
    
    return prefix + newC + suffix;
  });
  
  fs.writeFileSync(filePath, newContent);
}

// --- Group 1: Missing H1 ---
fix(mphPath, 'mph-5', 'La connexion esprit-muscle');
fix(uhPath, 'uh-4', 'Exposition à la lumière bleue le soir et récupération');
fix(uhPath, 'uh-13', 'Comparaison sommeil Ring vs Apple Watch');
fix(uhPath, 'uh-17', 'ACHZOD introduit le suivi de l\'ovulation');
fix(uhPath, 'uh-22', 'ACHZOD Home : La santé à domicile réinventée');

// --- Group 2: Poor H2 + Missing H1 ---
fix(mphPath, 'mph-32', 'Entraînement à jeun', [
  { tag: '## Mythes et Réalités', after: 'Pas si vite.' },
  { tag: '## Conseils Pratiques', after: 'Alors si vous préférez' }
]);

fix(mphPath, 'mph-39', 'Nids-de-poule : Gérer les blessures', [
  { tag: '## L\'analogie de la route', after: 'La Ball State University' },
  { tag: '## Adapter son entraînement', after: 'Réaliser des gains significatifs' }
]);

fix(mphPath, 'mph-65', 'Écrire votre propre programme, partie 3', [
  { tag: '## Pourquoi varier les exercices ?', after: 'On parle de variation' },
  { tag: '## Fréquence de changement', after: 'Cela soulève donc la question ultime' }
]);

fix(uhPath, 'uh-3', 'Activité physique et profils de sommeil', [
  { tag: '## Méthodologie de l\'étude', after: 'Nous avons entrepris une analyse' },
  { tag: '## Résultats : Matin vs Soir', after: 'Nous avons ensuite cherché à vérifier' }
]);

fix(uhPath, 'uh-21', 'App Store PowerPlugs et détection de fibrillation', [
  { tag: '## Une nouvelle ère pour la santé', after: 'ACHZOD est fier' }
]);

console.log('SEO structure fixed correctly.');
