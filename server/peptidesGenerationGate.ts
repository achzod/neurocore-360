import type { PeptidesStackPolicy } from "./peptidesStackPolicy";

export interface GeneratedPeptideGateItem {
  name?: unknown;
  dosage?: unknown;
  route?: unknown;
  purpose?: unknown;
  whyThisPeptide?: unknown;
  activationStatus?: unknown;
}

export interface LivePricingSnapshot {
  peptide?: unknown;
}

export function isGeneratedConditionalInactive(
  peptide: GeneratedPeptideGateItem,
): boolean {
  return peptide.activationStatus === "conditional-inactive";
}

export function shouldApplyOperationalPostProcessing(
  peptide: GeneratedPeptideGateItem,
): boolean {
  return !isGeneratedConditionalInactive(peptide);
}

function normalizeCoverageText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase();
}

const GOAL_COVERAGE_PATTERNS: Record<string, RegExp> = {
  recovery: /\b(?:recovery|recuperation|reparation|guerison|tendon|articulation|blessure|bpc[ -]?157|tb[ -]?500)\b/i,
  fatloss: /\b(?:fat\s*loss|perte de (?:gras|graisse|poids)|masse grasse|seche|appetit|satiete|retatrutide|semaglutide|tirzepatide)\b/i,
  "skin-hair": /\b(?:skin|hair|peau|cheveux|capillaire|ghk[ -]?cu)\b/i,
  sleep: /\b(?:sleep|sommeil|endormissement|dsip)\b/i,
  cognitive: /\b(?:cognitif|cognition|focus|memoire|concentration|semax|selank)\b/i,
  libido: /\b(?:libido|sexuel|erection|pt[ -]?141|kisspeptin)\b/i,
  "testo-boost": /\b(?:testosterone|axe hpg|hpg axis|enclomiphene|kisspeptin|hcg)\b/i,
  "gh-antiaging": /\b(?:hormone de croissance|axe gh|gh axis|anti[ -]?age|longevite|cjc[ -]?1295|ipamorelin|sermorelin|tesamorelin|mk[ -]?677|ibutamoren)\b/i,
  endurance: /\b(?:endurance|cardio|aerobie|mots[ -]?c)\b/i,
};

function isNegatedCoverageStatement(text: string): boolean {
  return /\b(?:ne|n')\s+(?:couvre|vise|soutient|traite|ameliore|concerne)[^.!?;]{0,80}\b(?:pas|aucun|aucune)\b/i.test(text)
    || /\bn\s+est\s+pas\s+(?:destine|indique|adapte)\s+(?:a|pour)\b/i.test(text)
    || /\b(?:does\s+not|doesn't|is\s+not\s+intended\s+for|not\s+for|no\s+benefit\s+for|sans\s+(?:effet|benefice|action)\s+(?:sur|pour)|non\s+indique\s+(?:pour|sur))\b/i.test(text);
}

function itemSupportsGoal(item: GeneratedPeptideGateItem, goal: string): boolean {
  const normalizedGoal = normalizeCoverageText(goal).trim();
  const pattern = GOAL_COVERAGE_PATTERNS[normalizedGoal];
  const fields = [item.name, item.purpose, item.whyThisPeptide]
    .map(normalizeCoverageText)
    .filter(Boolean);
  if (pattern) {
    return fields.some((field) => pattern.test(field) && !isNegatedCoverageStatement(field));
  }
  return Boolean(normalizedGoal && fields.some((field) =>
    field.includes(normalizedGoal) && !isNegatedCoverageStatement(field)
  ));
}

function maximumDistinctAxisCoverage(
  items: GeneratedPeptideGateItem[],
  goals: string[],
): number {
  const assignedGoalByItem = new Map<number, number>();
  const tryAssign = (goalIndex: number, visited: Set<number>): boolean => {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      if (visited.has(itemIndex) || !itemSupportsGoal(items[itemIndex], goals[goalIndex])) continue;
      visited.add(itemIndex);
      const previousGoal = assignedGoalByItem.get(itemIndex);
      if (previousGoal === undefined || tryAssign(previousGoal, visited)) {
        assignedGoalByItem.set(itemIndex, goalIndex);
        return true;
      }
    }
    return false;
  };

  let covered = 0;
  for (let goalIndex = 0; goalIndex < goals.length; goalIndex++) {
    if (tryAssign(goalIndex, new Set())) covered++;
  }
  return covered;
}

export function validateGeneratedPeptideStack(
  peptides: GeneratedPeptideGateItem[] | null | undefined,
  policy: PeptidesStackPolicy,
  options: { skipMinimumCoverage?: boolean } = {},
): string[] {
  const items = Array.isArray(peptides) ? peptides : [];
  const issues: string[] = [];

  if (items.length < 1) {
    issues.push("VALIDATION: aucun peptide genere, probable truncation");
    return issues;
  }
  const activeItems = items.filter((peptide) => !isGeneratedConditionalInactive(peptide));
  const distinctActiveNames = new Set(
    activeItems
      .map((peptide) => normalizeCoverageText(peptide.name).replace(/[^a-z0-9]+/g, ""))
      .filter(Boolean),
  );
  if (!options.skipMinimumCoverage && distinctActiveNames.size < policy.minimumMolecules) {
    issues.push(
      `AXIS_COVERAGE_GATE: ${distinctActiveNames.size} molecule(s) active(s) distincte(s) pour ${policy.goals.length} axe(s), minimum ${policy.minimumMolecules}. Les cartes conditionnelles et les doublons ne couvrent pas le minimum.`,
    );
  }
  if (items.length > policy.maximumMolecules) {
    issues.push(
      `STACK_REDUNDANCY_GATE: ${items.length} molecule(s), maximum ${policy.maximumMolecules}. Retire uniquement les doublons ou ajouts sans objectif attribuable.`,
    );
  }

  if (activeItems.length < 1) {
    issues.push(
      "ACTIVE_AXIS_GATE: aucune molecule active; une phase uniquement conditionnelle ne remplit pas un protocole paye.",
    );
  }
  if (!options.skipMinimumCoverage && policy.multiAxis) {
    const distinctActiveItems = activeItems.filter((item, index) => {
      const name = normalizeCoverageText(item.name).replace(/[^a-z0-9]+/g, "");
      return Boolean(name) && activeItems.findIndex((candidate) =>
        normalizeCoverageText(candidate.name).replace(/[^a-z0-9]+/g, "") === name
      ) === index;
    });
    const coveredAxes = maximumDistinctAxisCoverage(distinctActiveItems, policy.goals);
    if (coveredAxes < policy.goals.length) {
      issues.push(
        `AXIS_ATTRIBUTION_GATE: ${coveredAxes}/${policy.goals.length} axe(s) couvert(s) par des molecules actives distinctes et attribuables.`,
      );
    }
  }

  const placeholderPattern = /^\s*$|\[|\]|TBD|\bX(?=\s*(?:mcg|µg|ug|mg|ml|kg|unit|unite|semaine|jour|$))\b|XXX|\?\?\?|^\?/i;
  for (const peptide of items) {
    const name = String(peptide.name || "").trim();
    if (!name) {
      issues.push("VALIDATION: peptide sans nom");
      continue;
    }
    if (isGeneratedConditionalInactive(peptide)) continue;

    const dose = String(peptide.dosage || "");
    const route = String(peptide.route || "").trim();
    if (!dose.trim() || !route) {
      issues.push(`VALIDATION: peptide actif incomplet, name=${name} dosage=${dose}`);
      continue;
    }
    if (placeholderPattern.test(dose)) {
      issues.push(`VALIDATION: dosage template non rempli pour ${name}, "${dose}"`);
      continue;
    }
    if (!/\d/.test(dose)) {
      issues.push(`VALIDATION: dosage sans valeur numerique pour ${name}, "${dose}"`);
      continue;
    }
    const firstNum = parseFloat(dose.replace(",", "."));
    if (Number.isFinite(firstNum) && firstNum === 0) {
      issues.push(`VALIDATION: dosage a zero pour ${name}, "${dose}"`);
    }
  }

  return issues;
}

export function findMissingActiveLivePricing(
  peptides: GeneratedPeptideGateItem[] | null | undefined,
  snapshots: LivePricingSnapshot[] | null | undefined,
): string[] {
  const pricedPeptides = new Set(
    (snapshots || [])
      .map((entry) => String(entry.peptide || "").trim().toLowerCase())
      .filter((name) => name && name !== "bac water"),
  );
  return (peptides || [])
    .filter((peptide) => !isGeneratedConditionalInactive(peptide))
    .map((peptide) => String(peptide.name || "").trim())
    .filter((name) => name && !pricedPeptides.has(name.toLowerCase()));
}
