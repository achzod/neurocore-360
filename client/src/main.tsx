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

createRoot(document.getElementById("root")!).render(<App />);
