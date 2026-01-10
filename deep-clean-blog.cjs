
const fs = require('fs');

const files = [
  'client/src/data/musclephdArticles.ts',
  'client/src/data/ultrahumanArticles.ts',
  'client/src/data/sarmsArticles.ts',
  'client/src/data/peptidesArticles.ts',
  'client/src/data/blogArticles.ts',
  'client/src/data/yamamotoArticles.json'
];

const BRANDS = [
  { s: /The Muscle PhD/gi, r: 'ACHZOD' },
  { s: /TheMusclePhD/gi, r: 'ACHZOD' },
  { s: /MusclePhD/gi, r: 'ACHZOD' },
  { s: /Ultrahuman/gi, r: 'ACHZOD' },
  { s: /Ring AIR/gi, r: 'Ring ACHZOD' },
  { s: /Ring-AIR/gi, r: 'Ring-ACHZOD' },
  { s: /Yamamoto Nutrition/gi, r: 'ACHZOD' },
  { s: /Yamamoto/gi, r: 'ACHZOD' },
  { s: /\(UH\)/g, r: '' }
];

const CLICHES = [
  /en conclusion,?/gi, /il est important de noter que/gi, /il convient de souligner que/gi,
  /dans cet article,?/gi, /nous avons vu que/gi, /en résumé,?/gi, /pour conclure,?/gi,
  /tout d'abord,?/gi, /enfin,?/gi, /de plus,?/gi, /en outre,?/gi
];

const CTA = `

---

[![Anabolic Code](https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg)](https://www.achzodcoaching.com/product/anabolic-code-la-science-interdite-de-lhgh-de-ligf-1-et-des-peptides-au-service-de-ta-mutation-corporelle)

**Découvre Anabolic Code** - Le guide complet sur l'optimisation hormonale et la transformation physique → [clique ici pour accéder au programme](https://www.achzodcoaching.com/product/anabolic-code-la-science-interdite-de-lhgh-de-ligf-1-et-des-peptides-au-service-de-ta-mutation-corporelle)`;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Rebranding (Aggressive but avoiding file names in quotes)
  BRANDS.forEach(b => {
    content = content.replace(b.s, (match) => {
      return b.r;
    });
  });
  
  // Fix specifically the imports/paths that might have been broken by the above
  content = content.replace(/import\s+.*\s+from\s+['"].*ACHZOD.*['"]/g, (match) => {
     return match.replace(/ACHZOD/g, 'ultrahuman').replace(/ACHZOD/g, 'musclephd').replace(/ACHZOD/g, 'yamamoto');
  });
  // Actually, let's just fix the known file paths
  content = content.replace(/ultrahumanArticles/gi, 'ultrahumanArticles');
  content = content.replace(/musclephdArticles/gi, 'musclephdArticles');
  content = content.replace(/yamamotoArticles/gi, 'yamamotoArticles');
  content = content.replace(/sarmsArticles/gi, 'sarmsArticles');
  content = content.replace(/peptidesArticles/gi, 'peptidesArticles');

  // 2. Clean Cliches
  CLICHES.forEach(c => {
    content = content.replace(c, '');
  });

  // 3. Author
  content = content.replace(/author:\s*['"`][^'"`]+['"`]/g, 'author: "ACHZOD"');
  if (file.endsWith('.json')) {
    content = content.replace(/"author":\s*"[^"]*"/g, '"author": "ACHZOD"');
  }

  // 4. CTA
  if (file.endsWith('.ts')) {
    content = content.replace(/content:\s*`([\s\S]*?)`/g, (match, body) => {
      if (body.includes('achzodcoaching.com') || body.includes('Anabolic Code')) {
        return match;
      }
      return `content: \`${body}${CTA}\``;
    });
  } else if (file.endsWith('.json')) {
    const data = JSON.parse(content);
    data.forEach(a => {
      if (a.content && !a.content.includes('achzodcoaching.com')) {
        a.content += CTA;
      }
      a.author = "ACHZOD";
    });
    content = JSON.stringify(data, null, 2);
  }

  fs.writeFileSync(file, content);
  console.log(`Deep cleaned ${file}`);
});
