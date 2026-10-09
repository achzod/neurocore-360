import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackDiscoveryFunnelStep } from "@/lib/analytics";

const CONSENT_KEY = "apexlabs_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Show after 1s so it doesn't block initial render
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    // If already accepted analytics, load GA
    if (consent === "all") {
      loadGA();
    }
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
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateSafeArea);
    if (bannerRef.current) observer?.observe(bannerRef.current);
    window.addEventListener("resize", updateSafeArea);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSafeArea);
      document.body.style.paddingBottom = previousBodyPaddingBottom;
      document.documentElement.style.scrollPaddingBottom = previousScrollPaddingBottom;
    };
  }, [visible]);

  function accept(level: "all" | "essential") {
    localStorage.setItem(CONSENT_KEY, level);
    setVisible(false);
    if (level === "all") {
      loadGA();
      if (window.location.pathname === "/offers/discovery-scan" || window.location.pathname === "/ads/discovery-scan") {
        trackDiscoveryFunnelStep('discovery_landing_viewed');
      }
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bannerRef}
          role="region"
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
                <p className="text-white text-sm font-semibold mb-1">Cookies & Confidentialite</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Nous utilisons des cookies essentiels pour le fonctionnement du site et des cookies analytiques pour ameliorer nos services.{" "}
                  <a href="/politique-confidentialite" className="text-[#FCDD00] hover:underline">
                    Politique de confidentialite
                  </a>
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-3 shrink-0 md:w-auto md:flex-nowrap">
                <button
                  onClick={() => accept("essential")}
                  className="min-w-0 flex-1 px-3 py-2 text-xs font-medium text-white/60 border border-white/10 rounded-sm hover:bg-white/5 transition-colors md:flex-none md:px-4"
                >
                  Essentiels uniquement
                </button>
                <button
                  onClick={() => accept("all")}
                  className="min-w-0 flex-1 px-3 py-2 text-xs font-bold text-black bg-[#FCDD00] rounded-sm hover:bg-[#FCDD00]/90 transition-colors md:flex-none md:px-4"
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

/** Inject GA4 script only when consent is given */
function loadGA() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || document.getElementById("ga-script")) return;
  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  script.onload = () => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", measurementId);
  };
}

/** Check if user has accepted analytics cookies */
export function hasAnalyticsConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "all";
}

/** Reset cookie consent to re-show the banner */
export function resetCookieConsent() {
  localStorage.removeItem(CONSENT_KEY);
  window.location.reload();
}
