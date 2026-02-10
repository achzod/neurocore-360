# FIXES APPLIQUÉS - ITERATION 1/3

Date: 2026-02-04
Temps: ~30 minutes

---

## 🔧 MODIFICATIONS CODE

### 1. Nouveau fichier: `/server/knowledge/storage.ts`

**Ajout fonction `searchArticlesWithDiversity()`:**
```typescript
export async function searchArticlesWithDiversity(
  keywords: string[],
  limit: number = 5,
  sources?: string[]
): Promise<ScrapedArticle[]> {
  // Uses ROW_NUMBER() OVER (PARTITION BY source)
  // to guarantee max 1 article per source
  // Forces source diversity in results
}
```

**Pourquoi?**
- L'ancienne fonction `searchArticles()` pouvait retourner plusieurs articles de la même source
- Résultat: tous les articles venaient d'Examine.com
- Nouvelle fonction: max 1 article par source → diversité garantie

### 2. Modification: `/server/blood-analysis/index.ts`

#### Import
```diff
- import { searchArticles, searchFullText } from "../knowledge/storage";
+ import { searchArticles, searchArticlesWithDiversity, searchFullText } from "../knowledge/storage";
```

#### Deep dive markers search
```diff
- const articles = await searchArticles(keywords, 4, [sources]);
- const sourceLines = articles.slice(0, 3).map(buildSourceExcerpt);
+ const articles = await searchArticlesWithDiversity(keywords, 5, [sources + applied_metabolics + RP]);
+ const sourceLines = articles.map(buildSourceExcerpt);
```

**Changements:**
- `searchArticles` → `searchArticlesWithDiversity`
- `limit: 4` → `limit: 5`
- `.slice(0, 3)` supprimé → on prend tous les résultats
- Ajout "applied_metabolics" et "renaissance_periodization" dans la liste

#### General knowledge context search
```diff
- const articles = await searchArticles(keywords, 6, [sources]);
+ const articles = await searchArticlesWithDiversity(keywords, 8, [sources + RP]);
```

**Changements:**
- `searchArticles` → `searchArticlesWithDiversity`
- `limit: 6` → `limit: 8`
- Ajout "renaissance_periodization" dans la liste

---

## 📝 MODIFICATIONS PROMPT

### 1. Section "REGLE MAJEURE : RAG / BIBLIOTHEQUE SCRAPPEE"

#### AVANT:
```
REGLES D'UTILISATION DES SOURCES
- Quand tu attribues une idee... tu DOIS mettre une citation [SRC:ID]
```

#### APRES:
```
REGLES D'UTILISATION DES SOURCES (ULTRA CRITIQUE)
- DIVERSITE DES SOURCES OBLIGATOIRE : Tu DOIS citer AU MOINS 3 sources differentes
- PRIORITE AUX EXPERTS RECONNUS : Privilegie Huberman Lab, Peter Attia, Applied Metabolics, MPMD
- EXAMINE UNIQUEMENT POUR SUPPLEMENTS : Utilise Examine principalement pour dosages/efficacite
- Interdiction absolue d'inventer...
```

### 2. Ajout section "INCARNATION DE L'EXPERT (JE)"

```
INCARNATION DE L'EXPERT ("JE")
- Tu t'incarnes CONSTAMMENT en tant qu'expert qui parle
- Utilise "je" au moins 50 fois dans le rapport
- Tu ne te caches pas derriere un ton impersonnel
- Tu assumes tes interpretations : "A mon avis...", "Mon conseil..."
```

### 3. Section "CAS PARTICULIERS" modifiée

#### AVANT:
```
- Tables/tableaux : OK pour presenter des donnees comparatives
```

#### APRES:
```
- Tableaux markdown : INTERDITS - integre les donnees dans des phrases narratives
- LIMITE : Maximum 2-3 petites listes par section majeure
```

### 4. Section "Synthese executive" améliorée

#### AVANT:
```
- 12 a 20 lignes.
- Tu annonces : le diagnostic...
- 3 a 6 priorites, classees.
```

#### APRES:
```
- ACCROCHE CONVERSATIONNELLE : Commence par "{Prenom}, je vais etre direct avec toi..."
- PAS de titre formel style "Rapport Sanguin Premium" — tu plonges direct
- DIAGNOSTIC EN PHRASES : Explique le terrain metabolique en phrases fluides (pas de liste)
- METAPHORE CONCRETE : Utilise une image pour faire comprendre l'etat global
- PRIORITES NARRATIVES : Explique les priorites en les reliant entre elles
- PAS de tags [CRITIQUE] ni de format structure — raconte
- TRANSITION : Finis avec "On va tout decortiquer ensemble"
```

### 5. Section "Tableau de bord" modifiée

#### AVANT:
```
- Une liste structuree
- Tu peux inclure une table courte si utile.
```

#### APRES:
```
- PAS DE TABLEAUX MARKDOWN — integre les donnees dans des paragraphes
- NARRATIF : Explique les TOP priorites en phrases
- QUICK WINS : Presente-les comme une conversation
```

### 6. Section "Deep dive" améliorée

#### AVANT:
```
FORMAT FIXE PAR MARQUEUR (OBLIGATOIRE)
- Priorite: [CRITIQUE]
- Valeur: X
- Lecture clinique:
- Lecture performance:
- Causes plausibles (ordre):
```

#### APRES:
```
FORMAT PAR MARQUEUR (ADAPTATIF - PAS ROBOTIQUE)
- VARIE LA STRUCTURE selon le marqueur - ne sois PAS repetitif
- Commence parfois par l'action, parfois par l'explication
- PAS DE LISTES A PUCES pour expliquer des concepts
- SOURCES OBLIGATOIRES : Cite AU MOINS 2-3 sources DIFFERENTES
- DIVERSITE : Si tu as cite Examine 2 fois, cite Huberman ou Attia ensuite
```

---

## 🎯 OBJECTIFS FIXES

| Métrique | Avant | Après (cible) | Statut |
|----------|-------|---------------|--------|
| Sources citées | 1 (Examine) | 5+ (diverse) | ⏳ En test |
| Occurrences "je" | 8 | 50+ | ⏳ En test |
| Listes à puces | ~150 | <30 | ⏳ En test |
| Tableaux markdown | ~8 | 0 | ⏳ En test |
| Score "IA" | 6/10 | 2/10 | ⏳ En test |

---

## 📊 RAPPORT EN COURS DE GENERATION

**Commande:**
```bash
npx tsx test-blood-simple.ts
```

**Status:** En arrière-plan (task ID: b80668b)

**Temps estimé:** 15-30 minutes

**Output:** `/tmp/claude/-Users-achzod-Desktop-neurocore/tasks/b80668b.output`

---

## ✅ PROCHAINES ETAPES

1. ⏳ Attendre fin de génération (15-30 min)
2. 📖 Lire le nouveau rapport généré
3. 🔍 Vérifier:
   - Diversité des sources citées
   - Nombre d'occurrences "je"
   - Nombre de listes à puces
   - Présence de tableaux markdown
   - Ton conversationnel de l'intro
   - Structure non-répétitive des Deep dives
4. 📋 ITERATION 2 - Audit et corrections supplémentaires
5. 🔄 Regénérer si nécessaire
6. 📋 ITERATION 3 - Audit final
7. ✅ Validation finale

---

## 🔗 FICHIERS MODIFIÉS

1. `/server/knowledge/storage.ts` - Ajout `searchArticlesWithDiversity()`
2. `/server/blood-analysis/index.ts` - Utilisation nouvelle fonction + prompt amélioré
3. `AUDIT_RAPPORT_ITERATION_1.md` - Audit détaillé
4. `FIXES_ITERATION_1_APPLIED.md` - Ce fichier

---

**FIN ITERATION 1/3**
