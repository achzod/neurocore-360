import type Stripe from "stripe";

import { ProductDisplayNames, ProductPriceCents, type ProductTypeEnum } from "@shared/schema";
import { BLOOD_ANALYSIS_PURCHASE_CREDITS } from "./bloodOffer";

const INLINE_CHECKOUT_PRODUCTS = new Set<ProductTypeEnum>([
  "PREMIUM",
  "ELITE",
  "BURNOUT",
  "BLOOD_ANALYSIS",
]);

const ProductCheckoutDescriptions: Partial<Record<ProductTypeEnum, string>> = {
  PREMIUM: "Anabolic Bioscan personnalise avec rapport complet APEXLABS.",
  ELITE: "Ultimate Scan personnalise avec rapport complet APEXLABS.",
  BURNOUT: "Burnout Engine personnalise avec rapport complet APEXLABS.",
  BLOOD_ANALYSIS: `${BLOOD_ANALYSIS_PURCHASE_CREDITS} credits Blood Analysis sans expiration.`,
};

export function usesInlineCheckoutLineItem(productType: string): productType is ProductTypeEnum {
  return INLINE_CHECKOUT_PRODUCTS.has(productType as ProductTypeEnum);
}

export function createProductCheckoutLineItem(productType: ProductTypeEnum): Stripe.Checkout.SessionCreateParams.LineItem {
  if (!usesInlineCheckoutLineItem(productType)) {
    throw new Error(`Inline checkout is not configured for product type: ${productType}`);
  }

  const unitAmount = ProductPriceCents[productType];
  if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
    throw new Error(`Invalid checkout amount for product type: ${productType}`);
  }

  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: unitAmount,
      product_data: {
        name: ProductDisplayNames[productType],
        description: ProductCheckoutDescriptions[productType],
      },
    },
  };
}

export function createBloodAnalysisCheckoutLineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  return createProductCheckoutLineItem("BLOOD_ANALYSIS");
}
