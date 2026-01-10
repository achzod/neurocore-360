#!/usr/bin/env python3
"""
Scrape Yamamoto articles using Puppeteer + translate to French
"""

import json
import time
import asyncio
import re
from pyppeteer import launch
from deep_translator import GoogleTranslator

# Top 30 SEO articles
ARTICLES = [
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
]

IMAGES = {
    "creatine": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800",
    "beta-alanine": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    "ashwagandha": "https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=800",
    "guarana": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    "amino": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800",
    "probiotic": "https://images.unsplash.com/photo-1563213126-a4273aed2016?w=800",
    "supplement": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    "carbohydrate": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
    "protein": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800",
    "hydration": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800",
    "cycling": "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800",
    "tennis": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
    "sprint": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800",
    "winter": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800",
    "energy": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    "hypertrophy": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    "training": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",
    "shoulder": "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=800",
    "leg": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800",
    "back": "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=800",
    "pump": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",
    "cross": "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800",
    "triathlon": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800",
    "swimming": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800",
    "padel": "https://images.unsplash.com/photo-1612534847738-b3af6bc8e3dc?w=800",
    "altitude": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
    "stress": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    "aging": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
}

def get_image(slug):
    for key, url in IMAGES.items():
        if key in slug.lower():
            return url
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"

def translate_text(text, max_chunk=4500):
    if not text or len(text.strip()) == 0:
        return ""

    translator = GoogleTranslator(source='en', target='fr')

    if len(text) <= max_chunk:
        try:
            return translator.translate(text)
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    # Split into chunks
    chunks = []
    current_chunk = ""
    sentences = text.replace('. ', '.|').split('|')

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_chunk:
            current_chunk += sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = sentence
    if current_chunk:
        chunks.append(current_chunk)

    translated_chunks = []
    for chunk in chunks:
        try:
            translated = translator.translate(chunk)
            translated_chunks.append(translated)
            time.sleep(0.3)
        except Exception as e:
            print(f"Chunk error: {e}")
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)

async def scrape_article(browser, url):
    page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    try:
        await page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 60000})
        await page.waitFor(2000)

        # Get title
        title = await page.evaluate('''() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent.trim() : '';
        }''')

        # Get content
        content = await page.evaluate('''() => {
            const article = document.querySelector('article') || document.querySelector('.article-content') || document.querySelector('.post-content');
            if (!article) return '';

            const paragraphs = article.querySelectorAll('p, h2, h3, li');
            const texts = [];

            paragraphs.forEach(p => {
                const text = p.textContent.trim();
                if (text && text.length > 20) {
                    texts.push(text);
                }
            });

            return texts.join('\\n\\n');
        }''')

        await page.close()

        return {
            'title': title,
            'content': content,
            'url': url
        }

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        await page.close()
        return None

async def main():
    print("Scraping Yamamoto articles...")
    print(f"Total: {len(ARTICLES)}")

    browser = await launch(headless=True, args=['--no-sandbox'])

    articles_data = []

    for i, url in enumerate(ARTICLES, 1):
        slug = url.split('/')[-1][:50]
        print(f"[{i}/{len(ARTICLES)}] {slug}...", end=" ", flush=True)

        article = await scrape_article(browser, url)

        if not article or not article['content']:
            print("SKIP")
            continue

        word_count = len(article['content'].split())
        print(f"({word_count} words)", end=" ", flush=True)

        if word_count < 300:
            print("SKIP (short)")
            continue

        # Translate
        try:
            title_fr = translate_text(article['title'])
            time.sleep(0.2)
            content_fr = translate_text(article['content'])

            excerpt_fr = content_fr[:250].rsplit(' ', 1)[0] + "..."
            fr_words = len(content_fr.split())

            print(f"OK ({fr_words} words FR)")

            slug_clean = url.split('/')[-1].replace('-a1', '-').replace('-a', '-')[:50]

            articles_data.append({
                'id': f"yam-{i}",
                'slug': f"yam-{slug_clean}",
                'title': title_fr,
                'excerpt': excerpt_fr,
                'content': content_fr,
                'author': 'ACHZOD',
                'date': '2025-01-10',
                'category': 'Nutrition',
                'imageUrl': get_image(slug),
                'wordCount': fr_words
            })

            time.sleep(0.5)

        except Exception as e:
            print(f"ERROR: {e}")

    await browser.close()

    # Save
    output = '/Users/achzod/Desktop/neurocore/yamamoto_translated.json'
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(articles_data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Complete! {len(articles_data)} articles")
    print(f"Output: {output}")
    total_words = sum(a['wordCount'] for a in articles_data)
    print(f"Total words: {total_words}")

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(main())
