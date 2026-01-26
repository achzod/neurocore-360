export const BLOOD_PANEL_CITATIONS: Record<
  string,
  Array<{ title: string; url: string }>
> = {
  hormonal: [
    {
      title: "Sleep restriction reduces testosterone (JAMA, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21632481/",
    },
    {
      title: "Dietary fat intake and testosterone (J Appl Physiol, 1997)",
      url: "https://pubmed.ncbi.nlm.nih.gov/9124069/",
    },
  ],
  thyroid: [
    {
      title: "Thyroid function and metabolic rate (Endocr Rev, 2016)",
      url: "https://pubmed.ncbi.nlm.nih.gov/26836627/",
    },
    {
      title: "T3, T4 conversion and energy balance (Clin Endocrinol, 2012)",
      url: "https://pubmed.ncbi.nlm.nih.gov/22281546/",
    },
  ],
  metabolic: [
    {
      title: "HbA1c and cardiometabolic risk (Diabetes Care, 2010)",
      url: "https://pubmed.ncbi.nlm.nih.gov/20067979/",
    },
    {
      title: "Triglycerides/HDL ratio and insulin resistance (Clin Chem, 2008)",
      url: "https://pubmed.ncbi.nlm.nih.gov/18633100/",
    },
  ],
  inflammatory: [
    {
      title: "hs-CRP as inflammatory predictor (Circulation, 2002)",
      url: "https://pubmed.ncbi.nlm.nih.gov/12187352/",
    },
    {
      title: "Homocysteine and vascular risk (NEJM, 2002)",
      url: "https://pubmed.ncbi.nlm.nih.gov/11794172/",
    },
  ],
  vitamins: [
    {
      title: "Vitamin D status and muscle function (J Clin Endocrinol Metab, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21307127/",
    },
    {
      title: "Magnesium status and performance (Nutrients, 2017)",
      url: "https://pubmed.ncbi.nlm.nih.gov/28353696/",
    },
  ],
  liver_kidney: [
    {
      title: "ALT/AST and metabolic risk (Hepatology, 2011)",
      url: "https://pubmed.ncbi.nlm.nih.gov/21319192/",
    },
    {
      title: "eGFR and cardiovascular outcomes (JASN, 2010)",
      url: "https://pubmed.ncbi.nlm.nih.gov/20056756/",
    },
  ],
};
