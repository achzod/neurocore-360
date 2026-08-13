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
 * the client uses the row matching the volume actually added to the vial.
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

function firstDoseForConditionalCalculation(
  dosage: string | undefined,
): { amount: number; unit: "mg" | "mcg" } | null {
  const match = String(dosage || "").replace(/(\d),(\d)/g, "$1.$2")
    .match(/(\d+(?:\.\d+)?)\s*(mcg|ug|µg|mg)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: /mg/i.test(match[2]) ? "mg" : "mcg" };
}

/**
 * Builds the exact client-facing conditional calculations used after the live
 * vial format is known. Keeping this pure makes the paid-report recovery path
 * replayable without importing the engine, database or provider client.
 */
export function buildConditionalReconstitutionText(
  dosage: string | undefined,
  vialMg: number,
): string | null {
  const dose = firstDoseForConditionalCalculation(dosage);
  if (!dose) return null;
  const examples = buildConditionalReconstitutionExamples(vialMg, dose.amount, dose.unit, [1, 2]);
  if (examples.length !== 2) return null;
  const unitLabel = dose.unit === "mcg" ? "mcg" : "mg";
  const lines = examples.map((example) => {
    const capacityWarning = example.doseVolumeMl > 1
      ? " Cette option depasse 1 ml et ne tient pas dans une seringue U-100 de 1 ml: elle ne doit pas etre utilisee avec ce materiel."
      : "";
    return `Si ${example.solventMl} ml est confirme: concentration ${example.concentrationPerMl.toFixed(3)} mg/ml; pour ${dose.amount} ${unitLabel}, volume ${example.doseVolumeMl.toFixed(3)} ml, soit ${example.u100Units.toFixed(1)} unites U-100.${capacityWarning}`;
  });
  return [
    `Format live retenu: vial de ${vialMg} mg. Peptaura ne publie pas le volume de solvant du lot exact: aucun volume n'est choisi automatiquement.`,
    `Calcul conditionnel pour les deux volumes usuels de 1 ml et 2 ml. Utilise uniquement la ligne qui correspond au volume reellement ajoute. Formule: concentration en mg/ml = ${vialMg} mg divise par le volume ajoute; volume de dose = dose en mg divisee par la concentration; unites U-100 = volume en ml multiplie par 100.`,
    ...lines,
    "Si le volume reellement ajoute est different de 1 ml ou 2 ml, recalcule concentration, volume de dose et unites U-100 avant de poursuivre.",
  ].join(" ");
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
