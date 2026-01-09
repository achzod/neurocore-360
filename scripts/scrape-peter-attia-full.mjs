import { writeFileSync } from 'fs';
import * as cheerio from 'cheerio';

console.log('\n🚀 SCRAPING ALL PETER ATTIA ARTICLES WITH FULL CONTENT...\n');

const articles = [];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const seenUrls = new Set();

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

async function getFullContent(url, title) {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    
    // Extract full content
    let content = '';
    const contentSelectors = [
      '.entry-content',
      'article .content',
      '.post-content',
      '.article-content',
      'article',
      'main'
    ];
    
    for (const selector of contentSelectors) {
      const elem = $(selector);
      if (elem.length) {
        const clone = elem.clone();
        clone.find('script, style, nav, header, footer, aside, .comments, .social-share, .related-posts, .newsletter-signup, form, .sidebar').remove();
        content = cleanText(clone.text());
        if (content.length > 1000) break;
      }
    }
    
    return content;
  } catch (err) {
    console.log(`  ⚠️  Failed to fetch content: ${err.message}`);
    return '';
  }
}

try {
  // Step 1: Get ALL articles from paginated RSS feed
  console.log('📋 Fetching articles from RSS feed (multiple pages)...\n');
  
  let pageNum = 1;
  let hasMore = true;
  const allArticleLinks = [];
  
  while (hasMore && pageNum <= 10) { // Get up to 10 pages of RSS (usually 10-20 items per page)
    try {
      const rssUrl = pageNum === 1 
        ? 'https://peterattiamd.com/feed/'
        : `https://peterattiamd.com/feed/?paged=${pageNum}`;
      
      console.log(`Fetching RSS page ${pageNum}: ${rssUrl}`);
      const rssXml = await fetchPage(rssUrl);
      const $rss = cheerio.load(rssXml, { xmlMode: true });
      
      const items = $rss('item');
      if (items.length === 0) {
        console.log(`  No more items found, stopping at page ${pageNum}`);
        hasMore = false;
        break;
      }
      
      items.each((i, item) => {
        const title = $rss(item).find('title').text().trim();
        const link = $rss(item).find('link').text().trim();
        
        if (link && title && !seenUrls.has(link)) {
          seenUrls.add(link);
          allArticleLinks.push({ title, link });
        }
      });
      
      console.log(`  → Found ${items.length} articles (total so far: ${allArticleLinks.length})\n`);
      pageNum++;
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (err) {
      console.log(`  Error on page ${pageNum}: ${err.message}`);
      hasMore = false;
    }
  }
  
  console.log(`\n📚 Total articles found: ${allArticleLinks.length}`);
  console.log('\nFetching full content for each article...\n');

  // Step 2: Fetch full content for each article (limit to 200)
  const articlesToScrape = allArticleLinks.slice(0, 200);
  
  for (let i = 0; i < articlesToScrape.length; i++) {
    const { title, link } = articlesToScrape[i];
    console.log(`[${i + 1}/${articlesToScrape.length}] ${link}`);
    
    try {
      const content = await getFullContent(link, title);
      
      if (content.length > 300) {
        articles.push({
          source: 'peter_attia',
          title: title,
          content: content.substring(0, 100000), // Keep up to 100k chars
          url: link,
          scrapedAt: new Date().toISOString()
        });
        console.log(`  ✅ ${title.substring(0, 70)}... (${content.length.toLocaleString()} chars)`);
      } else {
        console.log(`  ⚠️  Content too short (${content.length} chars), skipping`);
      }
      
      // Rate limiting - be nice to the server
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
    }
  }

} catch (error) {
  console.error('\n❌ Fatal error:', error);
}

// Save results
const outputFile = '/Users/achzod/Desktop/neurocore/scraped-data/peter-attia-full.json';
const data = {
  source: 'Peter Attia - The Drive',
  scrapedAt: new Date().toISOString(),
  totalArticles: articles.length,
  articles: articles
};

writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`\n\n✅ SCRAPING COMPLETE!`);
console.log(`💾 Saved ${articles.length} articles to:`);
console.log(`   ${outputFile}`);
const totalChars = articles.reduce((sum, a) => sum + a.content.length, 0);
console.log(`\n📊 Statistics:`);
console.log(`   Total characters: ${totalChars.toLocaleString()}`);
console.log(`   Average per article: ${Math.round(totalChars / articles.length).toLocaleString()} chars`);
console.log(`   File size: ${Math.round(JSON.stringify(data).length / 1024 / 1024 * 100) / 100} MB`);
