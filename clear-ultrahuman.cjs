
const fs = require('fs');

const filePath = 'client/src/data/ultrahumanArticles.ts';
const content = `import { BlogArticle } from "./blogArticles";

// All ring-related articles removed as requested.
export const ULTRAHUMAN_ARTICLES: BlogArticle[] = [];
`;

fs.writeFileSync(filePath, content);
console.log('Cleared all articles from ultrahumanArticles.ts');
