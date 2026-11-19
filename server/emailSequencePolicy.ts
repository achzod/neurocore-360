export interface EmailSequenceTrackingAttempt {
  emailType?: string | null;
  sendpulseStatus?: string | null;
  sendpulseError?: string | null;
}

export function isEmailSequenceAttempted(tracking: EmailSequenceTrackingAttempt): boolean {
  const emailType = String(tracking?.emailType || "");
  const status = String(tracking?.sendpulseStatus || "").toLowerCase();

  // J30 is a strict one-shot nurture. The row is claimed before the provider
  // call, so every recorded attempt blocks the next 30-minute cycle even when
  // SendPulse later reports a transient or contradictory delivery status.
  if (emailType === "sendDiscoveryJ30NurtureEmail") return true;

  // Permanent opt-outs and SMTP hard failures cannot be fixed by a cron retry.
  // Keep transient failures eligible for the other sequences.
  if (status === "unsubscribed") return true;
  if (status === "failed" && /"eventType"\s*:\s*"hard_fail"/i.test(String(tracking?.sendpulseError || ""))) {
    return true;
  }
  return !["failed", "auth_failed"].includes(status);
}

/** Nombre maximum d'envois ratés d'une même étape avant d'abandonner l'étape. */
export const MAX_FAILED_SEQUENCE_ATTEMPTS = 2;

/**
 * Types de séquence à considérer comme « déjà tentés » pour un audit.
 *
 * Avant ce correctif, un échec non terminal (quota SendPulse, 422, timeout,
 * adresse rejetée sans code SMTP) laissait l'étape éligible, et le cron des
 * séquences la renvoyait toutes les 30 minutes, sans limite, à la même
 * adresse. Chaque essai créait une nouvelle ligne "failed" : c'est la source
 * principale du volume « failedAtProvider ». Désormais une étape est close
 * dès qu'elle a été acceptée, bloquée, OU ratée MAX_FAILED_SEQUENCE_ATTEMPTS fois.
 */
export function collectAttemptedSequenceTypes(
  rows: EmailSequenceTrackingAttempt[],
  maxFailedAttempts: number = MAX_FAILED_SEQUENCE_ATTEMPTS,
): Set<string> {
  const attempted = new Set<string>();
  const failures = new Map<string, number>();
  for (const row of rows || []) {
    const emailType = String(row?.emailType || "");
    if (!emailType) continue;
    if (isEmailSequenceAttempted(row)) {
      attempted.add(emailType);
      continue;
    }
    const count = (failures.get(emailType) || 0) + 1;
    failures.set(emailType, count);
    if (count >= maxFailedAttempts) attempted.add(emailType);
  }
  return attempted;
}
