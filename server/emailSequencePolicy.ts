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
