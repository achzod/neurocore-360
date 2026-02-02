# INSTRUCTIONS CODEX - FIX #4: AJOUTER CITATIONS PROTOCOLES

**Date**: 2026-01-29
**Priorité**: HAUTE
**Durée estimée**: 20 minutes
**Fichier à modifier**: `server/blood-analysis/recommendations-engine.ts`

---

## 🎯 CONTEXTE

Les protocoles ont déjà des steps détaillés, mais **manquent de citations d'experts** pour appuyer les recommandations.
Tu vas ajouter un champ `citations: []` à chaque protocole avec 2-3 citations MPMD/Huberman/Attia.

**NE TOUCHE À RIEN D'AUTRE QUE CE QUI EST SPÉCIFIÉ CI-DESSOUS.**

---

## 📋 MODIFICATIONS À FAIRE

### Étape 1: Ajouter l'interface TypeScript

**Fichier**: `server/blood-analysis/recommendations-engine.ts`
**Localisation**: Ligne ~34 (interface ProtocolRecommendation)

**✅ CODE À MODIFIER**:

Trouve cette interface:
```typescript
export interface ProtocolRecommendation {
  name: string;
  category: "nutrition" | "training" | "lifestyle" | "sleep" | "stress" | "supplements";
  priority: 1 | 2 | 3;
  duration: string;
  frequency: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  targetRiskScores: string[];
  scienceContext?: string;
}
```

Ajoute cette ligne APRÈS `scienceContext`:
```typescript
  citations?: string[];  // ← AJOUTER CETTE LIGNE
```

**RÉSULTAT FINAL**:
```typescript
export interface ProtocolRecommendation {
  name: string;
  category: "nutrition" | "training" | "lifestyle" | "sleep" | "stress" | "supplements";
  priority: 1 | 2 | 3;
  duration: string;
  frequency: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  targetRiskScores: string[];
  scienceContext?: string;
  citations?: string[];  // ← AJOUTÉ
}
```

---

### Étape 2: Ajouter citations aux 6 protocoles

**Fichier**: `server/blood-analysis/recommendations-engine.ts`
**Localisation**: Lignes 754-888 (fonction generateProtocolRecommendations)

Pour chaque protocole (6 au total), tu vas ajouter un champ `citations: [...]` JUSTE AVANT `targetRiskScores`.

**FORMAT EXACT**:
```typescript
protocols.push({
  name: "...",
  category: "...",
  priority: 1,
  duration: "...",
  frequency: "...",
  description: "...",
  steps: [...],
  expectedOutcome: "...",
  citations: [  // ← AJOUTER ICI
    "Citation 1",
    "Citation 2"
  ],
  targetRiskScores: [...],
});
```

---

## 📝 CITATIONS À AJOUTER (COPIE-COLLE EXACT)

### 1. PROTOCOLE ANTI-RÉSISTANCE INSULINE (ligne ~754)

**LOCALISATION**: Trouve `name: "Protocole Anti-Résistance Insuline"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Dr. Andrew Huberman: \"Eating fiber and protein before carbohydrates reduces glucose spikes by 30-40% - a simple food sequencing hack\"",
        "Dr. Peter Attia: \"Postprandial walks of 15 minutes significantly improve glucose disposal and insulin sensitivity over time\"",
        "Examine.com: \"Apple cider vinegar before carb-heavy meals improves insulin sensitivity by slowing gastric emptying\""
      ],
```

---

### 2. PROTOCOLE CARDIO-PROTECTION (ligne ~776)

**LOCALISATION**: Trouve `name: "Protocole Cardio-Protection"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Dr. Andrew Huberman: \"Zone 2 cardio 150-180 min/week is the sweet spot for mitochondrial health and cardiovascular longevity\"",
        "Dr. Peter Attia: \"The TG/HDL ratio is a powerful predictor of cardiovascular risk - aim for <2 through diet and exercise\"",
        "MPMD: \"Omega-3 from fish 3x/week plus 2g EPA/DHA supplement dramatically reduces triglycerides and inflammation\""
      ],
```

---

### 3. PROTOCOLE OPTIMISATION HORMONALE (ligne ~799)

**LOCALISATION**: Trouve `name: "Protocole Optimisation Hormonale"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Derek de MPMD: \"Heavy compound lifts 3-4x/week are non-negotiable for natural testosterone optimization - focus on squats, deadlifts, presses\"",
        "Dr. Andrew Huberman: \"7-9 hours of quality sleep in total darkness maximizes GH and testosterone production during the night\"",
        "Examine.com: \"Prolonged caloric deficits >500 kcal suppress testosterone 20-30% - maintain adequate calories for hormonal health\"",
        "MPMD: \"Morning sunlight exposure 10-20 minutes sets circadian rhythm and supports vitamin D synthesis for testosterone\""
      ],
```

---

### 4. PROTOCOLE ANTI-INFLAMMATOIRE (ligne ~823)

**LOCALISATION**: Trouve `name: "Protocole Anti-Inflammatoire"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Dr. Rhonda Patrick: \"Eliminating seed oils (soybean, corn, canola) and increasing omega-3 dramatically shifts the inflammatory balance\"",
        "Dr. Andrew Huberman: \"Chronic stress elevates cytokines like IL-6 and TNF-alpha - managing stress is crucial for reducing inflammation\"",
        "Examine.com: \"High-dose omega-3 (2-4g EPA/DHA) reduces CRP by 30-50% in most individuals within 8-12 weeks\""
      ],
```

---

### 5. PROTOCOLE SOMMEIL OPTIMISÉ (ligne ~846)

**LOCALISATION**: Trouve `name: "Protocole Sommeil Optimisé"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Dr. Andrew Huberman: \"Cool room temperature (18-19°C) facilitates core body temperature drop necessary for deep sleep\"",
        "Dr. Matthew Walker: \"Blue light exposure 1-2 hours before bed suppresses melatonin by 50% - use blue blockers or eliminate screens\"",
        "MPMD: \"Magnesium glycinate 300mg 1hr before bed improves sleep architecture and reduces night-time wakefulness\"",
        "Huberman Lab: \"Morning bright light exposure (10-20 min) advances circadian phase and improves nighttime sleep quality\""
      ],
```

---

### 6. PROTOCOLE DÉTOX HÉPATIQUE (ligne ~869)

**LOCALISATION**: Trouve `name: "Protocole Détox Hépatique"`

**AJOUTER AVANT `targetRiskScores:`**:
```typescript
      citations: [
        "Examine.com: \"NAC 600-1200mg daily and milk thistle 300-600mg reduce elevated liver enzymes (ALT/AST) by 20-40% in 8 weeks\"",
        "Dr. Peter Attia: \"Eliminating alcohol for 30 days allows hepatic regeneration and significant improvement in liver function markers\"",
        "MPMD: \"Excess fructose from sodas and juices contributes to NAFLD - limit fructose intake to support liver health\""
      ],
```

---

## 🚨 GARDE-FOUS CRITIQUES

### CE QUE TU DOIS FAIRE:
- ✅ Ajouter `citations?: string[];` à l'interface ProtocolRecommendation
- ✅ Ajouter le champ `citations: [...]` aux 6 protocoles
- ✅ Copier-coller EXACTEMENT les citations fournies ci-dessus
- ✅ Placer `citations: [...]` JUSTE AVANT `targetRiskScores: [...]`
- ✅ Respecter les guillemets doubles `"` pour les strings
- ✅ Respecter la virgule `,` après le dernier élément du tableau citations

### CE QUE TU NE DOIS PAS FAIRE:
- ❌ NE MODIFIE PAS les autres champs (steps, expectedOutcome, etc.)
- ❌ NE CHANGE PAS les steps existants
- ❌ NE MODIFIE PAS les citations (copie-colle exact)
- ❌ N'AJOUTE PAS de nouveaux protocoles
- ❌ NE SUPPRIME PAS de protocoles existants
- ❌ NE TOUCHE PAS aux fonctions en dehors de generateProtocolRecommendations
- ❌ NE MODIFIE PAS les imports
- ❌ NE REFACTORISE RIEN

---

## ✅ EXEMPLE DE TRANSFORMATION

### ❌ AVANT (ligne ~754):
```typescript
protocols.push({
  name: "Protocole Anti-Résistance Insuline",
  category: "nutrition",
  priority: 1,
  duration: "90 jours",
  frequency: "Quotidien",
  description: "Restaurer la sensibilité à l'insuline via alimentation et timing",
  steps: [
    "Manger fibres et protéines AVANT les glucides (réduit pic glycémique de 30-40%)",
    "Limiter glucides raffinés à <50g/jour",
    // ... autres steps
  ],
  expectedOutcome: "Réduction HOMA-IR de 20-40%, meilleure énergie stable",
  targetRiskScores: ["prediabetes", "insulinResistance", "metabolicSyndrome"],
});
```

### ✅ APRÈS:
```typescript
protocols.push({
  name: "Protocole Anti-Résistance Insuline",
  category: "nutrition",
  priority: 1,
  duration: "90 jours",
  frequency: "Quotidien",
  description: "Restaurer la sensibilité à l'insuline via alimentation et timing",
  steps: [
    "Manger fibres et protéines AVANT les glucides (réduit pic glycémique de 30-40%)",
    "Limiter glucides raffinés à <50g/jour",
    // ... autres steps
  ],
  expectedOutcome: "Réduction HOMA-IR de 20-40%, meilleure énergie stable",
  citations: [  // ← AJOUTÉ ICI
    "Dr. Andrew Huberman: \"Eating fiber and protein before carbohydrates reduces glucose spikes by 30-40% - a simple food sequencing hack\"",
    "Dr. Peter Attia: \"Postprandial walks of 15 minutes significantly improve glucose disposal and insulin sensitivity over time\"",
    "Examine.com: \"Apple cider vinegar before carb-heavy meals improves insulin sensitivity by slowing gastric emptying\""
  ],
  targetRiskScores: ["prediabetes", "insulinResistance", "metabolicSyndrome"],
});
```

**CHANGEMENTS**:
1. Ajouté `citations: [...]` avec 3 citations
2. Placé AVANT `targetRiskScores:`
3. Virgule après le dernier `]` du tableau citations

---

## ✅ VALIDATION APRÈS MODIFICATIONS

### Étape 1: Vérifier TypeScript compile
```bash
npx tsc --noEmit
```

**Résultat attendu**: `0 erreurs`

Si erreurs TypeScript, **ARRÊTE-TOI** et dis-moi lesquelles.

---

### Étape 2: Compter les citations ajoutées

```bash
grep -A 5 "protocols.push" server/blood-analysis/recommendations-engine.ts | grep "citations:" | wc -l
```

**Résultat attendu**: `6` (une par protocole)

Si différent, **TU AS RATÉ DES PROTOCOLES**.

---

### Étape 3: Vérifier format avec Huberman/Attia

```bash
grep -n "Huberman\|Attia\|MPMD" server/blood-analysis/recommendations-engine.ts | grep "citations" | head -10
```

**Résultat attendu**: Plusieurs lignes avec "Huberman", "Attia", "MPMD" dans les protocoles

Si aucun résultat, **TU AS MAL COPIÉ LES CITATIONS**.

---

### Étape 4: Compte-rendu

Une fois les modifications faites ET validées, dis-moi:

```
✅ Interface ProtocolRecommendation: Ajouté citations?: string[] à la ligne X
✅ generateProtocolRecommendations: Ajouté citations à 6/6 protocoles
✅ TypeScript compile: 0 erreurs
✅ Validations grep: PASSED (6 citations trouvées)
✅ Citations contiennent: Huberman, Attia, MPMD, Examine
```

---

## 📝 COMMIT MESSAGE (si tout est OK)

Quand les modifications sont faites et validées, commit avec ce message:

```bash
git add server/blood-analysis/recommendations-engine.ts
git commit -m "feat: add expert citations to protocol recommendations

- Add citations field to ProtocolRecommendation interface
- Add 2-4 expert citations per protocol (Huberman, Attia, MPMD, Examine)
- Total: 6 protocols with ~18 citations from authority sources
- Citations explain the science behind each protocol step"
```

---

## ✅ CHECKLIST FINALE

Avant de me dire que c'est fini, vérifie:

- [ ] Interface ProtocolRecommendation a le champ `citations?: string[];`
- [ ] Les 6 protocoles ont TOUS un champ `citations: [...]`
- [ ] Les citations sont placées AVANT `targetRiskScores:`
- [ ] Les guillemets sont corrects (doubles `"`)
- [ ] Les virgules sont correctes après chaque citation et après `]`
- [ ] `npx tsc --noEmit` retourne 0 erreurs
- [ ] `grep` trouve exactement 6 occurrences de citations dans les protocoles
- [ ] Les citations mentionnent Huberman, Attia, MPMD, Examine
- [ ] Je n'ai touché à RIEN d'autre
- [ ] J'ai fait le commit avec le message exact fourni

---

**GO - Ajoute les citations aux 6 protocoles maintenant. Copie-colle exact. Ne modifie rien d'autre.**
