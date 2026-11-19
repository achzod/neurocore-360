/**
 * Google tag (GA4 + Google Ads) en Consent Mode v2, mode avancé.
 *
 * gtag.js est chargé dès l'arrivée sur le site avec un consentement par défaut
 * refusé (défini dans client/index.html avant tout script). Tant que le
 * visiteur n'a pas accepté, Google ne pose aucun cookie et n'envoie que des
 * pings anonymes, qui servent à la modélisation des conversions. Si le
 * visiteur clique « Tout accepter », on passe le consentement à « granted ».
 *
 * Le Pixel Meta et GTM ne sont jamais chargés ici : ils restent derrière le
 * consentement explicite (voir CookieConsent.tsx).
 */

export const CONSENT_KEY = "apexlabs_cookie_consent";
export type ConsentLevel = "all" | "essential";

export const GA_MEASUREMENT_ID: string = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-48PCF7PPT8";
export const GOOGLE_ADS_ID: string = import.meta.env.VITE_GOOGLE_ADS_ID || "AW-706806863";

const CONSENT_TYPES = ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"] as const;

function consentState(granted: boolean): Record<(typeof CONSENT_TYPES)[number], "granted" | "denied"> {
  const value = granted ? "granted" : "denied";
  return {
    ad_storage: value,
    analytics_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  };
}

export function readStoredConsent(): ConsentLevel | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "all" || value === "essential" ? value : null;
  } catch {
    return null;
  }
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // gtag.js expects the raw `arguments` object in the dataLayer.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
}

export function updateGoogleConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  ensureGtagStub();
  window.gtag?.("consent", "update", consentState(granted));
}

let booted = false;

/**
 * À appeler une seule fois, avant le premier rendu React (main.tsx), pour que
 * la config GA4 soit dans le dataLayer avant le premier page_view.
 */
export function bootGoogleTag() {
  if (booted || typeof window === "undefined" || typeof document === "undefined") return;
  booted = true;
  ensureGtagStub();

  // Filet de sécurité si le snippet de client/index.html est absent.
  if (!(window as any).__apexConsentDefaultSet) {
    window.gtag?.("consent", "default", { ...consentState(false), wait_for_update: 500 });
    window.gtag?.("set", "ads_data_redaction", true);
    (window as any).__apexConsentDefaultSet = true;
  }

  // Visiteur qui a déjà accepté : on rétablit le consentement avant la config
  // pour que le tout premier hit parte en mode « granted ».
  if (readStoredConsent() === "all") {
    window.gtag?.("consent", "update", consentState(true));
  }

  window.gtag?.("js", new Date());
  // page_view envoyé à la main à chaque changement de route (App.tsx).
  window.gtag?.("config", GA_MEASUREMENT_ID, { send_page_view: false });
  window.gtag?.("config", GOOGLE_ADS_ID);

  if (!document.getElementById("google-tag-script")) {
    const script = document.createElement("script");
    script.id = "google-tag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  }
}
