# PROMPT CODEX - BLOOD DASHBOARD - CONTENUS MPMD/HUBERMAN

**Date**: 2026-01-29
**Priorité**: CRITIQUE - Remplace TOUT travail précédent

---

## ❌ ERREUR À CORRIGER

J'ai écrit des contenus génériques sur testostérone TOTALE. **FAUX**.

Pour musculation/performance, c'est **TESTOSTÉRONE LIBRE** qui compte.

---

## ✅ SOURCES VALIDES

**À UTILISER:**
- `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` (588+ lignes, 100% sourcé MPMD/Huberman/Masterjohn)
- `TESTOSTERONE_LIBRE_SOURCES_SYNTHESIS.md` (synthèse testo libre vs totale)
- `scraped-data/*.json` (sources primaires si besoin clarification)

**À IGNORER:**
- ❌ `PROMPT_CODEX_BATCH_1_COMPLETE.md` (contenus génériques)
- ❌ `BIOMARKERS_CONTENT_EXTENDED_3.md` (non sourcé MPMD)

---

## TÂCHE: CRÉER 5 BIOMARQUEURS PRIORITAIRES

**Fichier cible**: `client/src/data/bloodBiomarkerDetailsExtended.ts`

**Biomarqueurs TIER 1 (ordre priorité):**

1. **testosterone_libre** (FREE TESTOSTERONE) - PRIORITÉ #1
2. **shbg** (SHBG) - PRIORITÉ #2
3. **cortisol** (CORTISOL) - PRIORITÉ #3
4. **estradiol** (E2) - PRIORITÉ #4
5. **vitamine_d** (VITAMINE D) - PRIORITÉ #5

---

## MÉTHODOLOGIE EXTRACTION

Pour CHAQUE biomarqueur:

### 1. OUVRIR `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md`

### 2. LOCALISER la section du biomarqueur

Exemple pour testosterone_libre:
- Section "### 1. TESTOSTÉRONE LIBRE (FREE TESTOSTERONE)"
- Contient: "Pourquoi ça compte", "Ranges optimaux", "Protocole optimisation", "Interactions"

### 3. EXTRAIRE et MAPPER vers TypeScript

**Structure TypeScript** (`BiomarkerDetailExtended`):

```typescript
{
  definition: {
    intro: string;          // "Pourquoi ça compte" + contexte (200-400 mots)
    mechanism: string;      // Mécanisme physiologique (200-400 mots)
    clinical: string;       // Tests, méthodes, ranges cliniques (200-400 mots)
    ranges: {
      optimal: string;      // Range optimal PERFORMANCE
      normal: string;       // Range "acceptable"
      suboptimal: string;   // Range suboptimal
      critical: string;     // Range critique
      interpretation: string; // Explication détaillée (150-300 mots)
    };
    variations: string;     // Variations physiologiques (150-300 mots)
    studies: string[];      // Citations
  };
  impact: {
    performance: {
      hypertrophy: string;  // Impact hypertrophie (100-200 mots)
      strength: string;     // Impact force (100-200 mots)
      recovery: string;     // Impact récupération (100-200 mots)
      bodyComp: string;     // Impact composition corporelle (100-200 mots)
    };
    health: {
      energy: string;       // Énergie (100-150 mots)
      mood: string;         // Humeur (100-150 mots)
      cognition: string;    // Cognition (100-150 mots)
      immunity: string;     // Immunité (100-150 mots)
    };
    longTerm: {
      cardiovascular: string;  // Santé CV (100-150 mots)
      metabolic: string;       // Métabolisme (100-150 mots)
      lifespan: string;        // Longévité (100-150 mots)
    };
    studies: string[];
  };
  protocol: {
    phase1_lifestyle: {
      duration: string;
      sleep: string;        // Protocole sommeil détaillé
      nutrition: string;    // Protocole nutrition (macros, timing, etc.)
      training: string;     // Protocole entraînement
      stress: string;       // Gestion stress
      alcohol: string;      // Alcool/substances
      expected_impact: string; // Résultats attendus Phase 1
    };
    phase2_supplements: {
      duration: string;
      supplements: Array<{
        name: string;       // Nom supplément
        dosage: string;     // Dosage EXACT (mg/jour, etc.)
        timing: string;     // Quand prendre (matin/soir/repas)
        brand: string;      // Marques recommandées
        mechanism: string;  // Comment ça marche
        studies: string[];  // Citations
      }>;
      budget: string;       // Budget mensuel estimé
      expected_impact: string; // Résultats attendus Phase 2
    };
    phase3_retest: {
      duration: string;
      when: string;         // Quand retester
      markers: string[];    // Quels marqueurs retester
      success_criteria: string; // Critères de succès
      next_steps: string;   // Quoi faire après
    };
    special_cases: {
      non_responders: string;      // Que faire si pas de réponse
      contraindications: string;   // Contre-indications
      red_flags: string;           // Red flags médicaux
    };
  };
}
```

---

## BIOMARQUEUR 1: TESTOSTERONE_LIBRE

**Source**: `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` section "TESTOSTÉRONE LIBRE"

### Mapping instructions:

#### definition.intro

**COMBINER:**
- Section "Pourquoi ça compte (MPMD/Huberman)"
- Citations Derek + Masterjohn
- Contexte musculation/performance

**INCLURE citations**:
> "You could have a 900 ng/dL total testosterone level and still experience low testosterone symptoms..." (Derek)
> "The fraction that is not bound... is the true measure of what is bioavailable" (Masterjohn)

**Longueur**: 200-400 mots

#### definition.mechanism

**EXTRAIRE de**:
- Document TESTOSTERONE_LIBRE_SOURCES_SYNTHESIS.md section "SHBG - Le Voleur de Testostérone"
- BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md mécanisme binding SHBG/albumine/free

**INCLURE**:
- 3 formes: SHBG-bound (60-70%), albumine-bound (30-38%), free (1-3%)
- Citation Derek sur vieillissement: SHBG ↑ 1.6%/an → Free testosterone ↓ 2-3%/an
- Facteurs qui ↑/↓ SHBG

**Longueur**: 200-400 mots

#### definition.clinical

**EXTRAIRE de**:
- Section "Tests sanguins - Lesquels commander"
- Citation Derek "The Most Accurate Testosterone Blood Test"

**INCLURE**:
- Méthodes: ✅ LC/MS-MS + Equilibrium Ultrafiltration vs ❌ ECLIA/EIA
- Exemple Derek (Nandrolone test showing ECLIA imprécision)
- Commande exacte: "Testosterone, Free, Equilibrium Ultrafiltration With Total Testosterone, LC/MS-MS"
- Fréquence: 6 mois (Dr. Kyle Gillett)

**Longueur**: 200-400 mots

#### definition.ranges

**EXTRAIRE de**:
- Section "Ranges optimaux musculation"

```typescript
{
  optimal: ">150 pg/mL (Equilibrium Ultrafiltration) OU >20 ng/dL (selon méthode)",
  normal: "100-150 pg/mL (acceptable mais pas optimal)",
  suboptimal: "50-100 pg/mL (symptômes possibles: libido ↓, gains stagnants)",
  critical: "<50 pg/mL (hypogonadisme, investigation requise)",
  interpretation: `[COPIER du document: explication ranges trompeurs, symptômes par niveau, importance ressenti subjectif Masterjohn, etc.]`
}
```

#### definition.variations

**EXTRAIRE de**:
- Section variations circadiennes, âge, body composition, exercice, sommeil, stress, saison

**INCLURE**:
- Rythme circadien (pic 6-9h, nadir 20-23h)
- Déclin âge: -2-3%/an (Derek)
- Body fat optimal: 12-17% (Masterjohn/NHANES)
- Privation sommeil: -15% en 1 semaine <5h/nuit

**Longueur**: 150-300 mots

#### definition.studies

```typescript
[
  "Travison TG et al. (2017). Harmonized reference ranges...",
  "Leproult R et al. (2011). Effect of sleep restriction on testosterone. JAMA.",
  "Derek (MPMD). How Much Do Natural Testosterone Levels Decrease Per Year.",
  "Derek (MPMD). The Most Accurate Testosterone Blood Test.",
  "Masterjohn C. Five Ways to Increase Testosterone Naturally."
]
```

### impact.performance

**EXTRAIRE de**:
- Section "Protocole optimisation MPMD-validated"
- Impacts décrits dans le document

#### impact.performance.hypertrophy

**CONTENU**:
- Testostérone libre = déterminant principal hypertrophie
- Mécanisme: mTOR activation, synthèse protéique, cellules satellites
- Données: >150 pg/mL vs <100 pg/mL = +30-50% gains masse maigre
- Ratio cortisol/free testosterone: optimal <0.3

**Longueur**: 100-200 mots

#### impact.performance.strength

**CONTENU**:
- Mécanismes neural + musculaire
- >150 pg/mL = 1RM +12-18% vs <100 pg/mL
- Stagnation force si <120 pg/mL chez athlètes force

**Longueur**: 100-200 mots

#### impact.performance.recovery

**CONTENU**:
- >150 pg/mL: DOMS 24-48h, force baseline en 48-72h
- <100 pg/mL: DOMS 72-96h, overreaching fréquent
- Interaction SHBG

**Longueur**: 100-200 mots

#### impact.performance.bodyComp

**CONTENU**:
- Partition nutriments (muscle vs graisse)
- Lipolyse, sensibilité insuline
- Sweet spot body fat: 12-17%
- Cercle vicieux obésité

**Longueur**: 100-200 mots

### impact.health

**EXTRAIRE impacts santé** du document (energy, mood, cognition, immunity)

**Longueur chaque**: 100-150 mots

### impact.longTerm

**EXTRAIRE impacts long-terme** (cardiovascular, metabolic, lifespan)

**Longueur chaque**: 100-150 mots

### impact.studies

```typescript
[
  "Corona G et al. (2016). Body weight loss...",
  "Khera M et al. (2011). Association of low testosterone with metabolic syndrome.",
  "Muraleedharan V et al. (2013). Testosterone deficiency and mortality. Heart.",
  "Derek (MPMD). Free Testosterone - What Matters For Building Muscle.",
  "Masterjohn C. Testosterone and body composition."
]
```

### protocol.phase1_lifestyle

**EXTRAIRE de**:
- Section "Protocole optimisation MPMD-validated" → "Phase 1 - Lifestyle"

#### duration
```
"0-30 jours - FONDAMENTAL"
```

#### sleep
**CONTENU**:
- 7-9h minimum (production nocturne)
- Sleep deprivation = -15% testostérone
- Protocole Huberman si disponible dans sources

**Longueur**: 150-250 mots

#### nutrition
**CONTENU**:
- Éviter low-carb + high-protein combinés (-33% testo, Masterjohn)
- Si high-protein: 2g/jour TMG
- Favoriser fat over protein si carbs restreints
- Éviter déficit calorique chronique excessif
- **Protocole Sel: 2-10g/jour** (Masterjohn)
- 10 micronutriments essentiels (vit A, D, fer, B1, B2, B3, mag, zinc, sodium, chlorure)

**Citations**:
> "In boys, vitamin A and iron is just as effective at inducing puberty as androgen replacement therapy" (Masterjohn)
> "Low-carb, high-protein diets cut testosterone by 33%" (Masterjohn)

**Longueur**: 200-300 mots

#### training
**CONTENU**:
- 6h/semaine resistance training minimum
- Exercice = driver déficit calorique (pas restriction alimentaire excessive)
- Body fat target: 12-17%
- Éviter overtraining (catabolisme)

**Longueur**: 100-150 mots

#### stress
**CONTENU**:
- Cortisol chronique élevé = antagoniste testostérone
- Gestion stress (protocoles Huberman si disponibles)
- Signal "urgence externe" pour cerveau

**Longueur**: 100-150 mots

#### alcohol
**CONTENU**:
- Impact négatif sur testostérone
- Recommandation limitation

**Longueur**: 50-100 mots

#### expected_impact
**CONTENU**:
- Résultats attendus après 30j lifestyle optimal
- Estimation amélioration %

**Longueur**: 100-150 mots

### protocol.phase2_supplements

**EXTRAIRE de**:
- Section "Phase 3 - Suppléments" du document BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md

#### duration
```
"30-90 jours - Après optimisation lifestyle"
```

#### supplements

**CRÉER array avec 4-5 suppléments principaux**:

```typescript
[
  {
    name: "Tongkat Ali (Eurycoma longifolia)",
    dosage: "100-400 mg/jour (extrait standardisé)",
    timing: "Matin à jeun OU réparti 2×/jour",
    brand: "Nootropics Depot, Double Wood, Bulk Supplements",
    mechanism: `Adaptogène modulateur axe HPG. ↑ LH (luteinizing hormone) → ↑ production testostérone testiculaire. ↓ SHBG → ↑ testostérone libre. ↓ Cortisol (effet adaptogène). Citation Masterjohn: "100-400 milligrams per day of tongkat ali has the best evidence for an herb." Études randomisées: +37% testostérone totale, +61% testostérone libre chez hommes stressés chroniques.`,
    studies: [
      "Talbott SM et al. (2013). Effect of Tongkat Ali on stress hormones. J Int Soc Sports Nutr.",
      "Masterjohn C. Five Ways to Increase Testosterone Naturally."
    ]
  },
  {
    name: "Ashwagandha (KSM-66 ou Sensoril)",
    dosage: "200-250 mg/jour (extrait standardisé withanolides ≥5%)",
    timing: "Soir de préférence (effet GABAergique relaxant)",
    brand: "KSM-66 (marque brevetée), Jarrow Formulas, NOW Foods",
    mechanism: `Adaptogène régule axe HPA. ↓ Cortisol (antagoniste testostérone) → levée inhibition sur axe HPG. Modulateur GABA (anxiolytique, améliore sommeil → ↑ production nocturne testostérone). Études: ashwagandha 600mg × 8 semaines → testostérone +14.7%, cortisol -27.9%. Bonus: améliore force +30% et gains masse maigre.`,
    studies: [
      "Lopresti AL et al. (2019). Ashwagandha on stress and testosterone. J Int Soc Sports Nutr.",
      "Chandrasekhar K et al. (2012). Ashwagandha efficacy and safety. Indian J Psychol Med."
    ]
  },
  {
    name: "Vitamine D3 (Cholécalciférol)",
    dosage: "4000-6000 IU/jour (si <30 ng/mL 25-OH-D), puis 2000-3000 IU maintenance",
    timing: "Matin avec repas contenant graisses",
    brand: "NOW Foods, Thorne, Doctor's Best",
    mechanism: `Vitamine D = stéroïde hormone, précurseur synthèse testostérone. Masterjohn: "Vitamin D is required to incorporate iron into steroid-producing enzymes correctly." Carence (25-OH-D <20 ng/mL) = testostérone -20-30%. Récepteurs VDR dans testicules, cellules Leydig. Optimal 25-OH-D: 40-60 ng/mL pour testostérone maximale.`,
    studies: [
      "Pilz S et al. (2011). Effect of vitamin D supplementation on testosterone. Horm Metab Res.",
      "Masterjohn C. Vitamin D and testosterone synthesis."
    ]
  },
  {
    name: "Zinc (bisglycinate ou picolinate)",
    dosage: "25-50 mg/jour élément zinc",
    timing: "Soir avec repas (éviter estomac vide = nausées)",
    brand: "Thorne, Pure Encapsulations, NOW Foods",
    mechanism: `Cofacteur essentiel enzymes stéroïdogéniques. Carence zinc (fréquente athlètes, sueurs) = testostérone -30-40%. Zinc inhibe aromatase (enzyme convertit testostérone → estradiol). Bonus: ↑ qualité sperme, ↑ immunité. Attention: >50mg/jour chronique peut ↓ absorption cuivre (balancer avec 1-2mg cuivre).`,
    studies: [
      "Prasad AS et al. (1996). Zinc status and serum testosterone. Nutrition.",
      "Masterjohn C. Ten nutrients for testosterone synthesis."
    ]
  },
  {
    name: "Magnésium (bisglycinate)",
    dosage: "400-600 mg/jour élément magnésium",
    timing: "1h avant coucher (améliore sommeil → ↑ testostérone nocturne)",
    brand: "Doctor's Best, Thorne, Pure Encapsulations",
    mechanism: `Cofacteur >300 enzymes dont synthèse testostérone. Carence magnésium (50% population) = testostérone -15-20%. Antagoniste NMDA → ↓ excitabilité neuronale, ↑ sommeil profond → ↑ GH + testostérone nocturnes. Forme bisglycinate = absorption optimale, 0 effet laxatif.`,
    studies: [
      "Cinar V et al. (2011). Effects of magnesium supplementation on testosterone. Biol Trace Elem Res.",
      "Masterjohn C. Magnesium and testosterone."
    ]
  }
]
```

#### budget
```
"Coût mensuel total: 50-80€

- Tongkat Ali: ~30€/mois
- Ashwagandha: ~15€/mois
- Vitamine D3: ~5€/mois
- Zinc: ~8€/mois
- Magnésium: ~10€/mois

Recommandation budget limité: Tongkat Ali + Vitamine D + Magnésium (base 45€/mois)"
```

#### expected_impact
```
"Résultats Phase 1 (lifestyle) + Phase 2 (suppléments) combinés à J+90:

Si free testosterone baseline 80 pg/mL:
- Phase 1 seule (J+30): +15-25% (95-100 pg/mL) via lifestyle
- Phase 1+2 (J+90): +40-60% (110-130 pg/mL) via lifestyle + suppléments

Amélioration symptomatique:
- Libido: +50-80% (érections matinales retour)
- Gains masse maigre: +20-40% vs baseline
- Récupération: DOMS 72h → 24-48h
- Énergie: +60-90% (disparition fatigue matinale)
- Force: +8-15% 1RM

⚠️ Si amélioration <20% malgré Phase 1+2 stricte 90j → Investigation médicale (hypogonadisme primaire/secondaire, prolactinome, hémochromatose)"
```

### protocol.phase3_retest

#### duration
```
"90 jours+ - Évaluation complète"
```

#### when
```
"Timing retest: J+90 (12 semaines après début Phase 1)

Méthode GOLD STANDARD (Derek/MPMD):
- Free Testosterone: Equilibrium Ultrafiltration
- Total Testosterone: LC/MS-MS
- PAS ECLIA/EIA (imprécis, cross-réactivité)

Commander exactement:
'Testosterone, Free, Equilibrium Ultrafiltration With Total Testosterone, LC/MS-MS'

Conditions standardisées:
- Prélèvement 7-9h matin à jeun
- 48h post-entraînement intense
- Sommeil >7h nuit précédente
- 0 alcool 48h avant"
```

#### markers
```typescript
[
  "Free Testosterone (Equilibrium Ultrafiltration)",
  "Total Testosterone (LC/MS-MS)",
  "SHBG (comprendre ratio free/total)",
  "Estradiol (LC/MS-MS, équilibre E2/T)",
  "LH + FSH (différencier hypogonadisme primaire vs secondaire si free T toujours basse)",
  "Cortisol matin (si élevé, antagonise testostérone)",
  "25-OH Vitamin D (vérifier >40 ng/mL)",
  "Zinc sérique + cuivre (si supplémentation zinc)",
  "HOMA-IR (sensibilité insuline liée à testostérone)"
]
```

#### success_criteria
```
"Critères succès free testosterone optimal:

✅ Free Testosterone >150 pg/mL (Equilibrium Ultrafiltration)
✅ SHBG modéré (20-50 nmol/L, ni trop haut ni trop bas)
✅ Ratio Free T / Total T: 2-3% (si <2% = SHBG trop haute)
✅ Estradiol: 20-30 pg/mL (LC/MS-MS) - équilibre avec testostérone
✅ Cortisol matin: 10-18 μg/dL (pas >20 = antagoniste)

Symptômes résolus:
- Libido normalisée, érections matinales 4-5×/semaine
- Gains masse maigre +3-6kg sur 12 semaines
- Récupération: DOMS <48h, capable 4-5 séances lourdes/semaine
- Énergie matinale élevée, 0 crash après-midi
- Motivation/drive/confiance élevés"
```

#### next_steps
```
"Si free testosterone reste <100 pg/mL à J+90 malgré protocol strict:

INVESTIGATIONS MÉDICALES:

1. LH/FSH pour différencier:
   - Hypogonadisme primaire (testiculaire): LH/FSH élevées, testicules ne répondent pas
   - Hypogonadisme secondaire (hypophyse/hypothalamus): LH/FSH basses, signal manquant

2. Prolactine:
   - Si >20 ng/mL: Prolactinome possible (adénome hypophyse) → IRM hypophysaire
   - Prolactine élevée inhibe GnRH → ↓ LH → ↓ testostérone

3. Hémochromatose (surcharge fer):
   - Ferritine >300 ng/mL + saturation transferrine >45%
   - Fer toxique pour hypophyse/testicules
   - Traitement: saignées thérapeutiques

4. Syndrome Klinefelter (XXY):
   - Si LH/FSH très élevées + testicules petits (<15 mL)
   - Caryotype pour confirmer
   - TRT à vie requis

5. Consultation endocrinologue:
   - Si free testosterone <80 pg/mL confirmée sur 2 dosages
   - Discussion TRT (testosterone replacement therapy):
     - Injections (cypionate/enanthate 100-200mg/semaine)
     - Gels transdermiques (moins efficaces, fluctuations)
     - Patches (moins utilisés)

CAUSES POSSIBLES ÉCHEC PROTOCOL:

1. Non-compliance (le plus fréquent):
   - Vérifier sommeil réel (tracker Oura/Whoop): >7h30 vraiment?
   - Vérifier body fat: >20% = aromatase excessive
   - Vérifier déficit calorique caché: perte poids >0.5kg/semaine = signal famine

2. Stress chronique non géré:
   - Cortisol matin >20 μg/dL malgré protocol
   - Job stressant (>60h/semaine, manager toxique)
   - Relationnel (conflits couple/famille)
   → Changements environnementaux requis, pas juste suppléments

3. Apnée sommeil non diagnostiquée:
   - Symptômes: ronflement, fatigue malgré 8h sommeil
   - Polysomnographie pour diagnostic
   - CPAP normalise testostérone +20-30% en 3 mois

4. Surentraînement masqué:
   - Vérifier journal training: >16-20 séries/groupe/semaine?
   - >5 séances lourdes/semaine sans deload?
   → Deload 2 semaines, volume -50%"
```

### protocol.special_cases

#### non_responders
```
"'J'ai tout bien fait, free testosterone toujours basse'

Si free testosterone <100 pg/mL après 90j protocol strict + compliance vérifiée:

CHECKLIST EXHAUSTIVE:

1. ✅ Sommeil: Vraiment 7-8h? Tracker (Oura/Whoop) montrant >90% efficacité?
2. ✅ Body fat: 12-17%? Si <10% = leptine basse → GnRH ↓. Si >20% = aromatase ↑
3. ✅ Stress: Cortisol matin <18 μg/dL? Si >20 = antagoniste
4. ✅ Training: Volume réel? Si >20 séries/groupe/semaine = overtraining
5. ✅ Nutrition: Vraiment pas low-carb + high-protein? Carbs >150g/jour minimum
6. ✅ Suppléments: Tongkat Ali réellement pris? Qualité (extrait standardisé)?
7. ✅ Apnée sommeil: Exclu par polysomnographie?
8. ✅ Alcool: Vraiment 0 ou "juste weekends"? (même 2-3 verres/semaine impactent)

Si TOUTE checklist validée + free testosterone <80 pg/mL:
→ Investigation médicale (LH/FSH, prolactine, IRM hypophysaire, génétique)
→ Consultation TRT si hypogonadisme confirmé

PROFILS RARES:

1. Résistance androgénique partielle (PAIS):
   - Mutation récepteur androgénique
   - Free testosterone >150 pg/mL MAIS symptômes low T
   - Génétique requise, TRT inefficace

2. Polymorphismes génétiques défavorables:
   - SRD5A2 (5α-réductase faible): ↓ conversion testosterone → DHT
   - CYP19A1 (aromatase élevée): ↑ conversion testosterone → estradiol
   - Traitement: Inhibiteurs aromatase faible dose (anastrozole 0.25mg 2×/semaine) sous surveillance médicale

3. Hyperprolactinémie idiopathique:
   - Prolactine 20-40 ng/mL sans cause claire
   - Cabergoline 0.25-0.5mg 2×/semaine normalise
   - Free testosterone ↑ +40-80% après normalisation prolactine"
```

#### contraindications
```
"SUPPLÉMENTS - Contre-indications et précautions:

TONGKAT ALI:
- ⚠️ Précaution si diabète (peut ↓ glycémie, ajuster insuline)
- ⚠️ Précaution si immunosuppresseurs (stimule immunité)
- ❌ Éviter si grossesse/allaitement (données manquantes)

ASHWAGANDHA:
- ❌ Hyperthyroïdie (stimule T3/T4, peut aggraver)
- ❌ Grossesse (effets abortifs possibles doses élevées)
- ⚠️ Maladies auto-immunes actives (modulation immunitaire)
- ⚠️ Hashimoto: Monitorer TSH (peut sur-stimuler)

VITAMINE D >10,000 IU/JOUR:
- ❌ Hypercalcémie (calcium >10.5 mg/dL)
- ❌ Sarcoïdose, granulomatose (↑ conversion 25-OH-D → calcitriol actif)
- ⚠️ Monitorer calcium + 25-OH-D (viser 40-60 ng/mL, pas >80)

ZINC >50 MG/JOUR CHRONIQUE:
- ❌ Risque carence cuivre (balancer avec 1-2mg cuivre)
- ⚠️ Nausées si estomac vide (prendre avec repas)

MAGNÉSIUM >600 MG/JOUR:
- ❌ Insuffisance rénale sévère (GFR <30, risque hypermagnésémie)
- ⚠️ Diarrhée si forme citrate/oxyde (switcher bisglycinate)

LIFESTYLE MODIFICATIONS:

SEL 2-10G/JOUR:
- ❌ HTA non contrôlée (>140/90)
- ❌ Insuffisance cardiaque
- ❌ Insuffisance rénale
- ⚠️ Monitorer tension artérielle hebdomadaire pendant titration
- ⚠️ Arrêter si: maux de tête, œdème, ↑ TA >10 mmHg

DÉFICIT CALORIQUE AGRESSIF:
- ❌ Free testosterone déjà basse (<100 pg/mL): Priorité = normaliser hormones AVANT fat loss
- ❌ Déficit >500 kcal/jour chronique (signal famine → ↓ leptine → ↓ GnRH → ↓ testostérone)
- ✅ Maximum déficit safe: 300-400 kcal/jour, principalement via exercice pas restriction"
```

#### red_flags
```
"QUAND CONSULTER ENDOCRINOLOGUE IMMÉDIATEMENT:

🚩 Free testosterone <50 pg/mL (hypogonadisme sévère)
   - Risque: ostéoporose, sarcopénie, dépression sévère
   - Action: LH/FSH, prolactine, IRM hypophysaire
   - Traitement TRT probablement requis

🚩 Free testosterone basse + LH/FSH très élevées (>12 mIU/mL)
   - Hypogonadisme primaire (testicules ne répondent pas)
   - Causes: Klinefelter, orchite, trauma, chimiothérapie
   - Action: Échographie testiculaire, caryotype si Klinefelter suspecté

🚩 Free testosterone basse + LH/FSH très basses (<2 mIU/mL)
   - Hypogonadisme secondaire (hypophyse/hypothalamus défaillant)
   - Causes: adénome hypophysaire, Kallmann, hémochromatose
   - Action: IRM hypophysaire avec gadolinium, ferritine, prolactine

🚩 Prolactine >40 ng/mL
   - Prolactinome (adénome hypophyse sécrétant prolactine) probable
   - Symptômes: galactorrhée, gynécomastie, libido 0, vision trouble (si macroadénome)
   - Action: IRM hypophysaire URGENT, consultation neurochirurgie si macroadénome

🚩 Gynécomastie nouvelle/progressive
   - Prolifération tissu glandulaire mammaire (pas juste graisse)
   - Causes: ratio estradiol/testostérone déséquilibré, prolactinome, tumeur testiculaire
   - Action: Estradiol, prolactine, hCG (si tumeur testiculaire), échographie mammaire

🚩 Testicules très petits (<15 mL) + free testosterone basse
   - Klinefelter (XXY) probable
   - Caryotype confirmera
   - TRT à vie requis, infertilité (spermatogenèse nulle/faible)

🚩 Symptômes Cushing + free testosterone basse
   - Face "moonface", bosse dorsale, vergetures pourpres, HTA, diabète
   - Hypercortisolisme (Cushing) inhibe axe HPG
   - Action: Cortisol libre urinaire 24h, test freinage dexaméthasone, IRM

🚩 Free testosterone normale MAIS symptômes sévères persistants
   - Libido 0, érections 0, fatigue extrême, dépression sévère
   - Possibilités: résistance androgénique, hypothyroïdie sévère, dépression primaire
   - Action: Panel hormonal complet (thyroïde, cortisol, estradiol), consultation psychiatrie si hormones normales

🚩 Hématocrite >52% après optimisation testosterone
   - Risque: thrombose, AVC, infarctus
   - Polyglobulie (↑ production globules rouges excessive)
   - Action: Saignées thérapeutiques (don sang), ↓ dosage si TRT, hydratation ↑

RÈGLE GÉNÉRALE:
Si free testosterone <100 pg/mL sur 2 dosages + symptômes sévères → Endocrinologue AVANT 90j lifestyle trial (ne pas perdre temps si hypogonadisme organique sévère)."
```

---

## BIOMARQUEUR 2: SHBG

**Source**: `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` section "SHBG"

### Résumé extraction (instructions similaires testosterone_libre):

#### Champs clés à remplir:

**definition.intro**:
- Citation Dr. Kyle Gillett: "SHBG = protein that binds up all androgens"
- Derek: SHBG ↑ 1.6%/an = vole testostérone libre
- Pourquoi c'est critique pour musculation

**definition.mechanism**:
- Binding testosterone (60-70%)
- Facteurs ↑ SHBG (déficit calorique, low-carb+high-protein, vieillissement)
- Facteurs ↓ SHBG (DHT, body fat optimal 12-17%, insuline modérée)

**definition.ranges**:
- Optimal: 20-40 nmol/L (ni trop haut ni trop bas)
- Suboptimal: >50 nmol/L (↓ free T) OU <15 nmol/L (insulinorésistance fréquente)

**protocol.phase1_lifestyle.nutrition**:
- Éviter déficit calorique chronique
- Éviter low-carb + high-protein (-33% testo, Masterjohn)
- Body fat optimal 12-17%

**protocol.phase2_supplements**:
- Aucun supplément direct pour ↓ SHBG
- Focus: optimiser testostérone (Tongkat Ali, etc.) + éviter facteurs ↑ SHBG

---

## BIOMARQUEUR 3: CORTISOL

**Source**: `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` + sources Huberman stress/cortisol

### Points clés:

**definition.intro**:
- Cortisol = antagoniste #1 testostérone
- Catabolique (↓ mTOR, ↑ protéolyse musculaire)
- Stress chronique → cortisol élevé → free testosterone basse

**definition.ranges**:
- Optimal: Matin 10-18 μg/dL, Soir <3 μg/dL
- Suboptimal: Matin >20 μg/dL OU Soir >5 μg/dL
- Critical: Matin >25 μg/dL (Cushing possible) OU <5 μg/dL (Addison possible)

**protocol.phase1_lifestyle**:
- Sommeil: 7-9h (cortisol peak si privation)
- Stress management: méditation, respiration (Huberman physiological sigh)
- Training: éviter overtraining (cortisol spike chronique)

**protocol.phase2_supplements**:
- Ashwagandha: 600mg/jour → cortisol -27.9% (Lopresti 2019)
- Phosphatidylserine: 400mg/jour → ↓ cortisol post-exercise spike
- Rhodiola: 300-600mg/jour matin (adaptogène anti-fatigue)
- Magnésium: 400-600mg soir (↓ cortisol nocturne)

---

## BIOMARQUEUR 4: ESTRADIOL

**Source**: `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` section "ESTRADIOL"

### Points clés:

**definition.intro**:
- Estradiol = converti depuis testosterone par aromatase
- Essentiel pour: libido, santé osseuse, fonction cardiovasculaire
- Ni trop bas (douleurs articulaires, libido 0) ni trop haut (rétention eau, gyno)

**definition.ranges**:
- Optimal: 20-30 pg/mL (LC/MS-MS)
- Suboptimal: <15 pg/mL (libido/joints) OU >40 pg/mL (rétention/gyno)

**protocol.phase1_lifestyle**:
- Body fat optimal: >20% = aromatase ↑ → estradiol ↑
- Alcool: ↑ aromatase hépatique
- Légumes crucifères: DIM (diindolylmethane) module métabolisme estradiol

---

## BIOMARQUEUR 5: VITAMINE_D

**Source**: `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md` section "VITAMINE D"

### Points clés:

**definition.intro**:
- Vitamine D = stéroïde hormone, précurseur testostérone
- Masterjohn: "Required to incorporate iron into steroid-producing enzymes"
- Carence <20 ng/mL = testostérone -20-30%

**definition.ranges**:
- Optimal: 40-60 ng/mL (100-150 nmol/L)
- Normal: 30-40 ng/mL
- Suboptimal: 20-30 ng/mL
- Critical: <20 ng/mL

**protocol.phase1_lifestyle**:
- Exposition solaire: 15-30min peau nue (bras/jambes) 10-14h
- Latitude/saison: hiver/nord = supplémentation requise

**protocol.phase2_supplements**:
- Vitamine D3: 4000-6000 IU/jour si <30 ng/mL
- Maintenance: 2000-3000 IU/jour une fois >40 ng/mL
- Cofacteurs: K2-MK7 200mcg (synergie), magnésium

---

## VALIDATION FINALE

### 1. TypeScript Build
```bash
cd client
npx tsc --noEmit
```
Attendre 0 erreurs.

### 2. Vérifier 0 placeholders
```bash
grep -r "JE NE SAIS PAS" client/src/data/bloodBiomarkerDetailsExtended.ts
```
Doit retourner 0 résultats.

### 3. Test word counts
Créer script `test-biomarkers-validation.ts`:
```typescript
import { BIOMARKER_DETAILS_EXTENDED } from './client/src/data/bloodBiomarkerDetailsExtended';

const markers = ['testosterone_libre', 'shbg', 'cortisol', 'estradiol', 'vitamine_d'];

markers.forEach(key => {
  const obj = BIOMARKER_DETAILS_EXTENDED[key];
  console.log(`\n${key.toUpperCase()}:`);
  console.log(`  definition.intro: ${obj.definition.intro.split(' ').length} mots`);
  console.log(`  protocol.phase2_supplements: ${obj.protocol.phase2_supplements.supplements.length} suppléments`);
  console.log(`  impact.studies: ${obj.impact.studies.length} citations`);
});
```

Exécuter: `npx ts-node test-biomarkers-validation.ts`

---

## DEADLINE

Intégration complète 5 biomarqueurs TIER 1 avant BATCH 2 (thyroïde, métabolisme).

**Priorité**: CRITIQUE - Bloque Blood Dashboard refonte v2

**Questions?** DEMANDE clarification. N'invente RIEN. Toutes les infos sont dans `BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md`.

---

## RAPPEL ERREUR

❌ Testostérone TOTALE = vanity metric
✅ Testostérone LIBRE = ce qui construit le muscle

Sources validées: Derek/MPMD, Masterjohn PhD, Dr. Kyle Gillett (Huberman Lab), Examine.com
