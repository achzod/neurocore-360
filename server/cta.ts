/**
 * NEUROCORE 360 - Templates de Call-to-Actions (CTAs)
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
};

export function getCTADebut(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `INFOS IMPORTANTES

Tu consultes l'analyse gratuite de ton profil APEXLABS.
Cette version te donne la lecture des domaines cles et tes priorites d'optimisation.

Si tu veux l'analyse complete (details, protocoles, stack supplements, feuille de route), passe a l'Anabolic Bioscan.
Si tu prends un coaching apres, le montant de ton scan est deduit a 100% du prix du coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
  }

  const tierLabel = tier === 'ELITE' ? "Ultimate Scan" : "Anabolic Bioscan";
  return `RAPPEL COACHING

Tu consultes ton analyse ${tierLabel} APEXLABS complete.
Si tu veux que je t'accompagne ensuite, le montant que tu as paye (${amountPaid} EUR) est deduit a 100% du prix du coaching.

CODE PROMO COACHING : NEUROCORE20 (-20% sur le coaching)

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
}

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `
PROCHAINES ETAPES

Tu as un apercu clair de tes priorites APEXLABS. Maintenant, voici les options pour aller plus loin.

OPTION 1 : ANABOLIC BIOSCAN (59 EUR)
- Analyse complete des domaines cles, pas un simple apercu
- Protocoles fermes (matin anti-cortisol, soir sommeil, digestion 14 jours, bureau, entrainement)
- Stack supplements personnalisee avec dosages et marques
- Plan 30-60-90 jours + KPIs de suivi

OPTION 2 : ULTIMATE SCAN (79 EUR) SI TU AS DES PHOTOS
- Tout l'Anabolic Bioscan
- Analyse photo posturale (face/profil/dos)
- Diagnostic biomecanique + corrections de posture

OPTION 3 : COACHING PERSONNALISE DIRECT
- Starter : 97€ / 1 mois
- Transform : 247€ / 3 mois
- Elite : 497€ / 6 mois

CODE PROMO COACHING : NEUROCORE20 (-20% sur le coaching)

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
  }

  // PREMIUM / ELITE - CTA vers COACHING
  return `
COACHING APEXLABS

Tu as la cartographie. Ce qui manque, c'est l'execution avec feedback.
Je reprends ton dossier, j'ajuste les protocoles en direct et je pilote les KPIs.

- Ajustements hebdo sur tes retours et contraintes reelles
- Protocoles adaptes a ton quotidien, pas un plan generique
- Suivi des KPIs et corrections de trajectoire
- Acces direct pour accelerer les decisions

FORMULES DISPONIBLES
- Starter : 97€ / 1 mois
- Transform : 247€ / 3 mois
- Elite : 497€ / 6 mois

BONUS EXCLUSIF : le montant de ton scan (${amountPaid} EUR) est deduit a 100% du prix du coaching.
CODE PROMO COACHING : NEUROCORE20 (-20% sur le coaching)

Email: ${CONTACT.email}
Site: ${CONTACT.website}
`;
}
