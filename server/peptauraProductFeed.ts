export const PEPTAURA_PRODUCT_FEED_URL = "https://www.peptaura.com/pages/product-feed";

export interface PeptauraFeedPriceTier {
  price: number;
  minQty: number;
}

export interface PeptauraFeedListing {
  id: number;
  name: string;
  dosage: string;
  supplier: string;
  supplierDisplayName: string;
  outOfStock: boolean;
  form: string;
  priceTiers: PeptauraFeedPriceTier[];
  warehouse: string;
  shippingOptionCount: number;
  orderingMode: string;
  enabled: boolean;
  suspended: boolean;
  boxSize: number;
  marginRate: number;
  productUrl: string;
}

export interface PeptauraFeedProductSnapshot {
  slug: string;
  url: string;
  listings: PeptauraFeedListing[];
  fetchedAt: string;
  live: boolean;
  source: "product_feed";
  sourceGeneratedAt: string;
}

export interface ParsedPeptauraProductFeed {
  generatedAt: string;
  snapshots: PeptauraFeedProductSnapshot[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function parsePositiveUsd(value: unknown): number | null {
  const match = String(value || "").trim().match(/^(\d+(?:\.\d{1,2})?)\s+USD$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseBoxSize(product: UnknownRecord): number | null {
  const description = String(product.description || "");
  const id = String(product.id || "");
  const descriptionMatch = description.match(/\bbox\s+of\s+(\d+)\s+vials?\b/i);
  const idMatch = id.match(/-box-(\d+)$/i);
  const parsed = Number(descriptionMatch?.[1] || idMatch?.[1] || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseProductId(value: unknown): number | null {
  const match = String(value || "").match(/\/product\/(\d+)-/i);
  const parsed = Number(match?.[1] || 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function canonicalProductUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value || ""));
    if (
      url.origin !== "https://www.peptaura.com"
      || url.username
      || url.password
    ) return null;
    if (!/^\/product\/\d+-[a-z0-9-]+$/i.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalGroupSlug(value: unknown): string | null {
  const match = String(value || "").trim().match(/^group-([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return match?.[1] || null;
}

function slugifyGroupTitle(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidShippingEntry(value: unknown): value is string {
  return typeof value === "string"
    && /^[A-Z]{2}:[A-Z]+:.+:\d+(?:\.\d{1,2})? USD$/.test(value.trim());
}

function catalogUrl(slug: string): string {
  return `https://www.peptaura.com/catalog/${encodeURIComponent(slug).replace(/%2B/g, "+")}`;
}

function isStringTrue(value: unknown): boolean {
  return value === true || String(value || "").toLowerCase() === "true";
}

/**
 * Parse Peptaura's public, robots-advertised product feed. The feed is only
 * accepted when its identity, freshness and each retained price/link can be
 * verified. Invalid entries are dropped rather than guessed or repaired.
 */
export function parsePeptauraProductFeed(
  raw: string,
  options: { nowMs?: number; maxAgeMs: number; fetchedAt?: string },
): ParsedPeptauraProductFeed | null {
  let document: UnknownRecord;
  try {
    const parsed = JSON.parse(raw);
    const record = asRecord(parsed);
    if (!record) return null;
    document = record;
  } catch {
    return null;
  }

  const merchant = asRecord(document.merchant);
  if (
    document.version !== "openai-product-feed-v1"
    || merchant?.name !== "Peptaura"
    || merchant?.base_url !== "https://www.peptaura.com"
  ) {
    return null;
  }

  const generatedAt = String(document.generated_at || "");
  const generatedAtMs = Date.parse(generatedAt);
  const nowMs = options.nowMs ?? Date.now();
  const ageMs = nowMs - generatedAtMs;
  if (
    !Number.isFinite(nowMs)
    || !Number.isFinite(options.maxAgeMs)
    || options.maxAgeMs < 0
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(generatedAt)
    || !Number.isFinite(generatedAtMs)
    || ageMs < -5 * 60_000
    || ageMs > options.maxAgeMs
  ) {
    return null;
  }

  const fetchedAtMs = options.fetchedAt == null
    ? nowMs
    : Date.parse(options.fetchedAt);
  if (
    !Number.isFinite(fetchedAtMs)
    || Math.abs(fetchedAtMs - nowMs) > 5 * 60_000
  ) {
    return null;
  }

  const products = Array.isArray(document.products) ? document.products : [];
  const byGroup = new Map<string, PeptauraFeedListing[]>();
  for (const rawProduct of products) {
    const product = asRecord(rawProduct);
    if (!product) continue;
    const slug = String(product.item_group_title || "").trim();
    const groupSlug = canonicalGroupSlug(product.item_group_id);
    const productUrl = canonicalProductUrl(product.link);
    const id = parseProductId(productUrl);
    const price = parsePositiveUsd(product.price);
    const boxSize = parseBoxSize(product);
    const supplier = String(product.seller_name || product.brand || "").trim();
    const dosage = String(product.size || product.weight || "").replace(/\s+/g, "").trim();
    const shipping = Array.isArray(product.shipping)
      ? product.shipping.filter(isValidShippingEntry)
      : [];
    if (
      !slug
      || !groupSlug
      || groupSlug !== slugifyGroupTitle(slug)
      || !productUrl
      || !id
      || !price
      || !boxSize
      || !supplier
      || !dosage
    ) continue;

    const enabled = isStringTrue(product.enable_checkout)
      && isStringTrue(product.enable_search);
    const inStock = product.availability === "in_stock";
    const listing: PeptauraFeedListing = {
      id,
      name: slug,
      dosage,
      supplier,
      supplierDisplayName: supplier,
      outOfStock: !inStock,
      form: /\bvials?\b/i.test(String(product.description || "")) ? "vial" : "unknown",
      priceTiers: [{ price, minQty: 1 }],
      warehouse: "unknown",
      shippingOptionCount: shipping.length,
      orderingMode: enabled && inStock ? "available" : "unavailable",
      enabled,
      suspended: false,
      boxSize,
      // Product-feed prices are final marketplace package prices, so applying
      // the catalog-page margin a second time would overcharge the estimate.
      marginRate: 0,
      productUrl,
    };
    const group = byGroup.get(slug) || [];
    group.push(listing);
    byGroup.set(slug, group);
  }

  const fetchedAt = new Date(fetchedAtMs).toISOString();
  const snapshots = Array.from(byGroup.entries())
    .map(([slug, listings]): PeptauraFeedProductSnapshot => ({
      slug,
      url: catalogUrl(slug),
      listings,
      fetchedAt,
      live: listings.some((listing) =>
        listing.enabled
        && !listing.outOfStock
        && listing.orderingMode === "available"
        && listing.shippingOptionCount > 0
      ),
      source: "product_feed",
      sourceGeneratedAt: generatedAt,
    }))
    .filter((snapshot) => snapshot.live)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return snapshots.length > 0 ? { generatedAt, snapshots } : null;
}
