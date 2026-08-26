import Stripe from "stripe";

const DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

export function isKlarnaCheckoutEnabled(): boolean {
  const raw = process.env.STRIPE_ENABLE_KLARNA;
  if (!raw) return true;
  return !DISABLED_VALUES.has(raw.trim().toLowerCase());
}

export function getCheckoutPaymentMethodTypes(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  return isKlarnaCheckoutEnabled() ? ["card", "klarna"] : ["card"];
}

export function getCheckoutPaymentMethodParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "automatic_payment_methods" | "payment_method_types"
> {
  return isKlarnaCheckoutEnabled()
    ? { automatic_payment_methods: { enabled: true } }
    : { payment_method_types: ["card"] };
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
): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  const paymentMethodParams = getCheckoutPaymentMethodParams();
  const paymentMethodTypes = paymentMethodParams.payment_method_types || [];

  try {
    return await stripe.checkout.sessions.create({
      ...params,
      ...paymentMethodParams,
    });
  } catch (error) {
    if (paymentMethodTypes.includes("klarna") && isKlarnaUnsupportedCheckoutError(error)) {
      console.warn(`[Stripe Checkout] Klarna unavailable for ${context}; retrying card-only checkout.`);
      return await stripe.checkout.sessions.create({
        ...params,
        payment_method_types: ["card"],
      });
    }

    throw error;
  }
}
