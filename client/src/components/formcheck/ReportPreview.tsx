/**
 * Aperçu animé d'un vrai rapport FormCheck (exemple : soulevé de terre sur cales, 3 répétitions).
 * Toutes les valeurs viennent du rapport d'exemple : rien n'est inventé.
 */

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Eye, Wrench } from "lucide-react";
import { ACCENT, CountUp } from "./motion";

const SCORE = 85;
const SUBSCORES = [
  { label: "Mise en place", value: 85 },
  { label: "Exécution", value: 87 },
  { label: "Stabilité", value: 86 },
  { label: "Contrôle", value: 81 },
];
const PHASES = [
  { label: "Mise en place", verdict: "Correct" },
  { label: "Départ", verdict: "Non visible" },
  { label: "Milieu", verdict: "Correct" },
  { label: "Verrouillage", verdict: "Bon" },
  { label: "Descente", verdict: "Correct" },
];
const TEMPO = [
  { rep: "Rep 1", down: "3 s", up: "3 s", pause: "4 s" },
  { rep: "Rep 2", down: "3 s", up: "3 s", pause: "6 s" },
  { rep: "Rep 3", down: "3 s", up: "2 s", pause: "0 s" },
];
const CUES = ["Nuque longue.", "La tête suit le buste.", "Ne lève pas le menton."];
const CORRECTIVES = ["Charnière de hanches avec bâton", "Soulevé de terre sur cales à montée lente"];

function ScoreRing() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const r = 54;
  const c = 2 * Math.PI * r;
  const target = c * (1 - SCORE / 100);
  return (
    <div className="relative shrink-0">
      <div className="relative h-36 w-36">
      <svg ref={ref} viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={ACCENT}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? target : c }}
          animate={{ strokeDashoffset: inView || reduce ? target : c }}
          transition={{ duration: reduce ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <CountUp to={SCORE} className="text-5xl font-black tabular-nums text-white" />
          <span className="text-sm font-bold text-white/60">/100</span>
        </div>
      </div>
      </div>
      <div className="mt-1 text-center text-[11px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
        Technique solide
      </div>
    </div>
  );
}

function SubscoreBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-white/85">{label}</span>
        <CountUp to={value} className="font-black tabular-nums text-white" />
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: ACCENT }}
          initial={{ width: reduce ? `${value}%` : "0%" }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.2, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function ReportPreview() {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
      {/* Score et tableau de bord */}
      <div className="rounded-sm border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 sm:p-7">
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Exercice reconnu</div>
        <div className="mt-1 text-lg font-bold leading-snug text-white">Soulevé de terre traditionnel avec barre surélevée sur cales</div>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ScoreRing />
          <div className="w-full space-y-3.5">
            {SUBSCORES.map((s, i) => (
              <SubscoreBar key={s.label} label={s.label} value={s.value} delay={0.15 * i} />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Phase par phase</div>
          <motion.ul
            className="mt-3 flex flex-wrap gap-2"
            variants={list}
            initial={reduce ? "show" : "hidden"}
            whileInView="show"
            viewport={{ once: true }}
          >
            {PHASES.map((p) => (
              <motion.li
                key={p.label}
                variants={item}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs"
              >
                <span className="font-semibold text-white">{p.label}</span>
                <span className={p.verdict === "Non visible" ? "text-white/55" : "text-emerald-400"}>· {p.verdict}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div className="mt-7">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Tempo rep par rep</div>
          <div className="mt-3 overflow-hidden rounded-sm border border-white/10">
            <div className="grid grid-cols-4 bg-[#FCDD00] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black">
              <span>Rep</span>
              <span>Descente</span>
              <span>Montée</span>
              <span>Pause</span>
            </div>
            <motion.div variants={list} initial={reduce ? "show" : "hidden"} whileInView="show" viewport={{ once: true }}>
              {TEMPO.map((t) => (
                <motion.div key={t.rep} variants={item} className="grid grid-cols-4 border-t border-white/10 px-3 py-2 text-sm tabular-nums text-white/85">
                  <span className="font-bold text-white">{t.rep}</span>
                  <span>{t.down}</span>
                  <span>{t.up}</span>
                  <span>{t.pause}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Carte d'erreur */}
      <div className="rounded-sm border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Erreur 1 · Milieu du mouvement</div>
          <span className="rounded-full border border-[#FCDD00]/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
            Mineure
          </span>
        </div>
        <div className="mt-1 text-lg font-bold text-white">Nuque trop relevée pendant la montée</div>

        <div className="mt-5 grid grid-cols-[112px_1fr] gap-4 sm:grid-cols-[150px_1fr]">
          <motion.div
            className="relative aspect-[9/16] self-start overflow-hidden rounded-sm border border-white/10"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/images/formcheck/erreur-annotee.webp"
              alt="Image annotée d'un rapport FormCheck : nuque relevée pendant la montée"
              width={576}
              height={1024}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.div className="space-y-4" variants={list} initial={reduce ? "show" : "hidden"} whileInView="show" viewport={{ once: true }}>
            <motion.div variants={item}>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                <Eye className="h-3.5 w-3.5" /> Ce qu'on voit
              </div>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Ton visage s'oriente vers l'avant alors que ton tronc est encore nettement incliné.
              </p>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                <Wrench className="h-3.5 w-3.5" /> Comment corriger
              </div>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Garde le menton légèrement rentré et laisse le regard remonter uniquement parce que le tronc se redresse.
              </p>
            </motion.div>
            <motion.div variants={item} className="flex flex-wrap gap-1.5">
              {CUES.map((c) => (
                <span key={c} className="rounded-sm px-2 py-1 text-[11px] font-bold text-black" style={{ backgroundColor: ACCENT }}>
                  « {c} »
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Exercices correctifs</div>
          <ul className="mt-2 space-y-2">
            {CORRECTIVES.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-white/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
