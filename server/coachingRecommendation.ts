// Pure-function coaching tier recommender for APEXLABS Discovery clients.
// Reads a Discovery audit's scores + questionnaire responses, returns the most
// appropriate coaching tier for the nurture email. No side effects.
//
// Tiers:
//   ESSENTIAL  ,  entry level, mail 7j/7 48h, nutrition precision focus
//   ELITE      ,  WhatsApp lun-ven 9-19h, injury/rehab handling, weekly ajustments
//   PRIVATELAB ,  WhatsApp 7j/7 6h-minuit, premium, pluridisciplinary

export type CoachingTier = "ESSENTIAL" | "ELITE" | "PRIVATELAB";

export interface CoachingRecommendation {
  tier: CoachingTier;
  /** Short human-readable reason used in email subject/hero. */
  reason: string;
  /** Deep link to the specific formule page on achzodcoaching.com. */
  href: string;
}

const FORMULE_HREF: Record<CoachingTier, string> = {
  ESSENTIAL: "https://www.achzodcoaching.com/coaching-essential",
  ELITE: "https://www.achzodcoaching.com/coaching-elite",
  PRIVATELAB: "https://www.achzodcoaching.com/coaching-achzod-private-lab",
};

/** Normalize any string numeric/enum field to a finite number or null. */
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function lower(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.toLowerCase();
}

/**
 * Pick the best coaching tier for a given Discovery audit.
 *
 * Logic, from highest-tier down (first match wins):
 *
 *   PRIVATELAB
 *     - explicit high budget signal in responses (>= 500/month), OR
 *     - elite-athlete profile (>= 5-6 training sessions/week with ambitious objectif)
 *
 *   ELITE
 *     - low training score AND any injury/recovery/récupération mention,
 *       i.e. the client needs weekly adjustments + WhatsApp contact, OR
 *     - at least 3 out of 8 domains scoring critically low (<= 40/100)
 *       ,  a holistic overhaul benefits from Elite's broader touch
 *
 *   ESSENTIAL (default)
 *     - simpler single-axis focus (nutrition/composition/stress), mail 48h cadence
 *       is enough
 */
export function recommendCoachingTier(opts: {
  responses?: Record<string, unknown> | null;
  scores?: {
    globalScore?: number;
    scoresByDomain?: Partial<Record<string, number>>;
  } | null;
}): CoachingRecommendation {
  const r = opts.responses ?? {};
  const s = opts.scores?.scoresByDomain ?? {};

  // Budget signal ,  optional field `pep_budget`, `budget`, or free-text "combien"/"mensuel"
  const budgetStr = lower(r.budget ?? r.pep_budget ?? r["budget-mensuel"] ?? r["budget-coaching"]);
  const hasHighBudget =
    /500|600|700|800|1000|>500|>1000|>700/.test(budgetStr) ||
    /eleve|élevé|haut|illimite|illimité/.test(budgetStr);

  // Training frequency (answers like "5-6", "4-5", "7+")
  const freqStr = lower(r["sport-frequence"] ?? r.pep_training_freq ?? r["frequence-entrainement"] ?? "");
  const freqMax = (() => {
    const matches = freqStr.match(/\d+/g);
    if (!matches) return null;
    return Math.max(...matches.map(m => parseInt(m, 10)));
  })();
  const highFrequency = (freqMax ?? 0) >= 5;

  // Objectif ,  performance vs general wellness
  const objectifStr = lower(r.objectif ?? r["objectif-principal"] ?? r.pep_primary_goal ?? "");
  const performanceFocus = /performance|competition|athletic|high|pro|elite/.test(objectifStr);

  // Recovery/injury signals
  const injuryText = [
    r["blessures-actuelles"],
    r["historique-blessures"],
    r.pep_injury_details,
    r["douleurs-chroniques"],
  ]
    .map((v) => (typeof v === "string" ? v : ""))
    .join(" ")
    .toLowerCase();
  const hasInjury = /blessure|douleur|rupture|tendin|operation|opération|rééduc|reeduc|kine|kiné/.test(injuryText);

  // Domain scores (on 0-100 scale in Discovery)
  const training = toNumber(s.training) ?? 100;
  const recovery = Math.min(toNumber(s.sommeil) ?? 100, toNumber(s.stress) ?? 100);
  const criticallyLowCount = Object.values(s)
    .map((v) => toNumber(v) ?? 100)
    .filter((v) => v <= 40).length;

  // ── Tier decisions (first match wins) ──────────────────────────────────
  if (hasHighBudget && (performanceFocus || highFrequency)) {
    return {
      tier: "PRIVATELAB",
      reason:
        "Tu joues haut : fréquence d'entraînement élevée + objectif performance. Private Lab (WhatsApp 7j/7, reconstruction hebdo, analyses pluridisciplinaires) est calibré pour ton niveau.",
      href: FORMULE_HREF.PRIVATELAB,
    };
  }

  if ((training <= 55 && recovery <= 55) || hasInjury) {
    return {
      tier: "ELITE",
      reason:
        "Ton profil pointe une fragilité récupération/blessures. Elite (WhatsApp direct 5j/7, gestion blessures, correction vidéo) te permet d'ajuster en continu sans attendre 48h.",
      href: FORMULE_HREF.ELITE,
    };
  }

  if (criticallyLowCount >= 3) {
    return {
      tier: "ELITE",
      reason:
        "Plusieurs axes sont en rouge simultanément ,  ça demande une refonte globale. Elite te donne l'accès direct pour recaler plusieurs leviers en parallèle.",
      href: FORMULE_HREF.ELITE,
    };
  }

  return {
    tier: "ESSENTIAL",
    reason:
      "Ton profil est solide globalement avec 1-2 axes à corriger. Essential (plan + nutrition précision + bilans hebdos par mail) est la bonne entrée pour verrouiller les bases.",
    href: FORMULE_HREF.ESSENTIAL,
  };
}
