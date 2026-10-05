export interface PeptauraShippingTier {
  minOrderUsd: number;
  maxOrderUsd: number | null;
  costUsd: number;
  speed: string;
}

export interface PeptauraShippingQuote {
  supplier: string;
  displayName: string;
  available: boolean;
  minimumOrderUsd: number | null;
  tiers: PeptauraShippingTier[];
}

export interface PeptauraShippingAvailabilitySummary {
  quotes: PeptauraShippingQuote[];
  availableVendors: string[];
  blockedVendors: string[];
  live: boolean;
  source: "flight" | "legacy_dom" | "unavailable";
}

type RawShippingOption = { speed?: unknown; cost?: unknown };
type RawShippingTier = { minOrder?: unknown; maxOrder?: unknown; options?: unknown };
type RawShippingSection = {
  available?: unknown;
  flatOptions?: unknown;
  tiers?: unknown;
};
type RawShippingVendor = {
  supplierName?: unknown;
  displayName?: unknown;
  available?: unknown;
  minimumOrder?: unknown;
  tiers?: unknown;
  sections?: unknown;
};

function finiteMoney(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : null;
}

/**
 * Peptaura embeds the country shipping matrix in the Next.js flight payload.
 * We parse that structured payload instead of scraping the rendered prose.
 */
export function parsePeptauraShippingPage(html: string): PeptauraShippingQuote[] {
  const flightChunks = html.matchAll(/self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)<\/script>/gs);
  for (const chunk of flightChunks) {
    try {
      const decoded = JSON.parse(`"${chunk[1]}"`);
      // Next.js can batch many newline-delimited Flight records in one push.
      // Parse only the record carrying the shipping availability payload;
      // parsing everything after the first record id would reject a valid page.
      const records = decoded.split("\n").filter((record: string) => record.includes('"availability"'));
      for (const record of records) {
        const separator = record.indexOf(":");
        if (separator < 0) continue;
        const flight = JSON.parse(record.slice(separator + 1));
        const rawVendors = Array.isArray(flight?.[3]?.availability) ? flight[3].availability as RawShippingVendor[] : [];
        const parsed = rawVendors.map((vendor) => {
          const supplier = String(vendor.supplierName || '').trim();
          const minimumOrderUsd = vendor.minimumOrder == null ? null : finiteMoney(vendor.minimumOrder);
          const sections = (Array.isArray(vendor.sections) ? vendor.sections as RawShippingSection[] : [])
            .filter((section) => section.available !== false);
          const rawTiers = [
            ...(Array.isArray(vendor.tiers) ? vendor.tiers as RawShippingTier[] : []),
            ...sections.flatMap((section) => Array.isArray(section.tiers) ? section.tiers as RawShippingTier[] : []),
          ];
          const flatOptions = sections.flatMap((section) =>
            Array.isArray(section.flatOptions) ? section.flatOptions as RawShippingOption[] : []
          );
          const tiers = [
            ...rawTiers.flatMap((tier) => {
              const minOrderUsd = finiteMoney(tier.minOrder) ?? 0;
              const maxOrderUsd = tier.maxOrder == null ? null : finiteMoney(tier.maxOrder);
              return (Array.isArray(tier.options) ? tier.options as RawShippingOption[] : []).flatMap((option) => {
                const costUsd = finiteMoney(option.cost);
                if (costUsd == null) return [];
                return [{ minOrderUsd, maxOrderUsd, costUsd, speed: String(option.speed || '').trim() }];
              });
            }),
            ...flatOptions.flatMap((option) => {
              const costUsd = finiteMoney(option.cost);
              if (costUsd == null) return [];
              return [{ minOrderUsd: 0, maxOrderUsd: null, costUsd, speed: String(option.speed || '').trim() }];
            }),
          ];
          return {
            supplier,
            displayName: String(vendor.displayName || supplier).trim(),
            available: vendor.available === true,
            minimumOrderUsd,
            tiers,
          };
        }).filter((quote) => quote.supplier.length > 0);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      continue;
    }
  }
  return [];
}

function uniqueVendorNames(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Canonical availability adapter shared by the paid engine and the preview.
 * Flight data is authoritative and carries the shipping fees/minimums. The
 * DOM branch only preserves compatibility with old server-rendered pages.
 */
export function parsePeptauraShippingAvailabilityPage(
  html: string,
): PeptauraShippingAvailabilitySummary {
  const quotes = parsePeptauraShippingPage(html);
  if (quotes.length > 0) {
    const availableVendors = uniqueVendorNames(quotes
      .filter((quote) => quote.available && quote.tiers.length > 0)
      .map((quote) => quote.displayName || quote.supplier));
    const blockedVendors = uniqueVendorNames(quotes
      .filter((quote) => !quote.available || quote.tiers.length === 0)
      .map((quote) => quote.displayName || quote.supplier));
    return {
      quotes,
      availableVendors,
      blockedVendors,
      live: availableVendors.length > 0,
      source: "flight",
    };
  }

  const decoded = html
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const stripHtml = (value: string): string =>
    value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const availableVendors: string[] = [];
  const blockedVendors: string[] = [];

  for (const row of decoded.matchAll(/<a class="flex items-center gap-3 px-3 py-3[^"]*" href="\/vendors\/([^"]+)">([\s\S]*?)<\/a>/g)) {
    const vendor = stripHtml(row[2]) || decodeURIComponent(row[1]);
    if (vendor) availableVendors.push(vendor);
  }
  for (const row of decoded.matchAll(/<div class="flex items-center gap-3 rounded-lg px-3 py-3 opacity-60">([\s\S]*?)<\/div>/g)) {
    const vendor = stripHtml(row[1]).split(/\u2014|\u2013/)[0]?.trim();
    if (vendor) blockedVendors.push(vendor);
  }

  const legacyAvailable = uniqueVendorNames(availableVendors);
  const legacyBlocked = uniqueVendorNames(blockedVendors);
  const hasLegacyRows = legacyAvailable.length > 0 || legacyBlocked.length > 0;
  return {
    quotes: [],
    availableVendors: legacyAvailable,
    blockedVendors: legacyBlocked,
    live: legacyAvailable.length > 0,
    source: hasLegacyRows ? "legacy_dom" : "unavailable",
  };
}

export function shippingForSubtotal(
  quote: PeptauraShippingQuote,
  subtotalUsd: number,
): { costUsd: number; speed: string } | null {
  if (!quote.available || !Number.isFinite(subtotalUsd) || subtotalUsd < 0) return null;
  if (quote.minimumOrderUsd != null && subtotalUsd + 1e-9 < quote.minimumOrderUsd) return null;
  const eligible = quote.tiers.filter((tier) =>
    subtotalUsd + 1e-9 >= tier.minOrderUsd
    && (tier.maxOrderUsd == null || subtotalUsd < tier.maxOrderUsd - 1e-9)
  ).sort((a, b) => a.costUsd - b.costUsd);
  const selected = eligible[0];
  return selected ? { costUsd: selected.costUsd, speed: selected.speed } : null;
}

export interface PeptauraShippingBasketLine {
  supplier: string;
  totalPriceUsd: number;
}

export interface PeptauraShippingBasketBreakdown {
  supplier: string;
  subtotalUsd: number;
  minimumOrderUsd: number | null;
  shippingUsd: number;
  speed: string;
}

function normalizedSupplier(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

/** Validate shipping only after grouping the complete multi-axis basket. */
export function quotePeptauraShippingBasket(
  lines: PeptauraShippingBasketLine[],
  availability: Pick<PeptauraShippingAvailabilitySummary, "quotes" | "source">,
): { breakdown: PeptauraShippingBasketBreakdown[]; failures: string[] } {
  const subtotals = new Map<string, { supplier: string; subtotalUsd: number }>();
  for (const line of lines) {
    const supplier = String(line.supplier || "").trim();
    const totalPriceUsd = Number(line.totalPriceUsd);
    if (!supplier || !Number.isFinite(totalPriceUsd) || totalPriceUsd < 0) continue;
    const key = normalizedSupplier(supplier);
    const current = subtotals.get(key) || { supplier, subtotalUsd: 0 };
    current.subtotalUsd = Math.round((current.subtotalUsd + totalPriceUsd) * 100) / 100;
    subtotals.set(key, current);
  }

  const breakdown: PeptauraShippingBasketBreakdown[] = [];
  const failures: string[] = [];
  for (const [supplierKey, group] of subtotals) {
    const quote = availability.quotes.find((candidate) =>
      [candidate.supplier, candidate.displayName].some((name) => normalizedSupplier(name) === supplierKey)
    );
    if (!quote) {
      if (availability.source === "flight") failures.push(`${group.supplier}: devis livraison live introuvable`);
      continue;
    }
    const shipping = shippingForSubtotal(quote, group.subtotalUsd);
    if (!shipping) {
      const minimum = quote.minimumOrderUsd == null ? "inconnu" : `$${quote.minimumOrderUsd.toFixed(2)}`;
      failures.push(`${group.supplier}: sous-total $${group.subtotalUsd.toFixed(2)} non livrable, minimum fournisseur ${minimum}`);
      continue;
    }
    breakdown.push({
      supplier: quote.displayName || quote.supplier,
      subtotalUsd: group.subtotalUsd,
      minimumOrderUsd: quote.minimumOrderUsd,
      shippingUsd: shipping.costUsd,
      speed: shipping.speed,
    });
  }
  return { breakdown, failures };
}
