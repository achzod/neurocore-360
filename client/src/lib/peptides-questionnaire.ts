/**
 * Peptides Engine ,  Questionnaire Definitions
 * Questionnaire across 6 sections with conditional logic
 */

export interface PeptidesQuestion {
  id: string;
  sectionId: string;
  type: "text" | "email" | "number" | "select" | "checkbox" | "textarea" | "scale";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  conditionalOn?: string; // Show only if this question has a certain answer
  min?: number;
  max?: number;
}

export interface PeptidesSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export const PEPTIDES_SECTIONS: PeptidesSection[] = [
  { id: "profil", title: "Profil & Experience", subtitle: "Qui es-tu et quel est ton niveau", icon: "User" },
  { id: "objectifs", title: "Objectifs", subtitle: "Qu'est-ce que tu veux optimiser", icon: "Target" },
  { id: "sante", title: "Sante & Contraindications", subtitle: "Ta sante actuelle et tes antecedents", icon: "Shield" },
  { id: "pratique", title: "Pratique & Logistique", subtitle: "Tes contraintes au quotidien", icon: "Settings" },
  { id: "stack", title: "Stack Actuel", subtitle: "Ce que tu prends deja", icon: "Layers" },
  { id: "attentes", title: "Attentes & Engagement", subtitle: "Ton niveau d'engagement", icon: "CheckCircle" },
];

export const PEPTIDES_QUESTIONS: PeptidesQuestion[] = [
  // === SECTION 1: PROFIL ===
  { id: "pep_name", sectionId: "profil", type: "text", label: "Prenom", required: true, placeholder: "Ton prenom" },
  { id: "pep_email", sectionId: "profil", type: "email", label: "Email", required: true, placeholder: "ton@email.com" },
  { id: "pep_age", sectionId: "profil", type: "number", label: "Age", required: true, min: 18, max: 70 },
  { id: "pep_weight", sectionId: "profil", type: "number", label: "Poids (kg)", required: true, min: 40, max: 200 },
  { id: "pep_height", sectionId: "profil", type: "number", label: "Taille (cm)", required: true, min: 140, max: 220 },
  { id: "pep_bf", sectionId: "profil", type: "select", label: "Taux de masse grasse estime", options: [
    { value: "under-10", label: "< 10%" },
    { value: "10-15", label: "10-15%" },
    { value: "15-20", label: "15-20%" },
    { value: "20-25", label: "20-25%" },
    { value: "25-30", label: "25-30%" },
    { value: "over-30", label: "> 30%" },
    { value: "unknown", label: "Je ne sais pas" },
  ]},
  { id: "pep_experience", sectionId: "profil", type: "select", label: "Experience avec les peptides", required: true, options: [
    { value: "none", label: "Aucune ,  debutant total" },
    { value: "read", label: "J'ai lu/regarde du contenu" },
    { value: "tried", label: "J'ai deja utilise 1-2 peptides" },
    { value: "regular", label: "Utilisateur regulier (3+ peptides)" },
    { value: "advanced", label: "Avance (stacks complexes)" },
  ]},

  // === SECTION 2: OBJECTIFS ===
  { id: "pep_primary_goal", sectionId: "objectifs", type: "select", label: "Objectif principal", required: true, options: [
    { value: "recovery", label: "Recuperation & guerison (tendons, articulations, blessure)" },
    { value: "gh-antiaging", label: "GH / Anti-aging (hormone de croissance, longevite)" },
    { value: "fatloss", label: "Perte de graisse" },
    { value: "sleep", label: "Sommeil profond" },
    { value: "cognitive", label: "Performance cognitive (focus, memoire)" },
    { value: "libido", label: "Libido / performance sexuelle" },
    { value: "testo-boost", label: "Booster ma testosterone naturellement (alternative TRT)" },
    { value: "skin-hair", label: "Peau / cheveux / anti-age" },
    { value: "endurance", label: "Endurance / cardio" },
  ]},
  { id: "pep_secondary_goals", sectionId: "objectifs", type: "checkbox", label: "Objectifs secondaires (max 3)", options: [
    { value: "recovery", label: "Recuperation & guerison" },
    { value: "gh-antiaging", label: "GH / Anti-aging" },
    { value: "fatloss", label: "Perte de graisse" },
    { value: "sleep", label: "Sommeil profond" },
    { value: "cognitive", label: "Performance cognitive" },
    { value: "libido", label: "Libido" },
    { value: "testo-boost", label: "Booster testosterone naturellement" },
    { value: "skin-hair", label: "Peau / cheveux" },
    { value: "endurance", label: "Endurance" },
  ]},
  { id: "pep_timeline", sectionId: "objectifs", type: "select", label: "Priorite temporelle", options: [
    { value: "fast", label: "Resultats rapides (4-6 semaines)" },
    { value: "solid", label: "Resultats solides (8-12 semaines)" },
    { value: "longterm", label: "Optimisation long terme (12+ semaines)" },
  ]},
  { id: "pep_injury_details", sectionId: "objectifs", type: "textarea", label: "Details de ta blessure / zone a traiter", placeholder: "Decris ta blessure, depuis quand, quel impact sur ton training...", conditionalOn: "pep_primary_goal:recovery" },
  { id: "pep_fatloss_methods", sectionId: "objectifs", type: "select", label: "Methodes de fat loss deja tentees", conditionalOn: "pep_primary_goal:fatloss", options: [
    { value: "deficit", label: "Deficit calorique seul" },
    { value: "cardio", label: "Cardio intensif" },
    { value: "fasting", label: "Jeune intermittent" },
    { value: "supplements", label: "Supplements brule-graisse" },
    { value: "peptides", label: "Peptides fat loss (CJC/Frag etc)" },
    { value: "nothing", label: "Rien encore" },
  ]},
  { id: "pep_sleep_type", sectionId: "objectifs", type: "select", label: "Type de probleme de sommeil", conditionalOn: "pep_primary_goal:sleep", options: [
    { value: "onset", label: "Difficulte a m'endormir" },
    { value: "wakeups", label: "Reveils nocturnes" },
    { value: "quality", label: "Sommeil non reparateur" },
    { value: "chronic", label: "Insomnie chronique" },
    { value: "circadian", label: "Decalage circadien" },
  ]},

  // Testosterone-boost sub-questions ,  only shown if user picked testo-boost as primary goal.
  // These drive the protocol choice (enclomifene vs HCG+kisspeptin vs gonadorelin pulsatile).
  // Without them we'd be prescribing blind; with them the engine can tailor safely.
  { id: "pep_testo_symptoms", sectionId: "objectifs", type: "checkbox", label: "Symptômes ressentis (coche tout ce qui s'applique)", conditionalOn: "pep_primary_goal:testo-boost", options: [
    { value: "low-libido", label: "Baisse de libido" },
    { value: "erectile", label: "Difficultés érectiles" },
    { value: "fatigue", label: "Fatigue chronique, manque d'énergie" },
    { value: "muscle-loss", label: "Perte de muscle / récupération lente" },
    { value: "fat-gain", label: "Prise de gras (ventre notamment)" },
    { value: "mood", label: "Humeur basse, irritabilité, motivation à zéro" },
    { value: "brainfog", label: "Brain fog, concentration dégradée" },
    { value: "morning-wood", label: "Plus d'érections matinales" },
    { value: "none-symptoms", label: "Aucun symptôme (optimisation proactive)" },
  ]},
  { id: "pep_testo_bloodwork", sectionId: "objectifs", type: "select", label: "Bilan hormonal récent (Testo totale, LH, FSH, E2) ?", conditionalOn: "pep_primary_goal:testo-boost", required: true, options: [
    { value: "recent-low", label: "Oui, < 3 mois, testo basse confirmée" },
    { value: "recent-normal", label: "Oui, < 3 mois, testo dans la norme mais je veux optimiser" },
    { value: "old", label: "Oui, > 3 mois (je vais en refaire un)" },
    { value: "never", label: "Jamais fait ,  je vais en faire un avant" },
  ]},
  { id: "pep_testo_fertility", sectionId: "objectifs", type: "select", label: "Préserver la fertilité (projet bébé actuel ou futur) ?", conditionalOn: "pep_primary_goal:testo-boost", required: true, options: [
    { value: "critical", label: "Oui, critique ,  je veux concevoir bientôt" },
    { value: "important", label: "Oui, important ,  à moyen terme (1-3 ans)" },
    { value: "nice", label: "Préférable, mais pas urgent" },
    { value: "no", label: "Non, fertilité pas un enjeu" },
  ]},
  { id: "pep_testo_pct_context", sectionId: "objectifs", type: "select", label: "Contexte", conditionalOn: "pep_primary_goal:testo-boost", options: [
    { value: "natural-low", label: "Production naturelle basse (jamais de cycle)" },
    { value: "post-cycle", label: "Post-cycle (relance après SARM ou stéroïdes)" },
    { value: "age-related", label: "Baisse liée à l'âge (andropause)" },
    { value: "stress-lifestyle", label: "Baisse liée au stress / lifestyle" },
    { value: "other", label: "Autre" },
  ]},

  // === SECTION 3: SANTE ===
  { id: "pep_conditions", sectionId: "sante", type: "checkbox", label: "Conditions medicales actuelles", required: true, options: [
    { value: "none", label: "Aucune" },
    { value: "diabetes", label: "Diabete type 1 ou 2" },
    { value: "cancer", label: "Cancer (actif ou remission)" },
    { value: "autoimmune", label: "Maladie auto-immune" },
    { value: "cardiac", label: "Problemes cardiaques" },
    { value: "hypertension", label: "Hypertension" },
    { value: "thyroid", label: "Troubles thyroidiens" },
    { value: "renal-hepatic", label: "Insuffisance renale/hepatique" },
    { value: "other", label: "Autre" },
  ]},
  { id: "pep_conditions_other", sectionId: "sante", type: "text", label: "Preciser la condition", conditionalOn: "pep_conditions:other", placeholder: "Quelle condition?" },
  { id: "pep_medications", sectionId: "sante", type: "textarea", label: "Medicaments actuels", placeholder: "Ex: levothyrox, metformine, statines... ou 'aucun'" },
  { id: "pep_allergies", sectionId: "sante", type: "text", label: "Allergies connues", placeholder: "Ex: penicilline, latex... ou 'aucune'" },
  { id: "pep_blood_recent", sectionId: "sante", type: "select", label: "Bilan sanguin recent?", options: [
    { value: "3months", label: "Oui, < 3 mois" },
    { value: "6months", label: "Oui, 3-6 mois" },
    { value: "over6", label: "Oui, > 6 mois" },
    { value: "never", label: "Non, jamais" },
  ]},
  { id: "pep_trt", sectionId: "sante", type: "select", label: "Es-tu sous TRT ou hormone exogene?", options: [
    { value: "no", label: "Non" },
    { value: "trt", label: "Oui ,  TRT testosterone" },
    { value: "hgh", label: "Oui ,  HGH" },
    { value: "other", label: "Oui ,  autre" },
  ]},
  { id: "pep_trt_details", sectionId: "sante", type: "text", label: "Details de ton protocole TRT/hormone", conditionalOn: "pep_trt:trt", placeholder: "Dose, frequence, depuis quand" },
  { id: "pep_peds_history", sectionId: "sante", type: "select", label: "Historique PEDs (steroides, SARMs)", options: [
    { value: "none", label: "Aucun" },
    { value: "sarms", label: "SARMs uniquement" },
    { value: "1-2cycles", label: "1-2 cycles steroides" },
    { value: "regular", label: "Utilisateur regulier" },
    { value: "bnc", label: "Blast & cruise" },
  ]},

  // === SECTION 4: PRATIQUE ===
  { id: "pep_country", sectionId: "pratique", type: "select", label: "Pays de livraison", required: true, options: [
    { value: "FR", label: "France" },
    { value: "BE", label: "Belgique" },
    { value: "CH", label: "Suisse" },
    { value: "LU", label: "Luxembourg" },
    { value: "CA", label: "Canada" },
    { value: "US", label: "Etats-Unis" },
    { value: "AE", label: "Emirats arabes unis" },
    { value: "GB", label: "Royaume-Uni" },
    { value: "DE", label: "Allemagne" },
    { value: "ES", label: "Espagne" },
    { value: "IT", label: "Italie" },
    { value: "NL", label: "Pays-Bas" },
    { value: "PT", label: "Portugal" },
    { value: "MA", label: "Maroc" },
    { value: "DZ", label: "Algerie" },
    { value: "TN", label: "Tunisie" },
    { value: "EU-other", label: "Autre pays Europe" },
    { value: "world", label: "Autre pays" },
  ]},
  { id: "pep_country_eu_other", sectionId: "pratique", type: "text", label: "Precise le pays europeen de livraison", conditionalOn: "pep_country:EU-other", placeholder: "Ex: Autriche, Pologne, Suede..." },
  { id: "pep_country_other", sectionId: "pratique", type: "text", label: "Precise le pays de livraison", conditionalOn: "pep_country:world", placeholder: "Pays exact de livraison" },
  { id: "pep_budget", sectionId: "pratique", type: "select", label: "Budget mensuel peptides", required: true, options: [
    { value: "under50", label: "< 50 EUR" },
    { value: "50-100", label: "50-100 EUR" },
    { value: "100-200", label: "100-200 EUR" },
    { value: "200-300", label: "200-300 EUR" },
    { value: "over300", label: "> 300 EUR" },
  ]},
  { id: "pep_injection_comfort", sectionId: "pratique", type: "select", label: "Confort avec les injections", required: true, options: [
    { value: "fine", label: "Aucun probleme" },
    { value: "anxious", label: "Un peu anxieux mais OK" },
    { value: "very-anxious", label: "Tres anxieux ,  prefere alternatives" },
    { value: "refuse", label: "Refuse categoriquement les injections" },
  ]},
  { id: "pep_injection_type", sectionId: "pratique", type: "select", label: "Preference type d'injection", conditionalOn: "pep_injection_comfort:fine", options: [
    { value: "sc", label: "Sous-cutanee (insuline, facile)" },
    { value: "im", label: "Intramusculaire (OK)" },
    { value: "no-pref", label: "Pas de preference" },
    { value: "dont-know", label: "Je ne sais pas la difference" },
  ]},
  { id: "pep_frequency", sectionId: "pratique", type: "select", label: "Frequence d'injection acceptable", options: [
    { value: "1x", label: "1x/jour" },
    { value: "2x", label: "2x/jour" },
    { value: "3x", label: "3x/jour max" },
    { value: "less", label: "Moins frequent si possible" },
  ]},
  { id: "pep_storage", sectionId: "pratique", type: "select", label: "Acces a un frigo?", options: [
    { value: "personal", label: "Oui, frigo personnel" },
    { value: "shared", label: "Oui, mais partage (famille/coloc)" },
    { value: "no", label: "Non, pas de frigo facile d'acces" },
    { value: "equipped", label: "J'ai deja BAC water et seringues" },
  ]},
  { id: "pep_reconstitution", sectionId: "pratique", type: "select", label: "Experience reconstitution peptides", options: [
    { value: "never", label: "Jamais fait" },
    { value: "once", label: "Deja fait 1-2 fois" },
    { value: "comfortable", label: "A l'aise" },
    { value: "expert", label: "Expert (multi-vials, dosage precis)" },
  ]},

  // === SECTION 5: STACK ACTUEL ===
  { id: "pep_current_peptides", sectionId: "stack", type: "textarea", label: "Peptides utilises actuellement", placeholder: "Ex: BPC-157 250mcg 2x/jour, CJC-1295 100mcg avant coucher... ou 'aucun'" },
  { id: "pep_past_peptides", sectionId: "stack", type: "textarea", label: "Peptides utilises dans le passe", placeholder: "Quels peptides, a quelles doses, quels resultats? ou 'aucun'" },
  { id: "pep_current_supps", sectionId: "stack", type: "textarea", label: "Supplements actuels", placeholder: "Ex: creatine 5g, omega-3, magnesium bisglycinate... ou 'aucun'" },
  { id: "pep_training_type", sectionId: "stack", type: "select", label: "Type d'entrainement", options: [
    { value: "hypertrophy", label: "Musculation / hypertrophie" },
    { value: "strength", label: "Powerlifting / force" },
    { value: "crossfit", label: "CrossFit / HYROX" },
    { value: "endurance", label: "Endurance (course, cyclisme)" },
    { value: "combat", label: "Sports de combat" },
    { value: "team", label: "Sport collectif" },
    { value: "mixed", label: "Mixte" },
    { value: "none", label: "Pas d'entrainement regulier" },
  ]},
  { id: "pep_training_freq", sectionId: "stack", type: "select", label: "Frequence d'entrainement", options: [
    { value: "1-2", label: "1-2x/semaine" },
    { value: "3-4", label: "3-4x/semaine" },
    { value: "5-6", label: "5-6x/semaine" },
    { value: "7+", label: "7x/semaine ou +" },
    { value: "irregular", label: "Irregulier" },
  ]},
  { id: "pep_nutrition", sectionId: "stack", type: "select", label: "Style nutritionnel", options: [
    { value: "surplus", label: "Surplus calorique (prise de masse)" },
    { value: "maintenance", label: "Maintenance" },
    { value: "deficit", label: "Deficit calorique (seche)" },
    { value: "flexible", label: "Flexible / intuitif" },
    { value: "no-track", label: "Je ne track pas" },
  ]},

  // === SECTION 6: ATTENTES ===
  { id: "pep_start_when", sectionId: "attentes", type: "select", label: "Quand veux-tu commencer?", options: [
    { value: "asap", label: "Des que possible" },
    { value: "1-2weeks", label: "Dans 1-2 semaines" },
    { value: "1month", label: "Dans 1 mois" },
    { value: "planning", label: "Je planifie pour plus tard" },
  ]},
  { id: "pep_blood_commit", sectionId: "attentes", type: "select", label: "Pret a faire un bilan sanguin?", required: true, options: [
    { value: "yes-both", label: "Oui, avant + a mi-cycle (recommande)" },
    { value: "yes-before", label: "Oui, avant seulement" },
    { value: "maybe", label: "Peut-etre" },
    { value: "no", label: "Non" },
  ]},
  { id: "pep_coaching_interest", sectionId: "attentes", type: "select", label: "Interet pour un suivi coaching?", options: [
    { value: "yes", label: "Oui, je veux un suivi personnalise" },
    { value: "maybe", label: "Peut-etre plus tard" },
    { value: "no", label: "Non, le protocole me suffit" },
  ]},
  { id: "pep_requested_peptides", sectionId: "attentes", type: "textarea", label: "Tu as des peptides specifiques en tete?", placeholder: "Optionnel ,  ecris les noms exacts des peptides que tu veux dans ton protocole (ex: BPC-157, Retatrutide, Semaglutide...)" },
  { id: "pep_questions", sectionId: "attentes", type: "textarea", label: "Questions ou precisions?", placeholder: "Optionnel ,  ajoute tout ce que tu veux que je sache" },
];

// Safety gate: conditions that prevent purchase
export const SAFETY_BLOCKERS = ["cancer"];

export function shouldBlockPurchase(responses: Record<string, unknown>): { blocked: boolean; reason?: string } {
  const conditions = responses["pep_conditions"];
  if (Array.isArray(conditions) && conditions.some(c => SAFETY_BLOCKERS.includes(c as string))) {
    return { blocked: true, reason: "Certains peptides sont contre-indiques avec un cancer actif ou en remission. Consulte ton oncologue avant toute utilisation de peptides." };
  }
  return { blocked: false };
}

export function getQuestionsForSection(sectionId: string): PeptidesQuestion[] {
  return PEPTIDES_QUESTIONS.filter(q => q.sectionId === sectionId);
}

export function shouldShowQuestion(question: PeptidesQuestion, responses: Record<string, unknown>): boolean {
  if (!question.conditionalOn) return true;
  const [questionId, expectedValue] = question.conditionalOn.split(":");
  const actualValue = responses[questionId];
  if (Array.isArray(actualValue)) {
    return actualValue.includes(expectedValue);
  }
  return actualValue === expectedValue;
}
