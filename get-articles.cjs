
const fs = require('fs');
const files = ['client/src/data/musclephdArticles.ts', 'client/src/data/ultrahumanArticles.ts'];
const targets = ['mph-5', 'uh-4', 'uh-13', 'uh-17', 'uh-22', 'mph-32', 'mph-39', 'mph-65', 'uh-3', 'uh-21'];

files.forEach(path => {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf-8');
  targets.forEach(id => {
    const regex = new RegExp('id:\\s*["\']' + id + '["\'][\\s\\S]*?title:\\s*["\']([^"\']+)["\'][\\s\\S]*?content:\\s*([`"\'])([\\s\\S]*?)\\2');
    const match = content.match(regex);
    if (match) {
      console.log('--- START ' + id + ' ---');
      console.log('TITLE:' + match[1]);
      console.log('CONTENT:' + match[3]);
      console.log('--- END ' + id + ' ---');
    }
  });
});
