import puppeteer from 'puppeteer';
import * as fs from 'fs';

interface Article {
  source: string;
  title: string;
  content: string;
  url: string;
  category: string;
  keywords: string[];
  scrapedAt: Date;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

async function scrapeMarekHealthWithPuppeteer(maxArticles: number = 50): Promise<Article[]> {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const articles: Article[] = [];
  const visitedUrls = new Set<string>();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('\nExploring Marek Health website...');
    
    // Try different page URLs
    const pagesToTry = [
      'https://marekhealth.com/blog/',
      'https://marekhealth.com/resources/',
      'https://marekhealth.com/knowledge-base/',
      'https://marekhealth.com/articles/',
    ];
    
    let allUrls: string[] = [];
    
    for (const pageUrl of pagesToTry) {
      try {
        console.log(`\nTrying: ${pageUrl}`);
        await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
        
        // Scroll to load more content
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(r => setTimeout(r, 2000));
        
        // Extract all links
        const links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return anchors
            .map((a: any) => a.href)
            .filter((href: string) => 
              href && 
              href.includes('marekhealth.com') &&
              !href.endsWith('/') &&
              !href.includes('#') &&
              !href.includes('?') &&
              (href.includes('/blog/') || href.includes('/resources/') || href.includes('/knowledge'))
            );
        });
        
        console.log(`  Found ${links.length} potential article links`);
        allUrls.push(...links);
      } catch (err: any) {
        console.log(`  ✗ Failed to load ${pageUrl}: ${err.message}`);
      }
    }
    
    // Remove duplicates
    allUrls = [...new Set(allUrls)];
    console.log(`\nTotal unique article URLs found: ${allUrls.length}`);
    
    // If no URLs found, try manual URLs
    if (allUrls.length === 0) {
      console.log('\nNo URLs found automatically. Trying manual article discovery...');
      
      // Known Marek Health article patterns
      const manualUrls = [
        'https://marekhealth.com/blog/testosterone-levels-by-age/',
        'https://marekhealth.com/blog/how-to-read-blood-work/',
        'https://marekhealth.com/blog/cholesterol-explained/',
        'https://marekhealth.com/blog/thyroid-function-tests/',
        'https://marekhealth.com/blog/vitamin-d-levels/',
      ];
      
      allUrls = manualUrls;
      console.log(`Using ${manualUrls.length} known article URLs`);
    }
    
    console.log(`\nWill attempt to scrape up to ${Math.min(maxArticles, allUrls.length)} articles\n`);
    
    for (let i = 0; i < Math.min(maxArticles, allUrls.length); i++) {
      const url = allUrls[i];
      if (visitedUrls.has(url)) continue;
      
      try {
        console.log(`[${i + 1}/${Math.min(maxArticles, allUrls.length)}] Scraping: ${url}`);
        const article = await scrapeArticle(page, url);
        
        if (article && article.content.length > 500) {
          articles.push(article);
          visitedUrls.add(url);
          console.log(`  ✓ Title: ${article.title.substring(0, 60)}...`);
          console.log(`  ✓ Content: ${article.content.length} characters`);
        } else {
          console.log(`  ✗ Skipped (insufficient content)`);
        }
        
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      } catch (err: any) {
        console.log(`  ✗ Error: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  return articles;
}

async function scrapeArticle(page: any, url: string): Promise<Article | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      // Title extraction with multiple strategies
      let title = '';
      const titleSelectors = [
        'h1',
        '.entry-title',
        '.post-title',
        'article h1',
        '[class*="title"]',
        'title'
      ];
      
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 5) {
          title = el.textContent.trim();
          break;
        }
      }

      // Content extraction with multiple strategies
      let content = '';
      
      // Strategy 1: Try article tags
      const article = document.querySelector('article');
      if (article) {
        const paragraphs = Array.from(article.querySelectorAll('p, li, h2, h3, h4'));
        content = paragraphs
          .map((p: any) => p.textContent ? p.textContent.trim() : '')
          .filter(t => t.length > 20)
          .join('\n\n');
      }
      
      // Strategy 2: Try common content classes
      if (content.length < 500) {
        const contentSelectors = [
          '.entry-content',
          '.post-content',
          '.article-content',
          '[class*="content"]',
          'main'
        ];
        
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const paragraphs = Array.from(el.querySelectorAll('p, li, h2, h3, h4'));
            const text = paragraphs
              .map((p: any) => p.textContent ? p.textContent.trim() : '')
              .filter(t => t.length > 20)
              .join('\n\n');
            
            if (text.length > content.length) {
              content = text;
            }
          }
        }
      }
      
      // Strategy 3: Get all paragraphs
      if (content.length < 500) {
        const allP = Array.from(document.querySelectorAll('p'));
        content = allP
          .map((p: any) => p.textContent ? p.textContent.trim() : '')
          .filter(t => t.length > 50)
          .join('\n\n');
      }

      return { title, content };
    });

    if (!data.title || data.content.length < 500) {
      return null;
    }

    const article: Article = {
      source: 'marek_health',
      title: cleanText(data.title),
      content: cleanText(data.content).substring(0, 50000),
      url: url,
      category: 'bloodwork',
      keywords: extractKeywords(data.title, data.content),
      scrapedAt: new Date()
    };

    return article;
  } catch (err) {
    throw err;
  }
}

function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const importantTerms = [
    'testosterone', 'trt', 'hormone', 'estradiol', 'thyroid', 'cortisol',
    'bloodwork', 'biomarker', 'lab test', 'reference range',
    'lipid', 'cholesterol', 'triglyceride', 'hdl', 'ldl', 'apob',
    'hba1c', 'glucose', 'insulin', 'metabolic',
    'vitamin d', 'b12', 'ferritin', 'iron',
    'crp', 'inflammation', 'homocysteine',
    'dhea', 'pregnenolone', 'progesterone',
    'shbg', 'free testosterone', 'total testosterone',
    'psa', 'prostate', 'hematocrit', 'hemoglobin',
    'liver', 'alt', 'ast', 'kidney', 'creatinine', 'egfr'
  ];

  return importantTerms.filter(term => text.includes(term));
}

async function main() {
  console.log('='.repeat(50));
  console.log('MAREK HEALTH SCRAPER V2 - ENHANCED');
  console.log('='.repeat(50));
  
  const articles = await scrapeMarekHealthWithPuppeteer(50);
  
  const outputPath = '/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json';
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log(`✓ Successfully scraped ${articles.length} articles`);
  console.log(`✓ Saved to: ${outputPath}`);
  console.log('='.repeat(50));
  
  if (articles.length > 0) {
    console.log('\nSample articles:');
    articles.slice(0, 3).forEach((art, idx) => {
      console.log(`\n${idx + 1}. ${art.title}`);
      console.log(`   URL: ${art.url}`);
      console.log(`   Content: ${art.content.length} chars`);
      console.log(`   Keywords: ${art.keywords.slice(0, 5).join(', ')}`);
    });
  }
}

main().catch(console.error);
