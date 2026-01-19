
const fs = require('fs');
const path = require('path');

const files = [
  'client/src/data/musclephdArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/yamamotoArticles.ts',
  'client/src/data/sarmsArticles.ts',
  'client/src/data/peptidesArticles.ts',
  'client/src/data/blogArticles.ts',
  'client/src/data/articles_31_32_33_complets.ts',
  'client/src/data/articles_7_8_9_new.ts'
];

const forbiddenPhrases = [
  /Traduit par ACHZOD/gi,
  /Traduction par ACHZOD/gi,
  /Traduit par/gi,
  /Traduction :/gi,
  /Source:/gi,
  /Original content/gi,
  /Original article/gi,
  /Translated by/gi,
  /Articles traduits par ACHZOD/gi,
  /\(Traduction\)/gi,
  /\[Traduction\]/gi
];

files.forEach(filePath => {
  const fullPath = path.resolve('/Users/achzod/Desktop/neurocore', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  console.log(`Cleaning traces from ${filePath}...`);
  let content = fs.readFileSync(fullPath, 'utf-8');
  let originalContent = content;

  forbiddenPhrases.forEach(regex => {
    content = content.replace(regex, '');
  });

  // Specifically clean some common patterns found in grep
  content = content.replace(/\/\/ ACHZOD articles -/g, '// ACHZOD articles');
  content = content.replace(/\/\/ ACHZOD -/g, '// ACHZOD');
  
  // Clean double spaces or empty comments left behind
  content = content.replace(/\/\/ \s*\n/g, '\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Cleaned ${filePath}`);
  } else {
    console.log(`No traces found in ${filePath}`);
  }
});

console.log('Cleanup of "Traduit par" completed.');
