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
  PREMIUM: 79
};

export function getCTADebut(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `INFOS IMPORTANTES

Tu consultes actuellement l'analyse GRATUITE de ton profil NEUROCORE 360.
Cette version te donne un apercu de tes domaines cles et identifie tes priorites d'optimisation.

Pour debloquer l'analyse COMPLETE avec tous les details, protocoles personnalises, stack de supplements detaillee et feuille de route precise, passe a l'analyse PREMIUM.

Si tu decides de prendre un coaching avec moi apres ton analyse PREMIUM, le montant que tu auras paye pour cette analyse sera DEDUIT A 100% du prix du coaching.

Pour toute question ou pour passer en PREMIUM :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
`;
  }

  return `RAPPEL IMPORTANT

Tu consultes ton analyse PREMIUM NEUROCORE 360 complete.

IMPORTANT : Si tu decides de prendre un coaching avec moi apres cette analyse, le montant que tu as paye pour cette analyse (${amountPaid}EUR) sera DEDUIT A 100% du prix du coaching.

CODE PROMO COACHING : neurocore20 (-25% sur les suivis Essential Elite et Private Lab)

Pour toute question ou pour discuter de ton accompagnement :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
`;
}

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `

====================================================================
PROCHAINES ETAPES
====================================================================

Tu as maintenant un apercu de ton profil NEUROCORE 360. Pour passer a l'action avec un plan complet et detaille :

-> DEBLOQUE L'ANALYSE PREMIUM
   - Tous les details de chaque domaine
   - Protocoles personnalises precis
   - Stack de supplements complete
   - Feuille de route actionnable
   - Projections 30/60/90 jours

-> OU OPTE POUR UN COACHING PERSONNALISE
   Si tu choisis un coaching apres ton analyse PREMIUM, le montant de l'analyse est deduit a 100% du prix du coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
Rapport genere par ACHZOD - NEUROCORE 360
`;
  }

  return `

====================================================================
PRET A TRANSFORMER CES INSIGHTS EN RESULTATS CONCRETS ?
====================================================================

Tu as maintenant entre les mains une analyse complete et personnalisee de ton profil metabolique.

-> SI TU VEUX ALLER PLUS LOIN : COACHING PERSONNALISE
   - Accompagnement sur-mesure base sur cette analyse
   - Ajustements en temps reel selon tes retours
   - Support continu pour maximiser tes resultats
   
   BONUS : Le montant que tu as paye pour cette analyse (${amountPaid}EUR) est DEDUIT A 100% du prix du coaching.
   
   CODE PROMO : neurocore20 (-25% sur les suivis Essential Elite et Private Lab)

Contacte-moi pour discuter de ton accompagnement :
Email: ${CONTACT.email}
   
Site: ${CONTACT.website}

---
Rapport genere par ACHZOD - NEUROCORE 360
`;
}
