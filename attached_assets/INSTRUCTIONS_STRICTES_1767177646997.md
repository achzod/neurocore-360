# ⚠️ INSTRUCTIONS STRICTES - NE PAS FAIRE N'IMPORTE QUOI

## 🚨 RÈGLES ABSOLUES - À RESPECTER IMPÉRATIVEMENT

### ❌ NE JAMAIS FAIRE :

1. **NE PAS créer de nouveaux fichiers de prompts**
   - Tous les prompts sont DÉJÀ dans `server/geminiPremiumEngine.ts`
   - NE PAS créer `prompts.ts`, `templates.ts`, ou autres fichiers
   - NE PAS modifier les prompts existants sans raison valable

2. **NE PAS utiliser `getSectionPromptData`**
   - Cette fonction N'EXISTE PAS dans ce code
   - Si tu la vois mentionnée, c'est l'ANCIEN système (à ignorer)

3. **NE PAS créer de fonctions alternatives**
   - Utiliser UNIQUEMENT `generateAndConvertAudit()` de `geminiPremiumEngine.ts`
   - NE PAS créer de nouvelles fonctions de génération

4. **NE PAS modifier la liste des sections**
   - Les 18 sections sont DÉFINIES et COMPLÈTES
   - NE PAS ajouter de sections
   - NE PAS supprimer de sections
   - NE PAS renommer de sections

5. **NE PAS changer le modèle Gemini**
   - Utiliser UNIQUEMENT `gemini-3-pro-preview`
   - NE PAS utiliser `gemini-2.5-flash` ou autres modèles
   - Le modèle est défini dans `server/config.ts`

6. **NE PAS créer de système parallèle**
   - Il existe UN SEUL système : `geminiPremiumEngine.ts`
   - NE PAS créer de système alternatif ou de "fallback"

## ✅ CE QU'IL FAUT FAIRE (EXACTEMENT) :

### 1. Utiliser le bon système

```typescript
// ✅ BON - Utiliser cette fonction
import { generateAndConvertAudit } from './geminiPremiumEngine';

const result = await generateAndConvertAudit(
  clientData,
  photoAnalysis,
  'PREMIUM'
);
```

### 2. Utiliser le bon endpoint

```
POST /api/generate-premium-audit
```

### 3. Vérifier les fichiers avant de modifier

Avant de modifier QUOI QUE CE SOIT, lire d'abord :
- `server/geminiPremiumEngine.ts` (lignes 116-391) pour voir les prompts
- `server/config.ts` pour voir la configuration
- `docs/UTILISER_GEMINI_PREMIUM_ENGINE.md` pour comprendre le système

### 4. Vérifier que tu utilises le bon système

Si tu vois ces messages dans les logs, c'est BON :
- ✅ `🔄 Génération audit PREMIUM avec GEMINI pour...`
- ✅ `[1/18] Introduction...`
- ✅ `[2/18] Analyse visuelle photo face et dos...`

Si tu vois ces messages, c'est MAUVAIS :
- ❌ `getSectionPromptData` (fonction inexistante)
- ❌ Sections comme "HRV & Santé Cardiaque" (mauvaises sections)
- ❌ Modèle `gemini-2.5-flash` (mauvais modèle)

## 🔍 CHECKLIST AVANT DE MODIFIER QUOI QUE CE SOIT

1. ✅ J'ai lu `server/geminiPremiumEngine.ts` en entier ?
2. ✅ J'ai vérifié que `SECTION_INSTRUCTIONS` contient les 18 sections ?
3. ✅ J'utilise bien `generateAndConvertAudit()` et pas autre chose ?
4. ✅ Le modèle dans `config.ts` est bien `gemini-3-pro-preview` ?
5. ✅ Je n'ai pas créé de nouveaux fichiers de prompts ?

## 📋 STRUCTURE ATTENDUE DU RAPPORT

Le rapport doit contenir EXACTEMENT ces 18 sections (dans cet ordre) :

1. Introduction
2. Analyse visuelle photo face et dos
3. Sangle profonde / posture lombaires
4. Analyse entraînement
5. Cardio
6. Nutrition & métabolisme
7. Sommeil & biohacking
8. Digestion & tolérances
9. Axes hormonaux & bilans
10. Moment Révélation
11. Cause Racine en 3 phrases
12. Radar Profil actuel et Profil optimisé
13. Ton Potentiel Inexploité
14. Feuille de Route en 6 Points
15. Projection 30/60/90 jours
16. Ce qui va changer si on travaille ensemble
17. Réassurance émotionnelle
18. Stack de Suppléments (généré automatiquement)
19. Synthèse clinique globale et Conclusion transformationnelle

**PAS D'AUTRES SECTIONS.**

## 🚫 ERREURS COMMUNES À ÉVITER

### Erreur 1 : Créer des prompts manquants
❌ **FAUX** : "Il manque des prompts, je vais les créer"
✅ **VRAI** : Tous les prompts sont déjà dans `SECTION_INSTRUCTIONS` (lignes 116-391 de `geminiPremiumEngine.ts`)

### Erreur 2 : Utiliser l'ancien système
❌ **FAUX** : "Je vais utiliser `getSectionPromptData`"
✅ **VRAI** : Cette fonction n'existe pas, utiliser `generateAndConvertAudit()`

### Erreur 3 : Modifier les sections
❌ **FAUX** : "Je vais ajouter/modifier des sections"
✅ **VRAI** : Les 18 sections sont définies et complètes, ne pas les modifier

### Erreur 4 : Changer le modèle
❌ **FAUX** : "Je vais utiliser `gemini-2.5-flash`"
✅ **VRAI** : Utiliser `gemini-3-pro-preview` (défini dans `config.ts`)

### Erreur 5 : Créer un système parallèle
❌ **FAUX** : "Je vais créer un nouveau système de génération"
✅ **VRAI** : Le système existe déjà, utiliser `geminiPremiumEngine.ts`

## 🎯 SI QUELQUE CHOSE NE FONCTIONNE PAS

### Problème : "Il manque des prompts"
✅ **Solution** : Vérifier `server/geminiPremiumEngine.ts` ligne 116, `SECTION_INSTRUCTIONS` contient TOUS les prompts

### Problème : "Le modèle n'existe pas"
✅ **Solution** : Vérifier `server/config.ts`, le modèle doit être `gemini-3-pro-preview`

### Problème : "Certaines sections ne sont pas générées"
✅ **Solution** : Vérifier que tu utilises bien `generateAndConvertAudit()` et pas un autre système

### Problème : "Le format du rapport est différent"
✅ **Solution** : Vérifier que tu utilises bien `geminiPremiumEngine.ts` et pas un ancien système

## 📝 CODE EXACT À UTILISER

```typescript
// ✅ COPY-PASTE CE CODE (ne rien modifier)

import { generateAndConvertAudit } from './server/geminiPremiumEngine';
import { ClientData, PhotoAnalysis } from './server/types';

// Données client (exemple)
const clientData: ClientData = {
  prenom: "Thomas",
  // ... autres données
};

// Analyse photo (optionnel)
const photoAnalysis: PhotoAnalysis | null = null; // ou données réelles

// Générer l'audit
const result = await generateAndConvertAudit(
  clientData,
  photoAnalysis,
  'PREMIUM'
);

// Le résultat contient :
// - result.success (boolean)
// - result.txt (string) - le rapport complet
// - result.clientName (string)
// - result.metadata (object)
```

## ⚠️ DERNIER AVERTISSEMENT

**SI TU NE SAIS PAS QUOI FAIRE :**
1. Lire `docs/UTILISER_GEMINI_PREMIUM_ENGINE.md`
2. Lire `docs/FICHIERS_ESSENTIELS.md`
3. Lire `server/geminiPremiumEngine.ts` en entier
4. NE PAS créer de nouveau code sans comprendre l'existant
5. NE PAS modifier les prompts sans raison valable
6. DEMANDER si quelque chose n'est pas clair

**LE SYSTÈME EST COMPLET. IL N'Y A PAS BESOIN DE CRÉER QUOI QUE CE SOIT.**

