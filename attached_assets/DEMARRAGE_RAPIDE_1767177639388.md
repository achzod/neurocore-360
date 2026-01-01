# 🚀 DÉMARRAGE RAPIDE - Guide Ultra Simple

## 🎯 Objectif

Générer un audit premium avec TOUTES les 18 sections en utilisant le système existant.

## ✅ 3 ÉTAPES SIMPLES

### Étape 1 : Importer la fonction

```typescript
import { generateAndConvertAudit } from './server/geminiPremiumEngine';
```

### Étape 2 : Appeler la fonction

```typescript
const result = await generateAndConvertAudit(
  clientData,      // Les données du client
  photoAnalysis,   // Les photos (ou null)
  'PREMIUM'        // Le tier (FREE ou PREMIUM)
);
```

### Étape 3 : Utiliser le résultat

```typescript
if (result.success) {
  console.log(result.txt); // Le rapport complet en TXT
} else {
  console.error(result.error); // L'erreur
}
```

## 📋 C'EST TOUT

**Le système génère automatiquement :**
- ✅ Les 18 sections avec leurs prompts complets
- ✅ La stack de suppléments
- ✅ Les CTAs au début et à la fin
- ✅ Le format TXT complet

## ⚠️ NE PAS FAIRE

- ❌ Créer de nouveaux fichiers
- ❌ Modifier les prompts (ils sont déjà complets)
- ❌ Créer des fonctions alternatives
- ❌ Utiliser d'autres systèmes

## 📁 Fichiers à avoir

1. `server/geminiPremiumEngine.ts` (le système principal)
2. `server/config.ts` (la configuration)
3. `server/types.ts` (les types)
4. `server/supplementEngine.ts` (pour la stack)
5. `server/cta.ts` (pour les CTAs)

## ❓ Problème ?

Lire `docs/INSTRUCTIONS_STRICTES.md` pour les règles détaillées.

---

**Le système fonctionne. Il suffit de l'utiliser correctement.**

