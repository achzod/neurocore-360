/**
 * NEUROCORE 360 - Configuration centralisée
 */

export const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: "gemini-2.5-pro-preview-05-06",
  GEMINI_TEMPERATURE: 0.85,
  GEMINI_MAX_TOKENS: 8000,
  GEMINI_MAX_RETRIES: 3,
  GEMINI_SLEEP_BETWEEN: 5,

  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  DATABASE_URL: process.env.DATABASE_URL,

  MAX_PHOTO_SIZE: 10 * 1024 * 1024,
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};
