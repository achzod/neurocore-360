import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackDiscoveryFunnelStep } from "@/lib/analytics";

export const CONSENT_KEY = "apexlabs_cookie_consent";
export type ConsentLevel = "all" | "essential";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-48PCF7PPT8";
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || "AW-706806863";
const GTM_ID = import.meta.env.VITE_GTM_ID || "GTM-TTHKM83";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "1120781400174189";

function updateGoogleConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const value = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    analytics_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

function loadGoogleTags() {
  if (typeof document === "undefined") return;

  if (!document.getElementById("google-tag-script")) {
    const script = document.createElement("script");
    script.id = "google-tag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  }

  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
  window.gtag?.("config", GOOGLE_ADS_ID);

  if (GTM_ID && !document.getElementById("google-tag-manager-script")) {
    const script = document.createElement("script");
    script.id = "google-tag-manager-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(script);
  }
}

function loadMetaPixel() {
  if (typeof document === "undefined" || document.getElementById("meta-pixel-script")) return;

  const fbq = ((...args: any[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as ((...args: any[]) => void) & {
    callMethod?: (...args: any[]) => void;
    queue: any[][];
    loaded: boolean;
    version: string;
    push: (...args: any[]) => void;
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = fbq;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/fr_FR/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

function applyConsent(level: ConsentLevel) {
  const granted = level === "all";
  updateGoogleConsent(granted);
  if (granted) {
    loadGoogleTags();
    loadMetaPixel();
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "all" || consent === "essential") {
      applyConsent(consent);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const previousBodyPaddingBottom = document.body.style.paddingBottom;
    const previousScrollPaddingBottom = document.documentElement.style.scrollPaddingBottom;
    const updateSafeArea = () => {
      const bannerHeight = bannerRef.current?.getBoundingClientRect().height ?? 0;
      const safeOffset = Math.ceil(bannerHeight + 16);
      document.body.style.paddingBottom = `${safeOffset}px`;
      document.documentElement.style.scrollPaddingBottom = `${safeOffset}px`;
    };

    updateSafeArea();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateSafeArea);
    if (bannerRef.current) observer?.observe(bannerRef.current);
    window.addEventListener("resize", updateSafeArea);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSafeArea);
      document.body.style.paddingBottom = previousBodyPaddingBottom;
      document.documentElement.style.scrollPaddingBottom = previousScrollPaddingBottom;
    };
  }, [visible]);

  function accept(level: ConsentLevel) {
    localStorage.setItem(CONSENT_KEY, level);
    applyConsent(level);
    setVisible(false);
    if (level === "all" && (window.location.pathname === "/offers/discovery-scan" || window.location.pathname === "/ads/discovery-scan")) {
      trackDiscoveryFunnelStep("discovery_landing_viewed");
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bannerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Préférences de cookies"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-0 inset-x-0 z-[9999] p-4 md:p-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="max-w-4xl mx-auto bg-[#0A0A0A] border border-white/10 rounded-sm p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <p className="text-white text-sm font-semibold mb-1">Cookies et confidentialité</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Les cookies essentiels assurent le fonctionnement du site. Avec ton accord, les cookies de mesure et publicitaires nous aident à améliorer nos services. Refuser est aussi simple qu’accepter.{" "}
                  <a href="/politique-confidentialite" className="text-[#FCDD00] hover:underline">
                    Politique de confidentialité
                  </a>
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-3 shrink-0 md:w-auto md:flex-nowrap">
                <button
                  type="button"
                  onClick={() => accept("essential")}
                  className="min-w-0 flex-1 px-3 py-2 text-xs font-bold text-white border border-white/30 rounded-sm hover:bg-white/5 transition-colors md:flex-none md:px-4"
                >
                  Tout refuser
                </button>
                <button
                  type="button"
                  onClick={() => accept("all")}
                  className="min-w-0 flex-1 px-3 py-2 text-xs font-bold text-black bg-[#FCDD00] border border-[#FCDD00] rounded-sm hover:bg-[#FCDD00]/90 transition-colors md:flex-none md:px-4"
                >
                  Tout accepter
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

export function resetCookieConsent() {
  localStorage.removeItem(CONSENT_KEY);
  updateGoogleConsent(false);
  window.location.reload();
}
