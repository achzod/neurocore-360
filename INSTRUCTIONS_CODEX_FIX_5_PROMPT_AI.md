# INSTRUCTIONS CODEX - FIX #5: AMÉLIORER PROMPT AI

**Date**: 2026-01-29
**Priorité**: HAUTE
**Durée estimée**: 15 minutes
**Fichier à modifier**: `server/blood-analysis/index.ts`

---

## 🎯 CONTEXTE

Le system prompt AI génère des rapports trop courts (700-900 mots) et ne demande pas explicitement de citer MPMD/Huberman/Attia/Examine.

Tu vas modifier 2 choses:
1. **System prompt** (ligne ~1264): Augmenter longueur + demander citations d'experts
2. **max_tokens** (ligne ~1841): Passer de 8000 à 16000 tokens

**NE TOUCHE À RIEN D'AUTRE QUE CE QUI EST SPÉCIFIÉ CI-DESSOUS.**

---

## 📋 FIX #1: MODIFIER LE SYSTEM PROMPT

**Fichier**: `server/blood-analysis/index.ts`
**Localisation**: Ligne ~1264 (const BLOOD_ANALYSIS_SYSTEM_PROMPT)

### Changement 1: Augmenter longueur cible

**❌ LIGNE ACTUELLE** (ligne ~1279):
```typescript
- Longueur cible: 700-900 mots, maximum 12 000 caracteres.
```

**✅ REMPLACER PAR**:
```typescript
- Longueur cible: 2000-3000 mots minimum, maximum 20 000 caracteres.
```

---

### Changement 2: Ajouter instruction citations d'experts

**LOCALISATION**: Ligne ~1269 (juste après "REGLES DE STYLE:")

**❌ LIGNE ACTUELLE**:
```typescript
- Cite des sources scientifiques dans une section dediee.
```

**✅ REMPLACER PAR**:
```typescript
- Cite DIRECTEMENT les experts dans le texte: Derek de MPMD, Dr. Andrew Huberman, Dr. Peter Attia, Dr. Chris Masterjohn, Examine.com.
- Format: "Derek de MPMD mentionne que...", "Dr. Huberman (Huberman Lab Ep. 127) explique...", "Selon Examine.com..."
- Inclus minimum 8-12 citations d'experts dans le rapport (dans les sections, pas juste la section Sources).
- Cite des sources scientifiques supplémentaires dans la section dédiée.
```

---

### Changement 3: Enrichir section Deep dive

**LOCALISATION**: Ligne ~1319 (section "Deep dive marqueurs prioritaires")

**❌ TEXTE ACTUEL**:
```typescript
## Deep dive marqueurs prioritaires
Pour 3-4 marqueurs max (les plus critiques / sous-optimaux):
- Verdict (1 ligne)
- Ce que ca veut dire (2 phrases, factuel)
- Symptomes associes (1 phrase)
- Protocole exact (actions + dosages + timing + duree)
```

**✅ REMPLACER PAR**:
```typescript
## Deep dive marqueurs prioritaires
Pour 4-6 marqueurs max (les plus critiques / sous-optimaux):
- Verdict (1 ligne)
- Ce que ca veut dire (3-4 phrases, factuel avec mécanismes physiologiques)
- Citations d'experts (1-2 citations Derek/Huberman/Attia avec dosages précis)
- Symptomes associes (1 phrase)
- Protocole exact en 3 phases:
  * Phase 1 - Lifestyle: [actions + timing + science derrière]
  * Phase 2 - Supplements: [nom + dosage exact + timing + marques recommandées + citation expert]
  * Phase 3 - Retest: [délai + marqueurs à retest + expected outcomes chiffrés]
```

---

### Changement 4: Enrichir section Plan 90 jours

**LOCALISATION**: Ligne ~1326 (section "Plan 90 jours")

**❌ TEXTE ACTUEL**:
```typescript
## Plan 90 jours
### Jours 1-30
- [action + dosage + timing + duree + objectif]
### Jours 31-90
- [action + dosage + timing + duree + objectif]
```

**✅ REMPLACER PAR**:
```typescript
## Plan 90 jours
### Jours 1-30 (Phase d'Attaque)
- [action + dosage précis + timing exact + citation expert + objectif chiffré]
- Exemple: "Berbérine 500mg 3x/jour avant repas (Derek: \"aussi efficace que metformine\") - objectif: réduire glycémie 15-20%"
### Jours 31-90 (Phase d'Optimisation)
- [action + dosage précis + timing exact + citation expert + objectif chiffré]
### Retest à J+90
- [Marqueurs prioritaires à retest + ranges cibles + expected improvements %]
```

---

## 📋 FIX #2: AUGMENTER MAX_TOKENS

**Fichier**: `server/blood-analysis/index.ts`
**Localisation**: Ligne ~1839 (dans la fonction generateAIBloodAnalysis)

**❌ LIGNE ACTUELLE** (ligne ~1841):
```typescript
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 8000,
    system: BLOOD_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });
```

**✅ REMPLACER PAR**:
```typescript
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 16000,  // ← CHANGER 8000 → 16000
    system: BLOOD_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });
```

**CHANGEMENT**: Ligne qui contient `max_tokens: 8000,` → changer à `max_tokens: 16000,`

---

## 📋 FIX #3: MODIFIER TRIMMING

**Fichier**: `server/blood-analysis/index.ts`
**Localisation**: Ligne ~1424 (fonction trimAiAnalysis)

**❌ SIGNATURE ACTUELLE**:
```typescript
const trimAiAnalysis = (text: string, maxChars = 12000): string => {
```

**✅ REMPLACER PAR**:
```typescript
const trimAiAnalysis = (text: string, maxChars = 20000): string => {
```

**CHANGEMENT**: `maxChars = 12000` → `maxChars = 20000`

---

## 🚨 GARDE-FOUS CRITIQUES

### CE QUE TU DOIS FAIRE:
- ✅ Modifier EXACTEMENT les lignes spécifiées ci-dessus
- ✅ Changer "700-900 mots" → "2000-3000 mots minimum"
- ✅ Ajouter instructions citations d'experts (Derek, Huberman, Attia, Masterjohn, Examine)
- ✅ Enrichir section "Deep dive" avec protocoles 3 phases
- ✅ Enrichir section "Plan 90 jours" avec citations et chiffres
- ✅ Changer `max_tokens: 8000` → `max_tokens: 16000`
- ✅ Changer `maxChars = 12000` → `maxChars = 20000`

### CE QUE TU NE DOIS PAS FAIRE:
- ❌ NE TOUCHE PAS aux autres parties du system prompt
- ❌ NE MODIFIE PAS le format de réponse (titres des sections)
- ❌ NE CHANGE PAS le modèle Claude utilisé
- ❌ NE TOUCHE PAS à la fonction ensureSourcesSection
- ❌ NE MODIFIE PAS PANEL_CITATIONS
- ❌ NE TOUCHE PAS aux autres fonctions
- ❌ NE MODIFIE PAS les imports
- ❌ NE REFACTORISE RIEN

---

## ✅ RÉSULTAT ATTENDU DU SYSTEM PROMPT

Après tes modifications, le system prompt devrait inclure:

```typescript
const BLOOD_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert en analyse de bilans sanguins oriente sante + performance + composition corporelle.

REGLES DE STYLE:
- Ton clinique, precis, premium, sans emojis.
- Pas de mention d'IA.
- Cite DIRECTEMENT les experts dans le texte: Derek de MPMD, Dr. Andrew Huberman, Dr. Peter Attia, Dr. Chris Masterjohn, Examine.com.
- Format: "Derek de MPMD mentionne que...", "Dr. Huberman (Huberman Lab Ep. 127) explique...", "Selon Examine.com..."
- Inclus minimum 8-12 citations d'experts dans le rapport (dans les sections, pas juste la section Sources).
- Cite des sources scientifiques supplémentaires dans la section dédiée.
- Liens PubMed autorises.
- Utilise les ranges optimaux en priorite.
- Reste structure, pedagogique, conversationnel.
[... reste inchangé ...]
- Longueur cible: 2000-3000 mots minimum, maximum 20 000 caracteres.
[... reste inchangé ...]

FORMAT DE REPONSE (respecte STRICTEMENT les titres):
[... sections précédentes inchangées ...]

## Deep dive marqueurs prioritaires
Pour 4-6 marqueurs max (les plus critiques / sous-optimaux):
- Verdict (1 ligne)
- Ce que ca veut dire (3-4 phrases, factuel avec mécanismes physiologiques)
- Citations d'experts (1-2 citations Derek/Huberman/Attia avec dosages précis)
- Symptomes associes (1 phrase)
- Protocole exact en 3 phases:
  * Phase 1 - Lifestyle: [actions + timing + science derrière]
  * Phase 2 - Supplements: [nom + dosage exact + timing + marques recommandées + citation expert]
  * Phase 3 - Retest: [délai + marqueurs à retest + expected outcomes chiffrés]

## Plan 90 jours
### Jours 1-30 (Phase d'Attaque)
- [action + dosage précis + timing exact + citation expert + objectif chiffré]
- Exemple: "Berbérine 500mg 3x/jour avant repas (Derek: \"aussi efficace que metformine\") - objectif: réduire glycémie 15-20%"
### Jours 31-90 (Phase d'Optimisation)
- [action + dosage précis + timing exact + citation expert + objectif chiffré]
### Retest à J+90
- [Marqueurs prioritaires à retest + ranges cibles + expected improvements %]

[... reste des sections inchangé ...]
`;
```

---

## ✅ VALIDATION APRÈS MODIFICATIONS

### Étape 1: Vérifier TypeScript compile
```bash
npx tsc --noEmit
```

**Résultat attendu**: `0 erreurs`

Si erreurs TypeScript, **ARRÊTE-TOI** et dis-moi lesquelles.

---

### Étape 2: Vérifier les changements

```bash
# Vérifier longueur cible modifiée
grep -n "2000-3000 mots minimum" server/blood-analysis/index.ts
```

**Résultat attendu**: 1 ligne trouvée (ligne ~1279)

---

```bash
# Vérifier citations d'experts ajoutées
grep -n "Derek de MPMD" server/blood-analysis/index.ts
```

**Résultat attendu**: Au moins 2 lignes trouvées (dans le system prompt)

---

```bash
# Vérifier max_tokens augmenté
grep -n "max_tokens: 16000" server/blood-analysis/index.ts
```

**Résultat attendu**: 1 ligne trouvée (ligne ~1841)

---

```bash
# Vérifier maxChars augmenté
grep -n "maxChars = 20000" server/blood-analysis/index.ts
```

**Résultat attendu**: 1 ligne trouvée (ligne ~1424)

---

### Étape 3: Compte-rendu

Une fois les modifications faites ET validées, dis-moi:

```
✅ System prompt: Modifié longueur 700-900 → 2000-3000 mots à la ligne X
✅ System prompt: Ajouté instructions citations d'experts (Derek, Huberman, Attia) à la ligne Y
✅ System prompt: Enrichi section "Deep dive" avec protocoles 3 phases à la ligne Z
✅ System prompt: Enrichi section "Plan 90 jours" avec retest à la ligne W
✅ generateAIBloodAnalysis: Augmenté max_tokens 8000 → 16000 à la ligne X
✅ trimAiAnalysis: Augmenté maxChars 12000 → 20000 à la ligne Y
✅ TypeScript compile: 0 erreurs
✅ Validations grep: PASSED (4/4 changements vérifiés)
```

---

## 📝 COMMIT MESSAGE (si tout est OK)

Quand les modifications sont faites et validées, commit avec ce message:

```bash
git add server/blood-analysis/index.ts
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

## ✅ CHECKLIST FINALE

Avant de me dire que c'est fini, vérifie:

- [ ] Ligne "700-900 mots" → "2000-3000 mots minimum"
- [ ] Ajouté instructions "Cite DIRECTEMENT les experts" avec Derek/Huberman/Attia
- [ ] Ajouté "minimum 8-12 citations d'experts dans le rapport"
- [ ] Section "Deep dive" enrichie avec protocoles 3 phases
- [ ] Section "Plan 90 jours" enrichie avec citations + retest
- [ ] `max_tokens: 8000` → `max_tokens: 16000`
- [ ] `maxChars = 12000` → `maxChars = 20000`
- [ ] `npx tsc --noEmit` retourne 0 erreurs
- [ ] Les 4 validations grep PASSED
- [ ] Je n'ai touché à RIEN d'autre
- [ ] J'ai fait le commit avec le message exact fourni

---

## 📊 IMPACT ATTENDU

### Avant Fix #5:
- Rapports: 700-900 mots
- Citations: Génériques ou en section Sources seulement
- Protocoles: Actions simples sans détails
- max_tokens: 8000 (limite à ~6000 mots)

### Après Fix #5:
- Rapports: 2000-3000 mots minimum
- Citations: 8-12 citations directes d'experts dans le texte
- Protocoles: 3 phases (lifestyle, supplements, retest) avec dosages + citations
- max_tokens: 16000 (permet jusqu'à ~12000 mots)

**Résultat**: Rapports niveau MPMD avec autorité et profondeur

---

**GO - Modifie le system prompt et les paramètres maintenant. Copie-colle exact. Ne modifie rien d'autre.**
