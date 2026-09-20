const COMMON_EMAIL_DOMAIN_CORRECTIONS: Record<string, string> = {
  "glail.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotnail.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "icloud.con": "icloud.com",
  "yahoo.con": "yahoo.com",
};

export function suggestedEmailCorrection(raw: unknown): string | null {
  const email = String(raw || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const domain = email.slice(at + 1);
  const correctedDomain = COMMON_EMAIL_DOMAIN_CORRECTIONS[domain];
  return correctedDomain ? `${email.slice(0, at)}@${correctedDomain}` : null;
}

export function isLikelyDeliverableEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim().toLowerCase();
  return email.length >= 6
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    && suggestedEmailCorrection(email) === null;
}

export function emailCorrectionMessage(raw: unknown): string | null {
  const correction = suggestedEmailCorrection(raw);
  return correction ? `Vérifie ton adresse email. Voulais-tu écrire ${correction} ?` : null;
}
