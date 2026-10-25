import type { PeptidesStackPolicy } from "./peptidesStackPolicy";

export interface GeneratedPeptideGateItem {
  name?: unknown;
  dosage?: unknown;
  route?: unknown;
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
  if (!options.skipMinimumCoverage && items.length < policy.minimumMolecules) {
    issues.push(
      `AXIS_COVERAGE_GATE: ${items.length} molecule(s) pour ${policy.goals.length} axe(s), minimum ${policy.minimumMolecules}. Remplace les molecules non achetables sans supprimer les axes valides.`,
    );
  }
  if (items.length > policy.maximumMolecules) {
    issues.push(
      `STACK_REDUNDANCY_GATE: ${items.length} molecule(s), maximum ${policy.maximumMolecules}. Retire uniquement les doublons ou ajouts sans objectif attribuable.`,
    );
  }

  const activeItems = items.filter((peptide) => !isGeneratedConditionalInactive(peptide));
  if (activeItems.length < 1) {
    issues.push(
      "ACTIVE_AXIS_GATE: aucune molecule active; une phase uniquement conditionnelle ne remplit pas un protocole paye.",
    );
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
