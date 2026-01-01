/**
 * Configuration Gemini AI - Version Render (sans Replit AI Integration)
 * Utilise directement la clé API Gemini standard
 */

export const GEMINI_CONFIG = {
  // Clé API Gemini (priorité: GEMINI_API_KEY standard, fallback vers ancienne config Replit)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  
  // Modèle à utiliser
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-pro",
  
  // Pas besoin de base URL custom pour l'API standard
  GEMINI_BASE_URL: "",
  
  // Paramètres de génération
  GEMINI_TEMPERATURE: 0.7,
  GEMINI_MAX_TOKENS: 8192,
  
  // Retry config
  GEMINI_MAX_RETRIES: 3,
  GEMINI_SLEEP_BETWEEN: 2, // secondes
};

// Validation au démarrage
if (!GEMINI_CONFIG.GEMINI_API_KEY) {
  console.error('[Gemini] ⚠️ GEMINI_API_KEY not configured - AI features will fail');
} else {
  console.log(`[Gemini] ✅ Configured with model: ${GEMINI_CONFIG.GEMINI_MODEL}`);
}
