export interface PeptauraPreflightListing {
  name?: string;
  enabled: boolean;
  suspended: boolean;
  outOfStock: boolean;
  orderingMode: string;
  shippingOptionCount: number;
}

export interface PeptauraPreflightSnapshot {
  slug: string;
  live: boolean;
  listings: PeptauraPreflightListing[];
}

export interface PeptauraPreflightContext {
  country: string;
  liveCatalogSlugs: string[] | null;
  catalogSnapshots: PeptauraPreflightSnapshot[];
  shippingAvailability: { live: boolean };
  enclomipheneSource: { available: boolean } | null;
}

export interface PeptauraGenerationPreflightResult {
  ok: boolean;
  reason: "ready" | "source_unavailable";
  requiredProducts: string[];
  missingProducts: string[];
  errors: string[];
}

export class PeptauraSourceUnavailableError extends Error {
  readonly code = "PEPTAURA_SOURCE_UNAVAILABLE";
  readonly preflight: PeptauraGenerationPreflightResult;

  constructor(preflight: PeptauraGenerationPreflightResult) {
    super(`PEPTAURA_SOURCE_UNAVAILABLE: ${preflight.errors.join(" | ")}`);
    this.name = "PeptauraSourceUnavailableError";
    this.preflight = preflight;
  }
}

const LIKELY_PRODUCTS_BY_GOAL: Record<string, string[]> = {
  recovery: ["BPC-157", "TB-500"],
  "gh-antiaging": ["CJC-1295 (no DAC)", "Ipamorelin"],
  fatloss: ["Retatrutide", "Semaglutide", "Tirzepatide"],
  sleep: ["DSIP"],
  cognitive: ["Semax", "Selank"],
  libido: ["PT-141"],
  "testo-boost": ["KissPeptin-10"],
  "skin-hair": ["GHK-Cu"],
  endurance: ["MOTS-c", "SS-31"],
};

const KNOWN_REQUESTABLE_PRODUCTS = Array.from(new Set(
  Object.values(LIKELY_PRODUCTS_BY_GOAL).flat(),
));

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]+/g, "")
    .replace("sansdac", "nodac")
    .replace("avecdac", "withdac");
}

function collectRequiredProducts(responses: Record<string, unknown>): string[] {
  const requestedRaw = [responses.pep_requested_peptides, responses.pep_current_peptides]
    .flatMap((value) => Array.isArray(value) ? value.map(String) : [String(value || "")])
    .join(" | ");
  const requestedKey = normalize(requestedRaw);
  const explicitlyRequested = KNOWN_REQUESTABLE_PRODUCTS.filter((product) =>
    requestedKey.includes(normalize(product)),
  );
  const primary = String(responses.pep_primary_goal || responses.objectifPrincipal || "").trim();
  const secondaryRaw = responses.pep_secondary_goals || responses.objectifSecondaire;
  const secondary = Array.isArray(secondaryRaw)
    ? secondaryRaw.map(String)
    : String(secondaryRaw || "").split(/[,;|]/).map((value) => value.trim());
  const likely = [primary, ...secondary]
    .filter(Boolean)
    .flatMap((goal) => LIKELY_PRODUCTS_BY_GOAL[goal] || []);
  return Array.from(new Set([...explicitlyRequested, ...likely]));
}

function findSnapshot(
  product: string,
  snapshots: PeptauraPreflightSnapshot[],
): PeptauraPreflightSnapshot | null {
  const productKey = normalize(product);
  const scored = snapshots.map((snapshot) => {
    const candidateKeys = [snapshot.slug, ...snapshot.listings.map((listing) => listing.name || "")]
      .map(normalize)
      .filter(Boolean);
    const exact = candidateKeys.some((key) => key === productKey);
    const partial = candidateKeys.some((key) => key.includes(productKey) || productKey.includes(key));
    return { snapshot, score: exact ? 2 : partial ? 1 : 0 };
  }).sort((a, b) => b.score - a.score)[0];
  return scored?.score ? scored.snapshot : null;
}

export function evaluatePeptauraGenerationPreflight(
  responses: Record<string, unknown>,
  context: PeptauraPreflightContext,
): PeptauraGenerationPreflightResult {
  const requiredProducts = collectRequiredProducts(responses);
  const missingProducts = requiredProducts.filter((product) => {
    const snapshot = findSnapshot(product, context.catalogSnapshots);
    return !snapshot || !snapshot.live || !snapshot.listings.some((listing) =>
      listing.enabled
      && !listing.suspended
      && !listing.outOfStock
      && listing.orderingMode === "available"
      && listing.shippingOptionCount > 0
    );
  });
  const errors: string[] = [];
  if (!context.liveCatalogSlugs || context.liveCatalogSlugs.length === 0) {
    errors.push("catalogue_live_indisponible");
  }
  if (!context.shippingAvailability.live) {
    errors.push(`shipping_live_indisponible:${context.country}`);
  }
  if (missingProducts.length > 0) {
    errors.push(`pages_produit_live_manquantes:${missingProducts.join(",")}`);
  }
  if (
    String(responses.pep_testo_bloodwork || "").trim().toLowerCase() === "recent-low"
    && !context.enclomipheneSource?.available
  ) {
    errors.push("source_enclomiphene_indisponible");
  }
  return {
    ok: errors.length === 0,
    reason: errors.length === 0 ? "ready" : "source_unavailable",
    requiredProducts,
    missingProducts,
    errors,
  };
}

export function assertPeptauraGenerationPreflight(
  responses: Record<string, unknown>,
  context: PeptauraPreflightContext,
): PeptauraGenerationPreflightResult {
  const result = evaluatePeptauraGenerationPreflight(responses, context);
  if (!result.ok) throw new PeptauraSourceUnavailableError(result);
  return result;
}
