export interface PeptidesConsentRecord {
  accepted?: unknown;
  version?: unknown;
  text?: unknown;
}

export function hasValidPeptidesConsent(
  consent: PeptidesConsentRecord | null | undefined
): boolean {
  return Boolean(
    consent?.accepted === true &&
    typeof consent.version === "string" &&
    consent.version.trim().length >= 8 &&
    typeof consent.text === "string" &&
    consent.text.trim().length >= 120
  );
}
