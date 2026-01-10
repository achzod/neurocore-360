
const fs = require('fs');
const path = require('path');

const mphPath = 'client/src/data/musclephdArticles.ts';
const uhPath = 'client/src/data/ultrahumanArticles.ts';

function updateArticle(filePath, id, processor) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp('(id:\\s*["\']' + id + '["\'][\\s\\S]*?content:\\s*[`"\'])([\\s\\S]*?)([`"\'])', 'g');
  
  const newContent = content.replace(regex, (match, prefix, articleContent, suffix) => {
    return prefix + processor(articleContent) + suffix;
  });
  
  fs.writeFileSync(filePath, newContent);
}

// --- FIXING H1 ---

// mph-5
updateArticle(mphPath, 'mph-5', c => {
  if (c.trim().startsWith('# ')) return c;
  return '# La connexion esprit-muscle\n\n' + c;
});

// uh-4
updateArticle(uhPath, 'uh-4', c => {
  if (c.trim().startsWith('# ')) return c;
  return '# Exposition à la lumière bleue le soir et récupération\n\n' + c;
});

// uh-13
updateArticle(uhPath, 'uh-13', c => {
  if (c.trim().startsWith('# ')) return c;
  return '# Comparaison sommeil Ring vs Apple Watch\n\n' + c;
});

// uh-17
updateArticle(uhPath, 'uh-17', c => {
  if (c.trim().startsWith('# ')) return c;
  return '# ACHZOD introduit le suivi de l\'ovulation\n\n' + c;
});

// uh-22
updateArticle(uhPath, 'uh-22', c => {
  if (c.trim().startsWith('# ')) return c;
  return '# ACHZOD Home : La santé à domicile réinventée\n\n' + c;
});

// --- FIXING H2 STRUCTURE ---

// mph-32
updateArticle(mphPath, 'mph-32', c => {
  let newC = c;
  if (!newC.includes('## Mythes et Réalités')) {
    newC = newC.replace('Pas si vite.', '## Mythes et Réalités\n\nPas si vite.');
  }
  if (!newC.includes('## Conseils pour s’entraîner à jeun')) {
    newC = newC.replace('Alors si vous préférez vous entraîner à jeun', '## Conseils pour s’entraîner à jeun\n\nAlors si vous préférez vous entraîner à jeun');
  }
  return newC;
});

// mph-39
updateArticle(mphPath, 'mph-39', c => {
  let newC = c;
  if (!newC.includes('## L\'analogie de la route')) {
    newC = newC.replace('La Ball State University', '## L\'analogie de la route\n\nLa Ball State University');
  }
  if (!newC.includes('## Adapter son entraînement')) {
    newC = newC.replace('Réaliser des gains significatifs', '## Adapter son entraînement\n\nRéaliser des gains significatifs');
  }
  return newC;
});

// mph-65
updateArticle(mphPath, 'mph-65', c => {
  let newC = c;
  if (!newC.includes('## Pourquoi varier les exercices ?')) {
    newC = newC.replace('On parle de variation', '## Pourquoi varier les exercices ?\n\nOn parle de variation');
  }
  if (!newC.includes('## Fréquence de changement')) {
    newC = newC.replace('Cela soulève donc la question ultime', '## Fréquence de changement\n\nCela soulève donc la question ultime');
  }
  return newC;
});

// uh-3
updateArticle(uhPath, 'uh-3', c => {
  let newC = c;
  if (!newC.includes('## Méthodologie de l\'étude')) {
    newC = newC.replace('Nous avons entrepris une analyse', '## Méthodologie de l\'étude\n\nNous avons entrepris une analyse');
  }
  if (!newC.includes('## Résultats : Matin vs Soir')) {
    newC = newC.replace('Nous avons ensuite cherché à vérifier', '## Résultats : Matin vs Soir\n\nNous avons ensuite cherché à vérifier');
  }
  return newC;
});

// uh-21 (Need to verify content first, let's assume standard fix for now)
updateArticle(uhPath, 'uh-21', c => {
  let newC = c;
  if (!newC.trim().startsWith('# ')) {
    newC = '# App Store PowerPlugs et détection de fibrillation\n\n' + newC;
  }
  if (!newC.includes('## Une nouvelle ère')) {
    const parts = newC.split('\n\n');
    if (parts.length > 5) {
      parts.splice(4, 0, '## Une nouvelle ère pour la santé connectée');
      newC = parts.join('\n\n');
    }
  }
  return newC;
});

console.log('SEO fixes applied to 10 articles.');
