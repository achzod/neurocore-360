import puppeteer from 'puppeteer';
import { writeFileSync, readFileSync } from 'fs';

// ============================================
// HUBERMAN LAB - RSS Feed
// ============================================
async function scrapeHubermanFull() {
  console.log('\n🚀 SCRAPING HUBERMAN LAB (RSS)...\n');
  const articles = [];

  try {
    const response = await fetch('https://feeds.megaphone.fm/hubermanlab');
    const xml = await response.text();

    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...xml.matchAll(itemPattern)];
    console.log(`Found ${items.length} episodes`);

    for (const item of items.slice(0, 100)) {
      const itemContent = item[1];

      const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                       itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
      const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

      const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : '';

      if (title && description.length > 200) {
        articles.push({
          source: 'huberman',
          title,
          content: description, // FULL content
          url: link,
          scrapedAt: new Date()
        });
        console.log(`✅ ${articles.length}. ${title.substring(0, 60)}... (${description.length} chars)`);
      }
    }
  } catch (error) {
    console.error('❌ Huberman failed:', error.message);
  }

  writeFileSync('scraped-data/huberman-full.json', JSON.stringify(articles, null, 2));
  console.log(`\n💾 Saved ${articles.length} Huberman articles`);
  return articles;
}

// ============================================
// STRONGER BY SCIENCE
// ============================================
const SBS_ARTICLES = [
  "/the-science-of-protein/",
  "/creatine/",
  "/the-belt-bible/",
  "/hypertrophy-range-fact-fiction/",
  "/training-frequency/",
  "/muscle-math/",
  "/periodization-data/",
  "/avoiding-cardio-could-be-holding-you-back/",
  "/the-science-of-deloads/",
  "/sleep/",
  "/caffeine/",
  "/research-spotlight-protein-timing/",
  "/research-spotlight-volume/",
  "/the-3-laws-of-protein/",
  "/training-to-failure/",
  "/how-to-get-stronger/",
  "/strength-training-for-endurance/",
  "/progressive-overload/",
  "/joint-health-for-lifters/",
  "/plateau-busting/",
  "/high-bar-vs-low-bar-squats/",
  "/deficit-adaptation/",
  "/rest-times/",
  "/sumo-vs-conventional-deadlift/",
  "/practical-nutrition-recommendations/",
  "/training-recovery/",
  "/soreness-hypertrophy/",
  "/supercompensation-myth/",
  "/bench-press/",
  "/deadlift-technique/",
  "/squat-technique/",
  "/overhead-press/",
  "/do-genetics-matter/",
  "/stress-and-training/",
  "/age-and-training/",
  "/sex-differences-in-training/",
  "/bodybuilding-vs-powerlifting/",
  "/warming-up/",
  "/range-of-motion/"
];

async function scrapeSBSFull(browser) {
  console.log('\n🚀 SCRAPING STRONGER BY SCIENCE...\n');
  const articles = [];

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  for (const path of SBS_ARTICLES) {
    const url = `https://www.strongerbyscience.com${path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const article = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.textContent.trim() : '';

        // Get FULL content - all paragraphs
        const contentEl = document.querySelector('.entry-content, article, main');
        const content = contentEl ? contentEl.innerText : '';

        return { title, content, contentLength: content.length };
      });

      if (article.content.length > 1000) {
        articles.push({
          source: 'sbs',
          title: article.title,
          content: article.content,
          url,
          scrapedAt: new Date()
        });
        console.log(`✅ ${articles.length}. ${article.title.substring(0, 60)}... (${article.contentLength} chars)`);
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log(`❌ Failed: ${path}`);
    }
  }

  await page.close();
  writeFileSync('scraped-data/sbs-full.json', JSON.stringify(articles, null, 2));
  console.log(`\n💾 Saved ${articles.length} SBS articles`);
  return articles;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('========================================');
  console.log('SCRAPING ALL SOURCES - 100% CONTENT');
  console.log('========================================');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Huberman (RSS - no browser needed)
  const huberman = await scrapeHubermanFull();

  // SBS (with browser)
  const sbs = await scrapeSBSFull(browser);

  await browser.close();

  console.log('\n========================================');
  console.log('SCRAPING COMPLETE');
  console.log(`Total: ${huberman.length + sbs.length} articles`);
  console.log('========================================');
}

main().catch(console.error);
