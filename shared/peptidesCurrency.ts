export const PEPTIDES_PREVIEW_EUR_PER_USD = 0.92;

export function peptidesPreviewEurToUsd(eur: number): number {
  return Math.round((eur / PEPTIDES_PREVIEW_EUR_PER_USD) * 100) / 100;
}

export function peptidesPreviewUsdToEur(usd: number): number {
  return Math.round(usd * PEPTIDES_PREVIEW_EUR_PER_USD * 100) / 100;
}

export function formatPeptidesPreviewEurFromUsd(usd: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(peptidesPreviewUsdToEur(usd));
}
