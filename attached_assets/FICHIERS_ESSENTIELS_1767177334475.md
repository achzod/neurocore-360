# 📁 Fichiers Essentiels pour Générer les Audits

## ✅ FICHIERS OBLIGATOIRES

Pour générer un audit avec le système Gemini Premium Engine, tu dois avoir accès à ces fichiers :

### 1. Configuration
- **`server/config.ts`** ✅
  - Clé API Gemini
  - Modèle : `gemini-3-pro-preview`
  - Paramètres (temperature, max tokens, retries)

### 2. Système de Génération Principal
- **`server/geminiPremiumEngine.ts`** ✅ **CRITIQUE**
  - Toutes les 18 sections définies
  - Tous les prompts dans `SECTION_INSTRUCTIONS`
  - Fonction `generateAndConvertAudit()` à utiliser
  - Fonction `callGemini()` pour les appels API

### 3. Types TypeScript
- **`server/types.ts`** ✅
  - `ClientData` : structure des données client
  - `PhotoAnalysis` : structure analyse photos
  - `AuditResult` : structure résultat
  - `SectionName` : noms des sections
  - `AuditTier` : FREE / PREMIUM

### 4. Stack de Suppléments
- **`server/supplementEngine.ts`** ✅
  - Génération automatique de la stack
  - Intégration avec le rapport

### 5. CTAs (Call-to-Actions)
- **`server/cta.ts`** ✅
  - Templates CTA début/fin
  - Mentions coaching et déduction

### 6. Serveur Express
- **`server/index.ts`** ✅
  - Endpoint `/api/generate-premium-audit`
  - Configuration Express

### 7. Dossier Stack (pour suppléments)
- **`stack/achzod_supplement_engine_SYSTEM_PROMPT.txt`** ✅
- **`stack/supplement_library_v1.json`** ✅

## 📋 FICHIERS DE DOCUMENTATION (utiles mais pas obligatoires)

- **`docs/UTILISER_GEMINI_PREMIUM_ENGINE.md`** - Instructions d'utilisation
- **`docs/UPDATE_GEMINI_MODEL.md`** - Info modèle Gemini
- **`README.md`** - Documentation générale

## 🎯 FICHIERS À IGNORER

- ❌ `neurocore-360-rapport-*.html` (rapports générés, pas nécessaires)
- ❌ `client/` (frontend, pas nécessaire pour génération)
- ❌ `scripts/` (scripts de test)

## ✅ CHECKLIST POUR L'AGENT IA

Avant de générer un audit, vérifier que tu as :

1. ✅ `server/config.ts` (avec la bonne clé API et modèle)
2. ✅ `server/geminiPremiumEngine.ts` (avec toutes les sections)
3. ✅ `server/types.ts` (pour les types)
4. ✅ `server/supplementEngine.ts` (pour la stack)
5. ✅ `server/cta.ts` (pour les CTAs)
6. ✅ Dossier `stack/` avec les 2 fichiers
7. ✅ `server/index.ts` (pour comprendre l'endpoint)

## 🔧 COMMENT UTILISER

1. **Importer la fonction principale** :
   ```typescript
   import { generateAndConvertAudit } from './geminiPremiumEngine';
   ```

2. **Appeler avec les données client** :
   ```typescript
   const result = await generateAndConvertAudit(
     clientData,      // type: ClientData
     photoAnalysis,   // type: PhotoAnalysis | null (optionnel)
     'PREMIUM'        // type: AuditTier
   );
   ```

3. **Le système génère automatiquement** :
   - Les 18 sections avec leurs prompts complets
   - La stack de suppléments
   - Les CTAs au début et à la fin
   - Le format TXT complet

## ⚠️ IMPORTANT

**TOUS les prompts sont déjà dans `geminiPremiumEngine.ts`** dans la constante `SECTION_INSTRUCTIONS`.

Il n'y a PAS besoin de chercher d'autres fichiers de prompts ou templates. Tout est dans ce fichier.

---

**Ces fichiers sont suffisants pour générer des audits complets.**

