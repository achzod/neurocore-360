/**
 * AnimatedReportPreview
 * Framer-motion powered interactive report preview.
 * Replaces static CSS @keyframes autoScroll previews on offer pages.
 *
 * Usage:
 * <AnimatedReportPreview
 *   score={78}
 *   scoreColor="rgb(2,121,232)"
 *   urlBar="apexlabs.achzodcoaching.com/analysis/rapport-demo"
 *   panels={[{ name: "Hormones", score: 72 }, ...]}
 *   alert={{ title: "Testosterone libre: 8.2 pg/mL", detail: "Range optimal: 15-25 pg/mL" }}
 *   biomarkers={[{ name: "Testosterone totale", value: "485 ng/dL", range: "600-900", status: "low" }, ...]}
 *   protocol={{ title: "Phase 1 — Semaines 1-4", items: ["Item 1", "Item 2"] }}
 *   extras={[{ title: "Stack Supplements", detail: "Magnesium 300mg, Ashwagandha 600mg" }]}
 * />
 */

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportPreviewProps {
  score: number;
  scoreColor: string;
  urlBar: string;
  panels: Array<{ name: string; score: number }>;
  alert?: { title: string; detail: string };
  biomarkers?: Array<{
    name: string;
    value: string;
    range: string;
    status: "optimal" | "low" | "critical" | "high";
  }>;
  protocol?: { title: string; items: string[] };
  extras?: Array<{ title: string; detail: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreToColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

function statusStyles(status: "optimal" | "low" | "critical" | "high"): string {
  switch (status) {
    case "critical":
      return "bg-red-500/20 text-red-400";
    case "low":
      return "bg-yellow-500/20 text-yellow-400";
    case "high":
      return "bg-orange-500/20 text-orange-400";
    default:
      return "bg-green-500/20 text-green-400";
  }
}

// ---------------------------------------------------------------------------
// Animated score counter
// ---------------------------------------------------------------------------

function ScoreCounter({
  target,
  color,
  inView,
}: {
  target: number;
  color: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const duration = 1500;
    const stepTime = duration / target;
    const timer = setInterval(() => {
      current++;
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span className="text-6xl font-black" style={{ color }}>
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnimatedReportPreview({
  score,
  scoreColor,
  urlBar,
  panels,
  alert,
  biomarkers,
  protocol,
  extras,
}: ReportPreviewProps) {
  // inView detection — trigger once when the container enters the viewport
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  // Continuous scroll animation — starts after the entrance sequence (5s)
  // We estimate the scrollable content height so the y animation feels proportional.
  // A fixed large negative value is safe since overflow:hidden clips it.
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(800);

  useEffect(() => {
    if (contentRef.current) {
      const totalHeight = contentRef.current.scrollHeight;
      // visible window is 520px, browser chrome takes 40px → 480px visible
      const scrollable = Math.max(0, totalHeight - 480);
      setMaxScroll(scrollable);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Stagger helpers
  // ---------------------------------------------------------------------------
  const panelVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: (i: number) => ({
      scaleX: 1,
      opacity: 1,
      transition: { delay: 1.0 + i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  const alertVariants = {
    hidden: { x: 50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { delay: 2.0, duration: 0.6, ease: "easeOut" as const } },
  };

  const biomarkerVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: 3.0 + i * 0.08, duration: 0.4, ease: "easeOut" as const },
    }),
  };

  const protocolVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: (i: number) => ({
      x: 0,
      opacity: 1,
      transition: { delay: 4.0 + i * 0.12, duration: 0.45, ease: "easeOut" as const },
    }),
  };

  const extrasVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: 4.6 + i * 0.15, duration: 0.45, ease: "easeOut" as const },
    }),
  };

  return (
    <div ref={sectionRef} className="relative rounded-2xl border border-white/15 overflow-hidden" style={{ height: "520px" }}>
      {/* Top fade mask — sits above scrolling content, below browser chrome */}
      <div className="absolute top-10 left-0 right-0 h-16 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none" />
      {/* Bottom fade mask */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none" />

      {/* Browser chrome — STATIC, never moves */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-[#1a1a1a] border-b border-white/10 z-30 flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <div className="ml-4 flex-1 h-6 rounded bg-white/5 flex items-center px-3">
          <span className="text-[10px] text-white/30 font-mono">{urlBar}</span>
        </div>
      </div>

      {/* Scrolling content wrapper — entrance animations + continuous loop scroll */}
      <motion.div
        ref={contentRef}
        className="pt-10"
        animate={inView ? { y: [0, -maxScroll, 0] } : { y: 0 }}
        transition={
          inView
            ? {
                y: {
                  duration: 22,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 5,
                  times: [0, 0.5, 1],
                },
              }
            : {}
        }
      >
        <div className="bg-[#0a0a0a] p-8 space-y-8">

          {/* ----------------------------------------------------------------
              Score header — counter animates 0→target in first 1.5s
          ---------------------------------------------------------------- */}
          <motion.div
            className="border border-white/10 rounded-xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Report Preview</p>
            <div className="flex items-end gap-4 mb-4">
              <ScoreCounter target={score} color={scoreColor} inView={inView} />
              <span className="text-2xl text-white/40 mb-2">/100</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: scoreColor }}
                initial={{ width: "0%" }}
                animate={inView ? { width: `${score}%` } : {}}
                transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* ----------------------------------------------------------------
              Panel bars — stagger 1.0–2.0s
          ---------------------------------------------------------------- */}
          <div className={`grid gap-3 ${panels.length > 6 ? "grid-cols-2" : "grid-cols-3"}`}>
            {panels.map((panel, i) => {
              const barColor = scoreToColor(panel.score);
              return (
                <motion.div
                  key={panel.name}
                  className="border border-white/10 rounded-lg p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 1.0 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-white/80">{panel.name}</span>
                    <span className="text-sm font-bold" style={{ color: barColor }}>{panel.score}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full origin-left"
                      style={{ backgroundColor: barColor }}
                      variants={panelVariants}
                      initial="hidden"
                      animate={inView ? "visible" : "hidden"}
                      custom={i}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ----------------------------------------------------------------
              Alert card — slides in from right at 2.0s
          ---------------------------------------------------------------- */}
          {alert && (
            <motion.div
              className="border border-red-500/30 bg-red-500/5 rounded-xl p-5"
              variants={alertVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Alerte prioritaire</span>
              </div>
              <p className="text-sm text-white/70">
                <strong className="text-white">{alert.title}</strong>
                {alert.detail ? ` — ${alert.detail}` : ""}
              </p>
            </motion.div>
          )}

          {/* ----------------------------------------------------------------
              Biomarker rows — fade in staggered at 3.0s
          ---------------------------------------------------------------- */}
          {biomarkers && biomarkers.length > 0 && (
            <motion.div
              className="border border-white/10 rounded-xl p-5"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 2.8, duration: 0.3 }}
            >
              <p className="text-xs uppercase tracking-wider text-white/40 mb-4">Biomarqueurs — Detail</p>
              {biomarkers.map((marker, i) => (
                <motion.div
                  key={marker.name}
                  className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                  variants={biomarkerVariants}
                  initial="hidden"
                  animate={inView ? "visible" : "hidden"}
                  custom={i}
                >
                  <span className="text-sm text-white/70">{marker.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-white">{marker.value}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusStyles(marker.status)}`}>
                      {marker.range}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ----------------------------------------------------------------
              Extras (photo analysis, wearable data, supplement stack)
              Rendered before protocol so protocol is always last (most readable)
          ---------------------------------------------------------------- */}
          {extras && extras.map((extra, i) => (
            <motion.div
              key={extra.title}
              className="border border-white/10 rounded-xl p-5"
              variants={extrasVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: scoreColor }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: scoreColor }}>
                  {extra.title}
                </span>
              </div>
              <p className="text-sm text-white/70">{extra.detail}</p>
            </motion.div>
          ))}

          {/* ----------------------------------------------------------------
              Protocol items — appear with checkmarks at 4.0s
          ---------------------------------------------------------------- */}
          {protocol && (
            <motion.div
              className="border border-white/10 rounded-xl p-5"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 3.8, duration: 0.3 }}
            >
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: scoreColor }}>
                {protocol.title}
              </p>
              <div className="space-y-3">
                {protocol.items.map((item, i) => (
                  <motion.div
                    key={item}
                    className="flex items-start gap-2"
                    variants={protocolVariants}
                    initial="hidden"
                    animate={inView ? "visible" : "hidden"}
                    custom={i}
                  >
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: scoreColor }} />
                    <span className="text-sm text-white/60">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Spacer so the continuous scroll has room to travel */}
          <div className="h-32" />
        </div>
      </motion.div>
    </div>
  );
}
