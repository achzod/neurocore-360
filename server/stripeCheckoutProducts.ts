import type Stripe from "stripe";

import { ProductDisplayNames, ProductPriceCents } from "@shared/schema";
import { BLOOD_ANALYSIS_PURCHASE_CREDITS } from "./bloodOffer";

export function createBloodAnalysisCheckoutLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: ProductPriceCents.BLOOD_ANALYSIS,
      product_data: {
        name: ProductDisplayNames.BLOOD_ANALYSIS,
        description: `${BLOOD_ANALYSIS_PURCHASE_CREDITS} credits Blood Analysis sans expiration.`,
      },
    },
  };
}
