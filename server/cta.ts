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

Tu consultes l'analyse GRATUITE de ton profil APEXLABS.
Cette version donne un apercu de tes domaines cles et identifie tes priorites d'optimisation.

Pour debloquer l'analyse COMPLETE avec tous les details, protocoles personnalises, stack de supplements detaillee et feuille de route precise, passe a l'Anabolic Bioscan.

Si tu decides de prendre un coaching avec moi apres ton Anabolic Bioscan, le montant que tu auras paye pour cette analyse sera DEDUIT A 100% du prix du coaching.

Pour toute question ou pour passer en Anabolic Bioscan :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
`;
  }

  const tierLabel = tier === 'ELITE' ? "Ultimate Scan" : "Anabolic Bioscan";
  return `RAPPEL COACHING

Tu consultes ton analyse ${tierLabel} APEXLABS complete.
Si tu veux que je t'accompagne ensuite, le montant que tu as paye (${amountPaid} EUR) est DEDUIT A 100% du prix du coaching.

CODE PROMO COACHING : neurocore20 (-25% sur Essential Elite et Private Lab)

Email: ${CONTACT.email}
Site: ${CONTACT.website}

---`;
}

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    return `

====================================================================
PROCHAINES ETAPES - CE QUE TU PEUX FAIRE MAINTENANT
====================================================================

Tu as entre les mains un apercu de ton profil APEXLABS. Cette analyse gratuite t'a revele tes priorites. Maintenant, deux options :

OPTION 1 : PASSE A L'ACTION AVEC ANABOLIC BIOSCAN (59 EUR)

Ce que tu debloques :
+ Analyse complete de tes 8 domaines (pas juste un apercu)
+ 5 protocoles fermes : matin anti-cortisol, soir sommeil, digestion 14j, bureau, entrainement
+ Stack supplements personnalisee avec dosages exacts et marques recommandees
+ Plan semaine par semaine 30-60-90 jours
+ KPIs de suivi pour mesurer ta progression

IMPORTANT : Si tu prends un coaching apres, les 59 EUR sont DEDUITS A 100% du prix.
C'est un investissement, pas une depense.

OPTION 2 : ULTIMATE SCAN (79 EUR) - SI TU AS DES PHOTOS

Tout ce qu'inclut Anabolic Bioscan PLUS :
+ Analyse photo posturale complete (face/profil/dos)
+ Diagnostic biomecanique et mobilite
+ Estimation composition corporelle visuelle
+ Corrections posturales personnalisees

OPTION 3 : COACHING PERSONNALISE DIRECTEMENT

Tu veux que je t'accompagne maintenant ? Je propose trois formules :
- Essential Elite : suivi hebdomadaire, ajustements continus
- Private Lab : coaching intensif, analyse avancee
- Elite : accompagnement complet transformation

CODE PROMO COACHING : neurocore20 (-25% sur Essential Elite et Private Lab)

Contacte-moi :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
Rapport genere par ACHZOD - APEXLABS
`;
  }

  // PREMIUM / ELITE - CTA vers COACHING
  return `
COACHING APEXLABS

Tu as la cartographie. Il manque l execution. Si tu veux des resultats rapides et propres, je prends le relais.

+ Ajustements hebdo sur tes retours et tes contraintes reelles
+ Protocoles adaptes a ton quotidien, pas un plan generique
+ Suivi des KPIs et corrections de trajectoire
+ Acces direct pour accelerer les decisions

BONUS EXCLUSIF : le montant de ton scan (${amountPaid} EUR) est DEDUIT A 100% du prix du coaching.

CODE PROMO COACHING : neurocore20 (-25% sur Essential Elite et Private Lab)

Email: ${CONTACT.email}
Site: ${CONTACT.website}

---`;
}
