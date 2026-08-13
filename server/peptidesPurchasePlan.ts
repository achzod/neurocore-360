export interface PurchasePlanPriceTier {
  minQty: number;
  price: number;
}

export interface PurchasePlanListing {
  dosage: string;
  boxSize: number;
  marginRate: number;
  priceTiers: PurchasePlanPriceTier[];
}

export interface PeptidePurchasePlan<Listing extends PurchasePlanListing = PurchasePlanListing> {
  listing: Listing;
  needMg: number;
  vialMg: number;
  requestedVials: number;
  packageCount: number;
  deliveredVials: number;
  deliveredMg: number;
  packagePriceUsd: number;
  totalPriceUsd: number;
  overstockRatio: number;
}

export interface ConditionalReconstitutionExample {
  solventMl: number;
  concentrationPerMl: number;
  doseVolumeMl: number;
  u100Units: number;
}

/**
 * Computes syringe volumes without choosing a reconstitution volume for the
 * client. Peptaura's official feed confirms vial strength, not the solvent
 * volume for the exact lot. The returned examples are therefore conditional:
 * they become usable only after a qualified professional confirms one of the
 * displayed solvent volumes for the received product.
 */
export function buildConditionalReconstitutionExamples(
  vialMg: number,
  doseAmount: number,
  doseUnit: "mg" | "mcg",
  solventOptionsMl = [1, 2, 3],
): ConditionalReconstitutionExample[] {
  if (![vialMg, doseAmount].every((value) => Number.isFinite(value) && value > 0)) return [];
  const doseMg = doseUnit === "mcg" ? doseAmount / 1000 : doseAmount;
  return solventOptionsMl
    .filter((solventMl) => Number.isFinite(solventMl) && solventMl > 0)
    .map((solventMl) => {
      const concentrationPerMl = vialMg / solventMl;
      const doseVolumeMl = doseMg / concentrationPerMl;
      return {
        solventMl,
        concentrationPerMl,
        doseVolumeMl,
        u100Units: doseVolumeMl * 100,
      };
    });
}

export function parseListingMg(dosage: string): number | null {
  const match = String(dosage || "").match(/(\d+(?:[.,]\d+)?)\s*mg\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function packageCountForVials(
  listing: Pick<PurchasePlanListing, "boxSize">,
  vialQty: number,
): number {
  return Math.max(1, Math.ceil(Math.max(1, vialQty) / Math.max(1, listing.boxSize)));
}

export function effectivePackagePrice(
  listing: Pick<PurchasePlanListing, "boxSize" | "marginRate" | "priceTiers">,
  vialQty: number,
): number {
  const packageCount = packageCountForVials(listing, vialQty);
  const tiers = [...listing.priceTiers]
    .filter((tier) => Number.isFinite(tier.price) && tier.price > 0 && tier.minQty > 0)
    .sort((a, b) => a.minQty - b.minQty);
  const eligible = tiers.filter((tier) => tier.minQty <= packageCount);
  const selected = eligible.length > 0 ? eligible[eligible.length - 1] : tiers[0];
  if (!selected) return Number.NaN;
  return Math.round(selected.price * (1 + listing.marginRate) * 100) / 100;
}

export function offerTotalPrice(
  listing: Pick<PurchasePlanListing, "boxSize" | "marginRate" | "priceTiers">,
  vialQty: number,
): number {
  const packagePrice = effectivePackagePrice(listing, vialQty);
  return Math.round(packagePrice * packageCountForVials(listing, vialQty) * 100) / 100;
}

export function buildPurchasePlan<Listing extends PurchasePlanListing>(
  listing: Listing,
  needMg: number,
  maxOverstockRatio = 1.2,
): PeptidePurchasePlan<Listing> | null {
  if (!Number.isFinite(needMg) || needMg <= 0) return null;
  const vialMg = parseListingMg(listing.dosage);
  if (vialMg == null) return null;
  const requestedVials = Math.max(1, Math.ceil((needMg - Number.EPSILON) / vialMg));
  const packageCount = packageCountForVials(listing, requestedVials);
  const deliveredVials = packageCount * Math.max(1, listing.boxSize);
  const deliveredMg = deliveredVials * vialMg;
  const overstockRatio = deliveredMg / needMg;
  if (overstockRatio > maxOverstockRatio + 1e-9) return null;
  const packagePriceUsd = effectivePackagePrice(listing, requestedVials);
  const totalPriceUsd = offerTotalPrice(listing, requestedVials);
  if (!Number.isFinite(packagePriceUsd) || packagePriceUsd <= 0 || !Number.isFinite(totalPriceUsd) || totalPriceUsd <= 0) {
    return null;
  }
  return {
    listing,
    needMg,
    vialMg,
    requestedVials,
    packageCount,
    deliveredVials,
    deliveredMg,
    packagePriceUsd,
    totalPriceUsd,
    overstockRatio,
  };
}

export function selectBestPurchasePlan<Listing extends PurchasePlanListing>(
  listings: Listing[],
  needMg: number,
  maxOverstockRatio = 1.2,
): PeptidePurchasePlan<Listing> | null {
  const plans = listings
    .map((listing) => buildPurchasePlan(listing, needMg, maxOverstockRatio))
    .filter((plan): plan is PeptidePurchasePlan<Listing> => plan != null);
  plans.sort((a, b) =>
    a.totalPriceUsd - b.totalPriceUsd
    || a.deliveredMg - b.deliveredMg
    || a.vialMg - b.vialMg
  );
  return plans[0] || null;
}
