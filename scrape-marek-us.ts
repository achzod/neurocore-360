import puppeteer from 'puppeteer';
import * as fs from 'fs';

/**
 * MAREK HEALTH SCRAPER - US PROXY VERSION
 * 
 * NOTE: This requires a US IP address or VPN to work.
 * Marek Health blocks non-US IP addresses.
 * 
 * To use this scraper:
 * 1. Connect to a US VPN
 * 2. Run: npx tsx scrape-marek-us.ts
 */

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

async function testUSAccess(): Promise<boolean> {
  console.log('Testing access to Marek Health...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://marekhealth.com/blog/', { waitUntil: 'networkidle0', timeout: 30000 });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (bodyText.includes('Forbidden') || bodyText.includes('IP Address outside')) {
      console.log('❌ Access BLOCKED - Non-US IP detected');
      console.log('   Please connect to a US VPN and try again.\n');
      return false;
    }
    
    console.log('✓ Access granted - US IP detected\n');
    return true;
  } finally {
    await browser.close();
  }
}

async function scrapeMarekWithUSAccess(maxArticles: number = 50): Promise<Article[]> {
  const articles: Article[] = [];
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Discovering articles from blog and resources pages...\n');
    
    const pagesToScrape = [
      'https://marekhealth.com/blog/',
      'https://marekhealth.com/resources/'
    ];
    
    let allUrls: string[] = [];
    
    for (const pageUrl of pagesToScrape) {
      try {
        console.log(`Loading: ${pageUrl}`);
        await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
        
        // Scroll down multiple times to load lazy content
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(r => setTimeout(r, 1500));
        }
        
        // Extract article URLs
        const urls = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          return links
            .map((a: any) => a.href)
            .filter((href: string) => {
              if (!href || !href.includes('marekhealth.com')) return false;
              if (href.endsWith('/blog/') || href.endsWith('/resources/')) return false;
              if (href.includes('#') || href.includes('?')) return false;
              return href.includes('/blog/') || href.includes('/resources/');
            });
        });
        
        console.log(`  Found ${urls.length} article links`);
        allUrls.push(...urls);
      } catch (err: any) {
        console.log(`  Error: ${err.message}`);
      }
    }
    
    allUrls = [...new Set(allUrls)];
    console.log(`\nTotal unique articles found: ${allUrls.length}`);
    console.log(`Will scrape up to ${Math.min(maxArticles, allUrls.length)} articles\n`);
    
    // Scrape each article
    for (let i = 0; i < Math.min(maxArticles, allUrls.length); i++) {
      const url = allUrls[i];
      
      try {
        console.log(`[${i + 1}/${Math.min(maxArticles, allUrls.length)}] ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const articleData = await page.evaluate(() => {
          let title = '';
          const h1 = document.querySelector('h1');
          if (h1) title = h1.textContent?.trim() || '';
          if (!title) title = document.title;
          
          let content = '';
          const article = document.querySelector('article');
          if (article) {
            const elements = Array.from(article.querySelectorAll('p, li, h2, h3'));
            content = elements
              .map((el: any) => el.textContent?.trim() || '')
              .filter(t => t.length > 20)
              .join('\n\n');
          }
          
          if (content.length < 500) {
            const allP = Array.from(document.querySelectorAll('main p, .content p, .entry-content p'));
            content = allP
              .map((p: any) => p.textContent?.trim() || '')
              .filter(t => t.length > 30)
              .join('\n\n');
          }
          
          return { title, content };
        });
        
        if (articleData.title && articleData.content.length > 500) {
          const article: Article = {
            source: 'marek_health',
            title: cleanText(articleData.title),
            content: cleanText(articleData.content).substring(0, 50000),
            url: url,
            category: 'bloodwork',
            keywords: extractKeywords(articleData.title, articleData.content),
            scrapedAt: new Date()
          };
          
          articles.push(article);
          console.log(`  ✓ Title: ${article.title.substring(0, 50)}...`);
          console.log(`  ✓ Content: ${article.content.length} chars\n`);
        } else {
          console.log(`  ✗ Insufficient content\n`);
        }
        
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      } catch (err: any) {
        console.log(`  ✗ Error: ${err.message}\n`);
      }
    }
  } finally {
    await browser.close();
  }
  
  return articles;
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
  console.log('='.repeat(60));
  console.log('MAREK HEALTH SCRAPER - REQUIRES US IP / VPN');
  console.log('='.repeat(60));
  console.log('');
  
  const hasAccess = await testUSAccess();
  
  if (!hasAccess) {
    console.log('INSTRUCTIONS:');
    console.log('1. Connect to a US-based VPN');
    console.log('2. Run this script again: npx tsx scrape-marek-us.ts');
    console.log('');
    console.log('Alternatively, if you have access to Marek Health articles,');
    console.log('you can manually provide URLs or article content.');
    return;
  }
  
  const articles = await scrapeMarekWithUSAccess(50);
  
  const outputPath = '/Users/achzod/Desktop/neurocore/scraped-data/marek-full.json';
  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
  
  console.log('='.repeat(60));
  console.log(`✓ Successfully scraped ${articles.length} articles`);
  console.log(`✓ Saved to: ${outputPath}`);
  console.log('='.repeat(60));
  
  if (articles.length > 0) {
    console.log('\nSample articles:');
    articles.slice(0, 3).forEach((art, idx) => {
      console.log(`\n${idx + 1}. ${art.title}`);
      console.log(`   Content: ${art.content.length} chars`);
      console.log(`   Keywords: ${art.keywords.slice(0, 5).join(', ')}`);
    });
  }
}

main().catch(console.error);
