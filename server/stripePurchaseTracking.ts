import type Stripe from "stripe";

export type VerifiedStripePurchase = {
  transactionId: string;
  itemId: string;
  itemName: string;
  value: number;
  currency: string;
};

export function isStripeCheckoutPaid(session: Pick<Stripe.Checkout.Session, "payment_status">): boolean {
  return session.payment_status === "paid";
}

// Only Stripe's paid state and charged total may produce a purchase conversion.
export function buildVerifiedStripePurchase(
  session: Pick<Stripe.Checkout.Session, "id" | "payment_status" | "amount_total" | "currency">,
  itemId: string,
  itemName: string,
): VerifiedStripePurchase | null {
  if (!isStripeCheckoutPaid(session) || !session.id.startsWith("cs_") ||
      !Number.isSafeInteger(session.amount_total) || (session.amount_total ?? 0) <= 0 ||
      !session.currency || !itemId || !itemName) return null;

  return {
    transactionId: session.id,
    itemId,
    itemName,
    value: session.amount_total! / 100,
    currency: session.currency.toUpperCase(),
  };
}
