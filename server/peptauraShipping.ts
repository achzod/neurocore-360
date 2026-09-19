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

type RawShippingOption = { speed?: unknown; cost?: unknown };
type RawShippingTier = { minOrder?: unknown; maxOrder?: unknown; options?: unknown };
type RawShippingVendor = {
  supplierName?: unknown;
  displayName?: unknown;
  available?: unknown;
  minimumOrder?: unknown;
  tiers?: unknown;
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
      const tiers = (Array.isArray(vendor.tiers) ? vendor.tiers as RawShippingTier[] : []).flatMap((tier) => {
        const minOrderUsd = finiteMoney(tier.minOrder) ?? 0;
        const maxOrderUsd = tier.maxOrder == null ? null : finiteMoney(tier.maxOrder);
        return (Array.isArray(tier.options) ? tier.options as RawShippingOption[] : []).flatMap((option) => {
          const costUsd = finiteMoney(option.cost);
          if (costUsd == null) return [];
          return [{ minOrderUsd, maxOrderUsd, costUsd, speed: String(option.speed || '').trim() }];
        });
      });
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
