export type CoachingOfferTier = {
  id: string;
  label: string;
  href: string;
  offers: Array<{
    duration: string;
    price: number;
  }>;
};

export const COACHING_OFFER_TIERS: CoachingOfferTier[] = [
  {
    id: "starter",
    label: "Starter",
    href: "https://www.achzodcoaching.com/coaching-starter",
    offers: [{ duration: "8 semaines", price: 199 }],
  },
  {
    id: "essential",
    label: "Essential",
    href: "https://www.achzodcoaching.com/coaching-essential",
    offers: [
      { duration: "4 semaines", price: 249 },
      { duration: "8 semaines", price: 399 },
      { duration: "12 semaines", price: 549 },
    ],
  },
  {
    id: "elite",
    label: "Elite",
    href: "https://www.achzodcoaching.com/coaching-elite",
    offers: [
      { duration: "4 semaines", price: 399 },
      { duration: "8 semaines", price: 649 },
      { duration: "12 semaines", price: 899 },
    ],
  },
  {
    id: "private-lab",
    label: "Private Lab",
    href: "https://www.achzodcoaching.com/coaching-achzod-private-lab",
    offers: [
      { duration: "4 semaines", price: 499 },
      { duration: "8 semaines", price: 799 },
      { duration: "12 semaines", price: 1199 },
    ],
  },
];

const DEDUCTION_BY_AUDIT_TYPE: Record<string, number> = {
  DISCOVERY: 0,
  GRATUIT: 0,
  ANABOLIC_BIOSCAN: 59,
  PREMIUM: 59,
  ULTIMATE_SCAN: 79,
  ELITE: 79,
  BLOOD_ANALYSIS: 99,
};

export const getDeductionAmount = (auditType?: string): number => {
  if (!auditType) return 0;
  return DEDUCTION_BY_AUDIT_TYPE[auditType] ?? 0;
};

export const formatEuro = (value: number): string => {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
  return `${formatted}€`;
};
