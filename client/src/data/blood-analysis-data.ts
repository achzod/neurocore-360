export interface Biomarker {
    id: string;
    name: string;
    value: number;
    unit: string;
    category: "Hormonal" | "Metabolic" | "Inflammation" | "Liver" | "Kidney" | "Blood";
    status: "Optimal" | "Normal" | "Suboptimal" | "Critical";
    optimalRange: [number, number];
    normalRange: [number, number];
    definition: string;
    whyItMatters: string;
    recommendation?: string;
    reference?: string;
    history: { date: string; value: number }[];
}

export const SCIENCE_DATA: Record<string, Biomarker> = {
    total_testosterone: {
        id: "total_testosterone",
        name: "Total Testosterone",
        value: 450,
        unit: "ng/dL",
        category: "Hormonal",
        status: "Suboptimal",
        optimalRange: [600, 900],
        normalRange: [300, 1000],
        definition: "Primary male sex hormone responsible for muscle mass, bone density, libido, and mood.",
        whyItMatters: "Low levels are linked to fatigue, depression, and metabolic syndrome. Optimization is key for vitality.",
        recommendation: "Increase heavy compound lifting, optimize sleep (7h+), consider Tongkat Ali 400mg.",
        reference: "Huberman Lab Ep. 14",
        history: [
            { date: "Jan 24", value: 410 },
            { date: "Jun 24", value: 430 },
            { date: "Oct 24", value: 450 },
        ],
    },
    free_testosterone: {
        id: "free_testosterone",
        name: "Free Testosterone",
        value: 9,
        unit: "pg/mL",
        category: "Hormonal",
        status: "Suboptimal",
        optimalRange: [15, 25],
        normalRange: [9, 30],
        definition: "The biologically active fraction of testosterone, unbound to SHBG or Albumin.",
        whyItMatters: "More predictive of symptoms than Total T. High SHBG can mask normal Total T with low Free T.",
        recommendation: "Supplement with Boron (6mg) to lower SHBG and free up testosterone.",
        reference: "Applied Metabolics Vol 22",
        history: [
            { date: "Jan 24", value: 8 },
            { date: "Jun 24", value: 8.5 },
            { date: "Oct 24", value: 9 },
        ],
    },
    crp: {
        id: "crp",
        name: "hs-CRP",
        value: 1.1,
        unit: "mg/L",
        category: "Inflammation",
        status: "Normal",
        optimalRange: [0, 0.5],
        normalRange: [0, 3],
        definition: "High-sensitivity C-Reactive Protein, a marker of systemic inflammation.",
        whyItMatters: "Chronic low-grade inflammation is a root cause of cardiovascular disease and insulin resistance.",
        recommendation: "Increase Omega-3 intake (2g EPA/DHA), reduce processed sugars.",
        reference: "Dr. Peter Attia - The Drive",
        history: [
            { date: "Jan 24", value: 4.2 },
            { date: "Jun 24", value: 2.8 },
            { date: "Oct 24", value: 1.1 },
        ],
    },
    vitamin_d: {
        id: "vitamin_d",
        name: "Vitamin D3",
        value: 45,
        unit: "ng/mL",
        category: "Metabolic",
        status: "Normal",
        optimalRange: [50, 80],
        normalRange: [30, 100],
        definition: "Steroid hormone precursor regulating calcium, immune function, and gene expression.",
        whyItMatters: "Critical for hormonal synthesis and immune defense. Most people are suboptimal.",
        recommendation: "Sun exposure 20m/day or Supplement 5000IU + K2.",
        reference: "Rhonda Patrick - FoundMyFitness",
        history: [
            { date: "Jan 24", value: 25 },
            { date: "Jun 24", value: 32 },
            { date: "Oct 24", value: 45 },
        ],
    },
    hba1c: {
        id: "hba1c",
        name: "HbA1c",
        value: 5.2,
        unit: "%",
        category: "Metabolic",
        status: "Optimal",
        optimalRange: [4.5, 5.3],
        normalRange: [4.0, 5.7],
        definition: "Glycated hemoglobin, representing average blood sugar over the last 3 months.",
        whyItMatters: "Gold standard for long-term glucose control. Lower is generally better for longevity.",
        recommendation: "Maintain low-GI diet and resistance training.",
        reference: "Outlive - Peter Attia",
        history: [
            { date: "Jan 24", value: 5.4 },
            { date: "Jun 24", value: 5.3 },
            { date: "Oct 24", value: 5.2 },
        ],
    },
    apo_b: {
        id: "apo_b",
        name: "ApoB",
        value: 95,
        unit: "mg/dL",
        category: "Blood",
        status: "Suboptimal",
        optimalRange: [40, 80],
        normalRange: [60, 110],
        definition: "Apolipoprotein B, the primary protein on atherogenic particles (LDL, VLDL).",
        whyItMatters: "Superior to LDL-C for predicting cardiovascular risk.",
        recommendation: "Reduce saturated fats, increase fiber, check familial history.",
        reference: "Dayspring & Attia Lipidology",
        history: [
            { date: "Jan 24", value: 110 },
            { date: "Jun 24", value: 102 },
            { date: "Oct 24", value: 95 },
        ],
    },
};

export const CATEGORY_SCORES = {
    Hormonal: 65,
    Metabolic: 82,
    Inflammation: 78,
    Liver: 90,
    Kidney: 88,
    Blood: 70,
};

export const PROTOCOLS = [
    {
        time: "Morning",
        items: [
            { name: "Sunlight View", dose: "10-20 mins", reason: "Circadian entrainment (Huberman)" },
            { name: "Vitamin D3 + K2", dose: "5000 IU", reason: "Immune & Hormonal Support" },
            { name: "Hydration", dose: "500ml + Salt", reason: "Blood volume & Adrenals" },
        ],
    },
    {
        time: "Pre-Workout",
        items: [
            { name: "L-Citrulline", dose: "6g", reason: "Blood flow & Pumps" },
            { name: "Creatine", dose: "5g", reason: "ATP & Cognitive function" },
        ],
    },
    {
        time: "Evening",
        items: [
            { name: "Magnesium Bisglycinate", dose: "400mg", reason: "Sleep Architecture & Nervous System" },
            { name: "Blue Light Block", dose: "1hr pre-bed", reason: "Melatonin preservation" },
        ],
    },
];
