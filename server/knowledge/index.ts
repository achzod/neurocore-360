/**
 * NEUROCORE 360 - Knowledge Base Module
 * Export principal pour l'intégration
 */

export { registerKnowledgeRoutes } from "./routes";
export {
  initKnowledgeTable,
  saveArticle,
  saveArticles,
  searchArticles,
  searchFullText,
  listArticles,
  getStats,
  clearSource,
  getArticleById,
  type ScrapedArticle,
  type KnowledgeStats
} from "./storage";
export {
  scrapeHuberman,
  scrapeSBS,
  scrapeAppliedMetabolics,
  scrapeSendPulseNewsletters,
  scrapeSource,
  buildKnowledgeBase,
  type ScraperSource
} from "./scraper";
export {
  extractKeywordsFromProfile,
  searchKnowledgeForProfile,
  searchForSection,
  generateKnowledgeContext,
  SEARCH_PATTERNS
} from "./search";
