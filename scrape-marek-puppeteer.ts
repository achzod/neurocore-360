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
    
    console.log('\nScraping blog page...');
    const blogUrls = await scrapeBlogList(page, 'https://marekhealth.com/blog/');
    console.log(`Found ${blogUrls.length} blog URLs`);

    console.log('\nScraping resources page...');
    const resourceUrls = await scrapeBlogList(page, 'https://marekhealth.com/resources/');
    console.log(`Found ${resourceUrls.length} resource URLs`);

    const allUrls = [...new Set([...blogUrls, ...resourceUrls])];
    console.log(`\nTotal unique URLs: ${allUrls.length}`);
    console.log(`Will scrape up to ${Math.min(maxArticles, allUrls.length)} articles\n`);

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

async function scrapeBlogList(page: any, url: string): Promise<string[]> {
  const urls: string[] = [];
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/blog/"], a[href*="/resources/"]'));
      return anchors
        .map((a: any) => a.href)
        .filter((href: string) => 
          href.includes('marekhealth.com') && 
          !href.endsWith('/blog/') && 
          !href.endsWith('/resources/')
        );
    });

    urls.push(...links);
  } catch (err: any) {
    console.log(`Error scraping list ${url}:`, err.message);
  }

  return [...new Set(urls)];
}

async function scrapeArticle(page: any, url: string): Promise<Article | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const data = await page.evaluate(() => {
      let title = '';
      const titleSelectors = ['h1', '.entry-title', '.post-title', 'article h1', '[class*="title"]'];
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim()) {
          title = el.textContent.trim();
          break;
        }
      }

      let content = '';
      const contentSelectors = [
        'article',
        '.entry-content',
        '.post-content',
        '.article-content',
        'main',
        '[class*="content"]'
      ];

      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const paragraphs = Array.from(el.querySelectorAll('p, li'));
          const text = paragraphs
            .map((p: any) => p.textContent ? p.textContent.trim() : '')
            .filter(t => t.length > 30)
            .join('\n\n');
          
          if (text.length > content.length) {
            content = text;
          }
        }
      }

      if (content.length < 500 && document.body.innerText) {
        content = document.body.innerText;
      }

      return { title, content };
    });

    if (!data.title || !data.content) {
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
  console.log('MAREK HEALTH SCRAPER WITH PUPPETEER');
  console.log('='.repeat(50));
  
  const articles = await scrapeMarekHealthWithPuppeteer(50);
  
  const outputPath = '/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json';
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
  
  console.log('\n' + '='.repeat(50));
  console.log(`✓ Successfully scraped ${articles.length} articles`);
  console.log(`✓ Saved to: ${outputPath}`);
  console.log('='.repeat(50));
  
  if (articles.length > 0) {
    console.log('\nFirst 3 articles:');
    articles.slice(0, 3).forEach((art, idx) => {
      console.log(`\n${idx + 1}. ${art.title}`);
      console.log(`   URL: ${art.url}`);
      console.log(`   Content: ${art.content.length} chars`);
      console.log(`   Keywords: ${art.keywords.join(', ')}`);
    });
  }
}

main().catch(console.error);
