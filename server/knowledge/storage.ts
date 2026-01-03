/**
 * NEUROCORE 360 - Knowledge Base Storage
 * Stockage des articles scrapés pour l'apprentissage IA
 */

import { pool } from "../db";

export interface ScrapedArticle {
  id?: string;
  source:
    | "huberman"
    | "sbs"
    | "applied_metabolics"
    | "newsletter"
    | "examine"
    | "peter_attia"
    | "marek_health"
    | "chris_masterjohn"
    | "renaissance_periodization"
    | "mpmd";
  title: string;
  content: string;
  url: string;
  category?: string; // "sommeil", "hormones", "nutrition", "bloodwork", etc.
  keywords?: string[];
  scrapedAt: Date;
  contentHash?: string; // Pour détecter les doublons
}

export interface KnowledgeStats {
  totalArticles: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  lastScraped: Record<string, Date | null>;
}

/**
 * Initialise la table knowledge_base si elle n'existe pas
 */
export async function initKnowledgeTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      category VARCHAR(100),
      keywords TEXT[],
      content_hash VARCHAR(64),
      scraped_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(content_hash)
    )
  `);

  // Index pour recherche full-text
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_kb_source ON knowledge_base(source);
    CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
    CREATE INDEX IF NOT EXISTS idx_kb_keywords ON knowledge_base USING GIN(keywords);
  `).catch(() => {}); // Ignore si déjà existe

  console.log("[Knowledge] Table initialized");
}

/**
 * Génère un hash pour détecter les doublons
 */
function generateContentHash(content: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(content.substring(0, 5000)).digest("hex");
}

/**
 * Sauvegarde un article dans la base
 */
export async function saveArticle(article: ScrapedArticle): Promise<{ saved: boolean; duplicate: boolean }> {
  const contentHash = generateContentHash(article.content);

  try {
    await pool.query(
      `INSERT INTO knowledge_base (source, title, content, url, category, keywords, content_hash, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (content_hash) DO NOTHING`,
      [
        article.source,
        article.title,
        article.content,
        article.url,
        article.category || null,
        article.keywords || [],
        contentHash,
        article.scrapedAt
      ]
    );
    return { saved: true, duplicate: false };
  } catch (error: any) {
    if (error.code === "23505") {
      return { saved: false, duplicate: true };
    }
    throw error;
  }
}

/**
 * Sauvegarde plusieurs articles
 */
export async function saveArticles(articles: ScrapedArticle[]): Promise<{ saved: number; duplicates: number }> {
  let saved = 0;
  let duplicates = 0;

  for (const article of articles) {
    const result = await saveArticle(article);
    if (result.saved) saved++;
    if (result.duplicate) duplicates++;
  }

  return { saved, duplicates };
}

/**
 * Recherche par mots-clés
 */
export async function searchArticles(
  keywords: string[],
  limit: number = 5,
  sources?: string[]
): Promise<ScrapedArticle[]> {
  const keywordsPattern = keywords.map(k => k.toLowerCase()).join("|");

  let query = `
    SELECT * FROM knowledge_base
    WHERE (
      LOWER(title) ~* $1
      OR LOWER(content) ~* $1
      OR keywords && $2::text[]
    )
  `;

  const params: any[] = [keywordsPattern, keywords.map(k => k.toLowerCase())];

  if (sources && sources.length > 0) {
    query += ` AND source = ANY($3)`;
    params.push(sources);
  }

  query += ` ORDER BY scraped_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    category: row.category,
    keywords: row.keywords,
    scrapedAt: row.scraped_at
  }));
}

/**
 * Recherche full-text avancée
 */
export async function searchFullText(
  query: string,
  limit: number = 5
): Promise<ScrapedArticle[]> {
  const result = await pool.query(
    `SELECT *,
      ts_rank(to_tsvector('french', content), plainto_tsquery('french', $1)) as rank
     FROM knowledge_base
     WHERE to_tsvector('french', content) @@ plainto_tsquery('french', $1)
        OR to_tsvector('french', title) @@ plainto_tsquery('french', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    [query, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    category: row.category,
    keywords: row.keywords,
    scrapedAt: row.scraped_at
  }));
}

/**
 * Liste tous les articles (avec pagination)
 */
export async function listArticles(
  offset: number = 0,
  limit: number = 50,
  source?: string
): Promise<ScrapedArticle[]> {
  let query = `SELECT * FROM knowledge_base`;
  const params: any[] = [];

  if (source) {
    query += ` WHERE source = $1`;
    params.push(source);
  }

  query += ` ORDER BY scraped_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    category: row.category,
    keywords: row.keywords,
    scrapedAt: row.scraped_at
  }));
}

/**
 * Statistiques de la base
 */
export async function getStats(): Promise<KnowledgeStats> {
  const totalResult = await pool.query(`SELECT COUNT(*) as count FROM knowledge_base`);
  const bySourceResult = await pool.query(`SELECT source, COUNT(*) as count FROM knowledge_base GROUP BY source`);
  const byCategoryResult = await pool.query(`SELECT category, COUNT(*) as count FROM knowledge_base WHERE category IS NOT NULL GROUP BY category`);
  const lastScrapedResult = await pool.query(`SELECT source, MAX(scraped_at) as last FROM knowledge_base GROUP BY source`);

  const bySource: Record<string, number> = {};
  for (const row of bySourceResult.rows) {
    bySource[row.source] = parseInt(row.count);
  }

  const byCategory: Record<string, number> = {};
  for (const row of byCategoryResult.rows) {
    if (row.category) byCategory[row.category] = parseInt(row.count);
  }

  const lastScraped: Record<string, Date | null> = {};
  for (const row of lastScrapedResult.rows) {
    lastScraped[row.source] = row.last;
  }

  return {
    totalArticles: parseInt(totalResult.rows[0].count),
    bySource,
    byCategory,
    lastScraped
  };
}

/**
 * Supprime les articles d'une source
 */
export async function clearSource(source: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM knowledge_base WHERE source = $1`,
    [source]
  );
  return result.rowCount || 0;
}

/**
 * Récupère un article par ID
 */
export async function getArticleById(id: string): Promise<ScrapedArticle | null> {
  const result = await pool.query(
    `SELECT * FROM knowledge_base WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    category: row.category,
    keywords: row.keywords,
    scrapedAt: row.scraped_at
  };
}
