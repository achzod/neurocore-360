# 🎯 INSTRUCTIONS : Utiliser le système Gemini Premium Engine

## ⚠️ IMPORTANT

Il existe **DEUX systèmes** de génération de rapports :

1. ❌ **ANCIEN SYSTÈME** : Utilise `getSectionPromptData` (incomplet, ne fonctionne pas bien)
2. ✅ **NOUVEAU SYSTÈME** : `geminiPremiumEngine.ts` (COMPLET, avec tous les prompts)

## ✅ UTILISER LE BON SYSTÈME

### Fichier principal
`server/geminiPremiumEngine.ts`

### Fonction à utiliser
```typescript
import { generateAndConvertAudit } from './geminiPremiumEngine';

const result = await generateAndConvertAudit(clientData, photoAnalysis, 'PREMIUM');
```

### Endpoint API
```
POST /api/generate-premium-audit
```

## 📋 TOUTES LES SECTIONS SONT DÉFINIES

Le système `geminiPremiumEngine.ts` contient **TOUTES les 18 sections** avec leurs prompts complets :

1. **Introduction** ✅
2. **Analyse visuelle photo face et dos** ✅
3. **Sangle profonde / posture lombaires** ✅
4. **Analyse entraînement** ✅
5. **Cardio** ✅
6. **Nutrition & métabolisme** ✅
7. **Sommeil & biohacking** ✅
8. **Digestion & tolérances** ✅
9. **Axes hormonaux & bilans** ✅
10. **Moment Révélation** ✅
11. **Cause Racine en 3 phrases** ✅
12. **Radar Profil actuel et Profil optimisé** ✅
13. **Ton Potentiel Inexploité** ✅
14. **Feuille de Route en 6 Points** ✅
15. **Projection 30/60/90 jours** ✅
16. **Ce qui va changer si on travaille ensemble** ✅
17. **Réassurance émotionnelle** ✅
18. **Stack de Suppléments** ✅ (généré automatiquement par `supplementEngine.ts`)
19. **Synthèse clinique globale et Conclusion transformationnelle** ✅

## 🔍 OÙ SONT LES PROMPTS ?

Les prompts sont dans `server/geminiPremiumEngine.ts` :

- **Ligne 116+** : `SECTION_INSTRUCTIONS` - Instructions spécifiques pour chaque section
- **Ligne 46+** : `PROMPT_SECTION` - Template maître avec toutes les règles

## ❌ NE PAS UTILISER

- ❌ `getSectionPromptData` (n'existe pas dans ce code)
- ❌ Anciens systèmes avec sections incomplètes
- ❌ Templates de prompts externes

## ✅ À FAIRE

1. Utiliser `generateAndConvertAudit()` depuis `geminiPremiumEngine.ts`
2. Utiliser l'endpoint `/api/generate-premium-audit`
3. Toutes les sections sont déjà configurées avec leurs prompts complets

## 📊 VÉRIFICATION

Pour vérifier que le bon système est utilisé, regarder les logs :
- ✅ Devrait voir : `🔄 Génération audit PREMIUM avec GEMINI pour...`
- ✅ Devrait voir : `[1/18] Introduction...`, `[2/18] Analyse visuelle...`, etc.
- ✅ Toutes les 18 sections doivent être générées

---

**LE SYSTÈME EST COMPLET. Il n'y a pas besoin d'ajouter de prompts manquants - tout est déjà dans `SECTION_INSTRUCTIONS`.**

