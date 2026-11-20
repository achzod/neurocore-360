import { useState } from "react";
import { X } from "lucide-react";

// Black Friday AchZod Coaching : visible uniquement du 27/11/2026 00:00 au 29/11/2026 23:59 (heure de Paris).
const BF_START = Date.parse("2026-11-27T00:00:00+01:00");
const BF_END = Date.parse("2026-11-29T23:59:59+01:00");
const BF_URL =
  "https://www.achzodcoaching.com/formules-coaching?utm_source=apexlabs&utm_medium=banner&utm_campaign=bf30";
const STORAGE_KEY = "bf30_bar_closed";

export function isBlackFridayActive(now: number = Date.now()): boolean {
  return now >= BF_START && now <= BF_END;
}

export function BlackFridayBar() {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (closed || !isBlackFridayActive()) return null;
  return (
    <div className="relative z-[60] w-full bg-[#FCDD00] text-[#0A0B09]" role="region" aria-label="Black Friday">
      <a
        href={BF_URL}
        className="block px-10 py-2 text-center text-sm font-semibold leading-snug hover:underline"
      >
        Black Friday : -30 % sur tous les coachings et ebooks avec le code BF30. Places limitées, jusqu'à dimanche minuit.
      </a>
      <button
        type="button"
        aria-label="Fermer"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
        onClick={() => {
          try {
            sessionStorage.setItem(STORAGE_KEY, "1");
          } catch {}
          setClosed(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
