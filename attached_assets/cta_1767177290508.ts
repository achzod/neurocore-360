/**
 * NEUROCORE 360 - Templates de Call-to-Actions (CTAs)
 * CTAs pour intégration au début et à la fin du rapport
 */

import { AuditTier } from './types';

// ============================================================
// CONFIGURATION
// ============================================================

export const CONTACT = {
  email: 'coaching@achzodcoaching.com',
  website: 'achzodcoaching.com'
};

export const PRICING = {
  FREE: 0,
  PREMIUM: 500 // 500 euros
};

// ============================================================
// CTA DÉBUT DE RAPPORT
// ============================================================

export function getCTADebut(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'FREE') {
    return `💡 INFOS IMPORTANTES

Tu consultes actuellement l'analyse GRATUITE de ton profil NEUROCORE 360.
Cette version te donne un aperçu de tes domaines clés et identifie tes priorités d'optimisation.

Pour débloquer l'analyse COMPLÈTE avec tous les détails, protocoles personnalisés, stack de suppléments détaillée et feuille de route précise, passe à l'analyse PREMIUM.

Si tu décides de prendre un coaching avec moi après ton analyse PREMIUM, le montant que tu auras payé pour cette analyse sera DÉDUIT À 100% du prix du coaching.

Pour toute question ou pour passer en PREMIUM :
📧 ${CONTACT.email}
🌐 ${CONTACT.website}

---
`;
  }

  // Pour PREMIUM
  return `💡 RAPPEL IMPORTANT

Tu consultes ton analyse PREMIUM NEUROCORE 360 complète.

IMPORTANT : Si tu décides de prendre un coaching avec moi après cette analyse, le montant que tu as payé pour cette analyse (${amountPaid}€) sera DÉDUIT À 100% du prix du coaching.

Pour toute question ou pour discuter de ton accompagnement :
📧 ${CONTACT.email}
🌐 ${CONTACT.website}

---
`;
}

// ============================================================
// CTA FIN DE RAPPORT
// ============================================================

export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'FREE') {
    return `

====================================================================
🎯 PROCHAINES ÉTAPES
====================================================================

Tu as maintenant un aperçu de ton profil NEUROCORE 360. Pour passer à l'action avec un plan complet et détaillé :

→ DÉBLOQUE L'ANALYSE PREMIUM
   • Tous les détails de chaque domaine
   • Protocoles personnalisés précis
   • Stack de suppléments complète
   • Feuille de route actionnable
   • Projections 30/60/90 jours

→ OU OPTE POUR UN COACHING PERSONNALISÉ
   Si tu choisis un coaching après ton analyse PREMIUM, le montant de l'analyse est déduit à 100% du prix du coaching.

📧 ${CONTACT.email}
🌐 ${CONTACT.website}

---
Rapport généré par ACHZOD - NEUROCORE 360
`;
  }

  // Pour PREMIUM
  return `

====================================================================
🎯 PRÊT À TRANSFORMER CES INSIGHTS EN RÉSULTATS CONCRETS ?
====================================================================

Tu as maintenant entre les mains une analyse complète et personnalisée de ton profil métabolique.

→ SI TU VEUX ALLER PLUS LOIN : COACHING PERSONNALISÉ
   • Accompagnement sur-mesure basé sur cette analyse
   • Ajustements en temps réel selon tes retours
   • Support continu pour maximiser tes résultats
   
   💰 BONUS : Le montant que tu as payé pour cette analyse (${amountPaid}€) est DÉDUIT À 100% du prix du coaching.

📧 Contacte-moi pour discuter de ton accompagnement :
   ${CONTACT.email}
   
🌐 ${CONTACT.website}

---
Rapport généré par ACHZOD - NEUROCORE 360
`;
}

