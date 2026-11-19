import { useEffect, useState } from "react";

const HERO_VIDEO_SRC =
  "https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/m1/space.mp4";

/**
 * Decorative hero background video.
 *
 * The source file is a 58 s 1080p60 clip (about 43 MB) that the browser kept
 * streaming in a loop. It sits at 60% opacity behind a dark gradient, so it is
 * pure decoration: it is now only mounted on large screens, after the page has
 * loaded, and never when the visitor asked for reduced motion or data saving.
 * Mobile visitors keep the same dark gradient background.
 */
export function HeroBackgroundVideo() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const allowed =
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !connection?.saveData;
    if (!allowed) return;

    const start = () => setEnabled(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 300);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  if (!enabled) return null;

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen scale-110"
      style={{ animation: "pulse-slow 8s infinite" }}
    >
      <source src={HERO_VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
