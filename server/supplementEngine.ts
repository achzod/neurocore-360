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
    evidence: `Grade ${supp.evidence_grade}`,
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
import pLimit from "p-limit";
import { AFFILIATE_CODE, IHERB_PRODUCTS, getIHerbLink, type IHerbProduct } from "./iherbProducts";
import { normalizeSingleVoice } from "./textNormalization";

// Mapping ingredient_id vers iHerb product database key
const INGREDIENT_TO_IHERB_KEY: Record<string, string> = {
  "magnesium_bisglycinate": "magnesium_bisglycinate",
  "magnesium": "magnesium_bisglycinate",
  "magnesium_glycinate": "magnesium_bisglycinate",
  "magnesium_taurate_glycinate": "magnesium_bisglycinate",
  "glycine": "glycine",
  "omega_3_epa_dha": "omega3_epa_dha",
  "omega3_epa_dha": "omega3_epa_dha",
  "omega3": "omega3_epa_dha",
  "vitamin_d3": "vitamin_d3",
  "vitamine_d": "vitamin_d3",
  "ashwagandha": "ashwagandha",
  "ashwagandha_ksm_66": "ashwagandha",
  "l_theanine": "l_theanine",
  "theanine": "l_theanine",
  "creatine_monohydrate": "creatine_monohydrate",
  "creatine": "creatine_monohydrate",
  "zinc": "zinc",
  "tongkat_ali": "tongkat_ali",
  "tongkat_ali_lj100": "tongkat_ali",
  "mucuna_pruriens": "mucuna_pruriens",
  "apigenine": "apigenine",
  "acetyl_l_carnitine": "acetyl_l_carnitine",
  "coq10": "coq10",
  "coq10_ubiquinol": "coq10",
  "b_complex": "b_complex",
};

const IHERB_DOMAIN = "https://fr.iherb.com";
const LINK_CHECK_TIMEOUT_MS = 4500;
const LINK_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const linkCheckLimiter = pLimit(4);
const linkHealthCache = new Map<string, { ok: boolean; checkedAt: number }>();

const MATCH_STOP_WORDS = new Set([
  "caps", "capsules", "capsule", "tablet", "tablets", "softgel", "softgels",
  "powder", "liquid", "oil", "extract", "complex", "formula", "support",
  "supplement", "nutrition", "food", "foods", "best", "research", "labs",
  "lab", "natural", "naturals", "source", "pure", "sports", "doctor", "now",
]);

const INGREDIENT_ALIAS_TOKENS: Record<string, string[]> = {
  coq10: ["q10", "coenzyme", "ubiquinol", "ubiquinone"],
  b_complex: ["b-complex", "b complex", "b-right", "co-enzyme", "coenzyme"],
  omega3_epa_dha: ["omega", "epa", "dha", "fish oil"],
  vitamin_d3: ["vitamin", "d3", "cholecalciferol"],
  l_theanine: ["theanine", "suntheanine"],
  magnesium_bisglycinate: ["magnesium", "glycinate", "bisglycinate"],
  creatine_monohydrate: ["creatine", "monohydrate", "creapure"],
};

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractMatchTokens(value: string): string[] {
  const normalized = normalizeMatchText(value);
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => {
      if (MATCH_STOP_WORDS.has(token)) return false;
      if (token.length >= 3) return true;
      return /\d/.test(token) && token.length >= 2;
    });
  return Array.from(new Set(tokens));
}

function normalizeIngredientKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildMatchTokens(ingredientLabel: string, ingredientKey: string): string[] {
  const tokens = new Set<string>();
  extractMatchTokens(ingredientLabel).forEach((token) => tokens.add(token));
  extractMatchTokens(ingredientKey.replace(/_/g, " ")).forEach((token) => tokens.add(token));
  const aliases = INGREDIENT_ALIAS_TOKENS[ingredientKey] || [];
  aliases.forEach((alias) => {
    extractMatchTokens(alias).forEach((token) => tokens.add(token));
  });
  return Array.from(tokens);
}

function productMatchesSupplement(
  ingredientLabel: string,
  ingredientKey: string,
  product: IHerbProduct
): boolean {
  const tokens = buildMatchTokens(ingredientLabel, ingredientKey);
  if (tokens.length === 0) return true;
  const productText = normalizeMatchText(`${product.name} ${product.slug} ${product.brand}`);
  const matches = tokens.filter((token) => productText.includes(token));
  const requiredMatches = tokens.length >= 3 ? 2 : 1;
  return matches.length >= requiredMatches;
}

function normalizeIherbLink(url: string): string {
  if (!url) return url;
  const sanitized = url.replace(/https?:\/\/[^/]*iherb\.com\//i, `${IHERB_DOMAIN}/`);
  if (/rcode=/i.test(sanitized)) {
    return sanitized.replace(/rcode=[^&\"']*/i, `rcode=${AFFILIATE_CODE}`);
  }
  return `${sanitized}${sanitized.includes("?") ? "&" : "?"}rcode=${AFFILIATE_CODE}`;
}

function buildIherbSearchLink(query: string): string {
  const q = encodeURIComponent(query.trim());
  return normalizeIherbLink(`${IHERB_DOMAIN}/search?kw=${q}`);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isExpectedProductUrl(finalUrl: string, expected?: { productId?: number; slug?: string }): boolean {
  if (!expected) return true;
  try {
    const parsed = new URL(finalUrl);
    if (!parsed.hostname.includes("iherb.com")) return false;
    const path = parsed.pathname.toLowerCase();
    if (!path.includes("/pr/")) return false;
    if (expected.productId && !path.includes(`/${expected.productId}`)) return false;
    if (expected.slug && !path.includes(`/${expected.slug.toLowerCase()}`)) return false;
    return true;
  } catch {
    return false;
  }
}

async function isIherbLinkHealthy(
  url: string,
  expected?: { productId?: number; slug?: string }
): Promise<boolean> {
  const cached = linkHealthCache.get(url);
  if (cached && Date.now() - cached.checkedAt < LINK_CACHE_TTL_MS) {
    return cached.ok;
  }

  const ok = await linkCheckLimiter(async () => {
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      };

      let res = await fetchWithTimeout(
        url,
        { method: "HEAD", redirect: "follow", headers },
        LINK_CHECK_TIMEOUT_MS
      );

      const isExpected = isExpectedProductUrl(res.url || url, expected);
      if (res.status >= 200 && res.status < 400 && isExpected) {
        linkHealthCache.set(url, { ok: true, checkedAt: Date.now() });
        return true;
      }
      if ([403, 405].includes(res.status) && isExpected) {
        linkHealthCache.set(url, { ok: true, checkedAt: Date.now() });
        return true;
      }

      if ([400, 403, 405].includes(res.status) || !isExpected) {
        res = await fetchWithTimeout(
          url,
          { method: "GET", redirect: "follow", headers },
          LINK_CHECK_TIMEOUT_MS
        );
        if (res.body) {
          try {
            await res.body.cancel();
          } catch {
            // ignore
          }
        }
        const isExpectedGet = isExpectedProductUrl(res.url || url, expected);
        if (res.status >= 200 && res.status < 400 && isExpectedGet) {
          linkHealthCache.set(url, { ok: true, checkedAt: Date.now() });
          return true;
        }
        if ([403, 405].includes(res.status) && isExpectedGet) {
          linkHealthCache.set(url, { ok: true, checkedAt: Date.now() });
          return true;
        }
      }
    } catch {
      // ignore
    }

    linkHealthCache.set(url, { ok: false, checkedAt: Date.now() });
    return false;
  });

  return ok;
}

function buildSearchFallbackHTML(params: {
  ingredientLabel: string;
  searchQuery: string;
  searchLink: string;
}): string {
  const { ingredientLabel, searchQuery, searchLink } = params;
  return `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border);">
      <h5 style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">
        Mes recommandations iHerb
      </h5>
      <a href="${searchLink}" target="_blank" rel="noopener noreferrer" style="display: block; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-decoration: none;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <span style="background: var(--accent-warning); color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;">RECHERCHE</span>
            <p style="font-size: 1rem; font-weight: 600; color: var(--text); margin: 10px 0 4px 0;">${ingredientLabel}</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">Recherche iHerb: ${searchQuery}</p>
          </div>
          <span style="color: var(--accent-warning); font-weight: 700; font-size: 0.95rem; white-space: nowrap;">Lien iHerb</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 8px 0 0 0;">Lien generique pour retrouver la meilleure option valide.</p>
      </a>
    </div>
  `;
}

async function buildProductLinksHTML(params: {
  ingredientLabel: string;
  ingredientKey: string;
  products: IHerbProduct[];
  searchQuery: string;
}): Promise<string> {
  const { ingredientLabel, ingredientKey, products, searchQuery } = params;
  const query = searchQuery || ingredientLabel;
  const searchLink = buildIherbSearchLink(query);
  if (products.length === 0) {
    return buildSearchFallbackHTML({ ingredientLabel, searchQuery: query, searchLink });
  }

  const resolved = await Promise.all(
    products.map(async (product) => {
      const matches = productMatchesSupplement(ingredientLabel, ingredientKey, product);
      if (!matches) {
        return { product, url: searchLink, valid: false };
      }

      const url = normalizeIherbLink(getIHerbLink(product));
      const ok = await isIherbLinkHealthy(url, { productId: product.productId, slug: product.slug });
      if (!ok) {
        return { product, url: searchLink, valid: false };
      }

      return { product, url, valid: true };
    })
  );

  const validProducts = resolved.filter((entry) => entry.valid);
  if (validProducts.length === 0) {
    return buildSearchFallbackHTML({ ingredientLabel, searchQuery: query, searchLink });
  }

  const linksHTML = validProducts.map((entry, pIdx) => {
    const product = entry.product;
    const badgeText = pIdx === 0 ? "MON CHOIX" : pIdx === 1 ? "ALTERNATIVE" : "BUDGET";
    const badgeColor = pIdx === 0 ? "var(--accent-ok)" : pIdx === 1 ? "var(--primary)" : "var(--accent-warning)";
    return `
      <a href="${entry.url}" target="_blank" rel="noopener noreferrer" style="display: block; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; text-decoration: none; transition: all 0.2s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <span style="background: ${badgeColor}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;">${badgeText}</span>
            <p style="font-size: 1rem; font-weight: 600; color: var(--text); margin: 10px 0 4px 0;">${product.brand}</p>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">${product.name}</p>
          </div>
          <span style="color: var(--primary); font-weight: 700; font-size: 0.95rem; white-space: nowrap;">${product.priceRange}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 8px 0 0 0;">${product.dose} | ${product.count}</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 0 0; font-style: italic;">${product.whyThisOne}</p>
      </a>
    `;
  }).join("");

  return `
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border);">
      <h5 style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">
        Mes recommandations iHerb
      </h5>
      ${linksHTML}
    </div>
  `;
}

// Explications humaines detaillees pour chaque supplement
const HUMAN_EXPLANATIONS: Record<string, {
  intro: string;
  whyYou: string;
  howItWorks: string;
  protocol: string;
  labelTips: string;
}> = {
  "magnesium_bisglycinate": {
    intro: "Le magnesium est le mineral le plus sous-estime en supplementation. Plus de 60% de la population est carencee sans le savoir.",
    whyYou: "Tes reponses indiquent des signes classiques de deficit : fatigue, tensions musculaires, sommeil agite, ou stress eleve. Le bisglycinate est la forme la mieux toleree et absorbee, sans effet laxatif.",
    howItWorks: "Le magnesium active plus de 300 reactions enzymatiques dans ton corps. Il calme le systeme nerveux en modulant les recepteurs GABA, detend les muscles, et ameliore la qualite du sommeil profond. Tu sentiras la difference des les premiers jours.",
    protocol: "Commence par 200mg le soir, 1-2h avant le coucher. Apres une semaine, tu peux monter a 300-400mg si besoin. Prends-le quotidiennement, c'est un supplement de fond.",
    labelTips: "Verifie que l'etiquette indique les mg de magnesium ELEMENTAIRE, pas le poids total du sel. 'Magnesium bisglycinate 2000mg' peut ne contenir que 200mg de magnesium reel. Cherche 'elemental magnesium' ou 'magnesium (as bisglycinate)'."
  },
  "glycine": {
    intro: "La glycine est un acide amine discret mais puissant pour le sommeil. C'est l'un des secrets les mieux gardes pour un sommeil profond et reparateur.",
    whyYou: "Tu as mentionne des difficultes de sommeil ou de recuperation. La glycine agit differemment des somniferes : elle abaisse ta temperature corporelle le soir, signal naturel pour l'endormissement.",
    howItWorks: "En prenant 3g avant le coucher, la glycine active les recepteurs du sommeil dans ton cerveau et abaisse ta temperature centrale de 0.3-0.5 degre. Resultat : endormissement plus rapide et plus de temps en sommeil profond (phases 3-4), la ou ton corps se repare vraiment.",
    protocol: "3g de poudre dans un verre d'eau, 30-60 minutes avant le coucher. Le gout est legerement sucre, agreable. Tu peux l'utiliser tous les soirs sans accoutumance.",
    labelTips: "La glycine est simple : cherche 'glycine pure' ou 'L-glycine'. Evite les formules combinees qui diluent le dosage. Une cuillere rase doit donner environ 3g."
  },
  "omega3_epa_dha": {
    intro: "Les omega-3 sont essentiels : ton corps ne peut pas les fabriquer. La majorite des gens en manque cruellement, avec des consequences sur l'humeur, l'inflammation et la sante cardiovasculaire.",
    whyYou: "Ton profil suggere un besoin accru : stress eleve, inflammation, ou simplement une alimentation pauvre en poissons gras. Les omega-3 sont anti-inflammatoires et protecteurs a tous les niveaux.",
    howItWorks: "L'EPA reduit l'inflammation systemique et stabilise l'humeur. Le DHA nourrit ton cerveau (60% de graisse). Ensemble, ils fluidifient le sang, protegent le coeur, et ameliorent la sensibilite a l'insuline. Les effets sont progressifs sur 4-8 semaines.",
    protocol: "Vise 2-3g d'EPA+DHA par jour (pas 2g d'huile de poisson, mais 2g d'EPA+DHA combines). Prends-les avec un repas gras pour maximiser l'absorption. Divise en 2 prises si tu depasses 2g.",
    labelTips: "IGNORE le '1000mg huile de poisson' en gros sur l'etiquette. Retourne le flacon et cherche EPA + DHA en mg. Additionne-les. Une bonne huile donne 500-700mg EPA+DHA par capsule. Prefere les marques certifiees IFOS (purete testee)."
  },
  "vitamin_d3": {
    intro: "La vitamine D n'est pas vraiment une vitamine, c'est une hormone. Et la carence est epidemique, surtout si tu vis au-dessus du 35e parallele ou travailles en interieur.",
    whyYou: "Statistiquement, tu es probablement en deficit. Les symptomes sont sournois : fatigue diffuse, immunite fragile, humeur en berne l'hiver, douleurs musculaires. Un simple dosage sanguin confirme souvent le probleme.",
    howItWorks: "La D3 regule plus de 1000 genes. Elle module ton systeme immunitaire, maintient tes os solides, influence ta testosterone, et protege contre la depression saisonniere. Avec la K2, elle dirige le calcium vers tes os plutot que tes arteres.",
    protocol: "2000-5000 UI par jour selon ton taux sanguin de depart. Prends-la avec un repas gras (elle est liposoluble). Idealement, fais un dosage sanguin apres 2-3 mois pour ajuster.",
    labelTips: "Prefere la D3 (cholecalciferol) a la D2 (ergocalciferol), beaucoup plus efficace. Les softgels dans l'huile sont mieux absorbes que les comprimes secs. Un combo D3+K2 est ideal."
  },
  "ashwagandha": {
    intro: "L'ashwagandha est l'adaptogene le plus etudie au monde. Utilise depuis 3000 ans en medecine ayurvedique, il est maintenant valide par des dizaines d'etudes cliniques.",
    whyYou: "Ton stress eleve ou ta fatigue chronique en font un candidat ideal. L'ashwagandha ne te shoote pas : il recalibre ton axe du stress (HPA) pour que tu reagisses mieux aux pressions quotidiennes.",
    howItWorks: "Il reduit le cortisol de 25-30% en moyenne, ameliore la qualite du sommeil, et booste la testosterone chez l'homme. Les withanolides (principes actifs) modulent tes recepteurs GABA et ton systeme endocrinien. Effets perceptibles en 2-4 semaines.",
    protocol: "300-600mg d'extrait standardise par jour. Commence par 300mg le soir (effet calmant). Tu peux augmenter ou diviser en 2 prises. Cycle recommande : 8-12 semaines ON, 2-4 semaines OFF.",
    labelTips: "CRUCIAL : cherche 'KSM-66' ou 'Sensoril', les deux extraits brevetes les plus etudies. Verifie le % de withanolides (minimum 5% pour KSM-66). Evite les poudres de racine brute non standardisees."
  },
  "l_theanine": {
    intro: "La L-theanine est l'acide amine qui donne au the vert son effet 'calme mais alerte'. C'est le perfect chill sans la somnolence.",
    whyYou: "Si tu ressens de l'anxiete, des ruminations, ou si tu veux un focus calme sans les effets secondaires des stimulants, la theanine est faite pour toi.",
    howItWorks: "Elle traverse la barriere hemato-encephalique et booste les ondes alpha cerebrales (celles de la meditation). Elle augmente GABA, dopamine et serotonine sans sédation. Combine au cafe, elle elimine les jitters tout en gardant le focus.",
    protocol: "100-200mg selon besoin. Tu peux la prendre le matin avec ton cafe (synergie prouvee), ou le soir pour calmer l'esprit avant le coucher. Pas de tolerance, pas de dependance.",
    labelTips: "Cherche 'Suntheanine', la forme brevete de L-theanine pure. Evite les melanges qui cachent le dosage reel. 200mg est la dose standard des etudes."
  },
  "creatine_monohydrate": {
    intro: "La creatine n'est pas juste pour les bodybuilders. C'est le supplement le plus etudie au monde, avec des benefices prouves sur le cerveau, les muscles, et meme le vieillissement.",
    whyYou: "Tu t'entraines et tu veux progresser ? La creatine augmente ta force et ta puissance de 5-15%. Mais aussi : meilleure cognition sous stress, recuperation acceleree, et protection neurologique.",
    howItWorks: "Elle recharge l'ATP, la monnaie energetique de tes cellules. Plus d'ATP = plus de repetitions, sprints plus puissants, et cerveau qui tourne mieux sous pression. Les effets musculaires apparaissent en 2-4 semaines.",
    protocol: "5g par jour, tous les jours, point final. Pas besoin de phase de charge. Pas besoin de cycler. Le timing importe peu. Melange dans n'importe quel liquide.",
    labelTips: "Monohydrate = la forme de reference, la plus etudiee. 'Creapure' est le gold standard (fabrication allemande pure). Evite les formes fancy (HCL, ethyl ester) : marketing sans benefice prouve."
  },
  "zinc": {
    intro: "Le zinc est implique dans plus de 300 reactions enzymatiques. Crucial pour l'immunite, la testosterone, la peau, et la cicatrisation.",
    whyYou: "Les athletes, les stresses, et ceux qui transpirent beaucoup perdent du zinc. Les vegetariens sont souvent carences. Tes symptomes potentiels : immunite fragile, libido en baisse, cicatrisation lente.",
    howItWorks: "Il soutient la production de testosterone, renforce les defenses immunitaires (premiere ligne contre les virus), et accelere la reparation tissulaire. Effet perceptible sur l'immunite en quelques semaines.",
    protocol: "15-30mg par jour avec un repas. ATTENTION : le zinc a long terme peut desequilibrer le cuivre. Prefere une formule zinc + cuivre (ratio 15:1) pour un usage prolonge.",
    labelTips: "Formes bien absorbees : picolinate, bisglycinate, citrate. Evite l'oxyde de zinc (absorption mediocre). Verifie que le dosage est en zinc ELEMENTAIRE."
  },
  "coq10": {
    intro: "La CoQ10 est le carburant de tes mitochondries, les centrales energetiques de chaque cellule. Apres 40 ans, ta production naturelle chute.",
    whyYou: "Fatigue persistante, prise de statines, ou simplement envie d'optimiser ton energie cellulaire ? La CoQ10 est ton alliee.",
    howItWorks: "Elle participe directement a la chaine de transport des electrons qui produit l'ATP. Plus de CoQ10 = mitochondries plus efficaces = plus d'energie, meilleure recuperation, protection cardiovasculaire.",
    protocol: "100-200mg par jour avec un repas gras. Prefere l'ubiquinol (forme reduite) si tu as plus de 40 ans, sinon l'ubiquinone convient.",
    labelTips: "Ubiquinol = forme active, mieux absorbee (surtout apres 40 ans). Ubiquinone = forme classique, moins chere. Les softgels dans l'huile sont superieurs aux poudres seches."
  }
};

/**
 * Generates enhanced HTML for supplements section with detailed human explanations
 * and real iHerb affiliate product links.
 */
export async function generateEnhancedSupplementsHTML(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
  firstName?: string;
}): Promise<string> {
  const responses = input.responses || {};
  const firstName = input.firstName || "Profil";
  const meds = [
    ...toStringArray(responses["medicaments"]),
    ...toStringArray(responses["medications"]),
  ];

  const baseScore =
    typeof input.globalScore === "number" && Number.isFinite(input.globalScore)
      ? Math.max(30, Math.min(90, input.globalScore))
      : 55;

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

  if (picked.length === 0) {
    return `
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 32px; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text); margin-bottom: 16px;">
          <strong>${firstName}</strong>, ton profil actuel ne necessite pas de stack avancee.
        </p>
        <p style="font-size: 1rem; color: var(--text-secondary); line-height: 1.7;">
          Concentre-toi sur les fondations pendant les 14 prochains jours : sommeil de qualite (7-8h),
          apport proteique adequat (1.6-2g/kg), hydratation optimale (35ml/kg), et entrainement regulier.
          Une fois ces bases solides, je reevaluerai ta stack.
        </p>
      </div>
    `;
  }

  // Generate supplement sections
  const supplementSections = (await Promise.all(picked.slice(0, 6).map(async (supp, idx) => {
    const ingredientKey = normalizeIngredientKey(supp.ingredient || "");
    const iherbKey = INGREDIENT_TO_IHERB_KEY[ingredientKey] || ingredientKey;
    const products = IHERB_PRODUCTS[iherbKey] || [];
    const explanation = HUMAN_EXPLANATIONS[iherbKey];

    const evidenceColor = supp.evidence_grade === "A" ? "var(--accent-ok)" :
                          supp.evidence_grade === "B" ? "var(--primary)" :
                          supp.evidence_grade === "C" ? "var(--accent-warning)" : "var(--text-muted)";

    // Product links HTML with validation + fallback
    const productLinksHTML = await buildProductLinksHTML({
      ingredientLabel: supp.ingredient,
      ingredientKey: iherbKey,
      products,
      searchQuery: supp.iherb_search_query || supp.ingredient,
    });

    return `
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 24px;">

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div>
            <span style="background: var(--primary); color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">#${idx + 1}</span>
            <h4 style="font-size: 1.4rem; font-weight: 700; color: var(--text); margin: 12px 0 4px 0;">${supp.ingredient}</h4>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">${supp.form}</p>
          </div>
          <span style="background: ${evidenceColor}; color: white; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;">GRADE ${supp.evidence_grade}</span>
        </div>

        <!-- Introduction -->
        ${explanation ? `
        <p style="font-size: 1.05rem; color: var(--text); line-height: 1.7; margin-bottom: 20px;">
          ${explanation.intro}
        </p>
        ` : ""}

        <!-- Pourquoi toi -->
        ${explanation ? `
        <div style="background: linear-gradient(135deg, rgba(94, 234, 212, 0.08) 0%, rgba(94, 234, 212, 0.02) 100%); border-left: 3px solid var(--primary); padding: 16px 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
          <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--primary); margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Pourquoi pour toi, ${firstName} ?</h5>
          <p style="font-size: 1rem; color: var(--text); line-height: 1.7; margin: 0;">${explanation.whyYou}</p>
        </div>
        ` : ""}

        <!-- Comment ca marche -->
        ${explanation ? `
        <div style="margin-bottom: 20px;">
          <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--text); margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Comment ca fonctionne</h5>
          <p style="font-size: 1rem; color: var(--text-secondary); line-height: 1.7; margin: 0;">${explanation.howItWorks}</p>
        </div>
        ` : ""}

        <!-- Protocole -->
        <div style="background: var(--surface-2); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--text); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Ton protocole</h5>
          ${explanation ? `
          <p style="font-size: 1rem; color: var(--text); line-height: 1.7; margin: 0 0 16px 0;">${explanation.protocol}</p>
          ` : ""}
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div style="background: var(--surface-1); border-radius: 8px; padding: 12px;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-ok); text-transform: uppercase;">Dosage</span>
              <p style="font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 6px 0 0 0;">${supp.dose.daily_amount} ${supp.dose.units}</p>
            </div>
            <div style="background: var(--surface-1); border-radius: 8px; padding: 12px;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">Timing</span>
              <p style="font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 6px 0 0 0;">${supp.timing}</p>
            </div>
            <div style="background: var(--surface-1); border-radius: 8px; padding: 12px;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--secondary); text-transform: uppercase;">Cycle</span>
              <p style="font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 6px 0 0 0;">${supp.cycle}</p>
            </div>
            <div style="background: var(--surface-1); border-radius: 8px; padding: 12px;">
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-warning); text-transform: uppercase;">Ajustement</span>
              <p style="font-size: 0.85rem; color: var(--text); margin: 6px 0 0 0;">${supp.dose.scaling_note}</p>
            </div>
          </div>
        </div>

        <!-- Comment choisir -->
        ${explanation ? `
        <div style="background: rgba(159, 140, 255, 0.08); border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
          <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--secondary); margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Comment lire l'etiquette</h5>
          <p style="font-size: 0.95rem; color: var(--text); line-height: 1.6; margin: 0;">${explanation.labelTips}</p>
        </div>
        ` : ""}

        <!-- Synergies et risques -->
        ${supp.synergies.length > 0 ? `
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">
          <strong style="color: var(--accent-ok);">Synergies :</strong> ${supp.synergies.join(", ")}
        </p>
        ` : ""}

        ${supp.risks.length > 0 && supp.risks[0] !== "Aucun notable" ? `
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">
          <strong style="color: var(--accent-warning);">A surveiller :</strong> ${supp.risks.join(" | ")}
        </p>
        ` : ""}

        <!-- Product Links -->
        ${productLinksHTML}

      </div>
    `;
  }))).join("");

  // Safety warning for medications
  const safetyHTML = meds.length > 0 ? `
    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 28px;">
      <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--accent-warning); margin: 0 0 12px 0;">Note importante : Medicaments declares</h4>
      <p style="font-size: 1rem; color: var(--text); margin: 0 0 8px 0;"><strong>Tes medicaments :</strong> ${meds.join(", ")}</p>
      <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 0; line-height: 1.6;">
        J'ai filtre les supplements qui pourraient interagir avec tes traitements.
        Cependant, consulte toujours ton medecin ou pharmacien avant d'ajouter un nouveau supplement a ta routine.
      </p>
    </div>
  ` : "";

  // Introduction protocol
  const introProtocolHTML = `
    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 28px;">
      <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0 0 16px 0;">Comment introduire ta stack</h4>
      <p style="font-size: 1rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px;">
        N'introduis JAMAIS tous les supplements en meme temps. Si tu as une reaction, tu ne sauras pas lequel est en cause.
        Voici la methode intelligente :
      </p>
      <div style="display: grid; gap: 14px;">
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">1</span>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text); line-height: 1.5;"><strong>Semaine 1-2 :</strong> Commence par UN seul supplement (je recommande le magnesium ou la vitamine D)</p>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">2</span>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text); line-height: 1.5;"><strong>Toutes les 4-5 jours :</strong> Ajoute un nouveau supplement si tu toleres bien le precedent</p>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">3</span>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text); line-height: 1.5;"><strong>Tiens un journal :</strong> Note energie, sommeil, digestion, humeur chaque jour pendant l'introduction</p>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 14px;">
          <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">4</span>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text); line-height: 1.5;"><strong>Reevalue a 6 semaines :</strong> Ajuste les dosages, elimine ce qui n'apporte rien de perceptible</p>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="supplements-section">
      ${safetyHTML}
      ${introProtocolHTML}
      <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--text); margin: 0 0 24px 0;">Ta stack personnalisee</h3>
      ${supplementSections}
    </div>
  `;
}

export function generateSupplementsSectionText(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
  firstName?: string;
}): string {
  const responses = input.responses || {};
  const firstName = input.firstName || "Profil";
  const meds = [
    ...toStringArray(responses["medicaments"]),
    ...toStringArray(responses["medications"]),
  ];

  const baseScore =
    typeof input.globalScore === "number" && Number.isFinite(input.globalScore)
      ? Math.max(30, Math.min(90, input.globalScore))
      : 55;

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

  const paragraphs: string[] = [];

  paragraphs.push(
    `${firstName}, cette section est differente des autres. Ici, je ne te balance pas une liste de produits. Je veux que tu comprennes pourquoi chaque supplement est la, comment il agit dans ton corps, et comment choisir une qualite reelle parmi les centaines d options.`
  );
  paragraphs.push(
    "La supplementation intelligente repose sur trois choses simples: comprendre le role de chaque produit, savoir lire une etiquette, et introduire progressivement pour isoler ce qui fonctionne vraiment pour toi."
  );
  paragraphs.push(
    "Je veux que tu introduises les supplements progressivement. Commence par un seul pendant 7 a 10 jours, observe ton energie, ton sommeil et ta digestion, puis ajoute le suivant si tout est stable. Cette methode te donne un feedback clair et evite les reactions difficiles a attribuer."
  );

  if (meds.length > 0) {
    paragraphs.push(
      `Tu as indique des traitements en cours (${meds.join(", ")}). J'ai filtre les interactions evidentes, mais je veux une validation par ton medecin ou pharmacien avant toute introduction. Certaines interactions dependent du dosage exact.`
    );
  }

  if (picked.length === 0) {
    paragraphs.push(
      `${firstName}, ton profil actuel ne necessite pas de stack avancee. Concentre-toi d abord sur les fondations pendant 14 jours: sommeil regulier, apport proteique solide, hydratation stable, et entrainement progressif. Une fois ces bases stabilisees, je reevaluerai la stack.`
    );
    return normalizeSingleVoice(paragraphs.join("\n\n"));
  }

  picked.slice(0, 6).forEach((supp) => {
    const ingredientKey = normalizeIngredientKey(supp.ingredient || "");
    const iherbKey = INGREDIENT_TO_IHERB_KEY[ingredientKey] || ingredientKey;
    const explanation = HUMAN_EXPLANATIONS[iherbKey];

    const intro = explanation?.intro || `Je selectionne ${supp.ingredient} pour son impact direct sur tes priorites.`;
    const whyYou = explanation?.whyYou ? `Pour toi, ${explanation.whyYou}` : "";
    const mechanism = explanation?.howItWorks || supp.mechanism;
    const protocol = explanation?.protocol || "";
    const labelTips =
      explanation?.labelTips ||
      "Je veux un produit transparent sur le dosage elementaire et la forme exacte, sans melange proprietaire flou.";
    const checks = supp.label_checks?.length ? `Points a verifier sur l etiquette: ${supp.label_checks.join(", ")}.` : "";
    const risks = supp.risks?.length && supp.risks[0] !== "Aucun notable"
      ? `Precautions importantes: ${supp.risks.join("; ")}.`
      : "";
    const synergies = supp.synergies?.length ? `Synergies utiles: ${supp.synergies.join(", ")}.` : "";

    paragraphs.push(
      `Pour ${supp.ingredient}, je vise la forme ${supp.form}. ${intro} ${whyYou}`.trim()
    );
    paragraphs.push(
      `Mecanisme cle: ${mechanism}`
    );
    paragraphs.push(
      `Protocole concret: ${protocol ? `${protocol} ` : ""}Dose ${supp.dose.daily_amount} ${supp.dose.units} par jour, ${supp.dose.split}. Prends le ${supp.timing}. Cycle ${supp.cycle}. ${supp.dose.scaling_note ? `${supp.dose.scaling_note}.` : ""}`.trim()
    );
    paragraphs.push(
      `Qualite du produit: ${labelTips} ${checks} ${synergies} ${risks}`.trim()
    );
  });

  const budgetLow = picked.length * 15;
  const budgetHigh = picked.length * 35;
  paragraphs.push(
    `Pour le budget, vise une fourchette d environ ${budgetLow} a ${budgetHigh} EUR par mois pour ${picked.length} supplements. Acheter des formats 90 a 180 gelules reduit le cout par dose sans baisser la qualite.`
  );

  return normalizeSingleVoice(paragraphs.join("\n\n"));
}

export function generateSupplementStack(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
}): Array<{
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands: string[];
  warnings: string;
  evidence: string;
}> {
  const responses = input.responses || {};
  const meds = [
    ...toStringArray(responses["medicaments"]),
    ...toStringArray(responses["medications"]),
  ];

  const baseScore =
    typeof input.globalScore === "number" && Number.isFinite(input.globalScore)
      ? Math.max(30, Math.min(90, input.globalScore))
      : 55;

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

  return picked.slice(0, 6).map(formatSupplementForReport);
}
