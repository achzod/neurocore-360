# 🔄 ITERATIONS TRACKER - Blood Analysis Perfection

**Objectif**: 100% réussite sur tous les tests
**Date début**: 2 Février 2026, 15:00

---

## 📊 ITÉRATION 1 - RÉSULTATS

**Test ID**: 787de7ec-1d04-44f5-8c7e-4e4786a9e7e7
**Commit**: 5cf600c3 (fix regex parenthèses)

### Résultats:
✅ Insuline: 49.1 µIU/mL (attendu: 49.1) - **PARFAIT**
✅ HOMA-IR: 12.61 (attendu: 12.60) - **PARFAIT**
✅ ApoA1: 109 mg/dL - **PRÉSENT**
✅ Fructosamine: 216 µmol/L - **PRÉSENT**
❌ Cortisol: ABSENT (attendu: 70 nmol/L) - **ÉCHEC**
❌ Vitamine D: 25 ng/mL (attendu: 12.3) - **ÉCHEC**
✅ Quick Start: Présent - **PARFAIT**
✅ Dashboard: Présent - **PARFAIT**
✅ Risk Assessment: Présent - **PARFAIT**
✅ Synthèse: 283 mots - **PARFAIT**
⚠️ Citations: 19 [SRC:UUID] + 10 académiques - **PARTIEL**

### Score: 8/12 tests passés = 67%

---

## 🔍 ANALYSE PROBLÈMES RESTANTS

### Problème 1: Cortisol ABSENT
**Contexte PDF**:
```
Cortisol du matin
**
70
nmol/L
(102−535)
```

**Hypothèses**:
1. Les symboles "**" causent problème dans regex
2. Pattern "cortisol" pas trouvé avec "Cortisol du matin"
3. Valeur "70" seule sur ligne non matchée

**Plan de fix**:
- Vérifier MARKER_SYNONYMS pour cortisol (ligne 793)
- Vérifier si extractMarkersFromLines gère "**"
- Ajouter pattern plus flexible pour cortisol

### Problème 2: Vitamine D = 25 au lieu de 12.3
**Contexte PDF**:
```
Vitamine D 25 OH (D2 + D3)
**
12,3
ng/mL
30,8
nmol/L
```

**Hypothèse**:
- Regex matche "25" dans "Vitamine D **25** OH" avant "12,3"
- Le "25" fait partie du nom technique (25-hydroxyvitamine)

**Plan de fix**:
- Dans extractNumberFromSnippet: skip nombres immédiatement après "Vitamine D"
- Ou améliorer pattern vitamine_d dans MARKER_SYNONYMS

### Problème 3: Citations [SRC:UUID]
**Contexte**: 19 citations [SRC:UUID] persistent

**Hypothèse**:
- Système RAG génère automatiquement [SRC:ID]
- Prompt dit de pas utiliser mais RAG force

**Plan de fix**:
- Post-traiter rapport AI pour remplacer [SRC:UUID] par format académique
- Ou modifier getBloodworkKnowledgeContext pour ne pas inclure IDs

---

## 📋 PLAN ITÉRATION 2

### Fix 1: Cortisol extraction
**Priorité**: HAUTE
**Actions**:
1. Vérifier synonymes cortisol
2. Tester pattern avec "Cortisol du matin"
3. Améliorer gestion "**"

### Fix 2: Vitamine D - ignorer "25" dans nom
**Priorité**: HAUTE
**Actions**:
1. Ajouter vérification dans extractNumberFromSnippet
2. Si trouve "Vitamine D" + nombre, chercher le SUIVANT
3. Ou pattern plus spécifique "nombre avant ng/mL"

### Fix 3: Citations [SRC:UUID]
**Priorité**: MOYENNE
**Actions**:
1. Post-processing après génération rapport
2. Regex replace [SRC:UUID] → ""
3. Garder uniquement citations académiques

---

## 📊 ITÉRATION 2 - EN COURS

**Commit**: 58c19d00 (fix cortisol + vitamine D + citations)
**Déployé**: 2 Février 2026, 16:45
**Test ID**: En cours de génération...

### Fixes appliqués:

**Fix 1: Cortisol - Plausibility range**
```typescript
// AVANT: cortisol: { min: 1, max: 50 }
// APRÈS: cortisol: { min: 1, max: 600 }
```
Impact: Permet valeurs nmol/L (range 102-535 nmol/L)

**Fix 2: Vitamine D - Patterns dangereux**
```typescript
// AVANT: vitamine_d: [/vitamine\s*d/i, /25\s*oh/i, /25[-\s]?oh\s*vit/i]
// APRÈS: vitamine_d: [/vitamine\s*d/i]
```
Impact: Ne plus matcher "25" dans "Vitamine D 25 OH"

**Fix 3: Citations - Post-processing**
```typescript
// Nouvelle ligne après génération:
const finalReport = trimmed.replace(/\[SRC:[a-f0-9-]+\]/g, '');
```
Impact: Supprime tous les [SRC:UUID], garde citations académiques

### Attentes:
✅ Insuline: 49.1 µIU/mL (déjà OK depuis itération 1)
✅ HOMA-IR: 12.60 (déjà OK depuis itération 1)
🆕 Cortisol: 70 nmol/L (devrait être extrait maintenant)
🆕 Vitamine D: 12.3 ng/mL (devrait être correct maintenant)
🆕 Citations [SRC:UUID]: 0 (devrait être supprimé)
✅ Toutes sections UX (déjà OK)

**Score attendu**: 12/12 = 100% ✨

---

**Status**: 🔄 Test en cours (b864747)
