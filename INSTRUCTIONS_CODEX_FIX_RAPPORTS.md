# INSTRUCTIONS CODEX - FIX RAPPORTS SANG

**Date**: 2026-01-29
**Priorité**: CRITIQUE
**Durée estimée**: 30 minutes
**Fichier à modifier**: `server/blood-analysis/recommendations-engine.ts`

---

## 🎯 CONTEXTE

Les rapports générés sont de mauvaise qualité car:
1. Le code SUPPRIME volontairement les citations d'experts (ligne 433, 450)
2. Les snippets sont trop courts (500 chars au lieu de 2000+)
3. Nombre d'insights limité à 10 (devrait être 20)

Tu vas faire 3 fixes chirurgicaux. **NE TOUCHE À RIEN D'AUTRE.**

---

## 📋 FIX #1: SUPPRIMER LES .replace() QUI EFFACENT LES NOMS

### Fichier: `server/blood-analysis/recommendations-engine.ts`

### Ligne 432-434 (fonction `generateScientificInsights`)

**❌ CODE ACTUEL (MAUVAIS)**:
```typescript
const snippet = article.content.substring(0, 500)
  .replace(/\b(huberman|attia|examine|mpmd)\b/gi, "recherche")
  .trim();
```

**✅ CODE CORRIGÉ**:
```typescript
const snippet = article.content.substring(0, 2000)
  .trim();
```

**CHANGEMENTS**:
1. Supprimer COMPLÈTEMENT la ligne `.replace(/\b(huberman|attia|examine|mpmd)\b/gi, "recherche")`
2. Changer `500` → `2000`

---

### Ligne 449-452 (fonction `generateScientificInsights`)

**❌ CODE ACTUEL (MAUVAIS)**:
```typescript
const snippet = article.content.substring(0, 500)
  .replace(/\b(huberman|attia|examine|mpmd)\b/gi, "études")
  .trim();
```

**✅ CODE CORRIGÉ**:
```typescript
const snippet = article.content.substring(0, 2000)
  .trim();
```

**CHANGEMENTS**:
1. Supprimer COMPLÈTEMENT la ligne `.replace(/\b(huberman|attia|examine|mpmd)\b/gi, "études")`
2. Changer `500` → `2000`

---

## 📋 FIX #2: AUGMENTER NOMBRE D'INSIGHTS

### Fichier: `server/blood-analysis/recommendations-engine.ts`

### Ligne 456 (fonction `generateScientificInsights`)

**❌ CODE ACTUEL**:
```typescript
return insights.slice(0, 10); // Return max 10 insights
```

**✅ CODE CORRIGÉ**:
```typescript
return insights.slice(0, 20); // Return max 20 insights
```

**CHANGEMENTS**:
1. Changer `10` → `20`
2. Mettre à jour le commentaire

---

## 🚨 GARDE-FOUS CRITIQUES

### CE QUE TU DOIS FAIRE:
- ✅ Modifier EXACTEMENT les 3 endroits mentionnés ci-dessus
- ✅ Supprimer les lignes `.replace()` COMPLÈTEMENT
- ✅ Changer `500` → `2000` (2 endroits)
- ✅ Changer `10` → `20` (1 endroit)
- ✅ Sauvegarder le fichier

### CE QUE TU NE DOIS PAS FAIRE:
- ❌ NE TOUCHE PAS aux autres parties du fichier
- ❌ NE MODIFIE PAS les imports
- ❌ NE MODIFIE PAS les interfaces TypeScript
- ❌ NE MODIFIE PAS la structure du code
- ❌ NE MODIFIE PAS les noms de fonctions
- ❌ NE MODIFIE PAS les autres fonctions
- ❌ NE REFACTORISE RIEN
- ❌ N'AJOUTE PAS de nouvelles fonctionnalités
- ❌ NE CHANGE PAS le formatage général du fichier

**IMPORTANT**: Si tu vois d'autres problèmes ou améliorations possibles, **IGNORE-LES**. Ne fais QUE les 3 fixes demandés.

---

## 📍 LOCALISATION EXACTE DES CHANGEMENTS

Pour t'aider à trouver les bonnes lignes:

### Ligne ~432-434 (première occurrence)
```typescript
// Contexte avant:
for (const marker of markers) {
  // ... code ...
  if (article.content.toLowerCase().includes(keyword)) {
    const snippet = article.content.substring(0, 500)           // ← CHANGER 500 → 2000
      .replace(/\b(huberman|attia|examine|mpmd)\b/gi, "recherche") // ← SUPPRIMER CETTE LIGNE
      .trim();
    insights.push(snippet);
  }
}
```

### Ligne ~449-452 (deuxième occurrence)
```typescript
// Contexte avant:
for (const riskKey of criticalRisks) {
  // ... code ...
  const snippet = article.content.substring(0, 500)           // ← CHANGER 500 → 2000
    .replace(/\b(huberman|attia|examine|mpmd)\b/gi, "études") // ← SUPPRIMER CETTE LIGNE
    .trim();
  insights.push(snippet);
}
```

### Ligne ~456 (troisième changement)
```typescript
// Contexte avant:
}

return insights.slice(0, 10); // Return max 10 insights  // ← CHANGER 10 → 20
```

---

## ✅ VALIDATION APRÈS MODIFICATIONS

### Étape 1: Vérifier TypeScript compile
```bash
npx tsc --noEmit
```

**Résultat attendu**: `0 erreurs`

Si erreurs TypeScript, **NE CONTINUE PAS** et dis-moi qu'il y a des erreurs.

---

### Étape 2: Vérifier les changements avec grep

```bash
# Vérifier qu'il n'y a PLUS de .replace() qui efface les noms
grep -n "\.replace.*huberman.*attia.*examine.*mpmd" server/blood-analysis/recommendations-engine.ts
```

**Résultat attendu**: `Aucun résultat` (la ligne ne doit plus exister)

Si tu vois encore des résultats, **TU AS RATÉ LE FIX**, recommence.

---

```bash
# Vérifier que substring(0, 2000) existe maintenant
grep -n "substring(0, 2000)" server/blood-analysis/recommendations-engine.ts
```

**Résultat attendu**: `2 lignes trouvées` (lignes ~433 et ~450)

Si tu vois moins de 2 résultats, **TU AS RATÉ LE FIX**, recommence.

---

```bash
# Vérifier que slice(0, 20) existe
grep -n "slice(0, 20)" server/blood-analysis/recommendations-engine.ts
```

**Résultat attendu**: `1 ligne trouvée` (ligne ~456)

Si tu ne vois pas ce résultat, **TU AS RATÉ LE FIX**, recommence.

---

### Étape 3: Compte-rendu

Une fois les 3 fixes faits ET validés, dis-moi:

```
✅ FIX #1: Supprimé .replace() aux lignes X et Y
✅ FIX #2: Changé substring(0, 500) → substring(0, 2000) aux lignes X et Y
✅ FIX #3: Changé slice(0, 10) → slice(0, 20) à la ligne Z
✅ TypeScript compile: 0 erreurs
✅ Validations grep: PASSED
```

---

## 📊 RÉSULTAT ATTENDU

### Avant tes modifications:
```typescript
const snippet = article.content.substring(0, 500)
  .replace(/\b(huberman|attia|examine|mpmd)\b/gi, "recherche")
  .trim();
// ...
return insights.slice(0, 10);
```

### Après tes modifications:
```typescript
const snippet = article.content.substring(0, 2000)
  .trim();
// ...
return insights.slice(0, 20);
```

**Impact**:
- Snippets 4x plus longs (500 → 2000 chars)
- Citations d'experts PRÉSERVÉES (plus de .replace())
- 2x plus d'insights (10 → 20)
- Rapports passent de "génériques" à "niveau MPMD"

---

## 🚨 EN CAS D'ERREUR

Si tu rencontres UNE SEULE erreur TypeScript ou validation:
1. **ARRÊTE-TOI IMMÉDIATEMENT**
2. **NE COMMIT PAS**
3. Dis-moi exactement quelle erreur tu as
4. Attends mes instructions

---

## 📝 COMMIT MESSAGE (si tout est OK)

Quand les 3 fixes sont faits et validés, commit avec ce message:

```bash
git add server/blood-analysis/recommendations-engine.ts
git commit -m "fix: preserve expert citations in blood reports

- Remove .replace() that was erasing Huberman/Attia/MPMD/Examine names
- Increase snippet length from 500 to 2000 chars
- Increase max insights from 10 to 20
- Fixes issue: reports now include full expert citations with context"
```

---

## ✅ CHECKLIST FINALE

Avant de me dire que c'est fini, vérifie:

- [ ] J'ai modifié EXACTEMENT 3 endroits (lignes ~433, ~450, ~456)
- [ ] J'ai SUPPRIMÉ les 2 lignes `.replace()` complètement
- [ ] J'ai changé `500` → `2000` (2 occurrences)
- [ ] J'ai changé `10` → `20` (1 occurrence)
- [ ] `npx tsc --noEmit` retourne 0 erreurs
- [ ] `grep` validation #1 ne trouve AUCUN `.replace()` suspect
- [ ] `grep` validation #2 trouve 2 occurrences de `substring(0, 2000)`
- [ ] `grep` validation #3 trouve 1 occurrence de `slice(0, 20)`
- [ ] Je n'ai touché à RIEN d'autre dans le fichier
- [ ] J'ai fait le commit avec le message exact fourni

---

**GO - Fais ces 3 fixes maintenant. Sois chirurgical. Ne touche à RIEN d'autre.**
