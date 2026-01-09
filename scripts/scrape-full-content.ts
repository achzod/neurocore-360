import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import pLimit from 'p-limit';

interface Article {
  title: string;
  url: string;
  category: string;
  author: string;
  excerpt: string;
  imageUrl?: string;
  content?: string;
}

const limit = pLimit(5); // 5 articles en parallèle max

async function scrapeArticleContent(url: string, browser: any): Promise<string> {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const content = await page.evaluate(() => {
      // Chercher le contenu de l'article
      const contentEl = document.querySelector('.post-content, .entry-content, article .content, .blog-post-content');

      if (contentEl) {
        // Nettoyer le HTML
        const clone = contentEl.cloneNode(true) as HTMLElement;

        // Supprimer les scripts, styles, ads
        clone.querySelectorAll('script, style, .ad, .advertisement').forEach(el => el.remove());

        // Retourner le texte propre
        return clone.innerText.trim();
      }

      // Fallback: chercher tous les paragraphes
      const paragraphs = Array.from(document.querySelectorAll('article p, .post p'));
      return paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
    });

    await page.close();
    return content;

  } catch (error) {
    console.error(`    ❌ Erreur sur ${url}:`, error);
    await page.close();
    return '';
  }
}

async function scrapeAllContent() {
  console.log('📖 Démarrage du scraping du contenu complet...\n');

  // Charger la liste des articles
  const articlesRaw = readFileSync('/Users/achzod/Desktop/neurocore/yamamoto-all-articles.json', 'utf8');
  const articles: Article[] = JSON.parse(articlesRaw);

  console.log(`📚 ${articles.length} articles à scraper\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Scraper en parallèle (5 à la fois)
  const promises = articles.map((article, index) =>
    limit(async () => {
      console.log(`[${index + 1}/${articles.length}] ${article.title}`);

      const content = await scrapeArticleContent(article.url, browser);

      if (content) {
        article.content = content;
        console.log(`  ✅ ${content.length} chars`);
      } else {
        console.log(`  ⚠️  Contenu vide`);
      }

      return article;
    })
  );

  const results = await Promise.all(promises);

  await browser.close();

  // Sauvegarder
  writeFileSync(
    '/Users/achzod/Desktop/neurocore/yamamoto-full-content.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n✅ Scraping contenu terminé!`);
  console.log(`💾 Sauvegardé dans yamamoto-full-content.json`);
}

scrapeAllContent().catch(console.error);
