export const DEFAULT_SSR_CACHE_CONTROL = "public, max-age=3600";
export const INTERACTIVE_FLOW_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

export function resolveSsrCacheControl(override?: string): string {
  return override ?? DEFAULT_SSR_CACHE_CONTROL;
}
