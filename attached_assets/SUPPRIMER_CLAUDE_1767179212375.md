# 🗑️ INSTRUCTIONS STRICTES - Supprimer TOUT ce qui concerne Claude/Anthropic

## 🎯 OBJECTIF

**Supprimer COMPLÈTEMENT** tout code, import, référence ou fichier lié à Claude/Anthropic. Ne garder QUE Gemini.

## ✅ CE QU'IL FAUT FAIRE

### 1. Chercher TOUTES les références

Exécute cette commande pour trouver TOUT :
```bash
grep -r -i "claude\|anthropic" server/ --include="*.ts" --include="*.js"
```

### 2. Vérifier package.json

Dans `package.json`, **SUPPRIMER** :
- ❌ `@anthropic-ai/sdk` (si présent dans dependencies)

### 3. Vérifier les imports

Dans TOUS les fichiers TypeScript du dossier `server/`, **SUPPRIMER** :
- ❌ `import ... from '@anthropic-ai/sdk'`
- ❌ `import Anthropic from '@anthropic-ai/sdk'`
- ❌ Tout import contenant "anthropic" ou "claude"

### 4. Vérifier les fichiers obsolètes

**SUPPRIMER COMPLÈTEMENT** ces fichiers s'ils existent :
- ❌ `server/narrativeEngineAI.ts` (ANCIEN système)
- ❌ `server/photoAnalysisAI.ts` (ANCIEN système)
- ❌ `server/expertProtocols.ts` (ANCIEN système)
- ❌ Tout fichier qui contient "claude" ou "anthropic" dans le nom

### 5. Vérifier les fonctions

Dans TOUS les fichiers, **SUPPRIMER** :
- ❌ Toutes les fonctions qui utilisent l'API Anthropic
- ❌ Tous les appels à `Anthropic.Message.create()` ou similaire
- ❌ Toutes les références à des modèles Claude (claude-3, claude-4, etc.)

## ⚠️ CE QUI DOIT RESTER (GEMINI UNIQUEMENT)

**GARDER** :
- ✅ `@google/generative-ai` (dans package.json)
- ✅ `import { GoogleGenerativeAI } from '@google/generative-ai'`
- ✅ `server/geminiPremiumEngine.ts` (système actuel)
- ✅ `server/supplementEngine.ts` (utilise Gemini)
- ✅ Toutes les références à `gemini-3-pro-preview` ou `gemini`

## 🚫 NE PAS HALLUCINER

### ❌ NE PAS créer de code
- Ne PAS créer de fonctions "de secours" avec Claude
- Ne PAS créer de "fallback" vers Claude
- Ne PAS créer de systèmes parallèles

### ❌ NE PAS modifier le code Gemini
- Ne PAS changer `geminiPremiumEngine.ts` pour ajouter Claude
- Ne PAS modifier les appels Gemini
- Ne PAS toucher à la configuration Gemini

### ❌ NE PAS supposer
- Ne PAS supposer qu'il faut garder Claude "au cas où"
- Ne PAS garder de code "commenté" avec Claude
- Ne PAS créer de TODO pour réintégrer Claude

## ✅ CHECKLIST FINALE

Avant de terminer, vérifier :

- [ ] Aucune référence à "claude" dans `grep -r -i claude server/`
- [ ] Aucune référence à "anthropic" dans `grep -r -i anthropic server/`
- [ ] `package.json` ne contient PAS `@anthropic-ai/sdk`
- [ ] Aucun fichier `*claude*.ts` ou `*anthropic*.ts` dans `server/`
- [ ] Aucun import `@anthropic-ai/sdk` dans les fichiers
- [ ] `server/geminiPremiumEngine.ts` existe et fonctionne avec Gemini
- [ ] `server/config.ts` contient UNIQUEMENT `GEMINI_MODEL: "gemini-3-pro-preview"`

## 📋 COMMANDES DE VÉRIFICATION

```bash
# Vérifier qu'il n'y a plus de références Claude
grep -r -i "claude\|anthropic" server/ --include="*.ts"

# Vérifier package.json
cat package.json | grep -i "anthropic"

# Lister les fichiers dans server/
ls -la server/

# Vérifier les imports
grep -r "from '@anthropic" server/
```

**Toutes ces commandes doivent retourner AUCUN résultat (vide).**

## 🎯 RÉSUMÉ

1. Chercher toutes les références à Claude/Anthropic
2. Supprimer TOUT ce qui concerne Claude/Anthropic
3. Garder UNIQUEMENT Gemini
4. Vérifier avec les commandes ci-dessus
5. Ne PAS créer ou modifier quoi que ce soit d'autre

---

**Le système doit utiliser UNIQUEMENT Gemini. Claude = SUPPRIMÉ COMPLÈTEMENT.**

