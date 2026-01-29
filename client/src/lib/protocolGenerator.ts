import type { ProtocolStep, Supplement } from "@/types/blood";

type ProtocolPhase = {
  id: string;
  title: string;
  items: string[];
};

type Recommendation = {
  action: string;
  dosage?: string;
  timing?: string;
  why: string;
};

type Recommendations = {
  priority1?: Recommendation[];
  priority2?: Recommendation[];
};

const phaseFromId = (id: string): ProtocolStep["phase"] => {
  if (id === "phase-1") return "immediate";
  if (id === "phase-2") return "short_term";
  return "long_term";
};

const priorityFromPhase = (phase: ProtocolStep["phase"]): ProtocolStep["priority"] => {
  if (phase === "immediate") return "high";
  if (phase === "short_term") return "medium";
  return "low";
};

const categoryFromPhase = (phase: ProtocolStep["phase"]): ProtocolStep["category"] => {
  if (phase === "long_term") return "retest";
  return "lifestyle";
};

export function buildProtocolSteps(phases: ProtocolPhase[] | undefined): ProtocolStep[] {
  if (!phases || !phases.length) return [];
  return phases.flatMap((phase) => {
    const mappedPhase = phaseFromId(phase.id);
    const priority = priorityFromPhase(mappedPhase);
    const category = categoryFromPhase(mappedPhase);
    return phase.items.map((item) => ({
      phase: mappedPhase,
      category,
      priority,
      action: item,
      duration: phase.title,
      markers: [],
    }));
  });
}

export function buildSupplements(
  recommendations: Recommendations | undefined,
  comprehensiveData?: { supplements?: Array<any> }
): Supplement[] {
  // If comprehensive data available, use it (has citations)
  if (comprehensiveData?.supplements?.length) {
    return comprehensiveData.supplements.map((supp: any) => ({
      name: supp.name,
      dosage: supp.dosage,
      timing: supp.timing,
      brand: supp.brand || null,
      markers: supp.targetMarkers || [],
      studies: [],
      citations: supp.citations || [],
      mechanism: supp.mechanism || null,
    }));
  }

  // Fallback to old format (no citations)
  if (!recommendations) return [];
  const mapRecommendation = (rec: Recommendation): Supplement => ({
    name: rec.action,
    dosage: rec.dosage ?? "",
    timing: rec.timing ?? "",
    brand: null,
    markers: [],
    studies: [],
    citations: [],
    mechanism: null,
  });
  return [...(recommendations.priority1 ?? []), ...(recommendations.priority2 ?? [])].map(mapRecommendation);
}
