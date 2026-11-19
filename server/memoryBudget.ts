/**
 * Budget mémoire du process, aligné sur l'instance Render.
 *
 * Les seuils historiques (440 Mo pour sauter un cycle de cron, 460 Mo pour le
 * watchdog) dataient de l'instance Starter à 512 Mo. Sur Standard (2 Go), avec
 * un heap V8 relevé à 1536 Mo, ils faisaient sauter des crons et redémarrer le
 * process sans raison. Les seuils sont maintenant dérivés de
 * RENDER_MEMORY_LIMIT_MB (2048 par défaut) et surchargeables par variable d'env.
 */
function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const CONTAINER_MEMORY_MB = envInt("RENDER_MEMORY_LIMIT_MB", 2048);

/** Au-dessus, les crons non urgents sautent leur cycle (70 % du conteneur). */
export const CRON_SKIP_RSS_MB = envInt("CRON_SKIP_RSS_MB", Math.round(CONTAINER_MEMORY_MB * 0.7));

/** Au-dessus 3 fois de suite, le watchdog redémarre proprement (85 % du conteneur). */
export const WATCHDOG_RSS_MB = envInt("WATCHDOG_RSS_MB", Math.round(CONTAINER_MEMORY_MB * 0.85));

export function currentRssMb(): number {
  return Math.round(process.memoryUsage().rss / 1024 / 1024);
}

/** true si un cron doit sauter son cycle à cause de la pression mémoire. */
export function shouldSkipForMemory(label: string): boolean {
  const rss = currentRssMb();
  if (rss > CRON_SKIP_RSS_MB) {
    console.warn(`[${label}] Cycle sauté : RSS ${rss} Mo > ${CRON_SKIP_RSS_MB} Mo`);
    return true;
  }
  return false;
}
