// Scrape Yamamoto articles with Puppeteer
import puppeteer from 'puppeteer';
import fs from 'fs';

const ARTICLES = [
    "https://www.yamamotonutrition.com/int/blog/post/creatine-the-queen-of-performance-supplements-a1768",
    "https://www.yamamotonutrition.com/int/blog/post/beta-alanine-a-supplement-to-support-resistance-a1982",
    "https://www.yamamotonutrition.com/int/blog/post/ashwagandha-a-valuable-ally-against-stress-a1952",
    "https://www.yamamotonutrition.com/int/blog/post/guarana-properties-benefits-and-curiosities-a987",
    "https://www.yamamotonutrition.com/int/blog/post/essential-amino-acids-more-on-the-most-discussed-supplement-myths-to-debunk-and-how-to-use-a1745",
    "https://www.yamamotonutrition.com/int/blog/post/prebiotics-probiotics-and-intestinal-bacterial-flora-complete-guide-a114",
    "https://www.yamamotonutrition.com/int/blog/post/the-new-era-of-supplements-mcu-20-yamamoto-a1748",
    "https://www.yamamotonutrition.com/int/blog/post/sports-and-nutrition-the-importance-of-carbohydrates-a1700",
    "https://www.yamamotonutrition.com/int/blog/post/carbohydrates-why-how-many-and-which-ones-to-take-for-an-endurance-athlete-a1954",
    "https://www.yamamotonutrition.com/int/blog/post/endurance-and-proteins-a-necessary-combination-a1955",
    "https://www.yamamotonutrition.com/int/blog/post/dehydration-and-mineral-salts-role-and-functions-a1938",
    "https://www.yamamotonutrition.com/int/blog/post/cycling-nutrition-a1978",
    "https://www.yamamotonutrition.com/int/blog/post/athlete-nutrition-focus-on-the-tennis-player-a1945",
    "https://www.yamamotonutrition.com/int/blog/post/athlete-nutrition-focus-on-the-sprinter-a1937",
    "https://www.yamamotonutrition.com/int/blog/post/winter-sports-nutrition-and-supplementation-a1953",
    "https://www.yamamotonutrition.com/int/blog/post/energy-bars-in-endurance-sports-a1928",
    "https://www.yamamotonutrition.com/int/blog/post/is-there-a-best-training-for-hypertrophy-volume-vs-intensity-a1767",
    "https://www.yamamotonutrition.com/int/blog/post/sst-method-sarcoplasmic-stimulation-training-a1669",
    "https://www.yamamotonutrition.com/int/blog/post/shoulder-training-the-5-best-exercises-for-deltoids-a330",
    "https://www.yamamotonutrition.com/int/blog/post/a-simple-but-effective-workout-for-the-legs-a402",
    "https://www.yamamotonutrition.com/int/blog/post/back-giant-set-workout-a258",
    "https://www.yamamotonutrition.com/int/blog/post/pump-vs-cell-volumization-in-bodybuilding-a130",
    "https://www.yamamotonutrition.com/int/blog/post/plicometry-and-the-unspoken-truths-a1923",
    "https://www.yamamotonutrition.com/int/blog/post/cross-training-what-is-it-false-myths-truth-a811",
    "https://www.yamamotonutrition.com/int/blog/post/triathlon-how-to-train-practical-tips-to-get-started-a1926",
    "https://www.yamamotonutrition.com/int/blog/post/open-water-swimming-between-training-nutrition-and-supplementation-a1947",
    "https://www.yamamotonutrition.com/int/blog/post/padel-between-fashion-training-and-nutrition-a1946",
    "https://www.yamamotonutrition.com/int/blog/post/physiology-and-nutrition-of-altitude-training-a1935",
    "https://www.yamamotonutrition.com/int/blog/post/how-to-deal-with-psychophysical-work-and-emotional-stress-a1793",
    "https://www.yamamotonutrition.com/int/blog/post/the-secret-of-youthfulness-for-quality-ageing-a1977",
];

async function scrapeArticle(browser, url) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        const data = await page.evaluate(() => {
            const title = document.querySelector('h1')?.textContent?.trim() || '';

            // Find the main article content - more specific selector
            const articleContent = document.querySelector('.blog-post-view') ||
                                 document.querySelector('.post-full-content') ||
                                 document.querySelector('[class*="article"]') ||
                                 document.querySelector('article');

            if (!articleContent) {
                return { title, content: '' };
            }

            // Get only paragraphs that are direct content (not in footer/header/nav)
            const texts = [];
            const paragraphs = articleContent.querySelectorAll('p, h2, h3');

            paragraphs.forEach(p => {
                // Skip if inside footer, nav, or cookie banner
                if (p.closest('footer, nav, .cookie, .menu, .navigation')) {
                    return;
                }

                const text = p.textContent.trim();
                // Skip obvious menu/UI elements but be less strict on length
                if (text && text.length > 30 &&
                    !text.match(/Cookie|Durée maximale|Type:|En attente|HTTP|HTML|fournisseur|conservation/i) &&
                    !text.match(/^(Brand|See all|Shipping|You have no items)/)) {
                    texts.push(text);
                }
            });

            return {
                title,
                content: texts.join('\n\n')
            };
        });

        await page.close();
        return data;

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        await page.close();
        return null;
    }
}

async function main() {
    console.log('Loading Yamamoto articles...');
    console.log(`Total: ${ARTICLES.length} articles`);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

    const articles = [];

    for (let i = 0; i < ARTICLES.length; i++) {
        const url = ARTICLES[i];
        const slug = url.split('/').pop().substring(0, 50);
        process.stdout.write(`[${i + 1}/${ARTICLES.length}] ${slug}... `);

        const article = await scrapeArticle(browser, url);

        if (!article || !article.content) {
            console.log('SKIP');
            continue;
        }

        const wordCount = article.content.split(/\s+/).length;
        console.log(`(${wordCount} words) OK`);

        if (wordCount < 300) {
            console.log('SKIP (too short)');
            continue;
        }

        articles.push({
            url,
            slug,
            title: article.title,
            content: article.content,
            wordCount
        });
    }

    await browser.close();

    // Save
    const output = '/Users/achzod/Desktop/neurocore/yamamoto_scraped.json';
    fs.writeFileSync(output, JSON.stringify(articles, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(50));
    console.log(`Scraping complete!`);
    console.log(`Articles scraped: ${articles.length}`);
    console.log(`Output: ${output}`);
    console.log(`Total words: ${articles.reduce((sum, a) => sum + a.wordCount, 0)}`);
}

main();
