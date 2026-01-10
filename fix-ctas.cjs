const fs = require('fs');

const NEW_CTA = `

---

[![Anabolic Code](https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg)](https://achzodcoaching.com)

**Découvre Anabolic Code** - Le guide complet sur l'optimisation hormonale et la transformation physique sur [achzodcoaching.com](https://achzodcoaching.com)`;

const files = [
  'client/src/data/blogArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/peptidesArticles.ts',
  'client/src/data/sarmsArticles.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let count = 0;

  // Match content field - ends with backtick followed by comma (with possible whitespace)
  const regex = /content:\s*`([\s\S]*?)`(\s*,)/g;

  content = content.replace(regex, (match, articleContent, ending) => {
    // Skip if already has the image CTA
    if (articleContent.includes('6851ebc888d485c358317cfe')) {
      return match;
    }

    // Check if has any achzodcoaching reference
    if (articleContent.includes('achzodcoaching')) {
      count++;

      let newContent = articleContent;

      // Remove all variations of old CTA patterns from the end

      // Remove everything from the last CTA marker to end
      // Pattern: ## Pret a ... followed by text and achzodcoaching link
      newContent = newContent.replace(/\n## Pret a[^\n]*\n[\s\S]*achzodcoaching[\s\S]*$/s, '');

      // Pattern: [Decouvrir...](achzodcoaching) at end
      newContent = newContent.replace(/\n\[Decouvrir[^\]]*\]\([^)]*achzodcoaching[^)]*\)\s*$/s, '');

      // Pattern: Pour approfondir... achzodcoaching.com
      newContent = newContent.replace(/\nPour approfondir[^\n]*achzodcoaching[^\n]*\s*$/s, '');

      // Pattern: **Bold** with achzodcoaching
      newContent = newContent.replace(/\n\*\*[^*]+\*\*[^\n]*achzodcoaching[^\n]*\s*$/s, '');

      // Pattern: Decouvrez nos formules... achzodcoaching
      newContent = newContent.replace(/\nDecouvrez nos[^\n]*\n[^\n]*achzodcoaching[^\n]*\s*$/s, '');

      // Pattern: --- followed by anything with achzodcoaching
      newContent = newContent.replace(/\n---[\s\S]*achzodcoaching[\s\S]*$/s, '');

      // Pattern: Any remaining line with achzodcoaching at very end
      newContent = newContent.replace(/\n[^\n]*achzodcoaching[^\n]*\s*$/s, '');

      // Remove trailing whitespace
      newContent = newContent.replace(/\s+$/, '');

      // Add new CTA
      newContent += NEW_CTA;

      return 'content: `' + newContent + '`' + ending;
    }

    return match;
  });

  fs.writeFileSync(file, content);
  console.log(file + ': ' + count + ' CTAs mis à jour');
});
