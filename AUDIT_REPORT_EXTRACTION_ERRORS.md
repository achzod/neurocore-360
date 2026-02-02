# AUDIT #1: EXTRACTION & SCORING - ANALYSE CRITIQUE DES ERREURS

**Date**: 2026-02-02
**Fichier analysé**: `audit-output.txt`
**Patient**: Nicolas SONNEVILLE (44 ans, M)
**Date prélèvement**: 23-12-2025

---

## EXECUTIVE SUMMARY

L'analyse du fichier `audit-output.txt` révèle des **ERREURS CRITIQUES D'EXTRACTION** qui ont complètement faussé l'analyse et généré un rapport médical DANGEREUX. Le patient présente en réalité une **résistance insulinique MASSIVE** (insuline 49.1 mUI/L, HOMA-IR 12.60) mais le système a extrait insuline=1 et HOMA-IR=0.26, inversant complètement le diagnostic.

**Score de gravité des erreurs**: 9.5/10 (CRITIQUE)

---

## 1. ERREURS D'EXTRACTION GRAVES

### 1.1 INSULINE À JEUN - ERREUR FACTEUR 50x

**PDF (valeur réelle)**:
```
Insuline à jeun
49,1 mUI/L
(2,6−24,9)
```
- Valeur: **49.1 mUI/L** (limite supérieure normale: 24.9)
- Status réel: **CRITIQUE** (2x au-dessus de la normale)
- Interprétation: Hyperinsulinémie sévère, résistance insulinique massive

**DB (valeur extraite)**:
```json
{
  "name": "Insuline à jeun",
  "unit": "µIU/mL",
  "value": 1,  // ❌ ERREUR FACTEUR 50x!
  "status": "suboptimal",
  "interpretation": "Sensibilité insuline"
}
```

**Impact**:
- L'AI parle d'"insuline quasi-indétectable" et "sensibilité insulinique exceptionnelle"
- Le patient penserait qu'il a un EXCELLENT métabolisme alors qu'il est en SYNDROME MÉTABOLIQUE SÉVÈRE
- **Conséquence clinique**: Retard de diagnostic et de traitement d'une condition médicale sérieuse

---

### 1.2 HOMA-IR - ERREUR INVERSE (facteur 48x)

**PDF (valeur réelle)**:
```
Indice de HOMA
12,60
(< 2,40)
```
- Valeur: **12.60** (normale < 2.40)
- Status réel: **CRITIQUE** (5.25x au-dessus de la normale)
- Interprétation: Résistance insulinique sévère, risque diabète type 2 très élevé

**DB (valeur extraite)**:
```json
{
  "name": "HOMA-IR",
  "unit": "",
  "value": 0.26,  // ❌ ERREUR INVERSE!
  "status": "optimal",
  "interpretation": "Résistance insuline"
}
```

**Impact**:
- Le rapport conclut à un "HOMA-IR parfait" et "sensibilité insulinique exceptionnelle"
- Score de "Recomposition Readiness" artificiellement gonflé
- Le patient est présenté comme ayant une excellente gestion du glucose alors qu'il est pré-diabétique

---

### 1.3 VITAMINE D - ERREUR FACTEUR 2x

**PDF (valeur réelle)**:
```
Vitamine D 25 OH (D2 + D3)
12,3 ng/mL
(30,0−60,0)
```
- Valeur: **12.3 ng/mL** (normale 30-60)
- Status réel: **CRITIQUE - CARENCE SÉVÈRE** (60% en dessous de la normale)
- Interprétation: Carence majeure, impact sur immunité, hormones, os

**DB (valeur extraite)**:
```json
{
  "name": "Vitamine D",
  "unit": "ng/mL",
  "value": 25,  // ❌ ERREUR +103%!
  "status": "suboptimal"
}
```

**Impact**:
- La carence SÉVÈRE (12.3) est sous-estimée en simple "suboptimal" (25)
- Les recommandations de supplémentation sont moins urgentes qu'elles devraient
- Risque de maintien d'une carence critique

---

### 1.4 LDL MESURÉ - ERREUR +44%

**PDF (valeur réelle)**:
```
Cholestérol LDL mesuré
1,05 g/L
(< 1,60)
(Colorimétrie enzymatique)
2,72 mmol/L
```
- Valeur: **1.05 g/L = 105 mg/dL**
- Status réel: **NORMAL** (dans les normes)

**DB (valeur extraite)**:
```json
{
  "name": "LDL",
  "unit": "mg/dL",
  "value": 151,  // ❌ ERREUR +44%!
  "status": "critical"
}
```

**Hypothèse**: Le système a probablement confondu le LDL mesuré (1.05 g/L) avec le cholestérol non-HDL (1.61 g/L) ou a mal converti les unités.

**Impact**:
- Le rapport présente un LDL "élevé" alors qu'il est normal
- Paradoxe avec l'ApoB normal (78 mg/dL) qui aurait dû alerter
- Recommandations excessives sur la réduction du cholestérol

---

### 1.5 ApoB - ERREUR +32%

**PDF (valeur réelle)**:
```
Apolipoprotéines B
1,03 g/L
(0,66−1,33)
```
- Valeur: **1.03 g/L = 103 mg/dL**
- Status réel: **NORMAL** (limite haute mais dans les normes)

**DB (valeur extraite)**:
```json
{
  "name": "ApoB",
  "unit": "mg/dL",
  "value": 78,  // ❌ ERREUR -24%!
  "status": "optimal"
}
```

**Impact**:
- Le rapport présente un ApoB "optimal" (78) alors qu'il est à la limite haute (103)
- Contradiction avec le LDL prétendument élevé
- Sous-estimation du risque cardiovasculaire réel

---

## 2. MARQUEURS MANQUANTS (ABSENTS DE LA DB)

### 2.1 CORTISOL DU MATIN - ABSENT ❌

**PDF (valeur présente)**:
```
Cortisol du matin
70 nmol/L
(102−535)
(Chimiluminescence)
2,5 μg/dL
(3,7−19,4)
```
- Valeur: **70 nmol/L** (normale: 102-535)
- **HYPO-CORTISOLÉMIE SÉVÈRE** (-31% en dessous de la limite inférieure)
- **CRITIQUE**: Insuffisance surrénalienne possible

**Impact de l'absence**:
- Diagnostic d'insuffisance surrénalienne MANQUÉ
- Explication de la fatigue, stress, récupération compromise ABSENTE
- Risque médical significatif non détecté

---

### 2.2 FRUCTOSAMINE - ABSENT ❌

**PDF (valeur présente)**:
```
Fructosamine
216 μmol/L
Sujet sain: 205 à 285 μmol/L
```
- Valeur: **216 μmol/L** (normale: 205-285)
- Alternative à l'HbA1c pour la glycémie sur 2-3 semaines
- Utile pour confirmer le contrôle glycémique

**Impact de l'absence**:
- Pas de vision de la glycémie sur 2-3 semaines
- Validation manquée de l'incohérence glycémie/insuline

---

### 2.3 APO A1 - ABSENT ❌

**PDF (valeur présente)**:
```
Apolipoprotéines A1
1,09 g/L
(> 1,25)
```
- Valeur: **1.09 g/L = 109 mg/dL** (sous la normale de 125)
- Ratio ApoB/ApoA1 = 1.03/1.09 = **0.94** (élevé, idéal < 0.7)

**Impact de l'absence**:
- Ratio ApoB/ApoA1 NON CALCULÉ (meilleur prédicteur CV que LDL/HDL)
- Sous-estimation du risque cardiovasculaire

---

### 2.4 TESTOSTÉRONE TOTALE - ABSENT ❌

**PDF (valeur présente)**:
```
Testostérone
4,10 ng/mL
(2,49−8,36)
(Electrochimiluminescence)
14,22 nmol/L
(8,63−28,99)
```
- Valeur: **4.10 ng/mL = 410 ng/dL** (normale mais basse pour 44 ans)
- Ratio Free/Total = 6.00/410 = **1.46%** (normal: 2-3%)
- Suggère SHBG élevée

**Impact de l'absence**:
- Impossible de calculer le ratio Free/Total
- Impossible de déterminer si la testostérone libre basse est due à:
  - Production insuffisante (hypogonadisme)
  - SHBG élevée (inflammation, foie)
- Recommandations hormonales incomplètes

---

## 3. PROBLÈMES DE SCORING ABSURDES

### 3.1 Scores Globaux Générés

Le rapport affiche:
- **Score Santé Globale: 45/100** (confiance 70%)
- **Score Recomposition: 40/100** (confiance 55%)

### 3.2 Analyse du Système de Scoring

D'après `/client/src/lib/bloodScores.ts`:

```typescript
export const STATUS_SCORES: Record<BloodMarker["status"], number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};
```

**Marqueurs extraits (FAUX)**:
- Insuline (1): status="suboptimal" → score 55 ❌ (devrait être CRITICAL → 30)
- HOMA-IR (0.26): status="optimal" → score 100 ❌ (devrait être CRITICAL → 30)
- Vitamine D (25): status="suboptimal" → score 55 ❌ (devrait être CRITICAL → 30)
- LDL (151): status="critical" → score 30 ❌ (devrait être NORMAL → 80)
- ApoB (78): status="optimal" → score 100 ❌ (devrait être NORMAL → 80)

**Score "Recomposition Readiness"** (ligne 64-78):
```typescript
export function calculateRecompReadiness(markers: BloodMarker[]): number | null {
  const glycemiaScore = calculateMarkerScore(glycemia) * 0.3;  // 55 * 0.3 = 16.5
  const homaScore = homa ? calculateMarkerScore(homa) * 0.25 : 0;  // 100 * 0.25 = 25 ❌
  const tScore = calculateMarkerScore(testosterone) * 0.25;  // ABSENT!
  const tshScore = tsh ? calculateMarkerScore(tsh) * 0.2 : 0;  // ABSENT!

  return Math.round(glycemiaScore + homaScore + tScore + tshScore);
}
```

**Score calculé avec valeurs FAUSSES**: ~40/100

**Score RÉEL avec vraies valeurs**:
- Glycémie (104): suboptimal → 55 * 0.3 = 16.5
- HOMA-IR (12.60): CRITICAL → 30 * 0.25 = 7.5 (au lieu de 25!)
- Testostérone totale: MANQUANT → 0
- TSH: MANQUANT → 0
- **Score réel = 16.5 + 7.5 = 24/100** (au lieu de 40!)

---

### 3.3 Problème: "Pas de note 0 si marqueur absent"

Le user a spécifié:
> "pas de note à 0 si marqueur absent"

Mais le système actuel:
```typescript
const homaScore = homa ? calculateMarkerScore(homa) * 0.25 : 0;  // ← Retourne 0 si absent!
```

**Problème logique**:
- Si un marqueur est absent, mettre 0 pénalise artificiellement le score
- Si on ignore le marqueur, on redistribue le poids sur les autres (logique correcte)
- Le code actuel met 0, ce qui est PIRE qu'ignorer

**Solution attendue**:
```typescript
// Calculer seulement avec les marqueurs présents et normaliser les poids
let totalWeight = 0;
let totalScore = 0;

if (glycemia) {
  totalScore += calculateMarkerScore(glycemia) * 0.3;
  totalWeight += 0.3;
}
if (homa) {
  totalScore += calculateMarkerScore(homa) * 0.25;
  totalWeight += 0.25;
}
// etc...

return totalWeight > 0 ? Math.round(totalScore / totalWeight) : null;
```

---

## 4. CONSÉQUENCES SUR LE RAPPORT GÉNÉRÉ

### 4.1 Analyse Glycémique Complètement FAUSSE

**Ce que dit le rapport** (basé sur insuline=1, HOMA=0.26):

> "Ton insuline à jeun est mesurée à 1 µIU/mL, une valeur extrêmement basse qui se situe sous la limite inférieure du range normal. Cette insuline quasi-indétectable génère un HOMA-IR calculé à 0.26, ce qui indiquerait théoriquement une sensibilité insulinique exceptionnelle."

> "Comment expliquer une glycémie élevée avec une insuline basse et un HOMA-IR parfait ? Plusieurs hypothèses doivent être explorées : un diabète de type 1 latent de l'adulte (LADA), une insuffisance pancréatique débutante..."

**RÉALITÉ** (insuline=49.1, HOMA=12.60):
- Insuline **49.1 mUI/L** = HYPERINSULINÉMIE SÉVÈRE (2x la normale)
- HOMA-IR **12.60** = RÉSISTANCE INSULINIQUE MASSIVE (5x la normale)
- Glycémie 104 mg/dL = Cohérent avec la résistance insulinique
- **Diagnostic: SYNDROME MÉTABOLIQUE SÉVÈRE, PRÉ-DIABÈTE TYPE 2**

**Danger**:
- Le rapport cherche des pathologies rares (LADA, insuffisance pancréatique)
- Alors que le patient a un classique syndrome métabolique
- Retard de diagnostic et de traitement approprié

---

### 4.2 Recommandations Inadaptées

**Le rapport recommande**:
- "Recontrôle de l'insuline pour vérifier l'insuffisance pancréatique"
- "Peptide-C pour évaluer la fonction pancréatique"
- Pas d'urgence sur la réduction glucidique

**Recommandations RÉELLES nécessaires**:
- **URGENCE**: Réduction DRASTIQUE des glucides
- **URGENCE**: Intervention médicale pour syndrome métabolique
- Risque de diabète type 2 à court terme
- Metformine probablement indiquée

---

### 4.3 Score de Santé Trompeur

Le rapport dit:
> "Le score de santé global que j'attribue à ton profil est de 45/100 avec une confiance modérée (70%)"

**Score RÉEL** (avec vraies valeurs):
- Insuline CRITICAL (49.1) au lieu de suboptimal (1)
- HOMA-IR CRITICAL (12.60) au lieu de optimal (0.26)
- Vitamine D CRITICAL (12.3) au lieu de suboptimal (25)
- Cortisol CRITICAL (70) MANQUANT
- **Score réel estimé: 25-30/100** (au lieu de 45/100)

---

## 5. ANALYSE DES CAUSES D'ERREUR

### 5.1 Problèmes d'Extraction PDF

**Hypothèses sur les erreurs**:

1. **Insuline (49.1 → 1)**:
   - Possible confusion avec ligne "(1)" indiquant le laboratoire exécutant
   - Extraction de "1" au lieu de "49,1"

2. **HOMA-IR (12.60 → 0.26)**:
   - Calcul automatique au lieu de lecture PDF?
   - Si calcul: HOMA = (Insuline * Glycémie) / 405
   - Avec insuline=1: (1 * 104) / 405 = 0.257 ≈ 0.26 ✓
   - **Conclusion: HOMA mal calculé car insuline mal extraite**

3. **Vitamine D (12.3 → 25)**:
   - Possible confusion entre ligne de valeur et ligne de commentaire
   - Ou lecture d'une autre section du PDF

4. **LDL (105 → 151)**:
   - Confusion avec cholestérol non-HDL (1.61 g/L = 161 mg/dL)?
   - Ou LDL "calculé" qui est "Non calculable" mais une valeur ancienne?

5. **ApoB (103 → 78)**:
   - Erreur de conversion g/L → mg/dL?
   - 1.03 g/L devrait donner 103 mg/dL, pas 78

---

### 5.2 Problèmes de Détection de Marqueurs

**Marqueurs manqués**:
- Cortisol du matin
- Fructosamine
- Apo A1
- Testostérone totale

**Hypothèse**: Le système de parsing ne reconnaît que certains noms de marqueurs prédéfinis et rate les variations:
- "Cortisol du matin" vs "Cortisol"
- "Apolipoprotéines A1" vs "ApoA1"
- "Testostérone" (seule) vs parsing de "Testostérone libre" seulement

---

## 6. RECOMMANDATIONS URGENTES

### 6.1 Priorité 1 - Correction Extraction

1. **Revoir le parsing de l'insuline**:
   - Vérifier la regex qui extrait "49,1"
   - Éviter confusion avec "(1)" = marqueur laboratoire

2. **HOMA-IR: Lire du PDF, ne PAS calculer**:
   - Le laboratoire donne HOMA = 12.60
   - Ne pas recalculer avec des valeurs potentiellement fausses

3. **Vitamine D: Extraction correcte de 12.3**:
   - Vérifier ligne "12,3 ng/mL"
   - Ignorer les lignes de commentaire

4. **LDL: Parser "LDL mesuré" pas "LDL calculé"**:
   - Quand "Non calculable par Friedewald", ignorer
   - Chercher "LDL mesuré" = 1.05 g/L

5. **ApoB: Vérifier conversion g/L → mg/dL**:
   - 1.03 g/L × 100 = 103 mg/dL (pas 78!)

---

### 6.2 Priorité 2 - Détection Marqueurs Manquants

1. **Ajouter patterns pour**:
   - "Cortisol du matin" / "Cortisol matin"
   - "Fructosamine"
   - "Apolipoprotéines A1" / "Apo A1"
   - "Testostérone" (totale, sans "libre")

2. **Système d'alertes**:
   - Si glycémie présente mais pas HbA1c ni fructosamine → WARNING
   - Si testostérone libre présente mais pas totale → WARNING
   - Si ApoB présent mais pas ApoA1 → WARNING

---

### 6.3 Priorité 3 - Correction Scoring

1. **Implémenter normalisation des poids**:
   ```typescript
   // Ne pas mettre 0 si marqueur absent
   // Redistribuer les poids sur marqueurs présents
   ```

2. **Validation cohérence**:
   - Si HOMA-IR "optimal" mais insuline "critique" → ALERT
   - Si LDL "critique" mais ApoB "optimal" → ALERT
   - Si glycémie haute mais insuline basse → ALERT

3. **Scores conditionnels**:
   - Ne pas calculer "Recomposition Readiness" si < 3 marqueurs présents
   - Retourner NULL au lieu d'un score partiel trompeur

---

## 7. TABLEAU DE SYNTHÈSE DES ERREURS

| Marqueur | PDF Réel | DB Extrait | Erreur | Status Réel | Status Extrait | Impact Clinique |
|----------|----------|------------|--------|-------------|----------------|-----------------|
| **Insuline** | **49.1 mUI/L** | 1 µIU/mL | **-98%** | CRITICAL | suboptimal | ⚠️ DANGER - Diagnostic inversé |
| **HOMA-IR** | **12.60** | 0.26 | **-98%** | CRITICAL | optimal | ⚠️ DANGER - Syndrome métabolique manqué |
| **Vitamine D** | **12.3 ng/mL** | 25 ng/mL | **+103%** | CRITICAL | suboptimal | ⚠️ GRAVE - Carence sous-estimée |
| **LDL** | **105 mg/dL** | 151 mg/dL | **+44%** | NORMAL | critical | ⚠️ MOYEN - Sur-alarme |
| **ApoB** | **103 mg/dL** | 78 mg/dL | **-24%** | NORMAL | optimal | ⚠️ MOYEN - Risque sous-estimé |
| **Cortisol** | **70 nmol/L** | ABSENT | **N/A** | CRITICAL | N/A | ⚠️ DANGER - Insuffisance surrénalienne manquée |
| **Fructosamine** | **216 μmol/L** | ABSENT | **N/A** | NORMAL | N/A | ⚠️ FAIBLE - Info manquante |
| **Apo A1** | **109 mg/dL** | ABSENT | **N/A** | SUBOPTIMAL | N/A | ⚠️ MOYEN - Ratio CV manqué |
| **Testo Total** | **410 ng/dL** | ABSENT | **N/A** | SUBOPTIMAL | N/A | ⚠️ MOYEN - Analyse hormonale incomplète |

---

## 8. NIVEAU DE GRAVITÉ PAR ERREUR

### 8.1 Erreurs CRITIQUES (Score 9-10/10)

1. **Insuline 49.1 → 1** (Score: 10/10)
   - Diagnostic complètement inversé
   - Patient pensera avoir excellente sensibilité insulinique
   - Retard de traitement du syndrome métabolique
   - **Conséquence**: Progression vers diabète type 2

2. **HOMA-IR 12.60 → 0.26** (Score: 10/10)
   - Même gravité que l'insuline (erreur liée)
   - Score de recomposition artificiellement élevé
   - Recommandations nutritionnelles inadaptées

3. **Cortisol 70 → ABSENT** (Score: 9/10)
   - Insuffisance surrénalienne non détectée
   - Explication de fatigue/stress manquée
   - Risque médical si stress physique intense

---

### 8.2 Erreurs GRAVES (Score 7-8/10)

4. **Vitamine D 12.3 → 25** (Score: 8/10)
   - Carence SÉVÈRE présentée comme "suboptimale"
   - Sous-dosage de supplémentation
   - Impact sur immunité, hormones, inflammation

---

### 8.3 Erreurs MOYENNES (Score 5-6/10)

5. **LDL 105 → 151** (Score: 6/10)
   - Sur-alarme (présente normal comme critique)
   - Stress patient inutile
   - Recommandations excessives

6. **Testostérone totale ABSENTE** (Score: 6/10)
   - Analyse hormonale incomplète
   - Impossible de déterminer cause testosterone libre basse

7. **Apo A1 ABSENT** (Score: 5/10)
   - Ratio ApoB/ApoA1 non calculé
   - Sous-estimation risque CV

---

### 8.4 Erreurs FAIBLES (Score 3-4/10)

8. **ApoB 103 → 78** (Score: 4/10)
   - Minimise risque CV mais impact limité
   - Contradiction avec LDL aide à détecter

9. **Fructosamine ABSENT** (Score: 3/10)
   - Info secondaire manquée
   - HbA1c pourrait compenser

---

## 9. SCORE GLOBAL DE L'AUDIT

### 9.1 Métriques

- **Marqueurs totaux extraits**: 10
- **Marqueurs correctement extraits**: 3 (Glycémie, Triglycérides, HDL, CRP, Testo libre)
- **Erreurs majeures**: 5 (Insuline, HOMA, Vit D, LDL, ApoB)
- **Marqueurs critiques manqués**: 4 (Cortisol, Fructosamine, ApoA1, Testo totale)

**Taux d'exactitude: 30%** (3/10 corrects)

### 9.2 Impact sur le Rapport

- **Diagnostic principal**: FAUX (sensibilité insulinique au lieu de résistance)
- **Score santé**: SURESTIMÉ de +70% (45/100 au lieu de ~27/100)
- **Score recomposition**: SURESTIMÉ de +67% (40/100 au lieu de ~24/100)
- **Recommandations critiques**: INAPPROPRIÉES (cherche LADA au lieu de traiter syndrome métabolique)

---

## 10. CONCLUSION

Le système d'extraction et de scoring présente des **défaillances CRITIQUES** qui rendent le rapport médical généré **DANGEREUX** et potentiellement **contre-productif** pour la santé du patient.

**Points critiques**:

1. ⚠️ **Erreur d'extraction insuline/HOMA**: Inverse complètement le diagnostic métabolique
2. ⚠️ **Marqueurs critiques manquants**: Cortisol (insuffisance surrénalienne), hormones complètes
3. ⚠️ **Scoring inadapté**: Ne gère pas correctement les marqueurs absents, scores artificiellement élevés
4. ⚠️ **Validation absente**: Aucune détection d'incohérences (HOMA optimal + insuline critique impossible)

**Recommandation finale**:
**NE PAS DÉPLOYER** en l'état. Les erreurs d'extraction sont trop graves et pourraient conduire à des retards de diagnostic ou des traitements inappropriés.

**Actions immédiates**:
1. Fixer extraction insuline + HOMA (PRIORITÉ MAXIMALE)
2. Ajouter détection marqueurs manquants critiques
3. Implémenter validation cohérence entre marqueurs
4. Refaire scoring avec normalisation poids marqueurs absents

---

**Audit réalisé par**: Claude Sonnet 4.5
**Fichiers analysés**:
- `/Users/achzod/Desktop/neurocore/neurocore-github/audit-output.txt`
- `/Users/achzod/Desktop/neurocore/neurocore-github/client/src/lib/bloodScores.ts`
- `/Users/achzod/Desktop/neurocore/neurocore-github/client/src/lib/bloodAnalysisParser.ts`
