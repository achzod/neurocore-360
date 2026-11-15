/**
 * Démo animée des 3 étapes : paiement, envoi de la vidéo, rapport PDF par email.
 * Avance toute seule quand elle est à l'écran ; cliquable ; figée si prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, CreditCard, FileText, Lock, Mail, Upload, Video } from "lucide-react";
import { ACCENT } from "./motion";

const STEPS = [
  {
    icon: CreditCard,
    title: "Choisis ton pack",
    text: "Paiement unique et sécurisé par Stripe. Ton lien d'envoi personnel arrive par email : pas de compte à créer.",
  },
  {
    icon: Video,
    title: "Filme et envoie ta série",
    text: "Une série, 60 secondes maximum, en .mp4 ou .mov. L'exercice est reconnu automatiquement et ta vidéo est analysée selon la méthode Achzod.",
  },
  {
    icon: FileText,
    title: "Reçois ton rapport PDF",
    text: "Ton rapport arrive par email en quelques minutes. Ta vidéo est supprimée après l'analyse.",
  },
];

const STEP_MS = 3600;

function PayScreen({ animate: run }: { animate: boolean }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Paiement</div>
      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
        <div className="text-xs font-bold text-white">FormCheck · 3 analyses</div>
        <div className="mt-1 text-2xl font-black text-white">24,90 €</div>
        <div className="text-[10px] text-white/60">8,30 € l'analyse</div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 rounded border border-white/10 bg-white/[0.03]" />
        <div className="flex gap-2">
          <div className="h-7 flex-1 rounded border border-white/10 bg-white/[0.03]" />
          <div className="h-7 flex-1 rounded border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
      <div className="relative mt-auto">
        <motion.div
          className="flex h-10 items-center justify-center gap-2 rounded text-xs font-black text-black"
          style={{ backgroundColor: ACCENT }}
          initial={run ? { scale: 1 } : false}
          animate={run ? { scale: [1, 0.96, 1] } : undefined}
          transition={{ delay: 0.9, duration: 0.35 }}
        >
          <Lock className="h-3.5 w-3.5" /> Payer 24,90 €
        </motion.div>
        <motion.div
          className="absolute inset-0 flex items-center justify-center gap-2 rounded bg-emerald-500 text-xs font-black text-black"
          initial={run ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: run ? 1.3 : 0, duration: 0.3 }}
        >
          <Check className="h-4 w-4" /> Paiement validé
        </motion.div>
      </div>
      <div className="mt-2 text-center text-[10px] text-white/50">Sécurisé par Stripe</div>
    </div>
  );
}

function UploadScreen({ animate: run }: { animate: boolean }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Envoi de ta vidéo</div>
      <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-white/20 bg-white/[0.03] p-3 text-center">
        <motion.div
          initial={run ? { y: 8, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(252,221,0,0.14)" }}
        >
          <Upload className="h-5 w-5" style={{ color: ACCENT }} />
        </motion.div>
        <div className="mt-3 text-xs font-bold text-white">ma-serie.mov</div>
        <div className="text-[10px] text-white/50">42 s · 1 série</div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: ACCENT }}
            initial={{ width: run ? "0%" : "100%" }}
            animate={{ width: "100%" }}
            transition={{ duration: run ? 1.6 : 0, ease: "easeInOut" }}
          />
        </div>
      </div>
      <motion.div
        className="mt-3 space-y-1.5"
        initial={run ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: run ? 1.7 : 0 }}
      >
        <div className="flex items-center gap-2 text-[11px] text-white">
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Exercice reconnu automatiquement
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white">
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Analyse selon la méthode Achzod
        </div>
      </motion.div>
    </div>
  );
}

function ReportScreen({ animate: run }: { animate: boolean }) {
  return (
    <div className="flex h-full flex-col p-3">
      <motion.div
        className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3 shadow-xl"
        initial={run ? { y: -30, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: ACCENT }}>
            <Mail className="h-3.5 w-3.5 text-black" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">APEXLABS · maintenant</div>
        </div>
        <div className="mt-2 text-xs font-bold text-white">Ton rapport FormCheck est prêt</div>
        <div className="text-[10px] text-white/60">Ton PDF est en pièce jointe.</div>
      </motion.div>
      <motion.div
        className="relative mt-3 flex-1 overflow-hidden rounded-md border border-white/10 bg-white"
        initial={run ? { opacity: 0, scale: 0.94 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: run ? 0.5 : 0, duration: 0.5 }}
      >
        <img
          src="/images/formcheck/rapport-page-score.webp"
          alt="Première page d'un rapport FormCheck"
          className="h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
        />
      </motion.div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-white/70">
        <FileText className="h-3.5 w-3.5" style={{ color: ACCENT }} /> Rapport_FormCheck.pdf
      </div>
    </div>
  );
}

export function StepsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || reduce || paused) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(id);
  }, [active, inView, reduce, paused]);

  const run = !reduce;
  const screens = [PayScreen, UploadScreen, ReportScreen];
  const Screen = screens[active];

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === active;
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setPaused(true);
                }}
                aria-current={isActive ? "step" : undefined}
                className={`relative w-full overflow-hidden rounded-sm border p-5 text-left transition-colors ${
                  isActive ? "border-[#FCDD00]/60 bg-[#FCDD00]/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${isActive ? "text-black" : "text-white"}`}
                    style={{ backgroundColor: isActive ? ACCENT : "rgba(255,255,255,0.08)" }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-white">
                      <Icon className="h-4 w-4" style={{ color: ACCENT }} />
                      {step.title}
                    </div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{step.text}</p>
                  </div>
                </div>
                {isActive && run && !paused && (
                  <motion.div
                    key={`bar-${active}`}
                    className="absolute bottom-0 left-0 h-0.5"
                    style={{ backgroundColor: ACCENT }}
                    initial={{ width: "0%" }}
                    animate={{ width: inView ? "100%" : "0%" }}
                    transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mx-auto">
        <div className="relative h-[460px] w-[236px] rounded-[38px] border border-white/15 bg-[#0B0B0B] p-2.5 shadow-[0_30px_80px_-20px_rgba(252,221,0,0.25)]">
          <div className="absolute left-1/2 top-3 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-[#111] pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="h-full"
                initial={run ? { opacity: 0, x: 24 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={run ? { opacity: 0, x: -24 } : undefined}
                transition={{ duration: 0.35 }}
              >
                <Screen animate={run} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Étape ${i + 1} : ${s.title}`}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span className="block h-1.5 rounded-full transition-all" style={{ width: i === active ? 22 : 8, backgroundColor: i === active ? ACCENT : "rgba(255,255,255,0.25)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
