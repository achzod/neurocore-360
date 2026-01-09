import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

interface Article {
  title: string;
  url: string;
  date: string;
  content: string;
  excerpt: string;
  author: string;
  categories: string[];
  tags: string[];
}

const BASE_URL = 'https://moreplatesmoredates.com';
const DELAY_MS = 2000; // 2 seconds delay between requests to be respectful

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeArticleList(page: number): Promise<string[]> {
  try {
    const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;
    console.log(`Fetching article list from page ${page}: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const articleUrls: string[] = [];
    
    // Find all article links - adjust selectors based on MPMD's structure
    $('article a[href*="moreplatesmoredates.com"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.includes('/page/') && !href.includes('#') && 
          !articleUrls.includes(href)) {
        articleUrls.push(href);
      }
    });
    
    // Also try h2 > a selector common in WordPress themes
    $('h2 a[href], h3 a[href], .entry-title a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.includes('moreplatesmoredates.com') && 
          !href.includes('/page/') && !href.includes('#') && 
          !articleUrls.includes(href)) {
        articleUrls.push(href);
      }
    });
    
    console.log(`Found ${articleUrls.length} articles on page ${page}`);
    return articleUrls;
  } catch (error: any) {
    console.error(`Error fetching page ${page}:`, error.message);
    return [];
  }
}

async function scrapeArticle(url: string): Promise<Article | null> {
  try {
    console.log(`Scraping article: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('h1.entry-title, h1, article h1').first().text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  'Untitled';
    
    // Extract content - try multiple selectors
    let content = '';
    const contentSelectors = [
      'article .entry-content',
      '.post-content',
      'article',
      '.content',
      'main'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        // Remove scripts, styles, and comments
        element.find('script, style, .comments, #comments').remove();
        content = element.text().trim();
        if (content.length > 200) break; // Found substantial content
      }
    }
    
    // Extract date
    const date = $('time').attr('datetime') || 
                 $('.entry-date').text().trim() ||
                 $('meta[property="article:published_time"]').attr('content') ||
                 '';
    
    // Extract excerpt
    const excerpt = $('meta[name="description"]').attr('content') || 
                    $('meta[property="og:description"]').attr('content') ||
                    content.substring(0, 300) + '...';
    
    // Extract author
    const author = $('.author-name, .entry-author').text().trim() ||
                   $('meta[name="author"]').attr('content') ||
                   'Derek (More Plates More Dates)';
    
    // Extract categories
    const categories: string[] = [];
    $('.cat-links a, .category a').each((_, el) => {
      categories.push($(el).text().trim());
    });
    
    // Extract tags
    const tags: string[] = [];
    $('.tag-links a, .tags a').each((_, el) => {
      tags.push($(el).text().trim());
    });
    
    if (!content || content.length < 100) {
      console.log(`⚠️  Warning: Limited content for ${url} (${content.length} chars)`);
    }
    
    return {
      title,
      url,
      date,
      content,
      excerpt,
      author,
      categories,
      tags
    };
  } catch (error: any) {
    console.error(`Error scraping article ${url}:`, error.message);
    return null;
  }
}

async function main() {
  const maxPages = parseInt(process.argv[2]) || 50;
  const outputPath = path.join(process.cwd(), 'scraped-data', 'mpmd-full.json');
  
  console.log('🚀 Starting More Plates More Dates scraper');
  console.log(`📄 Will scrape up to ${maxPages} pages`);
  console.log(`💾 Output: ${outputPath}`);
  console.log('');
  
  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  
  // Collect all article URLs
  const allUrls = new Set<string>();
  
  for (let page = 1; page <= maxPages; page++) {
    const urls = await scrapeArticleList(page);
    
    if (urls.length === 0) {
      console.log(`No more articles found at page ${page}. Stopping.`);
      break;
    }
    
    urls.forEach(url => allUrls.add(url));
    console.log(`Total unique articles so far: ${allUrls.size}`);
    
    await sleep(DELAY_MS);
  }
  
  console.log('');
  console.log(`📊 Found ${allUrls.size} unique articles to scrape`);
  console.log('');
  
  // Scrape each article
  const articles: Article[] = [];
  let count = 0;
  
  for (const url of Array.from(allUrls)) {
    count++;
    console.log(`[${count}/${allUrls.size}] Processing: ${url}`);
    
    const article = await scrapeArticle(url);
    if (article) {
      articles.push(article);
      console.log(`✅ Success: ${article.title.substring(0, 60)}... (${article.content.length} chars)`);
    } else {
      console.log(`❌ Failed to scrape article`);
    }
    
    // Save progress every 10 articles
    if (count % 10 === 0) {
      await fs.writeFile(outputPath, JSON.stringify(articles, null, 2));
      console.log(`💾 Progress saved: ${articles.length} articles`);
    }
    
    await sleep(DELAY_MS);
  }
  
  // Final save
  await fs.writeFile(outputPath, JSON.stringify(articles, null, 2));
  
  console.log('');
  console.log('✅ Scraping complete!');
  console.log(`📊 Total articles scraped: ${articles.length}`);
  console.log(`💾 Saved to: ${outputPath}`);
  
  // Statistics
  const totalChars = articles.reduce((sum, a) => sum + a.content.length, 0);
  const avgChars = Math.round(totalChars / articles.length);
  console.log(`📈 Average content length: ${avgChars} characters`);
  console.log(`📈 Total content: ${Math.round(totalChars / 1000)}K characters`);
}

main().catch(console.error);
