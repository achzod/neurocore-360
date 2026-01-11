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

Tu consultes actuellement l'analyse GRATUITE de ton profil NEUROCORE 360.
Cette version te donne un apercu de tes domaines cles et identifie tes priorites d'optimisation.

Pour debloquer l'analyse COMPLETE avec tous les details, protocoles personnalises, stack de supplements detaillee et feuille de route precise, passe a l'Anabolic Bioscan.

Si tu decides de prendre un coaching avec moi apres ton Anabolic Bioscan, le montant que tu auras paye pour cette analyse sera DEDUIT A 100% du prix du coaching.

Pour toute question ou pour passer en Anabolic Bioscan :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
`;
  }

  const tierLabel = tier === 'ELITE' ? "Ultimate Scan" : "Anabolic Bioscan";
  return `RAPPEL IMPORTANT

Tu consultes ton analyse ${tierLabel} NEUROCORE 360 complete.

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
PROCHAINES ETAPES - CE QUE TU PEUX FAIRE MAINTENANT
====================================================================

Tu as entre les mains un apercu de ton profil NEUROCORE 360. Cette analyse gratuite t'a revele tes priorites. Maintenant, deux options :

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

Tu veux qu'on travaille ensemble maintenant ? Je propose trois formules :
- Essential Elite : suivi hebdomadaire, ajustements continus
- Private Lab : coaching intensif, analyse avancee
- Elite : accompagnement complet transformation

CODE PROMO COACHING : neurocore20 (-25% sur Essential Elite et Private Lab)

Contacte-moi :
Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
Rapport genere par ACHZOD - NEUROCORE 360
`;
  }

  // PREMIUM / ELITE - CTA vers COACHING
  return `

====================================================================
TU AS LES CLES - MAINTENANT, PASSONS A L'EXECUTION
====================================================================

Cette analyse t'a donne une cartographie precise de ton profil. Tu sais exactement ce qui bloque et ce qu'il faut corriger. Mais je vais etre direct avec toi :

L'INFORMATION SEULE NE CHANGE RIEN.

Ce qui change tout, c'est :
1. L'execution disciplinee des protocoles
2. Les ajustements en temps reel selon tes retours
3. La responsabilite (quelqu'un qui te tient accountable)

C'est exactement ce que je propose avec le COACHING PERSONNALISE.

CE QUE TU OBTIENS AVEC UN COACHING :

+ Appels reguliers pour ajuster en temps reel
+ Acces direct par message (pas d'attente 48h)
+ Protocols adaptes selon tes contraintes reelles
+ Suivi de tes KPIs et corrections de trajectoire
+ Mon expertise complete sur TON cas (pas un plan generique)

BONUS EXCLUSIF :
Le montant que tu as paye pour cette analyse (${amountPaid} EUR) est DEDUIT A 100% du prix du coaching.
Tu ne paies pas deux fois.

MES FORMULES :

ESSENTIAL ELITE
Suivi hebdomadaire, ajustements continus, acces messagerie
Ideal si tu veux un cadre structure et un coach qui te pousse

PRIVATE LAB
Coaching intensif, analyses avancees, protocoles sur-mesure
Pour ceux qui veulent des resultats acceleres

CODE PROMO : neurocore20 (-25% sur Essential Elite et Private Lab)

PROCHAINE ETAPE :

Reponds a cet email ou contacte-moi directement pour qu'on echange sur ta situation.
On fait un call de 15min pour voir si on est un bon fit.
Pas de pression, pas de bullshit.

Email: ${CONTACT.email}
Site: ${CONTACT.website}

---
Rapport genere par ACHZOD - NEUROCORE 360
`;
}
