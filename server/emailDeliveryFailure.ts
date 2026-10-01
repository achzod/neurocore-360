export function isTerminalUnsubscribeSignal(input: {
  sendpulseStatus?: unknown;
  sendpulseError?: unknown;
} | null | undefined): boolean {
  if (!input) return false;
  const status = String(input.sendpulseStatus || "").toLowerCase();
  const error = String(input.sendpulseError || "");
  return status === "unsubscribed"
    || /unsubscribed/i.test(error)
    || /"smtpAnswerCode"\s*:\s*555\b/i.test(error);
}
