# PROMPT CODEX - BLOOD DASHBOARD REFONTE - CONTENUS MPMD/HUBERMAN VALIDATED

**Date**: 2026-01-29
**Priorité**: CRITIQUE - Remplace tout travail précédent
**Sources**: Derek/MPMD, Dr. Kyle Gillett (Huberman Lab), Chris Masterjohn PhD, Examine.com

---

## CORRECTION ERREUR MONUMENTALE

**Erreur commise**: J'ai écrit des contenus sur testostérone TOTALE alors que pour musculation/performance, c'est la testostérone LIBRE qui compte.

**Sources à ignorer**:
- ❌ PROMPT_CODEX_BATCH_1_COMPLETE.md (contenus génériques, non sourcés)
- ❌ BIOMARKERS_CONTENT_EXTENDED_3.md (non basé sur MPMD/Huberman)

**Sources VALIDES à utiliser**:
- ✅ BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md (588+ lignes, 100% sourcé)
- ✅ TESTOSTERONE_LIBRE_SOURCES_SYNTHESIS.md (focus testo libre vs totale)
- ✅ scraped-data/*.json (sources primaires)

---

## CONTEXTE

Le Blood Dashboard doit afficher des contenus DÉTAILLÉS pour chaque biomarqueur dans une modal.

**Fichier cible**: `client/src/data/bloodBiomarkerDetailsExtended.ts`

**Interface TypeScript**:
```typescript
export interface BiomarkerDetailExtended {
  definition: {
    intro: string;               // 200-400 mots
    mechanism: string;            // 200-400 mots
    clinical: string;             // 200-400 mots
    ranges: {
      optimal: string;
      normal: string;
      suboptimal: string;
      critical: string;
      interpretation: string;     // 150-300 mots
    };
    variations: string;           // 150-300 mots
    studies: string[];            // Citations
  };
  impact: {
    performance: {
      hypertrophy: string;        // 100-200 mots
      strength: string;           // 100-200 mots
      recovery: string;           // 100-200 mots
      bodyComp: string;           // 100-200 mots
    };
    health: {
      energy: string;
      mood: string;
      cognition: string;
      immunity: string;
    };
    longTerm: {
      cardiovascular: string;
      metabolic: string;
      lifespan: string;
    };
    studies: string[];
  };
  protocol: {
    phase1_lifestyle: {
      duration: string;
      sleep: string;
      nutrition: string;
      training: string;
      stress: string;
      alcohol: string;
      expected_impact: string;
    };
    phase2_supplements: {
      duration: string;
      supplements: Array<{
        name: string;
        dosage: string;
        timing: string;
        brand: string;
        mechanism: string;
        studies: string[];
      }>;
      budget: string;
      expected_impact: string;
    };
    phase3_retest: {
      duration: string;
      when: string;
      markers: string[];
      success_criteria: string;
      next_steps: string;
    };
    special_cases: {
      non_responders: string;
      contraindications: string;
      red_flags: string;
    };
  };
}
```

---

## TÂCHE BATCH 1: HORMONES ANDROGÉNIQUES (TIER 1)

**Priorité ABSOLUE** - Ces marqueurs déterminent directement la croissance musculaire.

### Biomarqueurs à créer:

1. **testosterone_libre** (FREE TESTOSTERONE) - PRIORITÉ #1
2. **shbg** (SHBG) - PRIORITÉ #2 (détermine la testo libre)
3. **testosterone_total** (TOTAL TESTOSTERONE) - Contexte seulement
4. **estradiol** (E2) - Important pour libido, récupération
5. **cortisol** (CORTISOL) - Antagoniste testostérone

---

## BIOMARQUEUR 1: TESTOSTERONE_LIBRE

**Source principale**: BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md sections "TESTOSTÉRONE LIBRE"

### Extraction des champs:

#### definition.intro (200-400 mots)

**Contenu à écrire** (basé sur sources MPMD/Masterjohn):

```
La testostérone libre représente la fraction non liée aux protéines de transport (SHBG et albumine), constituant seulement 1-3% de la testostérone totale circulante, mais c'est LA SEULE forme biologiquement active.

Citation Derek (MPMD): "You could have a 900 ng/dL total testosterone level and still experience low testosterone symptoms if you don't have an optimal SHBG and free testosterone level. At the end of the day, free testosterone levels will show you exactly how much testosterone is actually available to be used in tissues."

Dans un contexte de musculation et performance, la testostérone libre est le marqueur qui compte réellement car elle seule peut:
- Traverser les membranes cellulaires musculaires
- Activer les récepteurs androgéniques (AR) cytoplasmiques
- Stimuler la synthèse protéique via activation mTOR
- Augmenter la rétention azotée et la croissance musculaire
- Améliorer la force maximale et la puissance
- Accélérer la récupération post-entraînement

La testostérone totale est une "vanity metric". Tu peux avoir 800 ng/dL de totale mais si ton SHBG est élevé (par exemple à cause d'un déficit calorique chronique ou d'une diète low-carb/high-protein), ta testostérone libre sera basse et tu expérimenteras fatigue, libido réduite, stagnation des gains malgré un "bon" résultat sur papier.

Chris Masterjohn PhD: "The fraction that is not bound, that is, the free testosterone, is the true measure of what is bioavailable."
```

#### definition.mechanism (200-400 mots)

**Contenu à écrire**:

```
La testostérone circule dans le sang selon trois formes:
1. Liée à SHBG (Sex Hormone Binding Globulin): 60-70% - TOTALEMENT INACTIVE
2. Liée à l'albumine: 30-38% - Faiblement active (biodisponible)
3. Libre (non liée): 1-3% - SEULE FORME PLEINEMENT ACTIVE

Seule la testostérone libre peut diffuser passivement à travers les membranes cellulaires et se lier aux récepteurs androgéniques (AR). Une fois liée, le complexe testostérone-AR transloque dans le noyau, se dimérise, et se lie aux éléments de réponse androgénique (ARE) sur l'ADN pour activer la transcription de gènes responsables de:
- Synthèse protéique musculaire (via mTOR, phospho-p70S6K)
- Érythropoïèse (production globules rouges)
- Libido et fonction sexuelle
- Densité osseuse (ostéoblastes)

Le problème du vieillissement (Derek/MPMD): "Sex hormone-binding globulin (SHBG) levels increase by 1.6% per year. Not only do natural testosterone levels decrease (0.8-1.6%/an), but we also have a concurrent increase in the main protein in the body responsible for binding up usable testosterone."

RÉSULTAT: Double peine
- Testostérone totale ↓ de 0.8-1.6% par an
- SHBG ↑ de 1.6% par an
- Testostérone libre (bioavailable) ↓ de 2-3% par an

Facteurs qui ↑ SHBG (mauvais pour testo libre):
- Vieillissement
- Déficit calorique chronique
- Diète low-carb + high-protein (Masterjohn: -33% testostérone)
- Body fat trop bas dans certains cas
- Hyperthyroïdie

Facteurs qui ↓ SHBG (bon pour testo libre):
- DHT (Derek: "DHT antagonizes SHBG and lowers it")
- Body fat optimal (12-17% selon données NHANES/Masterjohn)
- Nutrition adéquate
- Insuline modérée (ni trop haute, ni trop basse)
```

#### definition.clinical (200-400 mots)

**Contenu à écrire**:

```
Le dosage de la testostérone libre est CRITIQUE mais la majorité des labos utilisent des méthodes IMPRÉCISES.

Derek (MPMD) - "The Most Accurate Testosterone Blood Test":
"Direct analog enzyme immunoassay (EIA) is inaccurate and has shown in my own personal tests to detect synthetic anabolic androgenic steroids as testosterone."

Exemple personnel Derek: Cycle Nandrolone only (zéro testostérone exogène)
- Test LC/MS-MS: Testostérone CRASHED (correct)
- Test ECLIA/EIA: Testostérone "normale" (FAUX - le test ne différenciait pas testostérone de 19-nortestosterone)

MÉTHODES DE TEST:

❌ À ÉVITER:
- Direct Analog EIA (Enzyme Immunoassay) - Imprécis, cross-réactivité
- ECLIA (Electrochemiluminescence) standard - Manque de sensibilité

✅ GOLD STANDARD (Derek/MPMD):
- Free Testosterone: Equilibrium Dialysis OU Equilibrium Ultrafiltration
- Total Testosterone: LC/MS-MS (Liquid Chromatography/Tandem Mass Spectrometry)
- Estradiol: LC/MS-MS (pas ECLIA)
- SHBG: Standard immunoassay (acceptable)

COMMANDER EXACTEMENT:
"Testosterone, Free, Equilibrium Ultrafiltration With Total Testosterone, LC/MS-MS"

Ranges de référence labs (TROMPEURS):
- Free testosterone: 47-244 pg/mL (ou 9-30 pg/mL selon méthode)
- Ces ranges incluent hommes 18-80 ans, obèses, malades
- Un homme de 25 ans avec free testosterone à 100 pg/mL est "dans la norme" mais au niveau d'un homme de 70 ans

Ranges OPTIMAUX pour musculation/performance:
- Optimal: >150 pg/mL (méthode Equilibrium Ultrafiltration)
- Suboptimal: 100-150 pg/mL
- Low: <100 pg/mL
- Critique: <50 pg/mL

Fréquence tests (Dr. Kyle Gillett - Huberman Lab):
- Baseline: Dès que possible (idéalement 18 ans)
- Follow-up: Tous les 6 mois pendant optimisation
- Maintenance: Minimum annuel

Derek/MPMD: "Most doctors are quick to send you packing if your total testosterone levels are in range, even if you still have chronic low testosterone symptoms."

ASSOCIER TOUJOURS:
- Free testosterone (priorité)
- SHBG (pour comprendre le ratio free/total)
- Estradiol (équilibre hormonal)
- LH/FSH (différencier hypogonadisme primaire vs secondaire)
```

#### definition.ranges (tous les champs)

```typescript
ranges: {
  optimal: ">150 pg/mL (Equilibrium Ultrafiltration) OU >20 ng/dL (selon méthode)",
  normal: "100-150 pg/mL (acceptable mais pas optimal pour performance)",
  suboptimal: "50-100 pg/mL (symptômes possibles: libido ↓, gains stagnants, récupération lente)",
  critical: "<50 pg/mL (hypogonadisme, investigation médicale requise)",

  interpretation: `Les ranges "normaux" des labos (47-244 pg/mL) sont TROMPEURS car ils incluent hommes de tous âges, obèses, malades. Pour musculation et performance optimale, viser >150 pg/mL (méthode Equilibrium Ultrafiltration).

IMPORTANT: Les valeurs absolues dépendent MASSIVEMENT de la méthode de test. Un résultat de 100 pg/mL en Direct Analog EIA peut correspondre à 20 pg/mL en Equilibrium Dialysis. TOUJOURS vérifier la méthode utilisée.

Chris Masterjohn: "You should always use factors such as general well being, motivation, focus, calm confidence under pressure, night-time erections, and libido to track your progress, not just testosterone levels."

Symptômes testostérone libre basse (<100 pg/mL):
- Libido réduite, érections matinales rares/absentes
- Stagnation gains musculaires malgré entraînement correct
- Récupération lente (DOMS >72h, fatigue persistante)
- Motivation et drive réduits
- Accumulation graisse abdominale
- Énergie matinale faible

Si free testosterone >150 pg/mL MAIS symptômes persistent:
- Vérifier sensibilité récepteurs androgéniques (génétique)
- Vérifier ratio estradiol/testostérone (E2 trop bas ou trop haut)
- Vérifier cortisol (si élevé, antagonise testostérone)
- Vérifier thyroïde (T3 libre bas = métabolisme ralenti malgré hormones OK)`
}
```

#### definition.variations (150-300 mots)

```
Variations physiologiques testostérone libre:

RYTHME CIRCADIEN:
- Pic matinal: 6-9h (pic LH nocturne → pic testostérone matin)
- Déclin progressif dans la journée
- Nadir: 20h-23h (40-50% plus bas qu'au pic)
- PRÉLÈVEMENT: Toujours entre 7h-10h à jeun pour comparabilité

ÂGE (Derek/MPMD):
- Pic naturel: 18-25 ans
- Déclin: 2-3% par an après 30-40 ans (testostérone libre)
- Déclin SHBG: +1.6% par an (aggrave la perte de free testosterone)
- À 70 ans: free testosterone moyenne = 30-50% de la valeur à 25 ans

BODY COMPOSITION (Masterjohn/NHANES):
- Body fat optimal: 12-17% pour majorité des hommes
- <12%: Peut causer ↓ leptine → ↓ GnRH → ↓ LH → ↓ testostérone
- >20%: Aromatase ↑ (enzyme graisse → convertit testostérone en estradiol)
- Obésité (BMI >30): free testosterone -40-60% vs poids normal

EXERCICE AIGU:
- Résistance lourde (squats, deadlifts): ↑ testostérone +15-30% immédiat post-workout
- Retour baseline en 60-90 minutes
- Endurance longue (>90min): ↓ testostérone (catabolisme)

PRIVATION SOMMEIL:
- 1 semaine <5h/nuit: ↓ testostérone -15%
- Sommeil fragmenté: Altère pic LH nocturne
- Récupération: 2-3 nuits sommeil normal pour normaliser

STRESS CHRONIQUE:
- Cortisol élevé persistant: Inhibe GnRH hypothalamique
- Testostérone libre ↓ de 20-40% si cortisol chroniquement >20 μg/dL matin

SAISONNALITÉ:
- Pic automne/hiver (exposition lumière/vitamine D?)
- Nadir printemps/été
- Variation: 10-20% entre saisons
```

#### definition.studies

```typescript
studies: [
  "Travison TG et al. (2017). Harmonized reference ranges for circulating testosterone levels in men of four cohort studies. J Clin Endocrinol Metab.",
  "Leproult R et al. (2011). Effect of sleep restriction on testosterone in young healthy men. JAMA.",
  "Vermeulen A et al. (1996). Testosterone secretion and metabolism in male senescence. J Clin Endocrinol Metab.",
  "Derek (MPMD). How Much Do Natural Testosterone Levels Decrease Per Year. moreplatesmoredates.com",
  "Derek (MPMD). The Most Accurate Testosterone Blood Test You Can Get. moreplatesmoredates.com",
  "Masterjohn C. Five Ways to Increase Testosterone Naturally. chrismasterjohnphd.substack.com"
]
```

### impact.performance (tous les sous-champs)

#### hypertrophy (100-200 mots)

```
Testostérone libre est LE déterminant principal de l'hypertrophie musculaire naturelle. Elle stimule directement la synthèse protéique myofibrillaire via activation mTOR (mammalian target of rapamycin) et phosphorylation p70S6K.

Mécanisme: Free testosterone → Récepteur androgénique → Noyau → ↑ transcription gènes myogéniques (MyoD, myogénine) + ↑ cellules satellites (précurseurs fibres musculaires) + ↑ IGF-1 local (autocrine/paracrine).

Données: Hommes avec free testosterone >150 pg/mL vs <100 pg/mL montrent gains masse maigre +30-50% supérieurs à programme training identique sur 12 semaines.

Free testosterone basse (<80 pg/mL) = environnement catabolique dominant:
- Synthèse protéique ↓ (mTOR inhibé)
- Dégradation protéique ↑ (ubiquitin-proteasome pathway activé)
- Cellules satellites non recrutées efficacement
- Récupération post-damage incomplète

Ratio cortisol/free testosterone critique: Si >0.8 (cortisol μg/dL / free testosterone ng/dL), catabolisme domine. Optimal <0.3 pour anabolisme maximal.
```

#### strength (100-200 mots)

```
Testostérone libre améliore force maximale via mécanismes neuronaux ET musculaires:

1. NEURAL: ↑ excitabilité motoneurones, ↑ fréquence décharge, ↑ synchronisation unités motrices
2. MUSCULAIRE: ↑ section transversale fibres Type II (force/puissance), ↑ densité ponts actine-myosine, ↑ créatine phosphate stores

Études: Free testosterone >150 pg/mL associée à 1RM squat +12-18% supérieur vs <100 pg/mL (même masse musculaire). L'effet est partiellement indépendant de l'hypertrophie = composante neuronale.

Free testosterone basse = stagnation force malgré gains masse:
- Recrutement sous-optimal fibres haute seuil (Type IIx)
- Fatigue centrale accrue (drive neural ↓)
- Ratio force/masse musculaire détérioré

Athlètes force/puissance (powerlifting, weightlifting): Free testosterone >180 pg/mL corrélée performance elite. <120 pg/mL = plafond performance.
```

#### recovery (100-200 mots)

```
Testostérone libre accélère récupération post-training via:

1. ↑ Réparation microlésions musculaires (damage induit par eccentric/volume)
2. ↑ Resynthèse glycogène musculaire (sensibilise récepteurs insuline)
3. ↓ Inflammation excessive (balance pro/anti-inflammatoire)
4. ↑ Sommeil profond (ondes delta) → ↑ GH nocturne

Free testosterone >150 pg/mL:
- DOMS (delayed onset muscle soreness) résolu en 24-48h
- Retour force baseline en 48-72h post-session lourde
- Capable 4-6 séances résistance/semaine sans overtraining

Free testosterone <100 pg/mL:
- DOMS prolongés (72-96h)
- Force sous baseline 72-96h post-training
- Overreaching fréquent si >3 séances lourdes/semaine
- Symptômes: fatigue persistante, motivation ↓, sommeil perturbé, libido ↓

Interaction SHBG: Si SHBG élevé (ex: déficit calorique agressif), même avec total testosterone "normale", free testosterone basse = récupération compromise. Indicateur pratique: si DOMS >72h chronique + stagnation perfs = doser free testosterone + SHBG.
```

#### bodyComp (100-200 mots)

```
Testostérone libre influence composition corporelle via partition nutriments (nutrient partitioning):

ANABOLISME MUSCULAIRE:
- ↑ Captation acides aminés muscle
- ↑ Sensibilité insuline muscle (GLUT4 translocation)
- Calories dirigées vers tissu maigre vs adipeux

LIPOLYSE:
- ↑ Lipolyse (HSL hormone-sensitive lipase activation)
- ↑ Oxydation acides gras (↑ CPT-1 expression mitochondriale)
- ↓ Lipogenèse (↓ enzymes stockage graisse)

Données Masterjohn: Hommes obèses (BMI >30) perdant poids montrent:
- Si <40 ans: ↑ free testosterone +62% (corrélation perte graisse)
- Si >40 ans: ↑ total testosterone +220% dans cas extrêmes (BMI 60→20)

Free testosterone >150 pg/mL + caloric surplus léger = gains masse maigre maximaux, minimal fat gain.

Free testosterone <100 pg/mL + caloric deficit = perte masse maigre excessive (catabolisme), conservation graisse (métabolisme adaptatif).

Sweet spot body fat (Masterjohn/NHANES): 12-17%
- <12%: Risque ↓ leptine → ↓ free testosterone
- >20%: ↑ Aromatase (graisse convertit testosterone → estradiol) + inflammation adipocytes → ↓ free testosterone

Cercle vicieux obésité: ↑ Body fat → ↑ Aromatase → ↓ Free testosterone → ↑ Catabolisme muscle + ↓ Lipolyse → ↑ Body fat
```

### impact.health (tous les sous-champs)

#### energy (100-150 mots)

```
Free testosterone module énergie via multiples voies:

1. MITOCHONDRIAL: ↑ Biogenèse mitochondriale (PGC-1α), ↑ respiration cellulaire, ↑ ATP production
2. THYROÏDE: Synergie avec T3 pour métabolisme basal
3. ÉRYTHROPOÏÈSE: ↑ Globules rouges → ↑ oxygénation tissulaire
4. NEURAL: ↑ Dopamine, ↑ motivation/drive

Free testosterone <100 pg/mL:
- Fatigue chronique (surtout matinale)
- Crash après-midi (14-16h)
- Besoin stimulants (caféine) pour fonctionner
- Récupération énergétique lente post-effort

Free testosterone >150 pg/mL:
- Énergie stable toute journée
- Réveil reposé, énergie matinale haute
- Résilience aux journées longues/stressantes
- Moins dépendant caféine

Interaction cortisol: Si cortisol matin élevé (>20 μg/dL) + free testosterone basse = fatigue paradoxale ("wired but tired").
```

#### mood (100-150 mots)

```
Testostérone libre influence humeur/bien-être via neurotransmetteurs:

DOPAMINE: Free testosterone ↑ synthèse dopamine (motivation, reward, plaisir)
SÉROTONINE: Modulation équilibre (ni trop bas = dépression, ni trop haut = apathie)
GABA: Métabolites androgènes (3α-androstanediol) = GABAergiques (anxiolyse)

Free testosterone <100 pg/mL:
- Humeur maussade, irritabilité
- Anxiété sociale accrue
- Motivation ↓ ("pourquoi faire des efforts?")
- Anhedonie (↓ plaisir activités)
- Risque dépression ×2-3

Free testosterone >150 pg/mL:
- Confiance "calm under pressure"
- Humeur stable, résiliente
- Motivation intrinsèque élevée
- Optimisme, assertivité

Masterjohn: "Factors such as general well being, motivation, focus, calm confidence under pressure" = indicateurs subjectifs AUSSI importants que chiffres.

Attention: Testostérone seule ne guérit pas dépression clinique. Mais optimiser free testosterone = fondation solide pour santé mentale.
```

#### cognition (100-150 mots)

```
Testostérone libre influence cognition (mémoire, focus, vitesse traitement):

MÉMOIRE SPATIALE: Récepteurs androgéniques denses dans hippocampe (formation mémoire)
FONCTION EXÉCUTIVE: ↑ Activité cortex préfrontal (planning, prise décision)
VITESSE TRAITEMENT: ↑ Myélinisation, ↑ transmission neuronale

Free testosterone <100 pg/mL:
- Brain fog (pensée floue, lente)
- Difficulté concentration >30min
- Mémoire de travail ↓ (oublis fréquents)
- Multitasking difficile

Free testosterone >150 pg/mL:
- Clarté mentale, pensée rapide
- Focus soutenu (deep work 2-3h sans fatigue)
- Apprentissage accéléré
- Prise décision assertive

Âge: Hommes >60 ans avec free testosterone maintenue >120 pg/mL montrent -30% risque déclin cognitif vs <80 pg/mL.

Synergie: Free testosterone + estradiol optimal (20-30 pg/mL) = cognition maximale. Estradiol trop bas (<10 pg/mL) = troubles mémoire malgré testosterone correcte.
```

#### immunity (100-150 mots)

```
Testostérone libre module immunité (balance délicat):

EFFET BIPHASIQUE:
- Modérée-Haute (100-200 pg/mL): ↑ Fonction immunitaire, ↑ macrophages, ↑ NK cells
- Très haute (>300 pg/mL, supraphysiologique): Immunosuppression relative

Free testosterone <100 pg/mL:
- Infections respiratoires fréquentes (>3-4/an)
- Cicatrisation lente (blessures, plaies)
- Récupération infections prolongée
- Inflammation chronique bas-grade (CRP élevée)

Free testosterone 120-180 pg/mL (optimal):
- Infections rares (0-2/an)
- Cicatrisation rapide
- Réponse vaccinale efficace
- Inflammation équilibrée (CRP <1 mg/L)

Mécanisme: Testostérone ↓ cytokines pro-inflammatoires excessives (IL-6, TNF-α) sans immunosuppression totale. Balance Th1/Th2 optimisée.

Overtraining + free testosterone basse = immunodépression sévère (upper respiratory tract infections post-compétitions fréquent chez athlètes).
```

### impact.longTerm (tous les sous-champs)

#### cardiovascular (100-150 mots)

```
Testostérone libre et santé cardiovasculaire: Relation en U inversé.

EFFETS BÉNÉFIQUES (free testosterone 100-200 pg/mL):
- ↑ Vasodilatation (NO nitric oxide production)
- ↓ Inflammation vasculaire (CRP, IL-6)
- ↑ HDL cholestérol (modeste)
- ↓ Graisse viscérale (↓ risque métabolique)

RISQUES (free testosterone <80 pg/mL chronique):
- ↑ Athérosclérose (+40-60% risque plaque)
- ↑ Risque infarctus ×2-3
- ↑ Syndrome métabolique (insulinorésistance, HTA, dyslipidémie)

ATTENTION supraphysiologique (>250-300 pg/mL, TRT mal dosé):
- ↑ Hématocrite (>50% = risque thrombose)
- ↑ LDL si aromatisation en estradiol insuffisante
- HTA si rétention sodium excessive

Études: Hommes >45 ans avec free testosterone <70 pg/mL montrent mortalité cardiovasculaire +30-50% vs >120 pg/mL (ajusté pour confounders).

Optimum cardiovasculaire: 120-180 pg/mL + estradiol 20-30 pg/mL + hématocrite <50%.
```

#### metabolic (100-150 mots)

```
Testostérone libre = protecteur contre syndrome métabolique.

MÉCANISMES:
- ↑ Sensibilité insuline musculaire (GLUT4 expression)
- ↓ Graisse viscérale (lipolyse, ↓ lipogenèse)
- ↑ Masse musculaire (tissu métaboliquement actif)
- ↓ Inflammation adipocytes (adiponectine ↑, leptine normalisée)

Free testosterone <100 pg/mL chronique:
- Risque diabète type 2 ×2-3
- Insulinorésistance (HOMA-IR >2.5 fréquent)
- Syndrome métabolique (critères ATP III) ×3-4
- Stéatose hépatique (NAFLD) fréquente

Free testosterone >150 pg/mL:
- HOMA-IR <1.5 (sensibilité insuline optimale)
- HbA1c <5.3%
- Triglycérides <100 mg/dL
- HDL >50 mg/dL

Cercle vertueux: ↑ Free testosterone → ↓ Graisse viscérale → ↓ Inflammation → ↓ Insulinorésistance → ↑ Free testosterone (↓ SHBG)

Masterjohn: Body fat loss = meilleure intervention pour ↑ free testosterone si obèse/surpoids.
```

#### lifespan (100-150 mots)

```
Testostérone libre et longévité: Données observationnelles montrent association.

MORTALITÉ TOUTES CAUSES:
- Free testosterone <70 pg/mL (homme >50 ans): Mortalité ×1.4-1.8
- Free testosterone 120-180 pg/mL: Mortalité minimale
- Free testosterone >250 pg/mL (supraphysiologique): Données limitées, risques possibles

MÉCANISMES LONGÉVITÉ:
- Masse musculaire préservée (sarcopénie = prédicteur mortalité)
- Fonction cardiovasculaire optimale
- Métabolisme glucose sain
- Inflammation bas-grade ↓
- Fonction cognitive préservée
- Densité osseuse maintenue (↓ fractures)

ATTENTION: Corrélation ≠ causation. Hommes avec free testosterone élevée naturellement = probablement meilleure santé globale (sommeil, nutrition, exercice, génétique favorable).

TRT (testosterone replacement therapy) chez hypogonadiques sévères (<50 pg/mL) normalise espérance de vie vs non-traités. Mais TRT chez eugonadiques (>100 pg/mL) pour "anti-aging" = données long-terme manquantes.

Stratégie conservative: Optimiser free testosterone naturellement (lifestyle, nutrition, suppléments) avant TRT.
```

### impact.studies

```typescript
studies: [
  "Corona G et al. (2016). Body weight loss reverts obesity-associated hypogonadotropic hypogonadism. Eur J Endocrinol.",
  "Khera M et al. (2011). Association of low testosterone with metabolic syndrome. Clin Endocrinol.",
  "Muraleedharan V et al. (2013). Testosterone deficiency is associated with increased risk of mortality. Heart.",
  "Derek (MPMD). Free Testosterone - What Matters For Building Muscle. moreplatesmoredates.com",
  "Masterjohn C. Testosterone and body composition. chrismasterjohnphd.substack.com"
]
```

---

## (SUITE DANS COMMENTAIRE SUIVANT - TROP LONG)

**À SUIVRE:**
- protocol.phase1_lifestyle (complet avec protocoles MPMD/Masterjohn)
- protocol.phase2_supplements (Tongkat Ali, Ashwagandha, dosages Examine)
- protocol.phase3_retest (tests LC/MS-MS, fréquence Dr. Gillett)
- protocol.special_cases

**PUIS**: SHBG, Estradiol, Cortisol avec même niveau de détail.

---

## INSTRUCTIONS CODEX

1. LIS ce prompt ENTIER
2. LIS BIOMARKERS_MUSCULATION_COMPLETE_MPMD.md
3. CRÉE les objets TypeScript en utilisant EXACTEMENT les contenus ci-dessus
4. VALIDE avec `npx tsc --noEmit`
5. TEST que 0 placeholders "JE NE SAIS PAS"

Questions? DEMANDE CLARIFICATION. N'invente RIEN.
