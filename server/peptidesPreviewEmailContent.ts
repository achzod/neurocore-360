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
  headline: string;
  rationale: string;
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

function previewStatusLabel(result: PeptidesPreviewEmailResult): string {
  if (result.status === "eligible") return "Pré-sélection et devis disponibles";
  if (result.nextStep === "blood_analysis") return "Bilan biologique requis avant sélection";
  return "Revue personnalisée requise avant sélection";
}

function previewNextStepLabel(result: PeptidesPreviewEmailResult): string {
  if (result.nextStep === "blood_analysis") return "Vérifier les marqueurs avec Blood Analysis";
  if (result.nextStep === "manual_review") return "Faire valider la sélection individuellement";
  return "Débloquer le protocole Peptides Engine complet";
}

function describePreviewBlocker(blocker: string): string {
  const labels: Record<string, string> = {
    bilan_hormonal_recent_requis: "Un bilan hormonal récent est nécessaire pour éviter une sélection fondée sur des suppositions.",
    medicaments_a_integrer: "Le traitement actuellement déclaré doit être intégré avant de confirmer une molécule, un dosage ou un devis.",
    stack_actuel_a_revoir: "Le stack actuel doit être revu pour éviter doublons et incompatibilités.",
    frequence_incompatible: "La fréquence d’administration acceptée n’est pas compatible avec la présélection envisagée.",
    stockage_incompatible: "Les conditions de stockage déclarées ne permettent pas de confirmer la présélection en sécurité.",
    injection_refusee: "Le refus d’injection impose une sélection adaptée avant tout chiffrage.",
  };
  return labels[blocker] || blocker.replace(/_/g, " ");
}

function previewBlockerText(result: PeptidesPreviewEmailResult): string {
  return result.blockers.length
    ? result.blockers.map((blocker) => `- ${describePreviewBlocker(blocker)}`).join("\n")
    : "- Une réponse du profil modifie directement la compatibilité ou le chiffrage.";
}

function previewDestinationPath(nextStep: string, medium: "result" | "email"): string {
  const source = medium === "email" ? "peptides_preview_admin" : "peptides_preview";
  if (nextStep === "blood_analysis") {
    return `/offers/blood-analysis?utm_source=${source}&utm_medium=${medium}&utm_campaign=pre_peptides_engine`;
  }
  if (nextStep === "peptides_engine") {
    return `/peptides-engine?tier=solo&utm_source=${source}&utm_medium=${medium}&utm_campaign=pre_peptides_engine`;
  }
  return `/offers/peptides-engine?utm_source=${source}&utm_medium=${medium}&utm_campaign=pre_peptides_engine#offres`;
}

function buildPeptidesPreviewSummaryRows(result: PeptidesPreviewEmailResult): string {
  if (result.molecules.length === 0) {
    return `<div style="padding:18px;border:1px solid #385343;border-radius:14px;background:#101914;color:#d7e7d8;line-height:1.65;">Une réponse du profil change directement la compatibilité, la sélection ou le chiffrage. Le moteur a suspendu le devis plutôt que d’afficher un dosage ou un prix incomplet.</div>`;
  }
  return result.molecules.map((molecule, index) => `
    <div style="margin:0 0 14px;padding:19px;border:1px solid #2b2b2b;border-radius:14px;background:#111;">
      <div style="font-size:11px;letter-spacing:.16em;color:#f5b942;">0${index + 1} · ${escapeHtml(molecule.role)}</div>
      <div style="margin-top:5px;font-size:21px;font-weight:800;color:#fff;">${escapeHtml(molecule.name)}</div>
      <div style="margin-top:11px;padding:12px;border-radius:10px;background:#17150d;border:1px solid #3c3218;font-size:13px;line-height:1.65;color:#ddd;"><strong style="color:#f5b942;">Pourquoi</strong><br>${escapeHtml(molecule.reason)}</div>
      <div style="margin-top:12px;padding:13px;border-radius:10px;background:#0a0b0d;border:1px solid #24262a;font-size:12px;line-height:1.7;color:#aaa;">
        <strong style="color:#fff;">Dose de référence :</strong> ${escapeHtml(molecule.doseSummary)}<br>
        <strong style="color:#fff;">Durée :</strong> ${escapeHtml(molecule.cycleDurationLabel)}, ${molecule.administrationCount} administrations<br>
        <strong style="color:#fff;">Calcul :</strong> ${escapeHtml(molecule.calculationBasis)}<br>
        <strong style="color:#fff;">Quantité :</strong> ${molecule.totalRequiredMg} mg, minimum mathématique ${molecule.mathematicalVials} fioles, achat opérationnel ${molecule.operationalVials} fioles<br>
        <strong style="color:#fff;">Commande :</strong> ${molecule.packageCount} boîte${molecule.packageCount > 1 ? "s" : ""} × ${money(molecule.startingPackagePriceUsd)} = <strong style="color:#f5b942;">${money(molecule.estimatedTotalPriceUsd)}</strong><br>
        <strong style="color:#fff;">Format :</strong> ${escapeHtml(molecule.startingFormat)}, ${molecule.vialsPurchased} fioles reçues via l’offre livrable optimisée
      </div>
    </div>`).join("");
}

function buildShippingRows(result: PeptidesPreviewEmailResult): string {
  return result.shippingBreakdown.map((line, index) => `<tr><td style="padding:9px 10px;border-bottom:1px solid #282828;color:#ddd;">Expédition ${index + 1}</td><td style="padding:9px 10px;border-bottom:1px solid #282828;color:#bbb;">${money(line.subtotalUsd)} produits</td><td style="padding:9px 10px;border-bottom:1px solid #282828;color:#bbb;">${money(line.shippingUsd)} livraison</td><td style="padding:9px 10px;border-bottom:1px solid #282828;color:#888;">${escapeHtml(line.speed || "Délai non indiqué")}</td></tr>`).join("");
}

export function buildPeptidesPreviewCopyReadyReply(
  input: PeptidesPreviewEmailInput,
  result: PeptidesPreviewEmailResult,
  destination: string,
): string {
  const objective = input.goalDetails.trim();
  if (result.status === "review_required") {
    const nextStep = result.nextStep === "blood_analysis"
      ? "La prochaine étape utile est de vérifier tes marqueurs avant toute recommandation. Blood Analysis permet d’éviter de choisir à l’aveugle, puis de construire la stratégie à partir de données récentes."
      : "La prochaine étape utile est une validation individualisée de ton profil. Elle permettra d’intégrer la variable bloquante avant de confirmer la sélection, les quantités et le budget.";
    return `Bonjour ${input.firstName},

J’ai repris ton profil complet, pas seulement ton objectif principal. Tu as indiqué : ${objective}

Mon analyse

${result.rationale}

Pourquoi je ne t’envoie pas un faux devis

${previewBlockerText(result)}

Dans ton cas, afficher une molécule, un dosage ou un prix maintenant donnerait une précision trompeuse. La présélection et le devis sont donc volontairement suspendus jusqu’à validation de ce point.

La prochaine étape

${nextStep}

Continuer ici :
${destination}

Une recommandation utile doit être adaptée à tes données, compatible avec ton profil et chiffrée complètement — pas remplie automatiquement pour faire joli.

Achzod
APEXLABS`;
  }

  const moleculeText = result.molecules.map((molecule, index) => [
    `${index + 1}. ${molecule.name} · ${molecule.role}`,
    `Pourquoi : ${molecule.reason}`,
    `Dose de référence : ${molecule.doseSummary}.`,
    `Durée : ${molecule.cycleDurationLabel}, soit ${molecule.administrationCount} administrations.`,
    `Calcul complet : ${molecule.calculationBasis}.`,
    `Besoin : ${molecule.totalRequiredMg} mg. Minimum mathématique : ${molecule.mathematicalVials} fioles. Quantité opérationnelle retenue : ${molecule.operationalVials} fioles.`,
    `Commande : ${molecule.packageCount} boîte${molecule.packageCount > 1 ? "s" : ""} × ${money(molecule.startingPackagePriceUsd)} = ${money(molecule.estimatedTotalPriceUsd)}. Format ${molecule.startingFormat}, ${molecule.vialsPurchased} fioles reçues via l’offre livrable optimisée.`,
  ].join("\n")).join("\n\n");
  const shipping = result.shippingBreakdown.map((line, index) => `Expédition ${index + 1} : ${money(line.subtotalUsd)} de produits + ${money(line.shippingUsd)} de livraison, ${line.speed || "délai non indiqué"}`).join("\n");
  return `Bonjour ${input.firstName},

J’ai repris ton profil complet, pas seulement ton objectif principal. Tu as indiqué : ${objective}

Ma recommandation préliminaire

${result.rationale}

${moleculeText}

Ton devis estimatif complet

Produits : ${money(result.estimatedProtocolCostUsd)}
Livraison : ${money(result.estimatedShippingCostUsd)}
Total rendu estimé : ${money(result.estimatedGrandTotalUsd)}
Équivalent par période de quatre semaines : ${money(result.monthlyEquivalentUsd)}

Détail livraison
${shipping}

${result.budgetExplanation}

Pourquoi passer par Peptides Engine

Le pré calcul te montre déjà la logique, mais le rapport complet va beaucoup plus loin : il tranche les ajustements selon tes réponses, construit le calendrier semaine par semaine, vérifie les incompatibilités, détaille la reconstitution et les unités, puis te donne la liste d’achat finale sans quantité manquante ni dépense cachée.

Tu peux débloquer ton analyse complète ici :
${destination}

Tu ne paies pas pour un tableau de molécules. Tu paies pour éviter un stack générique, un mauvais nombre de fioles et un budget sous estimé.

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
  const subject = result.status === "eligible"
    ? `${input.firstName}, ta recommandation Peptides Engine et ton devis complet`
    : result.nextStep === "blood_analysis"
      ? `${input.firstName}, les marqueurs à vérifier avant ta recommandation`
      : `${input.firstName}, une validation est nécessaire avant ta recommandation`;
  const preheader = result.status === "eligible"
    ? "Ta recommandation, ses calculs, la livraison et le devis complet pour ton profil."
    : "Ton résultat personnalisé, la raison de la revue et la prochaine étape utile.";
  const objectiveCard = `<div style="margin-top:18px;padding:15px;border-radius:12px;background:#0b0c0e;border:1px solid #27292e;"><div style="font-size:10px;font-weight:900;letter-spacing:.14em;color:#888;">CE QUE TU NOUS AS INDIQUÉ</div><p style="margin:7px 0 0;font-size:13px;line-height:1.65;color:#ddd;">${escapeHtml(input.goalDetails.trim())}</p></div>`;
  const ctaLabel = result.nextStep === "blood_analysis" ? "Vérifier mes marqueurs" : result.nextStep === "manual_review" ? "Obtenir ma validation personnalisée" : "Débloquer mon protocole complet";
  const cta = `<a href="${escapeHtml(destination)}" style="display:block;margin-top:22px;padding:16px 20px;border-radius:999px;background:#f5b942;color:#08090b;text-align:center;text-decoration:none;font-weight:900;">${ctaLabel}</a>`;
  const eligibleBody = `<div style="margin-top:24px;">${buildPeptidesPreviewSummaryRows(result)}</div><div style="margin-top:20px;padding:18px;border:1px solid #3d341c;border-radius:14px;background:#17140c;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">DEVIS COMPLET ESTIMÉ</div><table style="width:100%;margin-top:8px;border-collapse:collapse;font-size:13px;"><tr><td style="padding:7px 0;color:#999;">Produits</td><td style="padding:7px 0;text-align:right;font-weight:800;">${money(result.estimatedProtocolCostUsd)}</td></tr><tr><td style="padding:7px 0;color:#999;">Livraison</td><td style="padding:7px 0;text-align:right;font-weight:800;">${money(result.estimatedShippingCostUsd)}</td></tr><tr><td style="padding:10px 0 7px;border-top:1px solid #42391f;color:#fff;font-weight:800;">Total rendu estimé</td><td style="padding:10px 0 7px;border-top:1px solid #42391f;text-align:right;color:#f5b942;font-size:22px;font-weight:900;">${money(result.estimatedGrandTotalUsd)}</td></tr><tr><td style="padding:7px 0;color:#999;">Équivalent quatre semaines</td><td style="padding:7px 0;text-align:right;font-weight:800;">${money(result.monthlyEquivalentUsd)}</td></tr></table></div>${result.shippingBreakdown.length ? `<div style="margin-top:14px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">${buildShippingRows(result)}</table></div>` : ""}<div style="margin-top:14px;padding:13px 15px;border:1px solid ${result.budgetFit === "above" ? "#5a461d" : "#244b38"};border-radius:12px;background:${result.budgetFit === "above" ? "#1c170c" : "#0d1812"};font-size:13px;line-height:1.6;color:${result.budgetFit === "above" ? "#f5cf7a" : "#9ee0b8"};">${escapeHtml(result.budgetExplanation)}</div><div style="margin-top:22px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><strong style="color:#fff;">Ce que débloque l’analyse complète</strong><p style="margin:9px 0 0;color:#aaa;font-size:13px;line-height:1.7;">Le calendrier semaine par semaine, les ajustements liés à ton historique, les incompatibilités, la reconstitution, les unités et la liste d’achat finale. L’objectif est d’éviter un stack générique, une quantité manquante ou un budget sous estimé.</p></div>${cta}`;
  const blockerHtml = result.blockers.length
    ? result.blockers.map((blocker) => `<li style="margin:0 0 8px;">${escapeHtml(describePreviewBlocker(blocker))}</li>`).join("")
    : `<li>Une réponse du profil modifie directement la compatibilité ou le chiffrage.</li>`;
  const nextStepText = result.nextStep === "blood_analysis"
    ? "Vérifie d’abord tes marqueurs avec Blood Analysis. La recommandation pourra ensuite être construite sur des données récentes plutôt que sur des suppositions."
    : "Fais valider ton profil individuellement afin d’intégrer la variable bloquante avant de confirmer la sélection, les quantités et le budget.";
  const reviewBody = `<div style="margin-top:24px;padding:18px;border:1px solid #4b3b1c;border-radius:14px;background:#18140c;"><div style="font-size:11px;letter-spacing:.12em;color:#f5b942;font-weight:800;">POURQUOI LE DEVIS EST SUSPENDU</div><ul style="margin:12px 0 0;padding-left:20px;color:#ddd;font-size:13px;line-height:1.65;">${blockerHtml}</ul><p style="margin:12px 0 0;color:#aaa;font-size:13px;line-height:1.65;">Afficher une molécule, un dosage ou un prix maintenant donnerait une précision trompeuse. Aucun faux devis n’est donc affiché.</p></div><div style="margin-top:18px;padding:18px;border-radius:14px;background:#0b0c0e;border:1px solid #27292e;"><strong style="color:#fff;">Ta prochaine étape</strong><p style="margin:9px 0 0;color:#aaa;font-size:13px;line-height:1.7;">${escapeHtml(nextStepText)}</p></div>${cta}`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#08090b;color:#fff;font-family:Arial,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div><div style="max-width:720px;margin:0 auto;padding:28px 14px;"><div style="font-size:17px;font-weight:900;letter-spacing:.16em;">APEX<span style="color:#f5b942;">LABS</span></div><div style="margin-top:24px;padding:28px;border:1px solid #292929;border-radius:20px;background:#101114;"><div style="font-size:11px;font-weight:800;letter-spacing:.16em;color:#f5b942;">TON RÉSULTAT PEPTIDES ENGINE</div><h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;color:#fff;">${escapeHtml(result.headline)}</h1>${objectiveCard}<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#bbb;">${escapeHtml(result.rationale)}</p>${result.status === "eligible" ? eligibleBody : reviewBody}</div></div></body></html>`;
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
  const path = previewDestinationPath(result.nextStep, "result");
  const clientContent = buildPeptidesPreviewResultEmailContent(input, result, path, appUrl);
  const readyReply = clientContent.text;
  const copySubject = clientContent.subject;
  const profileRows: Array<[string, string]> = [
    ["Lead", `${input.firstName} · ${input.email}`], ["Profil", `${input.age} ans · ${input.weightKg} kg · ${input.heightCm} cm · ${input.sex}`],
    ["Verdict", previewStatusLabel(result)], ["Prochaine étape", previewNextStepLabel(result)],
    ["Recommandation", result.molecules.length ? result.molecules.map((molecule) => molecule.name).join(" + ") : "Aucune molécule affichée tant que la revue n’est pas terminée"],
    ["Blocage", result.blockers.length ? result.blockers.map(describePreviewBlocker).join(" ") : "Aucun"],
    ["Objectif", `${input.primaryGoal} · ${input.secondaryGoals.join(", ") || "aucun secondaire"}`], ["Détail exprimé", input.goalDetails],
    ["Horizon", input.timeline], ["Santé", input.conditions.join(", ")], ["Bilan / tension / sommeil", `${input.bloodwork} · ${input.bloodPressure} · ${input.sleepHours} h`],
    ["Médicaments", input.medications], ["Allergies", input.allergies], ["Peptides actuels", input.currentPeptides], ["Peptides passés", input.pastPeptides],
    ["Injections / fréquence / froid", `${input.injectionComfort} · ${input.injectionFrequency} · ${input.refrigeration}`], ["Budget total", `$${input.budgetTotalUsd.toFixed(2)}`],
    ["Devis rendu", result.status === "eligible" ? money(result.estimatedGrandTotalUsd) : "Suspendu — aucune estimation partielle"], ["Email automatique client", clientEmailSent ? "Envoyé" : "Non envoyé"],
  ];
  const htmlRows = profileRows.map(([label, value]) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#666;font-size:12px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:9px 12px;border-bottom:1px solid #ececec;color:#111;font-size:13px;font-weight:700;">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f4f2;font-family:Arial,sans-serif;color:#111;"><div style="max-width:760px;margin:0 auto;padding:24px 12px;"><div style="padding:25px;background:#111;color:#fff;border-radius:18px 18px 0 0;"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#f5b942;">APEXLABS · LEAD PRÉ PEPTIDES</div><h1 style="margin:10px 0 0;font-size:25px;">${escapeHtml(input.firstName)} · ${escapeHtml(previewStatusLabel(result))}</h1><p style="margin:10px 0 0;color:#bbb;">Verdict, état de l’email client et réponse prête à copier sont réunis ci-dessous.</p></div><div style="padding:22px;background:#fff;border:1px solid #ddd;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">${htmlRows}</table></div><div style="padding:22px;background:#fff;border:1px solid #ddd;border-top:0;"><div style="font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">OBJET À COPIER</div><div style="margin-top:8px;padding:13px;border-radius:10px;background:#fff7df;border:1px solid #ead59a;font-weight:800;">${escapeHtml(copySubject)}</div><div style="margin-top:20px;font-size:12px;font-weight:900;letter-spacing:.12em;color:#a46b00;">MAIL PRÊT À COPIER COLLER</div><div style="margin-top:8px;padding:18px;border-radius:12px;background:#f6f7f5;border:1px solid #dfe2dc;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.65;color:#171717;">${escapeHtml(readyReply)}</div><p style="margin:16px 0 0;color:#777;font-size:11px;">Lead ID : ${escapeHtml(leadId)}. Le profil, les calculs, le devis et le CTA sont inclus dans ce mail, pas seulement un tableau.</p></div></div></body></html>`;
  const text = `Nouveau lead Pré Peptides\n\nVerdict : ${previewStatusLabel(result)}\nProchaine étape : ${previewNextStepLabel(result)}\nEmail automatique client : ${clientEmailSent ? "Envoyé" : "Non envoyé"}\n\nObjet à copier :\n${copySubject}\n\nMAIL PRÊT À COPIER COLLER\n\n${readyReply}\n\nLead ID: ${leadId}`;
  const subject = result.status === "eligible"
    ? `[APEXLABS] Lead prêt à convertir · ${input.firstName} · ${money(result.estimatedGrandTotalUsd)}`
    : `[APEXLABS] Revue requise · ${input.firstName} · ${previewNextStepLabel(result)}`;
  return { subject, html, text };
}
