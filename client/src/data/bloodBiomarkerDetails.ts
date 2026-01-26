export type BiomarkerDetail = {
  definition: string;
  mechanism: string;
  impact: string;
  protocol: string[];
  citations: Array<{ title: string; url: string }>;
};

export const BIOMARKER_DETAILS: Record<string, BiomarkerDetail> = {
  testosterone_total: {
    definition: "Hormone steroide cle de la performance et de la masse musculaire.",
    mechanism: "Valeur basse = hypogonadisme fonctionnel, souvent lie au stress, au sommeil et au deficit calorique. Valeur haute doit etre re-verifiee selon contexte.",
    impact: "Sous 500 ng/dL, progression musculaire et libido chutent. Range optimal = recuperation plus rapide et force stable.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  testosterone_libre: {
    definition: "Fraction active de la testosterone qui agit sur tes tissus.",
    mechanism: "Baisse typique quand la SHBG est elevee ou quand l'insuline est basse. Elle explique souvent fatigue et stagnation malgre une testosterone totale correcte.",
    impact: "Libre basse = moins de drive, moins de force et baisse de motivation a l'entrainement.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  shbg: {
    definition: "Proteine qui transporte la testosterone et module sa disponibilite.",
    mechanism: "SHBG haute capte la testosterone et baisse la fraction libre. SHBG basse peut signaler insulino-resistance.",
    impact: "SHBG desequilibree = perte de libido et difficulte a progresser meme avec une T totale correcte.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  estradiol: {
    definition: "Hormone essentielle a la libido, au sommeil et a la sante osseuse.",
    mechanism: "Trop bas = rigidite, fatigue; trop haut = retention et baisse du tonus. Dependant de la conversion de la testosterone.",
    impact: "Un estradiol stable maintient la recuperation et l'anabolisme sans effets secondaires.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  lh: {
    definition: "Signal hypophysaire qui stimule la production testiculaire.",
    mechanism: "LH basse = suppression centrale (stress, calories basses). LH haute = testicules peu repondants.",
    impact: "Impact direct sur production de testosterone et fertilite.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  fsh: {
    definition: "Regule la spermatogenese et l'equilibre de l'axe gonadique.",
    mechanism: "FSH basse ou haute signale un desequilibre de l'axe HPG ou une reserve alteree.",
    impact: "Affecte surtout fertilite et qualite spermatique.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  prolactine: {
    definition: "Hormone de regulation qui peut freiner la testosterone si elevee.",
    mechanism: "Stress, manque de sommeil et certains medicaments peuvent l'augmenter.",
    impact: "Prolactine elevee = libido basse, erection moins stable.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  dhea_s: {
    definition: "Precurseur d'androgenes, marqueur de reserve surrenalienne.",
    mechanism: "Basse en stress chronique ou fatigue surrenalienne. Haute chez certains profils androgeniques.",
    impact: "DHEA-S bas = energie et recuperation en baisse.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  cortisol: {
    definition: "Hormone de stress, utile le matin mais catabolique si elevee.",
    mechanism: "Eleve chronique = perte musculaire, stockage abdominal, sommeil degrade.",
    impact: "Cortisol haut = recuperation lente et stagnation musculaire.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  igf1: {
    definition: "Mediateur anabolique lie a l'hormone de croissance.",
    mechanism: "Bas si sommeil pauvre, apport proteique faible ou stress chronique.",
    impact: "IGF-1 faible = progression musculaire lente et blessures plus frequentes.",
    protocol: [
      "Sommeil 7h30-8h30, meme horaires.",
      "Lipides essentiels a chaque repas (oeufs, poissons gras, huile d'olive).",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Entrainer lourd 3-4x/sem (mouvements composes).",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
      {
        title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
      },
    ],
  },
  tsh: {
    definition: "Signal central qui commande la thyroide.",
    mechanism: "TSH elevee = thyroide qui force. TSH trop basse = suractivation ou suppression.",
    impact: "Desequilibre TSH = fatigue, ralentissement metabolique ou nervosite.",
    protocol: [
      "Apport proteique suffisant (1.6-2.2 g/kg).",
      "Selenium 100-200 mcg + iode alimentaire modere.",
      "Reduire deficit calorique agressif.",
      "Stabiliser sommeil et stress chronique.",
    ],
    citations: [
      {
        title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
      {
        title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
      },
    ],
  },
  t4_libre: {
    definition: "Hormone precurseur qui alimente la conversion en T3.",
    mechanism: "T4 basse limite la production de T3; T4 haute sans T3 = conversion faible.",
    impact: "T4 basse = energie basse et difficulte a perdre du gras.",
    protocol: [
      "Apport proteique suffisant (1.6-2.2 g/kg).",
      "Selenium 100-200 mcg + iode alimentaire modere.",
      "Reduire deficit calorique agressif.",
      "Stabiliser sommeil et stress chronique.",
    ],
    citations: [
      {
        title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
      {
        title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
      },
    ],
  },
  t3_libre: {
    definition: "Hormone active qui pilote la depense energetique.",
    mechanism: "Baisse lors de deficit calorique, stress ou inflammation.",
    impact: "T3 basse = thermogenese faible et recuperation lente.",
    protocol: [
      "Apport proteique suffisant (1.6-2.2 g/kg).",
      "Selenium 100-200 mcg + iode alimentaire modere.",
      "Reduire deficit calorique agressif.",
      "Stabiliser sommeil et stress chronique.",
    ],
    citations: [
      {
        title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
      {
        title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
      },
    ],
  },
  t3_reverse: {
    definition: "Forme inactive qui augmente en stress ou deficit.",
    mechanism: "Un taux eleve bloque l'action de la T3.",
    impact: "T3 reverse haute = metabolisme freine malgre T4 correcte.",
    protocol: [
      "Apport proteique suffisant (1.6-2.2 g/kg).",
      "Selenium 100-200 mcg + iode alimentaire modere.",
      "Reduire deficit calorique agressif.",
      "Stabiliser sommeil et stress chronique.",
    ],
    citations: [
      {
        title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
      {
        title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
      },
    ],
  },
  anti_tpo: {
    definition: "Anticorps qui signalent une inflammation thyroidienne.",
    mechanism: "Eleves = risque d'auto-immunite ou inflammation chronique.",
    impact: "Impact sur energie, humeur et stabilite metabolique.",
    protocol: [
      "Apport proteique suffisant (1.6-2.2 g/kg).",
      "Selenium 100-200 mcg + iode alimentaire modere.",
      "Reduire deficit calorique agressif.",
      "Stabiliser sommeil et stress chronique.",
    ],
    citations: [
      {
        title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
      {
        title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
      },
    ],
  },
  glycemie_jeun: {
    definition: "Reflet direct de la sensibilite a l'insuline.",
    mechanism: "Elevee = surcharge glucidique, stress ou sommeil pauvre.",
    impact: "Glycemie elevee = energie instable et stockage plus facile.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  hba1c: {
    definition: "Moyenne glycemique sur 8-12 semaines.",
    mechanism: "Au-dessus de 5.6% = tendance prediabete et inflammation metabolique.",
    impact: "HbA1c elevee = perte de gras plus lente et fatigue.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  insuline_jeun: {
    definition: "Plus elle monte, plus la resistance s'installe.",
    mechanism: "Elevee = stockage accelere et signal d'insulino-resistance.",
    impact: "Insuline haute = difficulte a secher et faim reactive.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  homa_ir: {
    definition: "Index global de resistance a l'insuline.",
    mechanism: "HOMA eleve = metabolisme bloque et inflammation latente.",
    impact: "HOMA eleve = recomposition corporelle ralentie.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  triglycerides: {
    definition: "Marqueur cle du stockage et du risque metabolique.",
    mechanism: "Eleves = surplus glucidique ou alcool, souvent lie a un HDL bas.",
    impact: "Triglycerides hauts = risque cardiometabolique + fatigue post-prandiale.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  hdl: {
    definition: "Cholesterol protecteur associe a un bon profil metabolique.",
    mechanism: "Bas = sante metabolique affaiblie et inflammation possible.",
    impact: "HDL haut = meilleur transport lipidique et recuperation.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  ldl: {
    definition: "Transporteur de lipides, a lire avec ApoB et inflammation.",
    mechanism: "LDL eleve sans ApoB haut = interpretation nuancee.",
    impact: "LDL eleve + ApoB haut = risque cardio accru.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  apob: {
    definition: "Nombre de particules atherogenes, meilleur predicteur que LDL.",
    mechanism: "ApoB eleve = risque cardio plus precis.",
    impact: "ApoB haut = priorite a la correction metabolique.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  lpa: {
    definition: "Facteur genetique de risque cardiovasculaire.",
    mechanism: "Peu modifiable, mais le risque se compense avec un profil metabolique propre.",
    impact: "Lp(a) elevee = vigilance cardio et inflammation basse.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Glucides complexes, fibres 25-35 g/jour.",
      "Renforcement musculaire 3-4x/sem.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
    ],
    citations: [
      {
        title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
      {
        title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  crp_us: {
    definition: "Marqueur d'inflammation chronique bas grade.",
    mechanism: "Elevee = stress systemique, infections, surpoids ou surentrainement.",
    impact: "CRP haute = recuperation lente et anabolisme freine.",
    protocol: [
      "Omega-3 (EPA dominant) 2-3 g/jour.",
      "Curcumine 500 mg + piperine.",
      "Reduire sucres rapides et alcool.",
      "Sommeil profond + gestion du stress.",
    ],
    citations: [
      {
        title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
      },
      {
        title: "Homocysteine and vascular risk (NEJM, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
      },
    ],
  },
  homocysteine: {
    definition: "Indicateur de stress vasculaire et methylation.",
    mechanism: "Elevee = deficit B vitamins ou stress oxydatif.",
    impact: "Homocysteine haute = risque cardio et fatigue neurologique.",
    protocol: [
      "Omega-3 (EPA dominant) 2-3 g/jour.",
      "Curcumine 500 mg + piperine.",
      "Reduire sucres rapides et alcool.",
      "Sommeil profond + gestion du stress.",
    ],
    citations: [
      {
        title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
      },
      {
        title: "Homocysteine and vascular risk (NEJM, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
      },
    ],
  },
  ferritine: {
    definition: "Stock de fer, mais aussi marqueur inflammatoire.",
    mechanism: "Trop bas = anemie latente; trop haut = inflammation ou surcharge.",
    impact: "Ferritine basse = endurance et energie en baisse.",
    protocol: [
      "Omega-3 (EPA dominant) 2-3 g/jour.",
      "Curcumine 500 mg + piperine.",
      "Reduire sucres rapides et alcool.",
      "Sommeil profond + gestion du stress.",
    ],
    citations: [
      {
        title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
      },
      {
        title: "Homocysteine and vascular risk (NEJM, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
      },
    ],
  },
  fer_serique: {
    definition: "Disponibilite immediate du fer circulant.",
    mechanism: "Bas = deficit ou mauvaise absorption.",
    impact: "Fer bas = fatigue, baisse de performance.",
    protocol: [
      "Omega-3 (EPA dominant) 2-3 g/jour.",
      "Curcumine 500 mg + piperine.",
      "Reduire sucres rapides et alcool.",
      "Sommeil profond + gestion du stress.",
    ],
    citations: [
      {
        title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
      },
      {
        title: "Homocysteine and vascular risk (NEJM, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
      },
    ],
  },
  transferrine_sat: {
    definition: "Capacite a transporter le fer.",
    mechanism: "Basse = deficit de fer utilisable.",
    impact: "Saturation basse = baisse de VO2 et endurance.",
    protocol: [
      "Omega-3 (EPA dominant) 2-3 g/jour.",
      "Curcumine 500 mg + piperine.",
      "Reduire sucres rapides et alcool.",
      "Sommeil profond + gestion du stress.",
    ],
    citations: [
      {
        title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
      },
      {
        title: "Homocysteine and vascular risk (NEJM, 2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
      },
    ],
  },
  vitamine_d: {
    definition: "Hormone immuno-metabolique qui influence force et humeur.",
    mechanism: "Basse = inflammation, baisse de force et risque d'infection.",
    impact: "D basse = recuperation lente et humeur instable.",
    protocol: [
      "Vitamine D3 3000-5000 UI selon bilan.",
      "Magnesium glycinate 300-400 mg soir.",
      "Zinc 25-30 mg soir, cycles de 8-12 semaines.",
      "B12/folate si deficit documente.",
    ],
    citations: [
      {
        title: "Vitamin D status and muscle function (JCEM, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
      },
      {
        title: "Magnesium status and performance (Nutrients, 2017)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
      },
    ],
  },
  b12: {
    definition: "Cofacteur neurologique et hematologique.",
    mechanism: "B12 basse = fatigue, brouillard mental, baisse de performance.",
    impact: "Optimale = energie nerveuse et recuperation.",
    protocol: [
      "Vitamine D3 3000-5000 UI selon bilan.",
      "Magnesium glycinate 300-400 mg soir.",
      "Zinc 25-30 mg soir, cycles de 8-12 semaines.",
      "B12/folate si deficit documente.",
    ],
    citations: [
      {
        title: "Vitamin D status and muscle function (JCEM, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
      },
      {
        title: "Magnesium status and performance (Nutrients, 2017)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
      },
    ],
  },
  folate: {
    definition: "Cofacteur methylation et synthese ADN.",
    mechanism: "Baisse = probleme de regeneration cellulaire.",
    impact: "Folate bas = energie et humeur en baisse.",
    protocol: [
      "Vitamine D3 3000-5000 UI selon bilan.",
      "Magnesium glycinate 300-400 mg soir.",
      "Zinc 25-30 mg soir, cycles de 8-12 semaines.",
      "B12/folate si deficit documente.",
    ],
    citations: [
      {
        title: "Vitamin D status and muscle function (JCEM, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
      },
      {
        title: "Magnesium status and performance (Nutrients, 2017)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
      },
    ],
  },
  magnesium_rbc: {
    definition: "Reflet des reserves intracellulaires de magnesium.",
    mechanism: "Bas = crampes, stress eleve, sommeil degrade.",
    impact: "Magnesium optimal = meilleure recuperation neuromusculaire.",
    protocol: [
      "Vitamine D3 3000-5000 UI selon bilan.",
      "Magnesium glycinate 300-400 mg soir.",
      "Zinc 25-30 mg soir, cycles de 8-12 semaines.",
      "B12/folate si deficit documente.",
    ],
    citations: [
      {
        title: "Vitamin D status and muscle function (JCEM, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
      },
      {
        title: "Magnesium status and performance (Nutrients, 2017)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
      },
    ],
  },
  zinc: {
    definition: "Mineral cle pour hormones et immunite.",
    mechanism: "Bas = testosterone basse et immunite fragilisee.",
    impact: "Zinc optimal = support anabolique et immunitaire.",
    protocol: [
      "Vitamine D3 3000-5000 UI selon bilan.",
      "Magnesium glycinate 300-400 mg soir.",
      "Zinc 25-30 mg soir, cycles de 8-12 semaines.",
      "B12/folate si deficit documente.",
    ],
    citations: [
      {
        title: "Vitamin D status and muscle function (JCEM, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
      },
      {
        title: "Magnesium status and performance (Nutrients, 2017)",
        url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
      },
    ],
  },
  alt: {
    definition: "Enzyme hepatique sensible a la surcharge metabolique.",
    mechanism: "Elevee = steatose, alcool ou stress hepatique.",
    impact: "ALT elevee = metabolisme des hormones perturbe.",
    protocol: [
      "Hydratation 2-3 L/jour.",
      "Limiter alcool et toxines hepatique.",
      "Proteines ajuste a l'activite et au rein.",
      "Recontrole a 8-12 semaines si valeurs hautes.",
    ],
    citations: [
      {
        title: "ALT/AST and metabolic risk (Hepatology, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
      },
      {
        title: "eGFR and cardiovascular outcomes (JASN, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
      },
    ],
  },
  ast: {
    definition: "Enzyme hepatique et musculaire, a lire avec ALT.",
    mechanism: "AST elevee isolée = stress musculaire ou hepatique.",
    impact: "AST haute = surcharge ou recuperation incomplete.",
    protocol: [
      "Hydratation 2-3 L/jour.",
      "Limiter alcool et toxines hepatique.",
      "Proteines ajuste a l'activite et au rein.",
      "Recontrole a 8-12 semaines si valeurs hautes.",
    ],
    citations: [
      {
        title: "ALT/AST and metabolic risk (Hepatology, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
      },
      {
        title: "eGFR and cardiovascular outcomes (JASN, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
      },
    ],
  },
  ggt: {
    definition: "Marqueur de stress hepatique et alcool.",
    mechanism: "GGT elevee = surcharge toxique ou alcool.",
    impact: "GGT haute = fatigue et inflammation hepatique.",
    protocol: [
      "Hydratation 2-3 L/jour.",
      "Limiter alcool et toxines hepatique.",
      "Proteines ajuste a l'activite et au rein.",
      "Recontrole a 8-12 semaines si valeurs hautes.",
    ],
    citations: [
      {
        title: "ALT/AST and metabolic risk (Hepatology, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
      },
      {
        title: "eGFR and cardiovascular outcomes (JASN, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
      },
    ],
  },
  creatinine: {
    definition: "Marqueur de filtration renale et masse musculaire.",
    mechanism: "Creatinine elevee peut refleter masse musculaire ou deshydration.",
    impact: "Creatinine elevee persistante = a surveiller avec eGFR.",
    protocol: [
      "Hydratation 2-3 L/jour.",
      "Limiter alcool et toxines hepatique.",
      "Proteines ajuste a l'activite et au rein.",
      "Recontrole a 8-12 semaines si valeurs hautes.",
    ],
    citations: [
      {
        title: "ALT/AST and metabolic risk (Hepatology, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
      },
      {
        title: "eGFR and cardiovascular outcomes (JASN, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
      },
    ],
  },
  egfr: {
    definition: "Estimation de la fonction de filtration renale.",
    mechanism: "eGFR bas = filtration reduite a surveiller.",
    impact: "eGFR faible = ajuster proteines et hydratation.",
    protocol: [
      "Hydratation 2-3 L/jour.",
      "Limiter alcool et toxines hepatique.",
      "Proteines ajuste a l'activite et au rein.",
      "Recontrole a 8-12 semaines si valeurs hautes.",
    ],
    citations: [
      {
        title: "ALT/AST and metabolic risk (Hepatology, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
      },
      {
        title: "eGFR and cardiovascular outcomes (JASN, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
      },
    ],
  },
};

export const buildDefaultBiomarkerDetail = (markerName: string, statusLabel: string): BiomarkerDetail => ({
  definition: `${markerName} est un biomarqueur cle pour evaluer ta sante et ta performance.`,
  mechanism: `Quand il est ${statusLabel}, cela modifie directement la recuperation, l'energie et la capacite a progresser.`,
  impact: `Plus il se rapproche du range optimal, plus tes resultats deviennent stables et previsibles.`,
  protocol: [
    "Sommeil 7h30-8h30.",
    "Apport proteique 1.6-2.2 g/kg.",
    "Micronutriments prioritaires (vitamine D, magnesium, zinc).",
  ],
  citations: [],
});