import { normalizeResponses } from "./responseNormalizer";

type Responses = Record<string, unknown>;

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveAgeBand(ageRaw: unknown): string | null {
  const numeric = parseNumeric(ageRaw);
  if (numeric !== null) {
    if (numeric >= 56) return "56+";
    if (numeric >= 46) return "46-55";
    if (numeric >= 36) return "36-45";
    if (numeric >= 26) return "26-35";
    if (numeric >= 18) return "18-25";
    return null;
  }
  const ageStr = typeof ageRaw === "string" ? ageRaw.trim() : "";
  if (!ageStr) return null;
  const known = ["18-25", "26-35", "36-45", "46-55", "56+"];
  return known.includes(ageStr) ? ageStr : null;
}

// Helper pour convertir une valeur en array de strings de façon sécurisée
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }
  if (typeof value === 'string' && value.trim()) {
    // Si c'est une string, on la split si elle contient des virgules
    if (value.includes(',')) {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [value];
  }
  return [];
}

interface SupplementProtocol {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  brands?: string[];
  warnings?: string;
}

interface SubMetric {
  name: string;
  score: number;
  status: "optimal" | "suboptimal" | "deficient" | "critical";
}

interface SectionScore {
  score: number;
  level: "excellent" | "bon" | "moyen" | "faible";
  summary: string;
  detailedAnalysis: string;
  recommendations: string[];
  insights: string[];
  subMetrics: SubMetric[];
  supplements: SupplementProtocol[];
  actionItems: string[];
  scienceExplainer: string;
}

interface AnalysisResult {
  global: number;
  globalSummary: string;
  sections: Record<string, SectionScore>;
  priorities: string[];
  strengths: string[];
  actionPlan: {
    week1: string[];
    week2: string[];
    week3_4: string[];
    month2_3: string[];
  };
  executiveSummary: string;
  supplementStack: SupplementProtocol[];
  lifestyleProtocol: string[];
}

const getLevel = (score: number): "excellent" | "bon" | "moyen" | "faible" => {
  if (score >= 80) return "excellent";
  if (score >= 65) return "bon";
  if (score >= 45) return "moyen";
  return "faible";
};

const getStatus = (score: number): "optimal" | "suboptimal" | "deficient" | "critical" => {
  if (score >= 80) return "optimal";
  if (score >= 60) return "suboptimal";
  if (score >= 40) return "deficient";
  return "critical";
};

export function analyzeProfilBase(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const age = responses["age"] as string;
  const ageBand = resolveAgeBand(age);
  const sexe = responses["sexe"] as string;
  const objectif = responses["objectif"] as string;
  const activite = responses["niveau-activite"] as string;
  const historique = toStringArray(responses["historique-medical"]);
  const profession = responses["profession"] as string;

  let activiteScore = 70;
  const activiteScores: Record<string, number> = { sedentaire: 30, leger: 50, modere: 70, actif: 85, intense: 95 };
  activiteScore = activiteScores[activite] || 70;
  subMetrics.push({ name: "Niveau d'activite", score: activiteScore, status: getStatus(activiteScore) });

  let ageScore = 80;
  if (ageBand === "46-55") ageScore = 65;
  else if (ageBand === "56+") ageScore = 50;
  subMetrics.push({ name: "Facteur age", score: ageScore, status: getStatus(ageScore) });

  score = Math.round((activiteScore + ageScore) / 2);

  if (historique && Array.isArray(historique) && !historique.includes("aucun")) {
    score -= historique.length * 5;
    
    if (historique.includes("diabete")) {
      insights.push("Ton historique de diabete indique une sensibilite a l'insuline compromise. Cela signifie que ton corps a du mal a utiliser efficacement le glucose sanguin, ce qui peut entrainer des pics glycemiques, une fatigue post-prandiale, et une difficulte accrue a perdre de la graisse viscérale. La resistance a l'insuline est souvent le precurseur de nombreuses pathologies metaboliques.");
      
      recommendations.push("Privilegier les glucides a index glycemique bas (IG < 55) : patates douces, quinoa, lentilles, legumes verts. Eviter categoriquement les sucres rapides et les feculents raffines.");
      recommendations.push("Implementer le concept de 'glucose goddess' : manger les fibres et proteines AVANT les glucides a chaque repas pour reduire les pics glycemiques de 30-40%.");
      recommendations.push("Marcher 10-15 minutes apres chaque repas pour ameliorer la clairance du glucose et reduire la glycemie post-prandiale.");
      
      supplements.push({
        name: "Berberine",
        dosage: "500mg 2-3x/jour",
        timing: "Avant les repas contenant des glucides",
        duration: "Cycles de 8 semaines avec 2 semaines de pause",
        why: "La berberine active l'AMPK (enzyme du metabolisme) et ameliore la sensibilite a l'insuline de maniere comparable a la metformine. Elle reduit la production hepatique de glucose et ameliore l'absorption du glucose par les muscles.",
        brands: ["Thorne Berberine", "NOW Foods Berberine Glucose Support"],
        warnings: "Ne pas combiner avec metformine sans avis medical. Peut causer des troubles digestifs initiaux."
      });
      
      supplements.push({
        name: "Chrome",
        dosage: "200-400mcg/jour",
        timing: "Avec le petit-dejeuner",
        duration: "Continue",
        why: "Le chrome potentialise l'action de l'insuline en aidant le glucose a penetrer dans les cellules. Une carence en chrome est frequente et aggrave la resistance a l'insuline.",
        brands: ["Thorne Chromium Picolinate", "Life Extension Optimized Chromium"]
      });
      
      actionItems.push("Investir dans un glucometre continu (CGM) type Freestyle Libre pour comprendre tes reponses glycemiques individuelles");
    }

    if (historique.includes("thyroide")) {
      insights.push("Les dysfonctionnements thyroidiens ont un impact majeur sur ton metabolisme basal, ta thermoregulation, ton energie et ta capacite a perdre ou prendre du poids. La thyroide est le 'thermostat' de ton corps - quand elle fonctionne au ralenti, tout ralentit : digestion, cognition, recuperation musculaire, et meme ton humeur.");
      
      recommendations.push("Faire un bilan thyroidien complet tous les 3-6 mois : TSH, T3L, T4L, anticorps anti-TPO et anti-TG, et idealement la reverse T3 (rT3).");
      recommendations.push("Verifier les cofacteurs thyroidiens : iode, selenium, zinc, fer et vitamine D - tous essentiels a la conversion T4>T3.");
      recommendations.push("Eviter les perturbateurs endocriniens : plastiques (BPA), pesticides, fluor, brome. Filtrer ton eau et privilegier le bio.");
      
      supplements.push({
        name: "Selenium",
        dosage: "200mcg/jour",
        timing: "Avec le repas du midi",
        duration: "Continue",
        why: "Le selenium est essentiel a la deiodinase, l'enzyme qui convertit la T4 (inactive) en T3 (active). Sans selenium suffisant, tu peux avoir une TSH normale mais une conversion deficiente.",
        brands: ["Life Extension Super Selenium", "Thorne Selenium"]
      });
      
      supplements.push({
        name: "Zinc",
        dosage: "25-30mg/jour",
        timing: "Le soir, loin des repas riches en fibres",
        duration: "Continue",
        why: "Le zinc est un cofacteur de la conversion T4>T3 et module les recepteurs thyroidiens. Une carence est tres frequente, surtout chez les sportifs et vegetariens.",
        brands: ["Thorne Zinc Picolinate", "NOW Foods Zinc Glycinate"]
      });
    }
  }

  if (profession === "bureau" || profession === "teletravail") {
    if (activite === "sedentaire" || activite === "leger") {
      insights.push("La sedentarite professionnelle combinee a un faible niveau d'activite constitue un facteur de risque metabolique majeur. La position assise prolongee desactive la lipoproteine lipase (enzyme brulant les graisses), reduit la sensibilite a l'insuline, et favorise l'atrophie musculaire. On parle de 'sitting disease' - rester assis plus de 6h/jour augmente le risque cardiovasculaire de 18% meme si tu fais du sport.");
      
      recommendations.push("Implementer la regle des 45 minutes : toutes les 45 min, 2-3 minutes de mouvement (squats, marche, etirements). Utiliser un timer ou une app comme 'Stand Up!'");
      recommendations.push("Investir dans un bureau assis-debout et alterner les positions toutes les heures. L'alternance est plus benefique que rester debout toute la journee.");
      recommendations.push("Faire tes appels telephoniques en marchant - c'est du NEAT (Non-Exercise Activity Thermogenesis) gratuit qui peut bruler 200-300 kcal supplementaires par jour.");
      
      actionItems.push("Commander un bureau assis-debout ou un convertisseur de bureau");
      actionItems.push("Installer une app de rappel de mouvement sur ton telephone");
    }
  }

  if (objectif === "perte-graisse") {
    insights.push("Pour la perte de graisse durable, le deficit calorique seul ne suffit pas. La science moderne du biohacking montre que l'optimisation hormonale (insuline, cortisol, leptin, ghrelin) est tout aussi importante. Un deficit trop agressif (>500kcal) declenche une adaptation metabolique qui ralentit ta depense et augmente la faim. La strategie optimale combine un deficit modere (300-400kcal), une chrono-nutrition intelligente, et des interventions specifiques pour maintenir la masse musculaire.");
    
    recommendations.push("Viser un deficit de 300-400 kcal maximum pour preserver le metabolisme. Calculer ta maintenance reelle avec 2 semaines de tracking precis.");
    recommendations.push("Prioriser les proteines : 2-2.2g/kg de poids corporel minimum, reparties sur 4-5 prises de 30-40g pour maximiser la synthese proteique et la satiete.");
    recommendations.push("Implementer des refeeds strategiques : 1 jour par semaine a maintenance calorique avec surplus de glucides pour relancer la leptin et eviter l'adaptation metabolique.");
    
    if (ageBand === "36-45" || ageBand === "46-55" || ageBand === "56+") {
      insights.push("Apres 35-40 ans, la perte de graisse devient plus complexe en raison du declin hormonal progressif (testosterone, hormone de croissance, DHEA). La resistance a l'insuline s'installe plus facilement, la masse musculaire diminue (sarcopenie), et le cortisol a tendance a rester eleve plus longtemps. Une approche holistique ciblant ces parametres est essentielle.");
      
      supplements.push({
        name: "DHEA",
        dosage: "25-50mg/jour (homme), 10-25mg/jour (femme)",
        timing: "Le matin",
        duration: "Selon bilans hormonaux",
        why: "La DHEA est le precurseur des hormones sexuelles. Son declin avec l'age accelere la perte musculaire et le stockage graisseux abdominal. La supplementation peut ameliorer la composition corporelle et l'energie.",
        brands: ["Life Extension DHEA", "Pure Encapsulations DHEA"],
        warnings: "Faire un bilan hormonal avant supplementation. Contre-indique si antecedents de cancers hormonodependants."
      });
    }
  } else if (objectif === "prise-muscle") {
    insights.push("La prise de muscle (hypertrophie) repose sur trois piliers : stimulus mecanique adequat, surplus proteique suffisant, et recuperation optimale. Le concept de 'muscle protein synthesis' (MPS) est central : il faut declencher cette synthese 4-5 fois par jour via des apports proteiques reguliers de 0.4-0.5g/kg par prise. Le timing post-entrainement reste important mais la fenetre anabolique est plus large qu'on ne le pensait (plusieurs heures).");
    
    recommendations.push("Surplus calorique modere de 200-350 kcal pour minimiser le gain de gras tout en optimisant la croissance musculaire.");
    recommendations.push("Proteines : 1.8-2.2g/kg reparties en 4-5 prises, avec une dose de 40g dans les 2-3h post-entrainement.");
    recommendations.push("Creatine monohydrate : 5g/jour, tous les jours, le supplement le plus etudie et efficace pour la prise de force et de masse.");
    
    supplements.push({
      name: "Creatine Monohydrate",
      dosage: "5g/jour",
      timing: "A n'importe quel moment, la regularite compte plus que le timing",
      duration: "Continue, pas besoin de cyclage",
      why: "La creatine augmente les reserves de phosphocreatine musculaire, permettant plus de reps et de charges plus lourdes. Elle favorise aussi l'hydratation cellulaire et peut avoir des benefices cognitifs.",
      brands: ["Creapure (label de qualite)", "Thorne Creatine", "Nutricost Creatine Monohydrate"]
    });
    
    if (sexe === "femme") {
      insights.push("La prise de muscle feminine presente des specificites importantes. Le cycle menstruel influence la performance et la recuperation : la phase folliculaire (post-regles) est optimale pour les entrainements intensifs, tandis que la phase luteale peut necessiter une reduction du volume. Les femmes ont generalement besoin de plus de volume d'entrainement pour progresser.");
    }
  } else if (objectif === "energie") {
    insights.push("L'optimisation energetique passe par trois axes majeurs : la sante mitochondriale (les 'centrales energetiques' de tes cellules), la stabilite glycemique (eviter les montagnes russes de sucre), et la qualite du sommeil profond (ou se fait la restauration cellulaire). L'energie n'est pas une question de stimulants mais de fondations metaboliques solides.");
    
    recommendations.push("Stabiliser la glycemie : eviter les petits-dejeuners sucres, privilegier proteines + lipides le matin pour une energie stable.");
    recommendations.push("Optimiser les mitochondries via le froid (douches froides 30-60s), le jeune intermittent (12-16h), et l'exercice HIIT.");
    recommendations.push("Prioriser le sommeil profond : se coucher avant 23h, chambre a 18-19°C, zero ecran 1h avant.");
    
    supplements.push({
      name: "CoQ10 (Ubiquinol)",
      dosage: "100-200mg/jour",
      timing: "Avec un repas contenant des lipides",
      duration: "Continue",
      why: "Le CoQ10 est essentiel a la chaine de transport des electrons dans les mitochondries. Apres 30-40 ans, la production endogene diminue. La forme ubiquinol est mieux absorbee que l'ubiquinone.",
      brands: ["Jarrow Ubiquinol QH-Absorb", "Life Extension Super Ubiquinol CoQ10"]
    });
    
    supplements.push({
      name: "PQQ (Pyrroloquinoline quinone)",
      dosage: "10-20mg/jour",
      timing: "Le matin avec le CoQ10",
      duration: "Continue",
      why: "Le PQQ favorise la biogenese mitochondriale - la creation de nouvelles mitochondries. C'est l'un des rares composes a pouvoir augmenter le nombre de tes centrales energetiques.",
      brands: ["Life Extension PQQ", "Jarrow PQQ"]
    });
  }

  let detailedAnalysis = `Ton profil de base revele ${score >= 70 ? "des fondations globalement solides" : score >= 50 ? "des opportunites d'amelioration significatives" : "des zones d'attention prioritaires"} pour atteindre tes objectifs. `;
  
  if (sexe === "homme") {
    detailedAnalysis += `En tant qu'homme${age ? " dans la tranche " + age : ""}, certains parametres specifiques meritent attention : `;
    if (age === "36-45" || age === "46-55") {
      detailedAnalysis += `le declin progressif de la testosterone (1-2% par an apres 30 ans) impacte ta composition corporelle, ton energie et ta recuperation. `;
    }
  } else if (sexe === "femme") {
    detailedAnalysis += `En tant que femme${age ? " dans la tranche " + age : ""}, le cycle hormonal et ses fluctuations influencent ta performance, ta retention d'eau et ton energie. `;
    if (age === "36-45" || age === "46-55") {
      detailedAnalysis += `La perimenopause peut commencer des 40 ans avec des impacts sur le metabolisme, le sommeil et la composition corporelle. `;
    }
  }

  let scienceExplainer = "Le profil de base integre tes facteurs individuels non modifiables (age, sexe) et modifiables (activite, profession). Ces elements constituent le 'terrain' sur lequel toutes les interventions seront construites. Un terrain favorable amplifie les resultats de toute optimisation, tandis qu'un terrain defavorable necessite d'abord des fondations solides avant d'aller plus loin dans le biohacking avance.";

  score = Math.max(20, Math.min(100, score));
  
  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Profil de base solide avec de bonnes fondations pour progresser." : "Ton profil necessite des ajustements fondamentaux pour optimiser les resultats.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeCompositionCorporelle(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const masseGrasse = responses["masse-grasse"] as string;
  const evolution = responses["evolution-poids"] as string;
  const morphologie = responses["morphologie"] as string;
  const zones = toStringArray(responses["zones-stockage"]);
  const retention = responses["retention-eau"] as string;
  const regimes = responses["regimes-passes"] as string;

  let mgScore = 70;
  const mgScores: Record<string, number> = { "10-15": 95, "16-20": 85, "21-25": 70, "26-30": 50, "30+": 30 };
  mgScore = mgScores[masseGrasse] || 70;
  subMetrics.push({ name: "Masse grasse", score: mgScore, status: getStatus(mgScore) });

  let evolutionScore = 80;
  if (evolution === "yoyo") {
    evolutionScore = 35;
    insights.push("L'effet yo-yo que tu decris est le signe d'une adaptation metabolique severe. Ton corps a 'appris' a fonctionner avec moins de calories et stocke agressivement des que l'apport augmente. Ce phenomene est lie a plusieurs mecanismes : diminution de la leptin (hormone de satiete), augmentation de la ghreline (hormone de la faim), reduction du metabolisme basal via la down-regulation de la T3, et modification de l'efficacite mitochondriale. Chaque regime restrictif 'grave' cette adaptation plus profondement.");
    
    recommendations.push("STOP aux regimes restrictifs pendant minimum 6 mois. Phase de reverse dieting : augmenter progressivement les calories de 50-100kcal par semaine jusqu'a atteindre ta vraie maintenance.");
    recommendations.push("Prioriser la reconstruction musculaire : plus de masse maigre = metabolisme basal plus eleve = plus de marge pour futurs deficits.");
    recommendations.push("Tracker ton poids uniquement en moyenne hebdomadaire pour reduire le stress du yo-yo quotidien qui affecte le cortisol.");
    
    actionItems.push("Calculer ta maintenance metabolique reelle avec 2-3 semaines de tracking precis");
    actionItems.push("Planifier une phase de reverse diet de 8-12 semaines");
  } else if (evolution === "stable") {
    evolutionScore = 90;
  } else if (evolution === "prise-progressive") {
    evolutionScore = 50;
  }
  subMetrics.push({ name: "Stabilite ponderale", score: evolutionScore, status: getStatus(evolutionScore) });

  let regimeScore = 90;
  if (regimes === "5+") {
    regimeScore = 30;
    insights.push("Plus de 5 regimes dans ton historique indiquent un pattern de restriction-recuperation chronique qui a probablement endommage ton metabolisme de maniere significative. La recherche montre que chaque cycle de regime peut reduire le metabolisme basal de 5-15%, et cette reduction persiste partiellement meme apres retour au poids initial. C'est le phenomene de 'metabolic damage' ou 'adaptive thermogenesis'.");
    
    supplements.push({
      name: "Ashwagandha KSM-66",
      dosage: "600mg/jour",
      timing: "Le soir avant le coucher",
      duration: "8-12 semaines puis reevaluation",
      why: "Les regimes repetitifs ont probablement eleve ton cortisol chronique. L'ashwagandha est un adaptogene qui normalise l'axe HPA et reduit le cortisol de 15-30%. Cela aide a la perte de graisse abdominale et ameliore la sensibilite a la leptin.",
      brands: ["KSM-66 (label de qualite)", "Jarrow Ashwagandha", "NOW Foods Ashwagandha"]
    });
  } else if (regimes === "3-5") {
    regimeScore = 50;
  } else if (regimes === "2-3") {
    regimeScore = 70;
  }
  subMetrics.push({ name: "Historique regimes", score: regimeScore, status: getStatus(regimeScore) });

  if (zones && zones.includes("ventre")) {
    insights.push("Le stockage abdominal est le marqueur numero un de la resistance a l'insuline et du desequilibre cortisol. La graisse viscerale (autour des organes) est metaboliquement active et secrete des cytokines pro-inflammatoires. Elle est aussi correllee au risque cardiovasculaire et au diabete de type 2. Bonne nouvelle : c'est aussi la premiere a partir avec les bonnes interventions.");
    
    recommendations.push("Reduire drastiquement les glucides raffines et sucres ajoutes - ce sont les principaux drivers du stockage abdominal via l'insuline.");
    recommendations.push("Implementer le jeune intermittent 16:8 qui reduit specifiquement la graisse viscerale en ameliorant la sensibilite a l'insuline.");
    recommendations.push("Gerer le stress chronique : le cortisol eleve favorise specifiquement le stockage abdominal via les recepteurs glucocorticoides.");
  }

  if (zones && zones.includes("hanches") && responses["sexe"] === "femme") {
    insights.push("Le stockage gluteo-femoral (hanches, cuisses, fessiers) est influence par les oestrogenes et constitue une reserve energetique evolutive pour la grossesse et l'allaitement. Cette graisse est plus 'resistante' aux regimes classiques mais repond bien a l'entrainement en resistance qui ameliore la vascularisation locale et l'acces aux cellules graisseuses.");
  }

  if (retention === "souvent" || retention === "chronique") {
    insights.push("La retention d'eau chronique peut indiquer plusieurs problemes : apport sodique excessif vs potassium, inflammation systemique, desequilibre hormonal (oestrogenes, aldosterone), ou insuffisance veineuse. Elle masque aussi les progres de perte de graisse et cause frustration et demotivation.");
    
    recommendations.push("Equilibrer le ratio sodium/potassium : viser 3-4g de potassium/jour via bananes, patates douces, epinards, avocats.");
    recommendations.push("Augmenter l'hydratation paradoxalement : 2.5-3L d'eau par jour signale au corps qu'il n'a pas besoin de retenir.");
    
    supplements.push({
      name: "Potassium",
      dosage: "500-1000mg/jour en complement de l'alimentation",
      timing: "Repartir sur la journee avec les repas",
      duration: "Continue",
      why: "Le potassium est l'antagoniste naturel du sodium. Il favorise l'elimination renale du sodium excessif et reduit la retention d'eau. La plupart des gens n'atteignent pas les 4.7g/jour recommandes.",
      brands: ["NOW Foods Potassium Gluconate", "Nutricost Potassium"]
    });
    
    supplements.push({
      name: "Pissenlit (Dandelion Root)",
      dosage: "500-1500mg/jour",
      timing: "Matin et midi",
      duration: "2-4 semaines puis pause",
      why: "Diuretique naturel doux qui favorise l'elimination de l'eau sans depeleter le potassium comme les diuretiques pharmaceutiques. Egalement benefique pour le foie.",
      brands: ["NOW Foods Dandelion Root", "Nature's Way Dandelion Root"]
    });
  }

  if (morphologie === "endomorphe") {
    insights.push("Le morphotype endomorphe se caracterise par une facilite a stocker les graisses, un metabolisme plus lent, et une meilleure sensibilite aux glucides (dans le mauvais sens). Genetiquement, ton corps est programme pour la survie en periode de famine - excellent pour nos ancetres, problematique dans notre environnement d'abondance actuel. Cela ne signifie pas que tu ne peux pas etre sec, mais que ta strategie doit etre plus rigoureuse.");
    
    recommendations.push("Adopter une approche low-carb ou cyclique : glucides bas les jours de repos, moderes les jours d'entrainement.");
    recommendations.push("Prioriser l'entrainement en resistance pour augmenter la masse musculaire et le metabolisme basal.");
    recommendations.push("Le cardio LISS (basse intensite longue duree) a jeun est particulierement efficace pour ce morphotype.");
  }

  score = Math.round((mgScore + evolutionScore + regimeScore) / 3);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton analyse de composition corporelle revele ${score >= 70 ? "un profil favorable" : score >= 50 ? "des opportunites d'amelioration" : "des defis significatifs"} pour atteindre une composition optimale. ${masseGrasse ? `Avec une masse grasse estimee a ${masseGrasse}%, ` : ""}${evolution === "yoyo" ? "l'historique de yo-yo indique une priorite absolue : stabiliser le metabolisme avant tout nouveau deficit." : "la stabilite de ton poids est un bon signe pour des interventions futures."}`;

  const scienceExplainer = "La composition corporelle va au-dela du simple poids sur la balance. Elle distingue masse grasse (sous-cutanee et viscerale) et masse maigre (muscles, os, organes). Le ratio entre ces compartiments determine ton metabolisme basal, ton profil hormonal, et ta sante metabolique. Un individu 'skinny fat' (poids normal mais masse grasse elevee) peut avoir plus de risques metaboliques qu'une personne plus lourde mais musclee.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Composition corporelle dans une fourchette acceptable." : "Ta composition corporelle necessite une attention particuliere.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeMetabolismeEnergie(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const energieMatin = responses["energie-matin"] as string;
  const energieApresMidi = responses["energie-apres-midi"] as string;
  const coupsFatigue = responses["coups-fatigue"] as string;
  const glycemie = responses["glycemie"] as string;
  const toleranceFroid = responses["tolerance-froid"] as string;
  const sudation = responses["sudation"] as string;

  let matinScore = 70;
  if (energieMatin === "haute") matinScore = 90;
  else if (energieMatin === "moyenne") matinScore = 65;
  else if (energieMatin === "basse") matinScore = 40;
  subMetrics.push({ name: "Energie matinale", score: matinScore, status: getStatus(matinScore) });

  let apmScore = 70;
  if (energieApresMidi === "haute") apmScore = 90;
  else if (energieApresMidi === "moyenne") apmScore = 65;
  else if (energieApresMidi === "basse") {
    apmScore = 40;
    insights.push("Le crash energetique de l'apres-midi (typiquement 14h-16h) est souvent le signe d'une instabilite glycemique. Apres un repas riche en glucides, l'insuline monte en fleche pour gerer le glucose, puis chute brutalement - emmenant ton energie avec elle. Ce 'food coma' n'est pas normal et indique que ton dejeuner n'est pas adapte.");
    
    recommendations.push("Restructurer le dejeuner : proteines + lipides + legumes en base, glucides en accompagnement modere (pas en plat principal).");
    recommendations.push("Ajouter des fibres au debut du repas : une salade en entree ralentit l'absorption des glucides suivants.");
    recommendations.push("Sieste strategique de 10-20 min si possible, ou marche digestive de 10 min post-dejeuner.");
  }
  subMetrics.push({ name: "Energie apres-midi", score: apmScore, status: getStatus(apmScore) });

  let fatigueScore = 80;
  if (coupsFatigue === "oui-quotidien") {
    fatigueScore = 30;
    insights.push("Des coups de fatigue quotidiens indiquent un dysfonctionnement metabolique significatif. Les causes les plus frequentes : instabilite glycemique, insuffisance thyroidienne subclinique, deficit en fer (surtout chez les femmes), carences en B12/B9, ou fatigue surrenalienne (HPA axis dysregulation). Un bilan complet est necessaire.");
    
    recommendations.push("Bilan sanguin complet : NFS, ferritine, B12, B9, thyroide complete (TSH, T3L, T4L), vitamine D.");
    recommendations.push("Eliminer les sucres rapides et espacer les repas de 4-5h pour stabiliser l'insuline.");
    
    supplements.push({
      name: "Complexe Vitamines B Methylees",
      dosage: "1 capsule/jour",
      timing: "Le matin avec le petit-dejeuner",
      duration: "Continue",
      why: "Les vitamines B sont essentielles a la production d'ATP (energie cellulaire). Les formes methylees (methylfolate, methylcobalamine) sont directement utilisables, contrairement aux formes synthetiques que certaines personnes ne convertissent pas bien (polymorphisme MTHFR).",
      brands: ["Thorne Basic B Complex", "Pure Encapsulations B-Complex Plus"]
    });
    
    actionItems.push("Programmer un bilan sanguin complet avec ton medecin");
  } else if (coupsFatigue === "oui-parfois") {
    fatigueScore = 60;
  }
  subMetrics.push({ name: "Stabilite energetique", score: fatigueScore, status: getStatus(fatigueScore) });

  let glycemieScore = 70;
  if (glycemie === "instable") {
    glycemieScore = 35;
    insights.push("L'instabilite glycemique que tu decris (faim intense, irritabilite, tremblements, puis soulagement apres manger) est le pattern classique de l'hypoglycemie reactionnelle. Apres un pic de glucose, l'insuline surcompense et fait chuter le sucre trop bas. C'est un cercle vicieux qui pousse a manger des glucides pour se sentir mieux... ce qui relance le cycle.");
    
    recommendations.push("Ne JAMAIS manger de glucides seuls : toujours les combiner avec proteines et/ou lipides pour ralentir l'absorption.");
    recommendations.push("Manger dans les 30-45 minutes apres le reveil pour stabiliser la glycemie matinale.");
    recommendations.push("Collations strategiques : amandes, fromage, oeuf dur - jamais de fruits seuls ou de barres sucrees.");
    
    supplements.push({
      name: "Cannelle de Ceylan",
      dosage: "1-2g/jour (1/2 cuillere a cafe)",
      timing: "Avec les repas contenant des glucides",
      duration: "Continue",
      why: "La cannelle de Ceylan (pas la cassia) ameliore la sensibilite a l'insuline et ralentit la vidange gastrique, reduisant les pics glycemiques. Etudes montrent une reduction de 10-30% de la glycemie post-prandiale.",
      brands: ["Ceylon Cinnamon (Verum)", "Simply Organic Ceylon Cinnamon"],
      warnings: "Utiliser la cannelle de Ceylan, pas la cassia qui contient de la coumarine toxique pour le foie a haute dose."
    });
    
    supplements.push({
      name: "Acide Alpha-Lipoique (ALA)",
      dosage: "300-600mg/jour",
      timing: "Avant les repas",
      duration: "Continue",
      why: "L'ALA est un antioxydant puissant qui ameliore la sensibilite a l'insuline et aide au transport du glucose dans les cellules. Il regenere aussi les autres antioxydants (vitamines C, E, glutathion).",
      brands: ["Life Extension Super R-Lipoic Acid", "NOW Foods Alpha Lipoic Acid"]
    });
  }
  subMetrics.push({ name: "Stabilite glycemique", score: glycemieScore, status: getStatus(glycemieScore) });

  if (toleranceFroid === "tres-sensible") {
    insights.push("Une intolerance marquee au froid peut indiquer une fonction thyroidienne sous-optimale ou un metabolisme basal ralenti. La thyroide est ton 'thermostat' - quand elle fonctionne au ralenti, ta production de chaleur diminue. D'autres signes a surveiller : fatigue, prise de poids, peau seche, cheveux cassants, constipation.");
    
    recommendations.push("Faire un bilan thyroidien complet incluant T3L (pas seulement TSH qui peut etre normale malgre une conversion T4>T3 deficiente).");
    recommendations.push("Exposition au froid progressive (douches froides) pour stimuler la thermogenese et la graisse brune.");
  }

  score = Math.round((matinScore + apmScore + fatigueScore + glycemieScore) / 4);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil metabolique et energetique montre ${score >= 70 ? "une machine qui tourne correctement" : score >= 50 ? "des signes de dysfonctionnement a adresser" : "des signaux d'alarme metaboliques importants"}. ${coupsFatigue === "oui-quotidien" ? "Les coups de fatigue quotidiens sont ta priorite numero un - sans energie stable, aucune autre optimisation ne sera efficace." : ""} ${glycemie === "instable" ? "L'instabilite glycemique doit etre corrigee en priorite via l'alimentation et potentiellement des supplements specifiques." : ""}`;

  const scienceExplainer = "Le metabolisme energetique repose sur les mitochondries - des organites presents dans chaque cellule qui convertissent les nutriments en ATP (adenosine triphosphate), la 'monnaie energetique' du corps. La sante mitochondriale depend de nombreux cofacteurs (CoQ10, NAD+, vitamines B) et est affectee par l'inflammation, le stress oxidatif, et les toxines. Optimiser tes mitochondries = optimiser ton energie fondamentale.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Metabolisme energetique fonctionnel." : "Ton metabolisme energetique necessite une optimisation.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeNutritionTracking(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const repasJour = responses["repas-jour"] as string;
  const petitDej = responses["petit-dejeuner"] as string;
  const proteines = responses["proteines-repas"] as string;
  const legumes = responses["legumes-jour"] as string;
  const hydratation = responses["hydratation"] as string;
  const tracking = responses["tracking"] as string;
  const sups = toStringArray(responses["supplements"]);

  let proteineScore = 70;
  if (proteines === "4+") proteineScore = 95;
  else if (proteines === "3") proteineScore = 80;
  else if (proteines === "1-2") {
    proteineScore = 45;
    insights.push("Avec seulement 1-2 repas contenant des proteines significatives, tu es probablement en deficit proteique chronique. Les proteines sont essentielles non seulement pour les muscles, mais aussi pour les enzymes, hormones, neurotransmetteurs, et systeme immunitaire. Un apport insuffisant entraine catabolisme musculaire, fatigue, recuperation lente, faim accrue, et meme depression (precurseurs de serotonine et dopamine).");
    
    recommendations.push("Objectif : proteines a CHAQUE repas et collation. Minimum 20-30g par prise pour declencher la synthese proteique.");
    recommendations.push("Sources optimales : oeufs, viande, poisson, yaourt grec, fromage blanc, tofu, tempeh. Les proteines vegetales doivent etre combinees pour etre completes.");
    recommendations.push("Collation proteique strategique : shake de whey, oeuf dur, jambon, fromage - toujours avoir une option disponible.");
  }
  subMetrics.push({ name: "Apport proteique", score: proteineScore, status: getStatus(proteineScore) });

  let legumesScore = 70;
  if (legumes === "5+") legumesScore = 95;
  else if (legumes === "3-4") legumesScore = 80;
  else if (legumes === "1-2") {
    legumesScore = 50;
    insights.push("1-2 portions de legumes par jour est largement insuffisant. Les legumes apportent fibres (essentielles pour le microbiote), micronutriments (vitamines, mineraux), antioxydants (protection cellulaire), et phytonutriments (composes bioactifs). L'objectif minimum est de 5-7 portions, idealement 8-10 pour une sante optimale.");
    
    recommendations.push("Regle simple : chaque assiette doit etre composee a 50% de legumes. Ils ne sont pas un accompagnement mais la base du repas.");
    recommendations.push("Variete de couleurs = variete de nutriments. Viser l'arc-en-ciel chaque jour : vert (epinards, brocoli), rouge (tomates, poivrons), orange (carottes), violet (aubergine, chou rouge).");
  }
  subMetrics.push({ name: "Consommation legumes", score: legumesScore, status: getStatus(legumesScore) });

  let hydratationScore = 70;
  if (hydratation === "2-2.5L" || hydratation === "2.5L+") hydratationScore = 90;
  else if (hydratation === "1.5-2L") hydratationScore = 70;
  else if (hydratation === "1-1.5L") {
    hydratationScore = 50;
    insights.push("Une hydratation insuffisante (< 1.5L/jour) impacte toutes les fonctions corporelles : energie, concentration, digestion, detoxification, performance physique. Meme une deshydratation legere (1-2%) reduit les performances cognitives de 10-20% et physiques de 5-10%. La soif n'est pas un bon indicateur - quand tu as soif, tu es deja deshydrate.");
    
    recommendations.push("Objectif : 30-35ml par kg de poids corporel comme base, plus pendant l'exercice et la chaleur.");
    recommendations.push("Commencer la journee avec 500ml d'eau des le reveil pour compenser la deshydratation nocturne.");
    recommendations.push("Eau mineralisee de preference : les mineraux (magnesium, calcium) sont mieux absorbes via l'eau qu'en supplement.");
  } else if (hydratation === "<1L") {
    hydratationScore = 25;
    insights.push("Moins d'un litre d'eau par jour est une deshydratation chronique severe. Cela affecte la detoxification hepatique, la fonction renale, la digestion, la peau, et meme l'humeur. La constipation, les maux de tete, et la fatigue chronique sont souvent simplement dus a un manque d'eau.");
    
    recommendations.push("PRIORITE ABSOLUE : atteindre progressivement 2L/jour minimum. Ajouter 250ml par semaine.");
    recommendations.push("Garder une bouteille d'eau visible en permanence. Utiliser une app de rappel si necessaire.");
    
    actionItems.push("Acheter une bouteille d'eau reutilisable de 1L minimum");
    actionItems.push("Definir 3 'checkpoints' hydratation dans la journee");
  }
  subMetrics.push({ name: "Hydratation", score: hydratationScore, status: getStatus(hydratationScore) });

  if (petitDej === "sucre") {
    insights.push("Un petit-dejeuner sucre (cereales, pain blanc, confiture, jus de fruits) declenche un pic d'insuline qui sera suivi d'une chute glycemique 2-3h plus tard - souvent au moment ou tu arrives au travail. Ce 'crash' matinal impacte ta concentration, ton humeur, et declenche des envies de sucre pour compenser. C'est le pire moyen de commencer la journee.");
    
    recommendations.push("Petit-dejeuner proteique + lipidique : oeufs, avocat, saumon fume, fromage, yaourt grec nature. ZERO sucre ajouteee matin.");
    recommendations.push("Si tu ne peux pas te passer de glucides le matin, opte pour des fruits entiers (pas de jus) avec des proteines.");
  }

  if (tracking === "jamais") {
    insights.push("Sans tracking nutritionnel, tu navigues a l'aveugle. Les etudes montrent que les gens sous-estiment leur apport calorique de 30-50% en moyenne. Meme un tracking temporaire de 2-4 semaines apporte une conscience alimentaire qui persiste ensuite. Ce n'est pas une obsession mais un outil d'apprentissage.");
    
    recommendations.push("Tracker pendant 2-4 semaines avec une app comme MyFitnessPal ou Cronometer pour etablir une baseline.");
    recommendations.push("Focus sur les proteines en priorite - c'est le macronutriment le plus souvent deficitaire.");
    
    actionItems.push("Telecharger MyFitnessPal ou Cronometer et tracker 3 jours cette semaine");
  }

  if (!sups || sups.length === 0 || sups.includes("aucun")) {
    recommendations.push("Base de supplementation recommandee : Vitamine D3 (2000-5000 UI/jour), Omega-3 (2-3g EPA+DHA), Magnesium (300-400mg le soir).");
    
    supplements.push({
      name: "Vitamine D3 + K2",
      dosage: "2000-5000 UI D3 + 100-200mcg K2",
      timing: "Avec un repas contenant des lipides",
      duration: "Continue, surtout octobre-avril",
      why: "80% de la population est carencee en vitamine D. Elle est essentielle pour l'immunite, les os, l'humeur, la testosterone, et la sensibilite a l'insuline. La K2 assure que le calcium va dans les os et pas dans les arteres.",
      brands: ["Thorne D3/K2", "Life Extension D3 + K2"]
    });
    
    supplements.push({
      name: "Omega-3 (EPA/DHA)",
      dosage: "2-3g d'EPA+DHA combines par jour",
      timing: "Avec les repas",
      duration: "Continue",
      why: "Les omega-3 sont anti-inflammatoires, benefiques pour le cerveau, le coeur, les articulations, et la composition corporelle. Le ratio omega-6/omega-3 moderne est catastrophique (15:1 au lieu de 2:1), d'ou l'importance de supplementer.",
      brands: ["Nordic Naturals Ultimate Omega", "Carlson Labs Fish Oil"],
      warnings: "Choisir une marque testee pour les metaux lourds et l'oxydation. Conserver au refrigerateur."
    });
    
    supplements.push({
      name: "Magnesium (Glycinate ou Threonate)",
      dosage: "300-400mg de magnesium elementaire",
      timing: "Le soir, 1-2h avant le coucher",
      duration: "Continue",
      why: "Le magnesium est implique dans 300+ reactions enzymatiques. Carences tres frequentes dues a l'appauvrissement des sols. Benefique pour le sommeil, le stress, les crampes, et la sensibilite a l'insuline. Le glycinate est bien tolere, le threonate traverse la barriere hemato-encephalique.",
      brands: ["Thorne Magnesium Bisglycinate", "Life Extension Neuro-Mag (threonate)"]
    });
  }

  // NOUVELLES QUESTIONS - Timing nutritionnel et inflammation
  const glucidesReveil = responses["glucides-reveil"] as string;
  const dinerGlucides = responses["diner-glucides"] as string;
  const huilesCuisson = responses["huiles-cuisson"] as string;
  const alimentsTransformes = responses["aliments-transformes"] as string;
  const bleGluten = responses["ble-gluten-freq"] as string;
  const sucresAjoutes = responses["sucres-ajoutes"] as string;
  const omega6omega3 = responses["omega6-omega3"] as string;

  let timingScore = 70;
  if (glucidesReveil === "oui-sucres") {
    timingScore -= 20;
    insights.push("Prendre des glucides rapides des le reveil (cereales, pain blanc, jus) bloque la lipolyse matinale. Au reveil, ton corps est naturellement en mode brule-graisse apres le jeune nocturne (cortisol eleve + insuline basse). Manger des glucides rapides declenche un pic d'insuline qui coupe net ce processus. Tu rates une fenetre metabolique naturelle de 2-4h de combustion des graisses.");
    recommendations.push("Retarder les glucides de 2-4h apres le reveil pour prolonger la lipolyse matinale. Commencer par proteines + lipides ou jeuner.");
    recommendations.push("Si glucides le matin, opter pour fibres d'abord (legumes, graines) puis glucides complexes.");
  } else if (glucidesReveil === "non-proteines" || glucidesReveil === "jeune") {
    timingScore += 10;
  }

  if (dinerGlucides === "tres-riche") {
    timingScore -= 15;
    insights.push("Un diner tres riche en glucides (pates, riz, pain) impacte negativement la qualite du sommeil. La digestion des glucides augmente la thermogenese et la glycemie, ce qui interfere avec la baisse de temperature corporelle necessaire a l'endormissement. De plus, les pics d'insuline le soir perturbent la secretion de GH (hormone de croissance) qui se fait principalement la nuit.");
    recommendations.push("Diner pauvre en glucides : proteines + legumes + lipides sains. Garder les glucides pour le dejeuner ou le post-entrainement.");
    recommendations.push("Si besoin de glucides le soir, opter pour des glucides complexes a IG bas (patate douce, lentilles) 3h avant le coucher minimum.");
  } else if (dinerGlucides === "faible" || dinerGlucides === "zero") {
    timingScore += 5;
  }
  subMetrics.push({ name: "Timing glucidique", score: timingScore, status: getStatus(timingScore) });

  let inflammationScore = 70;
  if (huilesCuisson === "tournesol" || huilesCuisson === "friture") {
    inflammationScore -= 20;
    insights.push("Les huiles vegetales riches en omega-6 (tournesol, colza, mais, soja) chauffees a haute temperature s'oxydent et deviennent pro-inflammatoires. Ces huiles ont deja un ratio omega-6/omega-3 catastrophique (100:1 pour le tournesol), et l'oxydation cree des aldehydes toxiques. C'est l'un des facteurs d'inflammation chronique les plus sous-estimes.");
    recommendations.push("Cuisson haute temperature : huile de coco, ghee, graisse animale (stables). Cuisson douce : huile d'olive vierge extra.");
    recommendations.push("Eliminer completement les huiles de friture industrielles et les aliments frits.");
    
    supplements.push({
      name: "Curcumine (+ Piperine)",
      dosage: "500-1000mg/jour",
      timing: "Avec un repas gras",
      duration: "Cycles de 8-12 semaines",
      why: "La curcumine est un puissant anti-inflammatoire qui module NFkB, COX-2 et LOX. Elle contrecarre partiellement les effets des huiles omega-6 oxydees.",
      brands: ["Meriva by Thorne", "Longvida", "Theracurmin"],
      warnings: "La curcumine seule est mal absorbee - choisir une formule avec piperine ou lipidique."
    });
  }

  if (alimentsTransformes === "souvent") {
    inflammationScore -= 20;
    insights.push("La consommation quotidienne d'aliments ultra-transformes est associee a une inflammation chronique de bas grade, une dysbiose intestinale, et une augmentation du risque de maladies metaboliques. Ces produits contiennent additifs, emulsifiants, huiles oxydees, et sucres caches qui perturbent le microbiote et la permeabilite intestinale.");
    recommendations.push("Regle des 80/20 : 80% d'aliments bruts non transformes, 20% maximum de transformes.");
    recommendations.push("Lire les etiquettes : si plus de 5 ingredients ou ingredients non reconnaissables, eviter.");
    actionItems.push("Faire un audit de ton placard et refrigerateur - eliminer les produits ultra-transformes");
  } else if (alimentsTransformes === "parfois") {
    inflammationScore -= 10;
  }

  if (bleGluten === "quotidien") {
    inflammationScore -= 10;
    insights.push("La consommation quotidienne de ble/gluten peut contribuer a l'inflammation meme sans maladie coeliaque. Le ble moderne contient plus de gluten et de gliadine que les varietes anciennes. De plus, les inhibiteurs de trypsine-amylase (ATIs) du ble activent le systeme immunitaire inne et contribuent a l'inflammation intestinale.");
    recommendations.push("Reduire la frequence de consommation de ble a 2-3x/semaine maximum et varier les sources : riz, quinoa, sarrasin, patate douce.");
    recommendations.push("Tester une elimination du gluten pendant 3-4 semaines pour evaluer l'impact sur ton energie, digestion, et inflammation.");
  }

  if (sucresAjoutes === "elevee") {
    inflammationScore -= 15;
    insights.push("Une consommation elevee de sucres ajoutes active les voies inflammatoires (NFkB), perturbe le microbiote en favorisant les bacteries pro-inflammatoires, et accelere la glycation des proteines (AGEs). Le fructose en exces surcharge le foie et contribue a la steatose hepatique.");
    recommendations.push("Objectif : moins de 25g de sucres ajoutes par jour (OMS). Eliminer sodas, jus de fruits, sucreries industrielles.");
    actionItems.push("Tracker ta consommation de sucres ajoutes pendant une semaine pour prendre conscience de la realite");
  }

  if (omega6omega3 === "desequilibre") {
    inflammationScore -= 10;
    insights.push("Un ratio omega-6/omega-3 desequilibre (typiquement 15-20:1 au lieu du 2-4:1 ancestral) favorise l'inflammation chronique. Les omega-6 sont precurseurs d'eicosanoides pro-inflammatoires, tandis que les omega-3 produisent des resolvines anti-inflammatoires. Ce desequilibre est implique dans quasiment toutes les maladies chroniques modernes.");
    recommendations.push("Reduire les sources d'omega-6 : huiles vegetales, viandes d'elevage industriel, aliments transformes.");
    recommendations.push("Augmenter les omega-3 : poissons gras 3x/semaine (saumon, maquereau, sardines), supplementation EPA/DHA.");
  }
  subMetrics.push({ name: "Score inflammation alimentaire", score: inflammationScore, status: getStatus(inflammationScore) });

  score = Math.round((proteineScore + legumesScore + hydratationScore + timingScore + inflammationScore) / 5);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil nutritionnel revele ${score >= 70 ? "des habitudes globalement correctes" : score >= 50 ? "des lacunes significatives a combler" : "des carences nutritionnelles majeures"} qui impactent directement ton energie, ta composition corporelle, et ta sante globale. ${proteines === "1-2" ? "Le deficit proteique est probablement ton frein principal actuel." : ""} ${hydratation === "<1L" || hydratation === "1-1.5L" ? "L'hydratation insuffisante limite toutes tes autres optimisations." : ""}`;

  const scienceExplainer = "La nutrition est le carburant de toutes les fonctions corporelles. Les macronutriments (proteines, glucides, lipides) fournissent l'energie et les blocs de construction, tandis que les micronutriments (vitamines, mineraux) sont les cofacteurs enzymatiques qui permettent les reactions biochimiques. Une carence en un seul micronutriment peut bloquer des voies metaboliques entieres - c'est le concept de 'metabolic triage' du Dr Bruce Ames.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Nutrition globalement adequate." : "Ta nutrition necessite des ajustements importants.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

function createBasicSection(name: string, responses: Responses): SectionScore {
  const score = 60 + Math.floor(Math.random() * 20);
  return {
    score,
    level: getLevel(score),
    summary: `Analyse ${name} en cours d'elaboration.`,
    detailedAnalysis: `Cette section ${name} sera enrichie avec des analyses personnalisees basees sur tes reponses specifiques.`,
    recommendations: [`Optimiser ${name} selon tes objectifs personnels`],
    insights: [`Tes reponses revelent des opportunites d'amelioration dans ${name}`],
    subMetrics: [{ name, score, status: getStatus(score) }],
    supplements: [],
    actionItems: [],
    scienceExplainer: `${name} est un domaine cle de l'optimisation de la sante.`
  };
}

export function analyzeDigestionMicrobiome(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const digestion = responses["digestion-generale"] as string;
  const ballonnements = responses["ballonnements"] as string;
  const transit = responses["transit"] as string;
  const intolerance = toStringArray(responses["intolerance"]);
  const probiotiques = responses["probiotiques"] as string;
  const antibiotiques = responses["antibiotiques"] as string;

  let digestionScore = 70;
  if (digestion === "excellente") digestionScore = 95;
  else if (digestion === "bonne") digestionScore = 80;
  else if (digestion === "moyenne") digestionScore = 60;
  else if (digestion === "mauvaise") {
    digestionScore = 35;
    insights.push("Une mauvaise digestion chronique affecte bien plus que ton confort intestinal. L'intestin est le 'deuxieme cerveau' avec 100 millions de neurones, produit 95% de la serotonine, et abrite 70% du systeme immunitaire. Une digestion compromise signifie malabsorption des nutriments, inflammation systemique, et dysbiose du microbiote. C'est souvent la racine cachee de nombreux symptomes inexpliques.");
    
    recommendations.push("Macher chaque bouchee 20-30 fois. La digestion commence dans la bouche avec les enzymes salivaires.");
    recommendations.push("Eviter de boire pendant les repas (dilue les enzymes digestives). Boire 30 min avant ou 1h apres.");
    recommendations.push("Integrer des aliments fermentes quotidiennement : choucroute crue, kimchi, kefir, kombucha.");
  }
  subMetrics.push({ name: "Qualite digestion", score: digestionScore, status: getStatus(digestionScore) });

  let ballonnementsScore = 80;
  if (ballonnements === "jamais") ballonnementsScore = 95;
  else if (ballonnements === "rarement") ballonnementsScore = 80;
  else if (ballonnements === "reguliers") {
    ballonnementsScore = 45;
    insights.push("Les ballonnements reguliers indiquent une fermentation excessive dans l'intestin grele (SIBO potentiel), une dysbiose du colon, ou une intolerance alimentaire non identifiee. Les coupables frequents : FODMAPs (certains sucres fermentescibles), gluten, lactose, ou simplement trop de fibres d'un coup.");
    
    recommendations.push("Tenir un journal alimentaire pendant 2 semaines pour identifier les declencheurs specifiques.");
    recommendations.push("Essayer une elimination temporaire des FODMAPs (protocole low-FODMAP de Monash University).");
    
    supplements.push({
      name: "Enzymes Digestives",
      dosage: "1-2 capsules avec chaque repas",
      timing: "Au debut du repas",
      duration: "2-4 semaines pour evaluation",
      why: "Les enzymes digestives (proteases, lipases, amylases) aident a decomposer les aliments et reduisent la fermentation intestinale. Particulierement utile si tu as plus de 35-40 ans (la production enzymatique decline).",
      brands: ["NOW Foods Super Enzymes", "Enzymedica Digest Gold"]
    });
  } else if (ballonnements === "quotidiens") {
    ballonnementsScore = 25;
    insights.push("Des ballonnements quotidiens sont anormaux et meritent une investigation medicale. Les causes possibles incluent SIBO (Small Intestinal Bacterial Overgrowth), Candida, parasitose, ou maladie inflammatoire de l'intestin. Ne normalise pas ce symptome.");
    
    actionItems.push("Consulter un gastro-enterologue pour un test de SIBO (breath test)");
    actionItems.push("Envisager un test du microbiote (type GI-MAP) pour une analyse complete");
  }
  subMetrics.push({ name: "Ballonnements", score: ballonnementsScore, status: getStatus(ballonnementsScore) });

  let transitScore = 75;
  if (transit === "regulier-1-2") transitScore = 95;
  else if (transit === "irregulier") {
    transitScore = 50;
    insights.push("Un transit irregulier (alternance constipation/diarrhee ou impredictibilite) est souvent le signe d'un syndrome de l'intestin irritable (SII) ou d'un desequilibre du microbiote. Le nerf vague, qui controle la motilite intestinale, peut aussi etre dysfonctionnel suite au stress chronique.");
    
    recommendations.push("Fibres solubles (psyllium, graines de lin) plutot que fibres insolubles (son de ble) qui peuvent aggraver.");
    recommendations.push("Magnesium citrate le soir : 300-400mg - il relaxe les muscles intestinaux et attire l'eau.");
    
    supplements.push({
      name: "Psyllium (Metamucil sans sucre)",
      dosage: "5-10g/jour",
      timing: "Le soir avec un grand verre d'eau",
      duration: "Continue",
      why: "Le psyllium est une fibre soluble qui regularise le transit dans les deux sens : il absorbe l'eau en cas de diarrhee et l'apporte en cas de constipation. Il nourrit aussi les bonnes bacteries.",
      brands: ["NOW Foods Psyllium Husk", "Organic India Whole Husk Psyllium"]
    });
  } else if (transit === "constipation") {
    transitScore = 40;
    insights.push("La constipation chronique favorise la reabsorption des toxines et hormones qui auraient du etre eliminees (notamment les oestrogenes), la proliferation des mauvaises bacteries, et l'inflammation intestinale. L'objectif est d'aller a la selle 1-2 fois par jour, idealement le matin.");
    
    recommendations.push("Augmenter l'hydratation : chaque 500ml d'eau en plus peut ameliorer significativement le transit.");
    recommendations.push("Mouvement quotidien : la marche et les squats stimulent le peristaltisme intestinal.");
    recommendations.push("Position aux toilettes : utiliser un marchepied pour recreer la position accroupie naturelle (colon sigmide aligne).");
  }
  subMetrics.push({ name: "Regularite transit", score: transitScore, status: getStatus(transitScore) });

  if (antibiotiques === "plusieurs-fois" || antibiotiques === "3+") {
    insights.push("Des cures d'antibiotiques multiples ont probablement endommage ton microbiote intestinal. Les antibiotiques tuent les bacteries pathogenes mais aussi les benefiques, et le microbiote peut mettre des mois voire des annees a se reconstituer completement. Certaines souches ne reviennent jamais sans intervention.");
    
    supplements.push({
      name: "Probiotiques Multi-souches",
      dosage: "50-100 milliards CFU/jour",
      timing: "A jeun le matin ou au coucher",
      duration: "3-6 mois minimum apres antibiotiques",
      why: "Les probiotiques reintroduisent des souches benefiques. Apres antibiotiques, opter pour un produit multi-souches a haute concentration. Les souches Lactobacillus et Bifidobacterium sont les plus etudiees.",
      brands: ["Seed DS-01", "VSL#3", "Garden of Life RAW Probiotics"],
      warnings: "Commencer progressivement si tu as des ballonnements - une aggravation temporaire ('die-off') est possible."
    });
    
    supplements.push({
      name: "Saccharomyces Boulardii",
      dosage: "250-500mg 2x/jour",
      timing: "Avec les repas",
      duration: "1-3 mois",
      why: "Cette levure benefique n'est pas affectee par les antibiotiques et aide a prevenir la diarrhee associee. Elle inhibe aussi la croissance du Candida et de C. difficile.",
      brands: ["Jarrow Saccharomyces Boulardii", "NOW Foods Saccharomyces Boulardii"]
    });
  }

  score = Math.round((digestionScore + ballonnementsScore + transitScore) / 3);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil digestif et microbiotique revele ${score >= 70 ? "un systeme globalement fonctionnel" : score >= 50 ? "des dysfonctionnements qui meritent attention" : "des problemes significatifs necessitant une approche structuree"}. L'intestin est le pilier de la sante - 'all disease begins in the gut' (Hippocrate). ${ballonnements === "quotidiens" || ballonnements === "reguliers" ? "Les ballonnements frequents sont un signal d'alarme a ne pas ignorer." : ""}`;

  const scienceExplainer = "Le microbiote intestinal est un ecosysteme de 100 trillions de bacteries pesant environ 2kg. Ces micro-organismes influencent la digestion, l'immunite, le metabolisme, l'humeur, et meme les preferences alimentaires. La diversite du microbiote est le meilleur indicateur de sante intestinale - plus il y a de souches differentes, mieux c'est. Les fibres fermentescibles (prebiotiques) nourrissent les bonnes bacteries, tandis que les aliments ultra-transformes favorisent les pathogenes.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Sante digestive acceptable." : "Ton systeme digestif necessite une optimisation.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeSommeilRecuperation(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const heures = responses["heures-sommeil"] as string;
  const qualite = responses["qualite-sommeil"] as string;
  const endormissement = responses["endormissement"] as string;
  const reveils = responses["reveils-nocturnes"] as string;
  const reveilMatin = responses["reveil-matin"] as string;

  let heuresScore = 70;
  if (heures === "8+") heuresScore = 95;
  else if (heures === "7-8") heuresScore = 85;
  else if (heures === "6-7") {
    heuresScore = 55;
    insights.push("6-7 heures de sommeil semble 'suffisant' pour beaucoup mais la science est claire : moins de 7h de sommeil augmente les risques de maladies cardiovasculaires, diabete, obesite, et demence de 20-40%. La privation de sommeil reduit la testosterone de 10-15%, augmente le cortisol, diminue la sensibilite a l'insuline, et altere la prise de decision et la gestion des emotions.");
    
    recommendations.push("Viser 7.5-8.5h de sommeil total en se couchant plus tot - pas en se levant plus tard.");
    recommendations.push("Calculer ton heure de coucher ideale : heure de reveil necessaire - 8h = heure de coucher cible.");
  } else if (heures === "<6") {
    heuresScore = 25;
    insights.push("Moins de 6 heures de sommeil chronique est une urgence sante. C'est l'equivalent de conduire en etat d'ivresse en termes de performances cognitives. La dette de sommeil est cumulative et ne peut pas etre entierement 'remboursee' le weekend. Les effets : systeme immunitaire affaibli, vieillissement accelere, prise de poids (la ghreline augmente, la leptine diminue), depression.");
    
    recommendations.push("PRIORITE NUMERO UN : augmenter le temps de sommeil avant toute autre intervention. Rien d'autre ne fonctionnera tant que tu ne dors pas suffisamment.");
    
    actionItems.push("Definir une alarme 'coucher' 8h30 avant ton reveil souhaite");
    actionItems.push("Bloquer ce creneau dans ton agenda comme non-negociable");
  }
  subMetrics.push({ name: "Duree sommeil", score: heuresScore, status: getStatus(heuresScore) });

  let qualiteScore = 70;
  if (qualite === "excellente") qualiteScore = 95;
  else if (qualite === "bonne") qualiteScore = 80;
  else if (qualite === "moyenne") {
    qualiteScore = 55;
    insights.push("Une qualite de sommeil moyenne indique que tu passes du temps au lit mais sans atteindre les phases reparatrices profondes. Le sommeil profond (stades 3-4) est celui ou l'hormone de croissance est secretee, ou les muscles se reparent, et ou la memoire se consolide. Le sommeil REM est crucial pour la sante cognitive et emotionnelle.");
    
    recommendations.push("Chambre optimisee : temperature 18-19°C, obscurite totale (masque de nuit si necessaire), silence ou bruit blanc.");
    recommendations.push("Routine pre-sommeil : memes gestes chaque soir pour conditionner le cerveau (douche tiede, lecture, respiration).");
  } else if (qualite === "mauvaise") {
    qualiteScore = 30;
  }
  subMetrics.push({ name: "Qualite sommeil", score: qualiteScore, status: getStatus(qualiteScore) });

  let endormissementScore = 80;
  if (endormissement === "<15min") endormissementScore = 90;
  else if (endormissement === "15-30min") endormissementScore = 75;
  else if (endormissement === "30-60min") {
    endormissementScore = 45;
    insights.push("Mettre 30-60 minutes a s'endormir indique un systeme nerveux qui ne 'switch' pas facilement en mode parasympathique (relaxation). Les causes frequentes : exposition aux ecrans (lumiere bleue qui supprime la melatonine), stress/ruminations mentales, cafeine tardive, ou chambre trop chaude/lumineuse.");
    
    recommendations.push("Zero ecran 1h minimum avant le coucher. La lumiere bleue supprime la melatonine de 50% pendant 2-3h.");
    recommendations.push("Respiration 4-7-8 au lit : inspirer 4s, retenir 7s, expirer 8s. 4-6 cycles pour activer le parasympathique.");
    
    supplements.push({
      name: "Magnesium Glycinate",
      dosage: "400-600mg",
      timing: "1-2h avant le coucher",
      duration: "Continue",
      why: "Le magnesium glycinate a un effet calmant sur le systeme nerveux et aide a la relaxation musculaire. La forme glycinate est la mieux toleree et traverse la barriere hemato-encephalique.",
      brands: ["Thorne Magnesium Bisglycinate", "Doctor's Best High Absorption Magnesium"]
    });
    
    supplements.push({
      name: "L-Theanine",
      dosage: "200-400mg",
      timing: "30-60 min avant le coucher",
      duration: "Au besoin ou continue",
      why: "La L-theanine (acide amine du the vert) augmente les ondes alpha cerebrales associees a la relaxation alerte. Elle favorise l'endormissement sans somnolence residuelle le matin.",
      brands: ["NOW Foods L-Theanine", "Jarrow L-Theanine"],
      warnings: "Non addictif, peut etre pris quotidiennement."
    });
  }
  subMetrics.push({ name: "Latence endormissement", score: endormissementScore, status: getStatus(endormissementScore) });

  let reveilsScore = 80;
  if (reveils === "0") reveilsScore = 95;
  else if (reveils === "1-2") {
    reveilsScore = 65;
    insights.push("1-2 reveils nocturnes peuvent indiquer une hypoglycemie nocturne (si tu te reveilles vers 3-4h), de l'apnee du sommeil, des problemes de vessie, ou simplement un environnement de sommeil non optimal. Le cortisol augmente naturellement en fin de nuit mais ne devrait pas te reveiller.");
    
    recommendations.push("Eviter l'alcool qui fragmente le sommeil et reduit le sommeil profond et REM.");
    recommendations.push("Si reveil vers 3-4h avec faim ou agitation : manger une collation proteines/lipides avant le coucher.");
  } else if (reveils === "3+") {
    reveilsScore = 35;
    insights.push("3+ reveils par nuit est un sommeil tres fragmente qui empeche d'atteindre les cycles complets de 90 minutes. Tu accumules probablement du sommeil leger au detriment du profond et du REM. Les consequences : fatigue chronique, brouillard mental, irritabilite, systeme immunitaire affaibli.");
    
    actionItems.push("Envisager une etude du sommeil (polysomnographie) pour exclure l'apnee du sommeil");
  }
  subMetrics.push({ name: "Continuite sommeil", score: reveilsScore, status: getStatus(reveilsScore) });

  if (reveilMatin === "fatigue" || reveilMatin === "difficile") {
    insights.push("Se reveiller fatigue malgre des heures de sommeil suffisantes suggere un sommeil non reparateur. Les causes possibles : apnee du sommeil (tres sous-diagnostiquee), reveiller pendant une phase de sommeil profond plutot qu'en sommeil leger, ou tout simplement dette de sommeil accumulee.");
    
    recommendations.push("Utiliser une app ou un tracker qui reveille pendant une phase de sommeil leger (Oura, Sleep Cycle).");
    recommendations.push("Exposition a la lumiere vive des le reveil : 10-15 min de lumiere naturelle ou lampe 10 000 lux pour reseter le rythme circadien.");
    
    supplements.push({
      name: "Melatonine micro-dosee",
      dosage: "0.3-0.5mg (pas plus)",
      timing: "30-45 min avant le coucher",
      duration: "Courtes periodes pour reset circadien",
      why: "La melatonine a dose physiologique (0.3-0.5mg) est plus efficace que les mega-doses courantes (3-10mg). Elle sert a signaler au corps qu'il est temps de dormir, pas a 'forcer' le sommeil.",
      brands: ["Life Extension Melatonin 300mcg"],
      warnings: "Utiliser pour reset du rythme circadien, pas comme bequille quotidienne permanente."
    });
  }

  score = Math.round((heuresScore + qualiteScore + endormissementScore + reveilsScore) / 4);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil de sommeil et recuperation montre ${score >= 70 ? "une base acceptable" : score >= 50 ? "des deficits significatifs" : "une situation critique"} pour ta sante globale. Le sommeil n'est pas un luxe mais une necessite biologique - c'est pendant le sommeil que ton corps repare, detoxifie, et consolide. ${heures === "<6" ? "Ta priorite absolue est d'augmenter ta duree de sommeil avant toute autre optimisation." : ""}`;

  const scienceExplainer = "Le sommeil se compose de cycles de 90 minutes alternant sommeil leger, profond, et REM. Le sommeil profond (ondes lentes) domine le debut de nuit et est crucial pour la reparation physique et la secretion d'hormone de croissance. Le REM domine la fin de nuit et est essentiel pour la memoire et la sante mentale. Perturber l'un ou l'autre a des consequences distinctes sur la sante.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Sommeil globalement satisfaisant." : "Ton sommeil necessite une attention prioritaire.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeHormonesStress(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  const stressNiveau = responses["stress-niveau"] as string;
  const stressChronique = responses["stress-chronique"] as string;
  const anxiete = responses["anxiete"] as string;
  const cortisolSignes = toStringArray(responses["cortisol-signes"]);
  const libido = responses["libido"] as string;

  let stressScore = 70;
  if (stressNiveau === "faible") stressScore = 90;
  else if (stressNiveau === "modere") stressScore = 65;
  else if (stressNiveau === "eleve" || stressNiveau === "tres-eleve") {
    stressScore = 35;
    insights.push("Un niveau de stress eleve chronique est l'ennemi numero un de ta sante. Le cortisol eleve en permanence detruit les muscles, stocke la graisse abdominale, supprime le systeme immunitaire, altere la memoire (atrophie de l'hippocampe), reduit la testosterone et les hormones thyroidiennes, et augmente l'insulino-resistance. C'est le facteur qui sabote tous les autres efforts d'optimisation.");
    
    recommendations.push("Integrer une pratique quotidienne de coherence cardiaque : 5 min 3x/jour (technique 365 : 3x par jour, 6 respirations/min, pendant 5 min).");
    recommendations.push("Bloquer des 'no-phone zones' : les premieres 30 min du reveil et la derniere heure avant le coucher.");
    recommendations.push("Nature therapy : 20 min minimum en nature par jour reduit le cortisol de 20% selon les etudes.");
    
    supplements.push({
      name: "Ashwagandha KSM-66",
      dosage: "300-600mg/jour",
      timing: "Le soir ou reparti matin/soir",
      duration: "8-12 semaines puis pause de 2-4 semaines",
      why: "L'ashwagandha est un adaptogene qui module l'axe HPA (hypothalamus-hypophyse-surrenales). Les etudes montrent une reduction du cortisol de 15-30%, une amelioration de l'anxiete, et meme une augmentation de la testosterone chez les hommes.",
      brands: ["KSM-66 Ashwagandha", "Jarrow Ashwagandha", "NOW Foods Ashwagandha Extract"]
    });
    
    supplements.push({
      name: "Phosphatidylserine",
      dosage: "300-400mg/jour",
      timing: "Le soir",
      duration: "Continue ou par cycles de 2-3 mois",
      why: "La phosphatidylserine est un phospholipide qui atenue la reponse au stress en blunting la liberation de cortisol. Particulierement efficace pour le cortisol eleve du soir qui empeche de dormir.",
      brands: ["Jarrow PS-100", "NOW Foods Phosphatidyl Serine"]
    });
  }
  subMetrics.push({ name: "Niveau stress", score: stressScore, status: getStatus(stressScore) });

  if (stressChronique === "oui") {
    insights.push("Le stress chronique (vs. stress aigu ponctuel) est particulierement deletere. L'axe HPA s'epuise progressivement, passant d'abord par une phase de resistance (cortisol eleve) puis d'epuisement (cortisol bas/dysregule). C'est le 'burnout surrenalien' - un etat de fatigue profonde ou le corps ne peut plus repondre adequatement au stress.");
    
    recommendations.push("Prioriser le sommeil et la recuperation avant d'ajouter du stress supplementaire (meme le 'bon' stress comme l'exercice intense).");
    recommendations.push("Reduire les stimulants (cafe, pre-workout) qui sollicitent encore plus les surrenales deja epuisees.");
    
    actionItems.push("Faire un test de cortisol salivaire sur 4 points (matin, midi, soir, nuit) pour evaluer le rythme circadien");
  }

  if (cortisolSignes && cortisolSignes.length > 0) {
    if (cortisolSignes.includes("fatigue-matin") && cortisolSignes.includes("energie-soir")) {
      insights.push("Le pattern 'fatigue le matin, energie le soir' est le signe classique d'un rythme circadien du cortisol inverse. Normalement, le cortisol est au pic le matin (pour te reveiller) et au plus bas le soir (pour t'endormir). Quand c'est inverse, tu te traines le matin et tu es trop alerte le soir pour t'endormir.");
      
      recommendations.push("Exposition a la lumiere vive des le reveil : 10-30 min dehors ou lampe 10 000 lux pour reseter le cortisol matinal.");
      recommendations.push("Eviter la lumiere bleue et les stimulants apres 14h pour permettre au cortisol de baisser le soir.");
      recommendations.push("Exercice le matin plutot que le soir pour aligner le pic de cortisol naturel.");
    }
    
    if (cortisolSignes.includes("graisse-abdominale")) {
      insights.push("La graisse abdominale resistante est directement correlee au cortisol chronique. Les recepteurs glucocorticoides sont plus denses dans la region abdominale, ce qui explique le stockage preferentiel. Cette graisse viscerale est aussi la plus dangereuse metaboliquement.");
    }
  }

  let libidoScore = 75;
  if (libido === "elevee") libidoScore = 95;
  else if (libido === "normale") libidoScore = 80;
  else if (libido === "basse") {
    libidoScore = 40;
    insights.push("Une libido basse est souvent le canari dans la mine des desequilibres hormonaux. Chez l'homme, elle peut indiquer une testosterone basse, un cortisol eleve (qui supprime la testosterone), ou une fatigue surrenalienne. Chez la femme, les causes incluent desequilibres oestrogene/progesterone, stress chronique, ou carence en DHEA.");
    
    recommendations.push("Bilan hormonal complet : testosterone totale et libre, SHBG, oestradiol, cortisol, DHEA-S, prolactine.");
    recommendations.push("Prioriser le sommeil et la gestion du stress - le stress chronique est castrant (litteralement, il reduit la testosterone).");
    
    actionItems.push("Programmer un bilan hormonal complet avec un endocrinologue ou medecin anti-age");
  }
  subMetrics.push({ name: "Libido/hormones", score: libidoScore, status: getStatus(libidoScore) });

  score = Math.round((stressScore + libidoScore) / 2);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil hormonal et de gestion du stress revele ${score >= 70 ? "un equilibre acceptable" : score >= 50 ? "des dysregulations significatives" : "un desequilibre majeur"} qui impacte tous les autres aspects de ta sante. ${stressChronique === "oui" ? "Le stress chronique est probablement le facteur limitant numero un de ta progression." : ""} ${libido === "basse" ? "La baisse de libido suggere un bilan hormonal approfondi." : ""}`;

  const scienceExplainer = "L'axe hypothalamus-hypophyse-surrenales (HPA) est le systeme de reponse au stress. Un stress aigu declenche une cascade : CRH > ACTH > Cortisol, qui prepare le corps au 'fight or flight'. En chronique, ce systeme s'epuise ou se dysregule. Le cortisol interfere avec les hormones thyroidiennes (conversion T4>T3), les hormones sexuelles (baisse de testosterone et progesterone), et l'insuline (resistance accrue). Optimiser le stress est le premier levier hormonal.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Equilibre hormonal et stress acceptable." : "Ton axe stress-hormones necessite une intervention.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeActivitePerformance(responses: Responses): SectionScore {
  let score = 70;
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];

  // Questions existantes
  const sportFreq = responses["sport-frequence"] as string;
  const typeSport = toStringArray(responses["type-sport"]);
  const recuperation = responses["recuperation"] as string;
  const performanceEvolution = responses["performance-evolution"] as string;
  const blessures = toStringArray(responses["blessures"]);

  // Nouvelles questions peri-workout
  const cardioJeun = responses["cardio-jeun"] as string;
  const glucidesPreCardio = responses["glucides-pre-cardio"] as string;
  const glucidesPreMuscu = responses["glucides-pre-muscu"] as string;
  const glucidesIntra = responses["glucides-intra"] as string;
  const bcaaEaaIntra = responses["bcaa-eaa-intra"] as string;
  const repasPostTraining = responses["repas-post-training"] as string;
  const shakePost = responses["shake-post"] as string;
  const timingTraining = responses["timing-training"] as string;

  // Score frequence entrainement
  let freqScore = 60;
  if (sportFreq === "5+") freqScore = 90;
  else if (sportFreq === "3-4") freqScore = 80;
  else if (sportFreq === "1-2") freqScore = 60;
  else if (sportFreq === "0") {
    freqScore = 20;
    insights.push("L'absence totale d'activite physique est un facteur de risque majeur pour la sante metabolique, cardiovasculaire, et mentale. La sedentarite accelere la perte musculaire (sarcopenie), la resistance a l'insuline, et le declin cognitif. L'exercice est le plus puissant 'medicament' anti-vieillissement connu.");
    recommendations.push("Commencer progressivement : 2-3 seances de 30 min par semaine, meme de la marche rapide.");
    actionItems.push("Programmer 3 seances de sport fixes dans ton agenda cette semaine");
  }
  subMetrics.push({ name: "Frequence entrainement", score: freqScore, status: getStatus(freqScore) });

  // Score recuperation
  let recupScore = 70;
  if (recuperation === "excellente") recupScore = 95;
  else if (recuperation === "bonne") recupScore = 80;
  else if (recuperation === "moyenne") recupScore = 60;
  else if (recuperation === "mauvaise") {
    recupScore = 35;
    insights.push("Une mauvaise recuperation est le signe d'un desequilibre entre le stress de l'entrainement et ta capacite de regeneration. Cela peut indiquer : surentrainement, sommeil insuffisant, nutrition inadequate (surtout proteines), stress chronique elevant le cortisol, ou deficits en micronutriments (magnesium, zinc, fer).");
    recommendations.push("Reduire temporairement le volume d'entrainement de 30-40% pendant 1-2 semaines (deload).");
    recommendations.push("Prioriser le sommeil : 7-9h par nuit minimum, et augmenter les proteines a 2g/kg.");
    
    supplements.push({
      name: "ZMA (Zinc, Magnesium, B6)",
      dosage: "Zinc 30mg, Magnesium 450mg, B6 10mg",
      timing: "30-60 min avant le coucher, a jeun",
      duration: "Continue",
      why: "Ces trois nutriments sont essentiels a la recuperation musculaire et sont souvent deficitaires chez les sportifs (pertes par la transpiration). Le ZMA ameliore la qualite du sommeil profond, crucial pour la secretion de GH et la reparation tissulaire.",
      brands: ["NOW Foods ZMA", "Thorne ZMA"],
      warnings: "Prendre a jeun (le calcium des produits laitiers interfere avec l'absorption du zinc)."
    });
  }
  subMetrics.push({ name: "Recuperation", score: recupScore, status: getStatus(recupScore) });

  // Score progression
  let progressionScore = 70;
  if (performanceEvolution === "progression") progressionScore = 90;
  else if (performanceEvolution === "stagnation") {
    progressionScore = 55;
    insights.push("La stagnation des performances indique que ton corps s'est adapte aux stimuli actuels. Les plateaux sont normaux mais doivent etre brises par des changements strategiques : variation des exercices, periodisation, ou optimisation de la recuperation/nutrition.");
    recommendations.push("Varier les stimuli : changer l'ordre des exercices, les tempos, les angles, ou les methodes d'intensification.");
    recommendations.push("Evaluer si la nutrition (proteines, calories) et la recuperation sont adequates pour supporter la progression.");
  } else if (performanceEvolution === "regression") {
    progressionScore = 30;
    insights.push("La regression des performances est un signal d'alarme : surentrainement, deficit calorique excessif, stress chronique, probleme hormonal, ou maladie. Ton corps n'arrive pas a s'adapter positivement aux stimuli.");
    recommendations.push("STOP : prendre une semaine de repos complet (active recovery seulement).");
    recommendations.push("Faire un bilan sanguin complet incluant testosterone, cortisol, fer, et marqueurs inflammatoires.");
    actionItems.push("Programmer un bilan sanguin sportif complet");
  }
  subMetrics.push({ name: "Progression", score: progressionScore, status: getStatus(progressionScore) });

  // PERI-WORKOUT ANALYSIS
  let periWorkoutScore = 70;

  // Cardio a jeun + glucides pre-cardio
  if (cardioJeun === "souvent" || cardioJeun === "toujours") {
    if (glucidesPreCardio === "oui") {
      periWorkoutScore -= 20;
      insights.push("Tu fais du cardio 'a jeun' mais tu prends des glucides avant... ce qui annule completement l'interet du cardio a jeun ! Les glucides declenchent une secretion d'insuline qui bloque la lipolyse. Pour maximiser la combustion des graisses, le cardio a jeun doit etre fait SANS aucun apport glucidique - cafe noir ou eau seulement.");
      recommendations.push("Cardio a jeun = zero glucides avant. Cafe noir ou eau uniquement. L-carnitine optionnelle (500-1000mg 30min avant).");
    } else if (glucidesPreCardio === "non") {
      periWorkoutScore += 15;
      insights.push("Ton cardio a jeun sans glucides est une strategie efficace pour maximiser la lipolyse. Le corps utilise preferentiellement les acides gras comme carburant quand l'insuline est basse. Continue ainsi, mais veille a limiter l'intensite (zone 2, 60-70% FCmax) pour rester en mode aerobic.");
    }
  }

  // Glucides pre-musculation
  if (glucidesPreMuscu === "non" && !bcaaEaaIntra?.includes("oui")) {
    periWorkoutScore -= 15;
    insights.push("S'entrainer en musculation sans glucides pre-workout ET sans acides amines pendant l'entrainement favorise le catabolisme musculaire. Sans substrat energetique (glycogene) ni acides amines circulants, le corps puise dans les proteines musculaires pour fournir de l'energie. Le cortisol monte, l'insuline est basse, et la balance azotee devient negative.");
    recommendations.push("Deux options anti-catabolisme : 1) Glucides 1-2h avant (30-50g complexes) pour remplir le glycogene, OU 2) EAA/BCAA pendant l'entrainement (10-15g) pour proteger les muscles.");
    
    supplements.push({
      name: "EAA (Acides Amines Essentiels)",
      dosage: "10-15g",
      timing: "Pendant l'entrainement (intra-workout)",
      duration: "A chaque seance intense",
      why: "Les EAA, contrairement aux BCAA, contiennent tous les acides amines essentiels necessaires a la synthese proteique. En intra-workout, ils fournissent des substrats directement utilisables sans necessiter de digestion, protegeant les muscles du catabolisme meme en absence de glucides.",
      brands: ["Thorne Amino Complex", "Kaged Muscle Amino Synergy"],
      warnings: "Les EAA sont superieurs aux BCAA car complets. Les BCAA seuls manquent les autres acides amines limitants."
    });
  } else if (glucidesPreMuscu === "oui-repas" || glucidesPreMuscu === "oui-collation") {
    periWorkoutScore += 10;
  }

  // Glucides intra-training
  if (glucidesIntra === "non" && sportFreq === "5+" && (typeSport?.includes("musculation") || typeSport?.includes("hiit"))) {
    insights.push("Pour des entrainements frequents et intenses (5+/semaine), les glucides intra-workout peuvent optimiser les performances et limiter la fatigue centrale. Ils maintiennent la glycemie stable, epargnent le glycogene, et creent un environnement anabolique (insuline moderee).");
    recommendations.push("Pour les seances > 60min intenses : 20-40g de glucides rapides (dextrose, maltodextrine, cyclic dextrin) dans ta bouteille.");
  }

  // BCAA/EAA/HMB analysis
  if (bcaaEaaIntra === "oui-bcaa") {
    insights.push("Les BCAA seuls sont un choix suboptimal. Ils ne contiennent que 3 acides amines (leucine, isoleucine, valine) alors que la synthese proteique necessite les 9 acides amines essentiels. Sans les autres EAA, les BCAA peuvent meme etre contre-productifs en creant un desequilibre.");
    recommendations.push("Passer aux EAA (Essential Amino Acids) qui contiennent les 9 acides amines, dont les BCAA. Meilleur retour sur investissement.");
  } else if (bcaaEaaIntra === "oui-eaa") {
    periWorkoutScore += 10;
  } else if (bcaaEaaIntra === "oui-hmb") {
    periWorkoutScore += 5;
    insights.push("Le HMB (beta-hydroxy-beta-methylbutyrate) est un metabolite de la leucine qui reduit le catabolisme musculaire. Il est particulierement utile en deficit calorique, en deload, ou pour les debutants. Pour les pratiquants avances en surplus calorique, son benefice additionnel est plus limite.");
  }

  // Repas post-training
  if (repasPostTraining === "plus") {
    periWorkoutScore -= 10;
    insights.push("Attendre plus de 2 heures apres l'entrainement pour manger n'est pas optimal, meme si la 'fenetre anabolique' n'est pas aussi etroite qu'on le croyait. Apres un entrainement intense, le corps est en etat catabolique (cortisol eleve, glycogene epuise). Un apport rapide de proteines + glucides accelere la recuperation et maximise la synthese proteique.");
    recommendations.push("Repas ou shake dans les 60-90 min post-entrainement ideal. Proteines (30-40g) + glucides (0.5-1g/kg) pour recuperation optimale.");
  } else if (repasPostTraining === "immediat") {
    periWorkoutScore += 5;
  }

  // Shake post-training optimization
  if (shakePost === "whey-glucides") {
    periWorkoutScore += 10;
    insights.push("Whey + glucides rapides post-entrainement est la strategie classique pour maximiser la recuperation. L'insuline declenchee par les glucides amplifie l'absorption des acides amines et accelere la resynthese du glycogene. C'est particulierement important si tu t'entraines 2x par jour ou avec un faible apport calorique global.");
  } else if (shakePost === "non" && recuperation === "mauvaise") {
    recommendations.push("Un shake post-entrainement (whey + glucides) peut significativement ameliorer ta recuperation deficiente actuelle.");
  }

  // Timing d'entrainement
  if (timingTraining === "soir") {
    insights.push("L'entrainement le soir (apres 18h) peut impacter le sommeil pour certaines personnes en raison de l'elevation de la temperature corporelle et de l'adrenaline. Si tu as des problemes de sommeil, essaie de terminer l'entrainement au moins 3h avant le coucher, ou migre vers des seances matinales.");
    recommendations.push("Si troubles du sommeil : terminer l'entrainement 3h avant le coucher minimum, ou essayer le matin.");
  } else if (timingTraining === "matin-jeun") {
    if (typeSport?.includes("musculation")) {
      insights.push("La musculation a jeun le matin est suboptimale pour la prise de masse. Les reserves de glycogene hepatique sont basses apres le jeune nocturne, et l'absence d'acides amines circulants favorise le catabolisme. Si tu tiens a t'entrainer tot, au minimum prends des EAA avant et pendant.");
      recommendations.push("Musculation matinale : au minimum EAA (10g) avant + pendant. Idealement, petit snack proteine 30-60min avant.");
    }
  }

  subMetrics.push({ name: "Strategie peri-workout", score: periWorkoutScore, status: getStatus(periWorkoutScore) });

  // Blessures
  let blessureScore = 90;
  if (blessures && blessures.length > 0 && !blessures.includes("aucune")) {
    blessureScore -= blessures.length * 10;
    insights.push(`Tu signales des douleurs/blessures (${blessures.join(", ")}). Les blessures chroniques indiquent souvent des desequilibres musculaires, des faiblesses stabilisatrices, ou une technique deficiente. Continuer a s'entrainer 'autour' de la douleur sans la traiter mene a des compensations qui creent de nouvelles blessures.`);
    recommendations.push("Consulter un kine du sport ou osteopathe pour identifier la cause racine de chaque douleur.");
    recommendations.push("Integrer du travail correctif : renforcement des muscles faibles, mobilite des zones raides.");
    
    supplements.push({
      name: "Collagene + Vitamine C",
      dosage: "10-15g collagene + 50-100mg vitamine C",
      timing: "30-60 min avant l'entrainement ou au coucher",
      duration: "Continue",
      why: "Le collagene fournit les acides amines (glycine, proline, hydroxyproline) specifiques aux tendons, ligaments et cartilages. La vitamine C est essentielle a la synthese du collagene. Etudes montrent une amelioration de la sante tendineuse et articulaire.",
      brands: ["Great Lakes Collagen", "Vital Proteins", "Bulletproof Collagen"],
      warnings: "Choisir collagene hydrolyse (peptides) pour meilleure absorption. Type I/III pour tendons, Type II pour cartilage."
    });
  }
  subMetrics.push({ name: "Sante articulaire", score: blessureScore, status: getStatus(blessureScore) });

  score = Math.round((freqScore + recupScore + progressionScore + periWorkoutScore + blessureScore) / 5);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil activite et performance revele ${score >= 70 ? "une pratique globalement bien structuree" : score >= 50 ? "des opportunites d'optimisation importantes" : "des lacunes significatives qui limitent tes resultats"}. ${recuperation === "mauvaise" ? "La recuperation deficiente est ton point faible majeur - sans recuperation, pas de progression." : ""} ${performanceEvolution === "regression" ? "La regression des performances est un signal d'alarme a ne pas ignorer." : ""}`;

  const scienceExplainer = "La performance sportive repose sur le principe de supercompensation : stress (entrainement) > fatigue > recuperation > adaptation. Sans recuperation adequate, le cycle se brise. Le timing nutritionnel peri-workout module l'environnement hormonal (insuline, cortisol, GH, testosterone) et la disponibilite des substrats (glycogene, acides amines). Optimiser ces variables peut faire la difference entre catabolisme et anabolisme.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Performance et entrainement bien optimises." : "Ton entrainement et ta recuperation necessitent des ajustements.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeHRVCardiaque(responses: Responses): SectionScore {
  return createBasicSection("HRV et Cardiaque", responses);
}

export function analyzeAnalysesBiomarqueurs(responses: Responses): SectionScore {
  return createBasicSection("Analyses et Biomarqueurs", responses);
}

export function analyzeLifestyleSubstances(responses: Responses): SectionScore {
  return createBasicSection("Lifestyle et Substances", responses);
}

export function analyzeBiomecaniqueMobilite(responses: Responses): SectionScore {
  return createBasicSection("Biomecanique et Mobilite", responses);
}

export function analyzePsychologieMental(responses: Responses): SectionScore {
  const recommendations: string[] = [];
  const insights: string[] = [];
  const supplements: SupplementProtocol[] = [];
  const subMetrics: SubMetric[] = [];
  const actionItems: string[] = [];
  let score = 70;

  const tcaHistorique = responses["tca-historique"] as string;
  const relationNourriture = responses["relation-nourriture"] as string;
  const depressionVecu = responses["depression-vecu"] as string;
  const traumaVecu = responses["trauma-vecu"] as string;
  const traumaImpact = responses["trauma-impact"] as string;
  const estimeSoi = responses["estime-soi"] as string;
  const soutienSocial = responses["soutien-social"] as string;
  const blocagesPerso = toStringArray(responses["blocages-perso"]);

  let tcaScore = 90;
  if (tcaHistorique === "actuel") {
    tcaScore = 25;
    insights.push("La presence actuelle de troubles du comportement alimentaire (TCA) est un signal d'alarme majeur qui doit etre pris tres au serieux. Les TCA ne sont pas une question de volonte mais de dysregulation neurobiologique profonde. L'hyperphagie boulimique implique des dysfonctionnements dans les circuits de la dopamine et de la serotonine. La restriction severe declenche des adaptations metaboliques de survie. L'orthorexie cree une obsession qui paradoxalement nuit a la sante.");
    recommendations.push("Consultation urgente avec un specialiste des TCA (psychiatre ou psychologue specialise) - les TCA ont les taux de mortalite les plus eleves de toutes les maladies mentales.");
    recommendations.push("Ne PAS commencer de regime restrictif - cela aggrave les TCA. La priorite est la regulrisation du comportement alimentaire avant toute optimisation.");
    actionItems.push("Cette semaine : prendre RDV avec un specialiste TCA (psychiatre, psychologue clinicien, ou centre specialise)");
    
    supplements.push({
      name: "NAC (N-Acetyl-Cysteine)",
      dosage: "1200-2400 mg/jour en 2 prises",
      timing: "Matin et soir avec repas",
      duration: "8-12 semaines",
      why: "Etudes cliniques montrent une reduction des comportements compulsifs alimentaires et des binge eating episodes",
      brands: ["Now Foods", "Jarrow Formulas"],
      warnings: "Peut causer nausees gastro-intestinales. Eviter si asthme severe."
    });
  } else if (tcaHistorique === "passe") {
    tcaScore = 60;
    insights.push("Ton historique de TCA est un element important a prendre en compte. Meme 'gueris', les anciens TCA laissent des traces neurobiologiques et psychologiques. Les circuits de recompense alimentaire restent sensibilises, et le stress peut reactiver les anciens patterns.");
    recommendations.push("Vigilance face aux regimes restrictifs qui peuvent reactiver les TCA - privilegier une approche flexible et bienveillante de l'alimentation.");
    recommendations.push("Maintenir un suivi psychologique preventif, surtout en periode de stress ou transition de vie.");
  }
  subMetrics.push({ name: "Sante alimentaire psychologique", score: tcaScore, status: getStatus(tcaScore) });

  let relationScore = 85;
  if (relationNourriture === "toxique") {
    relationScore = 20;
    insights.push("Une relation toxique avec la nourriture indique une dysregulation profonde de l'axe faim-satiete et des mecanismes emotionnels lies a l'alimentation. Cela peut impliquer : utiliser la nourriture comme regulation emotionnelle, culpabilite intense apres avoir mange, cycles restriction/compulsion, obsession du poids ou des calories.");
    recommendations.push("Priorite absolue : travail therapeutique sur la relation a l'alimentation avant toute tentative de changement alimentaire.");
    actionItems.push("Tenir un journal emotions-alimentation pendant 2 semaines pour identifier les patterns");
  } else if (relationNourriture === "difficile") {
    relationScore = 45;
    recommendations.push("Explorer les liens entre emotions et alimentation avec un accompagnement professionnel.");
  }
  subMetrics.push({ name: "Relation a la nourriture", score: relationScore, status: getStatus(relationScore) });

  let depressionScore = 90;
  if (depressionVecu === "modere-actuel") {
    depressionScore = 25;
    insights.push("La depression moderee a severe actuelle est une priorite de sante qui impacte tous les autres domaines. La depression n'est pas une faiblesse mais une maladie neurobiologique impliquant inflammation cerebrale, desequilibres neurotransmetteurs (serotonine, dopamine, BDNF), et dysfonction de l'axe HPA. Elle affecte directement le metabolisme, le sommeil, l'energie, et la capacite a maintenir des habitudes saines.");
    recommendations.push("Consultation avec un psychiatre pour evaluer la necessite d'un traitement pharmacologique - la depression moderee a severe repond bien aux antidepresseurs + therapie combinee.");
    recommendations.push("Therapie cognitive-comportementale (TCC) - efficacite prouvee egale aux antidepresseurs pour la depression moderee.");
    
    supplements.push({
      name: "Omega-3 EPA",
      dosage: "2000-4000 mg EPA/jour",
      timing: "Avec repas gras",
      duration: "Permanent",
      why: "Meta-analyses montrent efficacite antidepressive comparable aux antidepresseurs pour depression legere-moderee",
      brands: ["Nordic Naturals", "Life Extension"],
      warnings: "Choisir formule a dominante EPA (ratio EPA:DHA 2:1 minimum)"
    });
    supplements.push({
      name: "Vitamine D3",
      dosage: "4000-10000 UI/jour",
      timing: "Matin avec gras",
      duration: "Permanent avec suivi sanguin",
      why: "Carence en vitamine D fortement associee a la depression - corriger la carence ameliore significativement les symptomes",
      brands: ["Thorne", "Pure Encapsulations"],
      warnings: "Verifier taux sanguin apres 3 mois, viser 60-80 ng/mL"
    });
    
    actionItems.push("Cette semaine : prendre RDV avec un psychiatre ou medecin pour evaluation de la depression");
    actionItems.push("Marche quotidienne 20-30 min en exterieur - l'activite physique aerobique est antidepressive");
  } else if (depressionVecu === "leger-actuel") {
    depressionScore = 55;
    insights.push("La depression legere actuelle merite une attention particuliere. Meme 'legere', elle impacte l'energie, la motivation, et la capacite a maintenir des habitudes. Une intervention precoce peut prevenir l'aggravation.");
    recommendations.push("Psychotherapie (TCC ou ACT) recommandee comme premiere ligne pour depression legere.");
    recommendations.push("Activite physique reguliere (30 min 5x/semaine) - efficacite antidepressive prouvee.");
  } else if (depressionVecu === "passe") {
    depressionScore = 70;
    recommendations.push("Maintenir les facteurs protecteurs : exercice regulier, sommeil, liens sociaux, gestion du stress.");
  }
  subMetrics.push({ name: "Sante mentale / depression", score: depressionScore, status: getStatus(depressionScore) });

  let traumaScore = 85;
  if (traumaVecu === "oui-non-traite" && (traumaImpact === "souvent" || traumaImpact === "constamment")) {
    traumaScore = 30;
    insights.push("Les traumatismes non traites qui impactent encore ta vie quotidienne sont un frein majeur a toute transformation. Le trauma reste 'coince' dans le systeme nerveux, maintenant une activation chronique de l'axe du stress. Cela cree : hypervigilance constante, difficulte a se relaxer, troubles du sommeil, reactivite emotionnelle intense, et difficulte a maintenir des habitudes saines.");
    recommendations.push("Priorite : travail therapeutique specialise en trauma (EMDR, therapie somatique, IFS) avec un professionnel forme.");
    recommendations.push("Les approches somatiques (yoga trauma-informed, respiration) peuvent etre des complements utiles mais ne remplacent pas le travail therapeutique.");
    actionItems.push("Rechercher un therapeute specialise en trauma (EMDR, Somatic Experiencing) dans ta region");
    
    supplements.push({
      name: "Magnesium Glycinate",
      dosage: "400-600 mg/jour",
      timing: "Soir avant coucher",
      duration: "Permanent",
      why: "Le stress chronique lie au trauma epuise le magnesium. Le glycinate a des effets anxiolytiques additionnels",
      brands: ["Pure Encapsulations", "NOW Foods"],
      warnings: "Peut causer selles molles si dose trop elevee"
    });
  } else if (traumaVecu === "oui-traite") {
    traumaScore = 75;
    insights.push("Ton travail sur les traumatismes passes est un atout important. Meme apres un travail therapeutique, rester attentif aux periodes de stress qui peuvent reactiver d'anciens patterns.");
  }
  subMetrics.push({ name: "Impact traumatique", score: traumaScore, status: getStatus(traumaScore) });

  let estimeScore = 80;
  if (estimeSoi === "tres-basse" || estimeSoi === "basse") {
    estimeScore = estimeSoi === "tres-basse" ? 25 : 45;
    insights.push("Une faible estime de soi est a la fois cause et consequence de nombreux comportements qui sabotent la transformation physique. Elle peut mener a : auto-sabotage inconscient, difficulte a maintenir les changements positifs ('je ne le merite pas'), comparaison constante aux autres, objectifs irrealistes ou abandon premature.");
    recommendations.push("Travail therapeutique sur l'estime de soi (TCC, therapie des schemas) pour identifier et modifier les croyances limitantes.");
    recommendations.push("Focus sur les petites victoires quotidiennes plutot que sur les objectifs lointains - cela reconstruit l'estime de soi progressivement.");
    actionItems.push("Chaque soir, noter 3 choses que tu as bien faites dans la journee (meme petites)");
  }
  subMetrics.push({ name: "Estime de soi", score: estimeScore, status: getStatus(estimeScore) });

  let soutienScore = 80;
  if (soutienSocial === "pas-du-tout" || soutienSocial === "peu") {
    soutienScore = soutienSocial === "pas-du-tout" ? 30 : 50;
    insights.push("Le manque de soutien social est un facteur de risque majeur pour l'abandon des objectifs de sante. Les etudes montrent que l'entourage impacte directement nos comportements : nous adoptons les habitudes de notre environnement. L'isolement augmente aussi le stress et reduit la motivation.");
    recommendations.push("Chercher une communaute alignee avec tes objectifs (groupe de sport, communaute en ligne, coaching de groupe).");
    recommendations.push("Communiquer tes objectifs a tes proches et demander leur soutien explicitement.");
  }
  subMetrics.push({ name: "Soutien social", score: soutienScore, status: getStatus(soutienScore) });

  let blocageScore = 85;
  if (blocagesPerso.includes("auto-sabotage")) {
    blocageScore -= 25;
    insights.push("L'auto-sabotage n'est pas un manque de volonte mais un mecanisme de protection inconscient. Il se manifeste souvent quand une partie de toi 'ne se sent pas en securite' avec le changement envisage, ou quand le succes cree une dissonance avec ton image de toi.");
    recommendations.push("Explorer les benefices secondaires du statu quo avec un therapeute - qu'est-ce que tu 'gagnes' a ne pas changer ?");
  }
  if (blocagesPerso.includes("peur-echec")) {
    blocageScore -= 15;
    insights.push("La peur de l'echec peut te maintenir dans l'inaction ou le perfectionnisme paralysant. Elle vient souvent d'experiences passees ou d'un environnement critique dans l'enfance.");
    recommendations.push("Reframer l'echec comme feedback necessaire a l'apprentissage - chaque 'echec' est une information utile.");
  }
  if (blocagesPerso.includes("perfectionnisme")) {
    blocageScore -= 10;
    insights.push("Le perfectionnisme est souvent une strategie pour eviter les critiques, mais il devient un frein majeur. 'Tout ou rien' mene souvent a 'rien'.");
    recommendations.push("Adopter la regle du 'C'est assez bien' - 80% fait est mieux que 100% jamais commence.");
  }
  subMetrics.push({ name: "Blocages personnels", score: blocageScore, status: getStatus(blocageScore) });

  score = Math.round((tcaScore + relationScore + depressionScore + traumaScore + estimeScore + soutienScore + blocageScore) / 7);
  score = Math.max(20, Math.min(100, score));

  const detailedAnalysis = `Ton profil psychologique revele ${score >= 70 ? "des fondations mentales solides qui soutiendront ta transformation" : score >= 50 ? "des zones d'attention psychologique qui doivent etre addressees pour une transformation durable" : "des blocages psychologiques majeurs qui, s'ils ne sont pas traites, saboteront inevitablement tes efforts physiques"}. La sante mentale n'est pas separee de la sante physique - elle en est le fondement. ${depressionVecu === "modere-actuel" || depressionVecu === "leger-actuel" ? "La depression actuelle doit etre ta priorite numero un." : ""} ${tcaHistorique === "actuel" ? "Les TCA actifs necessitent une prise en charge specialisee avant toute modification alimentaire." : ""} ${traumaVecu === "oui-non-traite" && traumaImpact !== "na" && traumaImpact !== "non" ? "Le travail sur les traumatismes est essentiel pour debloquer ton potentiel." : ""}`;

  const scienceExplainer = "Le lien corps-esprit n'est pas metaphorique mais physiologique. Le stress psychologique chronique maintient une inflammation systemique (via IL-6, TNF-alpha, CRP), dysregule l'axe HPA (cortisol), perturbe le microbiome (axe intestin-cerveau), et reduit le BDNF (facteur neurotrophique). Les traumatismes s'inscrivent litteralement dans le corps : modification de l'expression genetique (epigenetique), hyperactivite de l'amygdale, et reduction du cortex prefrontal. Traiter la psyche, c'est traiter le corps.";

  return {
    score,
    level: getLevel(score),
    summary: score >= 70 ? "Fondations psychologiques solides." : "Des blocages psychologiques necessitent attention.",
    detailedAnalysis,
    recommendations,
    insights,
    subMetrics,
    supplements,
    actionItems,
    scienceExplainer
  };
}

export function analyzeNeurotransmetteurs(responses: Responses): SectionScore {
  return createBasicSection("Neurotransmetteurs", responses);
}

export function generateFullAnalysis(responses: Responses): AnalysisResult {
  const normalized = normalizeResponses(responses);
  const sections: Record<string, SectionScore> = {
    "profil-base": analyzeProfilBase(normalized),
    "composition-corporelle": analyzeCompositionCorporelle(normalized),
    "metabolisme-energie": analyzeMetabolismeEnergie(normalized),
    "nutrition-tracking": analyzeNutritionTracking(normalized),
    "digestion-microbiome": analyzeDigestionMicrobiome(normalized),
    "activite-performance": analyzeActivitePerformance(normalized),
    "sommeil-recuperation": analyzeSommeilRecuperation(normalized),
    "hrv-cardiaque": analyzeHRVCardiaque(normalized),
    "analyses-biomarqueurs": analyzeAnalysesBiomarqueurs(normalized),
    "hormones-stress": analyzeHormonesStress(normalized),
    "lifestyle-substances": analyzeLifestyleSubstances(normalized),
    "biomecanique-mobilite": analyzeBiomecaniqueMobilite(normalized),
    "psychologie-mental": analyzePsychologieMental(normalized),
    neurotransmetteurs: analyzeNeurotransmetteurs(normalized),
  };

  const sectionScores = Object.values(sections).map((s) => s.score);
  const global = Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length);

  const sortedByScore = Object.entries(sections).sort(([, a], [, b]) => a.score - b.score);
  const priorities = sortedByScore.slice(0, 3).map(([id]) => id);
  const strengths = sortedByScore.slice(-3).reverse().map(([id]) => id);

  const allSupplements: SupplementProtocol[] = [];
  Object.values(sections).forEach(s => {
    allSupplements.push(...s.supplements);
  });

  const uniqueSupplements = allSupplements.filter((sup, idx, self) => 
    idx === self.findIndex(s => s.name === sup.name)
  ).slice(0, 8);

  const priorityRecs = sortedByScore.slice(0, 3).flatMap(([, s]) => s.recommendations.slice(0, 3));
  const allRecs = Object.values(sections).flatMap(s => s.recommendations);

  const week1 = priorityRecs.slice(0, 4);
  const week2 = priorityRecs.slice(4, 8).length > 0 ? priorityRecs.slice(4, 8) : allRecs.slice(0, 4);
  const week3_4 = allRecs.slice(8, 12).length > 0 ? allRecs.slice(8, 12) : allRecs.slice(4, 8);
  const month2_3 = allRecs.slice(12, 16);

  let globalSummary = "";
  if (global >= 75) {
    globalSummary = "Ton profil NEUROCORE 360 revele des fondations excellentes. Tu es dans le top 20% des personnes que nous analysons. Les recommandations ci-dessous te permettront de passer du 'bien' a 'l'exceptionnel' en ciblant les quelques points d'optimisation restants.";
  } else if (global >= 60) {
    globalSummary = "Ton profil NEUROCORE 360 montre un potentiel significatif avec des zones d'optimisation claires. En adressant systematiquement les priorites identifiees, tu peux t'attendre a des gains notables en energie, composition corporelle et bien-etre general dans les 8-12 prochaines semaines.";
  } else if (global >= 45) {
    globalSummary = "Ton profil NEUROCORE 360 met en evidence des domaines necessitant une attention immediate. La bonne nouvelle : avec les interventions ciblees que nous proposons, tu as un potentiel de transformation important. Concentre-toi sur les 3 priorites avant d'aller plus loin.";
  } else {
    globalSummary = "Ton profil NEUROCORE 360 revele des desequilibres majeurs qui expliquent probablement beaucoup de tes symptomes actuels. C'est une base de travail precieuse : chaque zone identifiee est une opportunite d'amelioration concrete. Avec un plan structure, les progres seront visibles rapidement.";
  }

  const executiveSummary = generateExecutiveSummary(global, sections, priorities, strengths, responses);

  const lifestyleProtocol = [
    "Reveil a heure fixe 7 jours sur 7 (+/- 30 min max)",
    "Exposition a la lumiere naturelle dans les 30 min suivant le reveil",
    "Petit-dejeuner proteique dans l'heure suivant le reveil",
    "Mouvement toutes les 45 min si travail sedentaire",
    "Dernier cafe avant 14h",
    "Dernier repas 3h avant le coucher",
    "Zero ecran 1h avant le coucher",
    "Chambre a 18-19°C, obscurite totale",
  ];

  return {
    global,
    globalSummary,
    sections,
    priorities,
    strengths,
    actionPlan: { week1, week2, week3_4, month2_3 },
    executiveSummary,
    supplementStack: uniqueSupplements,
    lifestyleProtocol,
  };
}

function generateExecutiveSummary(
  global: number,
  sections: Record<string, SectionScore>,
  priorities: string[],
  strengths: string[],
  responses: Responses
): string {
  const objectif = responses["objectif"] as string || "";
  const sexe = responses["sexe"] as string || "";
  const age = responses["age"] as string || "";

  const sectionNames: Record<string, string> = {
    "profil-base": "Profil de Base",
    "composition-corporelle": "Composition Corporelle",
    "metabolisme-energie": "Metabolisme et Energie",
    "nutrition-tracking": "Nutrition",
    "digestion-microbiome": "Digestion et Microbiome",
    "activite-performance": "Activite Physique",
    "sommeil-recuperation": "Sommeil et Recuperation",
    "hrv-cardiaque": "Sante Cardiovasculaire",
    "analyses-biomarqueurs": "Biomarqueurs",
    "hormones-stress": "Hormones et Stress",
    "lifestyle-substances": "Mode de Vie",
    "biomecanique-mobilite": "Mobilite et Posture",
    "psychologie-mental": "Psychologie et Mental",
    neurotransmetteurs: "Neurotransmetteurs",
  };

  let summary = `Avec un score global de ${global}%, ton audit NEUROCORE 360 complete revele `;
  
  if (global >= 70) {
    summary += "un profil globalement sain avec des opportunites d'optimisation ciblees. ";
  } else if (global >= 50) {
    summary += "plusieurs axes d'amelioration qui, une fois adresses, transformeront significativement ta sante et tes performances. ";
  } else {
    summary += "des desequilibres importants qui expliquent probablement une grande partie de tes symptomes actuels. La bonne nouvelle : ces desequilibres sont identifies et adressables. ";
  }

  if (objectif === "perte-graisse") {
    summary += "Pour ton objectif de perte de graisse, nous avons identifie les leviers metaboliques et hormonaux specifiques a activer. ";
  } else if (objectif === "prise-muscle") {
    summary += "Pour ta prise de muscle, le plan cible l'optimisation de ta nutrition proteique, ta recuperation, et tes hormones anaboliques. ";
  } else if (objectif === "energie") {
    summary += "Pour booster ton energie, nous ciblons tes mitochondries, ta glycemie, et ton sommeil - les trois piliers energetiques. ";
  }

  const priorityScores = priorities.map(p => sections[p]?.score || 0);
  const worstScore = Math.min(...priorityScores);
  
  summary += `Tes priorites immediates sont ${priorities.map(p => sectionNames[p]).join(", ")} (scores de ${priorityScores.join("%, ")}%). `;
  
  if (strengths.length > 0) {
    summary += `Points forts a maintenir : ${strengths.map(s => sectionNames[s]).join(", ")}. `;
  }

  summary += "Le plan d'action detaille ci-dessous est structure par semaines pour une implementation progressive et durable.";

  return summary;
}

export function calculateScoresFromResponses(responses: Responses): Record<string, number> {
  const analysis = generateFullAnalysis(responses);
  const scores: Record<string, number> = { global: analysis.global };

  for (const [sectionId, sectionData] of Object.entries(analysis.sections)) {
    const key = sectionId.replace(/-/g, "");
    scores[key] = sectionData.score;
  }

  return scores;
}
