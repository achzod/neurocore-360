/**
 * Import Blood Analysis Knowledge Bases
 * Importe Huberman, Peter Attia, MPMD, Examine, etc. dans la DB
 */

import * as fs from 'fs';
import * as path from 'path';
import { saveArticle, initKnowledgeTable, type ScrapedArticle } from '../server/knowledge/storage';

interface SourceConfig {
  file: string;
  source: ScrapedArticle['source'];
  category?: string;
}

const SOURCES: SourceConfig[] = [
  { file: 'huberman-full.json', source: 'huberman', category: 'bloodwork' },
  { file: 'peter-attia-full.json', source: 'peter_attia', category: 'bloodwork' },
  { file: 'mpmd-full.json', source: 'mpmd', category: 'hormones' },
  { file: 'examine-full.json', source: 'examine', category: 'bloodwork' },
  { file: 'masterjohn-full.json', source: 'chris_masterjohn', category: 'bloodwork' },
  { file: 'rp-full.json', source: 'renaissance_periodization', category: 'nutrition' },
  { file: 'sbs-full.json', source: 'sbs', category: 'training' }
];

async function importSource(config: SourceConfig): Promise<void> {
  console.log(`\n📚 Importing ${config.source}...`);

  const filePath = path.join(__dirname, '../scraped-data', config.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ File not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const articles = Array.isArray(data) ? data : (data.articles || []);

  let saved = 0;
  let duplicates = 0;
  let errors = 0;

  for (const article of articles) {
    const title = article.title || article.name || 'Untitled';
    const content = article.content || article.text || '';
    const url = article.url || '';

    if (!content || content.length < 100) {
      continue; // Skip empty
    }

    // Extract keywords from title and content
    const keywords = extractKeywords(title + ' ' + content);

    try {
      const result = await saveArticle({
        source: config.source,
        title,
        content,
        url,
        category: config.category,
        keywords,
        scrapedAt: new Date(article.date || Date.now())
      });

      if (result.duplicate) {
        duplicates++;
      } else {
        saved++;
      }

      if ((saved + duplicates) % 10 === 0) {
        console.log(`  ✓ ${saved} saved, ${duplicates} duplicates...`);
      }
    } catch (error) {
      errors++;
      if (errors < 5) {
        console.error(`  ❌ Error saving article "${title}":`, error.message);
      }
    }
  }

  console.log(`✅ ${config.source}: ${saved} articles saved, ${duplicates} duplicates, ${errors} errors`);
}

function extractKeywords(text: string): string[] {
  // Extract important bloodwork-related keywords
  const bloodworkTerms = [
    'testosterone', 'estradiol', 'thyroid', 'tsh', 't3', 't4',
    'insulin', 'glucose', 'hba1c', 'cholesterol', 'ldl', 'hdl',
    'triglycerides', 'vitamin d', 'b12', 'ferritin', 'iron',
    'creatinine', 'liver', 'kidney', 'inflammation', 'crp',
    'bloodwork', 'biomarker', 'optimal', 'range', 'protocol',
    'supplement', 'protocol', 'zinc', 'magnesium', 'omega-3'
  ];

  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  for (const term of bloodworkTerms) {
    if (lowerText.includes(term)) {
      keywords.push(term);
    }
  }

  return [...new Set(keywords)]; // Deduplicate
}

async function main() {
  console.log('🚀 Starting Blood Analysis Knowledge Base Import...\n');

  // Init table
  await initKnowledgeTable();

  // Import all sources
  for (const source of SOURCES) {
    try {
      await importSource(source);
    } catch (error) {
      console.error(`❌ Error importing ${source.source}:`, error);
    }
  }

  console.log('\n✅ Import Complete!');
  console.log('Run: SELECT COUNT(*), source FROM knowledge_base GROUP BY source;');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
