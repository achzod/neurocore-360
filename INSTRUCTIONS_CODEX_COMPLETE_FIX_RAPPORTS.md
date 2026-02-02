# INSTRUCTIONS CODEX - FIX COMPLET RAPPORTS SANG

**Date**: 2026-01-29
**Priorité**: CRITIQUE
**Durée totale estimée**: 1h20 (80 min)

---

## 🎯 RÉCAPITULATIF

Tu vas faire 3 fixes pour transformer les rapports de "DE MERDE" à "niveau MPMD":

| Fix | Description | Fichier | Durée | Status |
|-----|-------------|---------|-------|--------|
| #3  | Ajouter citations aux 21 supplements | recommendations-engine.ts | 45 min | ⏳ À faire |
| #4  | Ajouter citations aux 6 protocoles | recommendations-engine.ts | 20 min | ⏳ À faire |
| #5  | Améliorer prompt AI (longueur + citations) | index.ts | 15 min | ⏳ À faire |

**Ordre d'exécution**: Fix #3 → Fix #4 → Fix #5

---

## 📋 ORDRE D'EXÉCUTION

### 1️⃣ FIX #3: CITATIONS SUPPLEMENTS (45 min)

**Fichier**: `INSTRUCTIONS_CODEX_FIX_3_CITATIONS.md`

**Ce que tu vas faire**:
- Ajouter `citations?: string[];` à l'interface SupplementRecommendation
- Ajouter citations à 21 supplements avec copié-collé exact
- ~50 citations d'experts (Derek, Huberman, Attia, Masterjohn, Examine)

**Validations**:
- `npx tsc --noEmit` → 0 erreurs
- `grep '"citations":' ... | wc -l` → 21
- `grep "Derek\|MPMD" ...` → plusieurs lignes

**Commit après validation**:
```bash
git commit -m "feat: add expert citations to supplement database

- Add citations field to SupplementRecommendation interface
- Add 2-4 expert citations per supplement (MPMD, Huberman, Examine, Attia, Masterjohn)
- Total: 21 supplements with ~50 citations from authority sources
- Citations include dosage protocols, mechanisms, and study outcomes"
```

---

### 2️⃣ FIX #4: CITATIONS PROTOCOLES (20 min)

**Fichier**: `INSTRUCTIONS_CODEX_FIX_4_PROTOCOLES.md`

**Ce que tu vas faire**:
- Ajouter `citations?: string[];` à l'interface ProtocolRecommendation
- Ajouter citations à 6 protocoles avec copié-collé exact
- ~18 citations d'experts (Huberman, Attia, MPMD, Examine)

**Validations**:
- `npx tsc --noEmit` → 0 erreurs
- `grep -A 5 "protocols.push" ... | grep "citations:" | wc -l` → 6
- `grep "Huberman\|Attia\|MPMD" ... | grep "citations"` → plusieurs lignes

**Commit après validation**:
```bash
git commit -m "feat: add expert citations to protocol recommendations

- Add citations field to ProtocolRecommendation interface
- Add 2-4 expert citations per protocol (Huberman, Attia, MPMD, Examine)
- Total: 6 protocols with ~18 citations from authority sources
- Citations explain the science behind each protocol step"
```

---

### 3️⃣ FIX #5: PROMPT AI (15 min)

**Fichier**: `INSTRUCTIONS_CODEX_FIX_5_PROMPT_AI.md`

**Ce que tu vas faire**:
- Modifier system prompt: longueur 700-900 → 2000-3000 mots
- Ajouter instructions pour citer Derek/Huberman/Attia directement dans le texte
- Enrichir sections "Deep dive" et "Plan 90 jours"
- Augmenter max_tokens 8000 → 16000
- Augmenter maxChars 12000 → 20000

**Validations**:
- `npx tsc --noEmit` → 0 erreurs
- `grep "2000-3000 mots minimum" ...` → 1 ligne
- `grep "Derek de MPMD" ...` → au moins 2 lignes
- `grep "max_tokens: 16000" ...` → 1 ligne
- `grep "maxChars = 20000" ...` → 1 ligne

**Commit après validation**:
```bash
git commit -m "feat: enhance AI prompt for MPMD-level blood reports

- Increase target length from 700-900 to 2000-3000 words minimum
- Add explicit instructions to cite experts (Derek/MPMD, Huberman, Attia, Masterjohn)
- Enrich Deep dive section with 3-phase protocols (lifestyle, supplements, retest)
- Enrich 90-day plan with expert citations and target outcomes
- Increase max_tokens from 8000 to 16000
- Increase maxChars from 12000 to 20000
- Reports will now include 8-12 direct expert citations with specific dosages"
```

---

## ✅ VALIDATION GLOBALE FINALE

Une fois les 3 fixes faits et commités:

```bash
# 1. Vérifier TypeScript
npx tsc --noEmit
```
**Attendu**: 0 erreurs

---

```bash
# 2. Compter total citations ajoutées
grep -rn "citations:" server/blood-analysis/ | wc -l
```
**Attendu**: ~27+ lignes (21 supplements + 6 protocoles)

---

```bash
# 3. Vérifier mentions d'experts
grep -rn "Derek\|MPMD\|Huberman\|Attia\|Masterjohn\|Examine" server/blood-analysis/ | wc -l
```
**Attendu**: 70+ lignes (beaucoup de citations)

---

```bash
# 4. Vérifier commits
git log --oneline -3
```
**Attendu**: 3 commits avec les messages exacts ci-dessus

---

## 📊 IMPACT ATTENDU APRÈS LES 3 FIXES

### AVANT (rapports "DE MERDE"):
```
Supplements:
- 21 supplements avec dosages
- 0 citations
- Mécanismes génériques

Protocoles:
- 6 protocoles avec steps
- 0 citations
- Pas de science derrière les recommandations

Rapport AI:
- 700-900 mots
- Citations génériques ou absentes
- Protocoles simples
- max_tokens: 8000
```

### APRÈS (niveau MPMD):
```
Supplements:
- 21 supplements avec dosages
- ~50 citations d'experts (Derek, Huberman, Attia, Masterjohn, Examine)
- Mécanismes avec études et dosages précis

Protocoles:
- 6 protocoles avec steps
- ~18 citations d'experts (Huberman, Attia, MPMD)
- Science et mécanismes expliqués pour chaque step

Rapport AI:
- 2000-3000 mots minimum
- 8-12 citations directes d'experts DANS le texte
- Protocoles 3 phases (lifestyle, supplements, retest)
- max_tokens: 16000
```

**AMÉLIORATION**:
- Contenu: 3x plus long
- Citations: +68 citations d'experts
- Crédibilité: Citations directes de Derek, Huberman, Attia dans le texte
- Protocoles: 3 phases détaillées avec dosages/timing/marques
- Profondeur: Mécanismes physiologiques + études chiffrées

---

## 🎯 CE QUE TU DOIS FAIRE MAINTENANT

**ÉTAPE 1**: Lis le fichier `INSTRUCTIONS_CODEX_FIX_3_CITATIONS.md`
- Fais EXACTEMENT ce qui est décrit
- Valide avec les commandes grep
- Commit

**ÉTAPE 2**: Lis le fichier `INSTRUCTIONS_CODEX_FIX_4_PROTOCOLES.md`
- Fais EXACTEMENT ce qui est décrit
- Valide avec les commandes grep
- Commit

**ÉTAPE 3**: Lis le fichier `INSTRUCTIONS_CODEX_FIX_5_PROMPT_AI.md`
- Fais EXACTEMENT ce qui est décrit
- Valide avec les commandes grep
- Commit

**ÉTAPE 4**: Lance la validation globale ci-dessus

**ÉTAPE 5**: Dis-moi que c'est terminé avec un résumé:
```
✅ FIX #3: 21 supplements avec citations (commit: abc123)
✅ FIX #4: 6 protocoles avec citations (commit: def456)
✅ FIX #5: Prompt AI enrichi (commit: ghi789)
✅ Validation globale: PASSED
✅ TypeScript: 0 erreurs
✅ Total citations ajoutées: ~68
```

---

## 🚨 EN CAS DE PROBLÈME

Si tu rencontres UNE SEULE erreur TypeScript ou validation:
1. **ARRÊTE-TOI IMMÉDIATEMENT**
2. **NE COMMIT PAS**
3. Dis-moi exactement quelle erreur tu as
4. Attends mes instructions

---

## 📝 NOTES IMPORTANTES

- **Copie-colle exact**: Ne modifie PAS les citations que je t'ai données
- **Ne touche à rien d'autre**: Modifications chirurgicales uniquement
- **Valide à chaque étape**: Ne passe pas au fix suivant tant que le précédent n'est pas validé
- **Commits séparés**: 1 commit par fix (pas 1 gros commit)
- **Messages exacts**: Utilise les messages de commit exacts que je t'ai donnés

---

**GO - Commence par Fix #3. Lis INSTRUCTIONS_CODEX_FIX_3_CITATIONS.md et exécute.**
