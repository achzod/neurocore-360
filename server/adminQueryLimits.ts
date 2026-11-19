/**
 * Garde-fous mémoire pour les routes admin.
 *
 * Le 2026-11-19 (13:23 Dubaï), une salve d'appels admin (orders?limit=2000,
 * cta-stats, promo-deliverability-audit, email-stats, conversion-stats,
 * incomplete-questionnaires) a fait tomber le process (exit 134, heap V8 plein).
 * Toute route admin qui liste des lignes passe par ces bornes : jamais plus de
 * ADMIN_MAX_PAGE_SIZE lignes par réponse, pagination par offset.
 */
export const ADMIN_MAX_PAGE_SIZE = 200;

function toInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

/** Borne un `limit` de query string entre 1 et `max` (200 par défaut). */
export function clampAdminLimit(value: unknown, fallback = 50, max = ADMIN_MAX_PAGE_SIZE): number {
  const n = toInt(value);
  if (n === undefined || n < 1) return Math.min(fallback, max);
  return Math.min(n, max);
}

/** Offset >= 0, plafonné pour éviter des scans OFFSET absurdes. */
export function clampAdminOffset(value: unknown, max = 1_000_000): number {
  const n = toInt(value);
  if (n === undefined || n < 0) return 0;
  return Math.min(n, max);
}

/** Borne générique pour un paramètre numérique de query string. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = toInt(value);
  if (n === undefined) return fallback;
  return Math.min(Math.max(n, min), max);
}
