export type BiomarkerDetail = {
  definition: string;
  mechanism: string;
  impact: string;
  protocol: string[];
  citations: Array<{ title: string; url: string }>;
};

export const BIOMARKER_DETAILS: Record<string, BiomarkerDetail> = {
  testosterone_total: {
    definition:
      "Hormone steroïdienne produite principalement par les testicules. Elle pilote la masse musculaire, la libido, la densite osseuse et l'energie.",
    mechanism:
      "Des valeurs basses signalent souvent stress chronique, manque de sommeil, deficit calorique prolonge ou faible apport en lipides. Des valeurs hautes sans contexte clinique doivent etre verifiees.",
    impact:
      "Sous 500 ng/dL, la progression musculaire ralentit et la recuperation devient moins efficace. Au-dessus de 600, l'anabolisme est plus favorable.",
    protocol: [
      "Sommeil 7h30-8h30 (priorite #1).",
      "Vitamine D3 4000-5000 UI le matin.",
      "Zinc bisglycinate 25-30 mg le soir.",
      "Ashwagandha KSM-66 600 mg le soir (8-12 semaines).",
      "Deficit calorique max 15-20% si recomposition.",
    ],
    citations: [
      {
        title: "Sleep restriction reduces testosterone (JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
      },
    ],
  },
  testosterone_libre: {
    definition:
      "Fraction biologiquement active de la testosterone, non liee a la SHBG. C'est la partie qui agit directement sur tes tissus.",
    mechanism:
      "Quand la SHBG monte, la testosterone libre baisse. L'inflammation et l'insulino-resistance jouent souvent un role.",
    impact:
      "Une testosterone libre basse se traduit par fatigue, baisse de force et libido en berne.",
    protocol: [
      "Sommeil profond + gestion du stress.",
      "Apport proteique 1.6-2.2 g/kg.",
      "Zinc 25-30 mg le soir + magnesium 300-400 mg.",
    ],
    citations: [
      {
        title: "SHBG, testosterone and metabolic risk (JCEM, 2006)",
        url: "https://pubmed.ncbi.nlm.nih.gov/16434431/",
      },
    ],
  },
  shbg: {
    definition:
      "Proteine qui transporte la testosterone et l'estradiol. Plus la SHBG est haute, moins la testosterone libre est disponible.",
    mechanism:
      "SHBG elevee peut refleter deficit calorique, hyperthyroidie ou inflammation metabolique.",
    impact:
      "SHBG haute = moins de testosterone active, donc energie et gains musculaires freines.",
    protocol: [
      "Augmenter l'apport calorique si deficit trop agressif.",
      "Stabiliser la glycemie et la thyroide.",
      "Reduction de l'alcool et du stress chronique.",
    ],
    citations: [
      {
        title: "SHBG and metabolic health (Diabetes Care, 2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22210591/",
      },
    ],
  },
  estradiol: {
    definition:
      "Hormone cle de la regulation hormonale masculine et feminine. Indispensable pour la sante osseuse et la libido.",
    mechanism:
      "Trop bas = rigidite, libido basse; trop haut = retention, fatigue, libido instable.",
    impact:
      "Un estradiol stable garantit une meilleure recuperation et un bon rapport force/masse grasse.",
    protocol: [
      "Equilibrer masse grasse (trop elevee = aromatisation).",
      "Prioriser sommeil et omega-3.",
      "Limiter alcool et sucres rapides.",
    ],
    citations: [
      {
        title: "Estradiol and male physiology (NEJM, 2013)",
        url: "https://pubmed.ncbi.nlm.nih.gov/24369037/",
      },
    ],
  },
  cortisol: {
    definition:
      "Hormone de stress produite par les surrenales, essentielle le matin mais toxique quand elle reste elevee toute la journee.",
    mechanism:
      "Stress chronique, manque de sommeil et surentrainement elevant le cortisol et freinent l'anabolisme.",
    impact:
      "Cortisol eleve = catabolisme, stockage abdominal, recuperation lente.",
    protocol: [
      "Sommeil 7h30-8h30 non negociable.",
      "NSDR ou respiration 10-15 min/jour.",
      "Magnesium glycinate 300-400 mg le soir.",
      "Limiter cafeine apres 14h.",
    ],
    citations: [
      {
        title: "Cortisol, stress, and metabolic risk (Psychoneuroendocrinology, 2005)",
        url: "https://pubmed.ncbi.nlm.nih.gov/16084067/",
      },
    ],
  },
  igf1: {
    definition:
      "Mediateur anabolique lie a l'hormone de croissance. Il influence directement la synthese proteique et la recuperation.",
    mechanism:
      "IGF-1 bas est souvent lie a un sommeil degrade, un faible apport proteique ou un stress chronique.",
    impact:
      "IGF-1 faible = progression musculaire lente et recuperation incomplète.",
    protocol: [
      "Sommeil profond + timing des glucides apres entrainement.",
      "Proteines 1.6-2.2 g/kg.",
      "Entrainement lourd + jours de repos planifies.",
    ],
    citations: [
      {
        title: "IGF-1 and muscle adaptation (Sports Med, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067407/",
      },
    ],
  },
  tsh: {
    definition:
      "Hormone de l'hypophyse qui commande la thyroide. Elle indique si la thyroide compense ou non.",
    mechanism:
      "TSH elevee = thyroide qui force. TSH trop basse = suractivation ou suppression.",
    impact:
      "Thyroide ralentie = metabolismes lents, fatigue, prise de gras.",
    protocol: [
      "Optimiser sommeil et apport iode/selenium.",
      "Verifier l'equilibre T3/T4.",
      "Reduire inflammation systemique.",
    ],
    citations: [
      {
        title: "TSH and metabolic regulation (Thyroid, 2014)",
        url: "https://pubmed.ncbi.nlm.nih.gov/24274126/",
      },
    ],
  },
  t3_libre: {
    definition:
      "Hormone thyroidienne active qui pilote la depense energetique et la thermogenese.",
    mechanism:
      "Conversion T4 -> T3 diminuee par stress, deficit calorique, inflammation.",
    impact:
      "T3 basse = fatigue et difficulte a perdre du gras.",
    protocol: [
      "Augmenter calories si restriction aggressive.",
      "Vitamine D + selenium (selon bilan).",
      "Optimiser sommeil et gestion du stress.",
    ],
    citations: [
      {
        title: "T3 and energy expenditure (Endocr Rev, 2016)",
        url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
      },
    ],
  },
  glycemie_jeun: {
    definition:
      "Mesure du sucre sanguin a jeun. C'est un marqueur direct de ta sensibilite a l'insuline.",
    mechanism:
      "Une glycemie elevee signale souvent surcharge glucidique, stress chronique ou sommeil insuffisant.",
    impact:
      "Glycemie elevee = stockage plus facile et energie instable.",
    protocol: [
      "Marche 10-15 min apres repas.",
      "Proteines + fibres a chaque repas.",
      "Reduire sucres rapides et alcool.",
    ],
    citations: [
      {
        title: "Fasting glucose and cardiometabolic risk (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
    ],
  },
  hba1c: {
    definition:
      "Moyenne de la glycemie sur 8-12 semaines. Indicateur cle du risque prediabete.",
    mechanism:
      "HbA1c elevee = exposition chronique au glucose et inflammation metabolique.",
    impact:
      "Au-dessus de 5.6%, la perte de gras est plus lente et l'energie chute.",
    protocol: [
      "Deficit calorique modere + steps quotidiens 8-10k.",
      "Glucides complexes, eviter sucres liquides.",
      "Renforcement musculaire 3-4x/semaine.",
    ],
    citations: [
      {
        title: "HbA1c and long-term outcomes (Diabetes Care, 2010)",
        url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
      },
    ],
  },
  insuline_jeun: {
    definition:
      "Insuline mesuree a jeun. Plus elle est haute, moins ton corps repond efficacement.",
    mechanism:
      "Insuline elevee = resistance insulinique et stockage accelere.",
    impact:
      "Insuline haute = difficulte a perdre du gras et fatigue post-repas.",
    protocol: [
      "Reduire snacks et grignotage.",
      "Augmenter masse musculaire.",
      "Berberine 500 mg x2 (8-12 semaines).",
    ],
    citations: [
      {
        title: "Insulin resistance and performance (Diabetes Care, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
      },
    ],
  },
  homa_ir: {
    definition:
      "Index combine glycemie + insuline. C'est un thermometre de la resistance insulinique.",
    mechanism:
      "HOMA eleve = stockage facile et inflammation metabolique.",
    impact:
      "HOMA eleve = baisse de la recomposition corporelle.",
    protocol: [
      "Deficit calorique modere + training structurant.",
      "Fenetre alimentaire plus stricte (12-14h de jeune nocturne).",
      "Omega-3 2-3 g/jour.",
    ],
    citations: [
      {
        title: "HOMA-IR and cardiometabolic risk (Diabetes Care, 2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
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
