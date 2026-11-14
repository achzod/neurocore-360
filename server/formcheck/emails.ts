/**
 * FormCheck V2 : emails client et alerte admin. Gabarit clair, couleurs AchZod.
 */
import { FORMCHECK_BRAND as C, getFormcheckAdminEmail } from "./config";
import { ACHZOD_EMAIL_LOGO_PATH } from "./logo";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

/** URL absolue du logo PNG, servie par le site ApexLabs lui-même (déduite d'un lien du mail). */
export function achzodEmailLogoUrl(anyLinkOnSite: string, variant: "dark" | "light" = "dark"): string | null {
  try {
    const origin = new URL(anyLinkOnSite).origin;
    return `${origin}${variant === "light" ? ACHZOD_EMAIL_LOGO_PATH.replace(".png", "-light.png") : ACHZOD_EMAIL_LOGO_PATH}`;
  } catch {
    return null;
  }
}

export function wrapFormcheckEmail(title: string, bodyHtml: string, cta?: { href: string; label: string }, logoUrl?: string | null): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light only"/></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border-radius:8px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.yellow};padding:16px 24px;font-weight:900;letter-spacing:2px;color:${C.black};font-size:14px;">${logoUrl
  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;"><img src="${esc(logoUrl)}" width="124" height="32" alt="ACHZOD" style="display:block;border:0;outline:none;height:32px;width:124px;"/></td><td align="right" style="vertical-align:middle;font-weight:900;letter-spacing:2px;color:${C.black};font-size:13px;">APEXLABS · FORMCHECK</td></tr></table>`
  : "APEXLABS · FORMCHECK"}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 14px;font-size:21px;color:${C.black};">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.55;color:${C.ink};">${bodyHtml}</div>
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(cta.href)}" style="display:inline-block;padding:13px 22px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid ${C.line};font-size:12px;color:${C.muted};">APEXLABS by Achzod · Analyse technique uniquement, sans diagnostic médical.</td></tr>
</table></td></tr></table></body></html>`;
}

export function buildAccessEmail(input: { uploadUrl: string; credits: number; available: number }) {
  const subject = "FormCheck : ton accès pour envoyer ta vidéo";
  const plural = input.credits > 1 ? "s" : "";
  const html = wrapFormcheckEmail(
    "Paiement reçu, à toi de filmer",
    `<p>Merci pour ton achat : <strong>${input.credits} analyse${plural} FormCheck</strong> ajoutée${plural} à ton compte. Il te reste <strong>${input.available} crédit${input.available > 1 ? "s" : ""}</strong> disponible${input.available > 1 ? "s" : ""}.</p>
     <p><strong>Pour une analyse fiable :</strong></p>
     <ul style="padding-left:18px;margin:6px 0;">
       <li>une seule série, 60 secondes maximum, en .mp4 ou .mov (200 Mo max) ;</li>
       <li>téléphone posé et stable, à hauteur de hanche, de profil pour le squat, le soulevé de terre et le hip thrust ;</li>
       <li>corps entier et charge visibles du début à la fin, bonne lumière.</li>
     </ul>
     <p>Un crédit est utilisé seulement quand ton rapport est livré. Si la vidéo est inexploitable, on te demande de la refilmer et ton crédit reste intact.</p>
     <p style="color:${C.muted};font-size:13px;">Garde cet email : ce lien te sert pour toutes tes prochaines vidéos.</p>`,
    { href: input.uploadUrl, label: "Envoyer ma vidéo" },
  );
  const text = `Paiement reçu : ${input.credits} analyse${plural} FormCheck. Crédits disponibles : ${input.available}.\nEnvoie ta vidéo ici : ${input.uploadUrl}\nUne seule série, 60 s maximum, .mp4 ou .mov, 200 Mo maximum. Le crédit n'est utilisé que si le rapport est livré.`;
  return { subject, html, text };
}

const COACHING_URL = "https://achzodcoaching.com";
const COACHING_FORMULAS = [
  { name: "Essential", href: "https://www.achzodcoaching.com/coaching-essential", line: "le cadre essentiel, stratégie claire et suivi régulier" },
  { name: "Elite", href: "https://www.achzodcoaching.com/coaching-elite", line: "un accompagnement plus poussé pour ajuster chaque détail" },
  { name: "Private Lab", href: "https://www.achzodcoaching.com/coaching-achzod-private-lab", line: "mon accompagnement le plus complet" },
] as const;

/** Bloc d'appel au coaching Achzod (jaune et noir), placé en bas du mail de rapport. */
export function buildCoachingCtaHtml(lightLogoUrl?: string | null): string {
  const rows = COACHING_FORMULAS.map((f) => `<tr><td style="padding:5px 0;font-size:14px;color:#FFFFFF;"><a href="${esc(f.href)}" style="color:${C.yellow};font-weight:800;text-decoration:none;">${esc(f.name)}</a> : ${esc(f.line)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;background:${C.black};border-radius:8px;"><tr><td style="padding:20px 20px 18px;">
${lightLogoUrl ? `<img src="${esc(lightLogoUrl)}" width="124" height="32" alt="ACHZOD" style="display:block;border:0;outline:none;height:32px;width:124px;margin-bottom:10px;"/>` : ""}<div style="color:${C.yellow};font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${lightLogoUrl ? "Et maintenant ?" : "Coaching Achzod"}</div>
<div style="color:#FFFFFF;font-size:19px;font-weight:800;line-height:1.3;margin:8px 0 10px;">Tu sais quoi corriger. Avec moi, tu le corriges pour de bon.</div>
<div style="color:#E6E6E6;font-size:14px;line-height:1.55;margin-bottom:10px;">Un programme construit autour de tes points faibles, ta technique suivie dans le temps et des ajustements réguliers jusqu'à ce que chaque correction tienne sous la charge.</div>
<table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td style="background:${C.yellow};border-radius:6px;"><a href="${COACHING_URL}" style="display:inline-block;padding:12px 20px;color:${C.black};font-weight:900;text-decoration:none;font-size:15px;">Passer au coaching Achzod</a></td></tr></table>
</td></tr></table>`;
}

/** exerciseLabel = exercice détecté par l'analyse (le client ne le choisit pas). */
export function buildReportEmail(input: { exerciseLabel: string; score: number; summary: string; pdfUrl: string; uploadUrl: string; available: number }) {
  const subject = `Ton rapport FormCheck est prêt : ${input.exerciseLabel}`;
  const html = wrapFormcheckEmail(
    `${input.exerciseLabel} : ${input.score}/100`,
    `<p style="margin:0 0 12px;"><span style="display:inline-block;background:#FFF8C2;padding:4px 10px;border-radius:6px;font-size:13px;">Exercice détecté : <strong>${esc(input.exerciseLabel)}</strong></span></p>
     <p>${esc(input.summary)}</p>
     <p>Ton rapport complet est en pièce jointe (PDF) : tableau de bord de tous les critères, analyse phase par phase, tempo rep par rep, chaque erreur sur ton image annotée avec le pourquoi, comment corriger et tes exercices correctifs, puis ton plan de correction sur 4 semaines.</p>
     <p>Pièce jointe introuvable ? <a href="${esc(input.pdfUrl)}" style="color:${C.black};font-weight:700;">Télécharge le PDF ici</a>.</p>
     <p>Crédits restants : <strong>${input.available}</strong>. Applique ton plan pendant 2 à 4 semaines puis renvoie une vidéo pour mesurer le progrès.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 6px;"><tr><td style="background:${C.black};border-radius:6px;"><a href="${esc(input.uploadUrl)}" style="display:inline-block;padding:12px 20px;color:${C.yellow};font-weight:800;text-decoration:none;font-size:15px;">Envoyer une nouvelle vidéo</a></td></tr></table>
     ${buildCoachingCtaHtml(achzodEmailLogoUrl(input.uploadUrl, "light"))}`,
    undefined,
    achzodEmailLogoUrl(input.uploadUrl, "dark"),
  );
  const text = `Ton rapport FormCheck est prêt : ${input.score}/100.\nExercice détecté : ${input.exerciseLabel}\n${input.summary}\nPDF : ${input.pdfUrl}\nNouvelle vidéo : ${input.uploadUrl}\n\nTu sais quoi corriger. Avec le coaching Achzod, tu le corriges pour de bon : Essential, Elite ou Private Lab.\nDécouvre les formules : ${COACHING_URL}`;
  return { subject, html, text };
}

export function buildReshootEmail(input: { exerciseLabel?: string | null; reason: string; uploadUrl: string }) {
  const what = input.exerciseLabel ? `ta vidéo de <strong>${esc(input.exerciseLabel)}</strong>` : "ta vidéo";
  const subject = "FormCheck : ta vidéo est à refilmer (crédit non utilisé)";
  const html = wrapFormcheckEmail(
    "On a besoin d'une nouvelle vidéo",
    `<p>On n'a pas pu analyser ${what} de façon fiable :</p>
     <p style="background:#FFF8C2;padding:10px 12px;border-radius:6px;">${esc(input.reason)}</p>
     <p><strong>Ton crédit n'a pas été utilisé.</strong> Refilme ta série (téléphone stable, corps entier visible, bonne lumière) et renvoie-la.</p>`,
    { href: input.uploadUrl, label: "Renvoyer une vidéo" },
  );
  const text = `On n'a pas pu analyser ${input.exerciseLabel ? `ta vidéo de ${input.exerciseLabel}` : "ta vidéo"} : ${input.reason}\nTon crédit n'a pas été utilisé. Renvoie une vidéo ici : ${input.uploadUrl}`;
  return { subject, html, text };
}

export function buildIssueEmail(input: { exerciseLabel?: string | null; uploadUrl: string }) {
  const what = input.exerciseLabel ? `ta vidéo de <strong>${esc(input.exerciseLabel)}</strong>` : "ta vidéo";
  const subject = "FormCheck : ton analyse prend un peu plus de temps";
  const html = wrapFormcheckEmail(
    "Ton analyse demande une vérification",
    `<p>L'analyse automatique de ${what} n'a pas abouti avec assez de fiabilité. Achzod a été prévenu et regarde ta vidéo.</p>
     <p><strong>Ton crédit n'a pas été utilisé.</strong> Tu peux aussi renvoyer une vidéo mieux cadrée dès maintenant.</p>`,
    { href: input.uploadUrl, label: "Renvoyer une vidéo" },
  );
  const text = `L'analyse de ${input.exerciseLabel ? `ta vidéo de ${input.exerciseLabel}` : "ta vidéo"} demande une vérification manuelle. Ton crédit n'a pas été utilisé. Renvoyer une vidéo : ${input.uploadUrl}`;
  return { subject, html, text };
}

export function buildAdminAlert(input: { analysisId: string; email: string; exerciseLabel?: string | null; attempts: number; reason: string }) {
  const exercise = input.exerciseLabel || "exercice non détecté";
  const subject = `[FormCheck] Analyse à vérifier : ${exercise} (${input.email})`;
  const lines = [
    `Analyse : ${input.analysisId}`,
    `Client : ${input.email}`,
    `Exercice détecté : ${exercise}`,
    `Tentatives : ${input.attempts}`,
    `Raison : ${input.reason}`,
    "Crédit libéré (non consommé). Le client a reçu un email l'invitant à renvoyer une vidéo.",
  ];
  const html = wrapFormcheckEmail("Analyse FormCheck à vérifier", `<pre style="white-space:pre-wrap;font-size:13px;">${esc(lines.join("\n"))}</pre>`);
  return { to: getFormcheckAdminEmail(), subject, html, text: lines.join("\n") };
}
