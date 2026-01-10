
const fs = require('fs');

const filePath = 'client/src/data/ultrahumanArticles.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// List of IDs to delete (those clearly about the ring/device/brand news)
const idsToDelete = [
  'uh-1', 'uh-2', 'uh-3', 'uh-4', 'uh-5', 'uh-8', 'uh-9', 'uh-10', 
  'uh-11', 'uh-12', 'uh-13', 'uh-14', 'uh-16', 'uh-17', 'uh-20', 'uh-21', 'uh-22'
];

// Regex to match the objects
const articleRegex = /\{\s*id:\s*["']([^"']+)["'][\s\S]*?\},\n?/g;

let deletedCount = 0;
const newContent = content.replace(articleRegex, (match, id) => {
  if (idsToDelete.includes(id)) {
    console.log(`Deleting ring article: ${id}`);
    deletedCount++;
    return '';
  }
  return match;
});

fs.writeFileSync(filePath, newContent);
console.log(`Deleted ${deletedCount} ring articles.`);
