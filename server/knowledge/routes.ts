/**
 * NEUROCORE 360 - Knowledge Base API Routes
 * Endpoints pour gérer la base de connaissances IA
 */

import { Express } from "express";
import {
  initKnowledgeTable,
  searchArticles,
  searchFullText,
  listArticles,
  getStats,
  clearSource,
  getArticleById
} from "./storage";
import {
  scrapeSource,
  buildKnowledgeBase,
  ScraperSource
} from "./scraper";

export function registerKnowledgeRoutes(app: Express): void {
  // Initialize table on startup
  initKnowledgeTable().catch(err => {
    console.error("[Knowledge] Failed to init table:", err);
  });

  /**
   * GET /api/knowledge/status
   * Statistiques de la base de connaissances
   */
  app.get("/api/knowledge/status", async (req, res) => {
    try {
      const stats = await getStats();
      res.json({
        success: true,
        ...stats,
        sources: {
          huberman: { name: "Huberman Lab", url: "https://www.hubermanlab.com" },
          sbs: { name: "Stronger By Science", url: "https://www.strongerbyscience.com" },
          applied_metabolics: { name: "Applied Metabolics", url: "https://www.appliedmetabolics.com" },
          examine: { name: "Examine.com", url: "https://examine.com" },
          peter_attia: { name: "Peter Attia - The Drive", url: "https://peterattiamd.com" },
          marek_health: { name: "Marek Health", url: "https://marekhealth.com" },
          chris_masterjohn: { name: "Chris Masterjohn PhD", url: "https://chrismasterjohnphd.com" },
          renaissance_periodization: { name: "Renaissance Periodization", url: "https://rpstrength.com" },
          mpmd: { name: "More Plates More Dates", url: "https://moreplatesmoredates.com" },
          newsletter: { name: "Newsletters ACHZOD", url: "SendPulse" }
        }
      });
    } catch (error) {
      console.error("[Knowledge Status] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/knowledge/build
   * Lance le scraping complet de toutes les sources
   */
  app.post("/api/knowledge/build", async (req, res) => {
    try {
      console.log("[Knowledge] Starting full build...");
      res.json({
        success: true,
        message: "Build lancé en arrière-plan",
        note: "Ce processus peut prendre plusieurs minutes"
      });

      // Run in background
      buildKnowledgeBase()
        .then(result => {
          console.log("[Knowledge] Build complete:", result);
        })
        .catch(err => {
          console.error("[Knowledge] Build failed:", err);
        });
    } catch (error) {
      console.error("[Knowledge Build] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * POST /api/knowledge/scrape/:source
   * Scrape une source spécifique
   */
  app.post("/api/knowledge/scrape/:source", async (req, res) => {
    try {
      const source = req.params.source as ScraperSource;
      const limit = parseInt(req.query.limit as string) || 20;

      const validSources = [
        "huberman", "sbs", "applied_metabolics", "newsletter",
        "examine", "peter_attia", "marek_health", "chris_masterjohn",
        "renaissance_periodization", "mpmd", "all"
      ];

      if (!validSources.includes(source)) {
        res.status(400).json({
          success: false,
          error: "Source invalide",
          validSources
        });
        return;
      }

      console.log(`[Knowledge] Starting scrape for ${source}...`);

      // For "all", run in background
      if (source === "all") {
        res.json({
          success: true,
          message: `Scraping de toutes les sources lancé en arrière-plan`,
          note: "Ce processus peut prendre plusieurs minutes"
        });

        scrapeSource(source, limit)
          .then(result => {
            console.log(`[Knowledge] ${source} scrape complete:`, result.saved, "saved");
          })
          .catch(err => {
            console.error(`[Knowledge] ${source} scrape failed:`, err);
          });
        return;
      }

      // For single source, wait for result
      const result = await scrapeSource(source, limit);

      res.json({
        success: true,
        source,
        articlesScraped: result.articles.length,
        saved: result.saved,
        duplicates: result.duplicates
      });
    } catch (error) {
      console.error("[Knowledge Scrape] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/knowledge/search
   * Recherche par mots-clés
   */
  app.get("/api/knowledge/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 5;
      const sources = req.query.sources
        ? (req.query.sources as string).split(",")
        : undefined;

      if (!query) {
        res.status(400).json({ success: false, error: "Paramètre 'q' requis" });
        return;
      }

      // Split query into keywords
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

      const articles = await searchArticles(keywords, limit, sources);

      res.json({
        success: true,
        query,
        keywords,
        count: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          source: a.source,
          title: a.title,
          category: a.category,
          keywords: a.keywords,
          url: a.url,
          preview: a.content.substring(0, 500) + "...",
          scrapedAt: a.scrapedAt
        }))
      });
    } catch (error) {
      console.error("[Knowledge Search] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/knowledge/search/full
   * Recherche full-text avancée
   */
  app.get("/api/knowledge/search/full", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 5;

      if (!query) {
        res.status(400).json({ success: false, error: "Paramètre 'q' requis" });
        return;
      }

      const articles = await searchFullText(query, limit);

      res.json({
        success: true,
        query,
        count: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          source: a.source,
          title: a.title,
          category: a.category,
          url: a.url,
          preview: a.content.substring(0, 500) + "...",
          scrapedAt: a.scrapedAt
        }))
      });
    } catch (error) {
      console.error("[Knowledge Full Search] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/knowledge/articles
   * Liste tous les articles (paginé)
   */
  app.get("/api/knowledge/articles", async (req, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;
      const source = req.query.source as string | undefined;

      const articles = await listArticles(offset, limit, source);

      res.json({
        success: true,
        offset,
        limit,
        count: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          source: a.source,
          title: a.title,
          category: a.category,
          keywords: a.keywords,
          url: a.url,
          contentLength: a.content.length,
          scrapedAt: a.scrapedAt
        }))
      });
    } catch (error) {
      console.error("[Knowledge List] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * GET /api/knowledge/articles/:id
   * Récupère un article complet par ID
   */
  app.get("/api/knowledge/articles/:id", async (req, res) => {
    try {
      const article = await getArticleById(req.params.id);

      if (!article) {
        res.status(404).json({ success: false, error: "Article non trouvé" });
        return;
      }

      res.json({ success: true, article });
    } catch (error) {
      console.error("[Knowledge Article] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  /**
   * DELETE /api/knowledge/source/:source
   * Supprime tous les articles d'une source
   */
  app.delete("/api/knowledge/source/:source", async (req, res) => {
    try {
      const source = req.params.source;
      const deleted = await clearSource(source);

      res.json({
        success: true,
        source,
        deleted
      });
    } catch (error) {
      console.error("[Knowledge Delete] Error:", error);
      res.status(500).json({ success: false, error: "Erreur serveur" });
    }
  });

  console.log("[Knowledge] Routes registered");
}
