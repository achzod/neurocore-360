/**
 * APEXLABS - Templates de Call-to-Actions (CTAs)
 * Codes promo par offre pour deduction sur le coaching achzodcoaching.com
 */

import { AuditTier } from './types';

export const CONTACT = {
  email: 'coaching@achzodcoaching.com',
  website: 'achzodcoaching.com'
};

export const PRICING = {
  FREE: 0,
  PREMIUM: 59,
  ELITE: 79,
  BLOOD: 99,
};

// Codes promo par type d'offre, a creer dans Stripe cote coaching
export const PROMO_CODES_BY_TIER: Record<string, { code: string; amount: number }> = {
  PREMIUM: { code: "BIOSCAN59", amount: 59 },
  ELITE: { code: "ULTIMATE79", amount: 79 },
  BLOOD: { code: "BLOOD99", amount: 99 },
};

export function getPromoForTier(tier: AuditTier | 'BLOOD'): { code: string; amount: number } | null {
  if (tier === 'GRATUIT') return null;
  return PROMO_CODES_BY_TIER[tier] || null;
}

export function getCTADebut(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `INFOS IMPORTANTES

Tu consultes l'analyse gratuite de ton profil APEXLABS.
Cette version donne la lecture des domaines cles et tes priorites d'optimisation.

Pour l'analyse complete (details, protocoles, stack supplements, feuille de route), passe a l'Anabolic Bioscan.
Si tu veux que je prenne le relais, le montant du scan est deduit a 100% du coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
  }

  const promo = PROMO_CODES_BY_TIER[tier];
  const tierLabel = tier === 'ELITE' ? "Ultimate Scan" : "Anabolic Bioscan";
  const promoLine = promo ? `Code promo : ${promo.code} (-${promo.amount}EUR deduits sur ton coaching)` : "";

  return `RAPPEL COACHING

Tu consultes ton analyse ${tierLabel} APEXLABS complete.
Le montant paye (${amountPaid} EUR) est deduit a 100% si tu prends un coaching avec moi.

- Ajustements hebdo sur tes retours
- Protocoles adaptes a ton contexte
- Suivi des KPIs et corrections de trajectoire
- Acces direct pour accelerer les decisions

${promoLine}
Utilise ce code sur achzodcoaching.com pour deduire ${amountPaid}EUR de ta formule coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
}

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `
PROCHAINES ETAPES

Tu as un apercu clair de tes priorites APEXLABS. Pour aller plus loin, tu as trois chemins.

- Passer a l'Anabolic Bioscan pour l'analyse complete et les protocoles detailles.
- Passer a l'Ultimate Scan si tu as des photos pour la partie posturale et biomecanique.
- Prendre un coaching personnalise directement, avec deduction du scan.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
  }

  const promo = PROMO_CODES_BY_TIER[tier];
  const promoLine = promo ? `Code promo : ${promo.code} (-${promo.amount}EUR deduits sur ton coaching)` : "";

  return `
COACHING APEXLABS

Tu as la cartographie. Ce qui manque, c'est l'execution avec feedback.
Je reprends ton dossier, j'ajuste les protocoles en direct et je pilote les KPIs.

- Ajustements hebdo sur tes retours et contraintes reelles
- Protocoles adaptes a ton quotidien, pas un plan generique
- Suivi des KPIs et corrections de trajectoire
- Acces direct pour accelerer les decisions

Bonus exclusif : le montant de ton scan (${amountPaid} EUR) est deduit a 100% du prix du coaching.
${promoLine}
Utilise ce code sur achzodcoaching.com pour deduire ${amountPaid}EUR de ta formule coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
}

// ─── Peptides Engine coaching deduction (tier-aware) ──────────────────────────
// Le montant déductible == prix payé sur Peptides Engine. Code valable 8 sem
// à compter de la livraison du rapport (urgence légitime).
// IMPORTANT : les 3 codes (PEPTIDES199, PEPTIDES299, PEPTIDES399) doivent être
// créés côté Stripe achzodcoaching.com avec restriction sur les produits 8 et
// 12 sem de Essential/Elite/Private Lab uniquement (pas Sans Suivi ni 4 sem).
export const PEPTIDES_COACHING_DEDUCTION: Record<"solo" | "coached" | "tracked", { code: string; amount: number; label: string }> = {
  solo: { code: "PEPTIDES199", amount: 199, label: "Solo" },
  coached: { code: "PEPTIDES299", amount: 299, label: "Coached" },
  tracked: { code: "PEPTIDES399", amount: 399, label: "Tracked" },
};

export function buildPeptidesCoachingDeductionBlock(
  tier: "solo" | "coached" | "tracked" | null | undefined,
  opts: { now?: Date } = {}
): string {
  const resolvedTier = tier && (tier === "solo" || tier === "coached" || tier === "tracked") ? tier : "coached";
  const cfg = PEPTIDES_COACHING_DEDUCTION[resolvedTier];
  const now = opts.now ?? new Date();
  const expiry = new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000); // 8 weeks
  const expiryStr = expiry.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return `\n\nTON BONUS COACHING (${cfg.label})\n\nCode : ${cfg.code}\n${cfg.amount}EUR deduits sur ton coaching Essential, Elite ou Private Lab.\nValable sur les engagements 8 ou 12 semaines uniquement.\nExpire le ${expiryStr} (8 semaines a compter de maintenant).\n\nTu veux passer au coaching personnalise apres ton protocole ?\n- Coaching Essential, https://www.achzodcoaching.com/coaching-essential\n- Coaching Elite, https://www.achzodcoaching.com/coaching-elite\n- Private Lab, https://www.achzodcoaching.com/coaching-achzod-private-lab\n\nColle le code ${cfg.code} dans le champ promo au checkout coaching.`;
}

export function getCTABlood(): string {
  const promo = PROMO_CODES_BY_TIER.BLOOD;
  return `
COACHING APEXLABS

Tu as ton analyse sanguine complete. Pour passer a l'action avec un suivi personnalise :

- Protocoles adaptes a tes marqueurs sanguins
- Ajustements hebdo sur tes retours
- Suivi des KPIs et corrections de trajectoire
- Acces direct pour accelerer les decisions

Bonus exclusif : le montant de ton Blood Analysis (${promo.amount} EUR) est deduit a 100% du prix du coaching.
Code promo : ${promo.code} (-${promo.amount}EUR deduits sur ton coaching)
Utilise ce code sur achzodcoaching.com pour deduire ${promo.amount}EUR de ta formule coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
}
