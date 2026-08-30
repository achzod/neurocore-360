import Stripe from "stripe";

const DISABLED_VALUES = new Set(["0", "false", "off", "no"]);
export type CheckoutPaymentRail = "standard" | "klarna";

export function isKlarnaCheckoutEnabled(): boolean {
  const raw = process.env.STRIPE_ENABLE_KLARNA;
  if (!raw) return true;
  return !DISABLED_VALUES.has(raw.trim().toLowerCase());
}

export function getCheckoutPaymentMethodTypes(
  rail: CheckoutPaymentRail = "standard",
): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  if (rail === "klarna") {
    return ["klarna"];
  }
  return ["card"];
}

export function isKlarnaUnsupportedCheckoutError(error: unknown): boolean {
  const err = error as {
    code?: string;
    type?: string;
    param?: string;
    message?: string;
    raw?: { code?: string; param?: string; message?: string };
  };

  const haystack = [
    err.code,
    err.type,
    err.param,
    err.message,
    err.raw?.code,
    err.raw?.param,
    err.raw?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("klarna")
    && (
      haystack.includes("payment_method")
      || haystack.includes("not available")
      || haystack.includes("unsupported")
      || haystack.includes("invalid")
    );
}

export async function createCheckoutSessionWithPaymentMethodFallback(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams,
  context: string,
  rail: CheckoutPaymentRail = "standard",
): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  const paymentMethodTypes = getCheckoutPaymentMethodTypes(rail);

  try {
    return await stripe.checkout.sessions.create({
      ...params,
      payment_method_types: paymentMethodTypes,
    });
  } catch (error) {
    if (rail === "standard" && paymentMethodTypes.includes("klarna") && isKlarnaUnsupportedCheckoutError(error)) {
      console.warn(`[Stripe Checkout] Klarna unavailable for ${context}; retrying card-only checkout.`);
      return await stripe.checkout.sessions.create({
        ...params,
        payment_method_types: ["card"],
      });
    }

    throw error;
  }
}
