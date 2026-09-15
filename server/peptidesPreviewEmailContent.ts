const escapeHtml = (value: string): string =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type PeptidesPreviewEmailInput = {
  firstName: string;
  email: string;
  age: number;
  weightKg: number;
  heightCm: number;
  sex: string;
  bodyFatRange: string;
  primaryGoal: string;
  secondaryGoals: string[];
  goalDetails: string;
  timeline: string;
  recoveryScope: string;
  glp1History: string;
  cognitiveStress: string;
  conditions: string[];
  bloodwork: string;
  bloodPressure: string;
  sleepHours: number;
  medications: string;
  allergies: string;
  injectionComfort: string;
  injectionFrequency: string;
  refrigeration: string;
  experience: string;
  trainingFrequency: string;
  budgetTotalUsd: number;
  currentPeptides: string;
  pastPeptides: string;
  startWhen: string;
  country: string;
  attribution?: Record<string, unknown>;
};

export type PeptidesPreviewEmailResult = {
  status: "eligible" | "review_required";
  moleculeCount: number;
  headline: string;
  rationale: string;
  analysisPoints: string[];
  requiredMarkers: string[];
  nextStepExplanation: string;
  budgetExplanation: string;
  quoteExplanation: string;
  molecules: Array<{
    name: string;
    supplier: string;
    productUrl: string;
    role: string;
    reason: string;
    doseSummary: string;
    administrationCount: number;
    startingFormat: string;
    startingPackagePriceUsd: number;
    cycleDurationLabel: string;
    calculationBasis: string;
    totalRequiredMg: number;
    vialStrengthMg: number;
    mathematicalVials: number;
    operationalVials: number;
    vialsRequired: number;
    vialsPurchased: number;
    packageCount: number;
    estimatedTotalPriceUsd: number;
  }>;
  estimatedStarterCostUsd: number | null;
  estimatedProtocolCostUsd: number | null;
  estimatedShippingCostUsd: number | null;
  estimatedGrandTotalUsd: number | null;
  monthlyEquivalentUsd: number | null;
  shippingBreakdown: Array<{ supplier: string; subtotalUsd: number; shippingUsd: number; speed: string }>;
  totalVialsRequired: number | null;
  totalVialsPurchased: number | null;
  totalPackages: number | null;
  durationLabel: string;
  budgetFit: string;
  blockers: string[];
  nextStep: string;
};

function money(value: number | null): string {
  return value == null ? "À valider" : `$${Number(value).toFixed(2)}`;
}

const profileLabels: Record<string, string> = {
  male: "Homme", female: "Femme",
  recovery: "Récupération", "gh-antiaging": "Axe GH", fatloss: "Perte de graisse", sleep: "Sommeil", cognitive: "Cognition", libido: "Libido", "testo-boost": "Axe testostérone", "skin-hair": "Peau et cheveux", endurance: "Endurance",
  none: "Aucune", diabetes: "Diabète", cancer: "Cancer actif ou antécédent", pregnant: "Grossesse", breastfeeding: "Allaitement", autoimmune: "Maladie auto-immune", cardiac: "Problème cardiaque", hypertension: "Hypertension", thyroid: "Trouble thyroïdien", "renal-hepatic": "Atteinte rénale ou hépatique",
  recent: "Bilan de moins de trois mois", old: "Bilan de plus de trois mois", never: "Aucun bilan",
  normal: "Tension normale", controlled: "Tension traitée et contrôlée", high: "Tension élevée", unknown: "Non renseigné",
  comfortable: "À l’aise avec les injections", possible: "Injection possible si nécessaire", anxious: "Anxieux mais ouvert aux injections", refuse: "Refuse les injections",
  "twice-daily": "Jusqu’à deux fois par jour", daily: "Une fois par jour", "few-week": "Deux à cinq fois par semaine", weekly: "Une fois par semaine", minimal: "Fréquence minimale",
  "yes-private": "Réfrigérateur privé", "yes-shared": "Réfrigérateur partagé", no: "Pas de stockage au froid",
  "4-6": "Quatre à six semaines", "8-12": "Huit à douze semaines", "12plus": "Plus de douze semaines",
  asap: "Dès que possible", "1-2weeks": "Dans une à deux semaines", "1month": "Dans un mois", planning: "Préparation pour plus tard",
  FR: "France", BE: "Belgique", CH: "Suisse", LU: "Luxembourg", AE: "Émirats arabes unis", CA: "Canada", US: "États-Unis", GB: "Royaume-Uni", DE: "Allemagne", ES: "Espagne", IT: "Italie", NL: "Pays-Bas", PT: "Portugal", MA: "Maroc", DZ: "Algérie", TN: "Tunisie",
};

function profileLabel(value: string): string {
  return profileLabels[value] || value;
}

function previewStatusLabel(result: PeptidesPreviewEmailResult): string {
  return result.status === "eligible"
    ? "Pré-sélection et devis disponibles"
    : "Profil prêt pour une analyse Peptides Engine personnalisée";
}

function previewNextStepLabel(): string {
  return "Acheter Peptides Engine";
}

export function buildPeptidesPreviewDestinationPath(_nextStep: string, medium: "result" | "email"): string {
  const source = medium === "email" ? "peptides_preview_email" : "peptides_preview";
  return `/peptides-engine?tier=solo&utm_source=${source}&utm_medium=${medium}&utm_campaign=pre_peptides_engine`;
}

export function buildPeptidesPreviewCopyReadyReply(
  input: PeptidesPreviewEmailInput,
  result: PeptidesPreviewEmailResult,
  destination: string,
): string {
  const objective = input.goalDetails.trim();
  const analysis = result.analysisPoints.map((point) => `• ${point}`).join("\n");
  const products = result.estimatedProtocolCostUsd == null ? "Finalisé dans Peptides Engine" : money(result.estimatedProtocolCostUsd);
  const shipping = result.estimatedShippingCostUsd == null ? "Finalisée dans Peptides Engine" : money(result.estimatedShippingCostUsd);
  const total = result.estimatedGrandTotalUsd == null ? "Finalisé dans Peptides Engine" : money(result.estimatedGrandTotalUsd);
  return `Bonjour ${input.firstName},

J’ai repris ton profil complet. Tu as indiqué : ${objective}

Ton estimation rapide

Nombre de molécules estimé : ${result.moleculeCount}
Durée estimée : ${result.durationLabel}
Produits : ${products}
Livraison : ${shipping}
Total rendu estimé : ${total}

Les noms des molécules et les dosages sont réservés à ton analyse Peptides Engine complète.

Ce que ton profil change dans l’analyse

${analysis}

Pourquoi débloquer Peptides Engine

${result.nextStepExplanation}

Cette estimation peut évoluer après l’achat de Peptides Engine, car l’analyse complète construit un protocole plus poussé et plus précis selon ton profil, puis finalise les quantités et la liste d’achat.

Accéder à Peptides Engine :
${destination}

Achzod
APEXLABS`;
}

export function buildPeptidesPreviewResultEmailContent(
  input: PeptidesPreviewEmailInput,
  result: PeptidesPreviewEmailResult,
  checkoutUrl: string,
  appUrlInput = "https://apexlabs.onrender.com",
): { subject: string; html: string; text: string } {
  const appUrl = appUrlInput.replace(/\/$/, "");
  const destination = checkoutUrl.startsWith("/") ? `${appUrl}${checkoutUrl}` : checkoutUrl;
  const totalLabel = result.estimatedGrandTotalUsd == null ? "estimation personnalisée" : money(result.estimatedGrandTotalUsd);
  const subject = `${input.firstName}, ton estimation Peptides Engine : ${result.moleculeCount} molécule${result.moleculeCount > 1 ? "s" : ""}, ${result.durationLabel}, ${totalLabel}`;
  const preheader = `Nombre de molécules, durée, produits, livraison et total rendu, puis accès direct à Peptides Engine.`;
  const objectiveCard = `<div style="margin-top:18px;padding:15px;border-radius:12px;background:#0b0c0e;border:1px solid #27292e;"><div style="font-size:10px;font-weight:900;letter-spacing:.14em;color:#888;">CE QUE TU NOUS AS INDIQUÉ</div><p style="margin:7px 0 0;font-size:13px;line-height:1.65;color:#ddd;">${escapeHtml(input.goalDetails.trim())}</p></div>`;
  const cta = `<a href="${escapeHtml(destination)}" style="display:block;margin-top:22px;padding:16px 20px;border-radius:999px;background:#f5b942;color:#08090b;text-align:center;text-decoration:none;font-weight:900;">Débloquer mon analyse Peptides Engine</a>`;
  const analysisHtml = result.analysisPoints.map((point) => `<li style="margin:0 0 8px;">${escapeHtml(point)}</li>`).join("");
  const value = (amount: number | null, fallback: string) => amount == null ? fallback : money(amount);
  const estimateBody = `<div style="margin-top:22px;padding:18px;border:1px solid #3d341c;border-radius:14px;background:#17140c;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">TON ESTIMATION RAPIDE</div><table style="width:100%;margin-top:9px;border-collapse:collapse;font-size:13px;"><tr><td style="padding:7px 0;color:#999;">Nombre de molécules</td><td style="padding:7px 0;text-align:right;font-weight:800;">${result.moleculeCount}</td></tr><tr><td style="padding:7px 0;color:#999;">Durée estimée</td><td style="padding:7px 0;text-align:right;font-weight:800;">${escapeHtml(result.durationLabel)}</td></tr><tr><td style="padding:7px 0;color:#999;">Produits</td><td style="padding:7px 0;text-align:right;font-weight:800;">${value(result.estimatedProtocolCostUsd, "Finalisé dans Peptides Engine")}</td></tr><tr><td style="padding:7px 0;color:#999;">Livraison</td><td style="padding:7px 0;text-align:right;font-weight:800;">${value(result.estimatedShippingCostUsd, "Finalisée dans Peptides Engine")}</td></tr><tr><td style="padding:11px 0 7px;border-top:1px solid #42391f;color:#fff;font-weight:800;">Total rendu estimé</td><td style="padding:11px 0 7px;border-top:1px solid #42391f;text-align:right;color:#f5b942;font-size:22px;font-weight:900;">${value(result.estimatedGrandTotalUsd, "Dans Peptides Engine")}</td></tr></table><p style="margin:12px 0 0;color:#aaa;font-size:12px;line-height:1.6;">Les noms des molécules et les dosages sont réservés à l’analyse complète.</p></div>`;
  const analysisCard = `<div style="margin-top:18px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">CE QUE TON PROFIL CHANGE DANS L’ANALYSE</div><ul style="margin:12px 0 0;padding-left:20px;color:#ddd;font-size:13px;line-height:1.65;">${analysisHtml}</ul></div>`;
  const precisionCard = `<div style="margin-top:18px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><strong style="color:#fff;">Un protocole plus poussé et plus précis après l’achat</strong><p style="margin:9px 0 0;color:#aaa;font-size:13px;line-height:1.7;">${escapeHtml(result.nextStepExplanation)}</p><p style="margin:9px 0 0;color:#ddd;font-size:13px;line-height:1.7;">Cette estimation peut évoluer après l’achat de Peptides Engine, lorsque l’analyse complète affine la sélection, le calendrier, les quantités et la liste d’achat selon ton profil.</p></div>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#08090b;color:#fff;font-family:Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div><div style="max-width:720px;margin:0 auto;padding:28px 14px;"><div style="font-size:17px;font-weight:900;letter-spacing:.16em;">APEX<span style="color:#f5b942;">LABS</span></div><div style="margin-top:24px;padding:28px;border:1px solid #292929;border-radius:20px;background:#101114;"><div style="font-size:11px;font-weight:800;letter-spacing:.16em;color:#f5b942;">TON RÉSULTAT PEPTIDES ENGINE</div><h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;color:#fff;">${escapeHtml(result.headline)}</h1>${objectiveCard}<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#bbb;">${escapeHtml(result.rationale)}</p>${estimateBody}${analysisCard}${precisionCard}${cta}</div></div></body></html>`;
  return { subject, html, text: buildPeptidesPreviewCopyReadyReply(input, result, destination) };
}

export function buildPeptidesPreviewAdminNotificationContent(
  input: PeptidesPreviewEmailInput,
  result: PeptidesPreviewEmailResult,
  leadId: string,
  clientEmailSent: boolean,
  appUrlInput = "https://apexlabs.onrender.com",
): { subject: string; html: string; text: string } {
  const appUrl = appUrlInput.replace(/\/$/, "");
  const path = buildPeptidesPreviewDestinationPath(result.nextStep, "email");
  const clientContent = buildPeptidesPreviewResultEmailContent(input, result, path, appUrl);
  const readyReply = clientContent.text;
  const copySubject = clientContent.subject;
  const profileRows: Array<[string, string]> = [
    ["Lead", `${input.firstName} · ${input.email}`], ["Profil", `${input.age} ans · ${input.weightKg} kg · ${input.heightCm} cm · ${profileLabel(input.sex)}`],
    ["Verdict", previewStatusLabel(result)], ["Prochaine étape", previewNextStepLabel()],
    ["Résultat du pré-calcul", result.molecules.length ? result.molecules.map((molecule) => molecule.name).join(" + ") : "Personnalisation complète dans Peptides Engine"],
    ["Décision expliquée", result.analysisPoints.join(" • ")],
    ["Objectif", `${profileLabel(input.primaryGoal)} · ${input.secondaryGoals.length ? input.secondaryGoals.map(profileLabel).join(", ") : "aucun objectif secondaire"}`], ["Détail exprimé", input.goalDetails],
    ["Horizon", profileLabel(input.timeline)], ["Santé", input.conditions.map(profileLabel).join(", ")], ["Bilan / tension / sommeil", `${profileLabel(input.bloodwork)} · ${profileLabel(input.bloodPressure)} · ${input.sleepHours} h`],
    ["Médicaments", input.medications], ["Allergies", input.allergies], ["Peptides actuels", input.currentPeptides], ["Peptides passés", input.pastPeptides],
    ["Injections / fréquence / froid", `${profileLabel(input.injectionComfort)} · ${profileLabel(input.injectionFrequency)} · ${profileLabel(input.refrigeration)}`], ["Budget total", `$${input.budgetTotalUsd.toFixed(2)}`],
    ["Pays / début", `${profileLabel(input.country)} · ${profileLabel(input.startWhen)}`],
    ["Devis rendu", result.estimatedGrandTotalUsd == null ? "Finalisé dans l’analyse Peptides Engine" : money(result.estimatedGrandTotalUsd)], ["Email automatique client", clientEmailSent ? "Envoyé" : "Non envoyé"],
  ];
  const htmlRows = profileRows.map(([label, value]) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#666;font-size:12px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#111;font-size:13px;font-weight:700;">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f4f2;font-family:Arial,sans-serif;color:#111;"><div style="max-width:760px;margin:0 auto;padding:24px 12px;"><div style="padding:25px;background:#111;color:#fff;border-radius:18px 18px 0 0;"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#f5b942;">APEXLABS · LEAD PRÉ PEPTIDES</div><h1 style="margin:10px 0 0;font-size:25px;">${escapeHtml(input.firstName)} · ${escapeHtml(previewStatusLabel(result))}</h1><p style="margin:10px 0 0;color:#bbb;">Verdict, état de l’email client et réponse prête à copier sont réunis ci-dessous.</p></div><div style="padding:22px;background:#fff;border:1px solid #ddd;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">${htmlRows}</table></div><div style="padding:22px;background:#fff;border:1px solid #ddd;border-top:0;"><div style="font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">OBJET À COPIER</div><div style="margin-top:8px;padding:13px;border-radius:10px;background:#fff7df;border:1px solid #ead59a;font-weight:800;">${escapeHtml(copySubject)}</div><div style="margin-top:20px;font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">MAIL PRÊT À COPIER COLLER</div><div style="margin-top:8px;padding:18px;border-radius:12px;background:#f6f7f5;border:1px solid #dfe2dc;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.65;color:#171717;">${escapeHtml(readyReply)}</div><p style="margin:16px 0 0;color:#777;font-size:11px;">Lead ID : ${escapeHtml(leadId)}. ${result.status === "eligible" ? "Le profil, la logique de sélection, les calculs, le devis et le CTA sont inclus." : "Le profil, les axes de personnalisation et le CTA d’achat Peptides Engine sont inclus."}</p></div></div></body></html>`;
  const text = `Nouveau lead Pré Peptides\n\nVerdict : ${previewStatusLabel(result)}\nProchaine étape : ${previewNextStepLabel()}\nEmail automatique client : ${clientEmailSent ? "Envoyé" : "Non envoyé"}\n\nObjet à copier :\n${copySubject}\n\nMAIL PRÊT À COPIER COLLER\n\n${readyReply}\n\nLead ID: ${leadId}`;
  const subject = result.status === "eligible"
    ? `[APEXLABS] Lead prêt à convertir · ${input.firstName} · ${money(result.estimatedGrandTotalUsd)}`
    : `[APEXLABS] Lead Peptides Engine · ${input.firstName} · ${result.estimatedGrandTotalUsd == null ? "Conversion directe" : money(result.estimatedGrandTotalUsd)}`;
  return { subject, html, text };
}
