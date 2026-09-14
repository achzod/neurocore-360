# Pré Peptides Engine, funnel de pré-conversion

## Objectif

Transformer un visiteur intéressé par les peptides en lead qualifié avant le questionnaire payant, puis lui montrer immédiatement la valeur d'une personnalisation réelle.

## Parcours

1. Le visiteur ouvre `/peptides-preview` depuis une newsletter, une vidéo, une story ou la page offre.
2. Il renseigne son profil, son objectif prioritaire, deux objectifs secondaires maximum, les facteurs qui changent la sélection, son bilan sanguin et ses contraintes pratiques.
3. `POST /api/peptides-preview/analyze` valide le payload avec Zod et recharge le feed public PeptAura.
4. Le moteur déterministe sélectionne uniquement des molécules cohérentes et actuellement achetables.
5. Le résultat affiche le nombre exact de molécules retenues, leur nom, leur fonction, une justification personnalisée, la durée envisagée et le coût du panier initial PeptAura.
6. Les dosages, le calendrier, la reconstitution, les quantités finales et les arbitrages restent réservés au rapport Peptides Engine.
7. Les réponses, le consentement, l'attribution UTM et le résultat sont sauvegardés sous la clé `peptides-preview::<email>` dans le stockage de progression existant.
8. Le CTA envoie vers Peptides Engine Solo, Blood Analysis si un bilan hormonal récent est indispensable, ou la page offre lorsqu'une revue ciblée est nécessaire.

## Garde-fous

- Aucun appel IA pour le preview.
- Aucun prix statique ou inventé : feed PeptAura obligatoire et âgé de moins de six heures.
- Cache serveur de quinze minutes pour limiter la charge externe.
- Toute indisponibilité du feed ou d'une molécule requise bloque le résultat complet avec HTTP 503.
- Cancer, grossesse, allaitement, problème cardiaque ou atteinte rénale/hépatique ne reçoivent aucun stack automatique.
- Objectif testostérone sans bilan récent : redirection Blood Analysis, aucune recommandation hormonale.
- Hypertension avec objectif libido, diabète avec objectif fat loss ou refus des injections : revue requise.
- Le frontend ne reçoit pas les URLs fournisseurs.
- Rate limit : cinq analyses par minute et par client réseau.
- L'analytics reçoit uniquement le nom d'événement, jamais l'email ni les réponses.

## Coût affiché

Le chiffre public est le total exact des premiers formats achetables actuellement pour les molécules retenues. Il est présenté comme `budget PeptAura initial estimé`, hors livraison. Il ne prétend pas être le coût final du cycle, car celui-ci dépend des dosages et des quantités calculés dans le rapport payant.

## Relance différée

Le MVP enregistre `previewStatus`, `capturedAt` et `followUpEligibleAt`, mais n'envoie aucune relance. Une phase suivante pourra ajouter une séquence dédiée aux clés `peptides-preview::`, avec arrêt immédiat après achat. Cette activation nécessite une validation explicite des textes, délais et règles de déduplication.

## Definition of done

- Schéma Zod et moteur pur testés.
- Feed PeptAura live validé.
- Page accessible au clavier et responsive.
- Build frontend et serveur réussi hors gate de secrets préexistant.
- Rendus 390 px et 1200 px inspectés.
- Aucun push, merge, déploiement ou email sans validation d'Achzod.
