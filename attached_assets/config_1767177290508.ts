/**
 * NEUROCORE 360 - Configuration centralisée
 */

export const CONFIG = {
  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "AIzaSyCYpRQifyhMTFu-q0dihbomcOdB0eaogc4",
  GEMINI_MODEL: "gemini-3-pro-preview",
  GEMINI_TEMPERATURE: 0.85,
  GEMINI_MAX_TOKENS: 8000,
  GEMINI_MAX_RETRIES: 3,
  GEMINI_SLEEP_BETWEEN: 5, // secondes

  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database (si nécessaire)
  DATABASE_URL: process.env.DATABASE_URL,

  // Photos
  MAX_PHOTO_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};


