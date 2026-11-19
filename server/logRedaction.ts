/**
 * Aides de journalisation sans données personnelles.
 *
 * - redactPathForLog : masque les emails présents dans un chemin d'URL
 *   (ex. /api/questionnaire/progress/jean%40mail.com).
 * - maskEmailForLog : garde 2 caractères et le domaine (je***@mail.com).
 * - summarizeErrorBodyForLog : ne garde que le champ d'erreur d'un corps JSON.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function maskEmailForLog(value: unknown): string {
  const email = String(value ?? "").trim();
  const at = email.indexOf("@");
  if (at < 1) return email ? "***" : "";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

export function redactEmailsInText(text: string): string {
  return text.replace(EMAIL_RE, (match) => maskEmailForLog(match));
}

export function redactPathForLog(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    decoded = path;
  }
  return decoded.includes("@") ? redactEmailsInText(decoded) : path;
}

export function summarizeErrorBodyForLog(body: unknown, maxChars = 300): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["error", "code", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) parts.push(`${key}=${value.trim()}`);
  }
  if (!parts.length) return undefined;
  const summary = redactEmailsInText(parts.join(" "));
  return summary.length > maxChars ? `${summary.slice(0, maxChars)}…` : summary;
}

let consoleRedactionInstalled = false;

/**
 * Masque les adresses email dans tout ce qui part dans console.* (logs Render).
 * Seuls les arguments texte sont réécrits ; désactivable avec LOG_REDACT_EMAILS=false.
 */
export function installConsoleEmailRedaction(): void {
  if (consoleRedactionInstalled || process.env.LOG_REDACT_EMAILS === "false") return;
  consoleRedactionInstalled = true;
  for (const method of ["log", "info", "warn", "error"] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args.map((arg) => (typeof arg === "string" && arg.includes("@") ? redactEmailsInText(arg) : arg)));
    };
  }
}
