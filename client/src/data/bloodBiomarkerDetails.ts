export type BiomarkerDetail = {
  definition: string;
  mechanism: string;
  impact: string;
  protocol: string[];
  citations: Array<{ title: string; url: string }>;
};

const HORMONE_CITATIONS = [
  {
    title: "Sleep restriction reduces testosterone (JAMA, 2011)",
    url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
  },
  {
    title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
    url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
  },
];

const THYROID_CITATIONS = [
  {
    title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
    url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
  },
  {
    title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
    url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
  },
];

const METABOLIC_CITATIONS = [
  {
    title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
    url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
  },
  {
    title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
    url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
  },
];

const INFLAMMATORY_CITATIONS = [
  {
    title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
    url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
  },
  {
    title: "Homocysteine and vascular risk (NEJM, 2002)",
    url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
  },
];

const VITAMIN_CITATIONS = [
  {
    title: "Vitamin D status and muscle function (J Clin Endocrinol Metab, 2011)",
    url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
  },
  {
    title: "Magnesium status and performance (Nutrients, 2017)",
    url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
  },
];

const LIVER_KIDNEY_CITATIONS = [
  {
    title: "ALT/AST and metabolic risk (Hepatology, 2011)",
    url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
  },
  {
    title: "eGFR and cardiovascular outcomes (JASN, 2010)",
    url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
  },
];

export const MARKER_CITATIONS = {
  "testosterone_total": [
    {
      "title": "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline (2018)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/29562364/"
    },
    {
      "title": "Harmonized Reference Ranges for Circulating Testosterone Levels in Men of Four Cohort Studies in the United States and Europe (2017)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28324103/"
    }
  ],
  "testosterone_libre": [
    {
      "title": "Harmonized Reference Ranges for Circulating Testosterone Levels in Men of Four Cohort Studies in the United States and Europe (2017)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28324103/"
    },
    {
      "title": "Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline (2018)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/29562364/"
    }
  ],
  "shbg": [
    {
      "title": "Testosterone, sex hormone-binding globulin and the metabolic syndrome: a systematic review and meta-analysis of observational studies (2011)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/20870782/"
    },
    {
      "title": "Testosterone, sex hormone-binding globulin and the metabolic syndrome in men: an individual participant data meta-analysis of observational studies (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25019163/"
    }
  ],
  "estradiol": [
    {
      "title": "Reference ranges and determinants of testosterone, dihydrotestosterone, and estradiol levels measured using liquid chromatography-tandem mass spectrometry in a population-based cohort of older men (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/22977273/"
    },
    {
      "title": "Serum estradiol levels in normal men and men with idiopathic infertility (1995)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/7614406/"
    }
  ],
  "lh": [
    {
      "title": "Reference intervals for serum sex hormones in Han Chinese adult men from the Fangchenggang Area Male Health and Examination Survey (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/22582502/"
    },
    {
      "title": "Late-onset hypogonadism: a concept comes of age (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31639279/"
    }
  ],
  "fsh": [
    {
      "title": "Reference intervals for serum sex hormones in Han Chinese adult men from the Fangchenggang Area Male Health and Examination Survey (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/22582502/"
    },
    {
      "title": "Late-onset hypogonadism: a concept comes of age (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31639279/"
    }
  ],
  "prolactine": [
    {
      "title": "Diagnosis and treatment of hyperprolactinemia: an Endocrine Society clinical practice guideline (2011)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/21296991/"
    },
    {
      "title": "Guidelines of the Pituitary Society for the diagnosis and management of prolactinomas (2006)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/16886971/"
    }
  ],
  "dhea_s": [
    {
      "title": "Reference ranges for serum dehydroepiandrosterone sulfate and testosterone in adult men (2008)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/18599883/"
    },
    {
      "title": "Reference intervals for plasma concentrations of adrenal steroids measured by LC-MS/MS: Impact of gender, age, oral contraceptives, body mass index and blood pressure status (2017)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28479316/"
    }
  ],
  "cortisol": [
    {
      "title": "Morning serum cortisol role in the adrenal insufficiency diagnosis with modern cortisol assays (2023)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/36966469/"
    },
    {
      "title": "Cortisol awakening response and psychosocial factors: a systematic review and meta-analysis (2009)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19022335/"
    }
  ],
  "igf1": [
    {
      "title": "Reference intervals for insulin-like growth factor-1 (igf-i) from birth to senescence: results from a multicenter study using a new automated chemiluminescence IGF-I immunoassay conforming to recent international recommendations (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/24606072/"
    },
    {
      "title": "Age- and sex-specific reference intervals across life span for insulin-like growth factor binding protein 3 (IGFBP-3) and the IGF-I to IGFBP-3 ratio measured by new automated chemiluminescence assays (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/24483154/"
    }
  ],
  "tsh": [
    {
      "title": "Guidelines for the treatment of hypothyroidism: prepared by the american thyroid association task force on thyroid hormone replacement (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25266247/"
    },
    {
      "title": "Clinical practice guidelines for hypothyroidism in adults: cosponsored by the American Association of Clinical Endocrinologists and the American Thyroid Association (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23246686/"
    }
  ],
  "t4_libre": [
    {
      "title": "Guidelines for the treatment of hypothyroidism: prepared by the american thyroid association task force on thyroid hormone replacement (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25266247/"
    },
    {
      "title": "Clinical practice guidelines for hypothyroidism in adults: cosponsored by the American Association of Clinical Endocrinologists and the American Thyroid Association (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23246686/"
    }
  ],
  "t3_libre": [
    {
      "title": "Guidelines for the treatment of hypothyroidism: prepared by the american thyroid association task force on thyroid hormone replacement (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25266247/"
    },
    {
      "title": "Clinical practice guidelines for hypothyroidism in adults: cosponsored by the American Association of Clinical Endocrinologists and the American Thyroid Association (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23246686/"
    }
  ],
  "t3_reverse": [
    {
      "title": "Clinical and laboratory aspects of 3,3',5'-triiodothyronine (reverse T3) (2021)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/33040575/"
    },
    {
      "title": "[Clinical significance of serum reverse T3 analysis in endocrine tests of the thyroid-parathyroid system] (1989)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/2621831/"
    }
  ],
  "anti_tpo": [
    {
      "title": "Normal range of anti-thyroid peroxidase antibody (TPO-Ab) and atherosclerosis among eu-thyroid population: A cross-sectional study (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/32957357/"
    },
    {
      "title": "Guidelines for the treatment of hypothyroidism: prepared by the american thyroid association task force on thyroid hormone replacement (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25266247/"
    }
  ],
  "glycemie_jeun": [
    {
      "title": "2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes-2024 (2024)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38078589/"
    },
    {
      "title": "[Diabetes mellitus: definition, classification, diagnosis, screening and prevention (Update 2023)] (2023)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37101021/"
    }
  ],
  "hba1c": [
    {
      "title": "2. Diagnosis and Classification of Diabetes: Standards of Care in Diabetes-2024 (2024)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38078589/"
    },
    {
      "title": "[Diabetes mellitus: definition, classification, diagnosis, screening and prevention (Update 2023)] (2023)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37101021/"
    }
  ],
  "insuline_jeun": [
    {
      "title": "Generating a reference interval for fasting serum insulin in healthy nondiabetic adult Chinese men (2012)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23268156/"
    },
    {
      "title": "Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man (1985)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/3899825/"
    }
  ],
  "homa_ir": [
    {
      "title": "Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man (1985)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/3899825/"
    },
    {
      "title": "Use and abuse of HOMA modeling (2004)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/15161807/"
    }
  ],
  "triglycerides": [
    {
      "title": "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol: A Report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/30586774/"
    },
    {
      "title": "2019 ESC/EAS Guidelines for the management of dyslipidaemias: lipid modification to reduce cardiovascular risk (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31504418/"
    }
  ],
  "hdl": [
    {
      "title": "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol: A Report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/30586774/"
    },
    {
      "title": "2019 ESC/EAS Guidelines for the management of dyslipidaemias: lipid modification to reduce cardiovascular risk (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31504418/"
    }
  ],
  "ldl": [
    {
      "title": "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol: A Report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/30586774/"
    },
    {
      "title": "2019 ESC/EAS Guidelines for the management of dyslipidaemias: lipid modification to reduce cardiovascular risk (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31504418/"
    }
  ],
  "apob": [
    {
      "title": "Role of apolipoprotein B in the clinical management of cardiovascular risk in adults: An Expert Clinical Consensus from the National Lipid Association (2024)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/39256087/"
    },
    {
      "title": "2018 AHA/ACC/AACVPR/AAPA/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Blood Cholesterol: A Report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/30586774/"
    }
  ],
  "lpa": [
    {
      "title": "Lipoprotein(a) in atherosclerotic cardiovascular disease and aortic stenosis: a European Atherosclerosis Society consensus statement (2022)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/36036785/"
    },
    {
      "title": "HEART UK consensus statement on Lipoprotein(a): A call to action (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31704552/"
    }
  ],
  "crp_us": [
    {
      "title": "C-reactive protein, subclinical atherosclerosis, and risk of cardiovascular events (2002)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/12377722/"
    },
    {
      "title": "Comparison of C-reactive protein and low-density lipoprotein cholesterol levels in the prediction of first cardiovascular events (2002)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/12432042/"
    }
  ],
  "homocysteine": [
    {
      "title": "Hyperhomocysteinemia and cardiovascular diseases (2022)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/35129442/"
    },
    {
      "title": "The current status of homocysteine as a risk factor for cardiovascular disease: a mini review (2018)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/29979619/"
    }
  ],
  "ferritine": [
    {
      "title": "Serum or plasma ferritin concentration as an index of iron deficiency and overload (2021)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/34028001/"
    },
    {
      "title": "Iron Deficiency in Adults: A Review (2025)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/40159291/"
    }
  ],
  "fer_serique": [
    {
      "title": "Iron deficiency anemia (2007)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/17375513/"
    },
    {
      "title": "Serum or plasma ferritin concentration as an index of iron deficiency and overload (2021)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/34028001/"
    }
  ],
  "transferrine_sat": [
    {
      "title": "Using transferrin saturation as a diagnostic criterion for iron deficiency: A systematic review (2019)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/31503510/"
    },
    {
      "title": "Iron Deficiency in Adults: A Review (2025)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/40159291/"
    }
  ],
  "vitamine_d": [
    {
      "title": "Vitamin D for the Prevention of Disease: An Endocrine Society Clinical Practice Guideline (2024)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38828931/"
    },
    {
      "title": "Evaluation, treatment, and prevention of vitamin D deficiency: an Endocrine Society clinical practice guideline (2011)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/21646368/"
    }
  ],
  "b12": [
    {
      "title": "Vitamin B12 deficiency - A 21st century perspective (2015)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/25824066/"
    },
    {
      "title": "Clinical practice. Vitamin B12 deficiency (2013)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23301732/"
    }
  ],
  "folate": [
    {
      "title": "Guidelines for the diagnosis and treatment of cobalamin and folate disorders (2014)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/24942828/"
    },
    {
      "title": "Megaloblastic Anemias: Nutritional and Other Causes (2017)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28189172/"
    }
  ],
  "magnesium_rbc": [
    {
      "title": "Interpreting magnesium status to enhance clinical care: key indicators (2017)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/28806179/"
    },
    {
      "title": "Magnesium Deficiency and Proton-Pump Inhibitor Use: A Clinical Review (2016)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/26582556/"
    }
  ],
  "zinc": [
    {
      "title": "Reference Value for Serum Zinc Level of Adult Population in Bangladesh (2020)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/32549879/"
    },
    {
      "title": "Discovery of human zinc deficiency: its impact on human health and disease (2013)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23493534/"
    }
  ],
  "alt": [
    {
      "title": "Evaluation of abnormal liver-enzyme results in asymptomatic patients (2000)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/10781624/"
    },
    {
      "title": "Physiological and biochemical basis of clinical liver function tests: a review (2013)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/22836216/"
    }
  ],
  "ast": [
    {
      "title": "Evaluation of abnormal liver-enzyme results in asymptomatic patients (2000)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/10781624/"
    },
    {
      "title": "Physiological and biochemical basis of clinical liver function tests: a review (2013)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/22836216/"
    }
  ],
  "ggt": [
    {
      "title": "Serum gamma-glutamyl transpeptidase: its clinical significance (1976)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23644/"
    },
    {
      "title": "Evaluation of abnormal liver function tests (2016)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/26842972/"
    }
  ],
  "creatinine": [
    {
      "title": "Reference intervals for serum creatinine concentrations: assessment of available data for global application (2008)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/18202155/"
    },
    {
      "title": "Adult reference ranges for serum cystatin C, creatinine and predicted creatinine clearance (2000)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/10672373/"
    }
  ],
  "egfr": [
    {
      "title": "A new equation to estimate glomerular filtration rate (2009)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/19414839/"
    },
    {
      "title": "Evaluation and management of chronic kidney disease: synopsis of the kidney disease: improving global outcomes 2012 clinical practice guideline (2013)",
      "url": "https://pubmed.ncbi.nlm.nih.gov/23732715/"
    }
  ]
} as const;

export const BIOMARKER_DETAILS: Record<string, BiomarkerDetail> = {
  testosterone_total: {
    definition:
      "Androgene majeur produit par les testicules. Il regle masse musculaire, densite osseuse, libido et production de globules rouges.",
    mechanism:
      "Une valeur basse traduit souvent une inhibition de l axe HPG (sommeil court, stress, deficit calorique, surentrainement). Une valeur haute doit etre confirmee et lue avec LH/FSH et testosterone libre.",
    impact:
      "Testosterone basse reduit la synthese proteique et la force. Elle baisse libido, humeur et drive. Elle augmente le risque de prise de gras abdominal et d insulino resistance.",
    protocol: [
      "Sommeil 7h30-8h30, horaires stables.",
      "Lipides de qualite a chaque repas (oeufs, huile d olive, poissons gras).",
      "Vitamine D3 2000-4000 UI/jour si bas.",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
      "Mouvements composes lourds 3-4x/sem + deload regulier.",
    ],
    citations: HORMONE_CITATIONS,
  },
  testosterone_libre: {
    definition:
      "Fraction active non liee aux proteines, celle qui entre dans les tissus et declenche les effets androgeniques.",
    mechanism:
      "Basse quand SHBG est elevee ou quand la testosterone totale est insuffisante. Haute avec SHBG basse ou exposition androgenique.",
    impact:
      "Libre basse signifie moins d activation androgenique malgre une T totale correcte. Elle reduit la recuperation et la tolerance a l entrainement. Elle affecte libido et energie matinale.",
    protocol: [
      "Equilibrer apports glucidiques et lipidiques pour eviter SHBG trop haute.",
      "Sommeil 7h30-8h30 et reduction du stress chronique.",
      "Apport proteique 1.6-2.2 g/kg pour soutenir l axe HPG.",
      "Zinc 25-30 mg/jour et vitamine D si bas.",
    ],
    citations: HORMONE_CITATIONS,
  },
  shbg: {
    definition:
      "Glycoproteine hepatique qui transporte testosterone et estradiol et module la fraction libre.",
    mechanism:
      "SHBG haute diminue la testosterone libre (souvent hyperthyroidie, deficit calorique, faible insuline). SHBG basse est frequente dans l insulino resistance ou steatose hepatique.",
    impact:
      "SHBG trop haute donne des symptomes de T basse. SHBG trop basse s associe a un profil metabolique a risque. Un niveau modere stabilise l axe hormonal.",
    protocol: [
      "Eviter deficit calorique agressif et sous alimentation chronique.",
      "Stabiliser glycemie via fibres et musculation reguliere.",
      "Limiter alcool et sucres liquides pour proteger le foie.",
      "Verifier thyroide si SHBG tres elevee.",
    ],
    citations: HORMONE_CITATIONS,
  },
  estradiol: {
    definition:
      "Estrogene issu de l aromatisation de la testosterone, essentiel pour libido, sommeil et sante vasculaire.",
    mechanism:
      "Trop bas quand aromatase est inhibee ou T basse. Trop haut avec adiposite, inflammation ou T tres elevee.",
    impact:
      "E2 bas entraine douleurs articulaires et baisse de libido. E2 haut favorise retention et variations d humeur. Un E2 stable soutient recuperation et performance.",
    protocol: [
      "Stabiliser masse grasse et eviter fluctuations rapides de poids.",
      "Limiter alcool et surconsommation de sucre.",
      "Legumes cruciferes 4-5x/sem pour equilibrer l aromatase.",
      "Eviter suppression agressive d aromatase sans suivi clinique.",
    ],
    citations: HORMONE_CITATIONS,
  },
  lh: {
    definition:
      "Gonadotrophine hypophysaire qui stimule les cellules de Leydig a produire la testosterone.",
    mechanism:
      "LH basse indique une suppression centrale (stress, calories basses, manque de sommeil). LH haute avec T basse suggere une reponse testiculaire insuffisante.",
    impact:
      "LH basse bloque la production de testosterone. LH haute peut signaler un probleme gonadique. Ces profils reduisent le potentiel anabolique et la fertilite.",
    protocol: [
      "Remonter l energie disponible (calories et lipides suffisants).",
      "Sommeil de qualite et reduction du stress chronique.",
      "Reduire surentrainement et volume excessif.",
      "Verifier prolactine et deficit en vitamine D.",
    ],
    citations: HORMONE_CITATIONS,
  },
  fsh: {
    definition:
      "Gonadotrophine qui soutient la spermatogenese et la fonction des cellules de Sertoli.",
    mechanism:
      "FSH basse suggere suppression centrale. FSH haute peut indiquer reserve testiculaire reduite.",
    impact:
      "FSH anormale peut signaler une fertilite alteree. Elle accompagne souvent des symptomes de baisse hormonale. Elle aide a lire l axe HPG global.",
    protocol: [
      "Stabiliser sommeil et eviter deficit calorique prolonge.",
      "Micronutriments clefs: zinc, selenium, vitamine D.",
      "Limiter chaleur excessive (sauna prolonge, ordinateurs sur cuisses).",
      "Recheck LH/FSH si symptomes persistants.",
    ],
    citations: HORMONE_CITATIONS,
  },
  prolactine: {
    definition:
      "Hormone pituitaire qui module la reproduction et la dopamine.",
    mechanism:
      "Elevee par stress, manque de sommeil, certains medicaments ou adenome. Basse est rare mais peut signaler une dysfonction hypophysaire.",
    impact:
      "Prolactine elevee baisse libido et erection. Elle reduit la secretion de GnRH et donc la testosterone. Elle s associe a une baisse de motivation.",
    protocol: [
      "Sommeil profond regulier et reduction du stress mental.",
      "Limiter cafeine tardive et alcool.",
      "Vitamine B6 10-25 mg/jour si carence suspectee.",
      "Verifier medicaments ou facteurs endocriniens si elevee.",
    ],
    citations: HORMONE_CITATIONS,
  },
  dhea_s: {
    definition:
      "Reserve androgenique surrenalienne avec demi vie longue, reflet de resilience.",
    mechanism:
      "Basse en stress chronique, sommeil pauvre ou restriction calorique. Haute dans profils androgeniques ou stress aigu.",
    impact:
      "DHEA-S basse reduit l energie et la recuperation. Elle s associe a humeur instable et faible anabolisme. Une reserve adequate soutient la performance.",
    protocol: [
      "Sommeil 7h30-8h30 et rythme circadien stable.",
      "Reequilibrer l apport calorique et glucidique.",
      "Reduire surentrainement et augmenter les jours de recuperation.",
      "Omega-3 2-3 g/jour et gestion du stress quotidien.",
    ],
    citations: HORMONE_CITATIONS,
  },
  cortisol: {
    definition:
      "Hormone de stress qui suit un rythme circadien avec pic matinal.",
    mechanism:
      "Cortisol haut chronique = stress, inflammation, surentrainement. Cortisol bas le matin = fatigue surrenalienne ou burnout.",
    impact:
      "Cortisol haut accelere catabolisme musculaire et stockage abdominal. Il degrade le sommeil et augmente les cravings. Cortisol bas cause faible energie matinale et baisse de drive.",
    protocol: [
      "Aligner heure de coucher et exposition a la lumiere matinale.",
      "Reduire volume d entrainement et ajouter jours off.",
      "Magnesium glycinate 300-400 mg le soir.",
      "Respiration, NSDR ou marche lente 10-20 min/jour.",
    ],
    citations: HORMONE_CITATIONS,
  },
  igf1: {
    definition:
      "Mediator hepatique de l hormone de croissance implique dans l anabolisme.",
    mechanism:
      "IGF-1 bas en sous alimentation, sommeil court ou stress chronique. IGF-1 haut en surplus calorique ou stimulation hormonale.",
    impact:
      "IGF-1 bas ralentit la reparation musculaire et tendineuse. Il limite l hypertrophie et la densite osseuse. Un IGF-1 modere soutient la performance et la recuperation.",
    protocol: [
      "Apport proteique 1.6-2.2 g/kg et leucine a chaque repas.",
      "Sommeil profond 7h30+ pour secretion GH.",
      "Musculation reguliere avec surcharge progressive.",
      "Eviter deficit calorique trop agressif.",
    ],
    citations: HORMONE_CITATIONS,
  },
  tsh: {
    definition:
      "Signal central de la thyroide. Il augmente quand la thyroide force pour produire T4.",
    mechanism:
      "TSH elevee signale une thyroide sous active ou une conversion T4->T3 insuffisante. TSH trop basse peut indiquer suractivation ou suppression.",
    impact:
      "TSH elevee s associe a fatigue, frilosite et perte de gras lente. TSH trop basse peut donner nervosite et troubles du sommeil. Un TSH modere soutient un metabolisme stable.",
    protocol: [
      "Apport proteique suffisant et calories stables.",
      "Selenium 100-200 mcg/jour si carence probable.",
      "Iode alimentaire modere (poissons, algues en petite dose).",
      "Eviter deficits caloriques prolonges.",
    ],
    citations: THYROID_CITATIONS,
  },
  t4_libre: {
    definition:
      "Hormone precurseur produite par la thyroide, convertie en T3 active.",
    mechanism:
      "T4 basse = production insuffisante. T4 normale avec T3 basse = conversion limitee par stress, inflammation ou deficit calorique.",
    impact:
      "T4 basse reduit la production d energie et la thermogenese. Elle ralentit la recuperation et la perte de gras. Une T4 stable soutient un metabolisme fiable.",
    protocol: [
      "Sommeil regulier et reduction du stress chronique.",
      "Apport proteique et calorique adequat.",
      "Selenium 100-200 mcg/jour et zinc 20-30 mg/jour.",
      "Eviter jeunes prolonges trop frequents.",
    ],
    citations: THYROID_CITATIONS,
  },
  t3_libre: {
    definition:
      "Hormone active qui pilote la depense energetique et la thermogenese.",
    mechanism:
      "Basse lors de deficit calorique, stress ou inflammation. Peut etre normale avec T4 adequate si conversion optimale.",
    impact:
      "T3 basse entraine fatigue et perte de gras lente. Elle reduit la performance a l effort et la motivation. Un T3 optimal soutient l energie quotidienne.",
    protocol: [
      "Remonter calories et glucides si deficit prolonge.",
      "Reduire stress et optimiser sommeil.",
      "Selenium 100-200 mcg/jour, fer adequat.",
      "Eviter surentrainement chronique.",
    ],
    citations: THYROID_CITATIONS,
  },
  t3_reverse: {
    definition:
      "Forme inactive de T3 produite en stress ou restriction energetique.",
    mechanism:
      "T3 reverse elevee indique une conversion bloquee vers la T3 active. Souvent liee a stress, inflammation ou deficit calorique.",
    impact:
      "T3 reverse haute freine le metabolisme malgre T4 correcte. Elle favorise fatigue, frilosite et stagnation. C est un signal de priorite recuperation.",
    protocol: [
      "Augmenter l energie disponible et reduire le stress.",
      "Sommeil profond 7h30+ et rythme circadien stable.",
      "Eviter deficits calories prolonges.",
      "Support micronutriments: selenium, fer, zinc.",
    ],
    citations: THYROID_CITATIONS,
  },
  anti_tpo: {
    definition:
      "Anticorps diriges contre la peroxydase thyroidienne, marqueur auto-immun.",
    mechanism:
      "Anti-TPO eleves signalent une inflammation thyroidienne (Hashimoto) ou une susceptibilite auto-immune.",
    impact:
      "Anti-TPO hauts peuvent preceder une hypothyroidie. Ils s associent a fatigue, humeur instable et prise de poids. Une reduction de l inflammation est prioritaire.",
    protocol: [
      "Selenium 100-200 mcg/jour, verifier iode sans exces.",
      "Regime anti-inflammatoire: omega-3, legumes, moins de sucres.",
      "Gestion du stress et sommeil regulier.",
      "Recontrole TSH/T3/T4 a 8-12 semaines.",
    ],
    citations: THYROID_CITATIONS,
  },
  glycemie_jeun: {
    definition:
      "Glucose sanguin a jeun, reflet direct de la regulation insulinique.",
    mechanism:
      "Elevee = insulinore sistance, stress ou sommeil insuffisant. Basse peut signaler restriction calorique ou hypoglycemie reactionnelle.",
    impact:
      "Glycemie elevee stabilise mal l energie et favorise le stockage. Elle augmente le risque cardiometabolique. Une glycemie stable aide la recomp musculaire.",
    protocol: [
      "Marche 10-15 min apres repas pour vider le glucose.",
      "Glucides complexes et fibres 25-35 g/jour.",
      "Musculation 3-4x/sem et NEAT quotidien.",
      "Sommeil 7h30+ et reduction du stress.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  hba1c: {
    definition:
      "Moyenne glycemique sur 8-12 semaines via hemoglobine glyquee.",
    mechanism:
      "Au-dessus de 5.6% suggere une dysregulation glycemique chronique. En dessous de 5.3% = controle fin.",
    impact:
      "HbA1c elevee predit une baisse de longevite metabolique. Elle ralentit la perte de gras et la recuperation. Un taux bas soutient la performance globale.",
    protocol: [
      "Prioriser fibres et proteines a chaque repas.",
      "Limitation des glucides liquides et sucres rapides.",
      "Entrainement de force + marche post-prandiale.",
      "Fenetre alimentaire nocturne 12-14h.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  insuline_jeun: {
    definition:
      "Insuline a jeun, marqueur sensible de la resistance insulinique.",
    mechanism:
      "Elevee indique un pancreas qui force pour maintenir la glycemie. Basse avec glycemie elevee = risque de dysfonction beta.",
    impact:
      "Insuline haute bloque la lipolyse et augmente les cravings. Elle favorise prise de gras abdominal. Un niveau bas-modere facilite la recomp.",
    protocol: [
      "Reduction des glucides raffines et augmentation des fibres.",
      "Musculation + activite quotidienne pour ameliorer GLUT4.",
      "Gestion du stress et du sommeil.",
      "Berberine 500 mg x2 si besoin (apres avis).",
    ],
    citations: METABOLIC_CITATIONS,
  },
  homa_ir: {
    definition:
      "Indice combine glycemie et insuline, reflet de la resistance insulinique.",
    mechanism:
      "HOMA eleve = signal precoce d insulino resistance. HOMA bas = bonne sensibilite.",
    impact:
      "HOMA eleve rend la perte de gras plus difficile. Il augmente la fatigue post-prandiale et l inflammation metabolique. Un HOMA bas soutient la recomp.",
    protocol: [
      "Augmenter la masse musculaire et l activite quotidienne.",
      "Glucides majoritairement complexes et riches en fibres.",
      "Sommeil et gestion du stress prioritaires.",
      "Limiter alcool et snacks tardifs.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  triglycerides: {
    definition:
      "Lipides circulants refletant l equilibre entre apport calorique, foie et activite.",
    mechanism:
      "Eleves = surplus glucidique, alcool, steatose hepatique ou resistance insulinique. Bas = profil metabolique propre.",
    impact:
      "Triglycerides hauts augmentent le risque cardiometabolique. Ils degradent la composition corporelle. Des valeurs basses indiquent une bonne utilisation des graisses.",
    protocol: [
      "Reduire sucres rapides et alcool.",
      "Omega-3 2-3 g/jour (EPA dominant).",
      "Marche post-prandiale et musculation reguliere.",
      "Ameliorer sommeil et gestion du stress.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  hdl: {
    definition:
      "Cholesterol protecteur qui participe au transport inverse du cholesterol.",
    mechanism:
      "HDL bas est associe a un profil metabolique degrade et inflammation. HDL haut est souvent lie a activite physique et bons lipides.",
    impact:
      "HDL bas augmente le risque cardiometabolique. HDL optimal soutient l endurance et la sante vasculaire. Il indique un metabolisme lipidique efficace.",
    protocol: [
      "Entrainement d endurance + musculation 3-4x/sem.",
      "Graisses de qualite (huile d olive, poissons gras, noix).",
      "Arret du tabac et reduction de l alcool.",
      "Stabiliser l insulinore sistance.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  ldl: {
    definition:
      "Transporteur de cholesterol. Son interpretation doit tenir compte d ApoB et inflammation.",
    mechanism:
      "LDL eleve avec ApoB haut = risque cardio. LDL eleve avec ApoB normal peut etre moins problematique.",
    impact:
      "LDL haut et ApoB haut augmentent le risque atherogene. LDL bien controle aide la performance cardio. La qualite du LDL compte autant que le chiffre.",
    protocol: [
      "Augmenter fibres solubles (avoine, legumes, psyllium).",
      "Limiter graisses trans et ultra transformes.",
      "Omega-3 2-3 g/jour et activite physique reguliere.",
      "Surveiller ApoB pour affiner le risque.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  apob: {
    definition:
      "Nombre de particules atherogenes (LDL, VLDL, IDL). Meilleur marqueur que LDL seul.",
    mechanism:
      "ApoB eleve indique plus de particules capables de penetrer la paroi arterielle.",
    impact:
      "ApoB haut augmente le risque cardiovasculaire a long terme. Il est sensible a l insulinore sistance. Le ramener bas est prioritaire.",
    protocol: [
      "Reduction du surplus calorique et perte de gras visceral.",
      "Fibres 30-40 g/jour et legumes a chaque repas.",
      "Omega-3 2-3 g/jour.",
      "Activite physique quotidienne.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  lpa: {
    definition:
      "Lipoproteine(a), facteur genetique de risque cardiovasculaire.",
    mechanism:
      "Peu modifiable par le lifestyle, mais son impact depend du contexte inflammatoire et lipidique.",
    impact:
      "Lp(a) elevee augmente le risque de maladie vasculaire. Un profil metabolique propre reduit ce risque relatif. La priorite est d optimiser inflammation et ApoB.",
    protocol: [
      "Reduction de l inflammation (omega-3, sommeil, gestion du stress).",
      "Optimiser ApoB, glycemie et tension arterielle.",
      "Eviter tabac et exces d alcool.",
      "Recontrole regulier pour suivre le risque.",
    ],
    citations: METABOLIC_CITATIONS,
  },
  crp_us: {
    definition:
      "Marqueur d inflammation systemique de bas grade (hs-CRP).",
    mechanism:
      "Elevee = stress systemique, infection, surpoids ou surentrainement. Tres basse = inflammation bien controlee.",
    impact:
      "CRP elevee ralentit la recuperation et l anabolisme. Elle augmente le risque cardio. Une CRP basse favorise performance et longevite.",
    protocol: [
      "Omega-3 2-3 g/jour et regime anti inflammatoire.",
      "Sommeil 7h30+ et gestion du stress.",
      "Limiter alcool, sucres et aliments ultra transformes.",
      "Surveillance infections ou blessures chroniques.",
    ],
    citations: INFLAMMATORY_CITATIONS,
  },
  homocysteine: {
    definition:
      "Acide amine lie a la methylation et au risque vasculaire.",
    mechanism:
      "Elevee en deficit de B12, folate ou B6, ou en stress oxydatif.",
    impact:
      "Homocysteine elevee augmente le risque cardiovasculaire. Elle signale une methylation inefficace. Un taux bas soutient la sante neuro et vasculaire.",
    protocol: [
      "B12 methylcobalamine 1000 mcg/jour si bas.",
      "Folate 400-800 mcg/jour via aliments ou supplement.",
      "B6 10-25 mg/jour si besoin.",
      "Alimentation riche en legumes verts.",
    ],
    citations: INFLAMMATORY_CITATIONS,
  },
  ferritine: {
    definition:
      "Proteine de stockage du fer. Monte aussi en contexte inflammatoire.",
    mechanism:
      "Basse = reserve de fer faible. Haute = inflammation, surcharge fer ou syndrome metabolique.",
    impact:
      "Ferritine basse reduit endurance et immunite. Ferritine haute peut cacher une inflammation. Un niveau modere soutient performance et recuperation.",
    protocol: [
      "Si basse: fer bisglycinate 25 mg + vitamine C.",
      "Si haute: reduire alcool, sucres et inflammation.",
      "Verifier CRP et fer serique pour contexte.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: INFLAMMATORY_CITATIONS,
  },
  fer_serique: {
    definition:
      "Fer circulant disponible pour la production d hemoglobine.",
    mechanism:
      "Bas = apport insuffisant ou malabsorption. Haut = surcharge ou inflammation.",
    impact:
      "Fer bas diminue l oxygene et l endurance. Fer haut peut augmenter le stress oxydatif. L equilibre est cle pour la performance.",
    protocol: [
      "Si bas: fer bisglycinate 25 mg + vitamine C.",
      "Espacer cafe et the autour des repas riches en fer.",
      "Surveiller ferritine et transferrine sat.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: INFLAMMATORY_CITATIONS,
  },
  transferrine_sat: {
    definition:
      "Pourcentage de transferrine saturee en fer, reflet de l utilisation du fer.",
    mechanism:
      "Basse = carence fonctionnelle. Haute = surcharge ou inflammation.",
    impact:
      "Saturation basse limite l endurance et la concentration. Saturation trop haute augmente le stress oxydatif. Une zone intermediaire soutient l oxygenation.",
    protocol: [
      "Optimiser apport en fer et vitamine C.",
      "Eviter supplements fer si saturation deja haute.",
      "Verifier ferritine et CRP pour contexte.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: INFLAMMATORY_CITATIONS,
  },
  vitamine_d: {
    definition:
      "Hormone steroide qui regule immunite, hormones et sensibilite musculaire.",
    mechanism:
      "Basse par manque d exposition solaire ou malabsorption. Haute seulement avec supplementation excessive.",
    impact:
      "Vitamine D basse affecte force, humeur et immunite. Elle limite la production hormonale. Un taux optimal soutient performance et recuperation.",
    protocol: [
      "Exposition solaire 15-20 min/jour si possible.",
      "Vitamine D3 2000-4000 UI/jour avec lipides.",
      "Associer vitamine K2 si supplement long terme.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: VITAMIN_CITATIONS,
  },
  b12: {
    definition:
      "Vitamine essentielle a la production d energie et aux globules rouges.",
    mechanism:
      "Basse en alimentation pauvre en produits animaux ou malabsorption. Haute souvent liee a supplementation.",
    impact:
      "B12 basse cause fatigue, brouillard mental et baisse de performance. Elle peut augmenter l homocysteine. Un niveau optimal soutient l endurance.",
    protocol: [
      "B12 methylcobalamine 1000 mcg/jour si bas.",
      "Apport en produits animaux ou equivalents.",
      "Verifier folate et fer simultanement.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: VITAMIN_CITATIONS,
  },
  folate: {
    definition:
      "Vitamine B9 essentielle a la methylation et a la division cellulaire.",
    mechanism:
      "Basse par alimentation pauvre en legumes verts ou malabsorption. Haute souvent via supplementation.",
    impact:
      "Folate bas augmente homocysteine et fatigue. Il impacte la recuperation et la production de globules rouges. Un taux optimal soutient la performance.",
    protocol: [
      "Legumes verts 2-3 portions/jour.",
      "Folate 400-800 mcg/jour si bas.",
      "Associer B12 pour une methylation efficace.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: VITAMIN_CITATIONS,
  },
  magnesium_rbc: {
    definition:
      "Magnesium intracellulaire, reflet plus fiable que le serum.",
    mechanism:
      "Bas en stress chronique, entrainement intensif ou apport insuffisant.",
    impact:
      "Magnesium bas augmente crampes, stress et mauvais sommeil. Il reduit la recuperation neuromusculaire. Un niveau optimal stabilise le systeme nerveux.",
    protocol: [
      "Magnesium glycinate 300-400 mg le soir.",
      "Hydratation et apport en aliments riches en magnesium.",
      "Reduction du stress et du surentrainement.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: VITAMIN_CITATIONS,
  },
  zinc: {
    definition:
      "Oligoelement cle pour l immunite, la testosterone et la cicatrisation.",
    mechanism:
      "Bas en alimentation pauvre ou pertes par transpiration. Haut en sur-supplementation prolongee.",
    impact:
      "Zinc bas reduit la testosterone et l immunite. Il ralentit la recuperation. Un zinc optimal soutient performance et resilience.",
    protocol: [
      "Zinc 20-30 mg/jour avec repas.",
      "Apports alimentaires via viande, fruits de mer, graines.",
      "Eviter surdosage chronique sans suivi.",
      "Associer cuivre si supplementation longue.",
    ],
    citations: VITAMIN_CITATIONS,
  },
  alt: {
    definition:
      "Enzyme hepatique sensible a la surcharge metabolique et aux medicaments.",
    mechanism:
      "ALT elevee = stress hepatique, steatose ou alcool. ALT tres basse n est pas un probleme.",
    impact:
      "ALT haute signale un foie sous pression, ce qui perturbe la regulation hormonale. Elle peut limiter la recomposition corporelle. Un foie sain aide la performance globale.",
    protocol: [
      "Reduire alcool et sucres liquides.",
      "Perte de gras visceral progressive.",
      "Omega-3 et alimentation anti inflammatoire.",
      "Recontrole a 8-12 semaines.",
    ],
    citations: LIVER_KIDNEY_CITATIONS,
  },
  ast: {
    definition:
      "Enzyme presente dans le foie et le muscle. A interpreter avec ALT.",
    mechanism:
      "AST elevee peut venir d un entrainement intense ou d un stress hepatique. Le ratio AST/ALT aide a lire le contexte.",
    impact:
      "AST haute associee a ALT haute signale un foie sous pression. AST haute seule peut refleter un volume d entrainement trop agressif. Un ratio stable indique recuperation correcte.",
    protocol: [
      "Deload si entrainements tres intenses recentes.",
      "Limiter alcool et toxines hepatique.",
      "Hydratation et sommeil adequats.",
      "Recontrole apres 1-2 semaines de recuperation.",
    ],
    citations: LIVER_KIDNEY_CITATIONS,
  },
  ggt: {
    definition:
      "Enzyme hepatique liee au stress oxydatif et a la charge alcool.",
    mechanism:
      "GGT elevee suggere stress oxydatif, alcool ou steatose. Elle monte avant ALT/AST.",
    impact:
      "GGT elevee signale une surcharge metabolique qui freine la performance. Elle s associe a inflammation systemique. La reduire ameliore la sante hepatique.",
    protocol: [
      "Reduire alcool et fructose.",
      "Augmenter activite physique et perte de gras.",
      "Antioxydants alimentaires (legumes, baies).",
      "Recontrole a 8-12 semaines.",
    ],
    citations: LIVER_KIDNEY_CITATIONS,
  },
  creatinine: {
    definition:
      "Dechet musculaire elimine par le rein, influence par la masse musculaire.",
    mechanism:
      "Creatinine elevee peut signifier filtration renale reduite ou masse musculaire elevee. Basse peut indiquer faible masse musculaire.",
    impact:
      "Creatinine trop haute avec eGFR bas indique un risque renale. Creatinine stable avec eGFR normal est rassurante. L hydration influence fortement la valeur.",
    protocol: [
      "Hydratation 2-3 L/jour selon activite.",
      "Eviter NSAIDs chroniques et exces proteique.",
      "Recontrole eGFR si creatinine persistante haute.",
      "Adapter protein intake au contexte renale.",
    ],
    citations: LIVER_KIDNEY_CITATIONS,
  },
  egfr: {
    definition:
      "Estimation de la filtration renale, ajustee sur age et creatinine.",
    mechanism:
      "eGFR bas = filtration reduite ou dehydration. eGFR haut est rare et souvent benign.",
    impact:
      "eGFR faible limite la tolerance a l entrainement et aux supplements. Il demande une surveillance proteique. Un eGFR stable protege la performance a long terme.",
    protocol: [
      "Hydratation reguliere et sodium adequat.",
      "Eviter surplus proteique inutile.",
      "Limiter alcool et medicaments nephrotoxiques.",
      "Recontrole a 8-12 semaines si bas.",
    ],
    citations: LIVER_KIDNEY_CITATIONS,
  },
};

export const buildDefaultBiomarkerDetail = (markerName: string, statusLabel: string): BiomarkerDetail => ({
  definition: `${markerName} est un biomarqueur cle pour evaluer ta sante et ta performance.`,
  mechanism: `Quand il est ${statusLabel}, cela modifie directement la recuperation, l energie et la capacite a progresser.`,
  impact: `Plus il se rapproche du range optimal, plus tes resultats deviennent stables et previsibles.`,
  protocol: [
    "Sommeil 7h30-8h30.",
    "Apport proteique 1.6-2.2 g/kg.",
    "Micronutriments prioritaires (vitamine D, magnesium, zinc).",
  ],
  citations: [],
});
