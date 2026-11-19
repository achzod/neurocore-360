/**
 * Règles d'indexation des pages de parcours (questionnaires, uploads, checkout).
 *
 * Partagé entre le rendu serveur (server/static.ts) et le routeur client
 * (client/src/App.tsx). Avant, le client réécrivait le canonical de chaque
 * route vers sa propre URL après hydratation : sur /peptides-engine, Google
 * voyait donc « noindex » côté serveur puis un canonical auto-référent côté
 * rendu JS. Le client lit maintenant ces règles et garde le canonical serveur.
 */

const BASE_URL = "https://apexlabs.achzodcoaching.com";

/** Pages de flow dont la version indexable est une autre URL (landing d'offre). */
export const FLOW_CANONICAL_OVERRIDES: Readonly<Record<string, string>> = {
  "/peptides-engine": "/offers/peptides-engine",
  "/audit-complet/questionnaire": "/questionnaire",
  "/formcheck/upload": "/offers/formcheck",
  "/blood-analysis": "/offers/blood-analysis",
};

/** Pages fonctionnelles, privées ou de conversion : toujours noindex, follow. */
export const NOINDEX_PATH_PATTERNS: readonly RegExp[] = [
  /^\/ads\/discovery-scan$/,
  /^\/apexlabs$/,
  /^\/audit-complet$/,
  /^\/peptides-engine$/,
  /^\/peptides-preview$/,
  /^\/questionnaire$/,
  /^\/audit-complet\/questionnaire$/,
  /^\/audit-complet\/checkout$/,
  /^\/formcheck\/upload$/,
  /^\/blood-analysis$/,
  /^\/dashboard(?:\/|$)/,
  /^\/blood-dashboard(?:\/|$)/,
  /^\/analysis(?:\/|$)/,
  /^\/blood-report(?:\/|$)/,
  /^\/blood-analysis\/.+/,
  /^\/scan\/.+/,
  /^\/anabolic\/.+/,
  /^\/ultimate\/.+/,
  /^\/peptides\/.+/,
  /^\/report(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/login$/,
  /^\/admin(?:\/|$)/,
  /^\/conversions(?:\/|$)/,
  /^\/test$/,
];

function normalizePath(pathname: string): string {
  const withoutQuery = String(pathname || "/").split(/[?#]/)[0] || "/";
  const trimmed = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
  return trimmed || "/";
}

export function isNoindexPath(pathname: string): boolean {
  const p = normalizePath(pathname);
  return NOINDEX_PATH_PATTERNS.some((pattern) => pattern.test(p));
}

/** URL canonique absolue pour un chemin (override de flow, sinon l'URL elle-même). */
export function canonicalUrlFor(pathname: string): string {
  const p = normalizePath(pathname);
  const target = FLOW_CANONICAL_OVERRIDES[p] ?? p;
  return `${BASE_URL}${target === "/" ? "" : target}`;
}
