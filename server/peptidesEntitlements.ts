export type PeptidesTier = "solo" | "coached" | "tracked";

export function resolvePeptidesTier(raw: unknown): PeptidesTier {
  if (raw === "solo" || raw === "coached" || raw === "tracked") return raw;
  return "coached";
}

export function peptidesBloodCreditsForTier(raw: unknown): number {
  // Before tiered offers existed, every paid Peptides Engine order included
  // two Blood credits. All new checkout paths persist an explicit tier, so a
  // missing value is a legacy entitlement and must not be downgraded.
  if (raw === undefined || raw === null || raw === "") return 2;
  const tier = resolvePeptidesTier(raw);
  return tier === "tracked" ? 2 : tier === "coached" ? 1 : 0;
}
