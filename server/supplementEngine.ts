export interface SupplementDose {
  daily_amount: string;
  units: string;
  split: string;
  scaling_note: string;
}

export interface SupplementProtocolAdvanced {
  ingredient: string;
  form: string;
  actives: string[];
  dose: SupplementDose;
  timing: string;
  cycle: string;
  mechanism: string;
  evidence_grade: "A" | "B" | "C" | "D";
  citations: string[];
  risks: string[];
  synergies: string[];
  antagonisms: string[];
  label_checks: string[];
  iherb_search_query?: string;
}

export const SAFETY_GATES = {
  anticoagulants: [
    "nattokinase", "serrapeptase", "fish oil high dose", "vitamin E high dose",
    "ginkgo", "garlic extract", "omega-3 >3g"
  ],
  serotonergics: [
    "5-HTP", "tryptophan", "St John's Wort", "SAMe"
  ],
  ssri_maoi_interactions: [
    "5-HTP + SSRI = syndrome serotoninergique",
    "Tryptophan + MAOI = crise hypertensive",
    "St John's Wort + contraceptifs = efficacite reduite"
  ],
  thyroid_sensitive: ["ashwagandha", "iodine", "selenium high dose"],
  liver_caution: ["kava", "green tea extract high dose", "niacin high dose"],
  stimulant_sensitive: ["caffeine", "synephrine", "yohimbine", "DMAA"],
  pregnancy_avoid: ["ashwagandha", "tongkat ali", "boron", "dong quai"]
};

export const IHERB_RULES = {
  zero_proprietary_blends: "Si le label cache les mg par ingredient = jeter",
  correct_units: {
    nattokinase: "FU (fibrinolytic units), pas mg",
    serrapeptase: "SU/SPU, enteric-coated obligatoire",
    magnesium: "mg elementaires, pas mg total sel",
    vitamin_d: "UI ou mcg, verifier conversion"
  },
  standardization_required: {
    tongkat_ali: "eurycomanone % (idealement 2%+)",
    ashwagandha: "withanolides % (5%+ racine)",
    bergamot: "bergamot polyphenolic fraction BPF",
    saffron: "crocin/safranal standardise",
    boswellia: "AKBA % (20%+ ideal)"
  },
  quality_markers: {
    omega3: "IFOS certified, EPA+DHA chiffres precis",
    melatonin: "micro-dose 0.3-1mg, marque serieuse",
    minerals: "chelate/glycinate > oxide"
  },
  avoid_patterns: [
    "proprietary blend",
    "underdosed combos",
    "pixie dust formulas",
    "mg sans precision elementaire"
  ]
};

export const SUPPLEMENT_LIBRARY: Record<string, SupplementProtocolAdvanced[]> = {
  cardiovascular: [
    {
      ingredient: "Omega-3 EPA+DHA",
      form: "Triglyceride/rTG (pas ethyl ester)",
      actives: ["EPA", "DHA"],
      dose: { daily_amount: "2-4g", units: "g EPA+DHA combines", split: "2x/jour avec repas gras", scaling_note: "4g si TG eleves (cadre medical)" },
      timing: "Avec dejeuner et diner (repas gras)",
      cycle: "Permanent",
      mechanism: "Reduit TG via VLDL, modulation eicosanoides, membrane RBC/endothelium",
      evidence_grade: "A",
      citations: ["AHA 2019 Guidelines", "REDUCE-IT trial NEJM"],
      risks: ["Anticoagulants + dose >3g = prudence saignement", "Reflux si mauvaise qualite"],
      synergies: ["CoQ10", "Bergamot", "Psyllium"],
      antagonisms: ["Warfarine haute dose"],
      label_checks: ["IFOS certified", "EPA+DHA total visible", "TG form pas EE"],
      iherb_search_query: "omega 3 triglyceride IFOS"
    },
    {
      ingredient: "Citrus Bergamot BPF",
      form: "Extrait standardise polyphenols",
      actives: ["Bergamot Polyphenolic Fraction"],
      dose: { daily_amount: "500-1000mg", units: "mg", split: "1-2x/jour", scaling_note: "Fixe" },
      timing: "Avec repas",
      cycle: "Permanent",
      mechanism: "Polyphenols ameliorent profil lipidique LDL/TG via AMPK",
      evidence_grade: "B",
      citations: ["PMID: 30670221 meta-analyse"],
      risks: ["Rare: troubles digestifs legers"],
      synergies: ["Omega-3", "Plant sterols"],
      antagonisms: [],
      label_checks: ["BPF ou bergamot polyphenols mentionne", "Pas citrus complex flou"],
      iherb_search_query: "bergamot polyphenols BPF"
    },
    {
      ingredient: "Magnesium Taurate/Glycinate",
      form: "Chelate (pas oxide)",
      actives: ["Magnesium elementaire"],
      dose: { daily_amount: "300-400mg", units: "mg elementaire", split: "Split AM/PM ou soir seul", scaling_note: "Fixe" },
      timing: "Soir ou split",
      cycle: "Permanent",
      mechanism: "Tonus vasculaire, conduction cardiaque, relaxation",
      evidence_grade: "A",
      citations: ["PMID: 28668998"],
      risks: ["Selles molles si trop"],
      synergies: ["Potassium", "Taurine"],
      antagonisms: ["Calcium meme prise (competition)"],
      label_checks: ["Elemental magnesium visible", "Glycinate/Taurate pas oxide"],
      iherb_search_query: "magnesium glycinate elemental"
    },
    {
      ingredient: "Nattokinase",
      form: "Enzyme fibrinolytique",
      actives: ["Nattokinase"],
      dose: { daily_amount: "2000FU", units: "FU", split: "1x/jour", scaling_note: "Fixe" },
      timing: "Estomac vide, loin des repas",
      cycle: "Permanent avec pauses",
      mechanism: "Activite fibrinolytique, legere reduction BP",
      evidence_grade: "B",
      citations: ["PMID: 29439770 meta-analyse CV"],
      risks: ["ANTICOAGULANTS = CONTRE-INDIQUE", "Stop si bleus/saignements", "Chirurgie = stop 2 semaines avant"],
      synergies: ["Serrapeptase (prudence combo)"],
      antagonisms: ["Warfarine", "Aspirine", "Plavix"],
      label_checks: ["FU units obligatoire", "Pas mg seul"],
      iherb_search_query: "nattokinase 2000 FU"
    },
    {
      ingredient: "CoQ10 Ubiquinol",
      form: "Ubiquinol (reduit) > Ubiquinone",
      actives: ["Ubiquinol"],
      dose: { daily_amount: "100-200mg", units: "mg", split: "1-2x/jour", scaling_note: "200mg si statines" },
      timing: "Avec repas gras",
      cycle: "Permanent",
      mechanism: "Chaine respiratoire mitochondriale, protection LDL oxyde",
      evidence_grade: "A",
      citations: ["Q-SYMBIO trial", "PMID: 24548927"],
      risks: ["Rare: insomnie si soir"],
      synergies: ["Omega-3", "PQQ"],
      antagonisms: [],
      label_checks: ["Ubiquinol pas ubiquinone", "Softgel prefere"],
      iherb_search_query: "ubiquinol 100mg"
    }
  ],

  joints: [
    {
      ingredient: "Glucosamine Sulfate",
      form: "Sulfate (pas HCl)",
      actives: ["Glucosamine sulfate"],
      dose: { daily_amount: "1500mg", units: "mg", split: "1x/jour ou 3x500mg", scaling_note: "Fixe" },
      timing: "Avec repas",
      cycle: "Minimum 12 semaines pour effet",
      mechanism: "Substrat synthese proteoglycanes cartilage",
      evidence_grade: "A",
      citations: ["PMID: 16309928 Cochrane", "GUIDE trial"],
      risks: ["Allergie crustaces possible", "Rare: troubles GI"],
      synergies: ["Chondroitine", "MSM"],
      antagonisms: ["Warfarine (surveillance INR)"],
      label_checks: ["Sulfate obligatoire", "1500mg/jour dose efficace"],
      iherb_search_query: "glucosamine sulfate 1500mg"
    },
    {
      ingredient: "Chondroitine Sulfate",
      form: "Sulfate",
      actives: ["Chondroitine sulfate"],
      dose: { daily_amount: "800-1200mg", units: "mg", split: "1-2x/jour", scaling_note: "Fixe" },
      timing: "Avec repas",
      cycle: "Minimum 12 semaines",
      mechanism: "Inhibition enzymes degradation cartilage, retention eau",
      evidence_grade: "A",
      citations: ["PMID: 20889716 meta"],
      risks: ["Rare: troubles GI"],
      synergies: ["Glucosamine", "Collagene"],
      antagonisms: [],
      label_checks: ["Chondroitin sulfate pur", "Dose adequate"],
      iherb_search_query: "chondroitin sulfate 400mg"
    },
    {
      ingredient: "Collagene Hydrolyse Type II",
      form: "Peptides hydrolyses",
      actives: ["Peptides collagene"],
      dose: { daily_amount: "10-15g", units: "g", split: "1x/jour", scaling_note: "Avec vitamine C" },
      timing: "30-60min avant entrainement ou matin a jeun",
      cycle: "Permanent",
      mechanism: "Precurseur tissus conjonctifs, tendons, cartilage",
      evidence_grade: "B",
      citations: ["PMID: 30681787"],
      risks: ["Allergie marine si source poisson"],
      synergies: ["Vitamine C 500mg", "Glycine"],
      antagonisms: [],
      label_checks: ["Hydrolyzed collagen peptides", "Type I/II/III selon cible"],
      iherb_search_query: "collagen peptides type II"
    },
    {
      ingredient: "UC-II Collagene Non Denature",
      form: "Collagene type II non denature",
      actives: ["UC-II"],
      dose: { daily_amount: "40mg", units: "mg", split: "1x/jour", scaling_note: "Micro-dose immuno-tolerance" },
      timing: "Estomac vide, matin",
      cycle: "Permanent",
      mechanism: "Tolerance orale, modulation immunitaire articulaire",
      evidence_grade: "B",
      citations: ["PMID: 26822714"],
      risks: ["Rare"],
      synergies: ["Boswellia"],
      antagonisms: [],
      label_checks: ["UC-II patente", "40mg dose efficace"],
      iherb_search_query: "UC-II collagen 40mg"
    },
    {
      ingredient: "Boswellia AKBA",
      form: "Extrait standardise AKBA",
      actives: ["Acide boswellique AKBA"],
      dose: { daily_amount: "100-250mg", units: "mg AKBA", split: "1-2x/jour", scaling_note: "Selon % standardisation" },
      timing: "Avec repas",
      cycle: "8-12 semaines puis reevaluation",
      mechanism: "Inhibition 5-LOX, anti-inflammatoire",
      evidence_grade: "B",
      citations: ["PMID: 31599571"],
      risks: ["Rare: troubles GI"],
      synergies: ["Curcumine", "Omega-3"],
      antagonisms: [],
      label_checks: ["AKBA % visible (20%+ ideal)", "Pas boswellia generique"],
      iherb_search_query: "boswellia AKBA 20%"
    }
  ],

  cortisol_stress: [
    {
      ingredient: "Ashwagandha KSM-66",
      form: "Extrait racine standardise withanolides",
      actives: ["Withanolides"],
      dose: { daily_amount: "300-600mg", units: "mg", split: "1-2x/jour", scaling_note: "Fixe" },
      timing: "Matin et/ou soir",
      cycle: "8 semaines ON, 2 semaines OFF",
      mechanism: "Modulation axe HPA, reduction cortisol, adaptogene",
      evidence_grade: "A",
      citations: ["PMID: 32021735 meta-analyse"],
      risks: ["Sedation possible", "Thyroide: peut augmenter T4", "Grossesse: eviter"],
      synergies: ["Phosphatidylserine", "Rhodiola"],
      antagonisms: ["Sedatifs", "Immunosuppresseurs"],
      label_checks: ["KSM-66 ou Sensoril", "5%+ withanolides", "Root extract pas feuille"],
      iherb_search_query: "ashwagandha KSM-66 600mg"
    },
    {
      ingredient: "Phosphatidylserine PS",
      form: "Phospholipide",
      actives: ["Phosphatidylserine"],
      dose: { daily_amount: "300-600mg", units: "mg", split: "3x100mg ou 2x150mg", scaling_note: "600mg pour athletes stresses" },
      timing: "Matin, midi, pre-entrainement",
      cycle: "8 semaines puis reevaluation",
      mechanism: "Attenuation reponse cortisol, fluidite membranaire neuronale",
      evidence_grade: "B",
      citations: ["PMID: 17240877"],
      risks: ["Anticoagulants: prudence"],
      synergies: ["Ashwagandha", "Omega-3 DHA"],
      antagonisms: [],
      label_checks: ["PS dose claire", "Soja ou tournesol source"],
      iherb_search_query: "phosphatidylserine 100mg"
    },
    {
      ingredient: "Tongkat Ali",
      form: "Extrait racine standardise",
      actives: ["Eurycomanone"],
      dose: { daily_amount: "200-400mg", units: "mg", split: "1x/jour", scaling_note: "200mg dose etude cortisol" },
      timing: "Matin",
      cycle: "5 jours ON, 2 jours OFF ou 8 semaines ON, 2 OFF",
      mechanism: "Reduction cortisol, augmentation testosterone libre",
      evidence_grade: "B",
      citations: ["PMID: 23753945 etude stress"],
      risks: ["Insomnie si soir", "Agitation chez certains"],
      synergies: ["Ashwagandha", "Zinc"],
      antagonisms: [],
      label_checks: ["Eurycomanone % ou LJ100", "Standardise obligatoire"],
      iherb_search_query: "tongkat ali LJ100 200mg"
    },
    {
      ingredient: "L-Theanine",
      form: "Acide amine",
      actives: ["L-Theanine"],
      dose: { daily_amount: "200-400mg", units: "mg", split: "1-2x/jour", scaling_note: "Fixe" },
      timing: "Matin avec cafe ou soir pour relaxation",
      cycle: "Permanent",
      mechanism: "Augmentation ondes alpha, GABA, relaxation sans sedation",
      evidence_grade: "A",
      citations: ["PMID: 30707852 meta"],
      risks: ["Aucun notable"],
      synergies: ["Cafeine (synergie focus)", "Magnesium"],
      antagonisms: [],
      label_checks: ["L-Theanine pur", "Suntheanine patente bonus"],
      iherb_search_query: "l-theanine 200mg suntheanine"
    },
    {
      ingredient: "Magnesium Glycinate",
      form: "Chelate glycinate",
      actives: ["Magnesium elementaire"],
      dose: { daily_amount: "300-400mg", units: "mg elementaire", split: "Soir", scaling_note: "Fixe" },
      timing: "1-2h avant coucher",
      cycle: "Permanent",
      mechanism: "Cofacteur 300+ enzymes, relaxation musculaire, modulation GABA",
      evidence_grade: "A",
      citations: ["PMID: 28668998"],
      risks: ["Selles molles si exces"],
      synergies: ["Glycine", "Zinc"],
      antagonisms: ["Calcium meme prise"],
      label_checks: ["Elemental Mg visible", "Glycinate forme"],
      iherb_search_query: "magnesium glycinate 400mg"
    }
  ],

  testosterone: [
    {
      ingredient: "Vitamine D3",
      form: "Cholecalciferol",
      actives: ["Vitamine D3"],
      dose: { daily_amount: "2000-5000UI", units: "UI", split: "1x/jour", scaling_note: "Selon 25(OH)D baseline" },
      timing: "Avec repas gras",
      cycle: "Permanent, controle sanguin a 3 mois",
      mechanism: "Precurseur hormonal, recepteurs dans testicules",
      evidence_grade: "B",
      citations: ["PMID: 21154195"],
      risks: ["Hypercalcemie si >10000UI/j chronique"],
      synergies: ["K2 MK-7", "Magnesium"],
      antagonisms: [],
      label_checks: ["D3 pas D2", "UI claires"],
      iherb_search_query: "vitamin D3 5000 IU K2"
    },
    {
      ingredient: "Zinc Picolinate",
      form: "Picolinate (haute absorption)",
      actives: ["Zinc elementaire"],
      dose: { daily_amount: "15-30mg", units: "mg elementaire", split: "1x/jour", scaling_note: "30mg si deficit suspecte" },
      timing: "Avec repas (evite nausee)",
      cycle: "Permanent si besoin, sinon cycler",
      mechanism: "Cofacteur aromatase, synthese testosterone",
      evidence_grade: "B",
      citations: ["PMID: 8875519"],
      risks: ["Nausee estomac vide", "Depletion cuivre si >40mg chronique"],
      synergies: ["Magnesium", "B6"],
      antagonisms: ["Fer meme prise", "Calcium meme prise"],
      label_checks: ["Picolinate ou Glycinate", "Elemental zinc visible"],
      iherb_search_query: "zinc picolinate 30mg"
    },
    {
      ingredient: "Boron",
      form: "Citrate ou Glycinate",
      actives: ["Bore"],
      dose: { daily_amount: "6-10mg", units: "mg", split: "1x/jour", scaling_note: "Cycler: 2 semaines ON, 1 OFF" },
      timing: "Matin",
      cycle: "2 semaines ON, 1 semaine OFF",
      mechanism: "Augmentation testosterone libre, reduction SHBG et E2",
      evidence_grade: "B",
      citations: ["PMID: 21129941"],
      risks: ["Trop longtemps = diminishing returns"],
      synergies: ["Vitamine D", "Zinc"],
      antagonisms: [],
      label_checks: ["Boron elementaire visible", "Citrate ou glycinate forme"],
      iherb_search_query: "boron 10mg"
    },
    {
      ingredient: "Tongkat Ali LJ100",
      form: "Extrait standardise",
      actives: ["Eurycomanone"],
      dose: { daily_amount: "200-400mg", units: "mg", split: "Matin", scaling_note: "200mg etude reference" },
      timing: "Matin a jeun ou petit-dejeuner",
      cycle: "5/2 ou 8 semaines ON, 2 OFF",
      mechanism: "Liberation LH, reduction SHBG, anti-cortisol",
      evidence_grade: "B",
      citations: ["PMID: 23243445", "PMID: 21671978"],
      risks: ["Agitation/insomnie si sensible"],
      synergies: ["Ashwagandha", "Zinc", "Boron"],
      antagonisms: [],
      label_checks: ["LJ100 ou eurycomanone standardise", "Pas tongkat generique"],
      iherb_search_query: "tongkat ali LJ100"
    },
    {
      ingredient: "Shilajit Purifie",
      form: "Extrait purifie",
      actives: ["Acide fulvique", "DBPs"],
      dose: { daily_amount: "250mg 2x/jour", units: "mg", split: "2x/jour", scaling_note: "Fixe" },
      timing: "Matin et apres-midi",
      cycle: "12 semaines puis pause",
      mechanism: "Augmentation testosterone totale et libre",
      evidence_grade: "B",
      citations: ["PMID: 26395129"],
      risks: ["Contaminants metaux si non purifie"],
      synergies: ["CoQ10", "Ashwagandha"],
      antagonisms: [],
      label_checks: ["Purified shilajit", "Heavy metals tested"],
      iherb_search_query: "shilajit purified 250mg"
    }
  ],

  sleep: [
    {
      ingredient: "Glycine",
      form: "Acide amine",
      actives: ["Glycine"],
      dose: { daily_amount: "3g", units: "g", split: "1x avant coucher", scaling_note: "Fixe 3g = dose etude" },
      timing: "30-60min avant coucher",
      cycle: "Permanent",
      mechanism: "Abaissement temperature corporelle, augmentation SWS",
      evidence_grade: "A",
      citations: ["PMID: 22293292", "PMID: 17299616"],
      risks: ["Aucun notable"],
      synergies: ["Magnesium", "L-Theanine"],
      antagonisms: [],
      label_checks: ["Glycine pure", "3g minimum par dose"],
      iherb_search_query: "glycine powder 3g"
    },
    {
      ingredient: "Magnesium Bisglycinate",
      form: "Chelate bisglycinate",
      actives: ["Magnesium elementaire", "Glycine"],
      dose: { daily_amount: "300-400mg", units: "mg elementaire", split: "Soir", scaling_note: "Fixe" },
      timing: "1-2h avant coucher",
      cycle: "Permanent",
      mechanism: "Relaxation GABA-ergique, glycine bonus",
      evidence_grade: "A",
      citations: ["PMID: 34883514"],
      risks: ["Selles molles"],
      synergies: ["Glycine", "L-Theanine", "Apigenine"],
      antagonisms: ["Calcium meme prise"],
      label_checks: ["Bisglycinate", "Elemental Mg"],
      iherb_search_query: "magnesium bisglycinate 400mg"
    },
    {
      ingredient: "Apigenine",
      form: "Extrait camomille",
      actives: ["Apigenine"],
      dose: { daily_amount: "50mg", units: "mg", split: "1x soir", scaling_note: "Fixe" },
      timing: "30min avant coucher",
      cycle: "Permanent",
      mechanism: "Agoniste GABA-A, anxiolytique leger",
      evidence_grade: "C",
      citations: ["PMID: 10617998"],
      risks: ["Aucun notable"],
      synergies: ["Magnesium", "L-Theanine"],
      antagonisms: [],
      label_checks: ["Apigenin extrait pur", "Pas camomille the simple"],
      iherb_search_query: "apigenin 50mg"
    },
    {
      ingredient: "L-Theanine",
      form: "Acide amine",
      actives: ["L-Theanine"],
      dose: { daily_amount: "200-400mg", units: "mg", split: "Soir", scaling_note: "Fixe" },
      timing: "1h avant coucher",
      cycle: "Permanent",
      mechanism: "Ondes alpha, relaxation sans sedation",
      evidence_grade: "A",
      citations: ["PMID: 30707852"],
      risks: ["Aucun"],
      synergies: ["Magnesium", "Glycine"],
      antagonisms: [],
      label_checks: ["L-Theanine pur", "Suntheanine bonus"],
      iherb_search_query: "l-theanine 200mg"
    },
    {
      ingredient: "Melatonine Micro-Dose",
      form: "Hormone",
      actives: ["Melatonine"],
      dose: { daily_amount: "0.3-1mg", units: "mg", split: "1x soir", scaling_note: "MICRO-DOSE seulement" },
      timing: "30min avant coucher, OBSCURITE",
      cycle: "Court terme ou voyage",
      mechanism: "Reset circadien, signal sommeil",
      evidence_grade: "A",
      citations: ["PMID: 15649745"],
      risks: ["Variabilite produit (certains sous/sur-doses)", "Pas long terme haute dose"],
      synergies: ["Blocage lumiere bleue"],
      antagonisms: ["Lumiere vive", "Ecrans"],
      label_checks: ["0.5mg ou 1mg MAX", "Marque reputee"],
      iherb_search_query: "melatonin 0.5mg"
    }
  ],

  neurotransmitters: [
    {
      ingredient: "Citicoline CDP-Choline",
      form: "CDP-Choline",
      actives: ["Citicoline"],
      dose: { daily_amount: "250-500mg", units: "mg", split: "1-2x/jour", scaling_note: "Matin prefere" },
      timing: "Matin, avec ou sans nourriture",
      cycle: "Permanent ou cycles 8 semaines",
      mechanism: "Precurseur acetylcholine + phosphatidylcholine, neuroprotection",
      evidence_grade: "A",
      citations: ["PMID: 25904163"],
      risks: ["Rare: maux de tete"],
      synergies: ["Uridine", "Omega-3 DHA"],
      antagonisms: [],
      label_checks: ["CDP-Choline ou Cognizin", "Dose adequate"],
      iherb_search_query: "citicoline cognizin 250mg"
    },
    {
      ingredient: "Alpha-GPC",
      form: "Alpha-glycerophosphocholine",
      actives: ["Alpha-GPC"],
      dose: { daily_amount: "300-600mg", units: "mg", split: "1-2x/jour", scaling_note: "Matin focus, pre-workout" },
      timing: "Matin ou pre-entrainement",
      cycle: "Cycler: 5/2",
      mechanism: "Precurseur acetylcholine haute biodisponibilite",
      evidence_grade: "B",
      citations: ["PMID: 12637119"],
      risks: ["ATTENTION: association AVC dans etude cohorte", "Profil CV a risque = prudence"],
      synergies: ["Huperzine A", "Uridine"],
      antagonisms: ["Anticholinergiques"],
      label_checks: ["Alpha-GPC 50% minimum", "Dose reelle"],
      iherb_search_query: "alpha GPC 300mg"
    },
    {
      ingredient: "L-Tyrosine",
      form: "Acide amine",
      actives: ["L-Tyrosine"],
      dose: { daily_amount: "500-2000mg", units: "mg", split: "1-2x matin/midi", scaling_note: "500mg baseline, 2g stress/privation sommeil" },
      timing: "Matin a jeun ou avec proteines",
      cycle: "Permanent ou selon besoin",
      mechanism: "Precurseur dopamine/noradrenaline",
      evidence_grade: "B",
      citations: ["PMID: 25598314"],
      risks: ["Hyperthyroidie: prudence", "Migraine chez certains"],
      synergies: ["B6", "Vitamine C"],
      antagonisms: ["Levodopa"],
      label_checks: ["L-Tyrosine pur", "Pas NALT si oral"],
      iherb_search_query: "l-tyrosine 500mg"
    },
    {
      ingredient: "Safran Standardise",
      form: "Extrait stigmates",
      actives: ["Crocin", "Safranal"],
      dose: { daily_amount: "30mg", units: "mg", split: "1-2x/jour", scaling_note: "Fixe 30mg = dose etude" },
      timing: "Matin et soir",
      cycle: "8-12 semaines",
      mechanism: "Modulation serotonine, comparable SSRI dans essais",
      evidence_grade: "A",
      citations: ["PMID: 24987035 meta-analyse"],
      risks: ["Grossesse: eviter", "Prix eleve"],
      synergies: ["Curcumine", "Omega-3"],
      antagonisms: ["SSRI: prudence (pas combine sans avis)"],
      label_checks: ["Saffron extract standardise", "Crocin % visible"],
      iherb_search_query: "saffron extract 30mg"
    },
    {
      ingredient: "Creatine Monohydrate",
      form: "Monohydrate micronise",
      actives: ["Creatine"],
      dose: { daily_amount: "5g", units: "g", split: "1x/jour", scaling_note: "3g si >80kg maintenance" },
      timing: "Post-entrainement ou avec glucides",
      cycle: "Permanent",
      mechanism: "Energie neuronale + musculaire via phosphocreatine",
      evidence_grade: "A",
      citations: ["PMID: 12945830", "PMID: 28607928 cognition"],
      risks: ["Hydratation +500ml/jour", "Insuffisance renale: eviter"],
      synergies: ["Beta-alanine", "Glucides"],
      antagonisms: [],
      label_checks: ["Creapure ou monohydrate pur", "Micronized"],
      iherb_search_query: "creatine monohydrate creapure"
    }
  ],

  performance: [
    {
      ingredient: "Creatine Monohydrate",
      form: "Monohydrate Creapure",
      actives: ["Creatine"],
      dose: { daily_amount: "5g", units: "g", split: "1x/jour", scaling_note: "3-5g selon poids" },
      timing: "Post-entrainement avec glucides",
      cycle: "Permanent",
      mechanism: "Regeneration ATP via phosphocreatine, +5-15% force",
      evidence_grade: "A",
      citations: ["PMID: 12945830"],
      risks: ["Hydratation obligatoire", "Retention eau intramusculaire normale"],
      synergies: ["Beta-alanine", "Citrulline"],
      antagonisms: [],
      label_checks: ["Creapure certifie", "Monohydrate pur"],
      iherb_search_query: "creatine monohydrate creapure 5g"
    },
    {
      ingredient: "Citrulline Malate",
      form: "Malate 2:1",
      actives: ["L-Citrulline"],
      dose: { daily_amount: "6-8g", units: "g", split: "Pre-entrainement", scaling_note: "8g optimal" },
      timing: "30-45min avant entrainement",
      cycle: "Jours d'entrainement",
      mechanism: "Augmentation NO, vasodilatation, +15% volume sanguin musculaire",
      evidence_grade: "A",
      citations: ["PMID: 20386132"],
      risks: ["Troubles digestifs si trop", "Reduire a 6g si sensible"],
      synergies: ["Beta-alanine", "Creatine"],
      antagonisms: [],
      label_checks: ["Citrulline malate 2:1", "Pas L-citrulline seul si dose faible"],
      iherb_search_query: "citrulline malate 2:1"
    },
    {
      ingredient: "Beta-Alanine",
      form: "Acide amine",
      actives: ["Beta-Alanine"],
      dose: { daily_amount: "3.2-6.4g", units: "g", split: "2x/jour", scaling_note: "Phase charge 6.4g, maintenance 3.2g" },
      timing: "Matin + pre-entrainement ou split",
      cycle: "12 semaines charge puis maintenance",
      mechanism: "Augmentation carnosine musculaire, tampon acide lactique",
      evidence_grade: "A",
      citations: ["PMID: 20091069"],
      risks: ["Paresthesies (picotements) normales", "Prendre avec repas si derangeant"],
      synergies: ["Creatine", "Citrulline"],
      antagonisms: [],
      label_checks: ["CarnoSyn patente bonus", "Beta-alanine pur"],
      iherb_search_query: "beta alanine carnosyn"
    },
    {
      ingredient: "Cafeine",
      form: "Anhydre ou naturelle",
      actives: ["Cafeine"],
      dose: { daily_amount: "3-6mg/kg", units: "mg/kg BW", split: "Pre-entrainement", scaling_note: "200-400mg pour 70-80kg" },
      timing: "30-60min avant entrainement",
      cycle: "Cycler: 2 semaines ON, 1 OFF pour sensibilite",
      mechanism: "Antagoniste adenosine, boost catecholamines, RPE reduit",
      evidence_grade: "A",
      citations: ["PMID: 20205813"],
      risks: ["Anxiete", "Insomnie si apres 14h", "Tolerance rapide"],
      synergies: ["L-Theanine (lisse effets)", "Citrulline"],
      antagonisms: ["Creatine absorption orale (faible impact)"],
      label_checks: ["Cafeine anhydre ou naturelle", "Dosage precis"],
      iherb_search_query: "caffeine 200mg"
    }
  ]
};

export function selectSupplementsForDomain(
  domain: string,
  score: number,
  responses: Record<string, unknown>,
  meds: string[] = []
): SupplementProtocolAdvanced[] {
  const library = SUPPLEMENT_LIBRARY[domain] || [];
  
  if (score >= 80) return [];
  
  const safeSupplements = library.filter(supp => {
    for (const med of meds) {
      const medLower = med.toLowerCase();
      if (medLower.includes("anticoagulant") || medLower.includes("warfarin") || medLower.includes("coumadin")) {
        if (SAFETY_GATES.anticoagulants.some(a => supp.ingredient.toLowerCase().includes(a.toLowerCase()))) {
          return false;
        }
      }
      if (medLower.includes("ssri") || medLower.includes("antidepresseur")) {
        if (SAFETY_GATES.serotonergics.some(s => supp.ingredient.toLowerCase().includes(s.toLowerCase()))) {
          return false;
        }
      }
    }
    return true;
  });

  let maxSupplements = 0;
  if (score < 50) {
    maxSupplements = 5;
  } else if (score < 60) {
    maxSupplements = 4;
  } else if (score < 70) {
    maxSupplements = 3;
  } else if (score < 80) {
    maxSupplements = 2;
  }

  const sorted = safeSupplements.sort((a, b) => {
    const gradeOrder = { A: 4, B: 3, C: 2, D: 1 };
    return gradeOrder[b.evidence_grade] - gradeOrder[a.evidence_grade];
  });

  return sorted.slice(0, maxSupplements);
}

export function formatSupplementForReport(supp: SupplementProtocolAdvanced): {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands: string[];
  warnings: string;
  evidence: string;
  iherb_search: string;
} {
  return {
    name: `${supp.ingredient} (${supp.form})`,
    dosage: `${supp.dose.daily_amount} ${supp.dose.units}`,
    timing: supp.timing,
    duration: supp.cycle,
    why: supp.mechanism,
    brands: supp.label_checks,
    warnings: supp.risks.join("; "),
    evidence: `Grade ${supp.evidence_grade} - ${supp.citations.join(", ")}`,
    iherb_search: supp.iherb_search_query || ""
  };
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    // séparateurs courants
    return s
      .split(/[,;\n]/g)
      .map(x => x.trim())
      .filter(Boolean);
  }
  if (v == null) return [];
  return [String(v)].map(s => s.trim()).filter(Boolean);
}

function uniqueByName(list: SupplementProtocolAdvanced[]): SupplementProtocolAdvanced[] {
  const seen = new Set<string>();
  const out: SupplementProtocolAdvanced[] = [];
  for (const s of list) {
    const key = s.ingredient.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Génère le texte "STACK SUPPLEMENTS OPTIMISE" directement depuis la bibliothèque.
 * Objectif : zéro hallucination, cohérence, et intégration de tes règles d'achat/sécurité.
 * IMPORTANT : retourne du texte brut (pas de markdown).
 */
export function generateSupplementsSectionText(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
}): string {
  const responses = input.responses || {};
  const meds = [
    ...toStringArray(responses["medicaments"]),
    ...toStringArray(responses["medications"]),
  ];

  // Heuristique simple : plus le score global est bas, plus on autorise d'items.
  const baseScore =
    typeof input.globalScore === "number" && Number.isFinite(input.globalScore)
      ? Math.max(30, Math.min(90, input.globalScore))
      : 55;

  // On compose une stack robuste (fondations + cibles fréquentes).
  const domains = [
    "sleep",
    "cortisol_stress",
    "performance",
    "cardiovascular",
    "neurotransmitters",
    "testosterone",
    "joints",
  ];

  const all = domains.flatMap((domain) => selectSupplementsForDomain(domain, baseScore, responses, meds));
  const picked = uniqueByName(all);

  // Formattage lisible (sans tableaux / markdown).
  const lines: string[] = [];
  lines.push("Base sur : tes reponses + tes priorites + tes contraintes + gates securite.");
  lines.push("");

  lines.push("PRIORITE 0 - REGLES D'ACHAT (NON NEGOCIABLES) :");
  lines.push(`+ ${IHERB_RULES.zero_proprietary_blends}`);
  lines.push(`+ ${IHERB_RULES.correct_units.magnesium}`);
  lines.push(`+ ${IHERB_RULES.quality_markers.omega3}`);
  lines.push(`+ ${IHERB_RULES.standardization_required.ashwagandha}`);
  lines.push(`+ ${IHERB_RULES.standardization_required.tongkat_ali}`);
  lines.push("");

  lines.push("SECURITE - GATES (SI MEDICAMENTS / RISQUES) :");
  if (meds.length > 0) {
    lines.push(`+ Medicaments declares : ${meds.join(", ")}`);
    lines.push(`+ Interactions sensibles (exemples) : ${SAFETY_GATES.ssri_maoi_interactions.join(" | ")}`);
  } else {
    lines.push("+ Aucun medicament declare. Si c'est faux, stop: on adapte la stack avant de commencer.");
  }
  lines.push("");

  lines.push("STACK CIBLEE (SELECTIONNEE DANS LA BIBLIOTHEQUE ACHZOD) :");
  if (picked.length === 0) {
    lines.push("Je ne propose pas de stack avancee pour l'instant : ton profil ne l'exige pas OU les infos sont insuffisantes.");
    lines.push("Concentre-toi sur les fondations (sommeil, proteines, hydratation, entrainement) 14 jours, puis on re-evalue.");
    return lines.join("\n");
  }

  picked.slice(0, 10).forEach((supp, idx) => {
    const f = formatSupplementForReport(supp);
    lines.push("");
    lines.push(`${idx + 1}. ${f.name}`);
    lines.push(`Dosage : ${f.dosage}`);
    lines.push(`Timing : ${f.timing}`);
    lines.push(`Duree / cycle : ${f.duration}`);
    lines.push(`Pourquoi : ${f.why}`);
    if (f.warnings) lines.push(`A surveiller : ${f.warnings}`);
    lines.push(`Qualite label : ${f.brands.join(" | ")}`);
    if (f.iherb_search) lines.push(`Recherche iHerb : ${f.iherb_search}`);
    lines.push(`Evidence : ${f.evidence}`);
  });

  lines.push("");
  lines.push("CE QU'IL NE FAUT PAS FAIRE :");
  lines.push("+ Empiler 10 produits d'un coup. Ajoute 1 supplement tous les 3-4 jours.");
  lines.push("+ Acheter des blends opaques / sous-dosees.");
  lines.push("+ Melanger des produits 'stimulants' si ton sommeil/stress est deja fragile.");

  return lines.join("\n");
}
