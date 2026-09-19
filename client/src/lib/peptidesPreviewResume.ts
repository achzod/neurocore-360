export const PEPTIDES_PREVIEW_RESUME_KEY = "apex_peptides_preview_resume_v1";

const RESUME_MAX_AGE_MS = 13 * 24 * 60 * 60 * 1000;

type StoredPreviewResume = {
  checkoutUrl: string;
  savedAt: number;
};

export function serializePreviewResume(checkoutUrl: string, savedAt = Date.now()): string | null {
  try {
    const parsed = new URL(checkoutUrl, "https://apexlabs.invalid");
    const token = new URLSearchParams(parsed.hash.replace(/^#/, "")).get("preview_token");
    if (parsed.pathname !== "/peptides-engine" || !token) return null;
    return JSON.stringify({ checkoutUrl, savedAt } satisfies StoredPreviewResume);
  } catch {
    return null;
  }
}

export function resolveCampaignEngineChoiceDestination(
  search: string,
  storedResume: string | null,
  now = Date.now(),
): string | null {
  const campaignParams = new URLSearchParams(search);
  if (
    campaignParams.get("utm_source") !== "sendpulse"
    || campaignParams.get("utm_content") !== "engine_choice"
  ) {
    return null;
  }

  if (storedResume) {
    try {
      const parsed = JSON.parse(storedResume) as StoredPreviewResume;
      if (
        typeof parsed.checkoutUrl === "string"
        && Number.isFinite(parsed.savedAt)
        && parsed.savedAt <= now
        && now - parsed.savedAt <= RESUME_MAX_AGE_MS
      ) {
        const destination = new URL(parsed.checkoutUrl, "https://apexlabs.invalid");
        const token = new URLSearchParams(destination.hash.replace(/^#/, "")).get("preview_token");
        if (destination.pathname === "/peptides-engine" && token) {
          for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
            const value = campaignParams.get(key);
            if (value) destination.searchParams.set(key, value);
          }
          return `${destination.pathname}${destination.search}${destination.hash}`;
        }
      }
    } catch {
      // Invalid browser state falls back to the free Preview instead of the full questionnaire.
    }
  }

  return `/peptides-preview${campaignParams.toString() ? `?${campaignParams.toString()}` : ""}`;
}
