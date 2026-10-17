export const STOPPED_DISCOVERY30_RELAUNCH_TYPES = new Set([
  "sendRecoveryCtaEmail",
  "sendGratuitUpsellEmail",
  "sendGratuitJ5Email",
  "sendGratuitJ7Email",
  "sendDiscoveryJ14CoachingEmail",
  "sendDiscoveryJ30NurtureEmail",
]);

export function isDiscovery30RelaunchStopped(emailType: string): boolean {
  return STOPPED_DISCOVERY30_RELAUNCH_TYPES.has(emailType);
}
