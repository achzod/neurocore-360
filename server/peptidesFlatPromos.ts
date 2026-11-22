/**
 * Codes promo à montant fixe, valables uniquement sur PEPTIDES_ENGINE.
 *
 * Le code doit aussi exister (actif) dans la table promo_codes avec
 * valid_for = PEPTIDES_ENGINE : storage.validatePromoCode reste le portier.
 * Ici on remplace seulement le pourcentage stocké par un montant fixe en
 * centimes, appliqué à l'identique au coupon Stripe et à la commande locale
 * (sinon le contrôle de parité Stripe bloque la livraison).
 *
 * Toujours gardé sur planType : un code fixe ne s'applique jamais à un autre
 * produit (incident Marc M. 2026-05-11, PEPTIDES100 sur ELITE à 0 €).
 */
export const PEPTIDES_FLAT_PROMO_CENTS: Readonly<Record<string, number>> = {
  // Campagne flash : 100 € fixes.
  PEPTIDES100: 10000,
  // Offert aux acheteurs du Guide Peptides : 99 € fixes, quel que soit le tier (199 / 299 / 399).
  BOOKPEPTIDES99: 9900,
};

/** Montant fixe en centimes pour ce code sur ce produit, ou null si le code n'est pas un code fixe Peptides. */
export function peptidesFlatPromoAmountOffCents(code: unknown, planType: unknown): number | null {
  if (String(planType || "") !== "PEPTIDES_ENGINE") return null;
  const normalized = String(code ?? "").trim().toUpperCase();
  const cents = PEPTIDES_FLAT_PROMO_CENTS[normalized];
  return Number.isInteger(cents) && cents > 0 ? cents : null;
}

/** Réduction appliquée à une commande : montant fixe si code fixe Peptides, sinon pourcentage stocké. Jamais plus que le prix. */
export function resolvePromoDiscountCents(input: {
  code: string | null | undefined;
  planType: unknown;
  baseCents: number;
  discountPercent: number;
}): number {
  const flat = peptidesFlatPromoAmountOffCents(input.code, input.planType);
  const raw = flat ?? Math.round(input.baseCents * input.discountPercent / 100);
  return Math.max(0, Math.min(input.baseCents, raw));
}
