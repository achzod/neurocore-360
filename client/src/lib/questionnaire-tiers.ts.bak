/**
 * NEUROCORE 360 - Système de Questionnaire 3 Tiers
 *
 * GRATUIT (0€): ~50 questions - Dashboard basique
 * ANABOLIC BIOSCAN (49€): ~150 questions - Rapport Achzod 18 sections
 * PRO PANEL 360 (99€): ~210 questions - Rapport premium 25 sections + Terra Wearables + Analyse Photo
 *
 * Chaque question a un champ `tier`:
 * - "free" = disponible pour tous
 * - "essential" = ANABOLIC BIOSCAN (49€)
 * - "elite" = PRO PANEL 360 (99€)
 */

export type QuestionTier = "free" | "essential" | "elite";
export type QuestionType = "text" | "number" | "email" | "select" | "radio" | "checkbox" | "textarea" | "photo";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  label: string;
  tier: QuestionTier;
  options?: QuestionOption[];
  placeholder?: string;
  required?: boolean;
  showFor?: "homme" | "femme"; // Genre-specific questions
  conditionalOn?: string; // Show only if this question has a certain answer
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  tier: QuestionTier;
  order: number;
}

// ============================================================================
// SECTIONS DEFINITION
// ============================================================================

export const SECTIONS: Section[] = [
  // FREE SECTIONS (9)
  { id: "profil-base", title: "Profil de Base", subtitle: "Informations générales", icon: "User", tier: "free", order: 1 },
  { id: "sante-historique", title: "Santé & Historique", subtitle: "Antécédents et blocages", icon: "Stethoscope", tier: "free", order: 2 },
  { id: "sommeil", title: "Sommeil", subtitle: "Qualité et habitudes", icon: "Moon", tier: "free", order: 3 },
  { id: "stress-nerveux", title: "Stress & Nerveux", subtitle: "Gestion du stress", icon: "Brain", tier: "free", order: 4 },
  { id: "energie", title: "Énergie", subtitle: "Niveaux d'énergie", icon: "Zap", tier: "free", order: 5 },
  { id: "digestion", title: "Digestion", subtitle: "Santé digestive", icon: "Activity", tier: "free", order: 6 },
  { id: "training", title: "Entraînement", subtitle: "Activité physique", icon: "Dumbbell", tier: "free", order: 7 },
  { id: "nutrition-base", title: "Nutrition", subtitle: "Habitudes alimentaires", icon: "Utensils", tier: "free", order: 8 },
  { id: "lifestyle", title: "Lifestyle", subtitle: "Mode de vie", icon: "Heart", tier: "free", order: 9 },
  { id: "mindset", title: "Mindset & Objectifs", subtitle: "Motivation et engagement", icon: "Target", tier: "free", order: 10 },

  // ANABOLIC BIOSCAN SECTIONS (+7)
  { id: "nutrition-detaillee", title: "Nutrition Détaillée", subtitle: "Ce que tu manges vraiment", icon: "UtensilsCrossed", tier: "essential", order: 11 },
  { id: "hormones-homme", title: "Hormones Homme", subtitle: "Profil hormonal masculin", icon: "TrendingUp", tier: "essential", order: 12 },
  { id: "hormones-femme", title: "Hormones Femme", subtitle: "Profil hormonal féminin", icon: "TrendingUp", tier: "essential", order: 13 },
  { id: "axes-cliniques", title: "Axes Cliniques", subtitle: "Thyroïde, SII, diabète", icon: "Stethoscope", tier: "essential", order: 14 },
  { id: "supplements", title: "Suppléments", subtitle: "Stack actuel", icon: "Pill", tier: "essential", order: 15 },
  { id: "biomarqueurs", title: "Biomarqueurs", subtitle: "Analyses sanguines", icon: "TestTube", tier: "essential", order: 16 },
  { id: "composition-corporelle", title: "Composition Corporelle", subtitle: "Morphologie détaillée", icon: "Scale", tier: "essential", order: 17 },

  // PRO PANEL 360 SECTIONS (+6)
  { id: "nutrition-timing", title: "Nutrition Timing", subtitle: "Timing pré/intra/post workout", icon: "Clock", tier: "elite", order: 17 },
  { id: "cardio-performance", title: "Cardio & Performance", subtitle: "Zone 2, VO2max, seuils", icon: "Heart", tier: "elite", order: 18 },
  { id: "hrv-cardiaque", title: "HRV & Cardiaque", subtitle: "Variabilité cardiaque", icon: "HeartPulse", tier: "elite", order: 19 },
  { id: "blessures-douleurs", title: "Blessures & Douleurs", subtitle: "Douleurs, mobilité, prévention", icon: "Bone", tier: "elite", order: 20 },
  { id: "psychologie-mental", title: "Psychologie", subtitle: "Mental et blocages", icon: "BrainCircuit", tier: "elite", order: 21 },
  { id: "analyse-photo", title: "Analyse Photo", subtitle: "Photos pour analyse posturale", icon: "Camera", tier: "elite", order: 22 },
];

// ============================================================================
// QUESTIONS - FREE TIER (~50 questions)
// ============================================================================

export const QUESTIONS_FREE: Question[] = [
  // PROFIL BASE (8 questions)
  { id: "sexe", sectionId: "profil-base", type: "radio", label: "Tu es ?", tier: "free", options: [{ value: "homme", label: "Homme" }, { value: "femme", label: "Femme" }], required: true },
  { id: "prenom", sectionId: "profil-base", type: "text", label: "Ton prénom ?", tier: "free", placeholder: "Ex: Marc, Sophie...", required: true },
  { id: "email", sectionId: "profil-base", type: "email", label: "Ton email ?", tier: "free", placeholder: "pour recevoir ton rapport", required: true },
  { id: "instagram", sectionId: "profil-base", type: "text", label: "Ton Instagram ? (optionnel)", tier: "free", placeholder: "@ton_pseudo", required: true },
  { id: "age", sectionId: "profil-base", type: "number", label: "Ton âge ?", tier: "free", placeholder: "Ex: 32", min: 15, max: 99, required: true },
  { id: "taille", sectionId: "profil-base", type: "number", label: "Ta taille (cm) ?", tier: "free", placeholder: "Ex: 175", min: 140, max: 220, unit: "cm", required: true },
  { id: "poids", sectionId: "profil-base", type: "number", label: "Ton poids (kg) ?", tier: "free", placeholder: "Ex: 78", min: 40, max: 200, unit: "kg", required: true },
  { id: "objectif", sectionId: "profil-base", type: "select", label: "Ton objectif principal ?", tier: "free", options: [{ value: "perte-graisse", label: "Perte de graisse" }, { value: "prise-muscle", label: "Prise de muscle" }, { value: "recomposition", label: "Recomposition" }, { value: "performance", label: "Performance" }, { value: "sante", label: "Santé générale" }, { value: "energie", label: "Plus d'énergie" }], required: true },

  // SANTÉ & HISTORIQUE (6 questions)
  { id: "diagnostic-medical", sectionId: "sante-historique", type: "checkbox", label: "Diagnostic médical connu ?", tier: "free", options: [{ value: "thyroide", label: "Thyroïde" }, { value: "diabete", label: "Diabète/prédiabète" }, { value: "sopk", label: "SOPK" }, { value: "hypogonadisme", label: "Hypogonadisme" }, { value: "autre", label: "Autre" }, { value: "aucun", label: "Aucun" }], required: true },
  { id: "traitement-medical", sectionId: "sante-historique", type: "select", label: "Traitement affectant poids/énergie ?", tier: "free", options: [{ value: "non", label: "Non" }, { value: "oui-hormones", label: "Oui (hormones)" }, { value: "oui-antidep", label: "Oui (antidépresseurs)" }, { value: "oui-autre", label: "Oui (autre)" }], required: true },
  { id: "bilan-sanguin-recent", sectionId: "sante-historique", type: "select", label: "Bilan sanguin récent ?", tier: "free", options: [{ value: "jamais", label: "Jamais fait" }, { value: "plus-1an", label: "+1 an" }, { value: "moins-1an", label: "Moins d'1 an" }, { value: "moins-6mois", label: "Moins de 6 mois" }], required: true },
  { id: "plateau-metabolique", sectionId: "sante-historique", type: "select", label: "Déjà eu un plateau (bloqué malgré régime/sport) ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "une-fois", label: "Oui, une fois" }, { value: "plusieurs", label: "Plusieurs fois" }, { value: "actuellement", label: "Actuellement" }], required: true },
  { id: "tca-historique", sectionId: "sante-historique", type: "select", label: "Troubles alimentaires passés/actuels ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "passe", label: "Dans le passé" }, { value: "actuel", label: "Actuellement" }], required: true },
  { id: "experience-sportive", sectionId: "sante-historique", type: "select", label: "Expérience sportive ?", tier: "free", options: [{ value: "debutant", label: "Débutant (<1 an)" }, { value: "intermediaire", label: "Intermédiaire (1-3 ans)" }, { value: "avance", label: "Avancé (3+ ans)" }, { value: "expert", label: "Expert (5+ ans)" }], required: true },

  // SOMMEIL (6 questions)
  { id: "heures-sommeil", sectionId: "sommeil", type: "select", label: "Heures de sommeil par nuit ?", tier: "free", options: [{ value: "moins-5", label: "Moins de 5h" }, { value: "5-6", label: "5-6h" }, { value: "6-7", label: "6-7h" }, { value: "7-8", label: "7-8h" }, { value: "8+", label: "8h+" }] },
  { id: "qualite-sommeil", sectionId: "sommeil", type: "select", label: "Qualité générale du sommeil ?", tier: "free", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "mauvaise", label: "Mauvaise" }] },
  { id: "endormissement", sectionId: "sommeil", type: "select", label: "Difficultés d'endormissement ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },
  { id: "reveils-nocturnes", sectionId: "sommeil", type: "select", label: "Réveils nocturnes ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "chaque-nuit", label: "Chaque nuit" }] },
  { id: "reveil-fatigue", sectionId: "sommeil", type: "select", label: "Te réveilles-tu fatigué ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },
  { id: "heure-coucher", sectionId: "sommeil", type: "select", label: "Heure de coucher habituelle ?", tier: "free", options: [{ value: "avant-22h", label: "Avant 22h" }, { value: "22h-23h", label: "22h-23h" }, { value: "23h-00h", label: "23h-minuit" }, { value: "apres-00h", label: "Après minuit" }] },

  // STRESS & NERVEUX (6 questions)
  { id: "niveau-stress", sectionId: "stress-nerveux", type: "select", label: "Niveau de stress général ?", tier: "free", options: [{ value: "tres-bas", label: "Très bas" }, { value: "bas", label: "Bas" }, { value: "modere", label: "Modéré" }, { value: "eleve", label: "Élevé" }, { value: "tres-eleve", label: "Très élevé" }] },
  { id: "anxiete", sectionId: "stress-nerveux", type: "select", label: "Anxiété au quotidien ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }] },
  { id: "concentration", sectionId: "stress-nerveux", type: "select", label: "Capacité de concentration ?", tier: "free", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "difficile", label: "Difficile" }] },
  { id: "irritabilite", sectionId: "stress-nerveux", type: "select", label: "Irritabilité ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "tres-souvent", label: "Très souvent" }] },
  { id: "humeur-fluctuation", sectionId: "stress-nerveux", type: "select", label: "Fluctuations d'humeur ?", tier: "free", options: [{ value: "stable", label: "Très stable" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "constamment", label: "Constamment" }] },
  { id: "gestion-stress", sectionId: "stress-nerveux", type: "checkbox", label: "Comment gères-tu ton stress ?", tier: "free", options: [{ value: "sport", label: "Sport" }, { value: "meditation", label: "Méditation" }, { value: "nature", label: "Nature" }, { value: "musique", label: "Musique" }, { value: "rien", label: "Rien de spécial" }] },

  // ÉNERGIE (6 questions)
  { id: "energie-matin", sectionId: "energie", type: "select", label: "Énergie le matin ?", tier: "free", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "faible", label: "Faible" }, { value: "tres-faible", label: "Très faible" }] },
  { id: "energie-aprem", sectionId: "energie", type: "select", label: "Énergie l'après-midi ?", tier: "free", options: [{ value: "stable", label: "Stable" }, { value: "legere-baisse", label: "Légère baisse" }, { value: "baisse-moderee", label: "Baisse modérée" }, { value: "crash", label: "Crash important" }] },
  { id: "coup-fatigue", sectionId: "energie", type: "select", label: "Coups de fatigue ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "quotidien", label: "Quotidien" }] },
  { id: "envies-sucre", sectionId: "energie", type: "select", label: "Envies de sucre ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }] },
  { id: "motivation", sectionId: "energie", type: "select", label: "Niveau de motivation ?", tier: "free", options: [{ value: "tres-eleve", label: "Très élevé" }, { value: "eleve", label: "Élevé" }, { value: "moyen", label: "Moyen" }, { value: "bas", label: "Bas" }, { value: "tres-bas", label: "Très bas" }] },
  { id: "thermogenese", sectionId: "energie", type: "select", label: "As-tu facilement froid ?", tier: "free", options: [{ value: "non", label: "Non, plutôt chaud" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },

  // DIGESTION (6 questions)
  { id: "digestion-qualite", sectionId: "digestion", type: "select", label: "Qualité de ta digestion ?", tier: "free", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "mauvaise", label: "Mauvaise" }] },
  { id: "ballonnements", sectionId: "digestion", type: "select", label: "Ballonnements ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "apres-repas", label: "Après chaque repas" }] },
  { id: "transit", sectionId: "digestion", type: "select", label: "Régularité du transit ?", tier: "free", options: [{ value: "tres-regulier", label: "Très régulier" }, { value: "regulier", label: "Régulier" }, { value: "variable", label: "Variable" }, { value: "constipe", label: "Souvent constipé" }, { value: "diarrhee", label: "Souvent diarrhée" }] },
  { id: "reflux", sectionId: "digestion", type: "select", label: "Reflux gastriques ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }] },
  { id: "intolerance", sectionId: "digestion", type: "checkbox", label: "Intolérances alimentaires ?", tier: "free", options: [{ value: "lactose", label: "Lactose" }, { value: "gluten", label: "Gluten" }, { value: "autres", label: "Autres" }, { value: "aucune", label: "Aucune" }] },
  { id: "energie-post-repas", sectionId: "digestion", type: "select", label: "Énergie après les repas ?", tier: "free", options: [{ value: "stable", label: "Stable" }, { value: "legere-baisse", label: "Légère baisse" }, { value: "somnolence", label: "Somnolence" }, { value: "crash", label: "Crash fréquent" }] },

  // TRAINING (6 questions)
  { id: "sport-frequence", sectionId: "training", type: "select", label: "Fréquence d'entraînement ?", tier: "free", options: [{ value: "0", label: "Jamais" }, { value: "1-2", label: "1-2x/semaine" }, { value: "3-4", label: "3-4x/semaine" }, { value: "5+", label: "5x+/semaine" }] },
  { id: "type-sport", sectionId: "training", type: "checkbox", label: "Types d'activités ?", tier: "free", options: [{ value: "musculation", label: "Musculation" }, { value: "cardio", label: "Cardio" }, { value: "hiit", label: "HIIT" }, { value: "yoga", label: "Yoga" }, { value: "sport-collectif", label: "Sport collectif" }, { value: "aucun", label: "Aucun" }] },
  { id: "intensite", sectionId: "training", type: "select", label: "Intensité moyenne ?", tier: "free", options: [{ value: "leger", label: "Légère" }, { value: "modere", label: "Modérée" }, { value: "intense", label: "Intense" }, { value: "extreme", label: "Extrême" }] },
  { id: "recuperation", sectionId: "training", type: "select", label: "Qualité de récupération ?", tier: "free", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "mauvaise", label: "Mauvaise" }] },
  { id: "courbatures", sectionId: "training", type: "select", label: "Fréquence des courbatures ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },
  { id: "performance-evolution", sectionId: "training", type: "select", label: "Évolution des performances ?", tier: "free", options: [{ value: "progression", label: "Progression" }, { value: "stagnation", label: "Stagnation" }, { value: "regression", label: "Régression" }] },

  // NUTRITION BASE (8 questions)
  { id: "nb-repas", sectionId: "nutrition-base", type: "select", label: "Nombre de repas/jour ?", tier: "free", options: [{ value: "1-2", label: "1-2 repas" }, { value: "3", label: "3 repas" }, { value: "4-5", label: "4-5 repas" }, { value: "6+", label: "6+ repas" }] },
  { id: "petit-dejeuner", sectionId: "nutrition-base", type: "select", label: "Petit-déjeuner ?", tier: "free", options: [{ value: "toujours", label: "Toujours" }, { value: "souvent", label: "Souvent" }, { value: "parfois", label: "Parfois" }, { value: "jamais", label: "Jamais" }] },
  { id: "proteines-jour", sectionId: "nutrition-base", type: "select", label: "Apport en protéines ?", tier: "free", options: [{ value: "faible", label: "Faible (<50g)" }, { value: "moyen", label: "Moyen (50-100g)" }, { value: "bon", label: "Bon (100-150g)" }, { value: "eleve", label: "Élevé (150g+)" }, { value: "inconnu", label: "Je ne sais pas" }] },
  { id: "eau-jour", sectionId: "nutrition-base", type: "select", label: "Eau par jour ?", tier: "free", options: [{ value: "moins-1L", label: "Moins de 1L" }, { value: "1-1.5L", label: "1-1.5L" }, { value: "1.5-2L", label: "1.5-2L" }, { value: "2-3L", label: "2-3L" }, { value: "3L+", label: "3L+" }] },
  { id: "regime-alimentaire", sectionId: "nutrition-base", type: "select", label: "Régime particulier ?", tier: "free", options: [{ value: "aucun", label: "Aucun" }, { value: "vegetarien", label: "Végétarien" }, { value: "vegan", label: "Vegan" }, { value: "keto", label: "Cétogène" }, { value: "jeune-intermittent", label: "Jeûne intermittent" }] },
  { id: "aliments-transformes", sectionId: "nutrition-base", type: "select", label: "Aliments ultra-transformés ?", tier: "free", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }] },
  { id: "sucres-ajoutes", sectionId: "nutrition-base", type: "select", label: "Sucres ajoutés ?", tier: "free", options: [{ value: "zero", label: "Zéro" }, { value: "faible", label: "Faible" }, { value: "modere", label: "Modéré" }, { value: "eleve", label: "Élevé" }] },
  { id: "alcool", sectionId: "nutrition-base", type: "select", label: "Alcool par semaine ?", tier: "free", options: [{ value: "0", label: "Aucun" }, { value: "1-3", label: "1-3 verres" }, { value: "4-7", label: "4-7 verres" }, { value: "8+", label: "8+ verres" }] },

  // LIFESTYLE (6 questions)
  { id: "cafe-jour", sectionId: "lifestyle", type: "select", label: "Cafés par jour ?", tier: "free", options: [{ value: "0", label: "Aucun" }, { value: "1-2", label: "1-2" }, { value: "3-4", label: "3-4" }, { value: "5+", label: "5+" }] },
  { id: "tabac", sectionId: "lifestyle", type: "select", label: "Tabac ?", tier: "free", options: [{ value: "non", label: "Non" }, { value: "ex-fumeur", label: "Ex-fumeur" }, { value: "occasionnel", label: "Occasionnel" }, { value: "quotidien", label: "Quotidien" }] },
  { id: "temps-ecran", sectionId: "lifestyle", type: "select", label: "Temps d'écran/jour (hors travail) ?", tier: "free", options: [{ value: "moins-2h", label: "Moins de 2h" }, { value: "2-4h", label: "2-4h" }, { value: "4-6h", label: "4-6h" }, { value: "6h+", label: "6h+" }] },
  { id: "exposition-soleil", sectionId: "lifestyle", type: "select", label: "Exposition au soleil ?", tier: "free", options: [{ value: "rare", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "regulier", label: "Régulièrement" }] },
  { id: "profession", sectionId: "lifestyle", type: "select", label: "Type de travail ?", tier: "free", options: [{ value: "bureau", label: "Bureau (assis)" }, { value: "mixte", label: "Mixte" }, { value: "actif", label: "Actif/physique" }, { value: "teletravail", label: "Télétravail" }] },
  { id: "heures-assis", sectionId: "lifestyle", type: "select", label: "Heures assis par jour ?", tier: "free", options: [{ value: "moins-4h", label: "Moins de 4h" }, { value: "4-6h", label: "4-6h" }, { value: "6-8h", label: "6-8h" }, { value: "8h+", label: "8h+" }] },

  // MINDSET & OBJECTIFS (8 questions)
  { id: "frustration-passee", sectionId: "mindset", type: "textarea", label: "Qu'est-ce qui t'a le plus frustré dans tes précédents essais de transformation ?", tier: "free", placeholder: "Sois honnête..." },
  { id: "si-rien-change", sectionId: "mindset", type: "textarea", label: "Si tu ne changes rien, où en seras-tu dans 1 an ?", tier: "free", placeholder: "Corps, énergie, confiance..." },
  { id: "ideal-6mois", sectionId: "mindset", type: "textarea", label: "Décris ton idéal physique et mental dans 6 mois", tier: "free", placeholder: "Qu'est-ce qui change dans ta vie ?" },
  { id: "plus-grosse-peur", sectionId: "mindset", type: "textarea", label: "Quelle est ta plus grosse peur si tu échoues ?", tier: "free", placeholder: "Sois honnête avec toi-même..." },
  { id: "engagement-niveau", sectionId: "mindset", type: "select", label: "De 1 à 10, à quel point es-tu prêt à t'engager ?", tier: "free", options: [{ value: "1-3", label: "1-3 (pas prêt)" }, { value: "4-5", label: "4-5 (hésitant)" }, { value: "6-7", label: "6-7 (motivé)" }, { value: "8-9", label: "8-9 (très motivé)" }, { value: "10", label: "10 (all-in)" }], required: true },
  { id: "motivation-principale", sectionId: "mindset", type: "select", label: "Ce qui te motive le plus ?", tier: "free", options: [{ value: "esthetique", label: "Esthétique" }, { value: "performance", label: "Performance" }, { value: "sante", label: "Santé" }, { value: "confiance", label: "Confiance en soi" }, { value: "mental", label: "Mental" }], required: true },
  { id: "consignes-strictes", sectionId: "mindset", type: "select", label: "Prêt à suivre des consignes strictes si ça garantit des résultats ?", tier: "free", options: [{ value: "non", label: "Non, j'ai besoin de flexibilité" }, { value: "partiellement", label: "Partiellement" }, { value: "oui", label: "Oui, je suis discipliné" }] },
  { id: "temps-training-semaine", sectionId: "mindset", type: "select", label: "Temps dispo pour t'entraîner par semaine ?", tier: "free", options: [{ value: "moins-2h", label: "Moins de 2h" }, { value: "2-4h", label: "2-4h" }, { value: "4-6h", label: "4-6h" }, { value: "6h+", label: "6h+" }] },
];

// ============================================================================
// QUESTIONS - ANABOLIC BIOSCAN (ajoutées aux FREE)
// ============================================================================

export const QUESTIONS_ESSENTIAL: Question[] = [
  // NUTRITION DÉTAILLÉE (18 questions) - Pour détecter aliments inflammatoires, impact sur lipolyse, hormones, sommeil
  { id: "petit-dej-heure", sectionId: "nutrition-detaillee", type: "select", label: "À quelle heure prends-tu ton petit-déjeuner ?", tier: "essential", options: [{ value: "pas-pdj", label: "Je ne prends pas de petit-déjeuner" }, { value: "6h-7h", label: "6h-7h" }, { value: "7h-8h", label: "7h-8h" }, { value: "8h-9h", label: "8h-9h" }, { value: "9h-10h", label: "9h-10h" }, { value: "apres-10h", label: "Après 10h" }] },
  { id: "petit-dej-contenu", sectionId: "nutrition-detaillee", type: "textarea", label: "Décris ton petit-déjeuner typique (sois précis : aliments, quantités)", tier: "essential", placeholder: "Ex: 2 tranches de pain complet + beurre + confiture + café au lait..." },
  { id: "petit-dej-type", sectionId: "nutrition-detaillee", type: "select", label: "Ton petit-déjeuner est plutôt...", tier: "essential", options: [{ value: "sucre", label: "Sucré (céréales, pain, viennoiseries, fruits)" }, { value: "sale", label: "Salé (œufs, protéines, légumes)" }, { value: "mixte", label: "Mixte" }, { value: "liquide", label: "Liquide seulement (café, smoothie)" }, { value: "rien", label: "Rien / jeûne" }] },

  { id: "dejeuner-heure", sectionId: "nutrition-detaillee", type: "select", label: "À quelle heure déjeunes-tu ?", tier: "essential", options: [{ value: "11h-12h", label: "11h-12h" }, { value: "12h-13h", label: "12h-13h" }, { value: "13h-14h", label: "13h-14h" }, { value: "14h-15h", label: "14h-15h" }, { value: "variable", label: "Variable" }] },
  { id: "dejeuner-contenu", sectionId: "nutrition-detaillee", type: "textarea", label: "Décris ton déjeuner typique (sois précis)", tier: "essential", placeholder: "Ex: Sandwich jambon-beurre + chips + soda OU poulet + riz + légumes..." },
  { id: "dejeuner-lieu", sectionId: "nutrition-detaillee", type: "select", label: "Où déjeunes-tu généralement ?", tier: "essential", options: [{ value: "maison", label: "À la maison (préparé)" }, { value: "boulot-prep", label: "Au travail (meal prep)" }, { value: "cantine", label: "Cantine/restaurant d'entreprise" }, { value: "resto-rapide", label: "Fast-food/sandwich" }, { value: "resto", label: "Restaurant" }, { value: "variable", label: "Variable" }] },

  { id: "diner-heure", sectionId: "nutrition-detaillee", type: "select", label: "À quelle heure dînes-tu ?", tier: "essential", options: [{ value: "18h-19h", label: "18h-19h" }, { value: "19h-20h", label: "19h-20h" }, { value: "20h-21h", label: "20h-21h" }, { value: "21h-22h", label: "21h-22h" }, { value: "apres-22h", label: "Après 22h" }] },
  { id: "diner-contenu", sectionId: "nutrition-detaillee", type: "textarea", label: "Décris ton dîner typique (sois précis)", tier: "essential", placeholder: "Ex: Pâtes bolognaise + fromage + pain OU poisson + légumes vapeur..." },
  { id: "diner-glucides", sectionId: "nutrition-detaillee", type: "select", label: "Ton dîner contient généralement des glucides ?", tier: "essential", options: [{ value: "beaucoup", label: "Beaucoup (pâtes, riz, pain, pommes de terre)" }, { value: "modere", label: "Modérément" }, { value: "peu", label: "Peu" }, { value: "zero", label: "Quasi zéro (low-carb le soir)" }] },
  { id: "diner-coucher-delai", sectionId: "nutrition-detaillee", type: "select", label: "Combien de temps entre ton dîner et le coucher ?", tier: "essential", options: [{ value: "moins-1h", label: "Moins d'1h" }, { value: "1h-2h", label: "1-2h" }, { value: "2h-3h", label: "2-3h" }, { value: "plus-3h", label: "Plus de 3h" }] },

  { id: "grignotage-frequence", sectionId: "nutrition-detaillee", type: "select", label: "Grignotes-tu entre les repas ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent (1x/jour)" }, { value: "tres-souvent", label: "Très souvent (plusieurs fois/jour)" }] },
  { id: "grignotage-contenu", sectionId: "nutrition-detaillee", type: "textarea", label: "Quand tu grignotes, c'est quoi généralement ?", tier: "essential", placeholder: "Ex: barres chocolatées, fruits, noix, chips, gâteaux, fromage..." },
  { id: "grignotage-moment", sectionId: "nutrition-detaillee", type: "checkbox", label: "À quels moments grignotes-tu le plus ?", tier: "essential", options: [{ value: "matin", label: "Milieu de matinée" }, { value: "aprem", label: "Après-midi (14h-17h)" }, { value: "pre-diner", label: "Avant le dîner (17h-20h)" }, { value: "soir", label: "Soirée/devant la TV" }, { value: "nuit", label: "Nuit" }, { value: "jamais", label: "Je ne grignote pas" }] },

  { id: "cheatmeal-frequence", sectionId: "nutrition-detaillee", type: "select", label: "Fréquence des cheat meals / écarts ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "1-mois", label: "1x/mois" }, { value: "2-3-mois", label: "2-3x/mois" }, { value: "1-semaine", label: "1x/semaine" }, { value: "2-3-semaine", label: "2-3x/semaine" }, { value: "quotidien", label: "Presque quotidien" }] },
  { id: "cheatmeal-contenu", sectionId: "nutrition-detaillee", type: "textarea", label: "Décris tes cheat meals typiques (sois honnête)", tier: "essential", placeholder: "Ex: pizza + glace, burger + frites + soda, apéro + chips + alcool..." },

  { id: "huiles-cuisson", sectionId: "nutrition-detaillee", type: "select", label: "Quelle huile utilises-tu pour cuisiner ?", tier: "essential", options: [{ value: "olive", label: "Huile d'olive" }, { value: "tournesol", label: "Huile de tournesol" }, { value: "colza", label: "Huile de colza" }, { value: "coco", label: "Huile de coco" }, { value: "beurre", label: "Beurre" }, { value: "margarine", label: "Margarine" }, { value: "variable", label: "Variable/je ne sais pas" }] },
  { id: "aliments-inflammatoires", sectionId: "nutrition-detaillee", type: "checkbox", label: "Lesquels consommes-tu régulièrement (3x+/semaine) ?", tier: "essential", options: [{ value: "pain-blanc", label: "Pain blanc/baguette" }, { value: "pates-blanches", label: "Pâtes blanches" }, { value: "cereales-sucrees", label: "Céréales sucrées" }, { value: "viennoiseries", label: "Viennoiseries" }, { value: "charcuterie", label: "Charcuterie" }, { value: "friture", label: "Fritures" }, { value: "sodas", label: "Sodas/jus industriels" }, { value: "plats-prepares", label: "Plats préparés/surgelés" }, { value: "aucun", label: "Aucun de ces aliments" }] },

  // HORMONES HOMME (11 questions)
  { id: "trt", sectionId: "hormones-homme", type: "select", label: "TRT / Traitement hormonal ?", tier: "essential", showFor: "homme", options: [{ value: "non", label: "Non" }, { value: "oui-trt", label: "Oui - TRT" }, { value: "oui-autre", label: "Oui - autre" }] },
  { id: "erections-matinales", sectionId: "hormones-homme", type: "select", label: "Érections matinales ?", tier: "essential", showFor: "homme", options: [{ value: "quotidiennes", label: "Quotidiennes" }, { value: "plusieurs-semaine", label: "Plusieurs/semaine" }, { value: "rarement", label: "Rarement" }, { value: "jamais", label: "Jamais" }] },
  { id: "qualite-erection", sectionId: "hormones-homme", type: "select", label: "Qualité des érections ?", tier: "essential", showFor: "homme", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "faible", label: "Faible" }] },
  { id: "libido-homme", sectionId: "hormones-homme", type: "select", label: "Niveau de libido ?", tier: "essential", showFor: "homme", options: [{ value: "tres-elevee", label: "Très élevée" }, { value: "elevee", label: "Élevée" }, { value: "normale", label: "Normale" }, { value: "basse", label: "Basse" }, { value: "tres-basse", label: "Très basse" }] },
  { id: "gynecomastie", sectionId: "hormones-homme", type: "select", label: "Développement tissu mammaire ?", tier: "essential", showFor: "homme", options: [{ value: "non", label: "Non" }, { value: "leger", label: "Léger" }, { value: "modere", label: "Modéré" }, { value: "important", label: "Important" }] },
  { id: "chute-cheveux", sectionId: "hormones-homme", type: "select", label: "Perte de cheveux ?", tier: "essential", showFor: "homme", options: [{ value: "aucune", label: "Aucune" }, { value: "legere", label: "Légère" }, { value: "moderee", label: "Modérée" }, { value: "importante", label: "Importante" }] },
  { id: "volume-testiculaire", sectionId: "hormones-homme", type: "select", label: "Volume testiculaire perçu ?", tier: "essential", showFor: "homme", options: [{ value: "normal", label: "Normal" }, { value: "diminue", label: "Diminué" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "prostate", sectionId: "hormones-homme", type: "select", label: "Symptômes prostatiques ?", tier: "essential", showFor: "homme", options: [{ value: "non", label: "Non" }, { value: "legers", label: "Légers" }, { value: "moderes", label: "Modérés" }, { value: "importants", label: "Importants" }] },
  { id: "prise-gras-homme", sectionId: "hormones-homme", type: "select", label: "Facilité à prendre du gras ?", tier: "essential", showFor: "homme", options: [{ value: "tres-difficile", label: "Très difficile" }, { value: "difficile", label: "Difficile" }, { value: "normal", label: "Normal" }, { value: "facile", label: "Facile" }, { value: "tres-facile", label: "Très facile" }] },
  { id: "perte-muscle-homme", sectionId: "hormones-homme", type: "select", label: "Facilité à perdre du muscle ?", tier: "essential", showFor: "homme", options: [{ value: "tres-difficile", label: "Très difficile" }, { value: "difficile", label: "Difficile" }, { value: "normal", label: "Normal" }, { value: "facile", label: "Facile" }] },
  { id: "confiance-homme", sectionId: "hormones-homme", type: "select", label: "Niveau de confiance en soi ?", tier: "essential", showFor: "homme", options: [{ value: "tres-eleve", label: "Très élevé" }, { value: "eleve", label: "Élevé" }, { value: "moyen", label: "Moyen" }, { value: "bas", label: "Bas" }] },

  // HORMONES FEMME (15 questions)
  { id: "contraception-hormonale", sectionId: "hormones-femme", type: "select", label: "Contraception hormonale ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "pilule", label: "Pilule" }, { value: "sterilet", label: "Stérilet hormonal" }, { value: "implant", label: "Implant" }, { value: "autre", label: "Autre" }] },
  { id: "phase-vie", sectionId: "hormones-femme", type: "select", label: "Phase de vie actuelle ?", tier: "essential", showFor: "femme", options: [{ value: "cycle-normal", label: "Cycle normal" }, { value: "post-partum", label: "Post-partum" }, { value: "peri-menopause", label: "Péri-ménopause" }, { value: "menopause", label: "Ménopause" }] },
  { id: "cycles-irreguliers", sectionId: "hormones-femme", type: "select", label: "Cycles menstruels ?", tier: "essential", showFor: "femme", options: [{ value: "reguliers", label: "Réguliers" }, { value: "variables", label: "Variables" }, { value: "irreguliers", label: "Très irréguliers" }, { value: "absents", label: "Absents" }] },
  { id: "hirsutisme", sectionId: "hormones-femme", type: "select", label: "Pilosité excessive ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "legere", label: "Légère" }, { value: "moderee", label: "Modérée" }, { value: "importante", label: "Importante" }] },
  { id: "acne-hormonale", sectionId: "hormones-femme", type: "select", label: "Acné hormonale ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "legere", label: "Légère" }, { value: "moderee", label: "Modérée" }, { value: "severe", label: "Sévère" }] },
  { id: "sopk", sectionId: "hormones-femme", type: "select", label: "Diagnostic SOPK ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "suspecte", label: "Suspecté" }, { value: "confirme", label: "Confirmé" }] },
  { id: "endometriose", sectionId: "hormones-femme", type: "select", label: "Diagnostic endométriose ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "suspecte", label: "Suspecté" }, { value: "confirme", label: "Confirmé" }] },
  { id: "douleurs-menstruelles", sectionId: "hormones-femme", type: "select", label: "Douleurs menstruelles ?", tier: "essential", showFor: "femme", options: [{ value: "aucune", label: "Aucune" }, { value: "legeres", label: "Légères" }, { value: "moderees", label: "Modérées" }, { value: "fortes", label: "Fortes" }, { value: "incapacitantes", label: "Incapacitantes" }] },
  { id: "spm-intensite", sectionId: "hormones-femme", type: "select", label: "Syndrome prémenstruel ?", tier: "essential", showFor: "femme", options: [{ value: "aucun", label: "Aucun" }, { value: "leger", label: "Léger" }, { value: "modere", label: "Modéré" }, { value: "severe", label: "Sévère" }] },
  { id: "libido-femme", sectionId: "hormones-femme", type: "select", label: "Niveau de libido ?", tier: "essential", showFor: "femme", options: [{ value: "elevee", label: "Élevée" }, { value: "normale", label: "Normale" }, { value: "basse", label: "Basse" }, { value: "absente", label: "Absente" }] },
  { id: "secheresse-vaginale", sectionId: "hormones-femme", type: "select", label: "Sécheresse vaginale ?", tier: "essential", showFor: "femme", options: [{ value: "non", label: "Non" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "constante", label: "Constante" }] },
  { id: "prise-gras-femme", sectionId: "hormones-femme", type: "select", label: "Facilité à prendre du gras ?", tier: "essential", showFor: "femme", options: [{ value: "tres-difficile", label: "Très difficile" }, { value: "difficile", label: "Difficile" }, { value: "normal", label: "Normal" }, { value: "facile", label: "Facile" }] },
  { id: "retention-eau", sectionId: "hormones-femme", type: "select", label: "Rétention d'eau ?", tier: "essential", showFor: "femme", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },
  { id: "cellulite", sectionId: "hormones-femme", type: "select", label: "Présence de cellulite ?", tier: "essential", showFor: "femme", options: [{ value: "aucune", label: "Aucune" }, { value: "legere", label: "Légère" }, { value: "moderee", label: "Modérée" }, { value: "importante", label: "Importante" }] },
  { id: "bouffees-chaleur", sectionId: "hormones-femme", type: "select", label: "Bouffées de chaleur ?", tier: "essential", showFor: "femme", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "tres-souvent", label: "Très souvent" }] },

  // AXES CLINIQUES (10 questions)
  { id: "symptomes-thyroide", sectionId: "axes-cliniques", type: "select", label: "Symptômes thyroïdiens ?", tier: "essential", options: [{ value: "aucun", label: "Aucun" }, { value: "hypo", label: "Fatigue/frilosité (hypo)" }, { value: "hyper", label: "Nervosité/palpitations (hyper)" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "diagnostic-thyroide", sectionId: "axes-cliniques", type: "select", label: "Problème thyroïde diagnostiqué ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "hypothyroidie", label: "Hypothyroïdie" }, { value: "hyperthyroidie", label: "Hyperthyroïdie" }, { value: "hashimoto", label: "Hashimoto" }] },
  { id: "antecedents-thyroide", sectionId: "axes-cliniques", type: "select", label: "Antécédents thyroïde famille ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "oui", label: "Oui" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "sii-symptomes", sectionId: "axes-cliniques", type: "select", label: "Symptômes intestin irritable ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "ballonnements", label: "Ballonnements fréquents" }, { value: "alternance", label: "Alternance diarrhée/constipation" }, { value: "douleurs", label: "Douleurs abdominales" }, { value: "plusieurs", label: "Plusieurs symptômes" }] },
  { id: "diagnostic-sii", sectionId: "axes-cliniques", type: "select", label: "Diagnostic SII/colopathie ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "suspecte", label: "Suspecté" }, { value: "confirme", label: "Confirmé" }] },
  { id: "faim-constante", sectionId: "axes-cliniques", type: "select", label: "Faim constante / envies sucrées ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "constamment", label: "Constamment" }] },
  { id: "fatigue-post-prandiale", sectionId: "axes-cliniques", type: "select", label: "Fatigue après les repas ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }, { value: "toujours", label: "Toujours" }] },
  { id: "antecedents-diabete", sectionId: "axes-cliniques", type: "select", label: "Antécédents diabète famille ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "oui", label: "Oui" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "acanthosis", sectionId: "axes-cliniques", type: "select", label: "Zones de peau foncée (cou, aisselles) ?", tier: "essential", options: [{ value: "non", label: "Non" }, { value: "legeres", label: "Légères" }, { value: "marquees", label: "Marquées" }] },
  { id: "medications", sectionId: "axes-cliniques", type: "text", label: "Médicaments actuels ?", tier: "essential", placeholder: "Ex: Lévothyrox, antidépresseurs, etc." },

  // SUPPLÉMENTS (10 questions)
  { id: "budget-supplements", sectionId: "supplements", type: "select", label: "Budget mensuel suppléments ?", tier: "essential", options: [{ value: "0", label: "0€" }, { value: "moins-30", label: "<30€" }, { value: "30-60", label: "30-60€" }, { value: "60-100", label: "60-100€" }, { value: "100+", label: ">100€" }] },
  { id: "supplements-actuels", sectionId: "supplements", type: "checkbox", label: "Suppléments actuels ?", tier: "essential", options: [{ value: "whey", label: "Whey/Protéine" }, { value: "creatine", label: "Créatine" }, { value: "omega3", label: "Omega-3" }, { value: "vitamine-d", label: "Vitamine D" }, { value: "magnesium", label: "Magnésium" }, { value: "zinc", label: "Zinc" }, { value: "multivitamines", label: "Multivitamines" }, { value: "aucun", label: "Aucun" }] },
  { id: "probiotiques", sectionId: "supplements", type: "select", label: "Probiotiques ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "regulierement", label: "Régulièrement" }] },
  { id: "adaptogenes", sectionId: "supplements", type: "checkbox", label: "Adaptogènes utilisés ?", tier: "essential", options: [{ value: "ashwagandha", label: "Ashwagandha" }, { value: "rhodiola", label: "Rhodiola" }, { value: "ginseng", label: "Ginseng" }, { value: "aucun", label: "Aucun" }] },
  { id: "pre-workout", sectionId: "supplements", type: "select", label: "Pré-workout ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "parfois", label: "Parfois" }, { value: "toujours", label: "Toujours" }] },

  // BIOMARQUEURS (10 questions)
  { id: "bilan-sanguin", sectionId: "biomarqueurs", type: "select", label: "Dernier bilan sanguin ?", tier: "essential", options: [{ value: "jamais", label: "Jamais" }, { value: "plus-1an", label: "+1 an" }, { value: "6-12mois", label: "6-12 mois" }, { value: "moins-6mois", label: "<6 mois" }] },
  { id: "glycemie", sectionId: "biomarqueurs", type: "select", label: "Glycémie à jeun ?", tier: "essential", options: [{ value: "normale", label: "Normale" }, { value: "elevee", label: "Élevée" }, { value: "basse", label: "Basse" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "cholesterol", sectionId: "biomarqueurs", type: "select", label: "Cholestérol ?", tier: "essential", options: [{ value: "normal", label: "Normal" }, { value: "eleve", label: "Élevé" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "vitamine-d-statut", sectionId: "biomarqueurs", type: "select", label: "Vitamine D ?", tier: "essential", options: [{ value: "deficient", label: "Déficient" }, { value: "insuffisant", label: "Insuffisant" }, { value: "optimal", label: "Optimal" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "fer-statut", sectionId: "biomarqueurs", type: "select", label: "Fer/Ferritine ?", tier: "essential", options: [{ value: "bas", label: "Bas" }, { value: "normal", label: "Normal" }, { value: "eleve", label: "Élevé" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "testosterone-statut", sectionId: "biomarqueurs", type: "select", label: "Testostérone ?", tier: "essential", showFor: "homme", options: [{ value: "bas", label: "Bas" }, { value: "normal", label: "Normal" }, { value: "eleve", label: "Élevé" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "estrogenes-statut", sectionId: "biomarqueurs", type: "select", label: "Estrogènes ?", tier: "essential", showFor: "femme", options: [{ value: "bas", label: "Bas" }, { value: "normal", label: "Normal" }, { value: "eleve", label: "Élevé" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "crp-inflammation", sectionId: "biomarqueurs", type: "select", label: "Marqueurs inflammation (CRP) ?", tier: "essential", options: [{ value: "normal", label: "Normal" }, { value: "eleve", label: "Élevé" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },

  // COMPOSITION CORPORELLE (8 questions)
  { id: "masse-grasse-estimee", sectionId: "composition-corporelle", type: "select", label: "Masse grasse estimée ?", tier: "essential", options: [{ value: "10-15", label: "10-15% (très sec)" }, { value: "15-20", label: "15-20% (athlétique)" }, { value: "20-25", label: "20-25% (moyen)" }, { value: "25-30", label: "25-30% (surplus)" }, { value: "30+", label: "30%+" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "morphologie", sectionId: "composition-corporelle", type: "select", label: "Type morphologique ?", tier: "essential", options: [{ value: "ectomorphe", label: "Ectomorphe (mince)" }, { value: "mesomorphe", label: "Mésomorphe (athlétique)" }, { value: "endomorphe", label: "Endomorphe (stocke facilement)" }] },
  { id: "zones-stockage", sectionId: "composition-corporelle", type: "checkbox", label: "Zones de stockage ?", tier: "essential", options: [{ value: "ventre", label: "Ventre" }, { value: "hanches", label: "Hanches" }, { value: "cuisses", label: "Cuisses" }, { value: "bras", label: "Bras" }, { value: "dos", label: "Dos" }, { value: "uniforme", label: "Uniforme" }] },
  { id: "evolution-poids", sectionId: "composition-corporelle", type: "select", label: "Évolution poids 6 derniers mois ?", tier: "essential", options: [{ value: "stable", label: "Stable" }, { value: "perte", label: "Perte" }, { value: "gain", label: "Gain" }, { value: "yoyo", label: "Yoyo" }] },
  { id: "objectif-poids", sectionId: "composition-corporelle", type: "select", label: "Objectif de poids ?", tier: "essential", options: [{ value: "perdre-10+", label: "Perdre +10kg" }, { value: "perdre-5-10", label: "Perdre 5-10kg" }, { value: "perdre-1-5", label: "Perdre 1-5kg" }, { value: "maintenir", label: "Maintenir" }, { value: "prendre-1-5", label: "Prendre 1-5kg" }, { value: "prendre-5+", label: "Prendre +5kg" }] },
];

// ============================================================================
// QUESTIONS - PRO PANEL 360 (ajoutées aux ANABOLIC BIOSCAN)
// ============================================================================

export const QUESTIONS_ELITE: Question[] = [
  // NUTRITION TIMING (15 questions)
  { id: "glucides-reveil", sectionId: "nutrition-timing", type: "select", label: "Glucides dès le réveil ?", tier: "elite", options: [{ value: "oui-rapides", label: "Oui (céréales, pain, jus)" }, { value: "oui-complexes", label: "Oui (flocons d'avoine)" }, { value: "non-proteines", label: "Non (protéines/lipides)" }, { value: "jeune", label: "Jeûne" }] },
  { id: "diner-glucides", sectionId: "nutrition-timing", type: "select", label: "Dîner riche en glucides ?", tier: "elite", options: [{ value: "tres-riche", label: "Très riche" }, { value: "modere", label: "Modéré" }, { value: "faible", label: "Faible" }, { value: "zero", label: "Quasi zéro" }] },
  { id: "glucides-pre-cardio", sectionId: "nutrition-timing", type: "select", label: "Glucides avant cardio ?", tier: "elite", options: [{ value: "oui", label: "Oui" }, { value: "non", label: "Non (lipolyse max)" }, { value: "parfois", label: "Parfois" }, { value: "pas-cardio", label: "Pas de cardio" }] },
  { id: "glucides-pre-muscu", sectionId: "nutrition-timing", type: "select", label: "Glucides avant musculation ?", tier: "elite", options: [{ value: "oui-repas", label: "Oui (repas complet)" }, { value: "oui-collation", label: "Oui (collation)" }, { value: "non", label: "Non (à jeun)" }, { value: "pas-muscu", label: "Pas de muscu" }] },
  { id: "glucides-intra", sectionId: "nutrition-timing", type: "select", label: "Glucides pendant l'entraînement ?", tier: "elite", options: [{ value: "oui-boisson", label: "Oui (boisson)" }, { value: "oui-solide", label: "Oui (banane, barre)" }, { value: "non", label: "Non" }] },
  { id: "bcaa-intra", sectionId: "nutrition-timing", type: "select", label: "BCAA/EAA pendant l'entraînement ?", tier: "elite", options: [{ value: "oui-bcaa", label: "BCAA" }, { value: "oui-eaa", label: "EAA" }, { value: "non", label: "Non" }] },
  { id: "repas-post-training", sectionId: "nutrition-timing", type: "select", label: "Délai repas post-training ?", tier: "elite", options: [{ value: "immediat", label: "<30 min" }, { value: "1h", label: "Dans l'heure" }, { value: "2h", label: "1-2h" }, { value: "plus", label: "+2h" }] },
  { id: "shake-post", sectionId: "nutrition-timing", type: "select", label: "Shake post-training ?", tier: "elite", options: [{ value: "whey-seule", label: "Whey seule" }, { value: "whey-glucides", label: "Whey + glucides" }, { value: "gaineur", label: "Gaineur" }, { value: "non", label: "Non" }] },
  { id: "timing-training", sectionId: "nutrition-timing", type: "select", label: "Moment de l'entraînement ?", tier: "elite", options: [{ value: "matin-jeun", label: "Matin à jeun" }, { value: "matin-post-pdj", label: "Matin après petit-déj" }, { value: "midi", label: "Midi" }, { value: "aprem", label: "Après-midi" }, { value: "soir", label: "Soir (18h+)" }] },

  // CARDIO & PERFORMANCE (12 questions)
  { id: "cardio-frequence", sectionId: "cardio-performance", type: "select", label: "Séances cardio/semaine ?", tier: "elite", options: [{ value: "0", label: "0" }, { value: "1-2", label: "1-2" }, { value: "3-4", label: "3-4" }, { value: "5+", label: "5+" }] },
  { id: "zone2-connaissance", sectionId: "cardio-performance", type: "select", label: "Connais-tu l'entraînement Zone 2 ?", tier: "elite", options: [{ value: "non", label: "Non" }, { value: "vaguement", label: "Vaguement" }, { value: "oui-pas-pratique", label: "Oui mais pas pratiqué" }, { value: "oui-pratique", label: "Oui et pratiqué" }] },
  { id: "zone2-temps", sectionId: "cardio-performance", type: "select", label: "Temps en Zone 2/semaine ?", tier: "elite", options: [{ value: "0", label: "0 min" }, { value: "moins-60", label: "<60 min" }, { value: "60-120", label: "60-120 min" }, { value: "120-180", label: "120-180 min" }, { value: "180+", label: "180+ min" }] },
  { id: "vo2max", sectionId: "cardio-performance", type: "select", label: "VO2max estimée ?", tier: "elite", options: [{ value: "moins-30", label: "<30 (faible)" }, { value: "30-40", label: "30-40 (moyen)" }, { value: "40-50", label: "40-50 (bon)" }, { value: "50+", label: "50+ (excellent)" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "fc-cardio", sectionId: "cardio-performance", type: "select", label: "FC en cardio ?", tier: "elite", options: [{ value: "moins-120", label: "<120 bpm" }, { value: "120-140", label: "120-140 bpm (Zone 2)" }, { value: "140-160", label: "140-160 bpm (Zone 3)" }, { value: "160+", label: "160+ bpm (Zone 4+)" }, { value: "pas-mesure", label: "Pas mesuré" }] },
  { id: "hiit-ratio", sectionId: "cardio-performance", type: "select", label: "Ratio HIIT vs basse intensité ?", tier: "elite", options: [{ value: "100-hiit", label: "100% HIIT" }, { value: "80-hiit", label: "80% HIIT" }, { value: "50-50", label: "50/50" }, { value: "20-hiit", label: "20% HIIT" }, { value: "100-liss", label: "100% basse intensité" }] },
  { id: "lactate-threshold", sectionId: "cardio-performance", type: "select", label: "Connais-tu ton seuil lactique ?", tier: "elite", options: [{ value: "non", label: "Non" }, { value: "oui-test", label: "Oui (test labo)" }, { value: "oui-estime", label: "Oui (estimé montre)" }, { value: "ne-sais-pas", label: "C'est quoi ?" }] },

  // HRV & CARDIAQUE (8 questions)
  { id: "hrv-mesure", sectionId: "hrv-cardiaque", type: "select", label: "Mesures-tu ta HRV ?", tier: "elite", options: [{ value: "non", label: "Non" }, { value: "parfois", label: "Parfois" }, { value: "regulierement", label: "Régulièrement" }] },
  { id: "hrv-valeur", sectionId: "hrv-cardiaque", type: "select", label: "HRV moyenne ?", tier: "elite", options: [{ value: "moins-30", label: "<30 ms" }, { value: "30-50", label: "30-50 ms" }, { value: "50-70", label: "50-70 ms" }, { value: "70+", label: "70+ ms" }, { value: "ne-sais-pas", label: "Je ne sais pas" }] },
  { id: "fc-repos", sectionId: "hrv-cardiaque", type: "select", label: "FC au repos ?", tier: "elite", options: [{ value: "moins-50", label: "<50 bpm" }, { value: "50-60", label: "50-60 bpm" }, { value: "60-70", label: "60-70 bpm" }, { value: "70-80", label: "70-80 bpm" }, { value: "80+", label: "80+ bpm" }] },
  { id: "montre-connectee", sectionId: "hrv-cardiaque", type: "select", label: "Montre connectée ?", tier: "elite", options: [{ value: "non", label: "Non" }, { value: "apple", label: "Apple Watch" }, { value: "garmin", label: "Garmin" }, { value: "oura", label: "Oura Ring" }, { value: "whoop", label: "WHOOP" }, { value: "autre", label: "Autre" }] },
  { id: "palpitations", sectionId: "hrv-cardiaque", type: "select", label: "Palpitations ?", tier: "elite", options: [{ value: "jamais", label: "Jamais" }, { value: "rarement", label: "Rarement" }, { value: "parfois", label: "Parfois" }, { value: "souvent", label: "Souvent" }] },

  // BLESSURES & DOULEURS (15 questions)
  { id: "douleur-actuelle", sectionId: "blessures-douleurs", type: "select", label: "Douleur actuelle gênant l'entraînement ?", tier: "elite", options: [{ value: "non", label: "Non" }, { value: "legere", label: "Légère (gêne)" }, { value: "moderee", label: "Modérée (adapte mes exos)" }, { value: "severe", label: "Sévère (limite fort)" }] },
  { id: "zones-douleur", sectionId: "blessures-douleurs", type: "checkbox", label: "Zone(s) de douleur ?", tier: "elite", options: [{ value: "epaule", label: "Épaule" }, { value: "coude", label: "Coude" }, { value: "poignet", label: "Poignet" }, { value: "dos-haut", label: "Haut du dos" }, { value: "dos-bas", label: "Bas du dos/lombaires" }, { value: "hanche", label: "Hanche" }, { value: "genou", label: "Genou" }, { value: "cheville", label: "Cheville" }, { value: "aucune", label: "Aucune" }] },
  { id: "type-douleur", sectionId: "blessures-douleurs", type: "select", label: "Type de douleur principale ?", tier: "elite", options: [{ value: "aucune", label: "Aucune" }, { value: "articulaire", label: "Articulaire (dans l'articulation)" }, { value: "musculaire", label: "Musculaire (tension, contracture)" }, { value: "tendineux", label: "Tendineux (insertion)" }, { value: "nerveux", label: "Nerveux (irradiation, fourmillements)" }] },
  { id: "douleur-moment", sectionId: "blessures-douleurs", type: "checkbox", label: "Quand la douleur apparaît ?", tier: "elite", options: [{ value: "repos", label: "Au repos" }, { value: "pendant-exo", label: "Pendant l'exercice" }, { value: "apres-exo", label: "Après l'exercice" }, { value: "matin", label: "Au réveil" }, { value: "fin-journee", label: "Fin de journée" }, { value: "jamais", label: "Pas de douleur" }] },
  { id: "blessures-passees", sectionId: "blessures-douleurs", type: "checkbox", label: "Blessures passées significatives ?", tier: "elite", options: [{ value: "tendinite", label: "Tendinite" }, { value: "entorse", label: "Entorse" }, { value: "fracture", label: "Fracture" }, { value: "hernie", label: "Hernie discale" }, { value: "dechirure", label: "Déchirure musculaire" }, { value: "luxation", label: "Luxation" }, { value: "chirurgie", label: "Chirurgie articulaire" }, { value: "aucune", label: "Aucune" }] },
  { id: "epaule-douleur-detail", sectionId: "blessures-douleurs", type: "select", label: "Douleur épaule - Quand ?", tier: "elite", conditionalOn: "zones-douleur:epaule", options: [{ value: "developpe", label: "Développé (pec/épaule)" }, { value: "traction", label: "Traction/rowing" }, { value: "elevation-lat", label: "Élévations latérales" }, { value: "rotation", label: "Rotation interne/externe" }, { value: "tous", label: "Tous les mouvements" }] },
  { id: "dos-douleur-detail", sectionId: "blessures-douleurs", type: "select", label: "Douleur dos - Quand ?", tier: "elite", conditionalOn: "zones-douleur:dos-bas", options: [{ value: "squat", label: "Squat" }, { value: "souleve-terre", label: "Soulevé de terre" }, { value: "assis-prolonge", label: "Position assise prolongée" }, { value: "flexion", label: "Flexion vers l'avant" }, { value: "extension", label: "Extension du dos" }] },
  { id: "genou-douleur-detail", sectionId: "blessures-douleurs", type: "select", label: "Douleur genou - Quand ?", tier: "elite", conditionalOn: "zones-douleur:genou", options: [{ value: "squat-profond", label: "Squat profond" }, { value: "fente", label: "Fentes" }, { value: "course", label: "Course/cardio" }, { value: "escaliers", label: "Montée d'escaliers" }, { value: "flexion-complete", label: "Flexion complète" }] },
  { id: "mobilite-generale", sectionId: "blessures-douleurs", type: "select", label: "Mobilité générale ?", tier: "elite", options: [{ value: "excellente", label: "Excellente" }, { value: "bonne", label: "Bonne" }, { value: "moyenne", label: "Moyenne" }, { value: "limitee", label: "Limitée" }, { value: "tres-limitee", label: "Très limitée" }] },
  { id: "mobilite-limitee", sectionId: "blessures-douleurs", type: "checkbox", label: "Zones de mobilité limitée ?", tier: "elite", options: [{ value: "epaule", label: "Épaules" }, { value: "thoracique", label: "Colonne thoracique" }, { value: "hanches", label: "Hanches" }, { value: "chevilles", label: "Chevilles" }, { value: "aucune", label: "Aucune" }] },
  { id: "echauffement", sectionId: "blessures-douleurs", type: "select", label: "Échauffement avant entraînement ?", tier: "elite", options: [{ value: "complet", label: "Complet (10-15min)" }, { value: "rapide", label: "Rapide (5min)" }, { value: "minimal", label: "Minimal (quelques séries)" }, { value: "aucun", label: "Aucun" }] },
  { id: "travail-mobilite", sectionId: "blessures-douleurs", type: "select", label: "Travail de mobilité/étirements ?", tier: "elite", options: [{ value: "quotidien", label: "Quotidien" }, { value: "regulier", label: "2-3x/semaine" }, { value: "occasionnel", label: "Occasionnel" }, { value: "jamais", label: "Jamais" }] },
  { id: "suivi-kine-osteo", sectionId: "blessures-douleurs", type: "select", label: "Suivi kiné/ostéo ?", tier: "elite", options: [{ value: "regulier", label: "Régulier" }, { value: "ponctuel", label: "Ponctuel (quand ça fait mal)" }, { value: "jamais", label: "Jamais" }] },
  { id: "supplements-articulations", sectionId: "blessures-douleurs", type: "checkbox", label: "Suppléments pour articulations ?", tier: "elite", options: [{ value: "glucosamine", label: "Glucosamine" }, { value: "chondroitine", label: "Chondroïtine" }, { value: "collagene", label: "Collagène" }, { value: "curcuma", label: "Curcuma" }, { value: "omega3", label: "Omega-3 (pour inflammation)" }, { value: "aucun", label: "Aucun" }] },
  { id: "adaptations-exos", sectionId: "blessures-douleurs", type: "textarea", label: "Exercices que tu évites à cause de douleurs ?", tier: "elite", placeholder: "Ex: développé couché barre, squat profond, soulevé de terre..." },

  // PSYCHOLOGIE & MENTAL (10 questions)
  { id: "relation-nourriture", sectionId: "psychologie-mental", type: "select", label: "Relation avec la nourriture ?", tier: "elite", options: [{ value: "saine", label: "Saine" }, { value: "complexe", label: "Complexe mais gérée" }, { value: "difficile", label: "Difficile" }, { value: "problematique", label: "Problématique" }] },
  { id: "tca-historique", sectionId: "psychologie-mental", type: "select", label: "Troubles alimentaires ?", tier: "elite", options: [{ value: "jamais", label: "Jamais" }, { value: "passe", label: "Dans le passé" }, { value: "actuel", label: "Actuellement" }] },
  { id: "estime-soi", sectionId: "psychologie-mental", type: "select", label: "Estime de soi ?", tier: "elite", options: [{ value: "tres-basse", label: "Très basse" }, { value: "basse", label: "Basse" }, { value: "moyenne", label: "Moyenne" }, { value: "bonne", label: "Bonne" }, { value: "excellente", label: "Excellente" }] },
  { id: "motivation-profonde", sectionId: "psychologie-mental", type: "select", label: "Motivation profonde ?", tier: "elite", options: [{ value: "sante", label: "Santé long terme" }, { value: "apparence", label: "Apparence" }, { value: "performance", label: "Performance" }, { value: "mental", label: "Bien-être mental" }, { value: "prouver", label: "Me prouver quelque chose" }] },
  { id: "blocages", sectionId: "psychologie-mental", type: "checkbox", label: "Blocages personnels ?", tier: "elite", options: [{ value: "temps", label: "Manque de temps" }, { value: "motivation", label: "Manque de motivation" }, { value: "peur-echec", label: "Peur de l'échec" }, { value: "perfectionnisme", label: "Perfectionnisme" }, { value: "auto-sabotage", label: "Auto-sabotage" }, { value: "aucun", label: "Aucun" }] },
  { id: "soutien-social", sectionId: "psychologie-mental", type: "select", label: "Te sens-tu soutenu ?", tier: "elite", options: [{ value: "pas-du-tout", label: "Pas du tout" }, { value: "peu", label: "Peu" }, { value: "moyennement", label: "Moyennement" }, { value: "bien", label: "Bien" }, { value: "tres-bien", label: "Très bien" }] },
  { id: "objectif-transformation", sectionId: "psychologie-mental", type: "textarea", label: "Ton objectif de transformation profond ?", tier: "elite", placeholder: "Ex: Me sentir enfin bien dans mon corps..." },

  // ANALYSE PHOTO AI (3 questions)
  { id: "photo-front", sectionId: "analyse-photo", type: "photo", label: "Photo de FACE (debout, bras le long du corps)", tier: "elite", required: true },
  { id: "photo-side", sectionId: "analyse-photo", type: "photo", label: "Photo de PROFIL (côté droit)", tier: "elite", required: true },
  { id: "photo-back", sectionId: "analyse-photo", type: "photo", label: "Photo de DOS", tier: "elite", required: true },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all questions for a specific tier
 */
export function getQuestionsForTier(tier: QuestionTier): Question[] {
  switch (tier) {
    case "free":
      return QUESTIONS_FREE;
    case "essential":
      return [...QUESTIONS_FREE, ...QUESTIONS_ESSENTIAL];
    case "elite":
      return [...QUESTIONS_FREE, ...QUESTIONS_ESSENTIAL, ...QUESTIONS_ELITE];
    default:
      return QUESTIONS_FREE;
  }
}

/**
 * Get sections for a specific tier
 */
export function getSectionsForTier(tier: QuestionTier): Section[] {
  const tierOrder = { free: 0, essential: 1, elite: 2 };
  const currentTierOrder = tierOrder[tier];

  return SECTIONS.filter(section => {
    const sectionTierOrder = tierOrder[section.tier];
    return sectionTierOrder <= currentTierOrder;
  }).sort((a, b) => a.order - b.order);
}

/**
 * Filter questions by gender
 */
export function filterQuestionsByGender(questions: Question[], gender: "homme" | "femme"): Question[] {
  return questions.filter(q => !q.showFor || q.showFor === gender);
}

/**
 * Get question count for each tier
 */
export function getQuestionCounts(): { free: number; essential: number; elite: number } {
  return {
    free: QUESTIONS_FREE.length,
    essential: QUESTIONS_FREE.length + QUESTIONS_ESSENTIAL.length,
    elite: QUESTIONS_FREE.length + QUESTIONS_ESSENTIAL.length + QUESTIONS_ELITE.length,
  };
}

// Export counts for display
export const TIER_QUESTION_COUNTS = getQuestionCounts();
// Result: { free: ~50, essential: ~150, elite: ~210 }
