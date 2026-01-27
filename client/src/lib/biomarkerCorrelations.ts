export type PatientContext = {
  age: number;
  sexe: "homme" | "femme" | "autre";
  poids: number;
  taille: number;
  bmi: number;
};

export type CorrelationInsight = {
  type: "warning" | "info" | "success";
  message: string;
  recommendation?: string;
};

export function getCorrelationInsights(
  markerCode: string,
  value: number,
  unit: string,
  context: PatientContext
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  const bmi = context.bmi;

  switch (markerCode) {
    case "testosterone_total": {
      if (context.sexe === "homme") {
        if (context.age < 30 && value < 500) {
          insights.push({
            type: "warning",
            message: `A ${context.age} ans, une testostérone <500 ${unit} est suboptimale (attendu: 600-900).`,
            recommendation: "Sommeil 7h30+, force 3-4x/sem, zinc 15-30 mg/j.",
          });
        } else if (context.age >= 30 && context.age < 40 && value < 450) {
          insights.push({
            type: "warning",
            message: `A ${context.age} ans, ta testostérone est basse (attendu: 550-850).`,
          });
        }
        if (bmi > 28) {
          insights.push({
            type: "info",
            message: `IMC ${bmi.toFixed(1)}: l'aromatisation peut baisser la testo de 10-20%.`,
            recommendation: "Objectif: -5 a -10% de poids pour remonter la testo.",
          });
        }
      }
      break;
    }
    case "glycemie_jeun": {
      if (value > 95 && bmi > 27) {
        insights.push({
          type: "warning",
          message: `Glycemie elevee + IMC ${bmi.toFixed(1)} = risque de resistance a l'insuline.`,
          recommendation: "Marche post-repas 10 min + reduction sucres simples.",
        });
      }
      if (value > 100 && context.age > 45) {
        insights.push({
          type: "warning",
          message: `A ${context.age} ans, >100 ${unit} augmente le risque diabetique.`,
        });
      }
      break;
    }
    case "hdl": {
      if (value < 40 && bmi > 28) {
        insights.push({
          type: "warning",
          message: `HDL bas + IMC eleve. Chaque point d'IMC perdu peut +2-3 ${unit}.`,
        });
      }
      break;
    }
    case "ldl": {
      if (value > 130 && bmi > 28) {
        insights.push({
          type: "warning",
          message: `LDL eleve et IMC ${bmi.toFixed(1)}: perte de poids 5-10% = -15-20% LDL.`,
        });
      }
      break;
    }
    case "crp_us": {
      if (value > 1.0 && bmi > 27) {
        insights.push({
          type: "warning",
          message: `CRP elevee: chaque point d'IMC >25 augmente l'inflammation.`,
          recommendation: "Priorite: perte de poids + omega-3 (2-3g EPA/DHA).",
        });
      }
      break;
    }
    case "vitamine_d": {
      if (value < 30 && context.age > 40) {
        insights.push({
          type: "warning",
          message: `Vitamine D <30 ${unit} a ${context.age} ans augmente le risque osseux.`,
          recommendation: "Supplementation 4000-6000 UI/j + soleil.",
        });
      }
      break;
    }
    case "tsh": {
      if (value > 2.5 && context.sexe === "femme" && context.age > 35) {
        insights.push({
          type: "info",
          message: "TSH >2.5 chez femme >35 ans: possible hypo subclinique.",
        });
      }
      break;
    }
    default:
      break;
  }

  return insights;
}
