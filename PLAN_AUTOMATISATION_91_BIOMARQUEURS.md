# PLAN AUTOMATISATION - 91 BIOMARQUEURS NIVEAU MPMD

**Date**: 2026-01-29
**Objectif**: Enrichir les 91 biomarqueurs restants avec contenu niveau MPMD
**Méthode**: Automatisation intelligente (scraping + AI + validation)

---

## 🎯 OBJECTIF FINAL

**91 biomarqueurs** avec:
- 2000-3000 mots de contenu expert par biomarqueur
- 5-8 citations sources (MPMD, Huberman, Masterjohn, Examine, etc.)
- Protocoles 3 phases (lifestyle, supplements, retest)
- Ranges optimales + interprétation performance
- Mécanismes physiologiques détaillés

**Temps estimé**: 10-15h (au lieu de 40-60h manuel)

---

## 📚 RESSOURCES DISPONIBLES

### Bibliothèques de connaissances scrapées
- ✅ huberman-full.json
- ✅ mpmd-full.json
- ✅ masterjohn-full.json
- ✅ examine-full.json
- ✅ peter-attia-full.json
- ✅ marek-health-full.json
- ✅ sbs-full.json
- ✅ applied-metabolics-full.json
- ✅ rp-full.json

**Total**: ~20MB+ de contenu expert

### Sources supplémentaires à scraper si besoin
- Life Extension Foundation
- Examine.com (biomarqueurs spécifiques)
- PubMed abstracts (études)
- LabCorp/Quest ranges

---

## 🏗️ ARCHITECTURE DU SYSTÈME

### Phase 1: EXTRACTION INTELLIGENTE
```
Input: Liste 91 biomarqueurs
Process:
  1. Pour chaque biomarqueur
  2. Chercher dans les 9 bibliothèques JSON
  3. Extraire mentions, protocoles, citations
  4. Scorer pertinence
Output: biomarker_data_{name}.json
```

### Phase 2: GÉNÉRATION CONTENU
```
Input: biomarker_data_{name}.json + Template MPMD
Process:
  1. Analyser données extraites
  2. Générer contenu structuré (definition, impact, protocol)
  3. Formater en TypeScript BiomarkerDetailExtended
  4. Ajouter citations avec sources
Output: {NAME}_EXTENDED_generated.ts
```

### Phase 3: VALIDATION & INTÉGRATION
```
Input: {NAME}_EXTENDED_generated.ts
Process:
  1. Validation structure TypeScript
  2. Vérification qualité (word count, citations, etc.)
  3. Codex intègre dans bloodBiomarkerDetailsExtended.ts
  4. Test compilation
Output: Biomarqueur intégré et validé
```

---

## 📋 LISTE DES 91 BIOMARQUEURS À TRAITER

### 🔴 HORMONAL (5 manquants)
1. lh (Hormone Lutéinisante)
2. fsh (Hormone Folliculo-Stimulante)
3. prolactine
4. dhea_s (DHEA-Sulfate)
5. igf1 (IGF-1, facteur de croissance)

### 🔵 THYROID (5 biomarqueurs)
6. tsh (Thyroid Stimulating Hormone)
7. t4_libre (Free T4)
8. t3_libre (Free T3)
9. t3_reverse (Reverse T3)
10. anti_tpo (Anti-TPO antibodies)

### 🟢 METABOLIC (7 biomarqueurs)
11. insuline_jeun (Fasting Insulin)
12. homa_ir (HOMA-IR index)
13. triglycerides
14. hdl (HDL Cholesterol)
15. ldl (LDL Cholesterol)
16. apob (Apolipoprotein B)
17. lpa (Lipoprotein(a))

### 🟡 INFLAMMATORY (5 biomarqueurs)
18. crp_us (hs-CRP, C-Reactive Protein)
19. homocysteine
20. ferritine (Ferritin)
21. fer_serique (Serum Iron)
22. transferrine_sat (Transferrin Saturation)

### 🟣 VITAMINS & MINERALS (4 biomarqueurs)
23. b12 (Vitamin B12)
24. folate (Folate/B9)
25. magnesium_rbc (RBC Magnesium)
26. zinc

### 🟠 LIVER/KIDNEY (5 biomarqueurs)
27. alt (Alanine Aminotransferase)
28. ast (Aspartate Aminotransferase)
29. ggt (Gamma-GT)
30. creatinine
31. egfr (eGFR)

### 🔴 HEMATO (10+ biomarqueurs)
32. hemoglobine
33. hematocrite
34. globules_rouges
35. globules_blancs
36. plaquettes
37. neutrophiles
38. lymphocytes
39. monocytes
40. eosinophiles
41. basophiles
42. mcv (Mean Corpuscular Volume)
43. mch (Mean Corpuscular Hemoglobin)
44. mchc (Mean Corpuscular Hemoglobin Concentration)

### 🟢 AUTRES CARDIO (5+ biomarqueurs)
45. cholesterol_total
46. ratio_chol_hdl
47. non_hdl_cholesterol
48. vldl
49. sdldl (Small Dense LDL)

### 🔵 AUTRES METABOLIC (10+ biomarqueurs)
50. acide_urique
51. phosphore
52. calcium
53. calcium_ionise
54. sodium
55. potassium
56. chlore
57. albumine
58. proteines_totales
59. globulines

### 🟣 AUTRES HORMONAL (5+ biomarqueurs)
60. progesterone
61. pregnenolone
62. aldosterone
63. renine
64. acth

### 🟠 THYROID AVANCÉ (3+ biomarqueurs)
65. anti_tg (Anti-thyroglobuline)
66. thyroglobuline
67. t4_total

### 🔴 BONE/MINERAL (3+ biomarqueurs)
68. vitamine_k2
69. pth (Parathormone)
70. osteocalcine

### 🟢 CARDIAC ADVANCED (5+ biomarqueurs)
71. troponine
72. bnp (Brain Natriuretic Peptide)
73. nt_probnp
74. myeloperoxidase
75. oxldl (Oxidized LDL)

### 🔵 OXIDATIVE STRESS (3+ biomarqueurs)
76. glutathion
77. coq10
78. superoxide_dismutase

### 🟡 AUTRES (15+ biomarqueurs restants)
79-91. Autres marqueurs spécifiques

**TOTAL**: 91 biomarqueurs

---

## ⚙️ SYSTÈME DE GÉNÉRATION PAR BATCH

### Batch Size
- **10 biomarqueurs par batch**
- **10 batchs au total** (9 batchs de 10 + 1 batch de 1)

### Workflow par batch
```
1. EXTRACTION (5 min)
   - Lancer script extraction sur 10 biomarqueurs
   - Générer 10 fichiers JSON avec données

2. GÉNÉRATION (15 min)
   - Pour chaque biomarqueur:
     - Analyser JSON extrait
     - Générer contenu TypeScript EXTENDED
     - Valider structure

3. INTÉGRATION (10 min)
   - Codex intègre les 10 biomarqueurs
   - Test compilation TypeScript
   - Validation qualité

4. VALIDATION (5 min)
   - Audit rapide
   - Vérification 0 placeholders
   - Count word/citations

TOTAL PAR BATCH: 35 min
TOTAL 10 BATCHS: ~6 heures (avec pauses)
```

---

## 🛠️ OUTILS À CRÉER

### 1. Script Extraction
**Fichier**: `scripts/extract_biomarker_data.js`
```javascript
// Input: Liste biomarqueurs
// Process: Cherche dans toutes les bibliothèques JSON
// Output: biomarker_data_{name}.json
```

### 2. Générateur Contenu
**Fichier**: `scripts/generate_biomarker_extended.js`
```javascript
// Input: biomarker_data_{name}.json
// Process: Génère TypeScript EXTENDED avec AI
// Output: {NAME}_EXTENDED.ts
```

### 3. Validateur Qualité
**Fichier**: `scripts/validate_biomarker.js`
```javascript
// Input: {NAME}_EXTENDED.ts
// Process: Vérifie structure, word count, citations
// Output: validation_report.json
```

### 4. Intégrateur Automatique
**Fichier**: `scripts/integrate_batch.js`
```javascript
// Input: Liste {NAME}_EXTENDED.ts
// Process: Merge dans bloodBiomarkerDetailsExtended.ts
// Output: Fichier mis à jour
```

---

## 📊 MÉTRIQUES DE QUALITÉ PAR BIOMARQUEUR

### Minimum acceptable
- ✅ 1500+ mots
- ✅ 3+ citations sources
- ✅ Protocoles lifestyle + supplements
- ✅ Ranges avec interprétation
- ✅ 0 placeholders génériques

### Optimal (niveau MPMD)
- ✅ 2000-3000 mots
- ✅ 5-8 citations sources
- ✅ Protocoles 3 phases complètes
- ✅ Ranges optimales performance
- ✅ Mécanismes détaillés

---

## 🚀 PLAN D'EXÉCUTION

### MAINTENANT
1. ✅ Créer ce plan
2. ⏳ Valider avec toi
3. ⏳ Créer scripts extraction/génération

### BATCH 1 (HORMONAL - 5 biomarqueurs)
- LH, FSH, Prolactine, DHEA-S, IGF-1
- Durée: 35 min
- Validation: Même niveau que les 8 actuels

### BATCH 2 (THYROID - 5 biomarqueurs)
- TSH, T4 libre, T3 libre, T3 reverse, Anti-TPO
- Durée: 35 min

### BATCH 3 (METABOLIC - 7 biomarqueurs)
- Insuline, HOMA-IR, Trigly, HDL, LDL, ApoB, Lp(a)
- Durée: 45 min

### BATCH 4-10 (SUITE)
- Continuer par priorité

---

## 💾 SAUVEGARDE & VERSIONING

### Git commits par batch
```bash
git commit -m "feat: add batch 1 - hormonal biomarkers (LH, FSH, Prolactine, DHEA-S, IGF-1)"
```

### Backup avant chaque batch
```bash
cp bloodBiomarkerDetailsExtended.ts bloodBiomarkerDetailsExtended.backup.$(date +%Y%m%d_%H%M%S).ts
```

---

## ✅ VALIDATION FINALE

### Critères de succès
- [ ] 91/91 biomarqueurs intégrés
- [ ] Moyenne 2000+ mots par biomarqueur
- [ ] 450+ citations totales
- [ ] 0 placeholders
- [ ] 0 erreurs TypeScript
- [ ] Build propre
- [ ] Modal affiche tout correctement

### Tests
- [ ] npx tsc --noEmit (0 erreurs)
- [ ] Audit qualité automatique
- [ ] Test affichage modal sur 10 biomarqueurs aléatoires
- [ ] User validation sur échantillon

---

## 📝 NOTES

- Prioriser qualité > quantité
- Si données insuffisantes pour un biomarqueur: flag pour enrichissement manuel
- Garder style cohérent avec les 8 existants
- Citations authentiques avec guillemets
- Ranges performance-focused (pas juste "lab normal")

---

**PRÊT À DÉMARRER?**

Next steps:
1. Je crée les scripts d'extraction/génération
2. On teste sur 1 biomarqueur (LH par exemple)
3. Si validation OK: on lance les 10 batchs
4. Durée totale: 6-8 heures

**Tu valides ce plan?**
