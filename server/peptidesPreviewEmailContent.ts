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
    route?: "subcutaneous" | "intranasal";
    protocolBasis?: string;
    openingWindowDays?: number;
    calculationBasis: string;
    totalRequiredMg: number;
    bufferedRequiredMg?: number;
    purchasedCapacityMg?: number;
    reserveCapacityMg?: number;
    vialStrengthMg: number;
    mathematicalVials: number;
    operationalVials: number;
    safetyReserveVials: number;
    vialsRequired: number;
    vialsPurchased: number;
    packageCount: number;
    purchaseLines?: Array<{ format: string; boxSize: number; packageCount: number; deliveredVials: number; packagePriceUsd: number; totalPriceUsd: number; productUrl: string }>;
    estimatedTotalPriceUsd: number;
  }>;
  moleculeQuotes?: Array<{
    label: string;
    family: string;
    role: string;
    activeDurationWeeks: number;
    estimatedTotalPriceUsd: number;
  }>;
  effectTimeline?: Array<{ week: number; title: string; effects: string[] }>;
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
  "4-6": "Douze semaines minimum", "8-12": "Douze semaines minimum", "12plus": "Douze semaines minimum",
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
  const quoteLines = (result.moleculeQuotes || []).map((line) => `${line.label} · ${line.family} · ${line.role} · ${line.activeDurationWeeks} semaines actives : ${money(line.estimatedTotalPriceUsd)}`).join("\n");
  const weeklyEffects = (result.effectTimeline || []).map((entry) => `Semaine ${entry.week} · ${entry.title}\n${entry.effects.map((effect) => `• ${effect}`).join("\n")}`).join("\n\n");
  const quoteBlock = quoteLines ? `\nDevis détaillé par molécule\n\n${quoteLines}\n` : "";
  const timelineBlock = weeklyEffects ? `\nProjection des effets positifs semaine après semaine\n\n${weeklyEffects}\n` : "";
  return `Bonjour ${input.firstName},

J’ai repris ton profil complet. Tu as indiqué : ${objective}

Ton estimation rapide

Nombre de molécules estimé : ${result.moleculeCount}
Durée de la stratégie : ${result.durationLabel}
Produits : ${products}
Livraison (une seule fois pour la commande complète) : ${shipping}
Total rendu estimé : ${total}
${quoteBlock}${timelineBlock}
Les familles, le vrai nombre de molécules, leur prix individuel, la durée et le total rendu sont visibles. Les noms exacts, les dosages, les unités, les fréquences, la reconstitution et les liens d’achat restent réservés à ton analyse Peptides Engine complète. Le calcul ajoute une réserve adaptée au rythme réel, puis compare les unités, les boîtes de 10 et les paliers disponibles sans étirer un contenant ouvert sur plusieurs mois. La livraison est comptée une seule fois pour la commande complète.

Ce que ton profil change dans l’analyse

${analysis}

Pourquoi débloquer Peptides Engine

${result.nextStepExplanation}

Ce qui est déjà sécurisé

• Toutes tes réponses sont enregistrées avec cette estimation et réutilisées dans Peptides Engine.
• Le devis couvre les phases actives affichées, les quantités achetables et une seule livraison pour la commande complète.
• Les noms, les dosages et les liens fournisseur restent confidentiels dans cet aperçu gratuit.

Ce que Peptides Engine débloque pour 199 €

• La sélection nominative et la raison précise de chaque molécule.
• Le calendrier semaine par semaine, la progression et les ajustements liés à ton profil.
• La reconstitution, les unités par administration et les consignes d’exécution.
• La liste d’achat finale avec les quantités et les liens exacts.
• Le filtrage des options incompatibles avec tes réponses, au lieu d’un stack générique.

Tu ne rempliras pas un second questionnaire : les réponses déjà fournies constituent le point de départ de l’analyse complète. Le protocole plus poussé et plus précis pourra faire évoluer la sélection uniquement si Peptides Engine filtre ou remplace un axe selon ton profil, jamais pour ajouter après coup une livraison ou une partie oubliée au devis.

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
  const publicQuotesHtml = (result.moleculeQuotes || []).map((line) => `<div style="margin-top:10px;padding:13px;border-radius:11px;background:#0b0c0e;border:1px solid #302a1b;"><table style="width:100%;border-collapse:collapse;"><tr><td style="color:#fff;font-size:14px;font-weight:800;">${escapeHtml(line.label)}</td><td style="text-align:right;color:#fff;font-size:16px;font-weight:900;">${money(line.estimatedTotalPriceUsd)}</td></tr></table><div style="margin-top:5px;color:#f5b942;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(line.family)}</div><div style="margin-top:6px;color:#bbb;font-size:12px;line-height:1.55;">${escapeHtml(line.role)} · ${line.activeDurationWeeks} semaines actives</div></div>`).join("");
  const timelineHtml = (result.effectTimeline || []).map((entry) => `<div style="margin-top:10px;padding:13px;border-radius:11px;background:#0b0c0e;border:1px solid #18392e;"><div style="color:#6ee7b7;font-size:11px;font-weight:900;letter-spacing:.08em;">SEMAINE ${entry.week} · ${escapeHtml(entry.title.toUpperCase())}</div><ul style="margin:8px 0 0;padding-left:18px;color:#ccc;font-size:12px;line-height:1.6;">${entry.effects.map((effect) => `<li style="margin-bottom:5px;">${escapeHtml(effect)}</li>`).join("")}</ul></div>`).join("");
  const estimateBody = `<div style="margin-top:22px;padding:18px;border:1px solid #3d341c;border-radius:14px;background:#17140c;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">TON ESTIMATION RAPIDE</div><table style="width:100%;margin-top:9px;border-collapse:collapse;font-size:13px;"><tr><td style="padding:7px 0;color:#999;">Nombre de molécules</td><td style="padding:7px 0;text-align:right;font-weight:800;">${result.moleculeCount}</td></tr><tr><td style="padding:7px 0;color:#999;">Durée de la stratégie</td><td style="padding:7px 0;text-align:right;font-weight:800;">${escapeHtml(result.durationLabel)}</td></tr><tr><td style="padding:7px 0;color:#999;">Produits</td><td style="padding:7px 0;text-align:right;font-weight:800;">${value(result.estimatedProtocolCostUsd, "Finalisé dans Peptides Engine")}</td></tr><tr><td style="padding:7px 0;color:#999;">Livraison · une seule fois</td><td style="padding:7px 0;text-align:right;font-weight:800;">${value(result.estimatedShippingCostUsd, "Finalisée dans Peptides Engine")}</td></tr><tr><td style="padding:11px 0 7px;border-top:1px solid #42391f;color:#fff;font-weight:800;">Total rendu estimé</td><td style="padding:11px 0 7px;border-top:1px solid #42391f;text-align:right;color:#f5b942;font-size:22px;font-weight:900;">${value(result.estimatedGrandTotalUsd, "Dans Peptides Engine")}</td></tr></table><p style="margin:12px 0 0;color:#aaa;font-size:12px;line-height:1.6;">Les noms des molécules et les dosages sont réservés à l’analyse complète. La durée distingue la fenêtre stratégique des semaines réellement actives. Le prix couvre toutes les phases actives affichées, ajoute une réserve adaptée au rythme réel, puis compare les unités, les boîtes de 10 et les paliers disponibles. Un contenant ouvert n’est jamais étiré artificiellement sur plusieurs mois et la livraison est comptée une seule fois pour la commande complète.</p></div>`;
  const publicDetailBody = `<div style="margin-top:18px;padding:18px;border-radius:14px;background:#101114;border:1px solid #292929;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">DEVIS PAR MOLÉCULE · NOMS MASQUÉS</div>${publicQuotesHtml}<p style="margin:13px 0 0;color:#999;font-size:11px;line-height:1.6;">Chaque ligne correspond à une molécule réellement calculée. La famille, la fonction, la durée active et le coût sont visibles ; le nom et le dosage restent réservés à Peptides Engine.</p></div><div style="margin-top:18px;padding:18px;border-radius:14px;background:#0d1713;border:1px solid #18392e;"><div style="font-size:11px;letter-spacing:.12em;color:#6ee7b7;font-weight:800;">EFFETS POSITIFS ATTENDUS · SEMAINE APRÈS SEMAINE</div>${timelineHtml}<p style="margin:13px 0 0;color:#82958d;font-size:11px;line-height:1.6;">Projection construite à partir des familles réellement retenues, sans révéler les molécules ni le protocole d’exécution.</p></div>`;
  const reassuranceBody = `<div style="margin-top:20px;padding:18px;border-radius:14px;background:#f7f8f5;border:1px solid #dfe3dc;"><div style="font-size:11px;letter-spacing:.12em;color:#796018;font-weight:900;">TOUTES TES RÉPONSES SONT ENREGISTRÉES</div><p style="margin:10px 0 0;color:#333;font-size:13px;line-height:1.65;">Tu ne rempliras pas un second questionnaire. Ton profil, tes objectifs, tes contraintes, ton historique, ton budget et cette estimation sont réutilisés dans Peptides Engine.</p><div style="margin-top:16px;"><a href="${escapeHtml(destination)}" style="display:inline-block;background:#f5b942;color:#111;text-decoration:none;font-size:14px;font-weight:900;padding:13px 18px;border-radius:10px;">Voir mon analyse complète · 199 €</a></div><div style="margin-top:16px;font-size:11px;letter-spacing:.12em;color:#796018;font-weight:900;">CE QUE PEPTIDES ENGINE DÉBLOQUE POUR 199 €</div><p style="margin:10px 0 0;color:#333;font-size:13px;line-height:1.7;">1. La sélection nominative et la raison de chaque molécule.<br>2. Le calendrier semaine par semaine et les ajustements liés à ton profil.<br>3. La reconstitution et les unités par administration.<br>4. La liste d’achat finale avec quantités et liens exacts.<br>5. Le filtrage des options incompatibles, au lieu d’un stack générique.</p><p style="margin:14px 0 0;padding-top:13px;border-top:1px solid #dde1da;color:#555;font-size:12px;line-height:1.6;">Le devis gratuit couvre déjà les phases actives, les quantités achetables et une seule livraison. Le protocole plus poussé et plus précis pourra faire évoluer la sélection uniquement si l’analyse complète filtre ou remplace un axe selon ton profil, jamais pour ajouter une partie oubliée après l’achat.</p></div>`;
  const analysisCard = `<div style="margin-top:18px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">CE QUE TON PROFIL CHANGE DANS L’ANALYSE</div><ul style="margin:12px 0 0;padding-left:20px;color:#ddd;font-size:13px;line-height:1.65;">${analysisHtml}</ul></div>`;
  const precisionCard = `<div style="margin-top:18px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><strong style="color:#fff;">Un protocole plus poussé et plus précis après l’achat</strong><p style="margin:9px 0 0;color:#aaa;font-size:13px;line-height:1.7;">${escapeHtml(result.nextStepExplanation)}</p><p style="margin:9px 0 0;color:#ddd;font-size:13px;line-height:1.7;">Cette estimation peut évoluer après l’achat de Peptides Engine, lorsque l’analyse complète affine la sélection, le calendrier, les quantités et la liste d’achat selon ton profil.</p></div>`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#08090b;color:#fff;font-family:Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div><div style="max-width:720px;margin:0 auto;padding:28px 14px;"><div style="font-size:17px;font-weight:900;letter-spacing:.16em;">APEX<span style="color:#f5b942;">LABS</span></div><div style="margin-top:24px;padding:28px;border:1px solid #292929;border-radius:20px;background:#101114;"><div style="font-size:11px;font-weight:800;letter-spacing:.16em;color:#f5b942;">TON RÉSULTAT PEPTIDES ENGINE</div><h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;color:#fff;">${escapeHtml(result.headline)}</h1>${objectiveCard}<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#bbb;">${escapeHtml(result.rationale)}</p>${estimateBody}${publicDetailBody}${reassuranceBody}${analysisCard}${precisionCard}${cta}</div></div></body></html>`;
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
  const internalProtocol = result.molecules.length
    ? result.molecules.map((molecule, index) => [
        `${index + 1}. ${molecule.name} — ${molecule.doseSummary}`,
        `Voie ${molecule.route ?? "à vérifier"} · règle de dose : ${molecule.protocolBasis ?? "à vérifier"} · fenêtre opérationnelle maximale après ouverture/reconstitution : ${molecule.openingWindowDays ?? "à vérifier"} jours`,
        molecule.calculationBasis,
        `Besoin actif ${molecule.totalRequiredMg} mg · cible de réserve ${molecule.bufferedRequiredMg ?? "—"} mg · capacité achetée ${molecule.purchasedCapacityMg ?? "—"} mg · réserve réelle ${molecule.reserveCapacityMg ?? "—"} mg · fiole ${molecule.vialStrengthMg} mg · ${molecule.mathematicalVials} fiole(s) mathématiques · ${molecule.operationalVials} opérationnelle(s) · ${molecule.vialsRequired} minimum à couvrir · ${molecule.vialsPurchased} achetée(s) · ${molecule.packageCount} boîte(s) · ${money(molecule.estimatedTotalPriceUsd)}`,
        molecule.purchaseLines?.length ? `Panier exact : ${molecule.purchaseLines.map((line) => `${line.packageCount} × boîte de ${line.boxSize} (${line.deliveredVials} fioles, ${money(line.totalPriceUsd)})`).join(" + ")}` : "",
      ].filter(Boolean).join(" | ")).join("\n")
    : "Calcul indisponible";
  const shippingDetail = result.shippingBreakdown.length
    ? result.shippingBreakdown.map((line, index) => `Expédition ${index + 1} : ${money(line.subtotalUsd)} de produits + ${money(line.shippingUsd)} de livraison · ${line.speed}`).join("\n")
    : "Livraison non chiffrée";
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
    ["Calcul interne dosage → fioles → prix", internalProtocol],
    ["Total fioles / boîtes", `${result.totalVialsRequired ?? "—"} à commander réserve incluse · ${result.totalVialsPurchased ?? "—"} achetées après arrondi · ${result.totalPackages ?? "—"} boîtes`],
    ["Produits", money(result.estimatedProtocolCostUsd)], ["Livraison selon pays", `${money(result.estimatedShippingCostUsd)}\n${shippingDetail}`],
    ["Total rendu", result.estimatedGrandTotalUsd == null ? "Finalisé dans l’analyse Peptides Engine" : money(result.estimatedGrandTotalUsd)], ["Email automatique client", clientEmailSent ? "Envoyé" : "Non envoyé"],
  ];
  const htmlRows = profileRows.map(([label, value]) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#666;font-size:12px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#111;font-size:13px;font-weight:700;">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f4f2;font-family:Arial,sans-serif;color:#111;"><div style="max-width:760px;margin:0 auto;padding:24px 12px;"><div style="padding:25px;background:#111;color:#fff;border-radius:18px 18px 0 0;"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#f5b942;">APEXLABS · LEAD PRÉ PEPTIDES</div><h1 style="margin:10px 0 0;font-size:25px;">${escapeHtml(input.firstName)} · ${escapeHtml(previewStatusLabel(result))}</h1><p style="margin:10px 0 0;color:#bbb;">Verdict, état de l’email client et réponse prête à copier sont réunis ci-dessous.</p></div><div style="padding:22px;background:#fff;border:1px solid #ddd;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">${htmlRows}</table></div><div style="padding:22px;background:#fff;border:1px solid #ddd;border-top:0;"><div style="font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">OBJET À COPIER</div><div style="margin-top:8px;padding:13px;border-radius:10px;background:#fff7df;border:1px solid #ead59a;font-weight:800;">${escapeHtml(copySubject)}</div><div style="margin-top:20px;font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">MAIL PRÊT À COPIER COLLER</div><div style="margin-top:8px;padding:18px;border-radius:12px;background:#f6f7f5;border:1px solid #dfe2dc;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.65;color:#171717;">${escapeHtml(readyReply)}</div><p style="margin:16px 0 0;color:#777;font-size:11px;">Lead ID : ${escapeHtml(leadId)}. ${result.status === "eligible" ? "Le profil, la logique de sélection, les calculs, le devis et le CTA sont inclus." : "Le profil, les axes de personnalisation et le CTA d’achat Peptides Engine sont inclus."}</p></div></div></body></html>`;
  const text = `Nouveau lead Pré Peptides\n\nVerdict : ${previewStatusLabel(result)}\nProchaine étape : ${previewNextStepLabel()}\nEmail automatique client : ${clientEmailSent ? "Envoyé" : "Non envoyé"}\n\nObjet à copier :\n${copySubject}\n\nMAIL PRÊT À COPIER COLLER\n\n${readyReply}\n\nLead ID: ${leadId}`;
  const subject = result.status === "eligible"
    ? `[APEXLABS] Lead prêt à convertir · ${input.firstName} · ${money(result.estimatedGrandTotalUsd)}`
    : `[APEXLABS] Lead Peptides Engine · ${input.firstName} · ${result.estimatedGrandTotalUsd == null ? "Conversion directe" : money(result.estimatedGrandTotalUsd)}`;
  return { subject, html, text };
}
