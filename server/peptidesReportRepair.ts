import type { PeptidesReport, PeptideItem, ReportSection } from "./peptidesEngine";
import {
  estimateNeedMg,
  extractTotalMgFromVials,
  extractVialMg,
  extractVialQty,
} from "./peptidesReportValidator";
import {
  auditClientFacingText,
  collectClientFacingStrings,
  sanitizeClientFacingText,
} from "./clientFacingQuality";
import { withoutOperationalVialPolicySummary } from "./peptidesVialPlanning";

type RepairableReport = PeptidesReport & {
  _peptauraLiveSync?: {
    country?: string;
    shippingUrl?: string;
    syncedAt?: string;
    catalogRefreshedAt?: string;
    shippingLive?: boolean;
    applied?: string[];
    failures?: string[];
    listingSnapshots?: Array<Record<string, unknown>>;
  };
};

function block(title: string, body: string): string {
  return `${title.toUpperCase()}\n${body.trim()}`;
}

function joinBlocks(...blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

function asSentence(value: string | undefined): string {
  const cleaned = sanitizeClientFacingText(String(value || "")).replace(/[.!?:]+\s*$/g, "");
  return cleaned ? `${cleaned}.` : "";
}

function stripProjectPrefix(value: string | undefined): string {
  return String(value || "")
    .replace(/^Projet (?:theorique )?(?:de )?(?:dosage|timing|voie|duree) a (?:faire )?(?:confirmer|valider)(?: medicalement)?\s*:\s*/i, "")
    .trim();
}

function normalizePeptideMention(value: string): string {
  return sanitizeClientFacingText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function peptideMentionKeys(name: string): string[] {
  const normalized = normalizePeptideMention(name);
  if (normalized.includes("cjc1295") && normalized.includes("ipamorelin")) {
    return ["cjc1295", "ipamorelin"];
  }
  const knownKeys = [
    "retatrutide",
    "bpc157",
    "tb500",
    "cjc1295",
    "ipamorelin",
    "mk677",
    "epitalon",
    "ghkcu",
    "semax",
    "selank",
    "dsip",
    "melanotan",
    "hexarelin",
    "tesamorelin",
    "sermorelin",
    "semaglutide",
    "tirzepatide",
  ];
  const matches = knownKeys.filter((key) => normalized.includes(key));
  return matches.length > 0 ? matches : [normalized];
}

function mentionsPeptide(value: string, peptideName: string): boolean {
  const normalized = normalizePeptideMention(value);
  return peptideMentionKeys(peptideName).some((key) => normalized.includes(key));
}

export function pruneUnintegratedBonusPeptides(
  sourceReport: PeptidesReport
): PeptidesReport {
  const report = sourceReport as RepairableReport;
  const protocolText = [
    report.weeklySchedule || "",
    ...(report.sections || [])
      .filter((section) =>
        /protocole|semaine type|calendrier/i.test(
          `${section.id || ""} ${section.title || ""}`
        )
      )
      .map((section) => section.content || ""),
  ].join("\n");

  report.peptides = (report.peptides || []).filter((peptide) => {
    const isBonus = /\bbonus\b/i.test(
      `${peptide.purpose || ""} ${peptide.whyThisPeptide || ""}`
    );
    return !isBonus || mentionsPeptide(protocolText, peptide.name || "");
  });
  return report;
}

function clientRequestedPeptideNames(responses: Record<string, unknown>): string {
  return [
    responses.pep_requested_peptides,
    responses.peptidesDemandes,
    responses.requestedPeptides,
    responses.pep_requested,
  ]
    .map((value) => String(value || ""))
    .filter(Boolean)
    .join("\n");
}

function isClientRequestedPeptide(
  peptideName: string,
  responses: Record<string, unknown>
): boolean {
  const requested = clientRequestedPeptideNames(responses);
  return Boolean(requested) && mentionsPeptide(requested, peptideName);
}

function peptideNameFromPeptauraFailure(failure: string): string {
  return sanitizeClientFacingText(String(failure || "").split(":")[0] || "");
}

function isUnavailablePeptauraFailure(failure: string): boolean {
  return /\b(?:aucune offre en stock|ne couvre le besoin|surstock|livraison indisponible|stock indisponible)\b/i.test(
    sanitizeClientFacingText(failure)
  );
}

function removeOperationalLinesForPeptides(value: string, peptideNames: string[]): string {
  const operationalSignal =
    /\b(?:dose|dosage|inject|injection|sous cutan|vial|vials|flacon|flacons|commande|commander|acheter|achat|matin|soir|coucher|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|protocole|cycle)\b|\b\d+(?:[.,]\d+)?\s*(?:mcg|ug|mg|ml|iu|ui)\b|(?:x|×)\s*\d+\b/i;
  return String(value || "")
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*\|\s*/))
    .map((line) => sanitizeClientFacingText(line))
    .filter(Boolean)
    .filter((line) => {
      const mentionsRemoved = peptideNames.some((name) => mentionsPeptide(line, name));
      return !mentionsRemoved || !operationalSignal.test(line);
    })
    .join("\n");
}

function removeSectionOperationalMentions(
  report: RepairableReport,
  peptideNames: string[]
): void {
  const operationalSignal =
    /\b(?:dose|dosage|inject|injection|sous cutan|vial|vials|flacon|flacons|commande|commander|acheter|achat|matin|soir|coucher|protocole|cycle|stack|retenu|retenue|ajouter|j'ajouterais)\b|\b\d+(?:[.,]\d+)?\s*(?:mcg|ug|mg|ml|iu|ui)\b/i;

  for (const section of report.sections || []) {
    section.content = sanitizeClientFacingText(
      String(section.content || "")
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .filter((paragraph) => {
          const mentionsRemoved = peptideNames.some((name) =>
            mentionsPeptide(paragraph, name)
          );
          return !mentionsRemoved || !operationalSignal.test(paragraph);
        })
        .join("\n\n")
    );
  }
}

function pruneUnavailableUnrequestedPeptides(
  report: RepairableReport,
  responses: Record<string, unknown>
): void {
  const failures = report._peptauraLiveSync?.failures || [];
  const unavailableNames = failures
    .filter(isUnavailablePeptauraFailure)
    .map(peptideNameFromPeptauraFailure)
    .filter(Boolean)
    .filter((name) => !isClientRequestedPeptide(name, responses));

  if (unavailableNames.length === 0 || (report.peptides || []).length === 0) return;

  const removablePeptides = (report.peptides || []).filter((peptide) =>
    unavailableNames.some((name) => mentionsPeptide(peptide.name || "", name))
  );
  if (removablePeptides.length === 0) return;

  // Do not silently turn a paid protocol into a one-peptide report. In that
  // case the candidate must fail and the model must regenerate a valid stack.
  if ((report.peptides || []).length - removablePeptides.length < 2) return;

  const removedNames = removablePeptides.map((peptide) => peptide.name || "");
  report.peptides = (report.peptides || []).filter(
    (peptide) => !removedNames.some((name) => mentionsPeptide(peptide.name || "", name))
  );
  report.weeklySchedule = removeOperationalLinesForPeptides(
    report.weeklySchedule || "",
    removedNames
  );
  report.shoppingList = removeOperationalLinesForPeptides(
    report.shoppingList || "",
    removedNames
  );
  removeSectionOperationalMentions(report, removedNames);

  if (report._peptauraLiveSync) {
    report._peptauraLiveSync.failures = failures.filter((failure) => {
      const failureName = peptideNameFromPeptauraFailure(failure);
      return !removedNames.some((name) => mentionsPeptide(failureName, name));
    });
    report._peptauraLiveSync.applied = (report._peptauraLiveSync.applied || []).filter(
      (name) => !removedNames.some((removed) => mentionsPeptide(String(name || ""), removed))
    );
    report._peptauraLiveSync.listingSnapshots = (
      report._peptauraLiveSync.listingSnapshots || []
    ).filter(
      (snapshot) =>
        !removedNames.some((name) =>
          mentionsPeptide(String(snapshot.peptide || ""), name)
        )
    );
  }
}

function isTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = sanitizeClientFacingText(value).toLowerCase().trim();
    return ["oui", "yes", "true", "1"].includes(normalized);
  }
  return false;
}

function hasAnyPattern(value: unknown, pattern: RegExp): boolean {
  if (!value) return false;
  if (typeof value === "string") return pattern.test(sanitizeClientFacingText(value));
  if (Array.isArray(value)) return value.some((item) => hasAnyPattern(item, pattern));
  return pattern.test(JSON.stringify(value));
}

export function hasPeptidesHardRedFlag(responses: Record<string, unknown>): boolean {
  const hardRedFlag = /(cancer|tumeur|oncolog|chemio|radioth|grossesse|enceinte|allait|pancreat|insuffisance\s+(?:renale|hepatique)|cirrhose|hepatite\s+active|insuffisance\s+cardiaque|arythmi|bipolaire|schizoph|psychose)/i;
  const importantFields = [
    responses.pep_conditions,
    responses.pep_conditions_other,
    responses.antecedentsMedicaux,
    responses.pathologiesChroniques,
    responses.medicaments,
    responses.pep_medications,
    responses.pep_allergies,
  ];

  if (importantFields.some((value) => hasAnyPattern(value, hardRedFlag))) {
    return true;
  }

  const booleanRedFlags = [
    responses.cancer,
    responses.antecedentsCancer,
    responses.grossesse,
    responses.allaitement,
  ];

  return booleanRedFlags.some(isTruthy);
}

function confidentPurpose(peptide: PeptideItem): { purpose: string; rationale: string } {
  const name = sanitizeClientFacingText(peptide.name || "").toLowerCase();
  const existingPurpose = sanitizeClientFacingText(peptide.purpose || "").trim();
  const existingRationale = sanitizeClientFacingText(peptide.whyThisPeptide || "").trim();
  const isConcretePersonalization =
    existingPurpose.length >= 45
    && existingRationale.length >= 120
    && /\b(?:tu|ton|ta|tes|chez toi|dans ton)\b/i.test(`${existingPurpose} ${existingRationale}`)
    && !/\b(?:garanti|sans risque|aucun risque|le plus puissant|automatique|miracle)\b/i.test(`${existingPurpose} ${existingRationale}`);

  // Keep a strong model-written explanation because it can reference the
  // client's exact questionnaire. Static fallbacks are only for incomplete or
  // unsafe legacy copy.
  if (isConcretePersonalization) {
    return { purpose: existingPurpose, rationale: existingRationale };
  }

  if (/retatrutide/.test(name)) {
    return {
      purpose: "Priorite fat loss quand l'appetit, les fringales et la regulation des portions sont le vrai point de blocage.",
      rationale: "Je le retiens quand l'objectif principal est de perdre du gras vite sans te faire tourner en rond sur la faim. L'interet ici est la maitrise de l'appetit et la progression par titration propre, pas la promesse magique.",
    };
  }
  if (/cjc/.test(name)) {
    return {
      purpose: "Base GH propre pour recuperation, sommeil et maintien de la masse maigre si le contexte s'y prete.",
      rationale: "Je le garde quand je veux un axe GH plus structuré sans partir sur une logique gadget. L'interet est la recuperation et la qualite du terrain, surtout si le sommeil, le training et la recomp comptent dans ton dossier.",
    };
  }
  if (/ipamorelin/.test(name)) {
    return {
      purpose: "Levier GH selectif pour renforcer la recuperation et completer un stack orienté recomp ou sommeil.",
      rationale: "Je le retiens quand je veux un secretagogue plus propre et plus lisible que d'autres options GH. Il a du sens surtout en duo avec un GHRH bien choisi et quand la recuperation est une vraie limite chez toi.",
    };
  }
  if (/dsip/.test(name)) {
    return {
      purpose: "Aide sommeil quand le vrai probleme est l'endormissement, la profondeur de nuit ou la recup nerveuse.",
      rationale: "Je le prends en compte si ton sommeil te freine deja sur l'energie, la faim ou la progression. Le but est de calmer le terrain et d'ameliorer la qualite des nuits, pas de maquiller une hygiene de vie bancale.",
    };
  }
  if (/epitalon/.test(name)) {
    return {
      purpose: "Option longévité / rythme circadien quand le dossier justifie un travail propre sur recup et vieillissement.",
      rationale: "Je le garde comme option plus secondaire, utile si le focus est la recuperation long terme et le rythme biologique. Ce n'est pas la base d'un stack physique, c'est un ajout plus fin quand le terrain s'y prete.",
    };
  }

  return {
    purpose: sanitizeClientFacingText(peptide.purpose || "Choix retenu en fonction de ton objectif principal, de ton niveau et du meilleur ratio utilite / complexite."),
    rationale: sanitizeClientFacingText(peptide.whyThisPeptide || "Je le retiens parce qu'il colle a ton profil et qu'il apporte un levier clair dans le stack, sans faire doublon avec le reste."),
  };
}

type RationaleProfileFact = {
  text: string;
  pattern: RegExp;
};

const RATIONALE_GOAL_LABELS: Record<string, { text: string; pattern: RegExp }> = {
  recovery: { text: "ton objectif principal est la recuperation", pattern: /\b(?:recuperation|guerison|tendon|articulation|blessure)\b/i },
  "gh-antiaging": { text: "ton objectif principal porte sur l'axe GH et l'anti-age", pattern: /\b(?:gh|hormone de croissance|anti[ -]?age|longevite)\b/i },
  fatloss: { text: "ton objectif principal est la perte de graisse", pattern: /\b(?:perte de (?:gras|graisse|masse grasse|poids)|perdre (?:du poids|du gras|de la graisse)|maigrir|amaigrissement|fat loss|seche|recomposition|appetit|sati[ée]t[ée]|fringales?)\b/i },
  sleep: { text: "ton objectif principal est le sommeil", pattern: /\b(?:sommeil|endormissement|reveils? nocturnes?|nuit)\b/i },
  cognitive: { text: "ton objectif principal est la performance cognitive", pattern: /\b(?:cognitif|focus|memoire|concentration|brain fog)\b/i },
  libido: { text: "ton objectif principal concerne la libido", pattern: /\b(?:libido|sexuel|erection)\b/i },
  "testo-boost": { text: "ton objectif principal concerne la testosterone", pattern: /\b(?:testosterone|axe hpg|lh|fsh|hypogonad)\b/i },
  "skin-hair": { text: "ton objectif principal concerne la peau et les cheveux", pattern: /\b(?:peau|cheveux|capillaire|anti[ -]?age)\b/i },
  endurance: { text: "ton objectif principal est l'endurance", pattern: /\b(?:endurance|cardio|capacite aerobie)\b/i },
};

function escapeRationalePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rationaleNumericPattern(value: string): RegExp | null {
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const parts = numbers.map((entry) =>
    entry.split(/[.,]/).map(escapeRationalePattern).join("[.,]")
  );
  return new RegExp(parts.join("[\\s\\S]{0,24}"), "i");
}

function buildRationaleProfileFacts(
  responses: Record<string, unknown>
): RationaleProfileFact[] {
  const facts: RationaleProfileFact[] = [];
  const weightKg = Number(responses.pep_weight || responses.poids || 0);
  if (Number.isFinite(weightKg) && weightKg >= 40 && weightKg <= 250) {
    facts.push({
      text: `tu fais ${weightKg} kg`,
      pattern: new RegExp(`\\b${escapeRationalePattern(String(weightKg))}(?:[.,]0+)?\\s*kg\\b`, "i"),
    });
  }

  const primaryGoal = String(
    responses.pep_primary_goal || responses.objectifPrincipal || ""
  ).trim().toLowerCase();
  if (primaryGoal) {
    const knownGoal = RATIONALE_GOAL_LABELS[primaryGoal];
    facts.push(knownGoal || {
      text: `ton objectif principal est ${primaryGoal}`,
      pattern: new RegExp(escapeRationalePattern(primaryGoal), "i"),
    });
  }

  const budget = String(responses.pep_budget || responses.budget || "").trim();
  const budgetPattern = rationaleNumericPattern(budget);
  if (budget && budgetPattern) {
    const budgetText = budget === "under50"
      ? "ton budget reste sous 50 EUR par mois"
      : budget === "over300"
        ? "ton budget depasse 300 EUR par mois"
        : `ton budget est de ${budget.replace(/-/g, " a ")} EUR par mois`;
    facts.push({ text: budgetText, pattern: budgetPattern });
  }

  const timeline = String(responses.pep_timeline || responses.timeline || "").trim().toLowerCase();
  const timelineFacts: Record<string, RationaleProfileFact> = {
    fast: { text: "tu vises une premiere fenetre de 4 a 6 semaines", pattern: /\b(?:4\s*(?:a|-|à)\s*6 semaines|rapide)\b/i },
    solid: { text: "tu vises une trajectoire solide sur 8 a 12 semaines", pattern: /\b(?:8\s*(?:a|-|à)\s*12 semaines|solide)\b/i },
    longterm: { text: "tu privilegies une optimisation long terme sur 12 semaines ou plus", pattern: /\b(?:12\+? semaines|long terme)\b/i },
  };
  if (timelineFacts[timeline]) facts.push(timelineFacts[timeline]);

  const experience = String(responses.pep_experience || responses.experience || "").trim().toLowerCase();
  const experienceFacts: Record<string, RationaleProfileFact> = {
    none: { text: "tu n'as encore aucune experience avec les peptides", pattern: /\b(?:debutant|premiere utilisation|jamais utilise|aucune experience)\b/i },
    read: { text: "ton experience reste theorique apres avoir lu et regarde du contenu", pattern: /\b(?:lu|regarde|theorique|contenu)\b/i },
    tried: { text: "tu as deja utilise 1 a 2 peptides", pattern: /\b(?:deja utilise|1\s*(?:a|-|à)\s*2 peptides)\b/i },
    regular: { text: "tu utilises regulierement des peptides", pattern: /\b(?:regulier|3\+? peptides)\b/i },
    advanced: { text: "tu as deja une experience avancee des stacks complexes", pattern: /\b(?:avance|stacks? complexes?)\b/i },
  };
  if (experienceFacts[experience]) facts.push(experienceFacts[experience]);

  const injectionComfort = String(responses.pep_injection_comfort || "").trim().toLowerCase();
  const injectionFacts: Record<string, RationaleProfileFact> = {
    fine: { text: "tu es a l'aise avec les injections", pattern: /\b(?:a l'aise|aucun probleme|confortable)\b/i },
    anxious: { text: "tu gardes une apprehension legere face aux injections", pattern: /\b(?:anxieux|apprehension|injection)\b/i },
    "very-anxious": { text: "tu as une forte apprehension face aux injections", pattern: /\b(?:tres anxieux|alternative|apprehension forte)\b/i },
    refuse: { text: "tu refuses les options injectables", pattern: /\b(?:refuse|sans injection|non injectable)\b/i },
  };
  if (injectionFacts[injectionComfort]) facts.push(injectionFacts[injectionComfort]);

  return facts;
}

function anchorExpertPeptideRationales(
  report: RepairableReport,
  responses: Record<string, unknown>
): void {
  const facts = buildRationaleProfileFacts(responses);
  if (facts.length < 2) return;

  const templates = [
    (name: string, first: string, second: string) =>
      `Dans ton cas, ${name} reste lie a deux reperes tres concrets: ${first}, et ${second}.`,
    (name: string, first: string, second: string) =>
      `Pour ${name}, je garde le lien avec ton dossier bien visible: ${first}, et ${second}.`,
    (name: string, first: string, second: string) =>
      `Le choix de ${name} part directement de ton profil: ${first}, avec ${second}.`,
    (name: string, first: string, second: string) =>
      `${name} n'est pas ajoute au hasard dans ton stack: ${first} et ${second} structurent ce choix.`,
  ];

  for (const [index, peptide] of (report.peptides || []).entries()) {
    const rationale = sanitizeClientFacingText(peptide.whyThisPeptide || "").trim();
    const matchedFacts = facts.filter((fact) => fact.pattern.test(rationale));
    if (matchedFacts.length >= 2) continue;

    const missingFacts = facts.filter((fact) => !fact.pattern.test(rationale));
    const selectedFacts = [...matchedFacts, ...missingFacts].slice(0, 2);
    if (selectedFacts.length < 2) continue;

    const name = sanitizeClientFacingText(peptide.name || `ce peptide ${index + 1}`);
    const anchor = templates[index % templates.length](
      name,
      selectedFacts[0].text,
      selectedFacts[1].text
    );
    peptide.whyThisPeptide = sanitizeClientFacingText(`${rationale} ${anchor}`);
  }
}

function upsertFinalDisclaimer(report: RepairableReport, firstName: string): void {
  const shortDisclaimer = sanitizeClientFacingText(
    `${firstName}, point important pour finir: ce protocole personnalise reste un contenu educatif et ne remplace pas un diagnostic ni une ordonnance. Plusieurs molecules ont un statut experimental ou non approuve pour cet usage. Respecte les contre-indications et les criteres d'arret propres a chaque molecule.`
  );
  const shortDisclaimerPattern = new RegExp(
    `${firstName}, point important pour finir: ce protocole personnalise reste un contenu educatif et ne remplace pas un diagnostic ni une ordonnance\\. Plusieurs molecules ont un statut experimental ou non approuve pour cet usage\\. Respecte les contre-indications et les criteres d'arret propres a chaque molecule\\.`,
    "gi"
  );

  const disclaimerSection = (report.sections || []).find((section) =>
    /disclaimer|support|important|securite/i.test(`${section.id} ${section.title}`)
  ) || (report.sections || [])[report.sections.length - 1];

  if (!disclaimerSection) return;

  disclaimerSection.content = sanitizeClientFacingText(
    `${String(disclaimerSection.content || "")
      .replace(/ce protocole est fourni a titre educatif[^.]*\./gi, "")
      .replace(/consulte un professionnel de sante[^.]*\./gi, "")
      .replace(shortDisclaimerPattern, "")
      .trim()}\n\n${shortDisclaimer}`
  );
}

function cleanStandardSections(report: RepairableReport): void {
  for (const section of report.sections || []) {
    section.content = sanitizeClientFacingText(
      String(section.content || "")
        .replace(
          /(?:https?:\/\/)?(?:www\.)?apexlabs\.(?:fr|com)(?:\/[^\s)]*)?/gi,
          "https://apexlabs.achzodcoaching.com/blood-dashboard"
        )
        .replace(
          /compte g[ée]n[ée]ralement\s+\d+\s*(?:[àa]|-)\s*\d+\s+jours ouvr[ée]s[^.]*\./gi,
          "Le delai affiche par le fournisseur au moment de payer est le seul repere a utiliser."
        )
        .replace(/ce rapport est un document de pr[ée]paration [àa] une discussion m[ée]dicale\./gi, "")
        .replace(/sans validation explicite, tu ne commences pas\./gi, "")
        .replace(/ce protocole est fourni [àa] titre [ée]ducatif\.\s*/gi, "")
        .replace(/ce protocole est fourni [àa] titre [ée]ducatif et informatif\.[^.]*\./gi, "")
        .replace(/il ne constitue pas un avis m[ée]dical ni une ordonnance\./gi, "")
        .replace(/consulte un professionnel de sant[ée] avant toute suppl[ée]mentation[^.]*\./gi, "")
        .replace(/consulte un professionnel de sant[ée] si tu as le moindre doute\./gi, "")
        .replace(/consulte un m[ée]decin si tu as le moindre doute[^.]*\./gi, "")
        .replace(/consulte un m[ée]decin avant toute suppl[ée]mentation\./gi, "")
        .replace(/(?:avant tout achat ou toute utilisation|avant de commencer)[^.]{0,220}(?:m[ée]decin|pharmacien|professionnel de sant[ée])[^.]*\./gi, "")
        .replace(/(?:demande|fais)[^.]{0,180}(?:validation|accord|confirmation)[^.]{0,100}(?:m[ée]decin|pharmacien|professionnel de sant[ée])[^.]*\./gi, "")
        .replace(/(?:m[ée]decin|pharmacien|professionnel de sant[ée])[^.]{0,160}(?:valider|valide|confirmer|confirme|autoriser|autorise)[^.]*\./gi, "")
        .replace(/[^.\n]*(?:fabricant du lot|professionnel qualifi[ée])[^.\n]*\./gi, "")
        .replace(/[^.\n]*ne commence pas tant que le volume[^.\n]*\./gi, "")
        .replace(/des milliers de personnes le font chaque jour et c'est beaucoup plus simple que tu ne l'imagines\./gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  const medicalMentions = () => collectClientFacingStrings(report)
    .join("\n")
    .match(/\b(?:m[ée]decin|pharmacien|professionnel de sant[ée])\b/gi)?.length || 0;
  if (medicalMentions() > 8) {
    for (const section of report.sections || []) {
      if (/disclaimer|support|securite/i.test(`${section.id} ${section.title}`)) continue;
      section.content = sanitizeClientFacingText(
        String(section.content || "")
          .replace(/[^.\n]*(?:m[ée]decin|pharmacien|professionnel de sant[ée])[^.\n]*\./gi, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      );
    }
  }
}

function normalizeUnsupportedStandardClaims(report: RepairableReport): void {
  for (const section of report.sections || []) {
    section.content = sanitizeClientFacingText(
      String(section.content || "")
        .replace(
          /c['’]est la mol[ée]cule la plus puissante disponible aujourd['’]hui[^.]*\./gi,
          "Dans ce stack, c'est le levier principal retenu pour travailler la satiete et la perte de masse grasse, sans promettre un resultat automatique."
        )
        .replace(
          /il va naturellement r[ée]duire ton app[ée]tit[^.]*sans toucher [àa] ta masse maigre[^.]*\./gi,
          "L'objectif est de reduire l'appetit tout en protegeant au mieux la masse maigre avec un entrainement regulier et un apport proteique suffisant."
        )
        .replace(
          /l['’]ipamorelin est un s[ée]cr[ée]tagogue GH s[ée]lectif, il amplifie ce signal sans augmenter le cortisol ni la prolactine[^.]*\./gi,
          "L'Ipamorelin complete le signal GH avec un profil recherche plus cible que les anciens secretagogues, sans garantir une reponse hormonale identique chez tout le monde."
        )
        .replace(
          /le DSIP \(Delta Sleep-Inducing Peptide\) est un neuropeptide qui am[ée]liore l['’]architecture du sommeil profond[^.]*\./gi,
          "Le DSIP est retenu ici comme levier experimental autour du sommeil profond, avec des donnees humaines encore limitees."
        )
        .replace(
          /le DSIP ne te massue pas, il am[ée]liore la qualit[ée] du sommeil sans cr[ée]er de d[ée]pendance\./gi,
          "Le DSIP n'est pas presente comme un somnifere ni comme un resultat garanti."
        )
        .replace(
          /tu peux les garder [àa] temp[ée]rature ambiante ou au r[ée]frig[ée]rateur, [àa] l['’]abri de la lumi[èe]re directe\. Dans cet [ée]tat, ils se conservent plusieurs mois\./gi,
          "Garde chaque vial a l'abri de la lumiere et respecte la temperature ainsi que la date indiquees par le fournisseur du produit exact."
        )
        .replace(
          /une fois ouverte, conserve la BAC water au r[ée]frig[ée]rateur\. Elle se conserve plusieurs mois\./gi,
          "Note la date d'ouverture de la BAC water et respecte la duree indiquee sur le flacon."
        )
    );
  }
}

function removeUnsupportedDescent(
  cycleDuration: string | undefined,
  dosage: string | undefined
): string {
  const original = stripProjectPrefix(cycleDuration);
  const dosageHasDescent = /descente|diminu|r[ée]duction|baisse/i.test(
    dosage || ""
  );
  const cycleHasDescent =
    /descente|diminution progressive|r[ée]duction progressive|baisse progressive/i.test(
      original
    );

  if (dosageHasDescent || !cycleHasDescent) {
    return sanitizeClientFacingText(original);
  }

  const cleaned = original
    .replace(
      /\([^)]*(?:descente|diminution|r[ée]duction|baisse)(?:\s+progressive)?[^)]*\)/gi,
      ""
    )
    .replace(
      /\s*[,;(]?\s*(?:(?:avec|puis|et|dont|incluant|comprenant)\s+)?(?:une\s+)?(?:phase\s+de\s+)?(?:\d+\s*semaines?\s+(?:de|en)\s+)?(?:descente|diminution|r[ée]duction|baisse)(?:\s+progressive)?[^,.;)]*\)?/gi,
      ""
    )
    .replace(/\s*,\s*,/g, ",")
    .replace(/\(\s*\)/g, "")
    .replace(/\b(?:puis|et)\s+arr[êe]t\s+sans\b\.?/gi, "puis arrêt")
    .replace(/\barr[êe]t\s+sans\b\.?/gi, "arrêt")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;]+$/g, "")
    .trim();

  if (
    cleaned &&
    !/descente|diminution progressive|r[ée]duction progressive|baisse progressive/i.test(
      cleaned
    )
  ) {
    return sanitizeClientFacingText(cleaned);
  }

  const durationMatch = original.match(
    /\b\d+\s*(?:jours?|semaines?|mois)\b/i
  );
  return sanitizeClientFacingText(
    durationMatch ? `${durationMatch[0]} au total` : "Duree a confirmer"
  );
}

function cleanExpertPeptideFields(report: RepairableReport): void {
  for (const peptide of report.peptides || []) {
    const confident = confidentPurpose(peptide);
    peptide.purpose = confident.purpose;
    peptide.whyThisPeptide = confident.rationale;
    peptide.dosage = sanitizeClientFacingText(stripProjectPrefix(peptide.dosage));
    peptide.timing = sanitizeClientFacingText(
      stripProjectPrefix(peptide.timing)
        .replace(/peut [eê]tre m[ée]lang[ée][^.]*m[êe]me seringue[^.]*\.?/gi, "Garde ce produit separe dans sa propre seringue.")
    );
    peptide.route = sanitizeClientFacingText(stripProjectPrefix(peptide.route));
    peptide.cycleDuration = removeUnsupportedDescent(
      peptide.cycleDuration,
      peptide.dosage
    ).replace(/\b(?:puis|et)\s+arr[êe]t\s+sans\b\.?/gi, "puis arrêt")
      .replace(/\barr[êe]t\s+sans\b\.?/gi, "arrêt")
      .replace(/([A-Za-zÀ-ÿ)]),(\d)/g, "$1, $2")
      .replace(/(\d),\s+(\d)/g, "$1,$2");

    const vialMatch = String(peptide.reconstitution || "").replace(/(\d),(\d)/g, "$1.$2").match(/vial(?: de)?\s*(\d+(?:\.\d+)?)\s*mg\s*\+\s*(\d+(?:\.\d+)?)\s*ml/i);
    const doseMatch = Array.from(String(peptide.dosage || "").replace(/(\d),(\d)/g, "$1.$2").matchAll(/(\d+(?:\.\d+)?)\s*mg/gi))
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);

    if (/retatrutide/i.test(peptide.name || "") && vialMatch && doseMatch.length > 0) {
      const vialMg = Number(vialMatch[1]);
      const solventMl = Number(vialMatch[2]);
      const targetDoseMg = Math.max(...doseMatch);
      const concentration = vialMg / solventMl;
      const totalMl = targetDoseMg / concentration;
      const splitLine = totalMl > 1
        ? ` Comme ca depasse 1 ml, tu fractionnes en 2 injections distinctes de ${(totalMl / 2).toFixed(2)} ml le meme jour, sur 2 sites differents.`
        : "";
      peptide.reconstitution = sanitizeClientFacingText(
        `Vial ${vialMg}mg + ${solventMl}ml BAC water = ${concentration.toFixed(2)} mg/ml. Pour ${targetDoseMg}mg, tu tires ${totalMl.toFixed(2)} ml au total.${splitLine}`
      );
    } else {
      peptide.reconstitution = sanitizeClientFacingText(
        String(peptide.reconstitution || "")
          .replace(/controle de coherence uniquement:\s*/i, "")
          .replace(/la reconstitution ne doit pas etre improvisee[^.]*\./gi, "")
          .replace(/fais verifier[^.]*\./gi, "")
          .replace(/ne melange pas ce produit avec un autre[^.]*\./gi, "Garde ce produit separe du reste.")
          .replace(/(?:fabricant du lot|professionnel qualifi[ée])[^.]*\./gi, "")
          .replace(/ne commence pas tant que le volume[^.]*\./gi, "")
          .trim()
      );
    }
  }
}

function normalizeTierCreditClaims(
  report: RepairableReport,
  tier: string
): void {
  if (tier !== "solo") return;

  for (const section of report.sections || []) {
    if (
      /bilan-sanguin/i.test(section.id || "") &&
      /(?:2 cr[ée]dits?|premier cr[ée]dit|deuxi[èe]me cr[ée]dit)/i.test(
        `${section.title || ""} ${section.content || ""}`
      )
    ) {
      section.title = "Blood Analysis et bilan de depart";
      section.content = sanitizeClientFacingText(
        [
          "Ton offre Solo n'ajoute aucun credit Blood Analysis. Si tu veux une interpretation APEXLABS, tu commandes cette analyse separement. Le prelevement du laboratoire reste lui aussi une depense distincte.",
          "Le bilan de depart sert a fixer une base avant toute modification. Les marqueurs doivent etre choisis selon ton objectif, ton historique, tes traitements, tes allergies et les molecules evoquees. Pour un axe GH, l'IGF-1 fait partie des reperes utiles. Pour l'axe metabolique, la glycemie, l'HbA1c, l'insuline et les lipides donnent une base de comparaison.",
          "Si tu veux comparer l'evolution, tu peux commander une seconde analyse plus tard, idealement dans des conditions proches: meme laboratoire, horaire similaire, meme contexte de jeune et derniere seance notee. Aucun credit n'est presente ici comme offert ou deja ajoute a ton compte.",
          "Quand ton PDF est pret, utilise https://apexlabs.achzodcoaching.com/blood-dashboard avec l'adresse de ta commande. Le PDF doit etre lisible et complet.",
        ].join("\n\n")
      );
      continue;
    }
    let content = String(section.content || "");
    content = content
      .replace(
        /Apexlabs\s*\(\s*(?:https?:\/\/)?(?:www\.)?apexlabs\.fr\s*\)/gi,
        "APEXLABS"
      )
      .replace(
        /\b(?:https?:\/\/)?(?:www\.)?apexlabs\.fr\b/gi,
        "https://apexlabs.achzodcoaching.com/blood-dashboard"
      );
    section.title = sanitizeClientFacingText(
      String(section.title || "")
        .replace(/\btes? 2 cr[ée]dits? Blood Analysis\b/gi, "Blood Analysis")
        .replace(/\b2 cr[ée]dits? Blood Analysis\b/gi, "Blood Analysis")
    );
    content = content
      .replace(
        /CE QUI EST PR[ÉE]PAY[ÉE][\s\S]*?(?=CE QUI N['’]EST PAS PR[ÉE]PAY[ÉE])/i,
        "CE QUI EST INCLUS DANS TON OFFRE SOLO\nTon offre Solo n'ajoute aucun credit Blood Analysis. L'analyse APEXLABS et le prelevement au laboratoire restent deux achats separes si tu choisis de les faire.\n\n"
      )
      .replace(
        /COMMENT UTILISER TON CREDIT BLOOD ANALYSIS[\s\S]*?(?=IMPORTANT\s*:)/i,
        "COMMENT COMMANDER UNE BLOOD ANALYSIS SEPAREMENT\nSi tu veux faire analyser ton bilan par APEXLABS, commande l'analyse separement puis connecte-toi sur https://apexlabs.achzodcoaching.com/blood-dashboard avec ton email pour envoyer le PDF.\n\n"
      )
      .replace(
        /\butilise ton premier cr[ée]dit Blood Analysis(?: APEXLABS)?\b/gi,
        "commande une premiere Blood Analysis separement"
      )
      .replace(
        /\butilise ton deuxi[èe]me cr[ée]dit Blood Analysis\b/gi,
        "commande une seconde Blood Analysis separement"
      )
      .replace(
        /\bton premier cr[ée]dit Blood Analysis\b/gi,
        "une premiere Blood Analysis commandee separement"
      )
      .replace(
        /\bton deuxi[èe]me cr[ée]dit Blood Analysis\b/gi,
        "une seconde Blood Analysis commandee separement"
      )
      .replace(
        /\btes? 2 cr[ée]dits? Blood Analysis\b/gi,
        "l'option Blood Analysis"
      )
      .replace(
        /\btu as (?:1|2|un|deux) cr[ée]dits? Blood Analysis(?: APEXLABS)?(?: d[ée]j[àa] sur ton compte)?\b/gi,
        "ton offre Solo n'ajoute aucun credit Blood Analysis"
      )
      .replace(
        /\b(?:le|ton) premier cr[ée]dit\b/gi,
        "une premiere Blood Analysis commandee separement"
      )
      .replace(
        /\b(?:le|ton) deuxi[èe]me cr[ée]dit\b/gi,
        "une seconde Blood Analysis commandee separement"
      );
    section.content = sanitizeClientFacingText(content);
  }

  const bloodSection = (report.sections || []).find((section) =>
    /bilan-sanguin|bilan sanguin/i.test(`${section.id} ${section.title}`)
  );
  if (bloodSection) {
    const canonicalSoloOffer = [
      "OFFRE SOLO ET BLOOD ANALYSIS",
      "Cette commande Solo n'ajoute aucun credit Blood Analysis. Si tu veux une interpretation APEXLABS, tu commandes l'analyse separement puis tu envoies ton PDF sur https://apexlabs.achzodcoaching.com/blood-dashboard.",
      "Le prelevement du laboratoire est facture separement par le laboratoire. Son prix depend du pays, du laboratoire et des marqueurs retenus. Demande un devis avant le prelevement au lieu de te fier a un tarif fixe dans ce rapport.",
    ].join("\n");
    const content = String(bloodSection.content || "")
      .replace(
        /L['’]offre Solo[\s\S]*?(?=\n{2,}MARQUEURS|\n{2,}CALENDRIER|\n{2,}CONDITIONS)/i,
        `${canonicalSoloOffer}\n\n`
      )
      .replace(
        /\b(?:https?:\/\/)?(?:www\.)?apexlabs\.fr\b/gi,
        "https://apexlabs.achzodcoaching.com/blood-dashboard"
      );
    bloodSection.content = sanitizeClientFacingText(
      /OFFRE SOLO ET BLOOD ANALYSIS/i.test(content)
        ? content
        : `${canonicalSoloOffer}\n\n${content}`
    );
  }
}

function removeUnsupportedDescentNarrative(report: RepairableReport): void {
  const peptidesWithoutDescent = (report.peptides || []).filter(
    (peptide) =>
      !/descente|diminu|r[ée]duction|baisse/i.test(peptide.dosage || "")
  );
  if (peptidesWithoutDescent.length === 0) return;

  for (const section of report.sections || []) {
    const paragraphs = String(section.content || "").split(/\n{2,}/);
    section.content = sanitizeClientFacingText(
      paragraphs
        .map((paragraph) => {
          const peptide = peptidesWithoutDescent.find(
            (candidate) =>
              mentionsPeptide(paragraph, candidate.name || "") &&
              /descente|diminution progressive|r[ée]duction progressive|r[ée]duit progressivement|arr[êe]t brutal/i.test(
                paragraph
              )
          );
          if (!peptide) return paragraph;
          return (
            `FIN DE CYCLE ${String(peptide.name || "").toUpperCase()}\n` +
            `La fin du cycle suit exactement le dosage et la duree indiques dans la fiche ${peptide.name}. ` +
            "N'ajoute aucune dose ni phase de descente qui n'y figure pas."
          );
        })
        .join("\n\n")
    );
  }
}

function extractLiveReportTotalUsd(report: RepairableReport): number {
  return String(report.shoppingList || "")
    .split(/\n+/)
    .reduce((sum, line) => {
      const usdMatch = line.match(/\btotal\s*\$(\d+(?:[.,]\d+)?)/i);
      const gbpMatch = line.match(/\btotal\s*£(\d+(?:[.,]\d+)?)/i);
      const usd = usdMatch ? Number(usdMatch[1].replace(",", ".")) : 0;
      const gbpAsUsd = gbpMatch ? Number(gbpMatch[1].replace(",", ".")) * 1.28 : 0;
      return sum + usd + gbpAsUsd;
  }, 0);
}

function normalizeOperationalPlaceholders(report: RepairableReport): void {
  let schedule = String(report.weeklySchedule || "");
  for (const peptide of report.peptides || []) {
    const escapedName = String(peptide.name || "").replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    if (!escapedName) continue;
    schedule = schedule.replace(
      new RegExp(
        `(${escapedName}\\s*)\\[(?:dose|dosage)[^\\]]*\\]`,
        "gi"
      ),
      (_match, prefix: string) => `${prefix}(${peptide.dosage})`
    );
    schedule = schedule.replace(
      new RegExp(
        `(${escapedName}\\s*)(?:valeur|dose exacte)\\s+indiqu[ée]e\\s+dans\\s+la\\s+fiche`,
        "gi"
      ),
      (_match, prefix: string) => `${prefix}(${peptide.dosage})`
    );
  }
  report.weeklySchedule = sanitizeClientFacingText(
    schedule
      .replace(
        /\[(?:dose|dosage)\s+selon\s+(?:la\s+)?semaine\]/gi,
        "dose exacte indiquee dans la fiche du peptide"
      )
      .replace(/\[(?:dose|dosage|peptide|timing)[^\]]*\]/gi, "valeur indiquee dans la fiche")
  );
}

function dedupeScheduleLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = normalizePeptideMention(line);
    const repeatedRestDay =
      /aucuneinjectionjourdereposhorsprotocoleinjectable/i.test(normalized)
      || /aucuneinjectionjourdereposhorsprotocole/i.test(normalized);
    const key = repeatedRestDay
      ? normalized.replace(/^(?:du)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)+/i, "")
      : normalized;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function synchronizeReconstitutionNarrative(
  report: RepairableReport,
  firstName: string
): void {
  const section = (report.sections || []).find((entry) =>
    /reconstitution/i.test(`${entry.id} ${entry.title}`)
  );
  if (!section) return;

  const injectablePeptides = (report.peptides || []).filter((peptide) =>
    !/orale?|buccale?/i.test(peptide.route || "")
    && !/aucune reconstitution|sans reconstitution|solution liquide/i.test(peptide.reconstitution || "")
  );
  section.content = sanitizeClientFacingText(
    [
      `${firstName}, utilise uniquement les formats et les calculs ci-dessous. Ils sont reconstruits depuis les fiches retenues apres le controle du catalogue et des quantites.`,
      ...(injectablePeptides.length > 0
        ? ["METHODE COMMUNE POUR LES VIALS\nLave-toi les mains, nettoie les bouchons, injecte la BAC water doucement le long de la paroi du vial et ne vise pas directement la poudre. Ne secoue pas le vial. Fais-le rouler doucement entre tes paumes jusqu'a dissolution complete. La solution doit rester claire."]
        : []),
      ...(report.peptides || []).map(
        (peptide) =>
          `${String(peptide.name || "").toUpperCase()}\n` +
          `Dose et frequence: ${asSentence(peptide.dosage)}\n` +
          "Format commande: voir la liste de commande verifiee pour le detail exact des vials et des limites de commande.\n" +
          `Reconstitution exacte: ${asSentence(peptide.reconstitution)}`
      ),
      ...(injectablePeptides.length > 0
        ? ["BAC WATER TOTALE\nLa quantite totale a commander figure dans la liste de courses live. Elle additionne le solvant necessaire pour chaque vial du cycle, pas uniquement le premier vial ouvert."]
        : []),
    ].join("\n\n")
  );
}

function synchronizeProtocolNarrative(
  report: RepairableReport,
  firstName: string
): void {
  const section = (report.sections || []).find((entry) =>
    /protocole|semaine type|calendrier/i.test(`${entry.id} ${entry.title}`)
  );
  if (!section) return;

  const scheduleLines = String(report.weeklySchedule || "")
    .split(/\s*\|\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  const dedupedScheduleLines = dedupeScheduleLines(scheduleLines);
  let content = sanitizeClientFacingText(
    [
      `${firstName}, cette section est la source de verite pour les doses, les durees et le calendrier. Elle reprend exactement les fiches validees, sans ajouter une phase differente ailleurs dans le rapport.`,
      ...(report.peptides || []).map(
        (peptide) =>
          `${String(peptide.name || "").toUpperCase()}\n` +
          `Dose: ${asSentence(peptide.dosage)}\n` +
          `Timing: ${asSentence(peptide.timing)}\n` +
          `Duree: ${asSentence(peptide.cycleDuration)}`
      ),
      "CALENDRIER HEBDOMADAIRE",
      ...dedupedScheduleLines,
    ].join("\n\n")
  );
  if (!/[.!?:)»\]]$/.test(content)) content = `${content}.`;
  section.content = content;
}

function removeConflictingDoseAdjustments(report: RepairableReport): void {
  for (const section of report.sections || []) {
    section.content = sanitizeClientFacingText(
      String(section.content || "")
        .replace(
          /commence [àa] \d+\s*% de la dose cible[^.]*pendant la premi[èe]re semaine\./gi,
          "Pour chaque peptide, suis exactement la dose de la fiche et le calendrier, sans ajouter un palier depuis cette checklist."
        )
        .replace(
          /si les naus[ée]es sont fortes, reste au palier pr[ée]c[ée]dent[^.]*avant de monter\./gi,
          "Si les nausees deviennent fortes, stoppe et fais le point avant toute reprise."
        )
        .replace(
          /(?:si tu sens que tu reprends du poids[^.]*,\s*)?un cycle court de \d+\s*[àa-]\s*\d+ semaines [àa] dose r[ée]duite est possible[^.]*\./gi,
          "Si le poids remonte apres l'arret, ne relance pas un cycle court pour compenser. Reprends d'abord tes mesures, ton alimentation et ton bilan."
        )
        .split(/\n{2,}/)
        .map((paragraph) =>
          /^AJUSTEMENTS? DE DOSE\b/i.test(paragraph.trim())
            ? "AJUSTEMENT DES DOSES\nLes seules progressions planifiees sont celles ecrites dans les fiches et dans le calendrier du protocole. N'ajoute pas un palier different a partir d'une autre section du rapport."
            : paragraph
        )
        .join("\n\n")
    );
  }
}

function synchronizeStandardShoppingNarrative(
  report: RepairableReport,
  firstName: string
): void {
  const shoppingSection = (report.sections || []).find((section) =>
    /shopping|liste de courses/i.test(`${section.id} ${section.title}`)
  );
  const shoppingLines = String(report.shoppingList || "")
    .split(/\n+/)
    .map((line) => sanitizeClientFacingText(line))
    .filter(Boolean);
  // This report-wide policy is already rendered by the standalone interactive
  // shopping list. Do not clone it into the synchronized narrative section.
  const narrativeShoppingLines = withoutOperationalVialPolicySummary(shoppingLines);
  const totalUsd = extractLiveReportTotalUsd(report);
  const totalEur = Math.round(totalUsd * 0.92);
  const maxWeeks = Math.max(
    1,
    ...(report.peptides || []).map((peptide) => {
      const match = String(peptide.cycleDuration || "").match(
        /(\d+)\s*semaines?\b/i
      );
      return match ? Number(match[1]) : 0;
    })
  );
  const monthlyEur = totalUsd > 0
    ? Math.round(totalEur / Math.max(1, maxWeeks / 4.345))
    : 0;

  if (shoppingSection) {
    shoppingSection.content = sanitizeClientFacingText(
      [
        `${firstName}, voici la liste de commande recalculee apres verification des pages Peptaura. Cette version remplace tous les chiffres generes avant le controle live.`,
        ...narrativeShoppingLines,
        totalUsd > 0
          ? `TOTAL LIVE DU CYCLE\nEnviron $${totalUsd.toFixed(2)}, soit environ ${totalEur} euros hors frais de port. Sur ${maxWeeks} semaines, cela represente environ ${monthlyEur} euros par mois.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  }

  const supportSection = (report.sections || []).find((section) =>
    /disclaimer|support/i.test(`${section.id} ${section.title}`)
  );
  if (supportSection && totalUsd > 0) {
    const canonicalCost =
      `COUT RECALCULE APRES CONTROLE LIVE\nLe total du cycle est d'environ $${totalUsd.toFixed(2)}, ` +
      `soit environ ${totalEur} euros hors frais de port. Sur ${maxWeeks} semaines, compte environ ${monthlyEur} euros par mois.`;
    const content = String(supportSection.content || "");
    supportSection.content = sanitizeClientFacingText(
      /CO[UÛ]T (?:MENSUEL|RECALCULE)[\s\S]*?(?=CE PROTOCOLE|$)/i.test(content)
        ? content.replace(
            /CO[UÛ]T (?:MENSUEL|RECALCULE)[\s\S]*?(?=CE PROTOCOLE|$)/i,
            `${canonicalCost}\n\n`
          )
        : `${content}\n\n${canonicalCost}`
    );
  }
}

function normalizeSingleVialGrammar(report: RepairableReport): void {
  const normalize = (value: string): string =>
    sanitizeClientFacingText(value.replace(/\b1\s+vials\b/gi, "1 vial"));
  for (const peptide of report.peptides || []) {
    peptide.vialsNeeded = normalize(peptide.vialsNeeded || "");
    peptide.priceEstimate = normalize(peptide.priceEstimate || "");
  }
  report.shoppingList = normalize(report.shoppingList || "");
  for (const section of report.sections || []) {
    section.content = normalize(section.content || "");
  }
}

function extractUnitPriceUsd(priceEstimate: string | undefined): number | null {
  const match = String(priceEstimate || "").match(
    /[~≈]?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:USD|\$|US)?\s*\/?\s*vial/i
  );
  return match ? Number(match[1].replace(",", ".")) : null;
}

function liveUnitPriceUsdForPeptide(
  report: RepairableReport,
  peptideName: string,
): number | null {
  const snapshot = (report._peptauraLiveSync?.listingSnapshots || []).find((entry) =>
    normalizePeptideMention(String(entry.peptide || "")) === normalizePeptideMention(peptideName)
  );
  if (!snapshot) return null;
  const totalUsd = Number(snapshot.totalPriceUsd);
  const requestedVials = Number(snapshot.requestedVials);
  if (!Number.isFinite(totalUsd) || !Number.isFinite(requestedVials) || requestedVials <= 0) {
    return null;
  }
  return Math.round((totalUsd / requestedVials) * 100) / 100;
}

function syncPeptidePriceEstimate(
  report: RepairableReport,
  peptide: PeptideItem,
  vialCount: number
): void {
  const unit = liveUnitPriceUsdForPeptide(report, peptide.name || "")
    ?? extractUnitPriceUsd(peptide.priceEstimate);
  if (!Number.isFinite(unit) || unit == null || unit <= 0) return;
  const total = Math.round(unit * vialCount * 100) / 100;
  const eur = Math.round(total * 0.92);
  peptide.priceEstimate =
    `~$${unit.toFixed(2)}/vial × ${vialCount} vial${vialCount > 1 ? "s" : ""} = ` +
    `$${total.toFixed(2)} total (~${eur}€)`;
}

function syncLiveSnapshotAfterClamp(
  report: RepairableReport,
  peptideName: string,
  vialCount: number,
): void {
  const snapshot = (report._peptauraLiveSync?.listingSnapshots || []).find((entry) =>
    normalizePeptideMention(String(entry.peptide || "")) === normalizePeptideMention(peptideName)
  );
  if (!snapshot) return;

  const boxSize = Math.max(1, Number(snapshot.boxSize) || 1);
  const packageCount = Math.max(1, Number(snapshot.packageCount) || 1);
  const nextPackageCount = Math.max(1, Math.ceil(vialCount / boxSize));
  const deliveredVials = nextPackageCount * boxSize;

  snapshot.requestedVials = vialCount;
  snapshot.packageCount = nextPackageCount;
  snapshot.deliveredVials = deliveredVials;

  const totalUsd = Number(snapshot.totalPriceUsd);
  if (Number.isFinite(totalUsd) && totalUsd > 0) {
    const unitPackagePrice = totalUsd / packageCount;
    snapshot.totalPriceUsd = Math.round(unitPackagePrice * nextPackageCount * 100) / 100;
  }
  const totalGbp = Number(snapshot.totalPriceGbp);
  if (Number.isFinite(totalGbp) && totalGbp > 0) {
    const unitPackagePrice = totalGbp / packageCount;
    snapshot.totalPriceGbp = Math.round(unitPackagePrice * nextPackageCount * 100) / 100;
  }
}

function clampManifestOverorders(report: RepairableReport): void {
  for (const peptide of report.peptides || []) {
    const orderedMg = extractTotalMgFromVials(peptide.vialsNeeded);
    const needMg = estimateNeedMg(peptide);
    const vialMg = extractVialMg(peptide.vialsNeeded) || extractVialMg(peptide.reconstitution);
    const orderedQty = extractVialQty(peptide.vialsNeeded);
    const documentedOperationalOrder =
      peptide._vialPlanning?.status === "documented" &&
      peptide._vialPlanning?.operationalVials === orderedQty &&
      Number(peptide._vialPlanning?.stabilityDays || 0) > 0 &&
      String(peptide._vialPlanning?.stabilitySource || "").length >= 8;

    if (
      documentedOperationalOrder ||
      orderedMg == null ||
      needMg == null ||
      vialMg == null ||
      orderedQty == null ||
      needMg <= 0 ||
      vialMg <= 0
    ) {
      continue;
    }

    const overshoot = orderedMg / needMg;
    if (overshoot <= 2.5) continue;

    const clampedCount = Math.max(1, Math.ceil((needMg * 1.2) / vialMg));
    if (clampedCount >= orderedQty) continue;

    const durationLabel = sanitizeClientFacingText(peptide.cycleDuration || "le cycle");
    peptide.vialsNeeded =
      `${clampedCount} vial${clampedCount > 1 ? "s" : ""} de ${vialMg}mg pour ${durationLabel} ` +
      `(besoin calcule ~${needMg.toFixed(1)}mg, ${clampedCount * vialMg}mg livres par le format minimum)`;
    syncPeptidePriceEstimate(report, peptide, clampedCount);
    syncLiveSnapshotAfterClamp(report, peptide.name || "", clampedCount);
  }
}

function upsertPersonalizedNutritionTarget(
  report: RepairableReport,
  responses: Record<string, unknown>
): void {
  const weightKg = Number(responses.pep_weight || responses.poids || 0);
  if (!Number.isFinite(weightKg) || weightKg < 40 || weightKg > 250) return;

  const nutritionSection = (report.sections || []).find((section) =>
    /nutrition/i.test(`${section.id} ${section.title}`)
  );
  if (!nutritionSection) return;

  const lowGrams = Math.round(weightKg * 1.8);
  const highGrams = Math.round(weightKg * 2.2);
  const withoutLegacyDailyTargets = String(nutritionSection.content || "")
    .replace(/\n*REPERE PROTEINES PERSONNALISE[\s\S]*?(?=\n\n[A-Z][A-Z ]{4,}\n|$)/gi, "")
    .replace(
      /[^.\n]*(?:(?:prot[ée]ines?)[^.\n]{0,100}\b\d{2,3}\s*g\b|\b\d{2,3}\s*g\b[^.\n]{0,100}(?:prot[ée]ines?))[^.\n]{0,80}(?:par\s+jour|\/\s*jour|quotidien(?:ne)?)[^.\n]*\.?/gi,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const canonicalTarget =
    `REPERE PROTEINES PERSONNALISE\nA ${weightKg} kg, vise ${lowGrams} a ${highGrams} g de proteines par jour. ` +
    `Le calcul vient de 1,8 a 2,2 g/kg/jour. Ce total est le repere du cycle, puis tu le repartis sur tes repas selon ton organisation.`;

  nutritionSection.content = sanitizeClientFacingText(
    `${withoutLegacyDailyTargets}\n\n${canonicalTarget}`
  );
}

function repairStandardReportContent(
  report: RepairableReport,
  firstName: string,
  tier: string,
  responses: Record<string, unknown>
): void {
  (report as any).qualityVersion = "expert-standard-v1";
  cleanExpertPeptideFields(report);
  anchorExpertPeptideRationales(report, responses);
  cleanStandardSections(report);
  normalizeUnsupportedStandardClaims(report);
  normalizeTierCreditClaims(report, tier);
  removeUnsupportedDescentNarrative(report);
  pruneUnavailableUnrequestedPeptides(report, responses);
  clampManifestOverorders(report);
  normalizeOperationalPlaceholders(report);
  synchronizeReconstitutionNarrative(report, firstName);
  synchronizeProtocolNarrative(report, firstName);
  removeConflictingDoseAdjustments(report);
  synchronizeStandardShoppingNarrative(report, firstName);
  normalizeSingleVialGrammar(report);
  upsertPersonalizedNutritionTarget(report, responses);
  upsertFinalDisclaimer(report, firstName);
}

function cautiousPurpose(peptide: PeptideItem): { purpose: string; rationale: string } {
  const name = peptide.name.toLowerCase();
  if (/retatrutide/.test(name)) {
    return {
      purpose: "Hypothese experimentale liee a la regulation de l'appetit et du metabolisme, a discuter avec un medecin",
      rationale: "Dans ton cas, cette molecule a ete evoquee a cause de ton objectif de perte de masse grasse et de ton besoin de cadre metabolique. Elle reste experimentale et non approuvee hors essai clinique. Son mecanisme ne prouve ni un benefice personnel, ni une preservation automatique du muscle, ni un rapport benefice-risque favorable pour toi.",
    };
  }
  if (/cjc/.test(name)) {
    return {
      purpose: "Hypothese experimentale autour de l'axe GH et de la recuperation, sans efficacite personnelle garantie",
      rationale: "Dans ton cas, cette molecule a ete evoquee en lien avec tes objectifs de recuperation et de sommeil. Les promesses de hausse utile de GH, de lipolyse ou d'effet anti-age sont retirees. Le statut du produit, les donnees humaines limitees et ton bilan doivent etre examines par un medecin.",
    };
  }
  if (/ipamorelin/.test(name)) {
    return {
      purpose: "Hypothese experimentale de secretagogue de GH, a evaluer sans promesse sur le sommeil ou la composition corporelle",
      rationale: "Dans ton cas, cette molecule a ete evoquee pour completer une discussion sur ton axe GH, ton sommeil et ta recuperation. Le rapport ne peut pas affirmer qu'elle sera selective, qu'elle evitera un effet hormonal indesirable ou qu'elle ameliorera automatiquement ton sommeil et ta recuperation. Un medecin doit evaluer le niveau de preuve et les risques.",
    };
  }
  if (/dsip/.test(name)) {
    return {
      purpose: "Hypothese experimentale autour du sommeil, avec donnees humaines limitees et sans effet hormonal garanti",
      rationale: "Dans ton cas, cette molecule a ete evoquee a cause de ton objectif de sommeil et de ton besoin de recuperation plus stable. Une amelioration du sommeil ou de ta testosterone ne peut pas etre promise a partir du mecanisme suppose. Le produit est experimental pour cet usage et une evaluation medicale des causes du sommeil perturbe reste prioritaire.",
    };
  }
  if (/epitalon/.test(name)) {
    return {
      purpose: "Hypothese experimentale de longevite, sans benefice clinique anti-age etabli pour ton cas",
      rationale: "Dans ton cas, cette molecule a ete evoquee pour ton interet envers la longevite et ta volonte d'optimiser le vieillissement. Le rapport retire les affirmations sur l'activation utile de la telomerase, le rajeunissement cellulaire ou un profil de securite exceptionnel. Les preuves humaines et le statut reglementaire doivent etre verifies avec un professionnel.",
    };
  }
  return {
    purpose: "Hypothese a discuter avec un medecin, sans efficacite ni securite garanties",
    rationale: "Dans ton cas, cette molecule a ete evoquee a partir de ton questionnaire et de tes objectifs declares. Cela ne suffit pas a conclure qu'elle est adaptee pour toi. Son statut, les donnees humaines, les risques, les alternatives approuvees et ton bilan doivent etre verifies avant toute decision.",
  };
}

function cleanUnsafePeptideFields(report: RepairableReport): void {
  for (const peptide of report.peptides || []) {
    const cautious = cautiousPurpose(peptide);
    peptide.purpose = cautious.purpose;
    peptide.whyThisPeptide = cautious.rationale;
    peptide.dosage = `Projet theorique de dosage a valider medicalement: ${stripProjectPrefix(peptide.dosage)}`;
    peptide.timing = `Projet de timing a confirmer: ${stripProjectPrefix(peptide.timing)}`;
    peptide.route = `Projet de voie a confirmer: ${stripProjectPrefix(peptide.route)}`;
    peptide.cycleDuration = `Projet de duree a confirmer: ${stripProjectPrefix(peptide.cycleDuration)
      .replace(/,\s*relance si besoin[^.]*\.?/gi, "")
      .replace(/\s*Peut [eê]tre r[ée]p[ée]t[ée][^.]*\.?/gi, "")}`;
    peptide.vialsNeeded = String(peptide.vialsNeeded || "")
      .replace(/\bpour Cure\b/g, "pour une cure")
      .replace(/besoin calcule ~(\d+)\.(\d+)\s*mg/gi, "besoin calcule ~$1,$2 mg")
      .replace(/(\d)\s*mg\b/gi, "$1 mg");

    peptide.cycleDuration = removeUnsupportedDescent(
      peptide.cycleDuration,
      peptide.dosage
    );

    const noMixing =
      "Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien qui connait les produits, les concentrations et ton dossier.";
    peptide.timing = sanitizeClientFacingText(
      (peptide.timing || "")
        .replace(/peut [eê]tre m[ée]lang[ée][^.]*m[êe]me seringue[^.]*\.?/gi, noMixing)
        .replace(/simultan[ée]ment avec/gi, "Le meme jour que")
    );

    const vialMg = extractVialMg(peptide.vialsNeeded) || extractVialMg(peptide.reconstitution);
    const solventMatch = (peptide.reconstitution || "").match(/\+\s*(\d+(?:[.,]\d+)?)\s*ml/i);
    const solventMl = solventMatch ? Number(solventMatch[1].replace(",", ".")) : null;
    const maxDoseMatch = Array.from(
      (peptide.dosage || "").matchAll(/(\d+(?:[.,]\d+)?)\s*mg/gi)
    ).map((match) => Number(match[1].replace(",", "."))).filter(Number.isFinite);
    const maxDoseMg = maxDoseMatch.length > 0 ? Math.max(...maxDoseMatch) : null;

    if (/retatrutide/i.test(peptide.name) && vialMg && solventMl && maxDoseMg) {
      const concentration = vialMg / solventMl;
      const maxVolume = maxDoseMg / concentration;
      peptide.reconstitution = sanitizeClientFacingText(
        `Controle de coherence uniquement: un vial de ${vialMg} mg avec ${solventMl} ml donne une concentration theorique de ${concentration.toFixed(2)} mg/ml. La dose maximale mentionnee dans le projet de protocole, ${maxDoseMg} mg, correspondrait mathematiquement a ${maxVolume.toFixed(2)} ml. Ce volume peut depasser la capacite d'une seringue U-100 de 1 ml. Ne fractionne pas la dose et n'utilise pas plusieurs vials de ta propre initiative. Fais valider la concentration, le volume, le materiel et la posologie par un medecin ou un pharmacien avant toute manipulation.`
      );
    } else {
      peptide.reconstitution = sanitizeClientFacingText(
        `La reconstitution ne doit pas etre improvisee a partir d'une formule generale. Le volume de solvant, la concentration finale, la stabilite, la capacite de la seringue et la compatibilite du produit doivent etre controles ensemble. Fais verifier le calcul exact de ${peptide.name} par un medecin ou un pharmacien avant toute manipulation. Ne melange pas ce produit avec un autre dans la meme seringue sans accord explicite.`
      );
    }
  }
}

function peptideIdentity(peptide: PeptideItem): string {
  return joinBlocks(
    block(peptide.name, [
      `Objectif evoque dans le rapport: ${asSentence(peptide.purpose)}`,
      `Dosage: ${asSentence(peptide.dosage)}`,
      `Timing: ${asSentence(peptide.timing)}`,
      `Duree: ${asSentence(peptide.cycleDuration)}`,
      "Quantite calculee: voir la liste de commande verifiee pour le detail exact des vials, du prix live et des limites de commande.",
      `Verification live: ${asSentence(peptide.priceEstimate)}`,
      `Lien catalogue: ${asSentence(peptide.purchaseUrl)}`,
      `Point de securite: ${asSentence(peptide.reconstitution)}`,
    ].join("\n"))
  );
}

function allPeptideIdentities(report: RepairableReport): string {
  return (report.peptides || []).map(peptideIdentity).join("\n\n");
}

function liveShoppingLines(report: RepairableReport): string {
  return (report.peptides || []).map((peptide, index) => [
    `${index + 1}. ${peptide.name}`,
    `Quantite calculee: ${peptide.vialsNeeded}.`,
    `Offre live retenue: ${peptide.priceEstimate}.`,
    `Page produit: ${peptide.purchaseUrl}.`,
  ].join("\n")).join("\n\n");
}

function buildSections(report: RepairableReport, firstName: string): ReportSection[] {
  const sync = report._peptauraLiveSync || {};
  const country = sync.country || "ton pays";
  const shippingUrl = sync.shippingUrl || `https://www.peptaura.com/shipping?country=${encodeURIComponent(country)}`;
  const syncedAt = sync.syncedAt
    ? new Date(sync.syncedAt).toLocaleString("fr-FR", { timeZone: "Asia/Dubai" })
    : "au moment de la verification";
  const catalogAt = sync.catalogRefreshedAt
    ? new Date(sync.catalogRefreshedAt).toLocaleString("fr-FR", { timeZone: "Asia/Dubai" })
    : "au moment de la verification";
  const peptideNames = (report.peptides || []).map((peptide) => peptide.name).join(", ");
  const identities = allPeptideIdentities(report);
  const shopping = liveShoppingLines(report);

  const medicalGate = `${firstName}, ce rapport est un document de preparation a une discussion medicale. Il ne remplace ni un diagnostic, ni une prescription, ni une formation pratique. Plusieurs molecules citees ici sont experimentales ou non approuvees pour cet usage, avec des donnees humaines encore limitees. Avant tout achat ou toute utilisation, demande a ton medecin ou a ton pharmacien de verifier la molecule, la dose, la concentration, tes allergies, tes traitements et tes analyses. Sans validation explicite, tu ne commences pas.`;

  const sectionContent: Record<string, { title: string; content: string }> = {
    "profil-synthese": {
      title: "Synthese de ton profil et priorites",
      content: joinBlocks(
        block("Ce que ton questionnaire permet d'affirmer", `${firstName}, ton objectif prioritaire est une perte de masse grasse avec maintien de la masse musculaire. Tu veux aussi travailler le sommeil, la recuperation et certains marqueurs hormonaux. Tu as indique une apprehension vis-a-vis des injections, une allergie a la penicilline et au rhume des foins, un historique de MK-677 et de SARMs, ainsi qu'aucun peptide en cours. Ces informations servent a identifier les points a controler. Elles ne suffisent pas a conclure qu'une molecule est adaptee ou sans risque pour toi.`),
        block("Priorite avant le stack", "A 23 ans, le premier levier reste un bilan medical propre, une strategie nutritionnelle tenable, un sommeil mesure sur plusieurs semaines et un programme d'entrainement coherent. Une baisse de testostérone ressentie ne se diagnostique pas sur des sensations seules. Une fatigue, un sommeil instable ou une recomposition difficile peuvent avoir plusieurs causes. Il faut distinguer ce qui releve du mode de vie, d'un probleme medical, d'un effet residuel de produits utilises auparavant ou d'une attente trop agressive sur le rythme de perte de gras."),
        block("Points personnels a signaler", "Mentionne au professionnel de sante ton allergie a la penicilline, tes symptomes allergiques saisonniers, ton historique de produits de performance, tes supplements actuels et ton apprehension face aux injections. Une allergie a la penicilline ne permet pas de conclure qu'un produit injectable est automatiquement compatible. Les excipients, le solvant, le risque de contamination et la provenance du produit comptent aussi. Ton inconfort avec les aiguilles justifie une vraie demonstration par un professionnel, pas une simple lecture en ligne."),
        block("Objectif realiste", "Le bon resultat n'est pas de suivre le plus gros stack possible. Le bon resultat est de choisir le minimum d'interventions, de fixer des criteres d'arret, de suivre des marqueurs objectifs et de pouvoir attribuer un effet ou un probleme a une seule modification. Si plusieurs produits commencent en meme temps, l'interpretation devient vite impossible. Une approche sequentielle, encadree et documentee est plus lisible qu'un demarrage simultane."),
        block("Regle de decision", medicalGate),
      ),
    },
    rationale: {
      title: "Lecture critique des molecules proposees",
      content: joinBlocks(
        block("Comment lire cette selection", `Le rapport initial a retenu ${peptideNames}. Cette liste doit etre lue comme une serie d'hypotheses a discuter, pas comme une ordonnance. Une molecule peut sembler coherente avec un objectif sur le papier tout en etant inadaptee a ton age, a tes antecedents, a tes analyses ou a ton niveau de risque acceptable. Le benefice attendu, la qualite des preuves humaines, le statut reglementaire, les effets indesirables et les alternatives approuvees doivent etre examines separement.`),
        block("Niveau de preuve", "Une association mecanistique ne garantit pas un benefice clinique. Le fait qu'une molecule agisse sur une voie liee a la faim, au sommeil, a l'IGF-1 ou a la secretion de GH ne prouve pas qu'elle ameliorera ton resultat personnel, ni que le rapport benefice-risque est favorable. Les promesses absolues, les comparaisons du type plus puissant ou plus propre et les delais de resultat garantis sont retires. Pour les molecules experimentales, l'incertitude fait partie de la decision et doit etre dite clairement."),
        block("Empilement et attribution", "Le stack comporte plusieurs axes a la fois: appetit et metabolisme, secretion de GH, sommeil et longevite. Plus le nombre de produits augmente, plus le suivi devient difficile. Un effet digestif, une fatigue, une reaction locale, une variation de glycemie ou un changement du sommeil ne peuvent plus etre attribues proprement. Demande au professionnel qui te suit s'il faut abandonner certaines hypotheses, commencer une seule intervention ou privilegier une option approuvee avec un suivi connu."),
        block("Fiches de controle", identities),
        block("Decision finale", medicalGate),
      ),
    },
    "bilan-sanguin": {
      title: "Tes 2 credits Blood Analysis et le bilan medical",
      content: joinBlocks(
        block("Ce que tu as achete", "Ton paiement Peptides Engine inclut 2 credits Blood Analysis. Tu peux les utiliser quand tu veux. L'usage le plus logique est un premier credit avant la mise en place de recommandations, puis le second environ 2 a 3 mois apres leur mise en place. Les credits couvrent l'analyse APEXLABS de tes resultats. Ils ne paient pas automatiquement le prelevement du laboratoire et ne remplacent pas une consultation medicale."),
        block("Premier credit", "Le premier bilan sert a disposer d'une base avant toute modification. Montre au medecin ou a l'endocrinologue tes objectifs, tes antecedents de MK-677 et de SARMs, tes supplements, tes allergies et la liste des molecules evoquees dans ce rapport. Laisse le professionnel choisir les marqueurs utiles selon ton examen, ton histoire et les recommandations applicables. Ne commande pas aveuglement une longue liste de tests uniquement parce qu'elle apparait dans un rapport."),
        block("Deuxieme credit", "Le second bilan est idealement utilise 2 a 3 mois apres la mise en place des recommandations validees. Il sert a comparer les marqueurs dans des conditions aussi proches que possible: meme laboratoire si possible, horaire similaire, conditions de jeune identiques et contexte d'entrainement note. Si un symptome apparait avant cette fenetre, le suivi ne doit pas attendre le deuxieme credit. Tu contactes le professionnel de sante sans delai."),
        block("Axes a discuter avec le medecin", "Selon ton contexte, le professionnel peut envisager une evaluation metabolique, hepatique, renale, lipidique, thyroidienne, hematologique et hormonale. Pour un axe hormonal masculin, l'interpretation depend notamment de l'heure du prelevement, des symptomes, de mesures repetees et du contexte clinique. Pour un axe GH ou IGF-1, un chiffre isole ne suffit pas non plus. Le choix exact des marqueurs, leur timing et leur interpretation appartiennent au professionnel qui connait ton dossier."),
        block("Utilisation pratique", "Quand ton PDF est pret, connecte-toi sur https://apexlabs.achzodcoaching.com/blood-dashboard avec l'adresse utilisee pour la commande. Envoie un PDF lisible et complet. Garde une copie du compte rendu du laboratoire et note la date, l'heure, le jeune, la derniere seance et tout traitement ou supplement pris. Cette trace rend la comparaison du deuxieme credit beaucoup plus utile."),
        block("Limite claire", medicalGate),
      ),
    },
    "guide-fournisseur": {
      title: "Verification du catalogue Peptaura",
      content: joinBlocks(
        block("Nature de la plateforme", "Peptaura est une place de marche qui agrege des offres de fournisseurs. Une fiche presente sur la plateforme n'est pas une validation medicale, une autorisation de mise sur le marche ou une garantie pharmaceutique. Un COA fourni par un vendeur ne suffit pas, a lui seul, a prouver l'identite, la sterilite, la concentration ou la conservation d'un produit recu."),
        block("Controle live effectue", `Le catalogue a ete recrawle le ${catalogAt}. Les pages produit et les prix selectionnes ont ete relus le ${syncedAt}. Le pays de livraison utilise pour le filtre est ${country}. La page de controle est ${shippingUrl}. Les noms de fournisseurs, les stocks, les dosages proposes, les tailles de boite, les prix et les conditions de livraison peuvent changer apres cette verification.`),
        block("Avant tout paiement", "Ouvre chaque lien de la liste de courses et compare le nom exact, le dosage par vial, la taille de boite, le nombre de vials recus, le prix total, le fournisseur et le statut de stock. Verifie ensuite la livraison vers ton pays sur la page shipping. Si un seul element differe du rapport, ne substitue pas automatiquement un autre dosage ou un autre produit. Une difference de concentration change les calculs et impose une nouvelle validation."),
        block("Qualite et tracabilite", "Demande les informations de lot et les documents disponibles, puis examine leur coherence avec un professionnel qualifie. Regarde le nom du laboratoire d'analyse, la date, le numero de lot, les methodes utilisees et l'independance du test. La purete chimique ne couvre pas necessairement la sterilite, les endotoxines, l'identite du contenu ou les conditions de transport. Ne transforme jamais un document commercial en garantie de securite."),
        block("Aucune fausse promesse", "Le rapport ne presente aucun fournisseur comme une source personnelle, medicale ou garantie. Il ne promet pas un delai de livraison, une absence de controle douanier ou une qualite constante. Peptaura reste la seule source cataloguee par ce rapport. Aucun vendeur de secours non audite n'est recommande."),
        block("Decision", medicalGate),
      ),
    },
    "reconstitution-guide": {
      title: "Reconstitution: controles obligatoires",
      content: joinBlocks(
        block("Pourquoi cette partie a ete corrigee", "Une reconstitution ne se resume pas a ajouter un volume standard dans tous les vials. Le calcul depend de la quantite reelle du produit, du volume de solvant, de la concentration finale, de la stabilite, des instructions du fabricant, du materiel et de la dose validee. Une erreur d'un facteur dix peut venir d'une confusion entre mg, mcg, ml et unites U-100."),
        block("Ce que tu ne dois pas improviser", "Ne choisis pas le volume de solvant pour obtenir un chiffre pratique sans verifier les instructions du produit. Ne suppose pas qu'un vial accepte n'importe quel volume. Ne reutilise pas une seringue. Ne partage pas de materiel. Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien. Ne fractionne pas une dose en plusieurs injections pour contourner la capacite du materiel sans validation."),
        block("Controle en quatre valeurs", "Avant toute manipulation, le professionnel doit confirmer quatre valeurs ecrites: la quantite contenue dans le vial, le volume de solvant a ajouter, la concentration finale obtenue et le volume correspondant a la dose prescrite. Ces quatre valeurs doivent etre accompagnees de leur unite. Le resultat est ensuite compare a la capacite reelle de la seringue. Si une valeur manque ou si deux sources se contredisent, tu t'arretes."),
        block("Controle par molecule", (report.peptides || []).map((peptide) => `${peptide.name}: ${peptide.reconstitution}`).join("\n\n")),
        block("Hygiene et formation", "Demande une demonstration pratique a un medecin, un pharmacien ou un infirmier autorise. La formation doit couvrir le materiel sterile, la desinfection, le stockage, l'elimination des aiguilles et la conduite a tenir en cas de contamination ou d'erreur. Une video ou un texte ne permet pas de verifier ta technique. Ton apprehension face aux injections est une raison supplementaire pour ne pas apprendre seul."),
        block("Stop immediat", "Si la solution change d'aspect, si le vial est endommage, si la provenance ou le lot ne correspond pas, si la chaine de conservation est inconnue ou si le calcul exige un volume incoherent, tu n'utilises pas le produit. Tu demandes une verification au pharmacien et au fournisseur, puis tu conserves les preuves de lot et de commande."),
        block("Cadre medical", medicalGate),
      ),
    },
    "guide-injection": {
      title: "Injection: formation et securite",
      content: joinBlocks(
        block("Pas de fausse reassurance", "Une aiguille fine ne rend pas une injection sans risque. Une mauvaise technique peut provoquer une blessure, une infection, une erreur de dose, une reaction locale ou une exposition accidentelle. Le rapport ne te promet pas une injection indolore et ne pretend pas que tu ne peux pas atteindre une structure sensible. Ton anxiete est legitime et doit etre prise en compte dans la decision."),
        block("Formation en presentiel", "Avant la premiere injection, demande une demonstration a un professionnel autorise. Il doit verifier le type de seringue, la compatibilite du volume, la lecture des graduations, le site adapte, la rotation des zones, l'hygiene des mains, la preparation d'un espace propre et l'elimination du materiel. Fais-lui regarder ton geste complet jusqu'a ce que chaque etape soit comprise."),
        block("Materiel a usage unique", "Utilise uniquement du materiel sterile, intact et a usage unique provenant d'un circuit fiable. Une aiguille ou une seringue utilisee ne se remet jamais dans un vial. Ne partage aucun materiel et ne conserve pas une seringue pre-remplie sans instruction medicale et pharmaceutique explicite. Une boite pour objets piquants et tranchants doit etre disponible avant de commencer."),
        block("Pas de melange improvise", "Ne mets pas CJC-1295, Ipamorelin, DSIP ou un autre produit ensemble dans la meme seringue sur la seule base de ce rapport. La compatibilite physicochimique, la stabilite, la concentration et la tracabilite doivent etre confirmees pour les produits exacts. En cas de doute, chaque produit reste separe et tu attends l'avis du professionnel."),
        block("Apres le geste", "Note la date, l'heure, le produit, le lot, la concentration, le volume et le site. Surveille la zone sans banaliser une reaction. Une douleur croissante, une zone chaude qui s'etend, un ecoulement, une fievre, un malaise ou une reaction allergique demandent un avis medical. Une difficulte respiratoire, un gonflement du visage ou une perte de connaissance relèvent d'une urgence."),
        block("Erreur ou doute", "Si tu penses avoir mal lu une graduation, utilise le mauvais produit, contamine le materiel ou injecte un volume different de celui valide, ne tente pas de corriger avec une deuxieme dose. Garde les emballages et contacte immediatement un professionnel de sante ou un centre antipoison selon la situation."),
        block("Condition de depart", medicalGate),
      ),
    },
    "protocole-pratique": {
      title: "Projet de protocole a faire valider",
      content: joinBlocks(
        block("Statut de ce planning", "Ce planning organise les informations du rapport pour faciliter la discussion avec ton medecin ou ton pharmacien. Il ne te donne pas le feu vert pour commencer. Les doses, les jours, la duree, les pauses, le nombre de produits simultanes et les criteres d'arret doivent etre corriges ou confirmes par ecrit avant toute utilisation."),
        block("Projet par molecule", identities),
        block("Semaine type de discussion", "Lundi: revue du sommeil, de l'appetit, du poids et des symptomes, sans changement automatique de dose.\nMardi: entrainement et recuperation notes dans le journal.\nMercredi: verification de toute reaction locale ou digestive et contact medical si elle persiste.\nJeudi: aucun rattrapage et aucun doublement apres un oubli.\nVendredi: controle du materiel, des lots et du stockage avant le week-end.\nSamedi: jour de repos ou d'entrainement selon ton programme, avec hydratation et alimentation stables.\nDimanche: bilan hebdomadaire ecrit. Toute modification reste suspendue tant qu'elle n'est pas validee."),
        block("Une modification a la fois", "Ne monte pas une dose, n'ajoute pas une molecule et ne change pas ton alimentation de facon majeure la meme semaine. Si plusieurs variables changent ensemble, un effet secondaire ou une amelioration devient impossible a attribuer. Le journal doit indiquer les symptomes, le sommeil, l'appetit, le poids, le tour de taille, l'entrainement et tout changement de supplement ou de medicament."),
        block("Oubli et rattrapage", "Le rapport ne donne pas de regle universelle de rattrapage. La conduite depend du produit, de sa pharmacologie, du temps ecoule, de la dose validee et de ton etat. Ne double jamais une dose de ta propre initiative. Demande une instruction ecrite au prescripteur ou au pharmacien pour chaque molecule avant le debut."),
        block("Arret", "Les criteres d'arret doivent etre definis avant le depart: symptome nouveau important, reaction allergique, douleur persistante, vomissements ou diarrhee avec deshydratation, malaise, confusion, glycemie anormale si elle est suivie, produit ou lot douteux, resultat biologique preoccupant ou demande du professionnel. Une descente progressive ne doit pas apparaitre dans la duree du cycle si elle n'est pas detaillee et medicalement validee dans le dosage."),
        block("Validation", medicalGate),
      ),
    },
    "shopping-list": {
      title: "Liste de courses verifiee en direct",
      content: joinBlocks(
        block("Horodatage", `Les offres ont ete relues le ${syncedAt} et le crawl catalogue date du ${catalogAt}. Le filtre pays utilise est ${country}. Les prix sont des instantanes, pas des promesses. Ouvre chaque lien avant de payer et recontrole la page shipping: ${shippingUrl}.`),
        block("Produits et quantites", shopping),
        block("Lecture des quantites", "La quantite indiquee correspond au calcul du projet de dosage et au format de vial retenu. Elle ne vaut pas validation de la posologie. Si le fournisseur propose une boite, la ligne de prix distingue le nombre de boites achetees et le nombre de vials recus. Une offre qui impose plus de 20% de surstock par rapport au besoin calcule est rejetee. Une autre concentration impose un nouveau calcul."),
        block("Avant de commander", "Compare le nom exact, le dosage, la taille de boite, le fournisseur, le prix total et le pays livre. Fais une capture de la fiche, du lot et des conditions de livraison. Ne remplace jamais une molecule par un blend, une variante avec DAC, une autre forme ou une autre concentration sans nouvelle validation. N'ajoute pas de produit parce qu'il est moins cher ou disponible."),
        block("Materiel", "Le materiel injectable, le solvant et le collecteur d'aiguilles doivent venir d'un circuit fiable et etre adaptes au produit exact. La presence d'un accessoire sur une place de marche ne prouve pas qu'il est adapte. Demande au pharmacien de verifier le choix et la capacite. Ne commande pas le materiel avant d'avoir une posologie et une concentration validees."),
        block("Blocage", "Si le stock change, si le fournisseur n'expedie plus vers ton pays, si le dosage exact disparait ou si le prix semble incoherent, tu ne choisis pas l'offre la plus proche. Tu suspends l'achat et tu demandes une nouvelle verification du catalogue et du calcul."),
        block("Cadre medical", medicalGate),
      ),
    },
    "hygiene-conservation": {
      title: "Hygiene, stockage et tracabilite",
      content: joinBlocks(
        block("Trois risques differents", "La qualite chimique, la sterilite et la bonne conservation sont trois sujets distincts. Un pourcentage de purete ne prouve pas l'absence de bacteries, d'endotoxines ou d'erreur de concentration. Un produit peut aussi etre altere par un transport, une temperature ou une duree de stockage inadaptes. Le rapport ne fixe donc pas une duree universelle de conservation apres reconstitution."),
        block("Instructions du produit", "Lis les informations du fabricant et demande au pharmacien de confirmer la conservation du lot exact, avant et apres reconstitution. Note la temperature, la protection contre la lumiere, la date d'ouverture, la date de reconstitution et la duree maximale admise. Si les instructions manquent, se contredisent ou ne sont pas credibles, le produit ne doit pas etre utilise."),
        block("Frigo partage", "Dans un frigo partage, le produit doit rester dans un contenant ferme, propre, identifie et inaccessible aux autres personnes. Evite la porte du refrigerateur, les variations de temperature et tout contact avec des aliments ou des surfaces sales. Un contenant discret ne doit jamais supprimer l'etiquette, le lot, la concentration ou la date. La securite des autres personnes passe avant la discretion."),
        block("Asepsie", "Prepare une surface propre, lave et seche tes mains, puis suis exactement la technique montree par le professionnel. Ne touche pas les parties steriles. Un bouchon desinfecte ne rend pas sterile une aiguille deja utilisee. Chaque entree dans un vial se fait avec du materiel neuf selon les instructions validees. Si un doute de contamination existe, le vial est mis de cote."),
        block("Aspect et integrite", "Avant chaque utilisation, controle l'etiquette, le lot, l'integrite du vial et l'aspect de la solution. Une fuite, un bouchon endommage, une particule inattendue, un changement de couleur, une opacite ou une conservation inconnue imposent l'arret. Ne tente pas de filtrer, rechauffer, secouer ou corriger une solution suspecte."),
        block("Elimination", "Les aiguilles et objets piquants vont immediatement dans un collecteur adapte, jamais dans une poubelle ordinaire ou un sac recycle. Demande a la pharmacie la filiere locale de retour. Garde les enfants, les proches et les animaux a distance du materiel et des produits."),
        block("Verification", medicalGate),
      ),
    },
    "securite-surveillance": {
      title: "Securite, surveillance et criteres d'arret",
      content: joinBlocks(
        block("Avant de commencer", "Fais verifier ton historique medical, tes allergies, tes antecedents familiaux, tes medicaments, tes supplements et tes produits de performance passes. Les symptomes digestifs, le risque d'hypoglycemie, la fonction renale et hepatique, les antecedents pancreatiques ou biliaires, le contexte thyroidien et les objectifs hormonaux doivent etre examines selon la molecule envisagee. Une reponse negative dans un questionnaire ne remplace pas un interrogatoire medical."),
        block("Statut des molecules", "Retatrutide reste une molecule experimentale et non approuvee hors essai clinique au moment de cette verification. Plusieurs autres molecules du stack ne disposent pas d'une autorisation standard pour l'usage propose et leurs donnees humaines sont limitees. La vente comme produit de recherche ne signifie pas qu'un usage humain est legal, approuve ou sur. Le cadre varie selon le pays et doit etre verifie."),
        block("Signaux urgents", "Une difficulte respiratoire, un gonflement du visage ou de la gorge, une perte de connaissance, une confusion importante, une douleur thoracique, des signes neurologiques soudains ou une douleur abdominale intense demandent une prise en charge urgente. Ne te contente pas d'envoyer un email et ne tente pas de corriger la situation avec une autre dose."),
        block("Signaux a evaluer rapidement", "Des vomissements persistants, une diarrhee importante, une impossibilite de boire, une douleur abdominale qui ne cede pas, une fievre, une zone d'injection chaude qui s'etend, un ecoulement, des palpitations, des vertiges repetes ou un changement marque de l'humeur demandent un avis medical rapide. Le caractere attendu d'un effet ne doit jamais etre suppose a distance."),
        block("Journal", "Note chaque jour le sommeil, l'appetit, les symptomes digestifs, l'hydratation, les selles, l'entrainement, les douleurs, toute reaction locale et tout changement de traitement. Note aussi le produit, le lot, la concentration et le volume lorsqu'un professionnel a valide une administration. Ce journal permet de dater un probleme et d'eviter des souvenirs reconstruits."),
        block("Pas d'ajustement automatique", "Ne monte pas une dose parce qu'un effet attendu n'apparait pas vite. Ne reduis pas puis ne remonte pas au hasard. Ne recommence pas un cycle court pour traiter un rebond sans evaluation medicale. Toute adaptation doit tenir compte du produit, de la dose deja prise, du delai, des symptomes et des analyses."),
        block("Regle finale", medicalGate),
      ),
    },
    "nutrition-protocole": {
      title: "Nutrition et entrainement pendant le suivi",
      content: joinBlocks(
        block("Objectif prioritaire", "Pour perdre du gras en preservant le muscle, vise une baisse progressive et mesurable, pas une restriction brutale. Une molecule qui reduit l'appetit peut aussi rendre plus difficile l'apport de proteines, de fibres, de liquides et de micronutriments. Le suivi doit donc regarder la qualite de l'alimentation, la force a l'entrainement, la recuperation et les symptomes digestifs, pas seulement le poids."),
        block("Proteines", "Ton apport proteique doit etre adapte a ton poids, a ton niveau d'entrainement, a ton apport calorique total et a ta tolerance. Une fourchette peut etre discutee avec un dieteticien ou un professionnel qualifie, puis repartie sur la journee avec des sources variees. Le rapport ne transforme pas un chiffre unique en obligation universelle. Si l'appetit chute au point de rendre l'alimentation insuffisante, cela doit etre signale."),
        block("Deficit calorique", "Commence par estimer ton apport reel sur une a deux semaines. Ajuste ensuite par petites etapes pour obtenir une tendance durable. Un deficit trop agressif augmente le risque de fatigue, de baisse de performance, de faim rebond, de perte musculaire et d'abandon. Le tour de taille, les photos standardisees, la moyenne du poids et les performances donnent une lecture plus solide qu'une pesee isolee."),
        block("Glucides et lipides", "Les glucides peuvent etre places autour de l'entrainement selon ta tolerance et ton volume de travail. Il n'est pas necessaire d'interdire automatiquement le gluten ou de croire qu'un aliment bloque directement une voie hormonale de facon utile en pratique. Les lipides alimentaires restent importants. Priorise des aliments peu transformes, des legumes, des fruits, des feculents adaptes, des sources de proteines et des graisses de qualite."),
        block("Hydratation et digestion", "Surveille la soif, les urines, la constipation, les nausees et la capacite a manger normalement. Une simple recommandation de boire davantage ne suffit pas si des vomissements, une diarrhee ou une douleur abdominale persistent. Dans ce cas, stoppe toute escalade et demande un avis medical. Les fibres augmentent progressivement pour eviter d'aggraver l'inconfort."),
        block("Entrainement", "Garde un programme stable pendant la phase d'observation. Trois a quatre seances d'hypertrophie peuvent etre compatibles avec ton objectif si la recuperation suit. Evite d'ajouter simultanement beaucoup de cardio, une forte restriction calorique et plusieurs produits. Une baisse nette de force, des malaises ou une fatigue inhabituelle doivent faire revoir le plan."),
        block("Supplements", "La creatine, les vitamines, les mineraux et les autres supplements doivent etre inclus dans la liste remise au professionnel. Naturel ne signifie pas sans interaction ni sans doublon. Verifie les doses cumulees, surtout lorsque plusieurs complexes contiennent les memes micronutriments. Ne compte pas sur un supplement pour corriger un effet secondaire."),
        block("Lien avec le suivi", medicalGate),
      ),
    },
    "checklist-demarrage": {
      title: "Checklist avant toute decision",
      content: joinBlocks(
        block("1. Consultation", "Tu as montre le rapport complet a un medecin ou a un pharmacien. Le professionnel connait ton age, ton historique de MK-677 et de SARMs, tes allergies, tes supplements, tes objectifs et les produits exacts envisages. Les contre-indications et les alternatives approuvees ont ete discutees."),
        block("2. Bilan initial", "Tu as utilise ou planifie ton premier credit Blood Analysis avant la mise en place des recommandations. Les marqueurs ont ete choisis par un professionnel selon ton dossier. Les conditions du prelevement sont notees et le PDF complet est conserve pour la comparaison."),
        block("3. Decision molecule par molecule", "Chaque produit a une justification, un niveau de preuve compris, une dose validee, une duree validee, des criteres d'arret et une conduite ecrite en cas d'oubli. Aucun blend, aucune substitution et aucun ajout de derniere minute ne sont acceptes."),
        block("4. Verification live", `Tu as rouvert les pages produit et la page shipping ${shippingUrl}. Le nom, le dosage, le fournisseur, la taille de boite, le nombre de vials, le lot disponible, le prix total et le pays livre correspondent exactement aux lignes du rapport. Toute difference bloque l'achat.`),
        block("5. Reconstitution", "Le volume de solvant, la concentration finale, le volume correspondant a la dose et la capacite du materiel sont ecrits avec leurs unites. Un professionnel a refait le calcul. Aucun melange dans la meme seringue n'est prevu sans confirmation explicite."),
        block("6. Formation", "Un professionnel autorise t'a montre la manipulation avec le materiel exact. Tu disposes de materiel sterile a usage unique, d'un collecteur d'aiguilles et d'un stockage sur. Ton anxiete face au geste a ete prise au serieux."),
        block("7. Journal et urgence", "Ton journal est pret avec les produits, lots, dates, symptomes et mesures. Tu sais qui appeler en cas de question et quels signes imposent une urgence. Tu ne comptes pas sur un email pour une situation aigue."),
        block("8. Deuxieme credit", "Tu as prevu le deuxieme credit Blood Analysis environ 2 a 3 mois apres la mise en place des recommandations, sauf si un symptome ou le professionnel impose un controle plus tot."),
        block("Feu vert", "S'il manque une seule case, tu ne commences pas. " + medicalGate),
      ),
    },
    "effets-secondaires": {
      title: "Effets indesirables et conduite a tenir",
      content: joinBlocks(
        block("Ne pas classer trop vite un effet comme normal", "Un effet frequent n'est pas automatiquement benin pour toi. Son intensite, sa duree, les autres symptomes, ton hydratation, tes traitements et la dose comptent. Le rapport retire les promesses de type tu vas sentir, c'est positif ou cela disparaitra. Un professionnel doit evaluer un symptome persistant ou inquietant."),
        block("Digestif et metabolique", "Nausees, vomissements, diarrhee, constipation, perte d'appetit importante, faiblesse, vertiges ou douleur abdominale doivent etre notes. Une impossibilite de boire, des signes de deshydratation, une douleur abdominale intense ou persistante, une confusion ou un malaise demandent une evaluation rapide. Ne monte pas une dose pour respecter un calendrier si la tolerance n'est pas bonne."),
        block("Reaction locale et infection", "Une rougeur, une douleur ou un gonflement se surveillent. Une zone chaude qui s'etend, une douleur croissante, un ecoulement, une strie rouge, une fievre ou un malaise peuvent signaler une complication. Le lot, le produit, le site, le materiel et l'heure doivent etre conserves dans le journal pour aider l'evaluation."),
        block("Allergie", "Ton allergie a la penicilline ne permet ni de predire ni d'exclure une reaction a un produit, un excipient ou un contaminant. Urticaire generalise, gonflement du visage ou de la gorge, difficulte respiratoire, voix modifiee, sensation de malaise intense ou perte de connaissance sont des signes d'urgence."),
        block("Sommeil, humeur et neurologie", "Somnolence, insomnie, reves intenses, agitation, anxiete, baisse de l'humeur ou symptome neurologique nouveau ne doivent pas etre presentes comme une preuve que le produit fonctionne. Note le debut, la duree et les autres changements. Un symptome marque ou dangereux impose l'arret et une evaluation."),
        block("Hormonal et retention", "Une variation de poids, une retention d'eau, des palpitations, des maux de tete ou un changement de performance n'identifient pas a eux seuls une voie hormonale. N'interprete pas ces signes comme une hausse utile de GH ou de testostérone. Les symptomes et les analyses doivent etre lus ensemble par un professionnel."),
        block("Apres un effet", "Ne reprends pas le produit pour tester une seconde fois apres une reaction importante. Ne masque pas le symptome avec un autre produit. Garde le vial, l'emballage, le lot, les captures de la fiche et le journal. Contacte le professionnel qui suit le dossier ou les services d'urgence selon la gravite."),
        block("Cadre", medicalGate),
      ),
    },
    faq: {
      title: "Questions frequentes, reponses corrigees",
      content: joinBlocks(
        block("Puis-je commencer des reception du colis", "Non. La reception ne remplace pas la validation medicale, le bilan initial, la verification du lot, le controle de concentration et la formation pratique. Tant que ces points ne sont pas termines, le produit reste non utilise."),
        block("Puis-je melanger plusieurs peptides", "Pas sur la base de ce rapport. Ne melange pas plusieurs produits dans la meme seringue sans confirmation explicite d'un medecin ou d'un pharmacien pour les produits, concentrations et lots exacts. Une habitude lue en ligne ne prouve pas la compatibilite."),
        block("Que faire en cas d'oubli", "Ne double pas une dose et n'invente pas un rattrapage. Demande avant le debut une regle ecrite pour chaque produit. Si l'oubli arrive sans consigne disponible, contacte le professionnel ou le pharmacien et attends sa reponse."),
        block("Puis-je voyager avec les produits", "Les regles de transport, de douane, de prescription, de temperature et de securite varient selon le pays, la molecule et le statut du produit. Verifie les regles officielles avant le depart. Ne suppose pas qu'un produit de recherche passe sans probleme en cabine ou en soute."),
        block("Un COA garantit-il le produit", "Non. Un COA peut apporter une information, mais sa valeur depend du laboratoire, de la methode, de la date, du lot et de la chaine de tracabilite. La purete annoncee ne prouve pas necessairement la sterilite, l'absence d'endotoxines, la concentration ou l'identite du contenu recu."),
        block("Les produits sont-ils approuves", "Plusieurs molecules de ce stack sont experimentales ou non approuvees pour l'usage propose. Retatrutide reste en developpement clinique au moment de cette verification. La mention produit de recherche ne donne pas une autorisation d'usage humain. Verifie le cadre local avec un professionnel qualifie."),
        block("Combien de temps avant un resultat", "Le rapport ne garantit aucun delai ni aucun resultat. Une variation d'appetit, de sommeil, de poids ou de performance peut avoir plusieurs causes. Le suivi utilise des mesures standardisees et des criteres decides avant le debut, puis revoit le plan si le rapport benefice-risque n'est pas favorable."),
        block("Le calcul de Retatrutide depasse 1 ml", "C'est un signal de blocage, pas une invitation a fractionner. Si la concentration theorique conduit a un volume superieur a la capacite du materiel, le medecin ou le pharmacien doit revoir la concentration, la dose, le format ou la decision d'utiliser le produit. Ne prends pas deux vials pour fabriquer seul une dose."),
        block("Comment utiliser mes credits Blood Analysis", "Utilise idealement le premier credit avant les recommandations et le second environ 2 a 3 mois apres leur mise en place. Tu gardes la liberte de les utiliser plus tard. Un symptome ou une demande medicale peut justifier un controle plus precoce sans attendre le deuxieme credit."),
        block("Regle commune", medicalGate),
      ),
    },
    "disclaimer-support": {
      title: "Support, limites et prochaines etapes",
      content: joinBlocks(
        block("Ce que le rapport fait", "Le rapport structure ton questionnaire, les hypotheses de molecules, les calculs de quantite et un instantane live du catalogue. Il met en evidence les incoherences de dose, de volume, de prix ou de stock qui doivent bloquer la suite. Il t'aide a preparer des questions precises pour un medecin ou un pharmacien."),
        block("Ce que le rapport ne fait pas", "Il ne diagnostique pas, ne prescrit pas, ne forme pas a l'injection et ne garantit pas un fournisseur. Il ne peut pas certifier le contenu d'un vial, la sterilite, la qualite d'un lot, la legalite d'un achat ou l'absence d'interaction. Il ne remplace pas une prise en charge urgente."),
        block("Support commande", "Pour une question de paiement, de suivi, de produit manquant ou de remboursement sur Peptaura, utilise le support officiel de la plateforme: https://www.peptaura.com/contact. Garde le numero de commande, le fournisseur, les captures de la fiche et les informations de lot. Aucun fournisseur alternatif non audite n'est recommande dans ce rapport."),
        block("Support APEXLABS", "Pour une incoherence dans le rapport, un prix qui a change ou une question sur tes 2 credits Blood Analysis, ecris a coaching@achzodcoaching.com. Pour un symptome, une erreur de dose, une reaction ou une question clinique urgente, contacte un professionnel de sante ou les services d'urgence adaptes. N'attends pas une reponse commerciale."),
        block("Prochaine etape", "Commence par le premier credit Blood Analysis et la consultation. Apporte le PDF de resultats, ce rapport, la liste de tes supplements et ton historique de produits. Demande une decision molecule par molecule, des alternatives approuvees, des criteres d'arret et des instructions ecrites. Le deuxieme credit reste disponible pour une comparaison environ 2 a 3 mois apres la mise en place des recommandations."),
        block("Derniere regle", medicalGate),
      ),
    },
  };

  const sectionOrder = [
    "profil-synthese",
    "rationale",
    "bilan-sanguin",
    "guide-fournisseur",
    "reconstitution-guide",
    "guide-injection",
    "protocole-pratique",
    "shopping-list",
    "hygiene-conservation",
    "securite-surveillance",
    "nutrition-protocole",
    "checklist-demarrage",
    "effets-secondaires",
    "faq",
    "disclaimer-support",
  ];

  return sectionOrder.map((id) => ({
    id,
    title: sectionContent[id].title,
    content: sanitizeClientFacingText(sectionContent[id].content),
  }));
}

export function repairPeptidesReportContent(
  sourceReport: PeptidesReport,
  responses: Record<string, unknown>,
  tier?: string | null
): PeptidesReport {
  const report = sourceReport as RepairableReport;
  const firstName = String(
    report.clientName
    || responses.pep_name
    || responses.prenom
    || responses.firstName
    || "Profil"
  ).trim().split(/\s+/)[0];

  report.clientName = sanitizeClientFacingText(firstName);
  if (tier) report.tier = sanitizeClientFacingText(tier);
  if (report.qualityVersion === "medical-review-v1" && hasPeptidesHardRedFlag(responses)) {
    (report as any).qualityVersion = "medical-review-v1";
    cleanUnsafePeptideFields(report);
    anchorExpertPeptideRationales(report, responses);
    report.sections = buildSections(report, firstName);
    report.shoppingList = sanitizeClientFacingText(liveShoppingLines(report));
    normalizeTierCreditClaims(report, String(tier || report.tier || ""));
    normalizeSingleVialGrammar(report);
  } else {
    (report as any).qualityVersion = "expert-standard-v1";
    repairStandardReportContent(
      report,
      firstName,
      String(tier || report.tier || ""),
      responses
    );
  }

  const totalChars = (report.sections || []).reduce((sum, section) => sum + section.content.length, 0);
  if (totalChars < 30_000) {
    throw new Error(`QUALITY: rapport repare trop court (${totalChars} caracteres)`);
  }

  const styleAudit = auditClientFacingText(collectClientFacingStrings(report).join("\n"));
  if (!styleAudit.ok) {
    throw new Error(
      `QUALITY: style client invalide apres reparation, dashes=${styleAudit.forbiddenDashes}, vouvoiement=${styleAudit.vouvoiement.join(",")}, style=${styleAudit.roboticPhrases.join(",")}`
    );
  }

  return report;
}
