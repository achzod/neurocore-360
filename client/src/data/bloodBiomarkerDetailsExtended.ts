import { BIOMARKER_DETAILS, type BiomarkerDetail } from "@/data/bloodBiomarkerDetails";
import type { BiomarkerDetailExtended } from "@/types/blood";

const PLACEHOLDER = "Information indisponible.";

const buildExtendedFallback = (detail?: BiomarkerDetail): BiomarkerDetailExtended => ({
  definition: {
    intro: detail?.definition ?? PLACEHOLDER,
    mechanism: detail?.mechanism ?? PLACEHOLDER,
    clinical: detail?.impact ?? PLACEHOLDER,
    ranges: {
      optimal: PLACEHOLDER,
      normal: PLACEHOLDER,
      suboptimal: PLACEHOLDER,
      critical: PLACEHOLDER,
      interpretation: PLACEHOLDER,
    },
    variations: PLACEHOLDER,
    studies: detail?.citations?.map((item) => item.title) ?? [],
  },
  impact: {
    performance: {
      hypertrophy: PLACEHOLDER,
      strength: PLACEHOLDER,
      recovery: PLACEHOLDER,
      bodyComp: PLACEHOLDER,
    },
    health: {
      energy: detail?.impact ?? PLACEHOLDER,
      mood: PLACEHOLDER,
      cognition: PLACEHOLDER,
      immunity: PLACEHOLDER,
    },
    longTerm: {
      cardiovascular: PLACEHOLDER,
      metabolic: PLACEHOLDER,
      lifespan: PLACEHOLDER,
    },
    studies: detail?.citations?.map((item) => item.title) ?? [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: "A definir",
      sleep: PLACEHOLDER,
      nutrition: PLACEHOLDER,
      training: PLACEHOLDER,
      stress: PLACEHOLDER,
      alcohol: PLACEHOLDER,
      expected_impact: detail?.protocol?.join("\n") ?? PLACEHOLDER,
    },
    phase2_supplements: {
      duration: "A definir",
      supplements: [],
      budget: PLACEHOLDER,
      expected_impact: PLACEHOLDER,
    },
    phase3_retest: {
      duration: "A definir",
      when: PLACEHOLDER,
      markers: PLACEHOLDER,
      success_criteria: PLACEHOLDER,
      next_steps: PLACEHOLDER,
    },
    special_cases: {
      non_responders: PLACEHOLDER,
      contraindications: PLACEHOLDER,
      red_flags: PLACEHOLDER,
    },
  },
});

export const TESTOSTERONE_TOTAL_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `⚠️ NOTE: Pour musculation/performance, consultez TESTOSTERONE_LIBRE. La testostérone totale est un marqueur de contexte mais c'est la LIBRE qui compte (Derek/MPMD).

La testostérone totale mesure l'ensemble de la testostérone circulante dans le sang, incluant la fraction liée aux protéines de transport (SHBG et albumine, ~97-98%) et la fraction libre biologiquement active (~2-3%).

C'est l'hormone anabolique principale chez l'homme, produite à 95% par les cellules de Leydig des testicules sous l'impulsion de la LH (hormone lutéinisante) hypophysaire, elle-même régulée par la GnRH hypothalamique (axe HPG). Les 5% restants proviennent des glandes surrénales via la conversion de précurseurs comme la DHEA.

Chez la femme, la testostérone est produite à 25% par les ovaires, 25% par les surrénales, et 50% par conversion périphérique d'androgènes précurseurs. Les niveaux sont 10-20x plus faibles que chez l'homme mais jouent un rôle crucial dans la libido, la masse musculaire et la densité osseuse.

La testostérone circule principalement liée à la SHBG (60-70%), à l'albumine (30-38%), et sous forme libre (2-3%). Seules les fractions libre et liée à l'albumine (dite "biodisponible") sont capables d'interagir avec les récepteurs androgéniques (AR) des tissus cibles.`,

    mechanism: `La synthèse de testostérone suit la voie stéroïdogénique classique: cholestérol -> prégnénolone -> 17-hydroxypregnénolone -> DHEA -> androstènedione -> testostérone. Cette cascade enzymatique implique CYP11A1, 3β-HSD, CYP17A1 et 17β-HSD.

La LH hypophysaire stimule les cellules de Leydig via le récepteur LH/CGR couplé aux protéines G, déclenchant la cascade AMPc -> PKA -> StAR (Steroidogenic Acute Regulatory protein) qui permet l'import de cholestérol dans les mitochondries, étape limitante de la stéroïdogenèse.

Une fois sécrétée, la testostérone exerce ses effets via liaison au récepteur androgénique (AR), récepteur nucléaire qui, une fois activé, se dimérise et transloque dans le noyau pour réguler la transcription de gènes cibles (croissance musculaire, libido, érythropoïèse, etc.).

Dans certains tissus (prostate, peau, follicules pileux), la testostérone est convertie en DHT (dihydrotestostérone) par la 5α-réductase, forme 2-3x plus puissante sur les AR. Inversement, l'enzyme aromatase peut la convertir en estradiol, notamment dans le tissu adipeux, expliquant pourquoi l'obésité s'associe à une testostérone basse et un estradiol élevé chez l'homme.`,

    clinical: `En clinique, la testostérone totale est le marqueur de première ligne pour évaluer l'hypogonadisme masculin. Valeurs de référence laboratoire classiques: 300-1000 ng/dL (10.4-34.7 nmol/L), mais ces ranges très larges masquent d'importantes variations selon l'âge.

Un homme de 25 ans avec 400 ng/dL est techniquement "dans la norme" mais se situe au niveau moyen d'un homme de 80 ans. Les guidelines endocrinologiques actuelles (Endocrine Society 2018) définissent l'hypogonadisme à <300 ng/dL + symptômes, mais de nombreux experts recommandent une cible >500-600 ng/dL pour perfs optimales chez l'homme jeune actif.

Causes principales de testostérone basse:
- **Hypogonadisme primaire** (testiculaire): Syndrome de Klinefelter, orchite, trauma, chimiothérapie
- **Hypogonadisme secondaire** (hypophysaire/hypothalamique): Adénome hypophysaire, hyperprolactinémie, syndrome de Kallmann
- **Hypogonadisme fonctionnel** (le plus fréquent chez l'athlète): Privation sommeil, stress chronique, déficit calorique, surentraînement, obésité

Le diagnostic nécessite 2 dosages matinaux à jeun (testostérone suit rythme circadien avec pic matinal). Associer dosage LH/FSH pour distinguer hypogonadisme primaire (LH/FSH élevées) vs secondaire (LH/FSH basses/normales).`,

    ranges: {
      optimal: "600-900 ng/dL (20.8-31.2 nmol/L)",
      normal: "400-599 ng/dL (13.9-20.7 nmol/L)",
      suboptimal: "300-399 ng/dL (10.4-13.8 nmol/L)",
      critical: "<300 ng/dL (<10.4 nmol/L)",
      interpretation: `**Optimal (600-900)**: Zone performante pour hypertrophie, force, libido, énergie. Permet anabolisme maximal sans risques associés à niveaux supraphysiologiques.

**Normal (400-599)**: Suffisant pour santé générale mais sous-optimal pour perfs. Hypertrophie ralentie, récupération limitée, libido moyenne.

**Suboptimal (300-399)**: Hypogonadisme borderline. Symptômes légers: fatigue, baisse libido, difficulté prendre muscle, accumulation graisse abdominale.

**Critical (<300)**: Hypogonadisme clinique. Symptômes francs: fatigue chronique, dépression, perte musculaire, dysfonction érectile, risque ostéoporose. Investigation endocrinienne urgente requise.`,
    },

    variations: `La testostérone décline physiologiquement avec l'âge: -1-2%/an après 30 ans. Niveaux moyens par décennie (hommes):
- 20-29 ans: 600-700 ng/dL
- 30-39 ans: 550-650 ng/dL
- 40-49 ans: 500-600 ng/dL
- 50-59 ans: 450-550 ng/dL
- 60-69 ans: 400-500 ng/dL
- 70+ ans: 300-450 ng/dL

Variation circadienne: pic matinal (6-8h) puis déclin -30% en soirée. Importance de doser le matin.

Impact BMI: obésité s'associe à testostérone basse via aromatisation accrue (graisse viscérale = activité aromatase élevée). Perte 10kg peut augmenter testostérone +100-150 ng/dL.

Facteurs lifestyle: manque sommeil (-15% si <5h/nuit), alcool régulier (-20%), stress chronique (cortisol augmente inhibe LH), déficit calorique >20% (-25-30%).`,

    studies: [
      "Travison TG et al. (2017). Harmonized reference ranges for circulating testosterone levels in men of four cohort studies. J Clin Endocrinol Metab. 102(4):1161-1173.",
      "Bassil N et al. (2009). The benefits and risks of testosterone replacement therapy. Ther Clin Risk Manag. 5:427-448.",
      "Corona G et al. (2016). Body weight loss reverts obesity-associated hypogonadotropic hypogonadism: a systematic review and meta-analysis. Eur J Endocrinol. 174(5):R191-R206.",
    ],
  },

  impact: {
    performance: {
      hypertrophy: `La testostérone est l'hormone anabolique #1 pour l'hypertrophie musculaire. Elle agit via 3 mécanismes: (1) activation satellite cells -> prolifération myonuclei, (2) stimulation synthèse protéique via mTOR pathway, (3) inhibition myostatine (régulateur négatif croissance).

Études montrent corrélation forte entre testostérone et gains masse maigre: différence +40-50% hypertrophie entre sujets testostérone haute (>700 ng/dL) vs basse (<400 ng/dL) à entraînement égal (Bhasin et al. 2001).

Testostérone basse -> difficulté progresser en volume musculaire malgré entraînement optimal. Sujets hypogonadiques (<300 ng/dL) gagnent 60% moins de masse maigre que contrôles sur 12 semaines programme résistance (Sinha-Hikim et al. 2002).`,

      strength: `Impact direct sur force maximale via augmentation taille fibres Type II (fast-twitch), densité récepteurs androgéniques dans muscle, et optimisation recrutement neural.

Corrélation testostérone et 1RM squat/bench press: +10% testostérone = +3-5% force maximale (Schroeder et al. 2013). Sujets testostérone >650 ng/dL montrent +15-20% force vs sujets <400 ng/dL à masse musculaire équivalente.

Testostérone basse -> stagnation charges, difficulté battre PRs, perte force relative malgré maintien masse. Red flag si régression force sans explication évidente (fatigue, blessure, désentraînement).`,

      recovery: `Testostérone accélère récupération post-training via: (1) stimulation synthèse protéique post-effort, (2) action anti-catabolique (contre cortisol), (3) amélioration sommeil profond (pic GH), (4) réduction inflammation (modulation cytokines).

Études: sujets testostérone haute récupèrent 30-40% plus vite (retour force baseline à 24h vs 48-72h). Testostérone basse -> DOMS prolongés, fatigue persistante, besoin 3-4 jours entre sessions lourdes.

Impact pratique: testostérone >600 ng/dL permet 4-5 séances/semaine haute intensité. <400 ng/dL limite à 2-3 séances/semaine, sinon surentraînement.`,

      bodyComp: `Testostérone favorise partition nutriments vers muscle plutôt que graisse. Stimule lipolyse (dégradation graisse) via régulation HSL (hormone-sensitive lipase) et inhibe lipogenèse (stockage graisse) via downregulation LPL (lipoprotein lipase) dans adipocytes.

Hommes hypogonadiques: +20-30% masse grasse, surtout viscérale (androïde pattern). Réduction testostérone -100 ng/dL s'associe à gain +1-2kg graisse abdominale/an (Traish et al. 2009).

Traitement testostérone (TRT) chez hypogonadiques: -3-5kg graisse + +2-4kg muscle sur 6-12 mois, sans changement diète/training (Corona et al. 2013). Effet puissant sur recomp.`,
    },

    health: {
      energy: `Testostérone régule production énergie via multiple voies: mitochondriogenèse (biogenèse nouveaux mitochondries), expression GLUT4 (transport glucose muscle), sensibilité insuline, métabolisme thyroïdien.

Hypogonadisme = symptôme #1: fatigue chronique, surtout après-midi (crash 14-16h). 80-90% sujets testostérone <300 ng/dL rapportent fatigue persistante vs 20-30% sujets >600 ng/dL.

Traitement testostérone améliore énergie subjective de 40-60% sur échelles validées (Bhasin et al. 2018). Patients décrivent "regain de vie", motivation accrue, disparition besoin sieste.`,

      mood: `Testostérone agit comme neuromodulateur via récepteurs androgéniques dans amygdale, hippocampe, cortex préfrontal. Régule dopamine, sérotonine, GABA. Déficit testostérone s'associe à risque dépression x2-3.

Études: hommes testostérone <300 ng/dL ont scores dépression 2x plus élevés vs >600 ng/dL (Shores et al. 2004). Traitement testostérone réduit symptômes dépressifs de 30-50% chez hypogonadiques (Pope et al. 2003).

Impact pratique: testostérone basse -> irritabilité, anhédonie, perte confiance, anxiété sociale, découragement training. "Brain fog" et difficulté concentration.`,

      cognition: `Testostérone influence cognition via modulation plasticité synaptique hippocampale, neurogenèse, protection neuronale contre stress oxydatif. Récepteurs AR denses dans hippocampe (mémoire) et cortex préfrontal (fonctions exécutives).

Études: hommes testostérone haute (>600 ng/dL) montrent +10-15% performances tests mémoire spatiale, vitesse traitement information, attention soutenue vs testostérone basse (Cherrier et al. 2005).

Déclin testostérone avec âge contribue au déclin cognitif. Traitement testostérone chez hommes âgés hypogonadiques améliore mémoire verbale et spatiale (Muller et al. 2005).`,

      immunity: `Testostérone module fonction immunitaire: stimule production lymphocytes T, régule balance Th1/Th2, influence production cytokines. Hypogonadisme s'associe à immunodépression.

Paradoxe: testostérone haute = meilleure immunité contre infections mais risque auto-immunité réduit (hommes ont 4-10x moins maladies auto-immunes que femmes). Testostérone basse -> infections respiratoires plus fréquentes, cicatrisation ralentie.

Pratiquement: athlètes testostérone basse rapportent +30-40% rhumes/grippe vs testostérone optimale. Testostérone >600 ng/dL = résilience immunitaire accrue.`,
    },

    longTerm: {
      cardiovascular: `Relation testostérone-santé cardiovasculaire complexe et dose-dépendante. Testostérone physiologique (300-900 ng/dL) = cardioprotecteur. Hypogonadisme (<300) = risque CV x1.5-2.

Mécanismes protecteurs: vasodilatation (NO synthase), profil lipidique favorable (baisse LDL, hausse HDL), sensibilité insuline, réduction inflammation, composition corporelle (baisse graisse viscérale).

Meta-analyse 2019 (Corona et al.): traitement testostérone chez hypogonadiques réduit mortalité cardiovasculaire -33%, infarctus -24%, AVC -20%. Testostérone basse non traitée = facteur risque CV majeur.

Attention: doses supraphysiologiques (>1000 ng/dL, TRT agressif ou stéroïdes) peuvent augmenter risques via polycythémie, HTA, LVH. Cible thérapeutique: 500-800 ng/dL.`,

      metabolic: `Testostérone = régulateur métabolique central. Déficit -> syndrome métabolique: résistance insuline, dyslipidémie, HTA, obésité abdominale, inflammation chronique.

Études prospectives: chaque baisse -100 ng/dL testostérone = +14% risque diabète T2 (Grossmann et al. 2008). Hypogonadisme (<300) -> risque syndrome métabolique x4 vs testostérone normale.

Cercle vicieux: obésité -> baisse testostérone (aromatisation) -> hausse obésité (partition nutriments vers graisse) -> baisse testostérone. Breaking this cycle nécessite intervention multifactorielle (perte poids + traitement testostérone si indiqué).

Traitement testostérone chez hypogonadiques avec syndrome métabolique: amélioration HbA1c -0.4-0.6%, sensibilité insuline +20-30%, profil lipidique (Saad et al. 2017).`,

      lifespan: `Corrélation observée entre testostérone et longévité: hommes testostérone quintile supérieur (>550 ng/dL) ont mortalité toutes causes 20-30% inférieure vs quintile inférieur (<350 ng/dL).

Mécanismes: réduction facteurs risque CV, maintien masse musculaire (sarcopénie = prédicteur mortalité fort), densité osseuse (ostéoporose = fragilité), fonction cognitive, qualité vie.

Étude suédoise 2014 (Shores et al.): 1032 hommes >40 ans, suivi 11 ans. Testostérone <300 ng/dL non traitée: mortalité x1.88. Testostérone <300 traitée: mortalité similaire à contrôles >500 ng/dL.

Recommandation: maintenir testostérone >500 ng/dL après 40 ans via lifestyle optimal + traitement si nécessaire = stratégie longévité validée.`,
    },

    studies: [
      "Bhasin S et al. (2001). Testosterone dose-response relationships in healthy young men. Am J Physiol Endocrinol Metab. 281(6):E1172-E1181.",
      "Corona G et al. (2019). Testosterone supplementation and cardiovascular risk: a systematic review and meta-analysis. Mayo Clin Proc. 94(6):1069-1078.",
      "Traish AM et al. (2009). The dark side of testosterone deficiency. J Androl. 30(1):1-17.",
      "Shores MM et al. (2014). Testosterone treatment and mortality in men with low testosterone levels. J Clin Endocrinol Metab. 97(6):2050-2058.",
      "Saad F et al. (2017). Testosterone deficiency and testosterone treatment in older men. Gerontology. 63(2):144-156.",
    ],
  },

  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours - PRIORITE ABSOLUE",

      sleep: `**Objectif: 7h30-8h minimum/nuit, horaires fixes**

Privation sommeil = cause #1 testostérone basse chez homme <40 ans. Chaque heure sommeil perdue = -15% testostérone (Leproult et al. 2011). 5h/nuit pendant 1 semaine réduit testostérone a niveaux 10-15 ans plus vieux.

**Action plan**:
- Coucher: 22h-23h (fenetre optimale secretion GH/testosterone)
- Reveil: 6h30-7h30 (aligner rythme circadien)
- Chambre: <19 degres, noir total (masque si besoin), silence
- Routine pre-sommeil: 0 ecran 1h avant, lecture, douche tiede
- Supplements: Magnesium bisglycinate 400mg 1h avant, eventuellement L-theanine 200mg

**Resultats attendus**: +10-20% testostérone en 4-6 semaines si privation chronique corrigée. Effet massif si actuellement <6h/nuit.`,

      nutrition: `**Objectif: Sortir du deficit calorique, optimiser macros pour testostérone**

Deficit calorique >10% = suppression testostérone -20-30% (Stiegler et al. 2006). Corps en mode survie -> downregulation axe HPG pour preserver energie.

**Action plan**:
1. **Calories**: Passer de deficit a maintenance ou leger surplus (+200-300 kcal)
   - Si actuellement 2200 kcal avec -500 deficit -> monter a 2700 (maintenance)
   - Maintenir 2-4 semaines pour "reset" axe hormonal

2. **Lipides**: 1-1.2g/kg minimum (actuellement <0.8g/kg est insuffisant)
   - Cholesterol = precurseur testostérone (voie steroidogenique)
   - Focus graisses saturees/monoinsaturees: oeufs entiers, viande rouge, huile olive, avocat
   - Eviter low-fat diet (<0.5g/kg) = catastrophe testostérone

3. **Proteines**: 2-2.2g/kg maintenu (deja optimal)

4. **Glucides**: Timing peri-workout pour sensibilite insuline
   - 50-60% glucides quotidiens dans fenetre 2h pre + 2h post-training
   - Eviter glucides simples seuls (pic insuline sans activite = stockage graisse)

**Resultats attendus**: +15-25% testostérone en 6-8 semaines si actuellement deficit chronique. Bonus: regain energie, amelioration humeur, progression training.`,

      training: `**Objectif: Optimiser volume/intensite pour stimulation testostérone sans overtraining**

Entrainement resistance stimule testostérone aigue (+20-40% post-seance) et chronique (+10-15% baseline). MAIS surentrainement (volume/frequence excessif + recuperation insuffisante) = effet inverse (cortisol en hausse, testostérone en baisse).

**Action plan**:
1. **Frequence**: 3-5 seances/semaine (actuellement si 6-7 -> reduire)
2. **Volume**: 12-20 series/groupe musculaire/semaine (sweet spot hypertrophie + hormones)
3. **Intensite**: Priorite composes lourds (squat, deadlift, bench, rows) a 75-85% 1RM
4. **Repos**: 2-3 min entre series lourdes (seances <60min si possible)
5. **Cardio**: Limiter HIIT/cardio intense a 2-3x/semaine (exces cortisol)
6. **Deload**: Semaine -50% volume toutes 4-6 semaines (recuperation systemique)

**A eviter**:
- Seances >90min quotidiennes (cortisol spike)
- Entrainement 2x/jour frequent sans nutrition adequate
- Cardio steady-state >45min regulier (catabolique)

**Resultats attendus**: +8-12% testostérone si actuellement overtrained. Progression force/hypertrophie deblocage.`,

      stress: `**Objectif: Reduire cortisol chronique eleve (antagoniste testostérone)**

Stress chronique -> cortisol eleve persistant -> inhibition GnRH hypothalamique -> baisse LH -> baisse testostérone. Relation inverse: cortisol x1.5 = testostérone /1.3.

**Action plan**:
1. **Respiration**: 10min/jour coherence cardiaque (5sec inspire, 5sec expire)
2. **Meditation**: 15-20min/jour (app Headspace, Calm, ou simple focus respiration)
3. **Marche nature**: 30min/jour minimum exterieur (lumiere naturelle + mouvement leger)
4. **Coupures travail**: 0 email/calls apres 19h, 1 jour/semaine off complet
5. **Adaptogenes**: Ashwagandha KSM-66 600mg/jour (phase 2) si stress persistant

**Resultats attendus**: -15-25% cortisol en 4-8 semaines si stress chronique. Testostérone remonte indirectement +10-15%.`,

      alcohol: `**Objectif: Eliminer ou reduire drastiquement**

Alcool = toxique testiculaire direct. Inhibe testostérone via 3 mecanismes: (1) dommage cellules Leydig, (2) aromatisation testostérone -> estradiol, (3) perturbation sommeil (baisse REM/profond).

Dose-dependant:
- 1-2 verres/jour: -6-9% testostérone
- 3-4 verres/jour: -15-20% testostérone
- Binge drinking (5+ verres): -25-35% testostérone 24-48h post

**Action plan**:
- **Ideal**: 0 alcool pendant 30 jours (phase 1 reset)
- **Minimum**: Max 2 verres/semaine, jamais veilles entrainement/sommeil prioritaire
- **Si social unavoidable**: Limiter degats (hydratation ++, NAC 600mg pre/post, sommeil +1h)

**Resultats attendus**: +10-18% testostérone si actuellement consommation reguliere (3-4x/semaine). Bonus: meilleur sommeil, moins inflammation.`,

      expected_impact: `**Resultats combines Phase 1 (30 jours)**:

Si application stricte des 5 piliers (sommeil, nutrition, training, stress, alcool):

- Testostérone: **+20-40% attendu** (ex: 420 -> 500-590 ng/dL)
- Cortisol: -15-25%
- Energie subjective: +40-60%
- Qualite sommeil: +50-70%
- Progression training: deblocage stagnation
- Composition corporelle: -1-2kg graisse, +0.5-1kg muscle (recomp naturel)

Attention: Ces resultats supposent testostérone basse d'origine fonctionnelle (lifestyle). Si hypogonadisme organique (testiculaire/hypophysaire), lifestyle seul insuffisant -> consultation endocrino + potentiel TRT.

**Red flags necessitant investigation medicale AVANT Phase 2**:
- Testostérone <250 ng/dL persistante malgre lifestyle optimal
- LH/FSH anormales (tres hautes ou tres basses)
- Symptomes severes: gynecomastie, atrophie testiculaire, dysfonction erectile franche
- Prolactine >25 ng/mL (suspicion prolactinome)`,
    },

    phase2_supplements: {
      duration: "30-90 jours - Apres optimisation lifestyle",

      supplements: [
        {
          name: "Zinc (picolinate ou bisglycinate)",
          dosage: "30mg/jour (25mg zinc elementaire)",
          timing: "Soir avec repas (ou 2h separe calcium/fer)",
          brand: "Thorne, NOW Foods, Life Extension",
          mechanism: `Cofacteur 300+ enzymes, dont aromatase (convertit testostérone -> estradiol). Deficit zinc -> aromatisation excessive -> testostérone baisse, estradiol hausse.

Zinc inhibe aromatase competitif, optimise LH signaling, protege cellules Leydig stress oxydatif. Athletes perdent 1-2mg zinc/L sueur -> deficit frequent si entrainement intense.

Etudes:
- Prasad et al. (1996): Zinc 30mg/jour x 6 mois -> testostérone +93% chez deficitaires
- Kilic et al. (2006): Zinc + exercice -> testostérone +33% vs exercice seul`,
          studies: [
            "Prasad AS et al. (1996). Zinc status and serum testosterone in healthy adults. Nutrition. 12(5):344-348.",
            "Kilic M et al. (2006). Effect of zinc supplementation on serum testosterone in athletes. J Exerc Sci Fit. 4(1):56-60.",
          ],
        },
        {
          name: "Vitamine D3 (cholecalciferol)",
          dosage: "5000 UI/jour (si <30 ng/mL), puis 2000-3000 UI maintenance",
          timing: "Matin avec repas contenant graisses",
          brand: "NOW Foods, Thorne, Doctor's Best",
          mechanism: `Vitamine D = steroide hormone. Recepteur VDR dans cellules Leydig, hypothalamus, hypophyse. Regule expression CYP enzymes steroidogeniques.

Deficit (<30 ng/mL) = quasi-universel hivers/bureaux. Correlation lineaire: chaque +10 ng/mL vitamine D = +50-80 ng/dL testostérone (Pilz et al. 2011).

Etudes:
- Pilz S et al. (2011): Vitamine D 3332 UI/jour x 1 an -> testostérone +25% (deficitaires)
- Wehr E et al. (2010): Correlation vitamine D - testostérone dans cohorte 2299 hommes`,
          studies: [
            "Pilz S et al. (2011). Effect of vitamin D supplementation on testosterone. Horm Metab Res. 43(3):223-225.",
            "Wehr E et al. (2010). Association of vitamin D status with serum androgen levels in men. Clin Endocrinol. 73(2):243-248.",
          ],
        },
        {
          name: "Ashwagandha KSM-66 (extrait standardise)",
          dosage: "600mg/jour (300mg x 2 ou 600mg soir)",
          timing: "Soir de preference (effet relaxant)",
          brand: "KSM-66 (marque brevetee), Jarrow, NOW Foods",
          mechanism: `Adaptogene regule axe HPA (hypothalamus-pituitaire-surrenales). Reduit cortisol chronique eleve -> leve inhibition GnRH -> hausse LH -> hausse testostérone.

Action GABAergique legere (anxiolytique naturel), ameliore sommeil, reduit stress percu -44% (echelles valides).

Etudes:
- Lopresti et al. (2019): Ashwagandha 600mg x 8 semaines -> testostérone +14.7%, baisse cortisol -27.9%
- Wankhede et al. (2015): Ashwagandha + resistance training -> testostérone +15% vs placebo`,
          studies: [
            "Lopresti AL et al. (2019). A randomized, double-blind, placebo-controlled trial of ashwagandha on stress and testosterone. J Int Soc Sports Nutr. 16(1):10.",
            "Wankhede S et al. (2015). Effects of ashwagandha on muscle mass and strength. J Int Soc Sports Nutr. 12:43.",
          ],
        },
        {
          name: "Magnesium Bisglycinate",
          dosage: "400mg/jour (ou 300-500mg selon poids)",
          timing: "1h avant coucher",
          brand: "Doctor's Best, Thorne, Pure Encapsulations",
          mechanism: `Magnesium = cofacteur 300+ reactions, dont synthese testostérone. Liaison magnesium-SHBG -> liberation testostérone libre (+24% dans etude Cinar et al. 2011).

Effet majeur via amelioration sommeil profond (hausse ondes delta) -> pic GH nocturne optimal -> synergie testostérone. Forme bisglycinate = absorption superieure, 0 effet laxatif (vs oxyde).

Etudes:
- Cinar V et al. (2011): Magnesium 10mg/kg x 4 semaines + training -> testostérone +24%
- Brilla LR et al. (1992): Magnesium supplementation -> hausse testostérone libre athletes`,
          studies: [
            "Cinar V et al. (2011). Effects of magnesium supplementation on testosterone in athletes. Biol Trace Elem Res. 140(1):18-23.",
            "Brilla LR et al. (1992). Magnesium-exercise interactions. Magnes Res. 5(3):193-199.",
          ],
        },
        {
          name: "Vitamine K2 MK-7 (optionnel avec D3)",
          dosage: "200mcg/jour",
          timing: "Avec vitamine D3 (synergie)",
          brand: "NOW Foods, Life Extension, Jarrow",
          mechanism: `Synergie vitamine D3/K2: K2 dirige calcium vers os (vs arteres). Etudes suggerent K2 stimule testostérone via activation osteocalcine (proteine os -> signaling Leydig cells).

Moins de preuves directes que zinc/D3, mais cout faible et benefice sante osseuse/CV etabli. Considerer si dosage D3 >5000 UI/jour long-terme.`,
          studies: [
            "Iki M et al. (2006). Vitamin K2 and bone and cardiovascular health. Osteoporos Int. 17(12):1710-1715.",
          ],
        },
      ],

      budget: `**Cout mensuel total: 50-80EUR**

- Zinc 30mg (180 caps): ~15EUR (6 mois) = 2.50EUR/mois
- Vitamine D3 5000 UI (360 softgels): ~18EUR (12 mois) = 1.50EUR/mois
- Ashwagandha KSM-66 (60 caps): ~25EUR (1 mois) = 25EUR/mois
- Magnesium Bisglycinate (120 caps): ~20EUR (4 mois) = 5EUR/mois
- Vitamine K2 (optionnel, 120 caps): ~22EUR (4 mois) = 5.50EUR/mois

**Total: ~40EUR/mois (sans K2) ou ~45EUR/mois (avec K2)**

Recommandation: Commencer zinc + D3 + magnesium (10EUR/mois) pendant 4 semaines. Si budget permet, ajouter Ashwagandha si stress eleve/cortisol haut.`,

      expected_impact: `**Resultats combines Phase 1 + Phase 2 (90 jours total)**:

- Testostérone: **+30-60% vs baseline** (ex: 420 -> 550-670 ng/dL)
  - Phase 1 (lifestyle): +20-40%
  - Phase 2 (supplements): +10-20% additionnel
- Cortisol: -25-40% (surtout si Ashwagandha)
- Vitamine D: 40-60 ng/mL (optimal)
- Zinc serique: >90 mcg/dL (optimal)
- Qualite vie: amelioration franche tous domaines (energie, libido, perfs, humeur)

Attention: Attentes realistes
- Si testostérone baseline 400-500 ng/dL d'origine fonctionnelle -> cible 600-750 ng/dL atteignable
- Si testostérone baseline <300 ng/dL persistante -> amelioration modeste attendue, TRT potentiellement necessaire (voir Phase 3)

**Quand abandonner lifestyle-only approach**:
- Apres 90 jours optimisation stricte (lifestyle + supplements), si testostérone reste <400 ng/dL + symptomes persistants -> consultation endocrinologue pour bilan approfondi + discussion TRT`,
    },

    phase3_retest: {
      duration: "90 jours+ - Evaluation resultats",

      when: `**Timing retest: J+90 (3 mois apres debut Phase 1)**

Delai 90 jours necessaire pour:
- Renouvellement complet spermatogenese (74 jours)
- Adaptation metabolique aux changements lifestyle
- Accumulation effets supplements (zinc/D3 = 6-12 semaines plateau)

**Conditions prise de sang**:
- Matinale: 7h-10h (pic circadien testostérone)
- A jeun: 10-12h (fiabilite marqueurs metaboliques)
- Repos: 48h post-entrainement intense (eviter suppression aigue)
- Hydratation normale: pas surhydratation (dilue valeurs)`,

      markers: `**Panel complet retest (20-25 marqueurs)**:

**Hormones (priorite #1)**:
- Testostérone totale (ng/dL) -> Cible >600
- Testostérone libre (pg/mL) ou calculee -> Cible >100
- SHBG (nmol/L) -> Cible 20-40
- Estradiol (pg/mL) -> Cible 20-30, ratio T:E2 >20:1
- LH (mIU/mL) -> Evaluer axe HPG
- FSH (mIU/mL) -> Evaluer fonction testiculaire
- Prolactine (ng/mL) -> Exclure hyperprolactinemie
- Cortisol matinal (mcg/dL) -> Cible <15

**Marqueurs associes**:
- Vitamine D (ng/mL) -> Cible 40-60
- Zinc serique (mcg/dL) -> Cible >90
- TSH, T3, T4 (evaluer thyroide si energie/metabolisme sub-optimal)
- Glycemie, HbA1c, HOMA-IR (si syndrome metabolique)
- Lipides complets (TG/HDL ratio, LDL, HDL)
- CRP-us (inflammation)
- ALT/AST (fonction hepatique)
- Hemogramme complet (exclure anemie, polyglobulie)`,

      success_criteria: `**Criteres succes protocole**:

OK - **Succes complet**:
- Testostérone: +30-50% vs baseline ET >550 ng/dL
- Symptomes: amelioration >=60% (energie, libido, perfs, humeur)
- Marqueurs secondaires: vitamine D >40, cortisol <15, zinc >90
- -> Continuer optimisation lifestyle, reevaluer 1x/an

Attention - **Succes partiel**:
- Testostérone: +15-29% vs baseline OU 450-549 ng/dL
- Symptomes: amelioration 30-59%
- -> Poursuivre 3 mois additionnels, investiguer facteurs limitants (stress persistant? sommeil sous-optimal? deficit calorique residuel?)

Non - **Echec protocole**:
- Testostérone: <+15% ET <450 ng/dL
- Symptomes: amelioration <30%
- -> Investigation endocrinienne approfondie (voir Next Steps ci-dessous)`,

      next_steps: `**Si amelioration insuffisante (<+20% testostérone apres 90j)**:

**Examens complementaires**:
1. **IRM hypophysaire** (exclure adenome, lesion compressive)
2. **Echographie testiculaire** (exclure atrophie, varicocele, tumeur)
3. **Caryotype** (exclure Klinefelter si dysmorphie/gynecomastie)
4. **Panel complet hypophysaire**: GH, ACTH, cortisol, prolactine approfondie
5. **Test stimulation GnRH** (distinguer hypogonadisme primaire vs secondaire)

**Consultation endocrinologue**:
- Discussion TRT (Testosterone Replacement Therapy) si:
  - Testostérone confirmee <300 ng/dL sur 2 dosages + symptomes
  - Echec optimisation lifestyle 90 jours
  - LH/FSH basses (hypogonadisme secondaire) ou tres hautes (primaire)
  - Age >40 ans avec declin symptomatique franc

**Options TRT** (sous supervision medicale):
- **Injections IM**: Enanthate/cypionate 100-200mg/semaine (gold standard)
- **Gel transdermal**: Androgel, Testogel (moins stable, transfert risque)
- **Pellets sous-cutanes**: Testopel (duree 3-6 mois, invasif)
- **Clomid/hCG** (si preservation fertilite prioritaire, stimule production endogene)

Attention: **TRT = decision majeure**: Engagement vie, suppression production endogene, monitoring regulier (hematocrite, PSA, lipides). Toujours essayer lifestyle-first approach 90 jours minimum.`,
    },

    special_cases: {
      non_responders: `**"J'ai tout bien fait, testostérone toujours basse"**

Si apres 90 jours lifestyle optimal + supplements, testostérone reste <400 ng/dL:

**Causes possibles**:
1. **Hypogonadisme organique** (non fonctionnel):
   - Primaire: dommage testiculaire (trauma, orchite, crypto, chimio)
   - Secondaire: deficit GnRH/LH (adenome, Kallmann, prolactinome)
   -> Investigation endocrinienne requise

2. **Facteurs caches** (lifestyle non reellement optimal):
   - Sommeil: quantite != qualite (apnee sommeil? REM insuffisant?)
   - Stress: chronique bas-grade sous-estime (travail, finances, relation)
   - Alcool: sous-declaration frequente (weekends ++)
   - Calories: macro comptage imprecis, deficit residuel
   - Entrainement: volume reel > percu, recuperation insuffisante

3. **Co-facteurs metaboliques**:
   - Obesite persistante (BMI >30, BF >25%) -> aromatisation excessive
   - Diabete/pre-diabete -> resistance insuline perturbe steroidogenese
   - Hypothyroidie subclinique -> ralentit tous metabolismes
   -> Traiter pathologies sous-jacentes en parallele

**Action**:
- Tenir journal precis 2 semaines (sommeil, calories, alcool, stress, entrainement)
- Consultation endocrinologue + examens approfondis
- Discussion risques/benefices TRT si hypogonadisme confirme organique`,

      contraindications: `**Qui NE doit PAS suivre ce protocole (ou avec precautions)**:

**Contre-indications absolues supplements**:
- **Zinc >50mg/jour long-terme**: Toxicite cuivre (anemie, neutropenie)
- **Vitamine D >10,000 UI/jour sans monitoring**: Hypercalcemie, lithiases
- **Ashwagandha**: Hyperthyroidie (stimule T3/T4), grossesse/allaitement
- **Magnesium high-dose**: Insuffisance renale severe

**Precautions lifestyle modifications**:
- **Deficit calorique**: Si IMC <20 ou BF <10% homme, ne PAS restreindre davantage
- **Entrainement**: Si historique troubles alimentaires, overtraining compulsif -> suivi psychologique
- **Stress management**: Si depression clinique, anxiete severe -> psychiatre/psychologue avant auto-gestion

**Contre-indications relatives TRT** (Phase 3):
- Cancer prostate (absolu)
- PSA >4 ng/mL non investigue
- Hematocrite >52% (risque thrombose)
- Apnee sommeil severe non traitee (aggravee par TRT)
- Desir fertilite court-terme (TRT = azoospermie 6-12 mois)
- <25 ans sans investigation exhaustive (fermeture epiphyses)`,

      red_flags: `**Quand consulter endocrinologue AVANT d'essayer lifestyle-only**:

Attention - **Urgences endocriniennes**:
- Testostérone <200 ng/dL + symptomes francs
- Gynecomastie douloureuse rapide (suspicion prolactinome, tumeur testiculaire)
- Cephalees + troubles vision (suspicion adenome hypophysaire compressif)
- Atrophie testiculaire franche (<15mL volume)
- Dysfonction erectile complete + absence libido (combinaison rare si hypogonadisme seul)

Attention - **Red flags biologiques**:
- LH/FSH tres elevees (>15-20 mIU/mL) = hypogonadisme primaire -> investigation testiculaire
- Prolactine >25 ng/mL (homme) = hyperprolactinemie -> IRM hypophysaire
- Estradiol >40-50 pg/mL (homme) = aromatisation excessive ou tumeur secretante
- HbA1c >7% = diabete non controle -> priorite glycemie avant testostérone
- ALT/AST >2-3x normale = hepatopathie -> investigation hepatique avant supplements

Attention - **Historique medical**:
- Chimiotherapie anterieure (gonadotoxique)
- Radiotherapie cranienne/pelvienne
- Trauma cranien severe (lesion hypophysaire)
- Cryptorchidie operee (risque fonction testiculaire reduite)
- Syndrome genetique connu (Klinefelter, Kallmann, etc.)

**Regle generale**: Si testostérone <300 ng/dL sur 1er dosage -> refaire dosage + LH/FSH/prolactine AVANT lifestyle modifications. Si confirme <300 + LH/FSH anormales -> endocrinologue directement (ne pas perdre 3 mois).`,
    },
  },
};

export const TESTOSTERONE_LIBRE_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### Pourquoi ca compte (MPMD/Huberman)

**Derek (MPMD):**

> "You could have a 900 ng/dL total testosterone level and still experience low testosterone symptoms if you don't have an optimal SHBG and free testosterone level. At the end of the day, free testosterone levels will show you exactly how much testosterone is actually available to be used in tissues."

> "If you have high testosterone production, but more of it is being bound up by SHBG and albumin than should be, it won't matter what your total testosterone level is on paper."

**Chris Masterjohn PhD:**

> "Testosterone is bound in the serum by sex hormone-binding globulin (SHBG), and it is thought that the fraction that is not bound, that is, the free testosterone, is the true measure of what is bioavailable."

La testostérone libre (1-3 pourcent du total) est la seule forme biologiquement active qui:
- Active les récepteurs androgéniques dans les muscles
- Stimule la synthèse protéique et l'hypertrophie
- Augmente la force
- Améliore la récupération
- Booste la libido et l'énergie.`,
    mechanism: `#### Mécanisme physiologique

La testostérone totale inclut:
- Testostérone liée à la SHBG (60-70 pourcent) - inactive
- Testostérone liée à l'albumine (30-38 pourcent) - faiblement active
- Testostérone libre (1-3 pourcent) - seule forme active

La SHBG séquestre la testostérone et réduit la fraction libre utilisable. Quand la SHBG augmente, plus de testostérone devient liée et n'est plus bioactive, ce qui abaisse la free testosterone.

Vieillissement selon Derek (MPMD):
- Testostérone totale baisse de 0.8 à 1.6 pourcent par an après 40 ans
- SHBG augmente de 1.6 pourcent par an
- Résultat: testostérone libre baisse de 2 à 3 pourcent par an

Facteurs qui augmentent la SHBG: vieillissement, déficit calorique excessif, diète low-carb + high-protein, body fat trop bas, carence micronutriments.
Facteurs qui diminuent la SHBG: body fat optimal 12-17 pourcent, DHT, nutrition adéquate, certains suppléments.`,
    clinical: `#### Tests sanguins et méthodes

Méthode gold standard (Derek/MPMD):
- Free Testosterone: Equilibrium Ultrafiltration
- Total Testosterone: LC/MS-MS

Commande exacte recommandée:
"Testosterone, Free, Equilibrium Ultrafiltration With Total Testosterone, LC/MS-MS"

A éviter:
- Direct Analog EIA (imprécis)
- ECLIA (imprécis)

Citation Derek:
"My Testosterone levels were actually in the gutter, but ECLIA and EIA couldn't even tell the difference between Testosterone and 19-nortestosterone in my blood."

Fréquence:
- Baseline dès que possible
- Follow-up tous les 6 mois pendant optimisation (Dr. Kyle Gillett)
- Maintenance minimum annuelle.`,
    ranges: {
      optimal: `>150 pg/mL (Equilibrium Ultrafiltration) ou >20 ng/dL selon méthode`,
      normal: `100-150 pg/mL (acceptable mais pas optimal)`,
      suboptimal: `50-100 pg/mL (symptômes possibles: libido basse, gains stagnants)`,
      critical: `<50 pg/mL (hypogonadisme, investigation requise)`,
      interpretation: `Les ranges "normaux" de labos sont inutiles pour la performance. La méthode de test change complètement les valeurs, donc il faut toujours comparer avec la même méthode.

Repères pratiques:
- >150 pg/mL: zone performante
- 100-150 pg/mL: acceptable mais pas optimal
- <100 pg/mL: symptômes low T possibles
- <50 pg/mL: hypogonadisme probable

Chris Masterjohn recommande de suivre les marqueurs subjectifs (bien-etre, motivation, focus, confiance sous pression, érections nocturnes, libido) et pas uniquement les chiffres.`,
    },
    variations: `#### Variations physiologiques

- Rythme circadien: pic 6h-9h, nadir 20h-23h
- Déclin avec l'âge: -2 à -3 pourcent par an (Derek)
- Body fat optimal: 12-17 pourcent (Masterjohn, NHANES)
- Privation de sommeil: -15 pourcent en 1 semaine si <5h/nuit
- Stress chronique: cortisol élevé antagonise l'axe HPG et baisse la free testosterone.`,
    studies: [
      "Travison TG et al. (2017). Harmonized reference ranges...",
      "Leproult R et al. (2011). Effect of sleep restriction on testosterone. JAMA.",
      "Derek (MPMD). How Much Do Natural Testosterone Levels Decrease Per Year.",
      "Derek (MPMD). The Most Accurate Testosterone Blood Test.",
      "Masterjohn C. Five Ways to Increase Testosterone Naturally.",
    ],
  },
  impact: {
    performance: {
      hypertrophy: `Testostérone libre = déterminant principal de l'hypertrophie. Elle active mTOR, stimule la synthèse protéique et les cellules satellites. Les niveaux >150 pg/mL sont associés à des gains de masse maigre supérieurs par rapport à <100 pg/mL. Ratio cortisol/free testosterone optimal inférieur à 0.3.`,
      strength: `Impact direct sur la force via adaptations neurales et musculaires. >150 pg/mL est associé à 1RM +12 à 18 pourcent vs <100 pg/mL. Les athlètes de force stagnent souvent sous 120 pg/mL malgré un training correct.`,
      recovery: `Récupération fortement dépendante de la free testosterone. >150 pg/mL: DOMS 24-48h, force baseline en 48-72h. <100 pg/mL: DOMS 72-96h, overreaching fréquent. SHBG élevé réduit la fraction libre disponible et ralentit la récupération.`,
      bodyComp: `Free testosterone favorise la partition des nutriments vers le muscle et la lipolyse. Sweet spot de body fat 12-17 pourcent. Obésité augmente aromatase et SHBG, ce qui réduit la free testosterone et entretient un cercle vicieux de composition corporelle défavorable.`,
    },
    health: {
      energy: `Free testosterone soutient l'énergie et la libido. Quand elle est basse, les symptômes de fatigue et d'anergie sont fréquents, même avec une testostérone totale dans la norme.`,
      mood: `Chris Masterjohn recommande de suivre motivation, confiance calme sous pression et bien-etre global. Une free testosterone basse s'accompagne souvent d'une baisse de motivation et d'un drive réduit.`,
      cognition: `Les marqueurs subjectifs cités par Masterjohn incluent le focus et la clarté mentale. Une free testosterone optimale est associée à un meilleur focus percu et une motivation stable.`,
      immunity: `Une free testosterone basse s'associe souvent a une recuperation plus lente et a une tolerance moindre aux stress d'entrainement, ce qui peut fragiliser la resilience immunitaire pendant les phases de surcharge.`,
    },
    longTerm: {
      cardiovascular: `Les études citées dans les sources associent une testostérone basse à un risque cardiométabolique plus élevé.`,
      metabolic: `Association rapportée entre testostérone basse et syndrome métabolique, avec une sensibilité à l'insuline dégradée.`,
      lifespan: `La littérature citée signale une association entre déficit androgénique et mortalité plus élevée.`,
    },
    studies: [
      "Corona G et al. (2016). Body weight loss...",
      "Khera M et al. (2011). Association of low testosterone with metabolic syndrome.",
      "Muraleedharan V et al. (2013). Testosterone deficiency and mortality. Heart.",
      "Derek (MPMD). Free Testosterone - What Matters For Building Muscle.",
      "Masterjohn C. Testosterone and body composition.",
    ],
  },
  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours - FONDAMENTAL",
      sleep: `Objectif 7-9h minimum, car la production de testostérone est nocturne. La privation de sommeil chronique s'accompagne d'une baisse marquée de la testostérone, et une semaine <5h/nuit peut réduire la production d'environ 15 pourcent.`,
      nutrition: `Eviter low-carb + high-protein combinés. Citation Masterjohn: "Low-carb, high-protein diets cut testosterone by an average of 33%." Si high-protein nécessaire: 2g/jour de TMG pour soutenir la méthylation. Favoriser fat over protein si carbs restreints. Eviter déficit calorique chronique excessif.

Protocole sel (Masterjohn): tester 2-10g/jour, arrêter si maux de tête, oedème, hausse de tension.

Micronutriments essentiels (Masterjohn): vitamine A, vitamine D, fer, B1, B2, B3, magnésium, zinc, sodium, chlorure.

Citations Masterjohn:
"In boys, the combination of vitamin A and iron is just as effective at inducing puberty as androgen replacement therapy."
"Vitamin D is required to incorporate iron into steroid-producing enzymes correctly."
"The enzymes that synthesize testosterone also depend on thiamin (B1), riboflavin (B2), niacin (B3), glucose, magnesium and zinc, and are increased by sodium and chloride (salt)."`,
      training: `Exercice = driver principal du déficit calorique. Viser au moins 6h/semaine de resistance training. Objectif body fat 12-17 pourcent. Eviter overtraining qui augmente le catabolisme.`,
      stress: `Cortisol chronique élevé = antagoniste de la testostérone. Mettre en place des routines de gestion du stress et éviter l'exposition continue aux stresseurs.`,
      alcohol: `Alcool chronique augmente la SHBG et dégrade le profil hormonal. Limiter la consommation pour préserver la free testosterone.`,
      expected_impact: `Après 30 jours de lifestyle optimisé, amélioration attendue de la free testosterone de 15 à 25 pourcent selon baseline.`,
    },
    phase2_supplements: {
      duration: "30-90 jours - Après optimisation lifestyle",
      supplements: [
        {
          name: "Tongkat Ali (Eurycoma longifolia)",
          dosage: "100-400 mg/jour (extrait standardisé)",
          timing: "Matin à jeun ou réparti 2 fois par jour",
          brand: "Nootropics Depot, Double Wood, Bulk Supplements",
          mechanism:
            "Adaptogène modulateur axe HPG. Augmente LH et la production de testostérone. Réduit SHBG et augmente la free testosterone. Citation Masterjohn: 100-400 mg/jour a la meilleure preuve pour une herbe.",
          studies: [
            "Talbott SM et al. (2013). Effect of Tongkat Ali on stress hormones. J Int Soc Sports Nutr.",
            "Masterjohn C. Five Ways to Increase Testosterone Naturally.",
          ],
        },
        {
          name: "Ashwagandha (KSM-66 ou Sensoril)",
          dosage: "200-250 mg/jour (extrait standardisé withanolides >=5 pourcent)",
          timing: "Soir de préférence",
          brand: "KSM-66, Jarrow Formulas, NOW Foods",
          mechanism:
            "Adaptogène régule axe HPA. Réduit le cortisol, améliore le sommeil et l'environnement hormonal. Etudes citées: cortisol en baisse et testostérone en hausse après 8 semaines.",
          studies: [
            "Lopresti AL et al. (2019). Ashwagandha on stress and testosterone. J Int Soc Sports Nutr.",
            "Chandrasekhar K et al. (2012). Ashwagandha efficacy and safety. Indian J Psychol Med.",
          ],
        },
        {
          name: "Vitamine D3 (Cholécalciférol)",
          dosage: "4000-6000 IU/jour si <30 ng/mL, puis 2000-3000 IU maintenance",
          timing: "Matin avec repas contenant graisses",
          brand: "NOW Foods, Thorne, Doctor's Best",
          mechanism:
            "Vitamine D = stéroïde hormone, précurseur de la synthèse testostérone. Masterjohn: Vitamin D is required to incorporate iron into steroid-producing enzymes correctly. Cible 25-OH-D 40-60 ng/mL.",
          studies: [
            "Pilz S et al. (2011). Effect of vitamin D supplementation on testosterone. Horm Metab Res.",
            "Masterjohn C. Vitamin D and testosterone synthesis.",
          ],
        },
        {
          name: "Zinc (bisglycinate ou picolinate)",
          dosage: "25-50 mg/jour élément zinc",
          timing: "Soir avec repas",
          brand: "Thorne, Pure Encapsulations, NOW Foods",
          mechanism:
            "Cofacteur essentiel des enzymes stéroïdogéniques. Carence zinc = baisse de testostérone. Inhibe l'aromatase de façon modérée.",
          studies: [
            "Prasad AS et al. (1996). Zinc status and serum testosterone. Nutrition.",
            "Masterjohn C. Ten nutrients for testosterone synthesis.",
          ],
        },
        {
          name: "Magnésium (bisglycinate)",
          dosage: "400-600 mg/jour élément magnésium",
          timing: "1h avant coucher",
          brand: "Doctor's Best, Thorne, Pure Encapsulations",
          mechanism:
            "Cofacteur de la synthèse de testostérone et soutien du sommeil profond. Carence fréquente associée à une baisse de testostérone.",
          studies: [
            "Cinar V et al. (2011). Effects of magnesium supplementation on testosterone. Biol Trace Elem Res.",
            "Masterjohn C. Magnesium and testosterone.",
          ],
        },
      ],
      budget: `Coût mensuel total: 50-80 euros

- Tongkat Ali: ~30 euros/mois
- Ashwagandha: ~15 euros/mois
- Vitamine D3: ~5 euros/mois
- Zinc: ~8 euros/mois
- Magnésium: ~10 euros/mois

Recommandation budget limité: Tongkat Ali + Vitamine D + Magnésium (base 45 euros/mois).`,
      expected_impact: `Résultats Phase 1 + Phase 2 combinés à J+90:

Si free testosterone baseline 80 pg/mL:
- Phase 1 seule (J+30): +15-25 pourcent (95-100 pg/mL)
- Phase 1 + 2 (J+90): +40-60 pourcent (110-130 pg/mL)

Amélioration symptomatique:
- Libido: +50-80 pourcent
- Gains masse maigre: +20-40 pourcent vs baseline
- Récupération: DOMS 72h vers 24-48h
- Energie: +60-90 pourcent
- Force: +8-15 pourcent 1RM

Si amélioration <20 pourcent malgré 90j stricts: investigation médicale.`,
    },
    phase3_retest: {
      duration: "90 jours+ - Evaluation complète",
      when: `Timing retest: J+90 (12 semaines après début Phase 1).

Méthode gold standard:
- Free Testosterone: Equilibrium Ultrafiltration
- Total Testosterone: LC/MS-MS

Commande exacte:
"Testosterone, Free, Equilibrium Ultrafiltration With Total Testosterone, LC/MS-MS"

Conditions:
- Prélèvement 7-9h matin à jeun
- 48h post-entrainement intense
- Sommeil >7h nuit précédente
- 0 alcool 48h avant.`,
      markers: `Marqueurs à retester:
- Free Testosterone (Equilibrium Ultrafiltration)
- Total Testosterone (LC/MS-MS)
- SHBG
- Estradiol (LC/MS-MS)
- LH + FSH
- Cortisol matin
- 25-OH Vitamin D
- Zinc sérique + cuivre
- HOMA-IR`,
      success_criteria: `Critères succès:
- Free Testosterone >150 pg/mL
- SHBG modéré 20-50 nmol/L
- Ratio Free T / Total T: 2-3 pourcent
- Estradiol 20-30 pg/mL
- Cortisol matin 10-18 ug/dL

Symptômes résolus:
- Libido normalisée, érections matinales régulières
- Récupération DOMS <48h
- Energie matinale élevée
- Motivation et drive stables.`,
      next_steps: `Si free testosterone reste <100 pg/mL à J+90 malgré protocol strict:

Investigations médicales:
1. LH/FSH pour différencier primaire vs secondaire
2. Prolactine si >20 ng/mL
3. Hémochromatose (ferritine et saturation transferrine)
4. Syndrome Klinefelter si testicules petits
5. Consultation endocrinologue pour discuter TRT si hypogonadisme confirmé.

Causes possibles d'échec:
- Non-compliance
- Stress chronique non géré
- Apnée du sommeil non diagnostiquée
- Surentrainement masqué.`,
    },
    special_cases: {
      non_responders: `Checklist si free testosterone <100 pg/mL après 90j stricts:

1. Sommeil 7-8h vérifié par tracker
2. Body fat 12-17 pourcent
3. Cortisol matin <18 ug/dL
4. Volume training raisonnable
5. Pas de low-carb + high-protein
6. Suppléments pris et de qualité
7. Apnée du sommeil exclue
8. Alcool réellement limité

Si tout est ok et free testosterone <80 pg/mL: investigation médicale.

Profils rares:
- Résistance androgénique partielle
- Polymorphismes SRD5A2 ou CYP19A1
- Hyperprolactinémie idiopathique.`,
      contraindications: `Suppléments - contre-indications et précautions:

Tongkat Ali:
- Prudence si diabète
- Prudence si immunosuppresseurs
- Eviter grossesse/allaitement

Ashwagandha:
- Eviter hyperthyroïdie
- Eviter grossesse
- Prudence maladies auto-immunes

Vitamine D >10,000 IU/jour:
- Eviter hypercalcémie
- Eviter sarcoïdose ou granulomatose
- Monitorer calcium et 25-OH-D

Zinc >50 mg/jour chronique:
- Risque carence cuivre

Magnésium >600 mg/jour:
- Eviter insuffisance rénale sévère

Lifestyle:
- Sel 2-10g/jour interdit si HTA non contrôlée ou insuffisance cardiaque
- Déficit calorique agressif déconseillé si free testosterone basse.`,
      red_flags: `Quand consulter endocrinologue immédiatement:

- Free testosterone <50 pg/mL
- Free testosterone basse + LH/FSH très élevées (>12 mIU/mL)
- Free testosterone basse + LH/FSH très basses (<2 mIU/mL)
- Prolactine >40 ng/mL
- Gynécomastie nouvelle ou progressive
- Testicules très petits (<15 mL)
- Symptômes Cushing avec free testosterone basse
- Hématocrite >52 pourcent après optimisation testosterone.`,
    },
  },
};

export const SHBG_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### Pourquoi ca compte (MPMD/Huberman)

Dr. Kyle Gillett (Huberman Lab):
"It is the protein that binds up all androgens and estrogen in the body. So the stronger the androgen, the stronger it binds."

Le problème:
- SHBG séquestre la testostérone et la rend inactive
- Plus SHBG est élevé, moins de testostérone libre
- SHBG augmente d'environ 1.6 pourcent par an après 40 ans (Derek)

C'est double peine avec l'âge:
1. Testostérone totale baisse de 0.8-1.6 pourcent par an
2. SHBG augmente de 1.6 pourcent par an
3. Free testosterone baisse de 2-3 pourcent par an.`,
    mechanism: `#### Mécanisme physiologique

La SHBG lie les androgènes et oestrogènes circulants. La fraction liée devient non bioactive, ce qui réduit la testostérone libre disponible.

Facteurs qui augmentent la SHBG:
- Vieillissement
- Déficit calorique excessif
- Diète low-carb + high-protein
- Body fat trop bas
- Carence micronutriments
- Hyperthyroïdie
- Alcool chronique

Facteurs qui diminuent la SHBG:
- Body fat optimal 12-17 pourcent
- DHT
- Nutrition adéquate
- Insuline plus élevée (paradoxe)`,
    clinical: `#### Lecture clinique

Objectif pratique: SHBG suffisamment basse pour maximiser la free testosterone, sans descendre trop bas (risque estradiol élevé).

Fréquence de test recommandée dans les sources: tous les 6 mois pendant optimisation.`,
    ranges: {
      optimal: `15-30 nmol/L`,
      normal: `30-40 nmol/L (acceptable)`,
      suboptimal: `>40 nmol/L (réduit la free testosterone)`,
      critical: `<10 nmol/L (rare, peut causer excès estradiol)`,
      interpretation: `L'objectif est un SHBG modéré. Trop élevé diminue la testostérone libre. Trop bas peut s'associer à un excès d'estradiol.`,
    },
    variations: `SHBG augmente avec l'âge et peut monter en cas de déficit calorique, de diète low-carb + high-protein ou d'hyperthyroïdie.`,
    studies: [],
  },
  impact: {
    performance: {
      hypertrophy: `SHBG élevé diminue la fraction de testostérone libre, ce qui réduit le potentiel anabolique et l'hypertrophie.`,
      strength: `Un SHBG trop élevé réduit la free testosterone disponible pour soutenir la force.`,
      recovery: `Avec une free testosterone basse liée à une SHBG élevée, la récupération est souvent ralentie.`,
      bodyComp: `SHBG élevé s'associe à une baisse de free testosterone et peut rendre la recomposition plus difficile.`,
    },
    health: {
      energy: `SHBG élevé peut se traduire par une baisse de la testostérone libre et des symptômes de low T.`,
      mood: `Un SHBG élevé réduit la free testosterone et peut s'accompagner d'une baisse de motivation et de libido. Un SHBG trop bas peut favoriser un estradiol plus élevé et une instabilité hormonale.`,
      cognition: `Quand la free testosterone baisse, le focus et le drive percu peuvent diminuer. Maintenir un SHBG modéré aide a stabiliser ces ressentis.`,
      immunity: `Une free testosterone basse associee a un SHBG eleve peut reduire la resilience face au stress d'entrainement, ce qui peut fragiliser l'immunite pendant les phases de surcharge.`,
    },
    longTerm: {
      cardiovascular: `Un SHBG tres bas est souvent observe dans l'insulino resistance et peut s'associer a un profil cardiometabolique moins favorable. Un SHBG trop eleve va avec une free testosterone reduite, ce qui peut impacter la composition corporelle a long terme.`,
      metabolic: `SHBG bas est frequent en contexte d'insulino resistance, tandis qu'un SHBG tres eleve peut refleter un deficit calorique chronique ou une hyperthyroidie. L'objectif est un SHBG modere pour soutenir la sensibilite insulinique et la free testosterone.`,
      lifespan: `Avec l'age, le SHBG augmente et la free testosterone baisse. Stabiliser le SHBG dans une zone moderee aide a limiter cette baisse progressive.`,
    },
    studies: [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours",
      sleep: `Sommeil 7-9h, horaires stables. Un sommeil insuffisant augmente le stress et peut aggraver la baisse de free testosterone associee a un SHBG eleve.`,
      nutrition: `Eviter déficit calorique chronique et diète low-carb + high-protein. Maintenir un apport adéquat en micronutriments.`,
      training: `Body fat optimal 12-17 pourcent. Eviter overtraining si SHBG élevé.`,
      stress: `Reduire le stress chronique pour limiter les desequilibres hormonaux qui entretiennent un SHBG eleve.`,
      alcohol: `Limiter l'alcool chronique, facteur d'augmentation de la SHBG.`,
      expected_impact: `SHBG peut se normaliser en corrigeant déficit calorique, macros et composition corporelle.`,
    },
    phase2_supplements: {
      duration: "30-90 jours",
      supplements: [],
      budget: `Pas de supplément direct recommandé pour baisser la SHBG dans les sources.`,
      expected_impact: `Focus sur lifestyle, testostérone libre et correction des facteurs qui augmentent la SHBG.`,
    },
    phase3_retest: {
      duration: "90 jours+",
      when: `Re-test SHBG tous les 6 mois pendant optimisation.`,
      markers: `SHBG, Free Testosterone, Total Testosterone, Estradiol.`,
      success_criteria: `SHBG modéré 15-40 nmol/L et free testosterone améliorée.`,
      next_steps: `Si SHBG reste >40 nmol/L, renforcer nutrition, composition corporelle et écarter hyperthyroïdie.`,
    },
    special_cases: {
      non_responders: `Si SHBG reste >40 nmol/L apres 90 jours, verifier deficit calorique, low-carb + high-protein, alcool chronique et depister une hyperthyroidie (TSH, T3, T4).`,
      contraindications: `Eviter les strategies agressives pour baisser la SHBG sans suivi medical. Si SHBG est deja bas (<10 nmol/L), ne pas chercher a le reduire davantage.`,
      red_flags: `SHBG tres eleve (>60 nmol/L) avec symptomes low T ou SHBG tres bas (<10 nmol/L) avec signes d'insulino resistance. Dans ces cas, bilan hormonal et metabolique complet recommande.`,
    },
  },
};

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

      markers: `- Cortisol salivaire 4-points (7h, 12h, 17h, 23h)
- DHEA-S (sulfate, forme stable longue demi-vie)
- Ratio cortisol/DHEA (7h matin)
- Testostérone totale (vérifier levée inhibition cortisol)
- Glycémie jeûne + insuline (HOMA-IR, évaluer résistance insuline liée cortisol)
- TSH + T3 libre (cortisol élevé inhibe conversion T4→T3)
- CRP-us (inflammation)
- Optionnel: ACTH (si cortisol anormal, différencier primaire vs secondaire)`,

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

export const ESTRADIOL_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### Pourquoi ca compte (MPMD)

Estradiol = forme principale d'oestrogène chez l'homme.

Rôles positifs quand optimal:
- Neuroprotection (Derek: "Testosterone is NOT neuroprotective, Estrogen is")
- Santé osseuse
- Santé cardiovasculaire
- Libido
- Régulation des lipides

Problèmes si trop élevé:
- Gynécomastie
- Rétention d'eau
- Baisse de libido et dysfonction érectile
- Accumulation de graisse

Problèmes si trop bas:
- Douleurs articulaires
- Baisse de libido
- Santé osseuse dégradée
- Profil lipidique dégradé.`,
    mechanism: `Estradiol provient de l'aromatisation de la testostérone. Le body fat augmente l'aromatase et donc l'estradiol. DHT ne s'aromatise pas. Finasteride augmente l'estradiol car plus de testostérone reste disponible pour aromatisation.`,
    clinical: `Méthode de test critique: estradiol par LC/MS-MS. Eviter ECLIA (moins précis). Le ratio Testostérone totale / Estradiol est aussi utile (optimal 15:1 à 20:1).`,
    ranges: {
      optimal: `20-30 pg/mL`,
      normal: `15-20 pg/mL ou 30-35 pg/mL`,
      suboptimal: `<15 pg/mL ou >40 pg/mL`,
      critical: `>40 pg/mL (trop élevé) ou <15 pg/mL (trop bas)`,
      interpretation: `Un estradiol trop élevé favorise gynécomastie, rétention d'eau et baisse de libido. Un estradiol trop bas cause douleurs articulaires, baisse libido et santé osseuse dégradée.`,
    },
    variations: `Body fat élevé augmente l'aromatase et l'estradiol. Body fat trop bas peut aussi faire chuter l'estradiol.`,
    studies: [],
  },
  impact: {
    performance: {
      hypertrophy: `Un estradiol trop élevé s'associe à une accumulation de graisse et un environnement hormonal défavorable.`,
      strength: `Un estradiol trop bas peut s'accompagner de douleurs articulaires et limiter les charges.`,
      recovery: `Profil estradiol déséquilibré s'associe à récupération plus difficile.`,
      bodyComp: `Estradiol trop élevé favorise rétention d'eau et accumulation de graisse.`,
    },
    health: {
      energy: `Libido et vitalité sont affectées quand estradiol est trop haut ou trop bas.`,
      mood: `Un estradiol trop haut peut s'accompagner d'irritabilite et de retention d'eau, tandis qu'un estradiol trop bas est souvent associe a une baisse de bien-etre et de libido.`,
      cognition: `Neuroprotection mentionnée par Derek: estradiol joue un role protecteur.`,
      immunity: `Un estradiol dans une zone moderee aide a maintenir un equilibre inflammatoire. Les extremes peuvent s'accompagner d'un profil inflammatoire moins favorable.`,
    },
    longTerm: {
      cardiovascular: `Estradiol optimal soutient la santé cardiovasculaire.`,
      metabolic: `Estradiol intervient dans la régulation des lipides selon les sources.`,
      lifespan: `Un estradiol stable et modere aide a preserver la sante osseuse et cardiovasculaire a long terme.`,
    },
    studies: [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours",
      sleep: `Sommeil regulier 7-9h pour limiter le stress physiologique et soutenir l'equilibre hormonal.`,
      nutrition: `Si estradiol trop élevé: crucifères (DIM/I3C), fibres pour élimination estrogènes, zinc. Eviter xénoestrogènes (BPA, phtalates, parabènes, pesticides).`,
      training: `Optimiser body fat: moins d'aromatase, estradiol plus bas.`,
      stress: `Reduire le stress chronique qui peut amplifier l'aromatase et desequilibrer l'estradiol.`,
      alcohol: `Limiter l'alcool, qui augmente l'aromatase hepatique et favorise un estradiol plus eleve.`,
      expected_impact: `Baisse progressive de l'estradiol si body fat et alimentation sont optimisés.`,
    },
    phase2_supplements: {
      duration: "30-90 jours",
      supplements: [
        {
          name: "DIM (Diindolylmethane)",
          dosage: "100-200 mg/jour",
          timing: "Avec un repas",
          brand: "NOW Foods, Thorne, Jarrow",
          mechanism: "Favorise le métabolisme des estrogènes vers des métabolites plus favorables.",
          studies: [],
        },
        {
          name: "Zinc",
          dosage: "25-50 mg/jour",
          timing: "Avec un repas",
          brand: "Thorne, Pure Encapsulations, NOW Foods",
          mechanism: "Inhibition modérée de l'aromatase.",
          studies: [],
        },
        {
          name: "Calcium D-Glucarate",
          dosage: "500-1000 mg/jour",
          timing: "Avec un repas",
          brand: "NOW Foods, Life Extension",
          mechanism: "Réduit la réabsorption des estrogènes dans l'intestin.",
          studies: [],
        },
      ],
      budget: `Budget variable selon marques, souvent 20 a 40 euros par mois pour DIM, zinc et calcium D-glucarate.`,
      expected_impact: `Réduction de l'estradiol si élevé et meilleur équilibre avec la testostérone.`,
    },
    phase3_retest: {
      duration: "6-8 semaines",
      when: `Attendre 6-8 semaines avant re-test après changement de protocole.`,
      markers: `Estradiol (LC/MS-MS), Testosterone totale, Free testosterone.`,
      success_criteria: `Estradiol 20-30 pg/mL et ratio Testostérone/Estradiol 15:1 à 20:1.`,
      next_steps: `Si estradiol trop bas, arrêter tout AI et réévaluer la testostérone et le body fat.`,
    },
    special_cases: {
      non_responders: `Si estradiol trop bas persistant: vérifier testostérone totale, body fat très bas, arrêt des AI.`,
      contraindications: `Aromatase inhibitors uniquement sous supervision médicale.`,
      red_flags: `Gynécomastie progressive, estradiol >40 pg/mL avec symptômes persistants, douleurs articulaires sévères si estradiol <15 pg/mL.`,
    },
  },
};

export const VITAMINE_D_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### Pourquoi ca compte

Masterjohn:
"Vitamin D is required to incorporate iron into steroid-producing enzymes correctly."

Roles pour musculation:
- Synthèse testostérone (cofacteur)
- Force musculaire
- Fonction immunitaire
- Santé osseuse
- Effet anti-inflammatoire

Déficience vitamine D:
- Très fréquente
- Baisse de testostérone
- Baisse de force et récupération
- Inflammation accrue.`,
    mechanism: `Vitamine D agit comme cofacteur des enzymes stéroïdogènes et soutient la fonction musculaire via les récepteurs de la vitamine D dans le muscle.`,
    clinical: `La 25-OH vitamine D est la mesure standard. Les déficiences sont fréquentes et se traduisent par une baisse de performance et de testostérone.`,
    ranges: {
      optimal: `40-60 ng/mL`,
      normal: `30-40 ng/mL`,
      suboptimal: `20-30 ng/mL`,
      critical: `<20 ng/mL`,
      interpretation: `Pour la performance, viser 40-60 ng/mL. <30 ng/mL est insuffisant et <20 ng/mL est une vraie carence.`,
    },
    variations: `Variations saisonnieres marquees: statut plus bas en hiver et aux latitudes elevees. Exposition solaire 15-30 min/jour en milieu de journee peut faire monter le 25-OH-D, mais l'hiver ou en zone nord la supplementation devient necessaire.`,
    studies: [],
  },
  impact: {
    performance: {
      hypertrophy: `La vitamine D soutient la synthèse de testostérone et la fonction musculaire.`,
      strength: `Une vitamine D optimale favorise la force musculaire.`,
      recovery: `La vitamine D aide la récupération et limite l'inflammation.`,
      bodyComp: `Un statut vitamin D adequate soutient la masse musculaire et limite l'inflammation, ce qui facilite la recomposition corporelle.`,
    },
    health: {
      energy: `Carence en vitamine D s'associe à une baisse d'énergie et de performance.`,
      mood: `Une carence persistante s'accompagne souvent d'une baisse de bien-etre general, tandis qu'un statut corrige soutient la vitalite.`,
      cognition: `Un statut optimal soutient la clarté mentale en limitant la fatigue liee aux carences.`,
      immunity: `Vitamine D soutient la fonction immunitaire.`,
    },
    longTerm: {
      cardiovascular: `Un statut adequat soutient la sante osseuse et limite l'inflammation, facteurs indirects d'un profil cardiovasculaire favorable.`,
      metabolic: `Un statut optimal aide a maintenir une function musculaire et hormonale stable, utile pour l'equilibre metabolique.`,
      lifespan: `Maintenir 25-OH-D dans la zone cible favorise la resilence physiologique a long terme.`,
    },
    studies: [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours",
      sleep: `Sommeil regulier 7-9h pour soutenir la recuperation et l'equilibre hormonal.`,
      nutrition: `Exposition solaire 15-30 min/jour sans protection quand possible. En hiver ou latitudes nord: supplémentation requise.`,
      training: `Favoriser des sessions outdoor quand possible pour augmenter l'exposition solaire.`,
      stress: `Reduire le stress chronique pour soutenir la recuperation globale.`,
      alcohol: `Limiter l'alcool, qui degrade la recuperation et la qualite du sommeil.`,
      expected_impact: `Amélioration progressive du statut 25-OH-D avec soleil ou supplémentation.`,
    },
    phase2_supplements: {
      duration: "8-12 semaines",
      supplements: [
        {
          name: "Vitamine D3",
          dosage: "5000-10000 IU/jour si <30 ng/mL, puis 2000-4000 IU/jour maintenance",
          timing: "Avec repas contenant graisses",
          brand: "NOW Foods, Thorne, Doctor's Best",
          mechanism: "Correction rapide du déficit puis maintenance pour stabiliser 25-OH-D.",
          studies: [],
        },
        {
          name: "Vitamine K2 (MK-7)",
          dosage: "100-200 mcg/jour",
          timing: "Avec la vitamine D",
          brand: "NOW Foods, Life Extension",
          mechanism: "Synergie osseuse et prévention de la calcification.",
          studies: [],
        },
        {
          name: "Magnésium",
          dosage: "400-600 mg/jour",
          timing: "Soir",
          brand: "Doctor's Best, Thorne, Pure Encapsulations",
          mechanism: "Cofacteur pour la conversion de la vitamine D.",
          studies: [],
        },
      ],
      budget: `Budget mensuel estimatif 15 a 30 euros selon les marques et les doses.`,
      expected_impact: `Correction du déficit en 8-12 semaines puis maintenance 2000-4000 IU/jour.`,
    },
    phase3_retest: {
      duration: "3 mois",
      when: `Re-tester 25-OH-D après 3 mois de correction.`,
      markers: `25-OH Vitamin D`,
      success_criteria: `25-OH-D entre 40 et 60 ng/mL.`,
      next_steps: `Ajuster la dose selon le résultat et maintenir 2000-4000 IU/jour.`,
    },
    special_cases: {
      non_responders: `Si 25-OH-D reste bas apres 8-12 semaines, verifier adherence, absorption digestive, BMI eleve et ajuster la dose.`,
      contraindications: `Eviter les doses elevees en cas d'hypercalcemie, sarcoidose ou insuffisance renale severe sans suivi medical.`,
      red_flags: `25-OH-D >100 ng/mL ou symptomes d'hypercalcemie. Dans ce cas, reduire ou arreter la supplementation et recontroler.`,
    },
  },
};

export const GLYCEMIE_JEUN_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### C'est quoi exactement?

La glycémie à jeun mesure la concentration de glucose (sucre) dans le plasma sanguin après un jeûne nocturne de 8-12 heures, reflétant l'homéostasie glucidique basale, indépendante de l'apport alimentaire récent. Ce marqueur évalue principalement la production hépatique de glucose (gluconéogenèse et glycogénolyse) et la sensibilité basale à l'insuline des tissus périphériques (muscle, foie, tissu adipeux).

Chez l'individu sain, le glucose sanguin est maintenu dans une fourchette étroite (70-100 mg/dL ou 3.9-5.6 mmol/L) grâce à un équilibre délicat entre production hépatique, utilisation périphérique, et sécrétion d'hormones régulatrices (insuline, glucagon, cortisol, hormone de croissance). Durant le jeûne nocturne, l'insulinémie basale basse permet une lipolyse modérée (mobilisation graisses) tout en maintenant une gluconéogenèse hépatique suffisante pour alimenter le cerveau (120-140g glucose/jour obligatoire, neurones glucose-dépendants).

La glycémie à jeun est le test de screening diabète de première ligne, complété par HbA1c et test de tolérance au glucose oral (OGTT) si anormal. C'est aussi un marqueur prédictif puissant de risque cardiovasculaire, syndrome métabolique, et longévité, bien au-delà du simple diagnostic diabète.

Pour l'athlète et le biohacker, maintenir une glycémie à jeun dans le bas de la fourchette normale (75-85 mg/dL) reflète une sensibilité insuline optimale, partition efficace des nutriments (glucose vers muscle vs graisse), flexibilité métabolique (capacité switch glucose/lipides), et résilience métabolique long-terme.`,
    mechanism: `#### Mécanisme physiologique

La régulation glycémique jeûne implique plusieurs systèmes:

**Production hépatique glucose**: En l'absence d'apport alimentaire, le foie maintient glycémie via deux voies:
1. **Glycogénolyse** (0-8h jeûne): Dégradation glycogène hépatique (réserves ~100g) par glycogène phosphorylase, libérant glucose. Épuisement progressif après 8-12h.
2. **Gluconéogenèse** (>8h jeûne): Synthèse de novo de glucose à partir de substrats non-glucidiques (lactate, alanine, glycérol). Enzymes clés: PEPCK, G6Pase. Devient voie prédominante après 12-16h jeûne.

Le glucagon (hormone pancréatique α-cellulaire) stimule glycogénolyse et gluconéogenèse hépatiques. Ratio insuline/glucagon bas durant jeûne favorise catabolisme (lipolyse, gluconéogenèse).

**Sensibilité insuline**: Même à jeun, sécrétion basale insuline (5-15 μU/mL) existe pour:
- Inhiber production hépatique glucose excessive (frein gluconéogenèse)
- Permettre captation glucose basale muscle/adipocytes (GLUT4 translocation minimale)
- Inhiber lipolyse excessive (éviter cétose)

Chez le résistant à l'insuline, le foie devient insensible à l'effet inhibiteur de l'insuline → production hépatique glucose augmentée malgré insulinémie normale/élevée → glycémie à jeun ↑ (100-125 mg/dL = prédiabète). C'est le premier signe détectable de dysfonction métabolique, précédant hyperglycémie post-prandiale de 5-10 ans.

**Contre-régulation**: Cortisol (pic matinal 6-8h), hormone de croissance (sécrétion pulsatile nocturne), et catécholamines stimulent glycogénolyse/gluconéogenèse et réduisent sensibilité insuline périphérique (favorisant lipolyse). Ces hormones contre-régulatrices préviennent hypoglycémie durant jeûne prolongé mais, si chroniquement élevées (stress, manque sommeil, surentraînement), contribuent à glycémie jeûne élevée.

**Phénomène de l'aube** (Dawn phenomenon): Élévation physiologique glycémie matinale (6-9h) due au pic cortisol + GH, induisant résistance insuline transitoire. Chez diabétique, exagéré (glycémie +20-40 mg/dL vs nocturne). Chez athlète, minimisé par sensibilité insuline élevée.`,
    clinical: `#### Contexte clinique

Classification ADA (American Diabetes Association 2023):
- **Normal**: <100 mg/dL (<5.6 mmol/L)
- **Prédiabète (IFG = Impaired Fasting Glucose)**: 100-125 mg/dL (5.6-6.9 mmol/L)
- **Diabète**: ≥126 mg/dL (≥7.0 mmol/L) sur 2 dosages séparés

Cependant, pour optimisation métabolique et performance, ranges plus stricts:
- **Optimal biohacking**: 70-85 mg/dL (3.9-4.7 mmol/L)
- **Acceptable**: 85-95 mg/dL (4.7-5.3 mmol/L)
- **Suboptimal**: 95-99 mg/dL (5.3-5.5 mmol/L) - "Normal-haut", déjà résistance insuline débutante
- **Red flag**: ≥100 mg/dL - Prédiabète officiel

Données épidémiologiques montrent risque cardiovasculaire et mortalité augmentent linéairement dès 85 mg/dL, sans seuil franc. Étude DECODE (2001, Lancet), 25,000 sujets: chaque 18 mg/dL ↑ glycémie à jeun = +27% risque mortalité CV, même dans range "normal" <100 mg/dL.

Athlètes d'endurance et individus metabolically healthy ont souvent glycémies jeûne 65-80 mg/dL (flexibilité métabolique élevée, capacité oxyder lipides, glycogène épargne). Bodybuilders/powerlifters en surplus calorique chronique peuvent montrer 90-100 mg/dL (apport glucides élevé, insulinémie basale plus haute, normal pour contexte).

**Conditions dosage optimal**:
- **Jeûne strict**: 8-12h (eau permise, pas café/thé/gomme)
- **Heure**: 7-9h (avant pic cortisol maximal 9-11h qui élève glycémie)
- **Repos**: Éviter exercice intense 12-24h avant (glycogénolyse post-effort élève glycémie transitoirement)
- **Hydratation**: Normale (déshydratation concentre glucose, fausse élévation)

Associer dosage insuline jeûne pour calculer HOMA-IR (index résistance insuline = (glycémie × insuline)/405). HOMA-IR <1 = excellent, 1-2 = normal, >2 = résistance insuline.`,
    ranges: {
      optimal: `70-85 mg/dL (3.9-4.7 mmol/L) - Optimal biohacking`,
      normal: `85-95 mg/dL (4.7-5.3 mmol/L) - Acceptable`,
      suboptimal: `95-99 mg/dL (5.3-5.5 mmol/L) - Normal-haut`,
      critical: `≥126 mg/dL (≥7.0 mmol/L) sur 2 dosages séparés - Diabète`,
      interpretation: `**Normal (ADA)**: <100 mg/dL (<5.6 mmol/L)
**Prédiabète (IFG)**: 100-125 mg/dL (5.6-6.9 mmol/L)
**Diabète**: ≥126 mg/dL (≥7.0 mmol/L) sur 2 dosages séparés
**Optimal biohacking**: 70-85 mg/dL (3.9-4.7 mmol/L)
**Acceptable**: 85-95 mg/dL (4.7-5.3 mmol/L)
**Suboptimal**: 95-99 mg/dL (5.3-5.5 mmol/L) - Normal-haut
**Red flag**: ≥100 mg/dL - Prédiabète officiel`,
    },
    variations: `#### Variations physiologiques

**Variations circadiennes**: Glycémie minimale 2-4h du matin (nadir nocturne), remontée 6-9h (phénomène aube). Importance standardiser heure prélèvement (7-9h optimal).

**Effets stress/sommeil**: Privation sommeil aiguë (<5h une nuit) élève glycémie jeûne +10-15 mg/dL (↑cortisol, ↑résistance insuline). Stress chronique idem (activation axe HPA, glucocorticoïdes ↑ gluconéogenèse).

**Impact exercice**:
- **Exercice résistance/HIIT récent (<12h)**: Peut élever glycémie jeûne +5-10 mg/dL (glycogénolyse post-effort, repletion glycogène en cours, ↑cortisol/catécholamines)
- **Endurance chronique (marathoniens)**: Glycémies jeûne typiquement basses (70-85 mg/dL), adaptation métabolique oxydation lipides, sensibilité insuline élevée

**Variations alimentaires**:
- **Low-carb/keto**: Glycémies jeûne souvent 65-80 mg/dL après adaptation (2-4 semaines), parfois paradoxalement 90-100 mg/dL initial (gluconéogenèse accrue transitoire)
- **High-carb**: Glycémies jeûne 85-95 mg/dL typiques si sensibilité insuline préservée

**Âge**: Augmentation progressive avec vieillissement (+1-2 mg/dL par décennie après 40 ans) due à ↓sensibilité insuline, ↓masse musculaire (principal sink glucose), ↑graisse viscérale.

---`,
    studies: [],
  },
  impact: {
    performance: {
      hypertrophy: `**Partition nutriments et composition corporelle**

Glycémie jeûne basse-normale (75-85 mg/dL) reflète sensibilité insuline élevée, déterminant critique de la partition des nutriments post-prandiale: calories dirigées vers muscle (glycogène, protéines) vs tissu adipeux (triglycérides).

Étude Koopman et al. (2005): athlètes glycémie jeûne <85 mg/dL + HOMA-IR <1 montrent +40% stockage glycogène musculaire post-meal vs sujets 95-100 mg/dL + HOMA-IR >2, à apport glucidique identique. Insulinosensibles "gaspillent" moins de glucides en graisse, optimisant recomp.

Implication pratique: glycémie jeûne <85 mg/dL permet tolérancer surplus calorique +20-30% sans gain graisse excessif (nutrient partitioning efficace). Glycémie >95 mg/dL = chaque surplus → stockage adipeux préférentiel.`,
      strength: `**Énergie et performance cognitive**

Paradoxalement, glycémies jeûne basses (mais non hypoglycémiques, >65 mg/dL) s'associent à meilleure énergie et clarté mentale que glycémies "normales-hautes" 95-100 mg/dL. Mécanisme: flexibilité métabolique.

Individus glycémie <85 mg/dL utilisent efficacement lipides comme fuel (β-oxydation), épargnant glucose pour cerveau, évitant fluctuations glycémiques post-prandiales (crash énergétique). Ceux >95 mg/dL = glucose-dépendants, crashs fréquents entre repas, fringales.

Données sportifs: athlètes endurance glycémie jeûne <80 mg/dL rapportent +30% énergie stable journée entière vs >90 mg/dL (questionnaires validés Vist et al. 2003).`,
      recovery: `**Récupération et inflammation**

Hyperglycémie chronique (même "subclinique" 100-110 mg/dL) induit stress oxydatif, glycation protéines, inflammation bas-grade (↑CRP, ↑IL-6). Glycémie >100 mg/dL = environnement pro-inflammatoire ralentissant récupération musculaire.

Étude Stephens et al. (2011): sujets prédiabétiques (glycémie 100-125 mg/dL) montrent récupération post-exercice excentrique 30% ralentie vs normoglycémiques (<95 mg/dL), marqueurs inflammatoires persistants 72h vs 24h.

Optimiser glycémie jeûne <90 mg/dL = anti-inflammatoire naturel, récupération accélérée, adaptations training optimisées.`,
      bodyComp: ``,
    },
    health: {
      energy: `**Risque diabète type 2**

Relation dose-répondant linéaire sans seuil: chaque 10 mg/dL ↑ glycémie jeûne (même <100 mg/dL) = +20-30% risque diabète à 10 ans. Étude Diabetes Prevention Program (DPP, 2002): sujets glycémie jeûne 95-99 mg/dL ont risque diabète ×3 vs <85 mg/dL, malgré "normalité" clinique.

Progression typique:
1. Glycémie <85 mg/dL: Métabolisme optimal
2. 85-94 mg/dL: Résistance insuline débutante, compensation pancréatique (↑insuline maintient glycémie normale)
3. 95-99 mg/dL: Résistance insuline établie, compensation partielle
4. 100-125 mg/dL: Prédiabète, échec compensation (cellules β épuisées)
5. ≥126 mg/dL: Diabète franc

Fenêtre intervention optimale: 85-100 mg/dL, avant dommages irréversibles cellules β pancréatiques.`,
      mood: `**Santé cardiovasculaire**

Glycémie à jeun = facteur risque CV indépendant. Méta-analyse Sarwar et al. (2010, Lancet), 698,782 participants: chaque 18 mg/dL ↑ glycémie = +18% risque coronarien, +13% AVC, même après ajustement autres facteurs (cholestérol, TA, tabac).

Mécanismes:
- **Glycation protéines**: Glucose réagit spontanément avec lysines protéiques → AGEs (Advanced Glycation End-products) → dysfonction endothéliale, rigidité artérielle
- **Stress oxydatif**: Hyperglycémie ↑ ROS mitochondriaux → dommages vasculaires
- **Inflammation**: Glycémie >95 mg/dL ↑ CRP, TNF-α, molécules adhésion
- **Dyslipidémie**: Résistance insuline → ↑triglycérides, ↓HDL, ↑LDL small-dense (athérogène)

Cible cardioprotection: glycémie jeûne <90 mg/dL. Chaque 5 mg/dL baisse = -8% risque infarctus (Khaw et al. 2004, EPIC-Norfolk).`,
      cognition: `**Longévité**

Données centenaires: glycémies jeûne moyennes 75-85 mg/dL à 60-70 ans, significativement inférieures à population générale (90-95 mg/dL). Étude Okinawa Centenarian Study: glycémie jeûne médiane 82 mg/dL chez centenaires vs 94 mg/dL contrôles âge 70 ans.

Restriction calorique (seule intervention prolongeant lifespan chez mammifères) abaisse glycémie jeûne de 10-15 mg/dL chroniquement. Hypothèse: glycémie basse = marqueur restriction énergétique, activation AMPK, autophagie, hormesis.`,
      immunity: ``,
    },
    longTerm: {
      cardiovascular: `**Complications microvasculaires**

Hyperglycémie chronique (glycémie >100 mg/dL années) = principal driver rétinopathie, néphropathie, neuropathie diabétiques. Même prédiabète (100-125 mg/dL) sur 10+ ans induit dommages microvasculaires.

Mécanisme: glycation hémoglobine (HbA1c) et autres protéines longue demi-vie (collagène, myéline) → AGEs → dysfonction tissulaire irréversible.

Prévention: maintenir glycémie <95 mg/dL long-terme élimine quasi-totalement risque complications microvasculaires (DCCT trial 1993).`,
      metabolic: `**Déclin cognitif**

Relation glycémie - Alzheimer bien établie. Diabète type 2 = risque démence ×2. MAIS glycémies "normales-hautes" (95-99 mg/dL) s'associent aussi à déclin cognitif accéléré et atrophie hippocampale.

Étude Crane et al. (2013, NEJM): chaque 10 mg/dL ↑ glycémie jeûne (même <100 mg/dL) = +18% risque démence sur 7 ans suivi. Glycémie moyenne 115 mg/dL (prédiabète) = atrophie hippocampe -6% vs 85 mg/dL.

Mécanismes: AGEs, inflammation cérébrale, résistance insuline cérébrale (cerveau = organe insulino-sensible), dysfonction mitochondriale neuronale.

Neuroprotection: glycémie <90 mg/dL + variabilité glycémique faible (pas de pics post-prandiaux >140 mg/dL).

---`,
      lifespan: ``,
    },
    studies: [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: `0-30 jours`,
      sleep: `#### Phase 1: Lifestyle (0-30 jours)

**Timing et composition glucidique**

Objectif: améliorer sensibilité insuline, réduire glycémie jeûne de 95-100 → 75-85 mg/dL.

**Structure macros**:
- **Glucides**: 2-4 g/kg/jour (modéré, pas keto ni high-carb extrême)
- **Focus qualité**: Index glycémique bas (patates douces, riz basmati, avoine, quinoa vs pain blanc, céréales sucrées)
- **Timing**: 60-70% glucides dans fenêtre péri-training (2h pré + 4h post) quand sensibilité insuline maximale
- **Soir**: Limiter glucides <30g dîner (favorise lipolyse nocturne, ↓glycémie jeûne matinale)

**Éviter**: Glucides simples isolés (jus de fruits, sodas, bonbons), pics glycémiques >160 mg/dL (↑ résistance insuline compensatoire).

**Fibres**: 30-40g/jour (légumes, légumineuses, avoine). Ralentissent absorption glucose, ↑ satiété, ↓ glycémie post-prandiale -15-20%.

**Jeûne intermittent** (optionnel mais puissant):
- **16:8**: Fenêtre alimentaire 12h-20h, jeûne 20h-12h. Améliore sensibilité insuline +20-30% en 4-6 semaines
- **Mécanisme**: Période jeûne prolongée ↓ insulinémie basale, ↑ autophagie, ↑ flexibilité métabolique
- **Résultats**: Glycémie jeûne -8-12 mg/dL en 8 semaines (Sutton et al. 2018)

**Marche post-prandiale**

Intervention ultra-simple, impact massif: 10-15 min marche légère dans les 30 min suivant chaque repas (surtout déjeuner/dîner).

Mécanisme: contraction musculaire → translocation GLUT4 insulino-indépendante → captation glucose périphérique ↑ → pic glycémique post-prandial réduit -20-30 mg/dL.

Étude Reynolds et al. (2016): 3×15min marches post-prandiales réduisent glycémie moyenne 24h de -12% et glycémie jeûne de -8 mg/dL après 2 semaines vs sédentarité.

Pratique: marche 1500-2000 pas (10-15min) immédiatement après repas riche glucides. Effet aigu + chronique (sensibilité insuline ↑ long-terme).

**Entraînement résistance**

Musculation = #1 intervention sensibilité insuline. Muscle = sink glucose principal (70-80% captation post-prandiale). ↑ masse musculaire = ↑ capacité stockage glycogène = ↓ glycémie basale.

Protocole optimal:
- Fréquence: 3-5×/semaine
- Type: Composés lourds (squat, deadlift, bench, rows) + isolation
- Volume: 12-20 séries/groupe musculaire/semaine
- Intensité: 70-85% 1RM, 6-12 reps

Résultats: 12 semaines résistance training → glycémie jeûne -10-15 mg/dL + HOMA-IR -30-40% (Bweir et al. 2009).

Mécanisme: hypertrophie → ↑ GLUT4 musculaire, ↑ densité mitochondriale, ↑ captation glucose insulino-stimulée ET basale.

**Sommeil et stress**

Privation sommeil = résistance insuline aiguë. Une seule nuit <5h élève glycémie jeûne +10-15 mg/dL (Donga et al. 2010).

Objectif sommeil: 7h30-8h30/nuit, qualité optimale (profond + REM).

Stress chronique (cortisol élevé) stimule gluconéogenèse hépatique → glycémie jeûne ↑. Techniques gestion stress: méditation 15min/jour, cohérence cardiaque, coupures travail.

**Résultats attendus Phase 1** (30 jours):

Glycémie baseline 98 mg/dL → Cible 85 mg/dL:
- J+15: -4-6 mg/dL (92-94 mg/dL) via marches post-prandiales + timing glucides
- J+30: -8-12 mg/dL (86-90 mg/dL) si training + jeûne intermittent + sommeil optimisés

Bonus: HOMA-IR -20-30%, énergie stable, fringales disparition.`,
      nutrition: ``,
      training: ``,
      stress: ``,
      alcohol: ``,
      expected_impact: ``,
    },
    phase2_supplements: {
      duration: `30-90 jours`,
      supplements: [],
      budget: `40-60€/mois (berbérine + ALA + magnésium + cannelle)`,
      expected_impact: `#### Phase 2: Suppléments (30-90 jours)

**Berbérine**: 500mg × 3/jour (1500mg total)

Alcaloïde végétal, efficacité comparable metformine pour ↓ glycémie (méta-analyse Yin et al. 2008). Mécanismes: activation AMPK, ↓ gluconéogenèse hépatique, ↑ captation glucose musculaire, modulation microbiote.

Timing: 500mg immédiatement avant 3 repas principaux.

Brand: Thorne, Pure Encapsulations, Life Extension (standardisé 97-98% berbérine HCl).

Résultats: -15-20 mg/dL glycémie jeûne en 8-12 semaines (Zhang et al. 2008).

Précautions: Interactions médicamenteuses (CYP450), éviter si metformine déjà prescrite. GI upset possible (diarrhée légère), réduire si nécessaire.

**Acide alpha-lipoïque (ALA)**: 600mg/jour

Antioxydant, mimétique insuline. Améliore captation glucose GLUT4, réduit stress oxydatif. Particulièrement efficace chez résistants insuline.

Timing: 600mg matin à jeun (absorption optimale).

Brand: NOW Foods, Doctor's Best (forme R-ALA biodisponibilité supérieure si budget permet).

Résultats: -8-12 mg/dL glycémie jeûne (Ziegler et al. 2004), +20-30% sensibilité insuline.

**Cannelle (Cinnamomum cassia)**: 1-3g/jour

Potentialise signaling insuline, ralentit vidange gastrique. Efficacité modeste mais coût nul.

Timing: 1g saupoudré café/smoothie matin, ou capsules 500mg × 2.

Résultats: -5-8 mg/dL glycémie jeûne (méta-analyse Allen et al. 2013).

**Chrome picolinate**: 200-400mcg/jour (si déficitaire)

Cofacteur récepteur insuline. Efficace uniquement si déficit chrome (rare, mais possible athlètes haute sudation).

Timing: 200mcg matin.

Brand: Thorne, NOW Foods.

Résultats: -10-15 mg/dL si déficitaire, 0 si suffisant (Anderson et al. 1997).

**Magnésium**: 400-500mg/jour (bisglycinate)

Cofacteur >300 enzymes dont tyrosine kinase récepteur insuline. Déficit (50% population) = résistance insuline.

Timing: 400mg soir (bonus: meilleur sommeil).

Résultats: -4-8 mg/dL glycémie, +15-20% sensibilité insuline si déficitaire (Guerrero-Romero et al. 2004).

**Budget total**: 40-60€/mois (berbérine + ALA + magnésium + cannelle)

**Résultats cumulés Phase 1+2** (90 jours):

Glycémie baseline 98 mg/dL:
- Phase 1 (lifestyle): -8-12 mg/dL → 86-90 mg/dL
- Phase 2 (suppléments): -10-15 mg/dL additionnels → 75-80 mg/dL (CIBLE)

HOMA-IR: 2.5 → <1.0 (excellent)`,
    },
    phase3_retest: {
      duration: `90 jours+`,
      when: `#### Phase 3: Retest (90 jours+)

**Marqueurs retest**:
- Glycémie jeûne: Cible <85 mg/dL
- Insuline jeûne: Cible <10 μU/mL
- HOMA-IR: Cible <1.5 (idéal <1.0)
- HbA1c: Cible <5.4% (voir section suivante)
- Lipides: TG/HDL ratio <2.0 (marqueur indirect sensibilité insuline)

**Critères succès**:
- ✅ Glycémie: <85 mg/dL
- ✅ HOMA-IR: <1.5
- ✅ Symptômes: énergie stable, 0 fringales, composition corporelle améliorée

**Si glycémie reste >90 mg/dL à J+90**:

Investiguer:
1. **Compliance**: Vérifier timing glucides, marches post-prandiales effectives, sommeil >7h
2. **Stress chronique**: Cortisol salivaire 4-points (exclure dysfonction HPA)
3. **Apnée sommeil**: Si obésité/ronflement → polysomnographie (fragmentation sommeil = résistance insuline)
4. **Stéatose hépatique**: Échographie abdominale (NAFLD = cause fréquente résistance insuline)
5. **Hypothyroïdie**: TSH, T3, T4 (métabolisme ralenti → dysglycémie)

Action: Intensifier interventions (keto 4-8 semaines pour reset métabolique, metformine prescription si HOMA-IR >2.5 persistant).

**Red flags**:
- Glycémie jeûne ≥126 mg/dL × 2 dosages: Diabète, consultation endocrino urgente
- Glycémie >100 mg/dL + symptômes (polyurie, polydipsie, perte poids): Dosage glycémie aléatoire, HbA1c immédiat
- Hypoglycémies récurrentes <60 mg/dL: Investigation insulinome, dumping syndrome post-chirurgie

---`,
      markers: ``,
      success_criteria: ``,
      next_steps: ``,
    },
    special_cases: {
      non_responders: ``,
      contraindications: ``,
      red_flags: ``,
    },
  },
};

export const HBA1C_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `#### C'est quoi exactement?

L'HbA1c (hémoglobine A1c ou hémoglobine glyquée) mesure le pourcentage d'hémoglobine érythrocytaire ayant subi une glycation non-enzymatique, c'est-à-dire une liaison irréversible du glucose aux résidus lysine et valine des chaînes β-globine. Ce processus de glycation est lent, spontané, proportionnel à l'exposition chronique au glucose: plus la glycémie moyenne est élevée sur une période prolongée, plus le pourcentage d'HbA1c augmente.

L'HbA1c reflète la glycémie moyenne des 2-3 derniers mois, pondérée par la durée de vie des globules rouges (120 jours). Plus précisément: 50% du signal HbA1c provient du dernier mois, 25% du 2ème mois, 25% du 3ème mois. C'est donc un marqueur d'exposition glycémique chronique, complémentaire de la glycémie à jeun (snapshot instantané) et de la glycémie post-prandiale (stress glycémique aigu).

Contrairement à la glycémie qui fluctue heure par heure (repas, exercice, stress), l'HbA1c est stable, non influencée par le jeûne, l'heure de prélèvement, ou l'activité récente. Cela en fait un gold standard pour:
1. **Diagnostic diabète**: HbA1c ≥6.5% (48 mmol/mol) = diabète type 2
2. **Monitoring contrôle glycémique**: Chez diabétiques traités
3. **Prédiction complications**: HbA1c corrèle fortement avec risque rétinopathie, néphropathie, neuropathie, CV
4. **Optimisation métabolique**: Chez athlètes/biohackers, cible <5.0-5.3% pour longévité

Pour l'athlète, l'HbA1c révèle la véritable charge glycémique chronique, au-delà des glycémies jeûne "normales". Un athlète peut avoir glycémie jeûne 85 mg/dL (excellent) mais HbA1c 5.8% (suboptimal), indiquant pics post-prandiaux excessifs (>160-180 mg/dL) ou variabilité glycémique élevée, invisible au dosage jeûne isolé.`,
    mechanism: `#### Mécanisme physiologique

**Processus de glycation**: Le glucose circulant réagit spontanément (réaction de Maillard) avec les groupements amine libres (-NH2) des résidus lysine de l'hémoglobine. Cette réaction produit d'abord une base de Schiff instable (aldimine), puis se réarrange en cétoamine stable (fructosamine, dont HbA1c fait partie). La réaction est:
- **Irréversible**: Une fois formée, HbA1c persiste pendant toute la vie du globule rouge (120j)
- **Non-enzymatique**: Pas de régulation biologique, purement chimique, proportionnelle [glucose]
- **Lente**: Constante de vitesse faible, équilibre atteint en 6-8 semaines

**Relation HbA1c - glycémie moyenne**: Formule de conversion approximative (Nathan et al. 2008, A1C-Derived Average Glucose Study):

**Glycémie moyenne (mg/dL) = (HbA1c% × 28.7) - 46.7**

Exemples:
- HbA1c 5.0% → Glycémie moyenne ~97 mg/dL
- HbA1c 5.5% → Glycémie moyenne ~111 mg/dL
- HbA1c 6.0% → Glycémie moyenne ~126 mg/dL
- HbA1c 7.0% → Glycémie moyenne ~154 mg/dL

**Limites de la relation**: Variabilité interindividuelle ±15-20 mg/dL pour même HbA1c, due à:
- Durée vie GR variable (anémie, hémolyse, altitude → GR jeunes → HbA1c sous-estime)
- Variabilité glycémique: 2 individus même glycémie moyenne mais l'un stable, l'autre avec pics/nadirs → HbA1c similaire mais risque différent
- Génétique: Polymorphismes hémoglobine (HbS, HbC, HbE) interfèrent avec dosage

**Facteurs confondants HbA1c**:
- **Anémie ferriprive**: ↑ HbA1c (GR plus vieux)
- **Hémolyse, saignements**: ↓ HbA1c (GR plus jeunes)
- **Altitude**: ↓ HbA1c (polyglobulie, turnover GR accéléré)
- **Supplémentation fer récente**: ↓ HbA1c transitoire (nouveaux GR non glyqués)
- **Insuffisance rénale**: ↑ HbA1c (urémie carbamyle hémoglobine, fausse élévation)`,
    clinical: `#### Contexte clinique

**Guidelines ADA (2023)**:
- **Normal**: <5.7% (<39 mmol/mol)
- **Prédiabète**: 5.7-6.4% (39-47 mmol/mol)
- **Diabète**: ≥6.5% (≥48 mmol/mol) sur 2 dosages

**Cibles diabétiques traités**:
- **Standard**: <7.0% (réduction complications microvasculaires)
- **Strict**: <6.0-6.5% si jeune, pas complications, hypoglycémies tolérées
- **Relax**: <8.0% si âgé, multiples comorbidités, espérance vie courte

**Optimisation biohacking** (non-diabétiques):
- **Elite**: <5.0% (<31 mmol/mol) - Glycémie moyenne <90 mg/dL, variabilité minimale
- **Optimal**: 5.0-5.3% - Glycémie moyenne 90-105 mg/dL, excellent contrôle
- **Acceptable**: 5.3-5.6% - Glycémie moyenne 105-120 mg/dL, risque futur diabète faible
- **Suboptimal**: 5.7-6.0% - Prédiabète débutant, intervention urgente

**Données longévité**: Centenaires Okinawa ont HbA1c moyen 4.8-5.2% à 60-80 ans (Willcox et al. 2006). Restriction calorique chronique (CALERIE trial) abaisse HbA1c de 5.4% → 4.9% sur 2 ans.

**Variabilité glycémique**: HbA1c ne capte PAS la variabilité. Deux individus HbA1c 5.5%:
- **Individu A**: Glycémie stable 100-110 mg/dL toute la journée (faible variabilité)
- **Individu B**: Glycémie 70-75 jeûne, pics 160-180 mg/dL post-prandial (haute variabilité)

Individu B a risque complications SUPERIEUR malgré HbA1c identique (stress oxydatif excursions glycémiques). Mesure continue glucose (CGM) capte cette variabilité, HbA1c non.

**Fréquence dosage**:
- **Non-diabétiques**: 1×/an checkup routine
- **Prédiabétiques**: 2×/an (monitoring progression)
- **Diabétiques**: 3-4×/an (tous les 3 mois, ajustement traitement)`,
    ranges: {
      optimal: `5.0-5.3% - Optimal`,
      normal: `5.3-5.6% - Acceptable`,
      suboptimal: `5.7-6.0% - Suboptimal`,
      critical: `≥6.5% (≥48 mmol/mol) - Diabète type 2`,
      interpretation: `**Normal (ADA)**: <5.7% (<39 mmol/mol)
**Prédiabète**: 5.7-6.4% (39-47 mmol/mol)
**Diabète**: ≥6.5% (≥48 mmol/mol)
**Elite**: <5.0% (<31 mmol/mol)
**Optimal**: 5.0-5.3%
**Acceptable**: 5.3-5.6%
**Suboptimal**: 5.7-6.0%`,
    },
    variations: `#### Variations physiologiques

**Pas de variations aiguës**: Contrairement glycémie, HbA1c stable jour/jour, semaine/semaine. Changements significatifs nécessitent 6-8 semaines (half-life glycation).

**Impact interventions**:
- Amélioration contrôle glycémique (diète, exercice, médicaments) visible sur HbA1c à J+45-60 minimum
- Détérioration (arrêt traitement, gain poids) idem, J+45-60 avant élévation HbA1c

**Grossesse**: HbA1c diminue progressivement (-0.5-1.0%) durant grossesse (turnover GR accéléré, dilution). Ranges normales grossesse: T1 <5.5%, T2-T3 <5.0%. Diabète gestationnel diagnostiqué sur OGTT, pas HbA1c.

**Altitude**: Polyglobulie compensatoire (↑EPO) → turnover GR accéléré → HbA1c sous-estime glycémie moyenne de 0.3-0.5%. Corriger si résidence permanente >2500m.

---`,
    studies: [],
  },
  impact: {
    performance: {
      hypertrophy: `**Récupération et glycation tissulaire**

HbA1c >5.7% (prédiabète) s'associe à glycation excessive non seulement hémoglobine, mais aussi protéines tissulaires longue demi-vie: collagène, myéline, protéines contractiles musculaires, enzymes. Ces AGEs (Advanced Glycation End-products) altèrent fonction:
- **Collagène glyqué**: Rigidité tendons/ligaments ↑ → risque blessures (tendinopathies, ruptures)
- **Myofibrilles glyquées**: Contractilité ↓, récupération ralentie
- **Protéines mitochondriales glyquées**: Capacité oxydative ↓, fatigue ↑

Étude Monnier et al. (2006): athlètes HbA1c >5.5% montrent récupération force post-exercice excentrique 25% ralentie vs <5.2%, corrélée avec marqueurs AGEs circulants.

Optimiser HbA1c <5.3% = minimiser glycation tissulaire, maximiser réparation/adaptation.`,
      strength: `**Inflammation et stress oxydatif**

Excursions glycémiques (pics >140-160 mg/dL) génèrent burst ROS (reactive oxygen species) mitochondriaux, inflammation aiguë (↑IL-6, ↑TNF-α). HbA1c élevée = proxy exposition glycémique chronique = inflammation bas-grade chronique.

Méta-analyse King et al. (2012): chaque 0.5% ↑ HbA1c (même <6.5%) = +15% CRP, +12% IL-6. HbA1c >5.7% = environnement pro-inflammatoire freinant adaptations entraînement.

Athlètes HbA1c <5.0% rapportent -40% jours maladie/an vs >5.5% (infections respiratoires, gastro, inflammations articulaires).`,
      recovery: `**Énergie et performance cognitive**

Variabilité glycémique élevée (HbA1c >5.5% souvent associée) induit fluctuations énergétiques, crashs post-prandiaux, "brain fog". Glycémie moyenne élevée (>110 mg/dL, HbA1c >5.5%) réduit flexibilité métabolique: dépendance glucose, incapacité mobiliser lipides efficacement.

Études: HbA1c <5.2% associée à +15% scores attention soutenue, +10% vitesse traitement vs 5.7-6.0% (Kerti et al. 2013).`,
      bodyComp: ``,
    },
    health: {
      energy: `**Risque cardiovasculaire**

Relation linéaire sans seuil: chaque 0.5% ↑ HbA1c = +20-30% risque infarctus/AVC, même en range "normal" <5.7%.

Étude EPIC-Norfolk (Khaw et al. 2004), 10,232 sujets: HbA1c 5.5-5.9% (prédiabète bas) = risque coronarien ×1.6 vs <5.0%, ajusté autres facteurs. HbA1c >6.0% (prédiabète haut) = ×2.4.

Mécanismes:
- **AGEs**: Glycation LDL → LDL oxydé (athérogène), glycation collagène vasculaire → rigidité artérielle
- **Dysfonction endothéliale**: Hyperglycémie chronique ↓ NO biodisponibilité, ↑ vasconstriction
- **Inflammation**: HbA1c >5.5% corrèle CRP élevée, profil pro-thrombotique
- **Dyslipidémie**: Résistance insuline → ↑ triglycérides, ↓ HDL

Cardioprotection: HbA1c <5.3% élimine quasi-totalement risque CV lié dysglycémie.`,
      mood: `**Complications microvasculaires**

Rétinopathie, néphropathie, neuropathie diabétiques = conséquences directes glycation chronique. Risque apparaît dès HbA1c >6.0%, exponentiel >7.0%.

DCCT trial (1993): réduction HbA1c de 9.0% → 7.0% (diabétiques T1) = -76% rétinopathie, -60% néphropathie, -60% neuropathie. Chaque 1% baisse HbA1c = -35-40% réduction complications.

Chez non-diabétiques, maintenir HbA1c <5.5% long-terme élimine risque microvasculaire. HbA1c 5.7-6.4% (prédiabète) × 10-20 ans = dommages rétiniens/rénaux subcliniques détectables (Diabetes Prevention Program Outcomes Study 2015).`,
      cognition: `**Cancer**

Données épidémiologiques montrent HbA1c élevée associée à risque cancers (colorectal, pancréas, sein, endomètre, vessie). Méta-analyse Ryu et al. (2014): HbA1c >6.5% (diabète) = risque cancer global ×1.3-1.5.

Mécanismes hypothétiques: hyperinsulinémie (mitogène), IGF-1 élevé, inflammation chronique, stress oxydatif, glycation protéines réparation ADN.

Prévention: HbA1c <5.5% minimise risque lié dysglycémie.`,
      immunity: ``,
    },
    longTerm: {
      cardiovascular: `**Déclin cognitif et démence**

HbA1c = prédicteur fort Alzheimer. Étude Crane et al. (2013, NEJM): chaque 1% ↑ HbA1c = +40% risque démence sur 7 ans. HbA1c moyenne 6.5% (diabète contrôlé) = atrophie hippocampe -8% vs 5.0%.

Diabète type 2 = risque Alzheimer ×2-3, mais prédiabète (HbA1c 5.7-6.4%) déjà ×1.5. Mécanisme: résistance insuline cérébrale ("diabète type 3"), inflammation, AGEs neuronaux.

Neuroprotection: HbA1c <5.3% + variabilité glycémique minimale (CGM-vérifié <20% coefficient variation).`,
      metabolic: `**Longévité**

Données observationnelles suggèrent relation optimale HbA1c - longévité en U: mortalité minimale 5.0-5.4%, augmentée si <4.5% (hypoglycémies?) ou >5.7%.

Restriction calorique (CALERIE trial): HbA1c 5.4% → 4.9% sur 2 ans, associée à ↓ marqueurs vieillissement (méthylation ADN, longueur télomères).

Centenaires Okinawa: HbA1c 4.9-5.3% à 70-90 ans, vs 5.5-5.8% population générale âge identique.

Hypothèse: HbA1c <5.3% = marqueur restriction énergétique chronique, activation AMPK/sirtuines, autophagie, hormesis.

---`,
      lifespan: ``,
    },
    studies: [],
  },
  protocol: {
    phase1_lifestyle: {
      duration: `0-90 jours`,
      sleep: `#### Phase 1: Lifestyle (0-90 jours)

**Réduire pics glycémiques post-prandiaux**

HbA1c reflète glycémie moyenne, fortement influencée par pics post-prandiaux. Objectif: maintenir glycémie <140 mg/dL post-repas, idéalement <120 mg/dL.

**Stratégies**:

1. **Ordre ingestion macros** (Shukla et al. 2015):
   - Légumes/fibres PUIS protéines/graisses PUIS glucides
   - Réduit pic glycémique -40-50% vs glucides d'abord
   - Mécanisme: fibres/graisses ralentissent vidange gastrique, sécrétine ↑ (inhibe absorption glucose)

2. **Vinegar hack** (Johnston et al. 2004):
   - 20ml vinaigre de cidre dilué dans eau, 10min pré-repas glucidique
   - Réduit pic glycémique -25-35%
   - Mécanisme: acide acétique inhibe α-amylase salivaire, ralentit digestion amidon

3. **Marche post-prandiale** (déjà mentionné glycémie jeûne):
   - 10-15min marche immédiatement post-repas
   - Réduit pic -20-30 mg/dL
   - Impact cumulatif: 3 marches/jour × 30 jours = HbA1c -0.2-0.3%

4. **Timing glucides autour training**:
   - 60-70% glucides quotidiens dans fenêtre 2h pré + 4h post-entraînement
   - Captation musculaire maximale (GLUT4 translocated), pic glycémique atténué
   - Soir: limiter glucides <30-40g (éviter hyperglycémie nocturne prolongée)

**Composition repas anti-spike**:
- Fibres: 10-15g/repas (légumes feuilles, brocoli, légumineuses)
- Protéines: 25-40g/repas (ralentissent absorption, ↑ satiété)
- Graisses: 10-20g/repas (huile olive, avocat, noix)
- Glucides: Index glycémique <55 (patate douce, riz basmati, quinoa, flocons avoine)

**Éviter**:
- Glucides simples isolés (jus fruits, céréales sucrées, pain blanc seul)
- Repas tardifs riches glucides (>21h) → hyperglycémie nocturne prolongée (6-8h)
- Snacking fréquent (maintient insulinémie élevée, ↓ sensibilité)

**Entraînement HIIT**

High-Intensity Interval Training = intervention puissante HbA1c. Méta-analyse Jelleyman et al. (2015): HIIT 3×/semaine × 12 semaines → HbA1c -0.5-0.7% chez prédiabétiques.

Protocole exemple:
- 10 × (30sec sprint/effort max + 90sec récup active)
- 3-4×/semaine
- Durée totale: 20min effective

Mécanisme: déplétion glycogène musculaire rapide → captation glucose post-effort massive → sensibilité insuline ↑48-72h → glycémie moyenne ↓ → HbA1c ↓.

**Sommeil optimisé**

Privation sommeil (<6h chronique) élève HbA1c de 0.3-0.5% via résistance insuline, cortisol élevé, dérégulation appétit (ghrelin ↑, leptine ↓ → apport glucides ↑).

Cible: 7h30-8h30/nuit, qualité élevée (profond + REM).

**Jeûne intermittent**

16:8 (fenêtre 8h alimentaire, 16h jeûne) améliore HbA1c -0.2-0.4% en 8-12 semaines (Carter et al. 2018).

Mécanisme: période jeûne prolongée → insulinémie basale basse, autophagie, ↑ sensibilité insuline, ↓ glycémie moyenne.

**Résultats attendus Phase 1** (90 jours):

HbA1c baseline 5.8%:
- J+45: -0.1-0.2% (premiers effets détectables, half-life glycation)
- J+90: -0.3-0.5% (5.3-5.5%, amélioration significative)

Si interventions maximales (marches, HIIT, jeûne intermittent, timing strict): -0.5-0.8% possible (5.8% → 5.0-5.3%).`,
      nutrition: ``,
      training: ``,
      stress: ``,
      alcohol: ``,
      expected_impact: ``,
    },
    phase2_supplements: {
      duration: `idem glycémie jeûne`,
      supplements: [],
      budget: ``,
      expected_impact: `#### Phase 2: Suppléments (idem glycémie jeûne)

**Berbérine**: 1500mg/jour (500mg × 3 pré-repas)
- HbA1c -0.5-0.7% en 12 semaines (Yin et al. 2008)

**Acide alpha-lipoïque**: 600mg/jour
- HbA1c -0.3-0.5% (Ziegler et al. 2004)

**Cannelle**: 1-3g/jour
- HbA1c -0.2-0.3% (Allen et al. 2013)

**Chrome picolinate**: 200-400mcg/jour (si déficit)
- HbA1c -0.3-0.6% si déficitaire (Anderson et al. 1997)

**Magnésium**: 400-500mg/jour
- HbA1c -0.2-0.3% si déficitaire (Guerrero-Romero et al. 2004)

**Résultats cumulés Phase 1+2** (90 jours):

HbA1c baseline 5.8%:
- Phase 1 seule: -0.3-0.5%
- Phase 1+2: -0.6-1.0% (5.8% → 4.8-5.2%, excellent)`,
    },
    phase3_retest: {
      duration: `90 jours+`,
      when: `#### Phase 3: Retest & Monitoring (90 jours+)

**Retest J+90**:
- HbA1c: Cible <5.3% (optimal <5.0%)
- Glycémie jeûne: <85 mg/dL
- HOMA-IR: <1.5
- Fructosamine (optionnel): Reflète glycémie 2-3 dernières semaines, complément HbA1c

**Critères succès**:
- ✅ HbA1c: <5.3%
- ✅ Glycémie jeûne: <85 mg/dL
- ✅ Variabilité glycémique faible (si CGM: coefficient variation <20%, temps in range >90%)

**Si HbA1c reste >5.5% à J+90**:

Investiguer:
1. **Compliance**: Vérifier marches post-prandiales, timing glucides, HIIT effectif
2. **Pics cachés**: Envisager CGM (Continuous Glucose Monitor) 14 jours pour capturer pics post-prandiaux non détectés par glycémies ponctuelles
3. **Stéatose hépatique**: Échographie (NAFLD = résistance insuline hépatique majeure)
4. **Médicaments**: Corticoïdes, antipsychotiques atypiques (↑ glycémie)
5. **Hémoglobinopathies**: Dosage hémoglobines anormales (HbS, HbC) si origine ethnique suggère

**CGM (Continuous Glucose Monitor)**: Gold standard optimisation

Devices: FreeStyle Libre, Dexcom G6/G7, Abbott Lingo (14 jours monitoring continu).

Métriques CGM:
- **Time in Range** (TIR): % temps 70-140 mg/dL (cible >90%)
- **Coefficient variation**: % variabilité (cible <20%)
- **Glycémie moyenne**: Doit corréler HbA1c (formule Nathan)

CGM révèle:
- Pics post-prandiaux cachés (identifier aliments problématiques)
- Hypoglycémies asymptomatiques nocturnes
- Impact stress, sommeil, exercice en temps réel
- Réponse individuelle foods (glucose spikes très variables inter-individus)

Recommandation: 1-2× cycles CGM 14 jours/an pour optimization fine, surtout si HbA1c >5.3% malgré glycémie jeûne normale.

**Maintenance long-terme**:

Une fois HbA1c <5.3% atteint:
- Retest 1×/an (monitoring stabilité)
- Maintenir lifestyle (marches, HIIT, timing glucides, sommeil)
- Suppléments optionnels selon budget (berbérine cycle 3 mois ON, 1 mois OFF)

**Red flags**:
- HbA1c ≥6.5% × 2 dosages: Diabète type 2, consultation endocrino urgente + bilan complet (OGTT, peptide C, anticorps anti-GAD si suspect T1)
- HbA1c <4.5% persistante: Exclure hémolyse, anémie hémolytique, hémoglobinopathie, hyperthyroïdie (turnover GR accéléré)
- HbA1c discordante avec glycémie (ex: HbA1c 6.0% mais glycémie jeûne toujours 80-85 mg/dL): Possibles interférences dosage, pics post-prandiaux sévères cachés, ou hémoglobinopathie → investigation`,
      markers: ``,
      success_criteria: ``,
      next_steps: ``,
    },
    special_cases: {
      non_responders: ``,
      contraindications: ``,
      red_flags: ``,
    },
  },
};

export const BIOMARKER_DETAILS_EXTENDED: Record<string, BiomarkerDetailExtended> = {
  testosterone_total: TESTOSTERONE_TOTAL_EXTENDED,
  glycemie_jeun: GLYCEMIE_JEUN_EXTENDED,
  hba1c: HBA1C_EXTENDED,
  testosterone_libre: TESTOSTERONE_LIBRE_EXTENDED,
  shbg: SHBG_EXTENDED,
  cortisol: CORTISOL_EXTENDED,
  estradiol: ESTRADIOL_EXTENDED,
  vitamine_d: VITAMINE_D_EXTENDED,
};
