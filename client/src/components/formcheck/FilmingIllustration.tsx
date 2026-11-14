/**
 * Schéma « bien filmer » : téléphone posé à hauteur de hanche, de profil, à 3 ou 4 mètres.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ACCENT } from "./motion";

export function FilmingIllustration({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: { once: true },
          transition: { duration: 1.1, delay, ease: "easeInOut" as const },
        };

  return (
    <svg viewBox="0 0 420 260" className={className} role="img" aria-label="Schéma : téléphone posé et stable à hauteur de hanche, de profil, à 3 ou 4 mètres de toi, corps entier dans le cadre.">
      {/* sol */}
      <line x1="20" y1="222" x2="400" y2="222" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" />

      {/* trépied + téléphone */}
      <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <line x1="62" y1="150" x2="48" y2="222" />
        <line x1="62" y1="150" x2="76" y2="222" />
        <line x1="62" y1="150" x2="62" y2="222" strokeOpacity="0.5" />
      </g>
      <rect x="54" y="122" width="16" height="30" rx="3" fill="#0A0A0A" stroke={ACCENT} strokeWidth="2" />

      {/* champ de vision */}
      <motion.path d="M 70 130 L 360 30" stroke={ACCENT} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 5" fill="none" {...draw(0.1)} />
      <motion.path d="M 70 144 L 360 232" stroke={ACCENT} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 5" fill="none" {...draw(0.2)} />

      {/* silhouette debout, de profil, avec barre */}
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none">
        <line x1="300" y1="222" x2="304" y2="178" />
        <line x1="304" y1="178" x2="300" y2="140" />
        <line x1="300" y1="140" x2="304" y2="86" />
        <line x1="300" y1="222" x2="322" y2="222" strokeWidth="5" />
        <line x1="304" y1="94" x2="292" y2="110" strokeWidth="3.5" />
        <line x1="292" y1="110" x2="302" y2="88" strokeWidth="3.5" />
      </g>
      <circle cx="306" cy="70" r="12" fill="#0A0A0A" stroke="#fff" strokeWidth="3" />
      <circle cx="301" cy="90" r="19" fill={ACCENT} fillOpacity="0.12" stroke={ACCENT} strokeWidth="3" />

      {/* hauteur de hanche */}
      <motion.path d="M 70 140 L 296 140" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 4" fill="none" {...draw(0.4)} />
      <rect x="132" y="112" width="112" height="20" rx="3" fill="#0A0A0A" stroke={ACCENT} strokeOpacity="0.8" />
      <text x="188" y="126" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="700">
        Hauteur de hanche
      </text>

      {/* distance */}
      <motion.path d="M 62 244 L 300 244" stroke={ACCENT} strokeWidth="1.5" fill="none" {...draw(0.6)} />
      <path d="M 62 238 L 62 250 M 300 238 L 300 250" stroke={ACCENT} strokeWidth="1.5" />
      <rect x="152" y="234" width="58" height="20" rx="3" fill="#000" />
      <text x="181" y="248" textAnchor="middle" fill={ACCENT} fontSize="12" fontWeight="800">
        3 à 4 m
      </text>

      <text x="300" y="22" textAnchor="middle" fill="#fff" fillOpacity="0.7" fontSize="10.5" fontWeight="700" letterSpacing="1.2">
        DE PROFIL
      </text>
    </svg>
  );
}
