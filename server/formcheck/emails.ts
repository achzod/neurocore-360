/**
 * FormCheck V2 : emails client et alerte admin. Gabarit clair, couleurs AchZod.
 */
import { FORMCHECK_BRAND as C, getFormcheckAdminEmail } from "./config";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

export function wrapFormcheckEmail(title: string, bodyHtml: string, cta?: { href: string; label: string }): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light only"/></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border-radius:8px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.yellow};padding:16px 24px;font-weight:900;letter-spacing:2px;color:${C.black};font-size:14px;">APEXLABS · FORMCHECK</td></tr>
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

export function buildReportEmail(input: { exerciseLabel: string; score: number; summary: string; pdfUrl: string; uploadUrl: string; available: number }) {
  const subject = `Ton rapport FormCheck est prêt : ${input.exerciseLabel}`;
  const html = wrapFormcheckEmail(
    `${input.exerciseLabel} : ${input.score}/100`,
    `<p>${esc(input.summary)}</p>
     <p>Ton rapport complet est en pièce jointe (PDF) : tes 3 corrections prioritaires, les captures annotées de la vidéo et tes consignes pour la prochaine séance.</p>
     <p>Pièce jointe introuvable ? <a href="${esc(input.pdfUrl)}" style="color:${C.black};font-weight:700;">Télécharge le PDF ici</a>.</p>
     <p>Crédits restants : <strong>${input.available}</strong>. Applique les corrections pendant 2 ou 3 séances puis renvoie une vidéo pour mesurer le progrès.</p>`,
    { href: input.uploadUrl, label: "Envoyer une nouvelle vidéo" },
  );
  const text = `Ton rapport FormCheck (${input.exerciseLabel}) est prêt : ${input.score}/100.\n${input.summary}\nPDF : ${input.pdfUrl}\nNouvelle vidéo : ${input.uploadUrl}`;
  return { subject, html, text };
}

export function buildReshootEmail(input: { exerciseLabel: string; reason: string; uploadUrl: string }) {
  const subject = "FormCheck : ta vidéo est à refilmer (crédit non utilisé)";
  const html = wrapFormcheckEmail(
    "On a besoin d'une nouvelle vidéo",
    `<p>On n'a pas pu analyser ta vidéo de <strong>${esc(input.exerciseLabel)}</strong> de façon fiable :</p>
     <p style="background:#FFF8C2;padding:10px 12px;border-radius:6px;">${esc(input.reason)}</p>
     <p><strong>Ton crédit n'a pas été utilisé.</strong> Refilme ta série (téléphone stable, corps entier visible, bonne lumière) et renvoie-la.</p>`,
    { href: input.uploadUrl, label: "Renvoyer une vidéo" },
  );
  const text = `On n'a pas pu analyser ta vidéo de ${input.exerciseLabel} : ${input.reason}\nTon crédit n'a pas été utilisé. Renvoie une vidéo ici : ${input.uploadUrl}`;
  return { subject, html, text };
}

export function buildIssueEmail(input: { exerciseLabel: string; uploadUrl: string }) {
  const subject = "FormCheck : ton analyse prend un peu plus de temps";
  const html = wrapFormcheckEmail(
    "Ton analyse demande une vérification",
    `<p>L'analyse automatique de ta vidéo de <strong>${esc(input.exerciseLabel)}</strong> n'a pas abouti avec assez de fiabilité. Achzod a été prévenu et regarde ta vidéo.</p>
     <p><strong>Ton crédit n'a pas été utilisé.</strong> Tu peux aussi renvoyer une vidéo mieux cadrée dès maintenant.</p>`,
    { href: input.uploadUrl, label: "Renvoyer une vidéo" },
  );
  const text = `L'analyse de ta vidéo de ${input.exerciseLabel} demande une vérification manuelle. Ton crédit n'a pas été utilisé. Renvoyer une vidéo : ${input.uploadUrl}`;
  return { subject, html, text };
}

export function buildAdminAlert(input: { analysisId: string; email: string; exerciseLabel: string; attempts: number; reason: string }) {
  const subject = `[FormCheck] Analyse à vérifier : ${input.exerciseLabel} (${input.email})`;
  const lines = [
    `Analyse : ${input.analysisId}`,
    `Client : ${input.email}`,
    `Exercice : ${input.exerciseLabel}`,
    `Tentatives : ${input.attempts}`,
    `Raison : ${input.reason}`,
    "Crédit libéré (non consommé). Le client a reçu un email l'invitant à renvoyer une vidéo.",
  ];
  const html = wrapFormcheckEmail("Analyse FormCheck à vérifier", `<pre style="white-space:pre-wrap;font-size:13px;">${esc(lines.join("\n"))}</pre>`);
  return { to: getFormcheckAdminEmail(), subject, html, text: lines.join("\n") };
}
