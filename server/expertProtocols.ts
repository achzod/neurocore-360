export const EXPERT_PROTOCOLS = {
  "profil-base": {
    expert: "Medecin anti-age / Longevite (style Peter Attia, David Sinclair)",
    focus: [
      "Fenetre hormonale selon l'age (pic, plateau, declin)",
      "Marqueurs de vieillissement biologique vs chronologique",
      "Calcul de l'age biologique (tests epigenetiques : TruAge, GlycanAge)",
      "Bilan sanguin anti-age complet a demander"
    ],
    supplements: [
      { name: "NMN ou NR (nicotinamide riboside)", dosage: "500-1000mg/jour", timing: "matin", why: "augmente NAD+", brands: ["ProHealth Longevity", "Alive By Science"] },
      { name: "Resveratrol", dosage: "500mg", timing: "matin avec graisses", why: "active SIRT1", brands: ["Thorne ResveraCel", "Life Extension"] },
      { name: "Berberine", dosage: "500mg x3", timing: "avec repas", why: "alternative naturelle a Metformine, sensibilite insuline", brands: ["Thorne", "NOW Foods"] },
      { name: "Vitamine D3", dosage: "5000-10000 UI", timing: "matin avec graisses", why: "viser 60-80 ng/mL", brands: ["Thorne D3/K2", "NOW Foods"] },
      { name: "Vitamine K2 MK-7", dosage: "200mcg", timing: "avec D3", why: "synergie calcium", brands: ["Thorne", "Life Extension"] },
    ]
  },

  "composition-corporelle": {
    expert: "Coach physique elite (style Mike Israetel, Menno Henselmans)",
    focus: [
      "Estimation du metabolic adaptation si historique regimes",
      "Set point theory et comment le modifier",
      "Protocole recomp vs cut vs bulk selon profil",
      "Deficit/surplus exact en kcal",
      "Repartition macros precise (2.2g/kg LBM proteines)"
    ],
    supplements: [
      { name: "Creatine Monohydrate", dosage: "5g/jour", timing: "n'importe quand", why: "seul supplement legal vraiment efficace - pas de loading", brands: ["Creapure", "Thorne", "NOW Foods"] },
      { name: "HMB", dosage: "3g/jour", timing: "reparti 3 prises", why: "anti-catabolisme si deficit calorique", brands: ["Optimum Nutrition", "NOW Foods"] },
      { name: "Forskoline", dosage: "250mg x2", timing: "matin et midi", why: "lipolyse via AMPc (10% forskohlii minimum)", brands: ["Life Extension", "Nutricost"] },
      { name: "Yohimbine HCL", dosage: "0.2mg/kg", timing: "a jeun avant cardio", why: "bloque alpha-2 recepteurs graisse rebelle - ATTENTION anxiete/HTA", brands: ["Primaforce", "SNS"] },
      { name: "Cafeine anhydre", dosage: "3-6mg/kg", timing: "30min pre-training", why: "lipolyse + performance", brands: ["Nutricost", "BulkSupplements"] },
    ]
  },

  "metabolisme-energie": {
    expert: "Specialiste mitochondrial (style Dr Rhonda Patrick, Ari Whitten)",
    focus: [
      "Diagnostic mitochondrial : biogenese, fonction, membrane",
      "Flexibilite metabolique : test et protocole",
      "Protocole lumiere rouge (PBM) : 660nm + 850nm, 10-20min/jour",
      "Therapie par le froid : protocole Soberg (11min/semaine minimum)",
      "Sauna : 4x/semaine, 20min a 80C+ pour heat shock proteins"
    ],
    supplements: [
      { name: "CoQ10 Ubiquinol", dosage: "200-400mg", timing: "avec graisses matin", why: "PAS ubiquinone - forme active directe", brands: ["Jarrow Ubiquinol", "Life Extension Super Ubiquinol"] },
      { name: "PQQ", dosage: "20mg/jour", timing: "matin", why: "biogenese mitochondriale", brands: ["Life Extension", "Jarrow"] },
      { name: "Acetyl-L-Carnitine (ALCAR)", dosage: "1-2g", timing: "matin a jeun", why: "transport acides gras mitochondries", brands: ["NOW Foods", "Nutricost"] },
      { name: "R-ALA (R-Alpha Lipoic Acid)", dosage: "300-600mg", timing: "a jeun", why: "forme R uniquement - pas racemique", brands: ["Geronova R-Lipoic", "Life Extension"] },
      { name: "D-Ribose", dosage: "5g x3", timing: "matin/midi/soir", why: "substrat ATP direct si fatigue chronique", brands: ["BioEnergy Ribose", "NOW Foods"] },
      { name: "Shilajit purifie", dosage: "250-500mg", timing: "matin", why: "acide fulvique, transport electrons", brands: ["Primavie", "Nootropics Depot"] },
    ]
  },

  "nutrition-tracking": {
    expert: "Nutritionniste fonctionnel (style Chris Masterjohn, Marty Kendall)",
    focus: [
      "Densite nutritionnelle par calorie (nutrient density scoring)",
      "Proteines : leucine threshold (2.5-3g par repas pour MPS)",
      "Sources proteiques classees par qualite (DIAAS score)",
      "Anti-nutriments a gerer : oxalates, phytates, lectines",
      "Timing nutritionnel selon chronotype"
    ],
    supplements: [
      { name: "Omega-3 EPA dominant", dosage: "3g EPA+DHA combines", timing: "avec repas gras", why: "inflammation - viser omega-3 index 8-12%", brands: ["Nordic Naturals EPA Xtra", "Carlson"] },
      { name: "Omega-3 DHA dominant", dosage: "3g EPA+DHA combines", timing: "avec repas gras", why: "cognition - tester OmegaQuant", brands: ["Nordic Naturals DHA Xtra", "Carlson"] },
      { name: "Vitamine K2 MK-7", dosage: "200-300mcg", timing: "avec graisses", why: "synergie D3, sante osseuse/arterielle", brands: ["Thorne", "Life Extension"] },
      { name: "Magnesium Glycinate", dosage: "400-600mg", timing: "soir", why: "forme haute biodisponibilite", brands: ["Thorne", "Pure Encapsulations"] },
    ]
  },

  "digestion-microbiome": {
    expert: "Gastro-enterologue fonctionnel (style Dr Will Bulsiewicz, Dr Jason Hawrelak)",
    focus: [
      "Classification dysbiose : SIBO, SIFO, leaky gut, insuffisance enzymatique",
      "Tests recommandes : GI-MAP, SIBO breath test, Zonuline serique",
      "Protocole 5R : Remove, Replace, Reinoculate, Repair, Rebalance"
    ],
    supplements: [
      { name: "L-Glutamine", dosage: "5-10g", timing: "a jeun matin", why: "reparation muqueuse intestinale", brands: ["Thorne", "NOW Foods"] },
      { name: "Zinc-Carnosine (PepZin GI)", dosage: "75mg x2", timing: "entre repas", why: "cicatrisation muqueuse gastrique", brands: ["Doctor's Best PepZin GI", "Integrative Therapeutics"] },
      { name: "Butyrate / Tributyrine", dosage: "300-600mg x2", timing: "avec repas", why: "carburant colonocytes, anti-inflammatoire", brands: ["BodyBio Butyrate", "Sunbutyrate"] },
      { name: "Colostrum", dosage: "2-5g", timing: "a jeun", why: "leaky gut severe - immunoglobulines", brands: ["Sovereign Laboratories", "Symbiotics"] },
      { name: "PHGG (Sunfiber)", dosage: "5-7g", timing: "avec repas", why: "prebiotique SIBO-safe, tolere", brands: ["Sunfiber", "Regular Girl"] },
    ],
    probiotics: {
      "constipation": ["B. lactis HN019", "B. lactis BB-12"],
      "diarrhee_ibs_d": ["S. boulardii", "L. rhamnosus GG"],
      "ballonnements_sibo": "eviter probiotiques classiques, utiliser PHGG",
      "humeur": ["L. rhamnosus JB-1 (psychobiotique)", "B. longum 1714"],
      "histamine_high": "EVITER L. casei, L. bulgaricus (producteurs histamine)"
    }
  },

  "activite-performance": {
    expert: "Preparateur physique elite (style Eric Cressey, Mike Boyle, Cal Dietz)",
    focus: [
      "Periodisation selon objectif : lineaire, ondulee, bloc",
      "Ratios force : bench/squat/deadlift selon niveau",
      "Hypertrophie : 10-20 series/muscle/semaine, RPE 7-9",
      "Force : 5-10 series/mouvement, RPE 8-10, 1-5 reps",
      "Puissance : contraste training, VBT (velocity based training)"
    ],
    supplements: [
      { name: "Creatine Monohydrate", dosage: "5g/jour", timing: "quotidien", why: "seul legal qui marche vraiment", brands: ["Creapure", "Thorne"] },
      { name: "Beta-alanine", dosage: "3-6g/jour", timing: "reparti (paresthesies normales)", why: "tamponnage acide lactique", brands: ["NOW Foods", "Nutricost"] },
      { name: "Citrulline Malate", dosage: "6-8g", timing: "30min pre-workout", why: "NO, vasodilatation - pas arginine (biodispo nulle)", brands: ["Nutricost", "BulkSupplements"] },
      { name: "Betaine Anhydre", dosage: "2.5g/jour", timing: "pre-workout", why: "force, puissance", brands: ["NOW Foods", "Nutricost"] },
      { name: "Taurine", dosage: "2-3g", timing: "pre-workout", why: "contrebalance stimulants", brands: ["NOW Foods", "Nutricost"] },
      { name: "Curcumine (Meriva ou Longvida)", dosage: "500mg x2", timing: "avec repas", why: "anti-inflammatoire - pas curcuma basique", brands: ["Thorne Meriva", "Life Extension Longvida"] },
      { name: "Tart Cherry Extract", dosage: "500mg x2", timing: "matin et soir", why: "anti-inflammatoire, recuperation, sommeil", brands: ["Nature's Way", "NOW Foods"] },
    ]
  },

  "sommeil-recuperation": {
    expert: "Somnologue (style Dr Matthew Walker, Dr Andrew Huberman)",
    focus: [
      "Chronotype identification (lion, ours, loup, dauphin)",
      "Architecture du sommeil : % deep, REM, light",
      "Protocole lumiere : 100,000 lux matin, <10 lux soir, lunettes blue-blocking",
      "Temperature : 18-19C chambre, douche chaude 90min avant"
    ],
    stacks: {
      endormissement_difficile: [
        { name: "L-Theanine", dosage: "200-400mg", timing: "30min avant coucher", brands: ["Suntheanine", "NOW Foods"] },
        { name: "Apigenine", dosage: "50mg", timing: "30min avant coucher", brands: ["NOW Foods Chamomile Extract"] },
        { name: "Magnesium L-Threonate (Magtein)", dosage: "144mg Mg elementaire", timing: "1h avant coucher", brands: ["Life Extension Magtein", "Double Wood"] },
        { name: "Glycine", dosage: "3g", timing: "avant coucher", brands: ["Thorne", "NOW Foods"] },
      ],
      reveils_nocturnes_cortisol: [
        { name: "Phosphatidylserine", dosage: "300-600mg", timing: "au diner", brands: ["Jarrow", "NOW Foods"] },
        { name: "Ashwagandha KSM-66", dosage: "600mg", timing: "au diner", brands: ["Nootropics Depot KSM-66", "Jarrow"] },
        { name: "Holy Basil (Tulsi)", dosage: "500mg", timing: "au diner", brands: ["Organic India", "Gaia Herbs"] },
      ],
      sommeil_non_reparateur: [
        { name: "Tart Cherry Extract", dosage: "500mg x2", timing: "matin et soir", brands: ["Nature's Way", "NOW Foods"] },
        { name: "Reishi", dosage: "1-2g", timing: "soir", brands: ["Real Mushrooms", "Four Sigmatic"] },
        { name: "Melatonine", dosage: "0.3-0.5mg MAX", timing: "30min avant coucher", why: "doses pharmacologiques = contre-productif", brands: ["Life Extension", "NOW Foods"] },
      ]
    }
  },

  "hrv-cardiaque": {
    expert: "Cardiologue fonctionnel (style Dr Joel Kahn, Marco Altini)",
    focus: [
      "Interpretation HRV : RMSSD, SDNN, LF/HF ratio",
      "Normes par age et sexe",
      "Respiration 5.5 cycles/min (coherence cardiaque parfaite)",
      "Tests cardio avances : CAC score, ApoB, Lp(a), oxLDL"
    ],
    supplements: [
      { name: "CoQ10 Ubiquinol", dosage: "200-400mg", timing: "matin avec graisses", why: "obligatoire si statines", brands: ["Jarrow Ubiquinol", "Life Extension"] },
      { name: "Omega-3 haute dose", dosage: "3-4g EPA+DHA", timing: "avec repas", why: "ameliore HRV, anti-inflammatoire", brands: ["Nordic Naturals", "Carlson"] },
      { name: "Vitamine K2 MK-7", dosage: "200-300mcg", timing: "avec graisses", why: "decalcification arteres", brands: ["Thorne", "Life Extension"] },
      { name: "Aged Garlic Extract (Kyolic)", dosage: "1200mg", timing: "avec repas", why: "anti-plaque atherome", brands: ["Kyolic Formula 100", "Kyolic Formula 104"] },
      { name: "Citrus Bergamot", dosage: "500-1000mg", timing: "avec repas", why: "LDL, triglycerides", brands: ["Life Extension", "Jarrow"] },
      { name: "Nattokinase", dosage: "2000 FU/jour", timing: "a jeun", why: "fibrinolytique naturel", brands: ["Doctor's Best", "NOW Foods"] },
      { name: "Taurine", dosage: "2-3g", timing: "quotidien", why: "anti-arythmique", brands: ["NOW Foods", "Nutricost"] },
    ]
  },

  "analyses-biomarqueurs": {
    expert: "Medecin fonctionnel (style Dr Mark Hyman, Dr Chris Kresser)",
    focus: [
      "Bilan optimal vs bilan standard",
      "Ranges OPTIMAUX (pas juste normaux)",
      "HOMA-IR calcule (insuline a jeun x glycemie / 405)",
      "DUTCH test pour metabolites hormonaux complets"
    ],
    optimal_ranges: {
      "CRP-us": "< 0.5 mg/L (pas <5)",
      "Homocysteine": "< 7 umol/L",
      "Ferritine homme": "50-150 ng/mL",
      "Vitamine D 25-OH": "50-80 ng/mL",
      "Omega-3 Index": "8-12%",
      "Insuline a jeun": "< 5 uUI/mL",
      "HOMA-IR": "< 1.0",
      "HbA1c": "< 5.3%",
    },
    tests_avances: [
      "Insuline a jeun (pas juste glycemie)",
      "B12 active (holotranscobalamine) > B12 totale",
      "RBC Magnesium (pas serique)",
      "Thyroide complete : TSH, T4L, T3L, rT3, TPO, TG",
      "Hormones : Testo totale ET libre, SHBG, Estradiol sensible, DHT",
      "Cortisol salivaire 4 points (diurnal curve)"
    ]
  },

  "hormones-stress": {
    expert: "Endocrinologue fonctionnel (style Dr Sara Gottfried, Dr Anna Cabeca)",
    focus: [
      "Lifestyle first : sommeil 8h, musculation, graisse <15%, eviter perturbateurs endocriniens",
      "Test : cortisol salivaire 4 points + DHEA-S",
      "Adaptation surrenalienne : phases (alarme, resistance, epuisement)"
    ],
    stacks: {
      optimisation_testosterone: [
        { name: "Tongkat Ali (Longjack)", dosage: "200-400mg", timing: "matin", why: "extrait 100:1 ou 200:1", brands: ["Nootropics Depot", "Double Wood"] },
        { name: "Fadogia Agrestis", dosage: "600mg/jour", timing: "matin - cycler 5 on/2 off", why: "upregule LH", brands: ["Nootropics Depot", "Double Wood"] },
        { name: "Boron", dosage: "10-12mg/jour", timing: "matin", why: "libere testosterone de SHBG", brands: ["NOW Foods", "Life Extension"] },
        { name: "Shilajit (Primavie)", dosage: "250-500mg", timing: "matin", why: "standardise acide fulvique", brands: ["Nootropics Depot Primavie"] },
        { name: "Ashwagandha KSM-66", dosage: "600mg", timing: "soir", why: "cortisol down = testo up", brands: ["Nootropics Depot", "Jarrow"] },
        { name: "DIM", dosage: "200-300mg", timing: "avec repas", why: "si estradiol eleve - metabolise en 2-OH estrone", brands: ["Thorne", "Life Extension"] },
      ],
      cortisol_eleve: [
        { name: "Phosphatidylserine", dosage: "300-600mg", timing: "soir", why: "bloque cortisol", brands: ["Jarrow", "NOW Foods"] },
        { name: "Ashwagandha KSM-66", dosage: "600mg", timing: "soir", brands: ["Nootropics Depot", "Jarrow"] },
        { name: "Relora", dosage: "250mg x3", timing: "matin/midi/soir", why: "magnolia + phellodendron", brands: ["NOW Foods", "Source Naturals"] },
        { name: "Holy Basil", dosage: "500mg x2", timing: "matin et soir", brands: ["Organic India", "Gaia Herbs"] },
        { name: "L-Theanine", dosage: "200mg x2-3", timing: "matin/midi/soir", brands: ["Suntheanine", "NOW Foods"] },
      ],
      cortisol_bas_burnout: [
        { name: "Rhodiola Rosea", dosage: "200-400mg", timing: "matin seulement", why: "3% rosavins, 1% salidroside", brands: ["Nootropics Depot", "Gaia Herbs"] },
        { name: "Eleuthero", dosage: "300-500mg", timing: "matin", brands: ["Gaia Herbs", "Nature's Way"] },
        { name: "Vitamine C", dosage: "1-2g", timing: "reparti", why: "surrenales = plus gros reservoir", brands: ["Thorne", "NOW Foods"] },
        { name: "Pantothenic acid (B5)", dosage: "500mg x2", timing: "matin et midi", brands: ["NOW Foods", "Thorne"] },
      ]
    }
  },

  "lifestyle-substances": {
    expert: "Addictologue (style Dr Anna Lembke, Dr Robert Lustig)",
    focus: [
      "Mecanismes alcool : acetaldehyde, NAD+ depletion, perturbation GABA/glutamate",
      "Cafeine : demi-vie 5-6h (12h chez metabolizers lents CYP1A2)",
      "Regles cafeine : jamais avant 90min post-reveil, jamais apres 14h",
      "Detox dopamine : 24-48h sans reseaux, porn, gaming"
    ],
    stacks: {
      protection_alcool: [
        { name: "NAC", dosage: "600-1200mg", timing: "AVANT consommation", why: "reduit dommages de 50%", brands: ["NOW Foods", "Thorne"] },
        { name: "DHM (Dihydromyricetine)", dosage: "300-600mg", timing: "apres alcool", why: "accelere metabolisme acetaldehyde", brands: ["Double Wood", "Nootropics Depot"] },
        { name: "Charbon actif", dosage: "1g", timing: "apres alcool", why: "absorbe toxines", brands: ["Nature's Way", "NOW Foods"] },
      ],
      support_hepatique: [
        { name: "TUDCA", dosage: "250-500mg/jour", timing: "avec repas", why: "acide biliaire, cytoprotecteur #1", brands: ["Thorne", "Nutricost"] },
        { name: "NAC", dosage: "600-1200mg/jour", timing: "a jeun", why: "precurseur glutathion", brands: ["NOW Foods", "Thorne"] },
        { name: "Milk Thistle (Silymarin)", dosage: "250-500mg", timing: "avec repas", why: "hepatoprotecteur classique", brands: ["Thorne Siliphos", "Jarrow"] },
        { name: "Choline", dosage: "500mg", timing: "avec repas", why: "evite steatose", brands: ["NOW Foods", "Jarrow"] },
      ],
      reset_dopaminergique: [
        { name: "Mucuna Pruriens", dosage: "100-300mg MAX (15-20% L-DOPA)", timing: "matin", why: "pas plus = downregulation", brands: ["NOW Foods", "Nutricost"] },
        { name: "NALT (N-Acetyl L-Tyrosine)", dosage: "350-700mg", timing: "matin a jeun", brands: ["Nootropics Depot", "NOW Foods"] },
        { name: "Sulbutiamine", dosage: "400mg x2", timing: "matin et midi", why: "thiamine lipophile, motivation", brands: ["Nootropics Depot", "Double Wood"] },
      ]
    }
  },

  "biomecanique-mobilite": {
    expert: "Kinesitherapeute sport (style Dr Kelly Starrett, Dr Aaron Horschig)",
    focus: [
      "Assessment : overhead squat, Thomas test, etc.",
      "Chaines musculaires a corriger",
      "McGill Big 3 quotidien : curl-up, side plank, bird dog"
    ],
    protocols: {
      epaule: {
        exercises: [
          "Face pulls : 100 reps/jour (leger, 3-4 sets)",
          "YTWL : 2 sets x 10 reps chaque lettre",
          "External rotation 90/90 : 3x15 leger",
          "Banded pull-aparts : 100/jour",
          "Dead hangs : accumuler 2-3min/jour"
        ],
        supplements: [
          { name: "Collagene type II (UC-II)", dosage: "40mg/jour", timing: "a jeun", why: "PAS collagene hydrolyse classique", brands: ["Life Extension UC-II", "NOW Foods UC-II"] },
          { name: "Cissus Quadrangularis", dosage: "500-1000mg x2", timing: "avec repas", brands: ["Nootropics Depot", "NOW Foods"] },
          { name: "MSM", dosage: "2-4g/jour", timing: "reparti", brands: ["NOW Foods", "Doctor's Best"] },
          { name: "Vitamine C", dosage: "1g", timing: "avec collagene", why: "cofacteur synthese", brands: ["NOW Foods", "Thorne"] },
        ]
      },
      genou: {
        exercises: [
          "ATG Split Squats (Ben Patrick) : progression lente",
          "Terminal Knee Extensions : 3x25 leger quotidien",
          "Reverse sled drags : 2x/semaine",
          "Box squats pour pattern correct",
          "Tibialis raises : 3x25 (souvent oublie)"
        ],
        supplements: [
          { name: "Glucosamine Sulfate", dosage: "1500mg", timing: "avec repas", why: "PAS HCL", brands: ["NOW Foods", "Doctor's Best"] },
          { name: "Chondroitin", dosage: "1200mg", timing: "avec repas", brands: ["NOW Foods", "Doctor's Best"] },
          { name: "Hyaluronic Acid", dosage: "200mg", timing: "avec repas", brands: ["NOW Foods", "Doctor's Best"] },
        ]
      },
      lombaires: {
        exercises: [
          "McGill Big 3 quotidien : curl-up, side plank, bird dog",
          "Hip hinge pattern : RDL, good mornings legers",
          "Psoas release : couch stretch 2min/cote",
          "Anti-extension core : dead bugs, planches"
        ],
        supplements: [
          { name: "Magnesium", dosage: "400-600mg", timing: "soir", why: "relaxant musculaire", brands: ["Thorne", "NOW Foods"] },
          { name: "Curcumine Longvida", dosage: "400mg x2", timing: "avec repas", why: "spinal inflammation", brands: ["Life Extension", "Nootropics Depot"] },
        ]
      }
    }
  },

  "psychologie-mental": {
    expert: "Psychologue performance (style Dr Jim Loehr, Dr Michael Gervais)",
    focus: [
      "Profil psychologique selon reponses",
      "State vs Trait anxiety",
      "Techniques : journaling, visualisation, self-talk, exposure therapy"
    ],
    supplements: [
      { name: "Ashwagandha Sensoril", dosage: "250mg x2", timing: "matin et soir", why: "meilleur pour anxiete que KSM-66", brands: ["Nootropics Depot", "Doctor's Best"] },
      { name: "L-Theanine", dosage: "200-400mg", timing: "matin ou au besoin", brands: ["Suntheanine", "NOW Foods"] },
      { name: "Lemon Balm", dosage: "300-600mg", timing: "au besoin", brands: ["NOW Foods", "Gaia Herbs"] },
      { name: "Saffron (Affron)", dosage: "28mg/jour", timing: "matin", why: "efficacite comparable SSRI mild", brands: ["Life Extension", "Nootropics Depot"] },
      { name: "Lithium Orotate", dosage: "5-10mg", timing: "soir", why: "micro-dose neuroprotecteur", brands: ["KAL", "Weyland"] },
      { name: "SAMe", dosage: "400-800mg", timing: "matin a jeun", why: "si tendance depressive - PAS avec SSRI", brands: ["Jarrow", "NOW Foods"] },
    ]
  },

  "neurotransmetteurs": {
    expert: "Neurobiologiste (style Dr Daniel Amen, Dr Mark Millar)",
    focus: [
      "Deficit dopamine : procrastination, manque motivation, anhedonie, addictions",
      "Deficit serotonine : irritabilite, anxiete, rumination, envies de sucre",
      "Deficit GABA : tension, incapacite a relaxer, pensees racing",
      "Deficit acetylcholine : brouillard mental, oublis, difficulte apprentissage"
    ],
    stacks: {
      dopamine: [
        { name: "NALT (N-Acetyl L-Tyrosine)", dosage: "350-700mg", timing: "matin a jeun", brands: ["Nootropics Depot", "NOW Foods"] },
        { name: "Mucuna Pruriens 15-20% L-DOPA", dosage: "100-300mg MAX", timing: "matin", why: "pas plus = downregulation", brands: ["NOW Foods", "Nutricost"] },
        { name: "Uridine Monophosphate", dosage: "250-500mg", timing: "soir", why: "dopamine receptor density", brands: ["Double Wood", "Nootropics Depot"] },
        { name: "Sulbutiamine", dosage: "400mg x2", timing: "matin et midi", why: "potentialise D1 recepteurs", brands: ["Nootropics Depot", "Double Wood"] },
      ],
      serotonine: [
        { name: "5-HTP", dosage: "50-100mg", timing: "soir", why: "JAMAIS avec SSRI ou IMAO", brands: ["NOW Foods", "Natrol"] },
        { name: "L-Tryptophane", dosage: "500-1000mg", timing: "soir a jeun", brands: ["NOW Foods", "Source Naturals"] },
        { name: "Saffron (Affron)", dosage: "28mg/jour", timing: "matin", why: "inhibiteur recapture serotonine", brands: ["Life Extension", "Nootropics Depot"] },
        { name: "Vitamin B6 (P5P)", dosage: "50-100mg", timing: "avec repas", why: "cofacteur conversion", brands: ["Thorne P5P", "NOW Foods"] },
      ],
      gaba: [
        { name: "L-Theanine", dosage: "200-400mg", timing: "au besoin", why: "augmente GABA + alpha waves", brands: ["Suntheanine", "NOW Foods"] },
        { name: "Taurine", dosage: "1-3g", timing: "soir", why: "agoniste GABA-A", brands: ["NOW Foods", "Nutricost"] },
        { name: "Magnesium L-Threonate", dosage: "144mg Mg elementaire", timing: "soir", why: "potentialise GABA", brands: ["Life Extension Magtein", "Double Wood"] },
        { name: "Pharma-GABA", dosage: "100-200mg", timing: "au besoin", why: "forme fermentee, traverse BHE", brands: ["NOW Foods", "Natural Factors"] },
        { name: "Passionflower", dosage: "500mg", timing: "soir", why: "inhibe GABA-T", brands: ["NOW Foods", "Gaia Herbs"] },
      ],
      acetylcholine: [
        { name: "Alpha-GPC", dosage: "300-600mg", timing: "matin", why: "meilleure forme, traverse BHE", brands: ["Nootropics Depot", "NOW Foods"] },
        { name: "CDP-Choline (Citicoline)", dosage: "250-500mg", timing: "matin", why: "aussi membranes neuronales", brands: ["Jarrow", "NOW Foods"] },
        { name: "Huperzine A", dosage: "50-200mcg", timing: "matin - cycler 5on/2off", why: "inhibe acetylcholinesterase", brands: ["NOW Foods", "Double Wood"] },
        { name: "Bacopa Monnieri", dosage: "300-600mg (24% bacosides)", timing: "matin avec graisses", why: "8-12 semaines pour effet plein", brands: ["Nootropics Depot", "Himalaya"] },
        { name: "Lion's Mane", dosage: "500-1000mg", timing: "matin", why: "NGF, neurogenese", brands: ["Real Mushrooms", "Nootropics Depot"] },
      ]
    },
    sample_stack: {
      morning_fasted: ["NALT 500mg", "Alpha-GPC 300mg", "Rhodiola 200mg"],
      morning_with_food: ["Lion's Mane 1g", "Omega-3 3g", "Bacopa 300mg"],
      afternoon: ["Uridine 250mg (si besoin boost)"],
      evening: ["L-Theanine 400mg", "Magnesium Threonate 144mg", "Phosphatidylserine 300mg"]
    }
  }
};

export function getExpertProtocol(sectionId: string) {
  return EXPERT_PROTOCOLS[sectionId as keyof typeof EXPERT_PROTOCOLS] || null;
}
