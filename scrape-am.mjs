#!/usr/bin/env node
/**
 * NEUROCORE 360 - Applied Metabolics Full Scraper
 * Usage: node scrape-am.mjs [password] [limit]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const password = process.argv[2];
const limit = process.argv[3] || '1000';

if (!password) {
  console.error('ERROR: Password required');
  console.error('Usage: node scrape-am.mjs [password] [limit]');
  console.error('Example: node scrape-am.mjs "mypassword123" 1000');
  process.exit(1);
}

console.log('=========================================');
console.log('NEUROCORE 360 - Applied Metabolics Scraper');
console.log('=========================================');
console.log(`Limit: ${limit} articles`);
console.log('Email: achkou@gmail.com');
console.log('');

// Create inline scraper
const scraperCode = `
import { scrapeSource } from "./server/knowledge/scraper.js";
import { writeFileSync } from 'fs';

const limit = parseInt(process.argv[2]) || 1000;

console.log(\`[CLI] Starting Applied Metabolics scraper with limit \${limit}\`);

scrapeSource("applied_metabolics", limit)
  .then((result) => {
    console.log(\`\\n[CLI] ========================================\`);
    console.log(\`[CLI] COMPLETE: \${result.articles.length} articles scraped\`);
    console.log(\`[CLI] Saved: \${result.saved}, Duplicates: \${result.duplicates}\`);
    console.log(\`[CLI] ========================================\`);
    
    const path = '/Users/achzod/Desktop/neurocore/scraped-data/applied-metabolics-full.json';
    writeFileSync(path, JSON.stringify(result.articles, null, 2));
    console.log(\`[CLI] Articles also saved to: \${path}\`);
    
    process.exit(0);
  })
  .catch((err) => {
    console.error("[CLI] Error:", err);
    process.exit(1);
  });
`;

// Write temp file
import { writeFileSync } from 'fs';
writeFileSync('/tmp/run-am-scraper.mjs', scraperCode);

// Run with tsx
const proc = spawn('npx', ['tsx', '/tmp/run-am-scraper.mjs', limit], {
  cwd: __dirname,
  env: {
    ...process.env,
    DATABASE_URL: 'postgresql://dummy',
    APPLIED_METABOLICS_PASSWORD: password
  },
  stdio: 'inherit'
});

proc.on('close', (code) => {
  process.exit(code);
});
