# PROMPT COMPLET CODEX - INTÉGRATION CONTENUS BIOMARQUEURS BATCH 1

**Date**: 2026-01-29
**Tâche**: Intégrer 5 biomarqueurs complets (Vitamine D, Glycémie, HbA1c, Testostérone, Cortisol)

---

## CONTEXTE

Tu as créé `client/src/data/bloodBiomarkerDetailsExtended.ts` avec des placeholders "JE NE SAIS PAS" pour 3 biomarqueurs (vitamine_d, glycemie_jeun, hba1c).

J'ai maintenant rédigé les contenus COMPLETS pour 5 biomarqueurs:
1. **Vitamine D** (vitamine_d)
2. **Glycémie à jeun** (glycemie_jeun)
3. **HbA1c** (hba1c)
4. **Testostérone totale** (testosterone_total) - NOUVEAU
5. **Cortisol** (cortisol) - NOUVEAU

---

## FICHIER SOURCE DES CONTENUS

**Tous les contenus sont dans**: `/Users/achzod/Desktop/neurocore/neurocore-github/BIOMARKERS_CONTENT_EXTENDED_3.md`

Ce fichier contient 3 sections markdown complètes:
- Section "## 1. VITAMINE D (25-OH-D)"
- Section "## 2. GLYCÉMIE À JEUN"
- Section "## 3. HbA1c (HÉMOGLOBINE GLYQUÉE)"

---

## TÂCHE 1: INTÉGRER VITAMINE D

### Code marker à chercher dans le fichier cible

```typescript
// Dans client/src/data/bloodBiomarkerDetailsExtended.ts
export const VITAMINE_D_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: "JE NE SAIS PAS - information manquante", // ← REMPLACER
    // ... autres champs
  }
}
```

### Instructions extraction depuis BIOMARKERS_CONTENT_EXTENDED_3.md

**Ouvrir** `/Users/achzod/Desktop/neurocore/neurocore-github/BIOMARKERS_CONTENT_EXTENDED_3.md`

**Localiser** la section qui commence par `## 1. VITAMINE D (25-OH-D)`

**Sous-section `### DÉFINITION (700-900 mots)`**:

1. **`definition.intro`** ← Copier TOUT le texte de la sous-section `#### C'est quoi exactement?` (4 paragraphes, commence par "La vitamine D, mesurée sous forme 25-hydroxyvitamine D..." jusqu'à "...chez l'athlète et le biohacker.")

2. **`definition.mechanism`** ← Copier TOUT le texte de `#### Mécanisme physiologique` (commence par "Le calcitriol exerce ses effets via deux voies principales..." jusqu'à "...résilience immunitaire accrue.")

3. **`definition.clinical`** ← Copier TOUT le texte de `#### Contexte clinique` (commence par "Les guidelines endocrinologiques ont évolué..." jusqu'à la fin de cette sous-section, AVANT `#### Variations physiologiques`)

4. **`definition.ranges`**:
   - `optimal`: Extraire du texte → "40-60 ng/mL (100-150 nmol/L)"
   - `normal`: "30-40 ng/mL"
   - `suboptimal`: "20-30 ng/mL"
   - `critical`: "<20 ng/mL"
   - `interpretation`: Copier le paragraphe qui explique ces ranges (chercher "Performance musculaire optimale: 40-60 ng/mL...")

5. **`definition.variations`** ← Copier TOUT le texte de `#### Variations physiologiques`

6. **`definition.studies`** ← Extraire un array des citations. Exemple:
   ```typescript
   studies: [
     "Travison TG et al. (2017). Harmonized reference ranges for circulating testosterone levels in men of four cohort studies. J Clin Endocrinol Metab.",
     "Bassil N et al. (2009). The benefits and risks of testosterone replacement therapy. Ther Clin Risk Manag.",
     "Corona G et al. (2016). Body weight loss reverts obesity-associated hypogonadotropic hypogonadism. Eur J Endocrinol."
   ]
   ```
   Chercher dans le texte markdown les patterns "Nom et al. (année)" et formatter proprement.

**Sous-section `### IMPACT (800-1000 mots)`**:

7. **`impact.performance`**: Cette section a 4 sous-sections. Les mapper ainsi:
   - `hypertrophy`: Laisser vide `""` (vitamine D n'a pas impact hypertrophie directe)
   - `strength`: Copier texte `#### Performance > **Force et puissance musculaire**`
   - `recovery`: Copier texte `#### Performance > **Récupération et inflammation**`
   - `bodyComp`: Copier texte `#### Performance > **Composition corporelle**`

8. **`impact.health`**:
   - `energy`: Copier texte `#### Santé > **Immunité et infections respiratoires**` (adapter titre si besoin)
   - `mood`: Copier texte `#### Santé > **Humeur et cognition**`
   - `cognition`: Inclure dans mood ci-dessus OU copier la partie cognition séparément
   - `immunity`: Déjà copié dans energy

9. **`impact.longTerm`**:
   - `cardiovascular`: Copier `#### Long-terme > **Santé cardiovasculaire**`
   - `metabolic`: Copier `#### Long-terme > **Risque cancer**` (ou adapter)
   - `lifespan`: Copier `#### Long-terme > **Longévité**`

10. **`impact.studies`** ← Extraire toutes les citations de la section Impact (même méthode que definition.studies)

**Sous-section `### PROTOCOLE (800-1200 mots)`**:

11. **`protocol.phase1_lifestyle`**:
    - `duration`: "0-30 jours - PRIORITÉ ABSOLUE"
    - `sleep`: Copier texte `#### Phase 1: Lifestyle > **Exposition solaire optimisée**` (première partie)
    - `nutrition`: Copier texte `**Alimentation** (limité)`
    - `training`: `""` (non applicable pour vitamine D)
    - `stress`: `""` (non applicable)
    - `alcohol`: `""` (non applicable)
    - `expected_impact`: Copier texte `**Résultats attendus Phase 1**`

12. **`protocol.phase2_supplements`**:
    - `duration`: "30-90 jours - Après optimisation lifestyle"
    - `supplements`: Créer un array depuis le tableau markdown. Chercher section `**Vitamine D3 (Cholécalciférol)**` et suivantes. Format:
      ```typescript
      supplements: [
        {
          name: "Vitamine D3 (Cholécalciférol)",
          dosage: "5000 UI/jour (si <30 ng/mL), puis 2000-3000 UI maintenance",
          timing: "Matin avec repas contenant graisses",
          brand: "NOW Foods, Thorne, Doctor's Best",
          mechanism: "Copier le texte 'Vitamine D = stéroïde hormone...' (paragraphe mécanisme)",
          studies: ["Pilz S et al. (2011)...", "Wehr E et al. (2010)..."]
        },
        {
          name: "Vitamine K2 MK-7 (optionnel avec D3)",
          dosage: "200mcg/jour",
          timing: "Avec vitamine D3 (synergie)",
          brand: "NOW Foods, Life Extension, Jarrow",
          mechanism: "Copier texte mécanisme K2",
          studies: ["Iki M et al. (2006)..."]
        },
        // ... autres suppléments (Magnésium, Zinc si listés)
      ]
      ```
    - `budget`: Copier le texte budget mensuel estimé
    - `expected_impact`: Copier texte `**Résultats attendus Phase 2**`

13. **`protocol.phase3_retest`**:
    - `duration`: "90 jours+"
    - `when`: Copier texte `**Timing retest: J+90...**`
    - `markers`: Extraire la liste des marqueurs (25-OH-D, Calcium, PTH, etc.)
    - `success_criteria`: Copier texte `**Critères succès**`
    - `next_steps`: Copier texte `**Si 25-OH-D reste <30 ng/mL à J+90**`

14. **`protocol.special_cases`**:
    - `non_responders`: Copier section `**Obésité (BMI >30)**` + autres cas particuliers
    - `contraindications`: Copier section `**Contre-indications**`
    - `red_flags`: Copier section `**Red flags**`

---

## TÂCHE 2: INTÉGRER GLYCÉMIE À JEUN

**Même procédure** que Vitamine D, mais avec la section `## 2. GLYCÉMIE À JEUN` du fichier BIOMARKERS_CONTENT_EXTENDED_3.md

**Code marker**:
```typescript
export const GLYCEMIE_JEUN_EXTENDED: BiomarkerDetailExtended = {
  // ... à remplir
}
```

**Adaptations spécifiques**:
- `impact.performance.hypertrophy`: `""` (non applicable)
- `impact.performance.strength`: Adapter avec section "Partition nutriments"
- `protocol.phase1_lifestyle.training`: Copier section `**Entraînement résistance**`
- `protocol.phase1_lifestyle.sleep`: Copier section `**Sommeil et stress**`
- `protocol.phase2_supplements.supplements`: Extraire Berbérine, ALA, Cannelle, Chrome, Magnésium

---

## TÂCHE 3: INTÉGRER HbA1c

**Même procédure** avec section `## 3. HbA1c (HÉMOGLOBINE GLYQUÉE)`

**Code marker**:
```typescript
export const HBA1C_EXTENDED: BiomarkerDetailExtended = {
  // ... à remplir
}
```

**Adaptations**:
- `protocol.phase1_lifestyle`: Copier sections lifestyle HbA1c (marches post-prandiales, HIIT, ordre macros)
- `protocol.phase2_supplements`: Mêmes que glycémie (Berbérine, ALA, etc.)
- `protocol.phase3_retest`: Inclure mention CGM (Continuous Glucose Monitor)

---

## TÂCHE 4: CRÉER TESTOSTÉRONE TOTALE

**Source**: Extraire depuis `/Users/achzod/Desktop/neurocore/neurocore-github/SPECS_REFONTE_BLOOD_DASHBOARD_COMPLETE.md`

**Localiser**: Section `## 7. MOTEUR RÉDACTIONNEL` → Sous-section `**Exemple complet: Testostérone Totale**`

Cette section contient DÉJÀ un objet TypeScript formaté:
```typescript
export const TESTOSTERONE_TOTAL_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `La testostérone totale mesure...`,
    // ... déjà structuré
  }
}
```

**Action**: COPIER DIRECTEMENT cet objet complet et l'ajouter à `bloodBiomarkerDetailsExtended.ts`

**Code marker à créer**:
```typescript
export const TESTOSTERONE_TOTAL_EXTENDED: BiomarkerDetailExtended = {
  // COPIER ICI tout le contenu depuis SPECS
}
```

---

## TÂCHE 5: CRÉER CORTISOL (NOUVEAU)

**IMPORTANT**: Cortisol n'est PAS encore rédigé. Pour l'instant, créer une structure avec placeholders intelligents.

**Code à créer**:
```typescript
export const CORTISOL_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `Le cortisol est l'hormone glucocorticoïde principale sécrétée par les glandes surrénales en réponse au stress (physique, psychologique, métabolique). Produit selon un rythme circadien strict avec pic matinal (6-8h, 15-25 μg/dL) et nadir nocturne (23h-1h, <5 μg/dL), il régule métabolisme énergétique, réponse inflammatoire, fonction immunitaire, pression artérielle et homéostasie glucidique. Le cortisol suit l'axe HPA (hypothalamus-pituitaire-surrénales): stress → CRH hypothalamique → ACTH hypophysaire → cortisol surrénalien. Hormone catabolique, il mobilise réserves énergétiques (gluconéogenèse hépatique, lipolyse, protéolyse musculaire) pour fournir glucose au cerveau durant stress aigu. Problème: stress chronique moderne (travail, manque sommeil, surentraînement) dérégule cet axe → cortisol élevé persistant → résistance insuline, catabolisme musculaire, immunosuppression, troubles humeur. Pour l'athlète, cortisol basal optimal (10-15 μg/dL matin, <5 μg/dL soir) reflète récupération adéquate, sommeil qualité, charge training appropriée. Cortisol >20 μg/dL matin chronique = red flag overtraining/stress/sommeil insuffisant.`,

    mechanism: `Le cortisol se lie aux récepteurs glucocorticoïdes (GR) cytoplasmiques présents dans quasi tous les tissus. Complexe cortisol-GR transloque au noyau, régule transcription >1000 gènes. Effets métaboliques: (1) Gluconéogenèse hépatique: ↑PEPCK, ↑G6Pase → production glucose de novo depuis acides aminés (alanine, glutamine issues catabolisme musculaire). (2) Résistance insuline périphérique: muscle/adipocytes deviennent moins sensibles insuline → glucose épargné pour cerveau. (3) Lipolyse: stimule HSL (hormone-sensitive lipase) adipocytes → libération acides gras libres comme fuel alternatif. (4) Protéolyse musculaire: ↓synthèse protéique (inhibe mTOR), ↑dégradation (active ubiquitin-proteasome pathway) → catabolisme masse maigre. Effets immunitaires: anti-inflammatoire aigu (↓cytokines pro-inflammatoires TNF-α, IL-1, IL-6, stabilise membranes lysosomales) mais immunosuppresseur si chronique (↓lymphocytes T, ↓NK cells, ↓production anticorps). Paradoxe: cortisol aigu = adaptatif (mobilise énergie, réduit inflammation excessive), cortisol chronique = destructif (catabolisme, résistance insuline, immunodépression).`,

    clinical: `Dosage cortisol plasmatique standard: prélèvement matinal 7-9h (pic circadien). Ranges normaux: 10-20 μg/dL (275-550 nmol/L) matin, <10 μg/dL soir. Dosage isolé peu informatif (variabilité circadienne), dosage salivaire 4-points supérieur: 7h (réveil), 12h (midi), 17h (après-midi), 23h (coucher). Courbe normale: pic matin (15-20 μg/dL salivaire), déclin progressif, nadir <1 μg/dL nocturne. Profils pathologiques: (1) Hypercortisolisme (Cushing): cortisol >20-25 μg/dL matin, perte rythme circadien (soir élevé >5 μg/dL), test freinage dexaméthasone anormal. Causes: adénome hypophysaire (maladie Cushing), adénome surrénalien, tumeur ectopique sécrétante ACTH, corticothérapie exogène. (2) Insuffisance surrénalienne (Addison): cortisol <5 μg/dL matin, ACTH élevé si primaire (surrénales détruites) ou bas si secondaire (hypophyse défaillante). (3) Dysfonction HPA fonctionnelle (fréquent athlètes): cortisol matin "normal" (12-18 μg/dL) mais ratio cortisol/DHEA élevé (>10:1 vs optimal 6:1), courbe plate (pas de déclin soir), élévation nocturne (>3-5 μg/dL). Indicateur stress chronique, overtraining, privation sommeil. Associer dosage DHEA-S (androgène surrénalien antagoniste cortisol, anabolique vs catabolique).`,

    ranges: {
      optimal: "Matin: 10-18 μg/dL, Soir: <3 μg/dL",
      normal: "Matin: 10-20 μg/dL, Soir: <10 μg/dL",
      suboptimal: "Matin: >20 μg/dL ou Soir: >5 μg/dL",
      critical: "Matin: >25 μg/dL (hypercortisolisme) ou <5 μg/dL (insuffisance)",
      interpretation: `Optimal (10-18 matin, <3 soir): Axe HPA sain, récupération adéquate, sommeil qualité, charge stress gérable. Anabolisme favorisé, partition nutriments optimale. Normal (10-20 matin, <10 soir): Fonctionnel mais marge amélioration. Soir >5 μg/dL suggère stress résiduel, sommeil potentiellement affecté. Suboptimal (>20 matin ou >5 soir): Stress chronique, overtraining possible, sommeil insuffisant/fragmenté, récupération compromise. Catabolisme ↑, résistance insuline débutante, immunité ↓. Critical (>25 ou <5 matin): Investigation médicale requise. >25 = Cushing possible (imaging surrénales/hypophyse, test freinage). <5 = Addison possible (test stimulation ACTH).`
    },

    variations: `Rythme circadien strict: nadir 23h-2h (phase sommeil profond, pic GH), pic 6-9h (préparation éveil, mobilisation énergie), déclin progressif journée. Manque sommeil aiguë (<5h une nuit) élève cortisol matin +15-20% et abolit déclin soir (reste >8-10 μg/dL 23h). Exercice aigu: pic cortisol proportionnel intensité/durée. HIIT/résistance lourde: +50-100% cortisol immédiat post-effort, retour baseline 2-4h. Endurance longue (>90min): élévation progressive, catabolique si répété sans récupération. Âge: cortisol matin stable jusqu'à 60 ans, puis ↑légèrement chez personnes âgées (dysfonction HPA). Ratio cortisol/DHEA ↑ avec âge (DHEA décline -80% entre 20-70 ans, cortisol stable = ratio défavorable). Stress chronique: perte rythme circadien (courbe plate), élévation baseline +20-40%, résistance GR (récepteurs downregulés).`,

    studies: [
      "Leproult R et al. (2011). Effect of sleep restriction on testosterone in young healthy men. JAMA.",
      "Donga E et al. (2010). A single night of partial sleep deprivation induces insulin resistance. J Clin Endocrinol Metab.",
      "Stephens NA et al. (2011). An analysis of factors that influence stress and recovery. Sports Med."
    ]
  },

  impact: {
    performance: {
      hypertrophy: `Cortisol élevé chronique (>20 μg/dL matin persistant) = ennemi #1 hypertrophie. Inhibe mTOR (voie synthèse protéique), active FoxO (dégradation protéique ubiquitin-proteasome), ↓IGF-1 disponibilité. Sujets cortisol élevé (stress chronique, overtraining, <6h sommeil) montrent gains masse maigre -40-60% vs cortisol optimal à programme training identique. Cortisol ↑ favorise aussi myostatine (inhibiteur croissance musculaire). Ratio cortisol/testostérone >0.5 (cortisol en μg/dL, testostérone en ng/dL ÷10) = environnement catabolique. Optimal <0.2 pour anabolisme maximal.`,

      strength: `Cortisol élevé réduit force via catabolisme fibres Type II (rapides, force/puissance). Dégradation préférentielle protéines contractiles myosine (↓myofibrilles). Cortisol >22 μg/dL chronique associé à perte force maximale -8-12% sur 8 semaines malgré entraînement continué (overreaching non-fonctionnel). Mécanisme: ↓excitabilité neuromusculaire, ↓recrutement unités motrices, fatigue centrale. Indicateur pratique: stagnation/régression 1RM squat/bench sans explication = doser cortisol salivaire 4-points.`,

      recovery: `Cortisol élevé prolonge récupération post-training. Inhibe réparation microlésions musculaires (↓satellite cells, ↓synthèse collagène), maintient inflammation (paradoxalement: cortisol anti-inflammatoire aigu mais si chronique élevé, résistance GR → inflammation persiste). DOMS prolongés (+48-72h vs 24-48h normal), fatigue persistante, besoin >72h entre sessions lourdes. Sommeil fragmenté (cortisol nocturne >5 μg/dL) ↓ sommeil profond (ondes delta) → ↓ pic GH nocturne → récupération compromise. Cercle vicieux: mauvais sommeil → cortisol ↑ → récupération ↓ → performance ↓ → stress ↑ → cortisol ↑.`,

      bodyComp: `Cortisol élevé = stockage graisse abdominale viscérale préférentiel (adipocytes viscéraux ont densité récepteurs GR 4× supérieure vs sous-cutané). Mécanisme: cortisol + insuline (résistance induite par cortisol) = combinaison lipogénique puissante. Profil "stress belly": graisse viscérale, membres relativement maigres (catabolisme musculaire périphérique), cortisol matin >20 μg/dL chronique. Femmes: cortisol élevé perturbe aussi axe HPG (↓GnRH → ↓LH/FSH → ↓estradiol/progestérone → stockage graisse). Hommes: cortisol ↓ testostérone (inhibe LH) → perte muscle + gain graisse.`
    },

    health: {
      energy: `Cortisol élevé chronique = fatigue paradoxale. Malgré effet stimulant aigu (mobilisation glucose, catécholamines), cortisol persistant induit résistance récepteurs GR, dysfonction mitochondriale (↓ respiration cellulaire, ↓ ATP), épuisement surrénalien relatif. Profil typique: réveil difficile malgré cortisol matin "normal" (résistance), crash 14-16h (hypoglycémie réactive résistance insuline), second wind soir (cortisol ne baisse pas). Fatigue centrale: cortisol perturbe neurotransmission (↓ sérotonine, ↓ dopamine).`,

      mood: `Cortisol élevé chronique = facteur risque dépression/anxiété ×3-4. Mécanisme: (1) ↓ neurogenèse hippocampale (cortisol toxique pour neurones, ↓ BDNF), (2) ↓ sérotonine (↑ enzyme dégradation MAO), (3) ↓ dopamine (épuisement précurseurs), (4) hyperactivité amygdale (réactivité émotionnelle ↑). Hypercortisolisme (Cushing) symptômes psychiatriques 60-80% cas: dépression majeure, anxiété, labilité émotionnelle. Même cortisol "high-normal" (18-22 μg/dL chronique) associé à scores anxiété/dépression +40-60% vs <15 μg/dL.`,

      cognition: `Cortisol suit courbe en U inversé pour cognition. Optimal modéré (12-18 μg/dL) = alerte, mémoire de travail, focus. Trop bas (<8 μg/dL) = léthargie, brain fog. Trop élevé (>22 μg/dL chronique) = déficits mémoire (cortisol neurotoxique hippocampe), ↓ attention, ↓ vitesse traitement. Stress chronique avec cortisol élevé années → atrophie hippocampe -8-12% volume (IRM), déclin cognitif accéléré, risque démence ×2.`,

      immunity: `Cortisol aigu = anti-inflammatoire bénéfique (↓ cytokines, stabilise membranes). Cortisol chronique élevé = immunosuppression: ↓ lymphocytes T CD4 (helpers), ↓ NK cells (défense antivirale/anticancer), ↓ IgA sécrétoire (première ligne muqueuses). Athlètes cortisol >22 μg/dL chronique: infections respiratoires hautes ×3-4 fréquence, cicatrisation ralentie, réactivation herpès (HSV, EBV) si latent. Vaccinations moins efficaces (réponse anticorps ↓30-50%).`
    },

    longTerm: {
      cardiovascular: `Cortisol élevé chronique ↑ risque CV via multiples voies: (1) HTA (cortisol stimule angiotensinogène, sensibilise récepteurs α-adrénergiques vasculaires), (2) Dyslipidémie (↑ VLDL/LDL, ↓ HDL), (3) Résistance insuline → syndrome métabolique, (4) Inflammation vasculaire (cortisol chronique → résistance GR → inflammation persiste), (5) Dysfonction endothéliale, (6) ↑ viscosité sanguine. Hypercortisolisme (Cushing) = risque infarctus ×4-5, AVC ×3. Même cortisol "high-normal" (>18 μg/dL chronique) associé risque CV +30-40%.`,

      metabolic: `Cortisol = hormone diabétogène. Induit résistance insuline via: (1) ↓ GLUT4 translocation muscle/adipocytes, (2) ↑ gluconéogenèse hépatique (production glucose inappropriée), (3) ↓ sécrétion insuline pancréatique (cortisol toxique cellules β long-terme). Stress chronique + cortisol élevé = risque diabète T2 ×2-3. Syndrome métabolique (obésité abdominale, HTA, dyslipidémie, hyperglycémie) souvent médié par hypercortisolisme subclinique. Cushing = diabète 40-50% cas.`,

      lifespan: `Cortisol élevé chronique accélère vieillissement biologique: (1) ↓ longueur télomères (cortisol inhibe télomérase), (2) ↑ stress oxydatif (↓ défenses antioxydantes SOD, catalase), (3) ↑ inflammation chronique bas-grade (inflammaging), (4) ↓ autophagie (cortisol inhibe AMPK), (5) Atrophie hippocampe/cortex préfrontal, (6) Immunosénescence accélérée. Études centenaires: cortisol matin moyen 10-14 μg/dL (bas-normal), ratio cortisol/DHEA <8:1. Stress chronique + cortisol élevé = mortalité toutes causes ×1.6-2.0.`
    },

    studies: [
      "Epel ES et al. (2004). Accelerated telomere shortening in response to life stress. Proc Natl Acad Sci.",
      "Whitworth JA et al. (2005). Cardiovascular consequences of cortisol excess. Vasc Health Risk Manag.",
      "Kumari M et al. (2011). Association of diurnal patterns in salivary cortisol with all-cause and cardiovascular mortality. J Clin Endocrinol Metab."
    ]
  },

  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours - FONDAMENTAL",

      sleep: `PRIORITÉ ABSOLUE. Objectif: 7h30-8h30 minimum, qualité maximale, horaires fixes.

**Protocole Huberman-validated**:
1. **Timing strict**: Coucher 22h-23h, réveil 6h30-7h30 (aligner rythme circadien cortisol, pic GH nocturne)
2. **Lumière matinale**: Exposition 10-30k lux dans première heure réveil, 10-30min (↓ cortisol baseline -15%, renforce rythme circadien)
3. **Blocage lumière bleue**: 0 écrans 2h pré-coucher, ou lunettes orange (↑ mélatonine, ↓ cortisol nocturne)
4. **Environnement**: Chambre <19°C, noir total (masque si besoin), silence (bouchons si bruit)
5. **Routine**: Wind-down 1h pré-coucher (lecture, douche tiède, méditation)

**Suppléments sommeil si besoin**:
- Magnésium bisglycinate 400mg 1h pré-coucher (↓ cortisol, ↑ GABA)
- L-théanine 200-400mg si stress résiduel (↓ cortisol, ↑ ondes alpha)
- Apigénine 50mg (chamomile extract) si insomnie (↓ cortisol nocturne)

**Résultats**: 7j sommeil optimal → cortisol matin -10-15%, cortisol soir -40-60% (retour <3 μg/dL), ratio cortisol/DHEA amélioration +20-30%.`,

      nutrition: `**Timing glucides**: 60-70% apport quotidien dans fenêtre 2h pré + 4h post-entraînement (sensibilité insuline max, cortisol stable). Soir: limiter glucides <30-40g dîner (éviter pic insuline tardif → perturbation sommeil, cortisol nocturne ↑).

**Caféine**: Max 200-400mg/jour, JAMAIS après 14h (demi-vie 5-6h, perturbe sommeil même si non ressenti). Si cortisol matin >20 μg/dL: réduire à 100mg ou 0 pendant 2-4 semaines (caféine stimule cortisol +30-50% aigu, sensibilise axe HPA si chronique).

**Alcool**: ZÉRO pendant 30 jours reset. Alcool perturbe sommeil profond (↓ ondes delta, ↓ GH), maintient cortisol nocturne élevé >8-10 μg/dL (vs <3 optimal).

**Omega-3**: EPA/DHA 2-4g/jour (poissons gras ou supplément). Anti-inflammatoire, ↓ cortisol réponse stress -20-30% (Hellhammer et al. 2012).`,

      training: `**Éviter surentraînement** = cause #1 hypercortisolisme athlètes.

**Deload immédiat si cortisol >22 μg/dL**: Réduire volume -50%, intensité maintenue, 1-2 semaines. Favoriser récupération vs progression.

**Timing optimal**: Entraînement lourd 10h-17h (cortisol déjà décliné depuis pic, éviter stimulation excessive matinale). JAMAIS entraînement intense >19h (cortisol ↑ persiste nocturne → sommeil perturbé).

**Volume**: Max 12-16 séries/groupe/semaine si cortisol élevé (vs 16-22 si optimal). Qualité > quantité.

**Cardio**: HIIT max 2-3×/semaine (cortisol spike important). Favoriser Zone 2 (conversational pace) 3-5×/semaine (↓ cortisol baseline, ↑ récupération).

**Résultats**: 2 semaines deload + timing ajusté → cortisol -15-25%, récupération déblocage, progression reprise.`,

      stress: `**Respiration physiological sigh** (Huberman protocol): 5-10min/jour ou PRN stress aigu.
- 2× inspire nasal (1 profonde + 1 courte "top off" pour maximal expansion alvéolaire)
- 1× expire longue bouche (ratio 1:2 inspire:expire)
- Mécanisme: ↓ fréquence cardiaque, active parasympathique, ↓ cortisol -20-30% en 5min

**Cohérence cardiaque**: 5min 3×/jour (matin, midi, soir).
- 5sec inspire, 5sec expire, 6 cycles/min (stimule variabilité HRV, ↓ cortisol chronique)

**Méditation mindfulness**: 15-20min/jour. Apps: Headspace, Calm, Waking Up.
- 8 semaines pratique → cortisol matin -15%, cortisol réponse stress -25%, ratio cortisol/DHEA amélioration (Hoge et al. 2013)

**Coupures travail**: 1 jour/semaine ZÉRO email/calls. Détachment psychologique = ↓ cortisol -30-40% jours off vs jours travail.`,

      alcohol: `ZÉRO alcool pendant 30 jours (phase reset cortisol).

Alcool perturbe rythme circadien cortisol:
- Sommeil profond ↓ (fragmentation, réveils nocturnes)
- Cortisol nocturne reste élevé >8-10 μg/dL (vs <3 optimal)
- Réveil matinal avec cortisol "spike" exagéré (>25 μg/dL possible post-alcool)

Dose-dépendant:
- 1-2 verres/jour: cortisol matin +8-12%
- 3-4 verres/jour: cortisol matin +15-20%, perte rythme circadien
- Binge (5+ verres): cortisol désorganisé 48-72h post

Après 30 jours reset: max 2 verres/semaine si reprise, jamais veilles sommeil prioritaire.`,

      expected_impact: `**Résultats combinés lifestyle 30 jours** (sommeil + stress + training + nutrition):

Si cortisol matin baseline 22 μg/dL, soir 8 μg/dL (suboptimal):
- J+7: Cortisol matin -10% (20 μg/dL), soir -40% (5 μg/dL) via sommeil fix
- J+14: Cortisol matin -15% (19 μg/dL), soir -60% (3 μg/dL) via sommeil + stress management
- J+30: Cortisol matin -20-25% (16-17 μg/dL), soir -70% (2-3 μg/dL, OPTIMAL) via full protocol

Bonus:
- Ratio cortisol/DHEA: 12:1 → 7:1 (amélioration +40%)
- Énergie: +50-70% (disparition crash après-midi)
- Sommeil: +60-80% qualité (profond ↑, réveils ↓)
- Récupération: -30-40% DOMS durée
- Composition corporelle: -1-2kg graisse abdominale (cortisol ↓ = lipolyse viscérale)
- Humeur: -40-60% scores anxiété/dépression

⚠️ Si cortisol reste >20 μg/dL malgré lifestyle optimal 30j → Investigation médicale (Cushing, adénome surrénalien, tumeur hypophysaire).`
    },

    phase2_supplements: {
      duration: "30-90 jours - Si lifestyle insuffisant OU accélération",

      supplements: [
        {
          name: "Ashwagandha KSM-66",
          dosage: "600mg/jour (300mg × 2 ou 600mg soir)",
          timing: "Soir de préférence (effet GABAergique relaxant)",
          brand: "KSM-66 (marque brevetée), Jarrow Formulas, NOW Foods",
          mechanism: `Adaptogène régule axe HPA. Mécanisme: (1) ↓ CRH hypothalamique (↓ stimulation ACTH), (2) Modulateur récepteurs GABA (anxiolytique naturel), (3) ↑ expression enzymes antioxydantes (↓ stress oxydatif surrénales). Essais randomisés: ashwagandha 600mg × 8 semaines → cortisol matin -27.9%, cortisol soir -30%, scores stress perçu -44% (Lopresti et al. 2019). Bonus: testostérone +14.7% (levée inhibition cortisol sur axe HPG). Forme KSM-66 standardisée withanolides ≥5% = gold standard (biodisponibilité supérieure).`,
          studies: [
            "Lopresti AL et al. (2019). A randomized, double-blind, placebo-controlled trial of ashwagandha on stress and testosterone. J Int Soc Sports Nutr.",
            "Chandrasekhar K et al. (2012). A prospective study on the safety and efficacy of ashwagandha. Indian J Psychol Med."
          ]
        },
        {
          name: "Phosphatidylserine (PS)",
          dosage: "400mg/jour (200mg × 2 ou 400mg post-training)",
          timing: "Post-entraînement intense OU soir si cortisol nocturne élevé",
          brand: "Jarrow PS-100, NOW Foods",
          mechanism: `Phospholipide membranaire, modulateur axe HPA. Bloque cortisol spike excessif post-exercice intense. Études: PS 400mg pré-exercice → cortisol post-effort -20-30% vs placebo (Starks et al. 2008). Particulièrement efficace si surentraînement ou entraînements 2×/jour. Mécanisme: PS intègre membranes cellules hypothalamus/hypophyse, modifie fluidité membranaire → ↓ libération CRH/ACTH. Pas d'effet baseline (cortisol reste normal si pas de stress), seulement atténue spikes excessifs.`,
          studies: [
            "Starks MA et al. (2008). The effects of phosphatidylserine on endocrine response to moderate intensity exercise. J Int Soc Sports Nutr.",
            "Monteleone P et al. (1990). Blunting of cortisol secretion by PS. Eur J Clin Pharmacol."
          ]
        },
        {
          name: "Rhodiola rosea",
          dosage: "300-600mg/jour extrait standardisé (3% rosavins, 1% salidroside)",
          timing: "Matin à jeun",
          brand: "Gaia Herbs, NOW Foods, Life Extension",
          mechanism: `Adaptogène anti-fatigue, modulation axe HPA similaire ashwagandha mais profil différent. Rhodiola = stimulant léger (vs ashwagandha relaxant) → matin optimal. Mécanisme: (1) Inhibe COMT (enzyme dégradation catécholamines) → ↑ dopamine/noradrénaline disponibilité sans ↑ cortisol, (2) ↓ fatigue centrale (neuroprotecteur), (3) Améliore ratio cortisol/DHEA. Études: rhodiola 400mg × 4 semaines → cortisol réponse stress -30%, fatigue perçue -40%, performance cognitive +15% (Olsson et al. 2009). Synergie ashwagandha (soir) + rhodiola (matin) fréquente.`,
          studies: [
            "Olsson EM et al. (2009). A randomised, double-blind, placebo-controlled study of rhodiola rosea. Planta Med.",
            "Darbinyan V et al. (2000). Rhodiola rosea in stress-induced fatigue. Phytomedicine."
          ]
        },
        {
          name: "Magnésium bisglycinate",
          dosage: "400-500mg/jour élément magnésium",
          timing: "1h avant coucher (améliore sommeil + ↓ cortisol nocturne)",
          brand: "Doctor's Best, Thorne, Pure Encapsulations",
          mechanism: `Cofacteur >300 enzymes, antagoniste NMDA (↓ excitabilité neuronale), agoniste GABA (relaxant). Déficit magnésium (50% population) associé cortisol élevé +15-20%, anxiété, insomnie. Supplémentation: magnésium 500mg × 8 semaines → cortisol matin -12%, scores anxiété -30% (Boyle et al. 2017). Forme bisglycinate = absorption optimale (chélation acide aminé), 0 effet laxatif (vs oxyde magnésium). Bonus: améliore sommeil profond +25% (↑ ondes delta) → ↑ GH nocturne, ↓ cortisol.`,
          studies: [
            "Boyle NB et al. (2017). The effects of magnesium supplementation on anxiety and stress. Nutrients.",
            "Nielsen FH et al. (2010). Magnesium deficiency and increased inflammation. Magnes Res."
          ]
        },
        {
          name: "L-théanine",
          dosage: "200-400mg/jour (ou PRN si stress aigu)",
          timing: "Matin avec caféine OU soir si anxiété résiduelle",
          brand: "Suntheanine (forme brevetée), NOW Foods, Jarrow",
          mechanism: `Acide aminé thé vert, traverse barrière hémato-encéphalique. Mécanisme: (1) ↑ GABA, dopamine, sérotonine cérébrales, (2) ↓ glutamate (excitateur), (3) ↑ ondes alpha EEG (relaxation alerte, pas sédation). Synergie caféine puissante: L-théanine 200mg + caféine 100mg → focus/alerte maintenus SANS cortisol spike (caféine seule ↑ cortisol +30-50%, théanine bloque). Études: L-théanine 200mg → cortisol réponse stress aigu -16%, fréquence cardiaque -5 bpm (Kimura et al. 2007). Pas d'effet chronique cortisol baseline (uniquement atténue réactivité stress).`,
          studies: [
            "Kimura K et al. (2007). L-Theanine reduces psychological and physiological stress. Biol Psychol.",
            "Haskell CF et al. (2008). The combination of L-theanine and caffeine improves cognitive performance. Nutr Neurosci."
          ]
        }
      ],

      budget: `**Coût mensuel total: 60-90€**

- Ashwagandha KSM-66 (60 caps 300mg): ~25€/mois
- Phosphatidylserine (60 caps 100mg): ~20€/mois (optionnel si pas overtraining)
- Rhodiola (60 caps 500mg): ~18€/mois
- Magnésium bisglycinate (120 caps): ~15€/4mois = ~4€/mois
- L-théanine (60 caps 200mg): ~12€/mois (optionnel, PRN)

**Recommandation budget limité**: Ashwagandha + Magnésium (base 30€/mois), ajouter Rhodiola si fatigue ou PS si overtraining selon besoin.`,

      expected_impact: `**Résultats Phase 1 (lifestyle) + Phase 2 (suppléments) combinés à J+90**:

Cortisol baseline 22 μg/dL matin, 8 μg/dL soir:
- Phase 1 seule (J+30): -20-25% cortisol matin (16-17 μg/dL), -70% soir (2-3 μg/dL)
- Phase 1+2 (J+90): -30-40% cortisol matin (13-15 μg/dL OPTIMAL), -75-80% soir (1-2 μg/dL EXCELLENT)

Ratio cortisol/DHEA: 12:1 → 5-6:1 (optimal <8:1, excellent <6:1)

Amélioration symptomatique:
- Énergie stable: +70-90% (disparition crash total)
- Sommeil: +80-100% qualité (endormissement <15min, 0 réveil nocturne, réveil reposé)
- Récupération: Capable 4-5 séances lourdes/semaine (vs 2-3 baseline)
- Composition corporelle: -2-4kg graisse abdominale viscérale (cortisol normalized)
- Humeur: -60-80% anxiété, amélioration dépression si présente
- Performances: Déblocage progression (force, hypertrophie, endurance)
- Immunité: -60-80% infections respiratoires

⚠️ Si amélioration <20% cortisol malgré Phase 1+2 stricte 90j → Investigation Cushing (test freinage dexaméthasone, imaging surrénales/hypophyse).`
    },

    phase3_retest: {
      duration: "90 jours+ - Évaluation complète",

      when: `**Timing retest: J+90** (12 semaines après début Phase 1)

**Méthode GOLD STANDARD: Cortisol salivaire 4-points**
- 7h00 (réveil immédiat, avant lever)
- 12h00 (midi, avant repas)
- 17h00 (fin après-midi)
- 23h00 (avant coucher)

Prélèvement sur 2 jours consécutifs non-stressants (éviter veilles examen, compétition, deadlines). Kit salivaire: ZRT Laboratory, DUTCH test (inclut aussi DHEA, métabolites).

**Alternative acceptable: Cortisol plasmatique**
- Prélèvement 7-9h matin + 16-18h après-midi (2 points minimum)
- Moins informatif que salivaire 4-points mais acceptable

**Conditions standardisées**:
- 48h post-entraînement intense (éviter cortisol spike résiduel)
- Sommeil >7h nuit précédente
- 0 caféine jour prélèvement
- Repos, journée calme`,

      markers: [
        "Cortisol salivaire 4-points (7h, 12h, 17h, 23h)",
        "DHEA-S (sulfate, forme stable longue demi-vie)",
        "Ratio cortisol/DHEA (7h matin)",
        "Testostérone totale (vérifier levée inhibition cortisol)",
        "Glycémie jeûne + insuline (HOMA-IR, évaluer résistance insuline liée cortisol)",
        "TSH + T3 libre (cortisol élevé inhibe conversion T4→T3)",
        "CRP-us (inflammation)",
        "Optionnel: ACTH (si cortisol anormal, différencier primaire vs secondaire)"
      ],

      success_criteria: `**Critères succès cortisol optimal**:

✅ **Courbe circadienne normale**:
- 7h: 12-18 μg/dL salivaire (ou 10-18 μg/dL plasmatique)
- 12h: 6-10 μg/dL
- 17h: 3-6 μg/dL
- 23h: <2 μg/dL (idéalement <1 μg/dL)

✅ **Ratio cortisol/DHEA**: <8:1 (optimal <6:1)
- Calcul: Cortisol 7h (μg/dL) ÷ DHEA-S (μg/dL)
- Exemple: Cortisol 15, DHEA-S 250 → Ratio 15÷250 = 0.06 × 100 = 6:1 ✅

✅ **Marqueurs secondaires**:
- Testostérone: Amélioration +10-20% si baseline basse (levée inhibition cortisol)
- HOMA-IR: <1.5 (cortisol normalisé améliore sensibilité insuline)
- T3 libre: Normal/optimal (cortisol n'inhibe plus conversion)
- Sommeil: Qualité subjective +60-80%, latence <15min, 0 réveil nocturne
- Composition corporelle: -2-4kg graisse viscérale abdominale

✅ **Symptômes résolus**:
- Énergie stable toute journée (0 crash)
- Récupération normale (48-72h entre sessions lourdes)
- Humeur stable, anxiété minimale
- Libido normalisée/améliorée
- Immunité (0-1 infection/an vs 3-4+ baseline)`,

      next_steps: `**Si cortisol reste >20 μg/dL matin OU >5 μg/dL soir à J+90** malgré protocol strict:

**Investigations médicales approfondies**:

1. **Test freinage dexaméthasone** (screening Cushing):
   - Dexaméthasone 1mg 23h
   - Cortisol plasmatique 8h lendemain
   - Normal: cortisol <1.8 μg/dL (freinage efficace)
   - Cushing: cortisol >5 μg/dL (absence freinage)

2. **Cortisol libre urinaire 24h** (si suspicion Cushing):
   - Normal: <50-100 μg/24h
   - Cushing: >300 μg/24h

3. **ACTH plasmatique**:
   - ACTH élevé + cortisol élevé = Cushing dépendant ACTH (adénome hypophysaire, tumeur ectopique)
   - ACTH bas + cortisol élevé = Adénome surrénalien (production autonome)

4. **Imaging**:
   - IRM hypophysaire avec gadolinium (chercher adénome corticotrope)
   - Scanner surrénales (adénome, hyperplasie)

5. **Consultation endocrinologue** spécialisé surrénales/hypophyse

**Causes possibles échec protocol lifestyle**:

1. **Non-compliance** (le plus fréquent):
   - Vérifier journal sommeil (réellement 7h30-8h? ou 6h?)
   - Vérifier caféine (réellement 0 après 14h? ou café 16h?)
   - Vérifier alcool (réellement 0? ou "juste 1-2 verres weekends"?)
   - Vérifier entraînement (volume réellement réduit? ou même overtraining?)

2. **Stresseurs cachés**:
   - Travail (deadlines chroniques, manager toxique, 60h/semaine)
   - Relationnel (conflits couple, famille)
   - Financier (dettes, instabilité)
   → Nécessite changements environnementaux radicaux, pas juste suppléments

3. **Apnée du sommeil non diagnostiquée**:
   - Symptômes: ronflement, pauses respiratoires, fatigue malgré 8h sommeil, réveil bouche sèche
   - Polysomnographie (étude sommeil nuit hôpital) pour diagnostic
   - Traitement CPAP normalizе cortisol -20-30% en 3 mois

4. **Hypothyroïdie subclinique**:
   - TSH >2.5 mIU/L + T3 libre bas-normal
   - Métabolisme ralenti → stress compensatoire → cortisol ↑
   → Traiter thyroïde d'abord (levothyroxine), cortisol baisse secondairement

5. **Déficit DHEA primaire**:
   - Si DHEA-S <150 μg/dL homme (<100 femme) malgré cortisol normalisé
   → Supplémentation DHEA 25-50mg/jour sous supervision médicale (précurseur hormones sexuelles)`
    },

    special_cases: {
      non_responders: `**"J'ai tout bien fait, cortisol toujours élevé"**

Si cortisol reste >20 μg/dL matin après 90 jours lifestyle + suppléments optimaux:

**Checklist exhaustive avant Cushing investigation**:

1. ✅ Sommeil: Vraiment 7h30-8h? Tracker sommeil (Oura, Whoop) montrant >90% efficacité?
2. ✅ Lumière: Exposition 10-30k lux matin CHAQUE jour? (nuageux = seulement 2-5k lux insuffisant, utiliser lampe 10k lux)
3. ✅ Stress work: <50h travail/semaine? Détachement psychologique weekends/soirs? Si >60h chronique, cortisol restera élevé peu importe suppléments
4. ✅ Entraînement: Volume RÉELLEMENT réduit? Vérifier journal training. Si >20 séries/groupe/semaine ou >5 séances/semaine = overtraining persiste
5. ✅ Caféine: 0 après 14h strict? Dosage <200mg/jour? Si >400mg ou dosage tardif = cortisol spike résiduel
6. ✅ Apnée sommeil: Exclu par polysomnographie? Apnée modérée-sévère (AHI >15) maintient cortisol élevé même si "8h sommeil"
7. ✅ Relations: Conflits couple/famille chroniques? Divorce/séparation en cours? Stress relationnel = cortisol élevé intraitable par suppléments

**Si TOUTE checklist validée + cortisol >20 μg/dL persistant**:
→ Investigation Cushing (test freinage dexaméthasone, IRM hypophysaire, scanner surrénales)

**Profils rares mais possibles**:
- Résistance glucocorticoïdes familiale (mutation récepteur GR): Cortisol élevé compensatoire, asymptomatique (rare, familial)
- Tumeur ectopique sécrétante ACTH (carcinoïde, small-cell lung cancer): ACTH + cortisol très élevés, évolution rapide symptômes Cushing
- Hyperplasie surrénales bilatérale: Cortisol modérément élevé chronique, ACTH normal/bas`,

      contraindications: `**Suppléments cortisol - Contre-indications et précautions**:

**Ashwagandha**:
- ❌ Hyperthyroïdie (stimule T3/T4, peut aggraver)
- ❌ Grossesse/allaitement (effets abortifs possibles doses élevées)
- ❌ Maladies auto-immunes actives sévères (modulation immunitaire imprévisible)
- ⚠️ Précaution si thyroïde Hashimoto (monitorer TSH, peut sur-stimuler)

**Rhodiola**:
- ❌ Troubles bipolaires (peut déclencher manie phase high)
- ⚠️ Si anxiété sévère: commencer 150mg/jour (effet stimulant peut aggraver initialement)

**Phosphatidylserine**:
- ⚠️ Si anticoagulants (warfarin): PS dérivé soja/tournesol contient vitamine K, peut interférer

**Magnésium doses élevées (>500mg)**:
- ❌ Insuffisance rénale sévère (GFR <30): risque hypermagnésémie
- ⚠️ Diarrhée si forme oxyde/citrate, switcher bisglycinate

**L-théanine**:
- ⚠️ Si médicaments hypotenseurs: théanine ↓ TA légèrement, monitoring

**Lifestyle modifications contre-indications**:
- ❌ Jeûne intermittent si cortisol très élevé (>25 μg/dL): jeûne = stress additionnel, peut aggraver temporairement. Corriger cortisol AVANT jeûne.
- ❌ Exercice haute intensité (HIIT, CrossFit) si cortisol >22 μg/dL + symptômes overtraining: repos/deload obligatoire 2-4 semaines avant reprise progressive`,

      red_flags: `**Quand consulter endocrinologue IMMÉDIATEMENT (avant lifestyle trial)**:

🚩 **Hypercortisolisme sévère symptomatique**:
- Prise poids rapide centralisée (face "moonface", bosse dorsale "buffalo hump", abdomen proéminent, membres maigres)
- Vergetures pourpres larges (>1cm) abdomen/cuisses (striae rubrae)
- Ecchymoses spontanées fréquentes (fragilité capillaire)
- HTA nouvelle (>140/90) réfractaire
- Diabète nouveau (glycémie >126 mg/dL, HbA1c >6.5%)
- Faiblesse musculaire proximale franche (difficulté se lever chaise, monter escaliers)
- Aménorrhée femmes préménopausées (cortisol inhibe axe HPG)

🚩 **Cortisol extrême dosage**:
- Cortisol matin >30 μg/dL (Cushing probable)
- Cortisol soir >15 μg/dL (perte complète rythme circadien)
- Cortisol libre urinaire 24h >300 μg (>3× limite supérieure)

🚩 **Progression rapide symptômes** (2-6 mois):
- Prise poids >10kg sans changement diète/activité
- Apparition HTA + diabète simultanés
- Détérioration cognitive rapide (mémoire, concentration)
→ Tumeur ectopique ACTH possible (urgence diagnostique)

🚩 **Insuffisance surrénalienne suspectée**:
- Cortisol matin <5 μg/dL + fatigue extrême
- Hypotension orthostatique (chute TA >20 mmHg debout)
- Hyperpigmentation cutanée (Addison primaire, ACTH élevé stimule mélanocytes)
- Hypoglycémies fréquentes
- Nausées, vomissements, douleurs abdominales
→ Test stimulation ACTH urgent (diagnostic Addison), traitement hydrocortisone vitesauvetage

🚩 **Combinaisons alarmantes**:
- Cortisol élevé + testostérone très basse (<200 ng/dL homme) + TSH élevée = Panhypopituitarisme (adénome hypophysaire compressif) → IRM urgente
- Cortisol très élevé + hypokaliémie (<3.0 mEq/L) = Syndrome Cushing sévère ou tumeur ectopique ACTH (production ACTH massive) → Hospitalisation

**Règle générale**: Si cortisol >25 μg/dL matin OU symptômes Cushing francs → Endocrinologue AVANT lifestyle (ne pas perdre 3 mois, tumeur peut progresser).`
    }
  }
};
```

**Livrable**: Fichier `CORTISOL_EXTENDED` créé dans `bloodBiomarkerDetailsExtended.ts`

---

## TÂCHE 6: EXPORT FONCTION GETTER

Créer fonction helper pour accéder aux détails étendus:

```typescript
export function getBiomarkerDetailExtended(code: string): BiomarkerDetailExtended | null {
  const map: Record<string, BiomarkerDetailExtended> = {
    vitamine_d: VITAMINE_D_EXTENDED,
    glycemie_jeun: GLYCEMIE_JEUN_EXTENDED,
    hba1c: HBA1C_EXTENDED,
    testosterone_total: TESTOSTERONE_TOTAL_EXTENDED,
    cortisol: CORTISOL_EXTENDED
  };

  return map[code] || null;
}
```

---

## VALIDATION FINALE

### Build TypeScript

```bash
cd client
npx tsc --noEmit
```

Attendre 0 erreurs.

### Test manuel

Créer fichier `test-biomarkers-extended.ts`:

```typescript
import {
  VITAMINE_D_EXTENDED,
  GLYCEMIE_JEUN_EXTENDED,
  HBA1C_EXTENDED,
  TESTOSTERONE_TOTAL_EXTENDED,
  CORTISOL_EXTENDED
} from './client/src/data/bloodBiomarkerDetailsExtended';

console.log("=== VALIDATION CONTENUS BIOMARQUEURS ===\n");

const biomarkers = [
  { name: "Vitamine D", obj: VITAMINE_D_EXTENDED },
  { name: "Glycémie jeûn", obj: GLYCEMIE_JEUN_EXTENDED },
  { name: "HbA1c", obj: HBA1C_EXTENDED },
  { name: "Testostérone", obj: TESTOSTERONE_TOTAL_EXTENDED },
  { name: "Cortisol", obj: CORTISOL_EXTENDED }
];

biomarkers.forEach(({ name, obj }) => {
  console.log(`${name}:`);
  console.log(`  - definition.intro: ${obj.definition.intro.split(' ').length} mots`);
  console.log(`  - definition.mechanism: ${obj.definition.mechanism.split(' ').length} mots`);
  console.log(`  - impact.studies: ${obj.impact.studies.length} citations`);
  console.log(`  - protocol.phase2_supplements: ${obj.protocol.phase2_supplements.supplements.length} suppléments`);

  // Vérifier pas de placeholders
  const hasPlaceholder = JSON.stringify(obj).includes("JE NE SAIS PAS");
  console.log(`  - Placeholders: ${hasPlaceholder ? '❌ TROUVÉS' : '✅ AUCUN'}\n`);
});

console.log("=== FIN VALIDATION ===");
```

Exécuter:
```bash
npx ts-node test-biomarkers-extended.ts
```

Vérifier output:
- Chaque biomarqueur: 200-400 mots definition intro ✅
- 0 placeholders "JE NE SAIS PAS" ✅
- 3-5 suppléments phase 2 ✅

---

## QUESTIONS?

Si ambiguïté structure markdown, champs manquants, ou mapping unclear:
1. **DEMANDE clarification** (ne pas inventer contenu)
2. Signale ligne/section problématique dans BIOMARKERS_CONTENT_EXTENDED_3.md

---

## DEADLINE

Intégration complète BATCH 1 (5 biomarqueurs) avant passage BATCH 2 (TSH, ApoB, CRP, etc.).

**Estimated time**: 2-3h integration + validation

**Priority**: CRITIQUE (bloque dashboard refonte v2)

