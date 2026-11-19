/**
 * Relances des questionnaires Discovery non terminés : coupées par défaut.
 * Réactivation explicite uniquement avec DISCOVERY_ABANDON_REMINDERS_ENABLED=1
 * (ou "true"). Absent ou toute autre valeur = aucun envoi réel.
 */
export function isDiscoveryAbandonRemindersEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(env.DISCOVERY_ABANDON_REMINDERS_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}
