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
  if (tier === 'FREE') {
    return `INFO : Tu consultes l'analyse GRATUITE de ton profil NEUROCORE 360.\n\n---\n`;
  }

  return `RAPPEL : Le montant paye (${amountPaid}EUR) est DEDUIT A 100% du prix de ton futur coaching.\n\n---\n`;
}

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'FREE') {
    return `
====================================================================
PASSE AU NIVEAU PREMIUM
====================================================================
Debloque ton analyse COMPLETE, tes protocoles et ton plan 30/60/90.
Le montant de l'analyse est deduit a 100% de ton coaching.

Email: ${CONTACT.email}
Site: ${CONTACT.website}

Rapport genere par NEUROCORE 360
`;
  }

  return `
====================================================================
TRANSFORME TES INSIGHTS EN RESULTATS CONCRETS
====================================================================

Tu as maintenant ton diagnostic et ta feuille de route. 
Pour aller plus loin et obtenir des ajustements en temps reel :

-> COACHING PERSONNALISE (Accompagnement sur-mesure)
   * BONUS : Les ${amountPaid}EUR de cet audit sont DEDUITS a 100% du coaching.

Contact : ${CONTACT.email} | ${CONTACT.website}

---
Rapport genere par NEUROCORE 360
`;
}
