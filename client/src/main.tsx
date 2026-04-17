import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  // Optional dependency: keep build working even when @sentry/react isn't installed.
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0.1,
      });
    })
    .catch(() => {
      // No-op: Sentry is disabled if the package isn't present.
    });
}

// Microsoft Clarity — heatmaps + session recordings. Free, no script bloat.
// Only loads if VITE_CLARITY_ID env var is set at build time. No-op otherwise,
// so this change is 100% safe even if the env var is never configured.
const clarityId = import.meta.env.VITE_CLARITY_ID as string | undefined;
if (clarityId && typeof window !== "undefined") {
  // Official Microsoft Clarity tag, inlined as a module.
  (function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window as any, document, "clarity", "script", clarityId);
}

createRoot(document.getElementById("root")!).render(<App />);
