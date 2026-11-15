/**
 * Illustration principale : silhouette en squat, vue de profil, avec lignes d'angle,
 * trajectoire de la charge, phases du mouvement et une erreur signalée (nuque relevée).
 * Une seule valeur animée pilote toute la cinématique : aucun re-render React pendant l'animation.
 */

import { useEffect, useId, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ACCENT } from "./motion";

type Pt = { x: number; y: number };
type Pose = {
  ankle: Pt;
  heel: Pt;
  toe: Pt;
  knee: Pt;
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  elbow: Pt;
  hand: Pt;
  bar: Pt;
  depth: number;
  neck: number;
  phase: string;
  rep: number;
};

const REPS = 3;
const SECONDS_PER_REP = 4.4;
const ANKLE: Pt = { x: 150, y: 330 };
const L_SHIN = 78;
const L_THIGH = 82;
const L_TORSO = 100;
const BAR_X = 162; // milieu du pied : la charge doit rester à la verticale de ce point
const REDUCED_FRAME = 1.68; // image figée pour prefers-reduced-motion : remontée, erreur visible

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function cycleState(c: number): { depth: number; neck: number; phase: string } {
  if (c < 0.12) return { depth: 0, neck: 0, phase: "Mise en place" };
  if (c < 0.47) return { depth: easeInOut((c - 0.12) / 0.35), neck: 0, phase: "Descente" };
  if (c < 0.55) return { depth: 1, neck: 0, phase: "Bas du mouvement" };
  if (c < 0.85) {
    const t = (c - 0.55) / 0.3;
    const neck = c > 0.58 && c < 0.82 ? Math.sin((Math.PI * (c - 0.58)) / 0.24) : 0;
    return { depth: 1 - easeInOut(t), neck, phase: "Remontée" };
  }
  return { depth: 0, neck: 0, phase: "Verrouillage" };
}

function computePose(total: number): Pose {
  const rep = Math.min(REPS, Math.floor(total) + 1);
  const c = total - Math.floor(total);
  const { depth, neck, phase } = cycleState(total >= REPS ? 0.99 : c);

  const aS = rad(4 + 30 * depth);
  const knee = { x: ANKLE.x + L_SHIN * Math.sin(aS), y: ANKLE.y - L_SHIN * Math.cos(aS) };
  const aT = rad(4 + 84 * depth);
  const hip = { x: knee.x - L_THIGH * Math.sin(aT), y: knee.y - L_THIGH * Math.cos(aT) };
  const aTr = Math.asin(clamp((BAR_X - hip.x) / L_TORSO, -0.2, 0.9));
  const shoulder = { x: hip.x + L_TORSO * Math.sin(aTr), y: hip.y - L_TORSO * Math.cos(aTr) };
  const aH = aTr - rad(34) * neck; // la nuque se relève : la tête bascule vers l'arrière
  const head = { x: shoulder.x + 24 * Math.sin(aH) + 4, y: shoulder.y - 24 * Math.cos(aH) };
  const bar = { x: shoulder.x - 3, y: shoulder.y + 3 };
  const elbow = { x: shoulder.x - 16 * Math.cos(aTr) - 6, y: shoulder.y + 16 + 10 * Math.sin(aTr) };
  const hand = { x: bar.x + 4, y: bar.y - 1 };

  return {
    ankle: ANKLE,
    heel: { x: ANKLE.x - 12, y: ANKLE.y + 4 },
    toe: { x: ANKLE.x + 36, y: ANKLE.y + 4 },
    knee,
    hip,
    shoulder,
    head,
    elbow,
    hand,
    bar,
    depth,
    neck,
    phase,
    rep,
  };
}

/** Arc d'angle au point J, entre les directions vers A et vers B. */
function arcPath(J: Pt, A: Pt, B: Pt, r: number): string {
  const ua = Math.atan2(A.y - J.y, A.x - J.x);
  const ub = Math.atan2(B.y - J.y, B.x - J.x);
  let diff = ub - ua;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const sweep = diff > 0 ? 1 : 0;
  const p1 = { x: J.x + r * Math.cos(ua), y: J.y + r * Math.sin(ua) };
  const p2 = { x: J.x + r * Math.cos(ub), y: J.y + r * Math.sin(ub) };
  return `M ${J.x.toFixed(1)} ${J.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`;
}

type Key = "ankle" | "heel" | "toe" | "knee" | "hip" | "shoulder" | "head" | "elbow" | "hand" | "bar";

function Segment({ pose, a, b, width, color, opacity = 1 }: { pose: MotionValue<Pose>; a: Key; b: Key; width: number; color: string; opacity?: number }) {
  const x1 = useTransform(pose, (p) => p[a].x);
  const y1 = useTransform(pose, (p) => p[a].y);
  const x2 = useTransform(pose, (p) => p[b].x);
  const y2 = useTransform(pose, (p) => p[b].y);
  return <motion.line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
}

function Joint({ pose, k, r = 4.5 }: { pose: MotionValue<Pose>; k: Key; r?: number }) {
  const cx = useTransform(pose, (p) => p[k].x);
  const cy = useTransform(pose, (p) => p[k].y);
  return <motion.circle cx={cx} cy={cy} r={r} fill={ACCENT} stroke="#000" strokeWidth={1.5} />;
}

function AngleArc({ pose, j, a, b, r }: { pose: MotionValue<Pose>; j: Key; a: Key; b: Key; r: number }) {
  const d = useTransform(pose, (p) => arcPath(p[j], p[a], p[b], r));
  return <motion.path d={d} fill={ACCENT} fillOpacity={0.16} stroke={ACCENT} strokeWidth={1.4} strokeOpacity={0.9} />;
}

function Chip({
  pose,
  anchor,
  dx,
  dy,
  label,
  width,
  tone = "accent",
  opacity,
}: {
  pose: MotionValue<Pose>;
  anchor: Key;
  dx: number;
  dy: number;
  label: string;
  width: number;
  tone?: "accent" | "alert";
  opacity?: MotionValue<number>;
}) {
  const chipX = (p: Pose) => clamp(p[anchor].x + dx, 6, 354 - width);
  const x = useTransform(pose, chipX);
  const y = useTransform(pose, (p) => p[anchor].y + dy);
  const lx = useTransform(pose, (p) => p[anchor].x);
  const ly = useTransform(pose, (p) => p[anchor].y);
  const ex = useTransform(pose, (p) => chipX(p) + (dx < 0 ? width : 0));
  const ey = useTransform(pose, (p) => p[anchor].y + dy + 11);
  const color = tone === "alert" ? "#FF6B5E" : ACCENT;
  return (
    <motion.g style={opacity ? { opacity } : undefined}>
      <motion.line x1={lx} y1={ly} x2={ex} y2={ey} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.8} />
      <motion.g style={{ x, y }}>
        <rect width={width} height={22} rx={3} fill="#0A0A0A" fillOpacity={0.92} stroke={color} strokeOpacity={0.85} />
        <circle cx={10} cy={11} r={3} fill={color} />
        <text x={18} y={15} fill="#fff" fontSize={10.5} fontWeight={700} letterSpacing={0.2}>
          {label}
        </text>
      </motion.g>
    </motion.g>
  );
}

export function BiomechanicsFigure({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px -10% 0px" });
  const reduce = useReducedMotion();
  const total = useMotionValue(reduce ? REDUCED_FRAME : 0);
  const pose = useTransform(total, computePose);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    if (reduce) {
      total.set(REDUCED_FRAME);
      return;
    }
    if (!inView) return;
    let stopped = false;
    let controls: ReturnType<typeof animate> | null = null;
    const run = () => {
      const from = total.get() >= REPS ? 0 : total.get();
      total.set(from);
      controls = animate(total, REPS, {
        duration: (REPS - from) * SECONDS_PER_REP,
        ease: "linear",
        onComplete: () => {
          if (stopped) return;
          total.set(0);
          run();
        },
      });
    };
    run();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [inView, reduce, total]);

  const neckOpacity = useTransform(pose, (p) => clamp(p.neck * 1.6, 0, 1));
  const headX = useTransform(pose, (p) => p.head.x);
  const headY = useTransform(pose, (p) => p.head.y);
  const barX = useTransform(pose, (p) => p.bar.x);
  const barY = useTransform(pose, (p) => p.bar.y);
  const scanY = useTransform(total, (t) => 40 + ((t * 1.3) % 1) * 300);
  const phase = useTransform(pose, (p) => p.phase);
  const repText = useTransform(pose, (p) => `Rep ${p.rep} / ${REPS}`);
  const depthWidth = useTransform(pose, (p) => 4 + p.depth * 76);

  return (
    <svg
      ref={ref}
      viewBox="0 0 360 400"
      className={className}
      role="img"
      aria-label="Illustration : analyse biomécanique d'un squat, avec angles du genou, de la hanche et du buste, trajectoire de la charge et une erreur de nuque signalée."
      style={{ fontFamily: "inherit" }}
    >
      <defs>
        <pattern id={`grid-${gid}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fff" strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
        <linearGradient id={`scan-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="360" height="400" fill={`url(#grid-${gid})`} />

      {/* Cadre de visée */}
      {[
        "M 14 34 L 14 14 L 34 14",
        "M 326 14 L 346 14 L 346 34",
        "M 14 366 L 14 386 L 34 386",
        "M 326 386 L 346 386 L 346 366",
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke={ACCENT} strokeWidth="2" strokeOpacity="0.7" />
      ))}

      {/* Balayage */}
      {!reduce && <motion.rect x="20" width="320" height="26" y={scanY} fill={`url(#scan-${gid})`} />}

      {/* Sol */}
      <line x1="40" y1="335" x2="320" y2="335" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" />

      {/* Trajectoire de la charge : verticale au milieu du pied */}
      <line x1={BAR_X} y1="56" x2={BAR_X} y2="335" stroke={ACCENT} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 5" />

      {/* Silhouette (volume) */}
      <g>
        <Segment pose={pose} a="ankle" b="knee" width={20} color="#fff" opacity={0.1} />
        <Segment pose={pose} a="knee" b="hip" width={26} color="#fff" opacity={0.1} />
        <Segment pose={pose} a="hip" b="shoulder" width={34} color="#fff" opacity={0.1} />
        <Segment pose={pose} a="shoulder" b="elbow" width={12} color="#fff" opacity={0.1} />
      </g>

      {/* Angles */}
      <AngleArc pose={pose} j="knee" a="hip" b="ankle" r={20} />
      <AngleArc pose={pose} j="hip" a="shoulder" b="knee" r={22} />

      {/* Squelette */}
      <Segment pose={pose} a="heel" b="toe" width={5} color="#fff" />
      <Segment pose={pose} a="ankle" b="knee" width={4} color="#fff" />
      <Segment pose={pose} a="knee" b="hip" width={4} color="#fff" />
      <Segment pose={pose} a="hip" b="shoulder" width={4} color="#fff" />
      <Segment pose={pose} a="shoulder" b="elbow" width={3.5} color="#fff" />
      <Segment pose={pose} a="elbow" b="hand" width={3.5} color="#fff" />

      {/* Tête */}
      <motion.circle cx={headX} cy={headY} r={13} fill="#0A0A0A" stroke="#fff" strokeWidth={3} />
      <motion.circle cx={headX} cy={headY} r={21} fill="none" stroke="#FF6B5E" strokeWidth={2} style={{ opacity: neckOpacity }} />

      {/* Barre (disque vu de profil) */}
      <motion.circle cx={barX} cy={barY} r={22} fill={ACCENT} fillOpacity={0.12} stroke={ACCENT} strokeWidth={3} />
      <motion.circle cx={barX} cy={barY} r={5} fill={ACCENT} />

      <Joint pose={pose} k="ankle" />
      <Joint pose={pose} k="knee" />
      <Joint pose={pose} k="hip" />
      <Joint pose={pose} k="shoulder" />

      {/* Annotations */}
      <Chip pose={pose} anchor="knee" dx={22} dy={-4} label="Flexion du genou" width={110} />
      <Chip pose={pose} anchor="hip" dx={-140} dy={16} label="Charnière de hanche" width={118} />
      <Chip pose={pose} anchor="shoulder" dx={-172} dy={14} label="Inclinaison du buste" width={124} />
      <Chip pose={pose} anchor="head" dx={22} dy={-34} label="À corriger : nuque relevée" width={152} tone="alert" opacity={neckOpacity} />

      <g>
        <line x1={BAR_X} y1="309" x2={BAR_X + 26} y2="309" stroke={ACCENT} strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
        <rect x={BAR_X + 26} y="298" width="146" height="22" rx="3" fill="#0A0A0A" fillOpacity="0.92" stroke={ACCENT} strokeOpacity="0.85" />
        <circle cx={BAR_X + 36} cy="309" r="3" fill={ACCENT} />
        <text x={BAR_X + 44} y="313" fill="#fff" fontSize="10.5" fontWeight="700">
          Trajectoire de la charge
        </text>
      </g>

      {/* HUD bas : phase, répétition, profondeur */}
      <g transform="translate(28 350)">
        <text x="0" y="12" fill={ACCENT} fontSize="10" fontWeight="800" letterSpacing="1.4">
          PHASE
        </text>
        <motion.text x="46" y="12" fill="#fff" fontSize="11" fontWeight="700">
          {phase}
        </motion.text>
        <motion.text x="304" y="12" textAnchor="end" fill="#fff" fillOpacity="0.75" fontSize="11" fontWeight="700">
          {repText}
        </motion.text>
        <text x="0" y="29" fill="#fff" fillOpacity="0.6" fontSize="9.5" fontWeight="700" letterSpacing="1.2">
          AMPLITUDE
        </text>
        <rect x="70" y="22" width="80" height="6" rx="3" fill="#fff" fillOpacity="0.12" />
        <motion.rect x="70" y="22" height="6" rx="3" fill={ACCENT} width={depthWidth} />
      </g>
    </svg>
  );
}
