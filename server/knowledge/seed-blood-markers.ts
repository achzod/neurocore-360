/**
 * APEXLABS - Blood Marker Knowledge Base Seed
 * Articles curated pour enrichir l'analyse sanguine
 *
 * Axes: sante, performance, prise de muscle, perte de gras, bodybuilding
 * Sources: PubMed systematic reviews, Huberman Lab, Peter Attia, Marek Health,
 *          Examine, MPMD, Applied Metabolics, Chris Masterjohn
 *
 * Run: npx tsx server/knowledge/seed-blood-markers.ts
 */

import { saveArticles, ScrapedArticle } from "./storage";

// ============================================================================
// PANEL HORMONAL
// ============================================================================

const HORMONAL_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Testosterone Totale & Libre : Interpretation Avancee pour Athletes et Bodybuilders",
    category: "bloodwork",
    url: "neurocore://blood/testosterone-advanced",
    keywords: ["testosterone", "testosterone libre", "shbg", "lh", "fsh", "hypogonadisme", "trt", "bodybuilding", "muscle", "performance", "biomarker"],
    content: `
TESTOSTERONE TOTALE & LIBRE - INTERPRETATION AVANCEE

RANGES LAB vs OPTIMAL vs PERFORMANCE:
- Lab range: 300-1000 ng/dL (couvre 95% de la population, inclut les hommes de 80 ans)
- Optimal sante: 500-800 ng/dL
- Performance/bodybuilding: 600-900 ng/dL (sweet spot anabolique naturel)
- Alerte basse: <400 ng/dL = suboptimal meme si "normal" au labo

TESTOSTERONE LIBRE - LE VRAI INDICATEUR:
Seule 1-3% de la testosterone circule sous forme libre. Le reste est lie a:
- SHBG (60-70%) : liaison forte, testosterone inactive
- Albumine (30-40%) : liaison faible, partiellement biodisponible
Optimal libre: 15-25 pg/mL (homme). Si total OK mais libre bas = SHBG trop haut.

CAUSES SHBG ELEVE (reduit testo libre):
- Hyperthyroidie, exces estrogenes, vieillissement, alcool chronique, deficit calorique prolonge
CAUSES SHBG BAS (fausse testo libre elevee):
- Resistance insuline, obesite, hypothyroidie, androgenes exogenes

RATIO TESTO/CORTISOL - INDEX ANABOLIQUE:
Ce ratio predit la capacite de recuperation et d'adaptation a l'entrainement.
- Ratio optimal: > 0.35 (testo en nmol/L / cortisol en nmol/L)
- Ratio < 0.20 = etat catabolique, surentrainement probable
- Monitoring en mesocycle: si le ratio chute de >30%, deload obligatoire

RATIO TESTO/ESTRADIOL:
- Optimal: 20-30:1 (ng/dL testo / pg/mL E2)
- Desequilibre: ratio < 14:1 = aromatisation excessive
- Impact: retention d'eau, gynecomastie, stockage gynoide, libido basse

IMPACT SUR LA COMPOSITION CORPORELLE:
- Testo > 600 ng/dL = synthese proteique musculaire optimale
- Testo < 400 ng/dL = perte de masse maigre meme avec training et nutrition corrects
- Chaque 100 ng/dL de baisse = ~2-3% reduction du taux metabolique basal

PROTOCOLE NATUREL D'OPTIMISATION:
1. Sommeil: 7-9h (chaque heure perdue = -10-15% testo le lendemain)
2. Training: Compound heavy (squat, deadlift, bench) + limiter sessions > 75 min
3. Nutrition: Graisses 25-35% des calories (cholesterol = precurseur), zinc 30mg, vitD 4000-5000 UI
4. Stress: HPA axis dysregulation = vol de pregnenolone vers cortisol au lieu de testo
5. Body fat: Ideal 10-18% pour maximiser testo/E2. >25% = aromatase hyperactive

QUAND CONSULTER (ENDOCRINOLOGUE):
- Testo totale < 300 ng/dL confirmee 2x (8h matin)
- Testo libre < 5 pg/mL
- LH elevee + testo basse = insuffisance testiculaire primaire
- LH basse + testo basse = cause hypothalamique/hypophysaire (IRM)
- Prolactine > 20 ng/mL = bilan hypophysaire

REFERENCES:
- Bhasin S et al. Testosterone Therapy in Men with Hypogonadism: An Endocrine Society Clinical Practice Guideline. J Clin Endocrinol Metab. 2018;103(5):1715-1744.
- Kraemer WJ, Ratamess NA. Hormonal responses and adaptations to resistance exercise and training. Sports Med. 2005;35(4):339-361.
- Vingren JL et al. Testosterone Physiology in Resistance Exercise and Training. Sports Med. 2010;40(12):1037-1053.
`
  },
  {
    source: "manual",
    title: "Cortisol, Axe HPA et Surentrainement : Le Marqueur le Plus Sous-Estime",
    category: "bloodwork",
    url: "neurocore://blood/cortisol-hpa",
    keywords: ["cortisol", "hpa", "surentrainement", "overtraining", "stress", "catabolisme", "recuperation", "deload", "biomarker", "fatigue surrenalienne"],
    content: `
CORTISOL & AXE HPA - INTERPRETATION POUR ATHLETES

CORTISOL MATIN (8H) - TIMING CRITIQUE:
Le cortisol suit un rythme circadien strict. Pic a 8h (+/- 1h), nadir a minuit.
- Lab range: 5-25 mcg/dL
- Optimal sante: 12-18 mcg/dL (8h matin)
- Trop bas (<10): fatigue surrenalienne, mauvaise tolerance au stress, energie basse
- Trop haut (>20): stress chronique, catabolisme, resistance insuline, stockage abdominal
- Plat (pas de pic matin): dysregulation HPA avancee

CORTISOL LIBRE URINAIRE (24H):
Plus fiable que le serique pour evaluer la production totale.
- Normal: 10-100 mcg/24h
- Eleve chroniquement: syndrome de Cushing subclinique, stress chronique
- Bas chroniquement: insuffisance surrenalienne

IMPACT SUR LA COMPOSITION CORPORELLE:
1. STOCKAGE: Cortisol chronique = stockage visceral preferentiel (graisse abdominale)
2. CATABOLISME: Cortisol degrade les proteines musculaires pour neoglucogenese
3. INSULINE: Cortisol augmente la glycemie = hyperinsulinisme reactif = stockage
4. THYROIDE: Cortisol inhibe la conversion T4→T3 (metabolisme ralenti)
5. TESTOSTERONE: Cortisol et testo partagent le meme precurseur (pregnenolone steal)

PATTERN SURENTRAINEMENT (OTS):
Phase 1 - Surentrainement sympathique (suractivation):
- Cortisol ELEVE, FC repos elevee, irritabilite, insomnie
- Toujours performant mais sur les reserves
Phase 2 - Surentrainement parasympathique (epuisement):
- Cortisol BAS, fatigue profonde, depression, immunite effondree
- Incapable de performer, recuperation tres longue

PROTOCOLE DE CORRECTION:
Cortisol trop HAUT:
- Reduire volume d'entrainement de 30-40%
- Ashwagandha KSM-66 600mg/jour (reduction cortisol -28% en 8 semaines, etude Chandrasekhar 2012)
- Phosphatidylserine 400-800mg (reduit cortisol post-exercice)
- Meditation/respiration: 5-10 min cohérence cardiaque (resonance 0.1Hz)
- Magnesium 400-600mg glycinate le soir

Cortisol trop BAS:
- Vitamine C 1000-2000mg (les surrenales concentrent la vitC)
- Racine de reglisse (glycyrrhizine) si confirmé insuffisance surrenalienne - attention hypertension
- Sel (sodium) si cortisol matinal bas + hypotension orthostatique
- Repos actif, pas de restriction calorique severe

REFERENCES:
- Hackney AC. Hypogonadism in exercising males: dysfunction or adaptive-Loss mechanism? Front Endocrinol. 2020;11:11.
- Chandrasekhar K et al. A prospective, randomized double-blind, placebo-controlled study of safety and efficacy of a high-concentration full-spectrum extract of ashwagandha root. Indian J Psychol Med. 2012;34(3):255-262.
- Cadegiani FA, Kater CE. Hormonal aspects of overtraining syndrome: a systematic review. BMC Sports Sci Med Rehabil. 2017;9:14.
`
  },
  {
    source: "manual",
    title: "Estradiol (E2), Prolactine et Equilibre Hormonal Masculin",
    category: "bloodwork",
    url: "neurocore://blood/estradiol-prolactine",
    keywords: ["estradiol", "e2", "prolactine", "aromatase", "gynecomastie", "dim", "zinc", "libido", "retention eau", "biomarker"],
    content: `
ESTRADIOL & PROLACTINE - EQUILIBRE HORMONAL MASCULIN

ESTRADIOL (E2) SENSIBLE:
Important: toujours demander le dosage SENSIBLE (LC-MS/MS), pas le standard immunoassay qui est imprecis chez l'homme.
- Lab range: 10-40 pg/mL
- Optimal homme: 20-35 pg/mL
- Trop bas (<15): douleurs articulaires, libido basse, osteoporose, humeur depressive
- Trop haut (>40): retention eau, gynecomastie, stockage gynoide, libido paradoxalement basse

AROMATISATION - LE MECANISME CLE:
L'enzyme aromatase (CYP19A1) convertit la testosterone en estradiol dans:
- Tissu adipeux (source principale chez homme en surpoids)
- Foie, cerveau, os, testicules
Plus de masse grasse = plus d'aromatase = plus d'E2 = moins de testo libre = cercle vicieux

FACTEURS AUGMENTANT L'AROMATISATION:
- Obesite (>25% body fat)
- Alcool (direct sur aromatase hepatique)
- Resistance insuline (insuline stimule aromatase)
- Deficit en zinc (le zinc inhibe naturellement l'aromatase)
- Xenoestrogenes: BPA, phtalates, parabenes, pesticides

PROTOCOLE ANTI-AROMATISATION NATUREL:
1. Perte de gras: objectif <18% body fat - effet le plus puissant
2. Zinc 30-50mg/jour (chelate ou picolinate): inhibiteur naturel d'aromatase
3. DIM (Diindolylmethane) 200-300mg/jour: oriente metabolisme E2 vers voie protectrice (2-OH)
4. Calcium D-Glucarate 500mg x2: aide detox hepatique des estrogenes
5. Cruciferes quotidiens: brocoli, chou, chou-fleur (I3C naturel)
6. Zero alcool (si E2 >35 pg/mL, non negociable)
7. Fibres 30-40g/jour: estrogenes s'eliminent par les selles, constipation = recirculation

PROLACTINE:
- Normal: 2-18 ng/mL
- Optimal: 5-12 ng/mL
- Elevee (>20 ng/mL): inhibe GnRH = baisse LH/FSH = baisse testo
- Causes: stress, medications (antidepresseurs SSRI, antipsychotiques), prolactinome hypophysaire
- Si > 50 ng/mL: IRM hypophysaire obligatoire (adenome)

PROTOCOLE PROLACTINE HAUTE:
- P5P (pyridoxal-5-phosphate, forme active B6) 50-100mg/jour
- Vitamine E 400 UI/jour
- Mucuna Pruriens (L-DOPA naturel) 300-500mg/jour - dopamine inhibe prolactine
- Gestion stress (cortisol stimule prolactine)

REFERENCES:
- Schulster M et al. The role of estradiol in male reproductive function. Asian J Androl. 2016;18(3):435-440.
- Vermeulen A et al. Oestradiol: a critical evaluation of the biological significance. J Endocrinol. 1999;163(3):387-395.
`
  },
  {
    source: "manual",
    title: "IGF-1, DHEA-S et GH : Marqueurs Anaboliques et Longevite",
    category: "bloodwork",
    url: "neurocore://blood/igf1-dheas-gh",
    keywords: ["igf-1", "dhea-s", "gh", "hormone de croissance", "anabolisme", "longevite", "vieillissement", "recuperation", "biomarker", "muscle"],
    content: `
IGF-1, DHEA-S ET GH - MARQUEURS ANABOLIQUES

IGF-1 (INSULIN-LIKE GROWTH FACTOR 1):
Produit par le foie sous stimulation de la GH. Reflete l'activite GH sur 24h.
- Lab range: 100-300 ng/mL (age-dependent)
- Optimal performance: 200-280 ng/mL
- Trop bas (<150): recuperation lente, perte de masse maigre, sarcopenie
- Trop haut (>350): risque theorique de proliferation cellulaire (longevite?)

EQUILIBRE IGF-1 PERFORMANCE vs LONGEVITE:
- Performance/muscle: viser 200-280 ng/mL (anabolisme maximal)
- Longevite pure: certains experts (ex: Valter Longo) suggerent un IGF-1 plus bas pour reduire le risque de cancer
- Compromis pragmatique: 180-250 ng/mL avec surveillance reguliere

FACTEURS QUI AUGMENTENT IGF-1:
- Proteines alimentaires (surtout lait/whey via casomorphines)
- Sommeil profond (N3) - pic GH nocturne
- Training de resistance (effet aigu et chronique)
- Calories suffisantes (le deficit reduit IGF-1)
- Zinc, magnesium, vitamine D

FACTEURS QUI DIMINUENT IGF-1:
- Deficit calorique prolonge
- Jeune prolonge (>24h)
- Deficit en proteines
- Inflammation chronique
- Maladies hepatiques
- Deficit en sommeil

DHEA-S (DEHYDROEPIANDROSTERONE SULFATE):
Precurseur de la testosterone ET des estrogenes. Marqueur de la reserve surrenalienne.
- Peak a 25 ans, decline de 2-3%/an apres
- Lab range: 100-500 mcg/dL (homme)
- Optimal performance: 300-450 mcg/dL
- Bas (<200): vieillissement premature, fatigue, immunite basse

PROTOCOLE OPTIMISATION IGF-1:
1. Proteines 1.6-2.2g/kg/jour (leucine cle: 2.5-3g par repas)
2. Sommeil: maximiser N3 (chambre froide 18°C, pas d'alcool, magnesium)
3. Training: compound movements, volume suffisant
4. Zinc 30mg + Magnesium 400mg + VitD 4000 UI

PROTOCOLE DHEA-S BAS:
1. Gestion du stress (DHEA-S chute avec cortisol chronique)
2. Sommeil reparateur
3. DHEA exogene 25-50mg/jour (sous supervision medicale, controler E2)
4. Pregnenolone 50mg/jour (precurseur en amont)

REFERENCES:
- Nindl BC et al. Insulin-like growth factor I as a biomarker of health, fitness, and training status. Med Sci Sports Exerc. 2010;42(1):39-49.
- Ohlsson C et al. Low serum levels of DHEA-S predict mortality in elderly men. J Clin Endocrinol Metab. 2010;95(9):4406-4414.
`
  }
];

// ============================================================================
// PANEL THYROIDIEN
// ============================================================================

const THYROID_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Panel Thyroidien Complet : TSH, T3, T4, rT3, Anti-TPO - Guide d'Interpretation",
    category: "bloodwork",
    url: "neurocore://blood/thyroid-panel",
    keywords: ["thyroide", "tsh", "t3", "t4", "t3 reverse", "anti-tpo", "hypothyroidie", "metabolisme", "perte de gras", "biomarker"],
    content: `
PANEL THYROIDIEN - INTERPRETATION AVANCEE POUR PERFORMANCE

LA THYROIDE = LE THERMOSTAT METABOLIQUE:
Chaque cellule du corps a des recepteurs thyroidiens. La thyroide controle:
- Metabolisme basal (60-70% de la depense energetique)
- Thermogenese
- Synthese proteique
- Lipolyse
- Humeur, energie, cognition
- Frequence cardiaque, motilite intestinale

TSH - UN MARQUEUR TROMPEUR:
- Lab range: 0.4-4.5 mIU/L (TROP LARGE, inclut des subcliniques)
- Optimal: 0.5-2.0 mIU/L
- >2.5 = thyroide commence a peiner (l'hypophyse pousse plus fort)
- >4.5 = hypothyroidie franche
- <0.4 = hyperthyroidie (ou surdosage levo)
PIEGE: TSH normale ne signifie PAS thyroide optimale si T3 libre est basse

T4 LIBRE - HORMONE DE STOCKAGE:
- Lab range: 0.8-1.8 ng/dL
- Optimal: 1.2-1.6 ng/dL
- La T4 est inactive, elle doit etre convertie en T3 par les deiodinases

T3 LIBRE - L'HORMONE ACTIVE:
- Lab range: 2.3-4.2 pg/mL
- Optimal performance: 3.0-4.0 pg/mL
- C'est LE marqueur metabolique. Basse T3 libre = metabolisme lent, MEME si TSH est normale
- Deficit calorique prolonge: T3 chute pour economiser l'energie (adaptation starvation)

T3 REVERSE (rT3) - LE FREIN METABOLIQUE:
- Lab range: 9-27 ng/dL
- Optimal: <15 ng/dL
- La T4 peut etre convertie en T3 (active) OU en rT3 (inactive)
- rT3 elevee = le corps freine le metabolisme
- Causes: stress chronique, deficit calorique, inflammation, cortisol eleve, maladie

RATIO T3/rT3:
- Optimal: > 0.20 (T3 libre en pg/mL / rT3 en ng/dL)
- <0.15 = conversion bloquee malgre T4 suffisante ("euthyroid sick syndrome")

ANTI-TPO (ANTICORPS ANTI-THYROID PEROXIDASE):
- Normal: <35 IU/mL
- Optimal: <20 IU/mL
- Eleve: Hashimoto (auto-immunite thyroidienne), cause #1 d'hypothyroidie
- Peut etre eleve des ANNEES avant que TSH monte

IMPACT SUR LA PERTE DE GRAS:
- Hypothyroidie subclinique (TSH 2.5-4.5, T3 libre basse): metabolisme basal reduit de 10-15%
- Sur un deficit de 500 kcal/jour, ca peut annuler 50-75% de la perte de gras prevue
- Le corps en deficit prolonge: baisse T3 de 25-40% en 2-4 semaines

PROTOCOLE D'OPTIMISATION THYROIDIENNE NATURELLE:
1. Iode: 150-300 mcg/jour (algues, sel iode) - cofacteur essentiel
2. Selenium: 200 mcg/jour (noix du Bresil 2/jour) - cofacteur deiodinase
3. Zinc: 30mg/jour - cofacteur conversion T4→T3
4. Fer: ferritine > 80 ng/mL requise pour bonne conversion
5. Vitamine A: 5000 UI/jour - necessaire pour les recepteurs thyroidiens
6. Eviter deficit calorique > 25% prolonge (> 8 semaines)
7. Refeed/diet break toutes les 6-8 semaines si en deficit
8. Gestion du stress (cortisol augmente rT3)

QUAND CONSULTER:
- TSH > 4.5 ou < 0.3
- Anti-TPO > 35 (meme si TSH normale)
- Symptomes persistants + T3 libre < 2.8 pg/mL
- rT3 > 20 ng/dL avec ratio T3/rT3 < 0.15

REFERENCES:
- Duntas LH, Brenta G. The effect of thyroid disorders on lipid levels and metabolism. Med Clin North Am. 2012;96(2):269-281.
- McAninch EA, Bianco AC. The History and Future of Treatment of Hypothyroidism. Ann Intern Med. 2016;164(1):50-56.
- Mullur R et al. Thyroid hormone regulation of metabolism. Physiol Rev. 2014;94(2):355-382.
`
  }
];

// ============================================================================
// PANEL METABOLIQUE & LIPIDIQUE
// ============================================================================

const METABOLIC_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Resistance a l'Insuline : Glycemie, HbA1c, Insuline, HOMA-IR - Detection Precoce",
    category: "bloodwork",
    url: "neurocore://blood/insulin-resistance",
    keywords: ["insuline", "glycemie", "hba1c", "homa-ir", "resistance insuline", "prediabete", "glucose", "metabolisme", "perte de gras", "biomarker"],
    content: `
RESISTANCE A L'INSULINE - DETECTION PRECOCE

POURQUOI C'EST LE MARQUEUR #1 POUR LA COMPOSITION CORPORELLE:
La resistance a l'insuline precede le diabete de 10-15 ans. 88% des americains ont au moins un marqueur metabolique anormal. C'est le premier frein a la perte de gras et un accelerateur du vieillissement.

PROGRESSION DE LA PATHOLOGIE:
1. Insuline eleve + glycemie normale = DEBUT (non detecte par glycemie seule!)
2. Insuline tres elevee + glycemie borderline = pre-diabete metabolique
3. Insuline en decompensation + glycemie haute = diabete type 2 installe

GLYCEMIE A JEUN:
- Lab range: 70-100 mg/dL
- Optimal: 75-90 mg/dL
- 91-99: zone grise, checker insuline et HbA1c
- >100: prediabete officiel
PIEGE: glycemie peut rester "normale" pendant des ANNEES pendant que l'insuline compense

INSULINE A JEUN - LE MARQUEUR CLE:
- Lab range: 2-25 mcIU/mL (trop large!)
- Optimal: 3-8 mcIU/mL
- 8-12: resistance debutante, action requise
- >12: resistance installee, protocole agressif
- >20: consulter endocrinologue

HOMA-IR (Homeostasis Model Assessment):
Formule: (Insuline jeun x Glycemie jeun) / 405
- Optimal: < 1.0
- Acceptable: 1.0-1.5
- Resistance: > 1.5
- Resistance severe: > 2.5

HbA1c - MOYENNE GLYCEMIQUE 3 MOIS:
- Normal: < 5.7%
- Optimal performance: < 5.3%
- Pre-diabete: 5.7-6.4%
- Diabete: > 6.5%
- Limitation: fausse les resultats si duree de vie des GR est anormale (anemie, hemoglobinopathie)

TRIGLYCERIDES/HDL RATIO - PROXY SIMPLE:
- Optimal: < 1.5 (en mg/dL)
- Acceptable: 1.5-2.5
- Mauvais: > 2.5
- Excellent predicteur de la taille des particules LDL et de la resistance insuline

IMPACT SUR LE BODYBUILDING ET LA PERFORMANCE:
- Resistance insuline = glucose rentre MAL dans les muscles = moins de glycogene = performance reduite
- Insuline haute inhibe la lipolyse via CPT1 (graisses "verouillees")
- Inflammation chronique = catabolisme accru
- Recuperation ralentie, pumps diminues

PROTOCOLE DE RESENSIBILISATION A L'INSULINE:
NUTRITION:
1. Supprimer sucres ajoutes et farines raffinees
2. Glucides concentres autour du training (peri-workout)
3. Proteines 1.8-2.2g/kg + graisses saines en dehors du training
4. Fibres 35-50g/jour (ralentissent absorption glucose)
5. Vinaigre de cidre 1 c.a.s avant repas glucidique (reduit pic glycemique -25%)
6. Repas dans cet ordre: fibres/legumes → proteines/graisses → glucides

TRAINING:
1. Musculation 4-5x/semaine (contractions musculaires = GLUT4 independant de l'insuline)
2. Zone 2 cardio 150-200 min/semaine (ameliore fonction mitochondriale)
3. Marche 10-15 min post-repas (reduit pic glycemique de 30%)

SUPPLEMENTS:
1. Berberine 500mg x2-3/jour avant repas (aussi efficace que metformine - etude Yin 2008)
2. Chrome 400-1000mcg/jour (chromium picolinate)
3. Magnesium 400-600mg (cofacteur de la signalisation insuline)
4. ALA (acide alpha-lipoique) 600-1200mg/jour
5. Cannelle Ceylon 1-2g/jour (sensibilisant mild)

REFERENCES:
- DeFronzo RA. From the Triumvirate to the Ominous Octet: A New Paradigm for the Treatment of Type 2 Diabetes Mellitus. Diabetes. 2009;58(4):773-795.
- Yin J et al. Efficacy of berberine in patients with type 2 diabetes mellitus. Metabolism. 2008;57(5):712-717.
- Consitt LA et al. Intramuscular lipid metabolism, insulin action, and obesity. IUBMB Life. 2009;61(1):47-55.
`
  },
  {
    source: "manual",
    title: "Profil Lipidique Avance : ApoB, Lp(a), LDL-P, Triglycerides - Au-dela du Cholesterol Total",
    category: "bloodwork",
    url: "neurocore://blood/lipid-profile-advanced",
    keywords: ["apob", "ldl", "hdl", "triglycerides", "lpa", "cholesterol", "cardiovasculaire", "atherosclerose", "statines", "biomarker"],
    content: `
PROFIL LIPIDIQUE AVANCE - AU DELA DU CHOLESTEROL TOTAL

POURQUOI LE CHOLESTEROL TOTAL EST OBSOLETE:
Le cholesterol total ne distingue pas les particules atherogenes (ApoB) des protectrices (ApoA1). Un total de 220 mg/dL peut etre excellent (HDL haut, LDL bas) ou catastrophique (LDL oxyde, TG hauts).

APOB - LE MEILLEUR MARQUEUR CARDIOVASCULAIRE:
Chaque particule atherogene (LDL, VLDL, IDL, Lp(a)) porte EXACTEMENT 1 molecule ApoB.
- Lab range: 40-120 mg/dL
- Optimal: < 80 mg/dL
- Ideal longevite: < 60 mg/dL (Peter Attia recommande)
- ApoB > 100 = risque significatif peu importe le LDL-C
Avantage: un seul chiffre qui capture TOUTES les particules dangereuses

LDL - NUANCES:
- LDL-C (cholesterol dans LDL): le marqueur standard. Limites: ne reflete pas le NOMBRE de particules
- LDL-P (particle number): plus precis. Discordance LDL-C/LDL-P frequente chez insulino-resistants
- Pattern A (grosses particules) vs Pattern B (petites denses) : petites denses = plus atherogenes
- Triglycerides hauts + HDL bas = quasi-certainement Pattern B

HDL - PAS TOUJOURS PROTECTEUR:
- Optimal: > 55 mg/dL (homme), > 65 mg/dL (femme)
- HDL tres haut (>80) pas forcement mieux (HDL dysfonctionnel possible)
- L'exercice et l'alcool modere augmentent le HDL fonctionnel

TRIGLYCERIDES - MARQUEUR DE SANTE METABOLIQUE:
- Lab range: < 150 mg/dL
- Optimal: < 80 mg/dL (performance)
- >150: resistance insuline tres probable
- La plupart des bodybuilders en prise de masse avec exces de glucides ont TG eleves

Lp(a) - LE RISQUE GENETIQUE:
- Normal: < 30 mg/dL (ou <75 nmol/L)
- Optimal: < 14 mg/dL
- GENETIQUE: alimentation et exercice ont peu d'impact
- Lp(a) eleve + ApoB eleve = risque cardiovasculaire majeur
- Seules interventions: niacine haute dose (controversee), PCSK9 inhibiteurs, therapies anti-sense (en dev)

RATIO TG/HDL - PROXY DE TAILLE DES PARTICULES LDL:
- < 1.5: excellente (Pattern A probable)
- 1.5-2.5: acceptable
- > 2.5: Pattern B probable (petites denses), resistance insuline

IMPACT DU TRAINING ET DU BODYBUILDING:
- Musculation reguliere: augmente HDL +5-15%, reduit TG -15-30%
- Zone 2 cardio: effet additionnel significatif sur HDL et TG
- Prise de masse hypercalorique: peut temporairement augmenter TG et LDL
- Anabolisants: effondrent le HDL, augmentent LDL - risque CV majeur

PROTOCOLE D'OPTIMISATION LIPIDIQUE:
1. Zone 2 cardio 150+ min/semaine (effet le plus puissant sur HDL et TG)
2. Omega-3 EPA/DHA 2-4g/jour (reduit TG -25-30%)
3. Fibres solubles 10-15g/jour (avoine, psyllium): reduit LDL -5-10%
4. Phytosterols 2g/jour si LDL eleve: reduit LDL -10%
5. Berberine 1000-1500mg/jour: reduit LDL + TG + glucose simultanement
6. Niacine (controversee): augmente HDL mais effets secondaires
7. Limiter sucres/farines raffinees (impact direct TG)
8. Red yeast rice 1200-2400mg/jour si statine-intolerant (contient monacoline K)

QUAND TRAITEMENT PHARMACOLOGIQUE:
- ApoB > 100 persistant malgre lifestyle optimal
- LDL-C > 160 + facteurs de risque (HTA, diabete, tabac, Lp(a) eleve)
- Lp(a) > 50 mg/dL + autre facteur de risque
- Discuter avec cardiologue: statines, ezetimibe, PCSK9i selon profil

REFERENCES:
- Sniderman AD et al. Apolipoprotein B Particles and Cardiovascular Disease: A Narrative Review. JAMA Cardiol. 2019;4(12):1287-1295.
- Nordestgaard BG et al. Lipoprotein(a) as a cardiovascular risk factor: current status. Eur Heart J. 2010;31(23):2844-2853.
- Mora S et al. LDL particle subclasses, LDL particle size, and carotid atherosclerosis. Atherosclerosis. 2007;192(1):211-217.
`
  }
];

// ============================================================================
// PANEL INFLAMMATOIRE & FER
// ============================================================================

const INFLAMMATION_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "CRP-us, Homocysteine, Ferritine : Les Marqueurs d'Inflammation et Leur Impact",
    category: "bloodwork",
    url: "neurocore://blood/inflammation-markers",
    keywords: ["crp", "homocysteine", "ferritine", "inflammation", "fer", "anemie", "methylation", "cardiovasculaire", "biomarker", "recuperation"],
    content: `
MARQUEURS INFLAMMATOIRES - INTERPRETATION AVANCEE

CRP-US (C-REACTIVE PROTEIN ULTRA SENSIBLE):
Proteine produite par le foie en reponse a l'inflammation. Marqueur non specifique mais tres sensible.
- Lab range: < 3.0 mg/L
- Optimal: < 0.5 mg/L
- 0.5-1.0: inflammation legere, investiguer la cause
- 1.0-3.0: inflammation moderee, risque cardiovasculaire augmente
- >3.0: inflammation franche (infection, auto-immunite, blessure)
- >10: inflammation aigue (exclure infection avant d'interpreter)

ATTENTION FAUX POSITIFS CRP:
- Post-training intense: CRP peut monter 24-72h apres une seance lourde
- Infection virale/bacterienne recente
- Blessure/chirurgie
- Obesite (le tissu adipeux produit des cytokines pro-inflammatoires)
- AINS masquent le CRP (le baissent sans resoudre la cause)
→ Toujours mesurer a distance d'un training intense (48-72h min)

HOMOCYSTEINE:
Acide amine intermediaire dans le cycle de la methylation. Marqueur de risque CV independant.
- Lab range: 5-15 mcmol/L
- Optimal: 6-9 mcmol/L
- >12: risque cardiovasculaire augmente, methylation suboptimale
- >15: methylation clairement deficiente, supplementation urgente

CAUSES HOMOCYSTEINE ELEVEE:
- Deficit B12, B6 et/ou folate (cause #1)
- Mutation MTHFR (40% de la population a au moins une copie)
- Insuffisance renale
- Hypothyroidie
- Cafe excessif (>6 tasses/jour)

PROTOCOLE HOMOCYSTEINE HAUTE:
1. Methylfolate (5-MTHF) 800-1000mcg/jour (PAS acide folique synthetique)
2. Methylcobalamine (B12 active) 1000-2000mcg sublingual
3. P5P (B6 active) 50mg/jour
4. TMG (trimethylglycine/betaine) 500-1000mg si homocysteine > 12
5. Choline/phosphatidylcholine 500mg: donneur de groupes methyl

FERRITINE - STOCKAGE DU FER:
- Lab range H: 20-300 ng/mL (BEAUCOUP trop large)
- Optimal H: 80-150 ng/mL
- Optimal F: 50-100 ng/mL
- <50: reserves basses, fatigue, perte de force, ongles cassants
- <20: carence avancee, anemie probable
- >200 (H): exces, pro-oxydant, pro-inflammatoire
- >300: bilan hemochromatose (saturation transferrine, gene HFE)

IMPACT FERRITINE SUR LA PERFORMANCE:
- Ferritine < 50 = baisse VO2max de 10-15% (transport O2 compromis)
- Ferritine < 30 = fatigue constante, recuperation tres lente, immunite basse
- Ferritine optimale = myoglobine saturee, enzymes mitochondriales fonctionnelles
- La conversion T4→T3 necessite du fer (ferritine >80 pour thyroide optimale)

PROTOCOLE CARENCE EN FER:
1. Fer bisglycinate 25-50mg/jour (mieux tolere que sulfate)
2. Prendre avec vitamine C 500mg (absorption +67%)
3. NE PAS prendre avec cafe, the, calcium, zinc (inhibent absorption)
4. Prendre a jeun ou 2h apres repas
5. Controler ferritine a 8 semaines
6. Objectif: ferritine 80-150 ng/mL

PROTOCOLE FERRITINE HAUTE:
1. Don du sang regulier (1x/trimestre)
2. Reduire viande rouge
3. The vert avec repas riches en fer (inhibe absorption)
4. Checker saturation transferrine et gene HFE si >300

FER SERIQUE & SATURATION TRANSFERRINE:
- Fer serique seul = peu fiable (varie enormement dans la journee)
- Saturation transferrine: optimal 30-45%
- <20%: carence meme si ferritine "normale" (inflammation peut fausser ferritine)
- >50%: surcharge, investiguer hemochromatose

REFERENCES:
- Camaschella C. Iron-deficiency anemia. N Engl J Med. 2015;372(19):1832-1843.
- Refsum H et al. Facts and recommendations about total homocysteine determinations. Clin Chem. 2004;50(1):3-32.
- Ridker PM. Clinical application of C-reactive protein for cardiovascular disease detection and prevention. Circulation. 2003;107(3):363-369.
`
  }
];

// ============================================================================
// PANEL VITAMINES & MINERAUX
// ============================================================================

const MICRONUTRIENT_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Vitamine D, B12, Folate, Magnesium, Zinc : Les Marqueurs Micronutritionnels Critiques",
    category: "bloodwork",
    url: "neurocore://blood/micronutrients",
    keywords: ["vitamine d", "b12", "folate", "magnesium", "zinc", "carences", "supplements", "performance", "immunite", "biomarker"],
    content: `
MICRONUTRIMENTS - INTERPRETATION POUR ATHLETES ET BODYBUILDERS

VITAMINE D (25-OH):
Pas une vitamine mais une HORMONE. Recepteurs dans chaque tissu du corps.
- Lab range: 30-100 ng/mL
- Optimal performance: 50-80 ng/mL
- Insuffisance: 20-30 ng/mL (tres courant: >40% de la population)
- Carence: <20 ng/mL

Impact performance: Chaque 10 ng/mL d'augmentation = ~5% augmentation force musculaire
- <30 ng/mL: immunite basse, fatigue, douleurs, masse musculaire suboptimale
- 50-80 ng/mL: absorption calcium optimale, immunite renforcee, production testosterone soutenue
- >100 ng/mL: toxicite possible (hypercalcemie), pas de benefice supplementaire

Protocole:
- Si <30: 10000 UI/jour pendant 8 semaines puis controle
- Si 30-50: 5000 UI/jour en maintenance
- Si 50-80: 2000-4000 UI/jour en maintenance
- TOUJOURS avec vitamine K2 MK-7 200mcg (dirige le calcium vers les os, pas les arteres)
- Prendre avec un repas gras (liposoluble)

B12 (COBALAMINE):
Essentielle pour synthese ADN, neurones, formation des globules rouges, methylation.
- Lab range: 200-900 pg/mL
- Optimal: 500-800 pg/mL
- <400: suboptimal, symptomes possibles (fatigue, brouillard mental, neuropathie)
- <200: carence franche, anemie megaloblastique possible

A risque: vegetariens/vegans (B12 uniquement dans produits animaux), >50 ans (absorption reduite), metformine (reduit absorption B12 de 30%)
Forme optimale: methylcobalamine ou hydroxocobalamine (pas cyanocobalamine)
Dose: 1000-2000mcg sublingual/jour

FOLATE (B9):
Cycle de methylation, synthese ADN, division cellulaire.
- Lab range: 3-999 ng/mL
- Optimal: 10-20 ng/mL
- Bas + homocysteine haute = methylation bloquee
Forme: methylfolate (5-MTHF), jamais acide folique synthetique (40% de la pop ne la convertit pas bien, mutation MTHFR)

MAGNESIUM RBC (INTRA-ERYTHROCYTAIRE):
Le serique est un MAUVAIS marqueur (seulement 1% du Mg est dans le sang). Mg RBC = plus fiable.
- Lab range: 4.2-6.8 mg/dL
- Optimal: 5.5-6.5 mg/dL
- Bas = crampes, insomnie, anxiete, pression arterielle elevee, resistance insuline

Roles pour athletes:
- 300+ reactions enzymatiques dont ATP (energie)
- Relaxation musculaire, qualite de sommeil
- Sensibilite a l'insuline
- Reduction crampes et spasmes
- Cofacteur conversion T4→T3

Formes recommandees:
- Bisglycinate: sommeil, relaxation (400mg soir)
- L-Threonate: cognition, cerveau
- Taurate: cardiovasculaire
- EVITER: oxyde de magnesium (absorption <4%, effet laxatif)

ZINC:
Cofacteur de 300+ enzymes. Critique pour testosterone, immunite, thyroide, synthese proteique.
- Lab range: 60-120 mcg/dL
- Optimal: 90-110 mcg/dL
- Bas = testosterone basse, immunite basse, cicatrisation lente, gout/odorat diminues

Supplementation: 30-50mg/jour (picolinate ou chelate)
- Prendre LOIN du fer, calcium, cafe
- Supplementer cuivre 1-2mg si zinc >50mg/jour (le zinc deplète le cuivre)

REFERENCES:
- Cannell JJ et al. Athletic performance and vitamin D. Med Sci Sports Exerc. 2009;41(5):1102-1110.
- Nielsen FH, Lukaski HC. Update on the relationship between magnesium and exercise. Magnes Res. 2006;19(3):180-189.
- Prasad AS. Discovery of human zinc deficiency: its impact on human health and disease. Adv Nutr. 2013;4(2):176-190.
`
  }
];

// ============================================================================
// PANEL HEPATIQUE & RENAL
// ============================================================================

const LIVER_KIDNEY_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Bilan Hepatique et Renal : ALT, AST, GGT, Creatinine, eGFR - Interpretation Athlete",
    category: "bloodwork",
    url: "neurocore://blood/liver-kidney",
    keywords: ["alt", "ast", "ggt", "creatinine", "egfr", "foie", "rein", "hepatique", "renal", "biomarker", "bodybuilding"],
    content: `
BILAN HEPATIQUE & RENAL - INTERPRETATION ATHLETE/BODYBUILDER

ATTENTION: LES ATHLETES ONT DES VALEURS DIFFERENTES
Un training intense eleve naturellement ALT, AST et creatinine. Interpreter sans ce contexte = faux diagnostics.

ALT (ALANINE AMINOTRANSFERASE):
Enzyme principalement hepatique. Marqueur le plus specifique du foie.
- Lab range: 7-56 U/L
- Optimal: < 30 U/L
- 30-56: zone grise, verifier GGT. Si GGT normal + training recent = probablement musculaire
- >56: atteinte hepatique probable si persistant
- Entrainement intense peut elever ALT de 20-50% pendant 48-72h (fuite depuis les myocytes)

AST (ASPARTATE AMINOTRANSFERASE):
Enzyme dans foie ET muscles. MOINS specifique que ALT.
- Lab range: 10-40 U/L
- Optimal: < 30 U/L
- AST elevee SEULE (ALT normale) = probablement origine musculaire, pas hepatique
- Ratio AST/ALT > 2: suspecter alcool
- Post-training intense: AST peut doubler temporairement

GGT (GAMMA-GLUTAMYL TRANSFERASE):
Le "juge de paix" hepatique. Si GGT est normal, ALT/AST elevees = probablement musculaire.
- Lab range: 9-48 U/L
- Optimal: < 25 U/L
- GGT eleve = stress oxydatif hepatique, alcool, steatose (NAFLD), medicaments hepatotoxiques
- GGT + ALT eleves = atteinte hepatique reelle
- GGT eleve isole: souvent alcool ou NAFLD

QUAND C'EST LE FOIE vs LE MUSCLE:
- ALT + AST eleves + GGT NORMAL = musculaire (training recent)
- ALT + AST eleves + GGT ELEVE = hepatique (investiguer)
- Dosage CK (creatine kinase) pour confirmer origine musculaire
- Toujours mesurer a 48-72h de distance du dernier training intense

STEATOSE HEPATIQUE (NAFLD) CHEZ LE BODYBUILDER:
- Prevalente si bulk agressif + surplus calorique important
- Diagnostiquee par echographie + ALT persistamment >40 + GGT eleve
- Le fructose en exces est le pire (converti en graisse hepatique)
- Protocole: reduire fructose, ajouter choline 500mg, NAC 600mg x2/jour

CREATININE:
Dechet du metabolisme de la creatine musculaire. Filtrée par les reins.
- Lab range: 0.7-1.3 mg/dL
- Attention: PLUS DE MUSCLE = PLUS DE CREATININE
- Un bodybuilder de 100kg peut avoir 1.3-1.5 mg/dL de creatinine en etant parfaitement sain
- Supplementation en creatine augmente la creatinine de 0.1-0.3 mg/dL
- Ce n'est PAS de l'insuffisance renale, c'est de la production augmentee

eGFR (DEBIT DE FILTRATION GLOMERULAIRE ESTIME):
- Normal: > 90 mL/min
- Optimal: > 100 mL/min
- IMPORTANT: les formules (CKD-EPI) utilisent la creatinine, donc SOUS-ESTIMENT l'eGFR chez les musculeux
- Si eGFR semble bas mais creatinine expliquee par la masse musculaire: verifier Cystatine C (indépendant de la masse musculaire)

HYDRATATION ET MARQUEURS RENAUX:
- Deshydratation = augmente creatinine et baisse eGFR artificiellement
- Toujours mesurer bien hydrate
- Athletes en preparation competition (restriction eau): valeurs completement faussees

PROTEINES ET REINS - LE MYTHE:
- 2g/kg/jour de proteines ne cause PAS de dommages renaux chez des sujets sains
- Meta-analyse Devries 2018: aucune alteration de la fonction renale avec apport eleve chez sujets sains
- Exception: si maladie renale pre-existante, adapter l'apport sous supervision medicale

PROTOCOLE HEPATOPROTECTION (BODYBUILDERS):
1. NAC (N-Acetyl-Cysteine) 600mg x2/jour: precurseur glutathion, detox hepatique
2. Silymarine (chardon-marie) 300-600mg/jour: hepatoprotecteur
3. Choline/phosphatidylcholine 500mg: previent steatose
4. Limiter alcool (non negociable)
5. TUDCA 250-500mg si enzymes chroniquement elevees (utilise en hepatologie)
6. Omega-3 2-4g: anti-inflammatoire hepatique

REFERENCES:
- Nathwani RA et al. Serum alanine aminotransferase in skeletal muscle diseases. Hepatology. 2005;41(2):380-382.
- Devries MC et al. Changes in Kidney Function Do Not Differ between Healthy Adults Consuming Higher vs Lower Protein Diets. J Nutr. 2018;148(11):1760-1767.
- Pettersson J et al. Muscular exercise can cause highly pathological liver function tests in healthy men. Br J Clin Pharmacol. 2008;65(2):253-259.
`
  }
];

// ============================================================================
// PROTOCOLES PAR OBJECTIF
// ============================================================================

const PROTOCOL_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Protocole Bilan Sanguin Optimise pour Prise de Muscle / Bodybuilding",
    category: "bloodwork",
    url: "neurocore://blood/protocol-muscle-gain",
    keywords: ["prise de muscle", "bodybuilding", "testosterone", "igf-1", "insuline", "anabolisme", "synthese proteique", "biomarker", "protocole"],
    content: `
PROTOCOLE BILAN SANGUIN - PRISE DE MUSCLE / BODYBUILDING

MARQUEURS PRIORITAIRES A TESTER:
Tier 1 (obligatoire):
- Testosterone totale + libre
- Estradiol sensible
- SHBG
- Cortisol matin
- IGF-1
- Insuline a jeun + Glycemie
- Ferritine
- Vitamine D
- B12
- CRP-us
- Bilan hepatique (ALT, AST, GGT)
- NFS complete

Tier 2 (recommande):
- DHEA-S
- Prolactine
- Thyroide (TSH, T3 libre)
- Magnesium RBC
- Zinc
- Homocysteine
- Profil lipidique complet (ApoB, HDL, TG)

TIMING DU BILAN:
- 48-72h apres le dernier training intense (sinon CK, AST, ALT fausses)
- Matin a jeun (8-10h) pour cortisol et glycemie
- Pas d'alcool 48h avant
- Hydratation normale

INTERPRETATION ORIENTEE MUSCLE:
1. ENVIRONNEMENT ANABOLIQUE:
   - Testo totale > 600 ng/dL ✓ (idealement > 700)
   - Testo libre > 15 pg/mL ✓
   - IGF-1 > 200 ng/mL ✓
   - Cortisol < 18 mcg/dL ✓ (ratio testo/cortisol > 0.35)
   - Insuline jeun < 8 mcIU/mL ✓ (sensibilite = meilleur partitioning)
   - Estradiol 20-35 pg/mL ✓ (E2 NECESSAIRE pour les articulations et le cerveau)

2. RECUPERATION:
   - Ferritine 80-150 ng/mL ✓ (transport O2 pour recuperation)
   - CRP-us < 1.0 mg/L ✓ (pas d'inflammation chronique)
   - Vitamine D 50-80 ng/mL ✓

3. SANTE DE BASE:
   - Bilan hepatique normal (si eleve = foie surcharge, absorption nutriments compromise)
   - eGFR > 90 (reins OK pour apport proteique eleve)
   - Thyroide optimale (T3 libre > 3.0 pg/mL pour metabolisme actif)

SUPPLEMENTATION ORIENTEE ANABOLISME NATUREL:
- Creatine monohydrate 5g/jour (etude la plus repliquee en sport science)
- Zinc 30mg + Magnesium 400mg + B6 50mg (ZMA classique, soir)
- Vitamine D 4000-5000 UI + K2 200mcg
- Ashwagandha KSM-66 600mg (testo +15%, cortisol -28%)
- Omega-3 2-4g EPA/DHA (anti-inflammatoire, sensibilite insuline)

FREQUENCE DES BILANS:
- Tous les 6 mois en general
- Tous les 3 mois si optimisation active ou changement de protocole
- Avant et apres un bulk/cut prolonge

REFERENCES:
- Morton RW et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains. Br J Sports Med. 2018;52(6):376-384.
- Wankhede S et al. Examining the effect of Withania somnifera supplementation on muscle strength and recovery. J Int Soc Sports Nutr. 2015;12:43.
`
  },
  {
    source: "manual",
    title: "Protocole Bilan Sanguin Optimise pour Perte de Gras / Seche",
    category: "bloodwork",
    url: "neurocore://blood/protocol-fat-loss",
    keywords: ["perte de gras", "seche", "deficit calorique", "thyroide", "insuline", "leptine", "metabolisme", "cortisol", "biomarker", "protocole"],
    content: `
PROTOCOLE BILAN SANGUIN - PERTE DE GRAS / SECHE

POURQUOI LE BILAN EST CRITIQUE EN DEFICIT:
Le deficit calorique est un stress. Le corps s'adapte en baissant: T3, testosterone, leptine, IGF-1 et en montant: cortisol, ghrelinr, rT3. Sans monitoring sanguin, on fonce dans le mur metabolique.

MARQUEURS PRIORITAIRES EN DEFICIT:
Tier 1 (obligatoire):
- TSH + T3 libre + T3 reverse (adaptation metabolique!)
- Insuline a jeun + Glycemie + HbA1c
- Cortisol matin (stress du deficit)
- Testosterone totale + libre (chute en deficit)
- Leptine (si disponible - marqueur de l'adaptation)
- CRP-us (inflammation augmente en deficit prolonge)
- Ferritine (les carences se revelent en deficit)
- NFS complete (anemie de restriction)

Tier 2:
- SHBG (monte en deficit = testo libre chute)
- Profil lipidique (souvent ameliore en perte de gras)
- Vitamine D, B12, Magnesium (les carences bloquent la perte)
- Bilan hepatique (steatose peut s'aggraver initialement en deficit)

ADAPTATION METABOLIQUE - LES SIGNAUX D'ALARME:
Signal 1: T3 libre chute < 2.8 pg/mL = metabolisme freine
Signal 2: rT3 monte > 15 ng/dL = conversion bloquee
Signal 3: Cortisol > 20 mcg/dL = stress excessif
Signal 4: Testo < 400 ng/dL (ou chute de >30% vs baseline) = trop agressif
Signal 5: CRP-us monte > 1.5 mg/L = inflammation de restriction

SI 2+ SIGNAUX = REFEED OU DIET BREAK OBLIGATOIRE:
- Diet break: 7-14 jours a maintenance (calories et macros normaux)
- Refeed: 1-2 jours a maintenance avec glucides +50% (restaure leptine, T3, glycogene)
- Frequence recommandee: refeed 1x/semaine si >15% BF, 2x/semaine si <12% BF

STRATEGIE PERTE DE GRAS PAR PROFIL SANGUIN:

Profil A - "Insulino-resistant" (insuline >8, TG/HDL >2):
- Priorite: supprimer glucides raffines, cardio zone 2 intensif
- Glucides < 30% des calories, concentres peri-training
- Berberine 500mg x2, chrome 400mcg, magnesium 400mg

Profil B - "Hypothyroide subclinique" (TSH >2.5, T3 libre <3.0):
- NE PAS faire de deficit agressif (>500 kcal) - va empirer
- Deficit modere 300-400 kcal max
- Selenium 200mcg, iode 150mcg, zinc 30mg
- Refeeds frequents (2x/semaine minimum)
- Zone 2 cardio prudent, pas de HIIT excessif

Profil C - "Stress/Cortisol" (cortisol >20, testo basse, CRP monte):
- Reduire le deficit a 200-300 kcal
- Reduire le volume d'entrainement de 30%
- Sommeil prioritaire (7-9h)
- Ashwagandha 600mg, phosphatidylserine 400mg, magnesium 600mg
- Marche au lieu de HIIT
- Pas de cardio a jeun (cortisol deja eleve)

Profil D - "Metaboliquement sain" (tous marqueurs OK):
- Deficit standard 500 kcal, periodes de maintenance regulieres
- Stack: cafeine 200mg + L-carnitine 2g pre-training
- Protéines 2.2-2.5g/kg (preservation masse maigre en deficit)

REFERENCES:
- Trexler ET et al. Metabolic adaptation to weight loss: implications for the athlete. J Int Soc Sports Nutr. 2014;11(1):7.
- Rosenbaum M, Leibel RL. Adaptive thermogenesis in humans. Int J Obes. 2010;34 Suppl 1:S47-55.
- Helms ER et al. Evidence-based recommendations for natural bodybuilding contest preparation. J Int Soc Sports Nutr. 2014;11:20.
`
  },
  {
    source: "manual",
    title: "Protocole Bilan Sanguin pour Sante Globale et Longevite",
    category: "bloodwork",
    url: "neurocore://blood/protocol-health-longevity",
    keywords: ["longevite", "sante", "prevention", "cardiovasculaire", "cancer", "apob", "hba1c", "insuline", "inflammation", "biomarker", "protocole"],
    content: `
PROTOCOLE BILAN SANGUIN - SANTE GLOBALE & LONGEVITE

LES 4 CAVALIERS DE LA MORTALITE (Peter Attia):
1. Maladies cardiovasculaires (ApoB, Lp(a), CRP)
2. Cancer (IGF-1, insuline, inflammation)
3. Maladies neurodegeneratives (homocysteine, HbA1c, inflammation)
4. Maladies metaboliques (insuline, glucose, HbA1c, triglycerides)

PANEL LONGEVITE OPTIMAL:
Metabolique:
- Insuline a jeun (<5 mcIU/mL ideal)
- Glycemie a jeun (<90 mg/dL)
- HbA1c (<5.3%)
- HOMA-IR (<1.0)
- Triglycerides (<80 mg/dL)

Cardiovasculaire:
- ApoB (<80 mg/dL, ideal <60)
- Lp(a) (tester 1x dans sa vie, genetique)
- HDL (>55 mg/dL)
- CRP-us (<0.5 mg/L)
- Homocysteine (<9 mcmol/L)

Hormonal:
- Testosterone (>500 ng/dL meme apres 50 ans)
- DHEA-S (reflete l'age biologique)
- Cortisol (10-15 mcg/dL ideal)
- Thyroide optimale (T3 libre 3.0-3.5 pg/mL)

Micronutriments:
- Vitamine D (50-80 ng/mL)
- B12 (500-800 pg/mL)
- Ferritine (80-150 ng/mL homme, 50-100 femme)
- Magnesium RBC (5.5-6.5 mg/dL)

Hepatique/Renal:
- ALT (<25 U/L ideal)
- GGT (<20 U/L ideal)
- eGFR (>100 mL/min)
- Uric acid (<6 mg/dL)

NFS:
- Hemoglobine, hematocrite, plaquettes
- Globules blancs (lymphocytes, neutrophiles)

INTERVENTIONS UNIVERSELLES ANTI-AGING:
1. Exercice: 150+ min zone 2 + 3-4x musculation/semaine (le "medicament" le plus puissant)
2. Sommeil: 7-9h, optimiser sommeil profond (GH, reparation, detox cerebrale)
3. Nutrition: protéines adequates, faible en sucres raffines, riche en vegetaux
4. Stress: gestion active (meditation, respiration, nature)
5. Connectivite sociale: facteur independant de mortalite

STACK SUPPLEMENTS LONGEVITE (EVIDENCE-BASED):
- Omega-3 2g EPA/DHA: anti-inflammatoire, cardiovasculaire
- Magnesium 400mg: 300+ reactions enzymatiques
- Vitamine D + K2: os, immunite, hormones
- Creatine 3-5g: cerveau, muscle, mitochondries (longevite cognitive)
- NAC ou glutathion liposomal: antioxydant maitre

FREQUENCE DES BILANS:
- Annuel pour les sujets sains < 40 ans
- Semestriel apres 40 ans ou si facteurs de risque
- Trimestriel si optimisation active

REFERENCES:
- Attia P, Gifford B. Outlive: The Science and Art of Longevity. Harmony, 2023.
- Longo VD et al. Interventions to Slow Aging in Humans. Aging Cell. 2015;14(4):497-510.
- Ioannidis JPA. The challenge of reforming nutritional epidemiologic research. JAMA. 2018;320(10):969-970.
`
  }
];

// ============================================================================
// SOURCES SPECIFIQUES - HUBERMAN BLOOD EPISODES
// ============================================================================

const HUBERMAN_BLOOD_URLS: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "Huberman Lab - Blood Testing & Biomarkers: Essential Markers to Track",
    category: "bloodwork",
    url: "https://www.hubermanlab.com/episode/how-to-assess-track-your-health-with-blood-testing",
    keywords: ["huberman", "bloodwork", "biomarker", "testosterone", "thyroide", "metabolisme", "lipides", "insuline", "apob", "bilan sanguin"],
    content: `
HUBERMAN LAB - BLOOD TESTING EPISODE SUMMARY

MARQUEURS QUE HUBERMAN RECOMMANDE DE TESTER REGULIEREMENT:

Panel Metabolique:
- Glucose a jeun + Insuline a jeun + HbA1c: le trio metabolique minimal
- Insuline a jeun est le marqueur le plus precoce de resistance insuline, bien avant que la glycemie monte
- HOMA-IR comme index calcule simple

Panel Lipidique:
- ApoB: le "gold standard" pour risque cardiovasculaire, superieur au LDL-C seul
- Lp(a): marqueur genetique, tester 1x dans sa vie. Si eleve, risque hereditaire qu'aucun lifestyle ne corrige completement
- Triglycerides: reflet direct de la sante metabolique, correle avec la taille des particules LDL
- HDL: exercice et sommeil sont les meilleurs boosters naturels

Panel Hormonal:
- Testosterone totale ET libre: le total seul est trompeur si SHBG est haut
- Cortisol matin: rythme circadien (pic 30 min apres reveil)
- Estradiol: les hommes en ont besoin pour les os et le cerveau, trop = probleme
- Thyroide: TSH + T3 libre au minimum

Panel Inflammatoire:
- CRP-us: viser < 1.0 mg/L pour protection cardiovasculaire
- Homocysteine: reflete methylation et status B-vitamines

Micronutriments:
- Vitamine D: la plupart des gens sont insuffisants
- B12 et Folate: critique pour methylation et energie
- Ferritine: stockage fer, impact enorme sur energie et VO2max

PROTOCOLES HUBERMAN DISCUTES:
- Zone 2 cardio 150-200min/semaine: ameliore quasi TOUS les marqueurs
- Cold exposure: augmente dopamine +250% (ameliore energie et humeur, pas directement les biomarqueurs)
- Sommeil: 7-9h, dans le noir, temperature basse
- Supplements: Omega-3, VitD, Magnesium, Creatine comme base
- Timing: prise de sang matin a jeun, 48h apres training intense
`
  }
];

// ============================================================================
// PUBMED CURATED REFERENCES
// ============================================================================

const PUBMED_CURATED: Omit<ScrapedArticle, "scrapedAt">[] = [
  {
    source: "manual",
    title: "PubMed Meta-Analyses Cles pour Biomarqueurs et Performance Sportive",
    category: "bloodwork",
    url: "neurocore://blood/pubmed-meta-analyses",
    keywords: ["pubmed", "meta-analyse", "evidence-based", "testosterone", "vitamine d", "creatine", "omega-3", "berberine", "performance", "biomarker"],
    content: `
REFERENCES PUBMED CLES - META-ANALYSES ET SYSTEMATIC REVIEWS

TESTOSTERONE ET EXERCICE:
- Kraemer & Ratamess (2005) Sports Med 35(4):339-361: Hormonal responses to resistance exercise. Le training compound heavy (squat, deadlift) produit les plus grandes reponses de testosterone aigues.
- Vingren et al (2010) Sports Med 40(12):1037-1053: Testosterone physiology in resistance training. La testosterone augmente de 15-30% apres training de resistance intense, pic a 30 min.
- Corona et al (2020) J Endocrinol Invest 43:1067-1087: Meta-analyse de 37 RCTs sur TRT - augmente masse maigre +3.2kg, reduit masse grasse -1.6kg en 12 mois.

VITAMINE D ET PERFORMANCE:
- Cannell et al (2009) Med Sci Sports Exerc 41(5):1102-1110: Correlation positive entre 25-OH-D et force musculaire. Athletes avec >50 ng/mL outperforment ceux <30.
- Chiang et al (2017) Nutrients 9(7):659: Meta-analyse - supplementation VitD ameliore force musculaire chez sujets deficients, pas d'effet supplementaire si deja suffisants.

CREATINE:
- Rawson & Volek (2003) J Strength Cond Res 17(4):822-831: Meta-analyse - creatine augmente 1RM bench +5.2% et squat +8% vs placebo.
- Branch (2003) J Sport Sci Med 2(4):123-132: Meta-analyse de 100+ etudes - creatine est le supplement le plus valide pour augmenter la performance anaerobie.

OMEGA-3 ET INFLAMMATION:
- Calder (2017) Eur J Pharmacol 816:56-68: EPA/DHA reduisent CRP, TNF-alpha, IL-6. Dose minimale efficace: 2g/jour combiné EPA+DHA.
- Philpott et al (2019) J Int Soc Sports Nutr 16(1):30: Omega-3 ameliorent la recuperation musculaire post-exercice et reduisent DOMS de 15-25%.

BERBERINE ET METABOLISME:
- Yin et al (2008) Metabolism 57(5):712-717: Berberine reduit HbA1c, glycemie jeun et insuline de facon comparable a la metformine chez diabetiques type 2.
- Liang et al (2019) Oxid Med Cell Longev: Meta-analyse - berberine reduit LDL -23.5 mg/dL, triglycerides -43.7 mg/dL.

ASHWAGANDHA ET HORMONES:
- Wankhede et al (2015) J Int Soc Sports Nutr 12:43: 600mg KSM-66 8 semaines - testo +15%, cortisol -28%, force augmentee vs placebo.
- Lopresti et al (2019) Medicine 98(37):e17186: Ashwagandha 600mg ameliore testosterone et DHEA-S chez hommes surpoids 40-70 ans.

MAGNESIUM ET PERFORMANCE:
- Zhang et al (2017) Nutrients 9(8):946: Meta-analyse - supplementation magnesium ameliore la performance aerobique et anaerobie, surtout chez deficients.
- Nielsen & Lukaski (2006) Magnes Res 19(3):180-189: Deficiency en Mg augmente le cout energetique de l'exercice et reduit la performance.

FER ET VO2MAX:
- Burden et al (2015) Sports Med 45(3):313-325: Meta-analyse - supplementation fer chez athletes carences augmente VO2max, reduit frequence cardiaque et concentration lactate.
- Dellavalle & Haas (2012) Med Sci Sports Exerc: Ferritine <20 ng/mL = impact direct sur la capacite aerobique.

PROTEINES ET HYPERTROPHIE:
- Morton et al (2018) Br J Sports Med 52(6):376-384: Meta-analyse de 49 RCTs - apport proteique 1.6g/kg max, au-dela = pas de benefice supplementaire pour la masse maigre. Seuil par repas: 0.4-0.55g/kg pour maximiser MPS.
- Schoenfeld & Aragon (2018) J Int Soc Sports Nutr 15:10: Distribution proteique sur 4+ repas > 1-2 repas pour maximiser MPS quotidienne.
`
  }
];

// ============================================================================
// ASSEMBLY & SEED FUNCTION
// ============================================================================

const ALL_BLOOD_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  ...HORMONAL_ARTICLES,
  ...THYROID_ARTICLES,
  ...METABOLIC_ARTICLES,
  ...INFLAMMATION_ARTICLES,
  ...MICRONUTRIENT_ARTICLES,
  ...LIVER_KIDNEY_ARTICLES,
  ...PROTOCOL_ARTICLES,
  ...HUBERMAN_BLOOD_URLS,
  ...PUBMED_CURATED,
];

async function seedBloodMarkerArticles() {
  console.log("\n=== SEEDING BLOOD MARKER KNOWLEDGE BASE ===\n");
  console.log(`Total articles to seed: ${ALL_BLOOD_ARTICLES.length}`);
  console.log("Categories covered:");

  const categories = new Map<string, number>();
  for (const art of ALL_BLOOD_ARTICLES) {
    categories.set(art.category || "unknown", (categories.get(art.category || "unknown") || 0) + 1);
  }
  for (const [cat, count] of categories) {
    console.log(`  - ${cat}: ${count} articles`);
  }

  const articlesToSave: ScrapedArticle[] = ALL_BLOOD_ARTICLES.map(a => ({
    ...a,
    scrapedAt: new Date()
  }));

  try {
    const result = await saveArticles(articlesToSave);
    console.log(`\nSaved: ${result.saved} articles`);
    console.log(`Duplicates skipped: ${result.duplicates}`);
    console.log("\nArticles added:");
    for (const article of ALL_BLOOD_ARTICLES) {
      console.log(`   [${article.category}] ${article.title}`);
    }
    console.log("\n=== SEED COMPLETE ===\n");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { ALL_BLOOD_ARTICLES };

// Run if called directly
seedBloodMarkerArticles();
