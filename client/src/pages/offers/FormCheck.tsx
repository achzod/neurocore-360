/**
 * APEXLABS - FormCheck
 * Biomechanical Analysis via WhatsApp - Showcase Page
 */

import React, { useRef, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Smartphone, MessageCircle, FileText, Target, Ruler, Dumbbell, X } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

const ACCENT = "#25D366";

// ============================================================================
// FAQ ACCORDION ITEM
// ============================================================================
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/10"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-8 py-8 text-left transition-colors"
        style={{ ["--hover-color" as string]: ACCENT }}
      >
        <h3 className="text-lg font-semibold text-white">{q}</h3>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0 pt-1">
          <ChevronDown className="h-5 w-5" style={{ color: ACCENT }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="pb-8 text-base leading-relaxed text-white/60">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - How It Works (3 Steps Flow)
// ============================================================================
function HowItWorksVisual() {
  const steps = [
    { icon: Smartphone, label: "FILME" },
    { icon: MessageCircle, label: "ENVOIE" },
    { icon: FileText, label: "REÇOIS" },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#25D366]/10 via-black to-[#25D366]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,211,102,0.1)_0%,_transparent_70%)]" />

      <div className="flex items-center gap-4 px-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-4">
            <motion.div
              className="flex flex-col items-center justify-center p-5 bg-black/40 border border-white/10 rounded-sm"
              animate={{
                scale: [1, 1.08, 1],
                borderColor: [`rgba(255,255,255,0.1)`, `${ACCENT}60`, `rgba(255,255,255,0.1)`],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
            >
              <step.icon className="w-8 h-8 mb-2" style={{ color: ACCENT }} />
              <span className="text-[10px] font-mono text-white/60">{step.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                className="flex items-center"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.6 }}
              >
                <ArrowRight className="w-5 h-5" style={{ color: `${ACCENT}80` }} />
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 text-xs font-mono" style={{ color: `${ACCENT}CC` }}>
        <div>3 ETAPES</div>
        <motion.div
          className="text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          SIMPLE & RAPIDE
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Stick Figure with Joint Angles
// ============================================================================
function calculateAngle(p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) {
  const bax = p1x - p2x;
  const bay = p1y - p2y;
  const bcx = p3x - p2x;
  const bcy = p3y - p2y;
  const dot = bax * bcx + bay * bcy;
  const magBA = Math.sqrt(bax * bax + bay * bay);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy);
  const angle = Math.acos(dot / (magBA * magBC)) * (180 / Math.PI);
  return `${Math.round(angle)}°`;
}

// --- FORMCHECK ANIMATION COMPONENTS (from formcccc reference) ---

const FC_EXERCISES = [
  { id: 'squat', name: 'Squat', target: 'Quadriceps, Fessiers', description: "Analyse de la flexion et de l'extension de la hanche et du genou.", duration: 6000, color: '#10b981' },
  { id: 'deadlift', name: 'Souleve de terre', target: 'Ischio-jambiers, Dos', description: 'Controle de la charniere de hanche et du maintien de la colonne.', duration: 6000, color: '#3b82f6' },
  { id: 'bench', name: 'Developpe couche', target: 'Pectoraux, Triceps', description: "Suivi de la trajectoire de la barre et de l'angle du coude.", duration: 6000, color: '#8b5cf6' },
];

const ParticleSystem = ({ color }: { color: string }) => {
  const particles = React.useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 3 + 1, duration: Math.random() * 2 + 2, delay: Math.random() * 2,
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ backgroundColor: color, width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, boxShadow: `0 0 ${p.size * 2}px ${color}` }}
          animate={{ y: [0, -80], opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

const Bone = ({ x1, y1, x2, y2, color }: any) => (
  <motion.line animate={{ x1, y1, x2, y2, opacity: [0.6, 1, 0.6] }}
    transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    stroke={color} strokeWidth="6" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
);

const FcJoint = ({ cx, cy, color }: any) => (
  <motion.circle animate={{ cx, cy, opacity: [0.7, 1, 0.7] }}
    transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
    r="5" fill="#fff" stroke={color} strokeWidth="3" className="drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
);

const SquatAnim = ({ color }: { color: string }) => {
  const t = { duration: 1.5, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
      <motion.line animate={{ x1: [70, 70], y1: [60, 100], x2: [130, 130], y2: [60, 100] }} transition={t} stroke="#94a3b8" strokeWidth="4" />
      <Bone x1={[100, 100]} y1={[60, 100]} x2={[100, 80]} y2={[120, 150]} color={color} />
      <Bone x1={[100, 80]} y1={[120, 150]} x2={[100, 120]} y2={[160, 150]} color={color} />
      <Bone x1={[100, 120]} y1={[160, 150]} x2={[100, 100]} y2={[190, 190]} color={color} />
      <Bone x1={[100, 100]} y1={[60, 100]} x2={[110, 110]} y2={[80, 120]} color={color} />
      <Bone x1={[110, 110]} y1={[80, 120]} x2={[120, 120]} y2={[60, 100]} color={color} />
      <FcJoint cx={[100, 100]} cy={[60, 100]} color={color} />
      <FcJoint cx={[100, 80]} cy={[120, 150]} color={color} />
      <FcJoint cx={[100, 120]} cy={[160, 150]} color={color} />
      <FcJoint cx={[100, 100]} cy={[190, 190]} color={color} />
      <FcJoint cx={[110, 110]} cy={[80, 120]} color={color} />
      <motion.circle animate={{ cx: [100, 100], cy: [40, 80] }} transition={t} r="12" fill="transparent" stroke={color} strokeWidth="4" />
    </svg>
  );
};

const DeadliftAnim = ({ color }: { color: string }) => {
  const t = { duration: 1.5, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
      <motion.line animate={{ x1: [70, 70], y1: [160, 120], x2: [130, 130], y2: [160, 120] }} transition={t} stroke="#94a3b8" strokeWidth="4" />
      <motion.circle animate={{ cx: [70, 70], cy: [160, 120] }} transition={t} r="8" fill="#64748b" />
      <motion.circle animate={{ cx: [130, 130], cy: [160, 120] }} transition={t} r="8" fill="#64748b" />
      <Bone x1={[130, 100]} y1={[100, 60]} x2={[70, 100]} y2={[140, 120]} color={color} />
      <Bone x1={[70, 100]} y1={[140, 120]} x2={[100, 100]} y2={[160, 160]} color={color} />
      <Bone x1={[100, 100]} y1={[160, 160]} x2={[100, 100]} y2={[190, 190]} color={color} />
      <Bone x1={[130, 100]} y1={[100, 60]} x2={[100, 100]} y2={[160, 120]} color={color} />
      <FcJoint cx={[130, 100]} cy={[100, 60]} color={color} />
      <FcJoint cx={[70, 100]} cy={[140, 120]} color={color} />
      <FcJoint cx={[100, 100]} cy={[160, 160]} color={color} />
      <FcJoint cx={[100, 100]} cy={[190, 190]} color={color} />
      <motion.circle animate={{ cx: [145, 100], cy: [80, 40] }} transition={t} r="12" fill="transparent" stroke={color} strokeWidth="4" />
    </svg>
  );
};

const BenchAnim = ({ color }: { color: string }) => {
  const t = { duration: 1.5, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
      <line x1="30" y1="160" x2="150" y2="160" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
      <line x1="50" y1="160" x2="50" y2="190" stroke="#334155" strokeWidth="6" />
      <line x1="130" y1="160" x2="130" y2="190" stroke="#334155" strokeWidth="6" />
      <motion.line animate={{ x1: [50, 50], y1: [140, 70], x2: [110, 110], y2: [140, 70] }} transition={t} stroke="#94a3b8" strokeWidth="6" />
      <Bone x1={[80, 80]} y1={[150, 150]} x2={[130, 130]} y2={[150, 150]} color={color} />
      <Bone x1={[130, 130]} y1={[150, 150]} x2={[160, 160]} y2={[130, 130]} color={color} />
      <Bone x1={[160, 160]} y1={[130, 130]} x2={[160, 160]} y2={[190, 190]} color={color} />
      <Bone x1={[80, 80]} y1={[150, 150]} x2={[80, 80]} y2={[180, 110]} color={color} />
      <Bone x1={[80, 80]} y1={[180, 110]} x2={[80, 80]} y2={[140, 70]} color={color} />
      <FcJoint cx={[80, 80]} cy={[150, 150]} color={color} />
      <FcJoint cx={[130, 130]} cy={[150, 150]} color={color} />
      <FcJoint cx={[160, 160]} cy={[130, 130]} color={color} />
      <FcJoint cx={[80, 80]} cy={[180, 110]} color={color} />
      <FcJoint cx={[80, 80]} cy={[140, 70]} color={color} />
      <motion.circle animate={{ cx: [50, 50], cy: [150, 150] }} transition={t} r="12" fill="transparent" stroke={color} strokeWidth="4" />
    </svg>
  );
};

function BiomechanicFigure() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [metric, setMetric] = useState(85);
  const ex = FC_EXERCISES[activeIdx];

  useEffect(() => {
    const interval = setInterval(() => setActiveIdx(c => (c + 1) % FC_EXERCISES.length), ex.duration);
    return () => clearInterval(interval);
  }, [activeIdx, ex.duration]);

  useEffect(() => {
    const di = setInterval(() => setMetric(Math.floor(Math.random() * 15) + 80), 500);
    return () => clearInterval(di);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Ambient glow */}
      <motion.div className="absolute inset-0 m-auto w-3/4 h-3/4 rounded-full blur-[100px] pointer-events-none z-0"
        style={{ backgroundColor: ex.color }}
        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.05, 0.2, 0.05] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />

      {/* Particles */}
      <ParticleSystem color={ex.color} />

      {/* Scanning line */}
      <motion.div className="absolute left-0 right-0 h-1 blur-sm z-10"
        style={{ backgroundColor: `${ex.color}30` }}
        animate={{ top: ['10%', '90%', '10%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />

      {/* Top overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-mono text-[10px] text-green-400 uppercase tracking-widest">Online</span>
      </div>
      <div className="absolute top-4 right-4 z-20 text-right">
        <div className="font-mono text-sm text-white">SCORE: <span style={{ color: ACCENT }}>{metric}</span>/100</div>
        <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Form Analysis</div>
      </div>

      {/* Animation */}
      <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-[250px] aspect-square">
          <AnimatePresence mode="wait">
            <motion.div key={ex.id}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
              className="w-full h-full">
              {ex.id === 'squat' && <SquatAnim color={ex.color} />}
              {ex.id === 'deadlift' && <DeadliftAnim color={ex.color} />}
              {ex.id === 'bench' && <BenchAnim color={ex.color} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
        <AnimatePresence mode="wait">
          <motion.div key={ex.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="font-mono text-xs text-gray-400 mb-1">{ex.target.toUpperCase()}</div>
            <div className="text-white font-bold text-sm">{ex.name}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AngleAnalysisVisual() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fakeMetric, setFakeMetric] = useState(85);
  const activeExercise = FC_EXERCISES[activeIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % FC_EXERCISES.length);
    }, FC_EXERCISES[activeIndex].duration);
    return () => clearInterval(interval);
  }, [activeIndex]);

  useEffect(() => {
    const dataInterval = setInterval(() => {
      setFakeMetric(Math.floor(Math.random() * 15) + 80);
    }, 500);
    return () => clearInterval(dataInterval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      {/* Left: Animation Display */}
      <div className="lg:col-span-8 h-[500px] relative rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden flex flex-col">
        {/* Top overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: activeExercise.color }} />
              <span className="font-mono text-xs text-gray-300">CIBLE: {activeExercise.target.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-xs text-gray-300">PRECISION: {fakeMetric}%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-light text-white tracking-tighter">
              00:{Math.floor(fakeMetric / 2)}
            </div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Temps d'analyse</div>
          </div>
        </div>

        {/* Animation */}
        <div className="flex-1 relative flex items-center justify-center p-8">
          <motion.div className="absolute inset-0 m-auto w-3/4 h-3/4 rounded-full blur-[100px] pointer-events-none z-0"
            style={{ backgroundColor: activeExercise.color }}
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          <ParticleSystem color={activeExercise.color} />
          <motion.div className="absolute left-0 right-0 h-1 blur-sm z-10"
            style={{ backgroundColor: `${activeExercise.color}40` }}
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
          <div className="w-full max-w-xs aspect-square relative z-10">
            <AnimatePresence mode="wait">
              <motion.div key={activeExercise.id}
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0">
                {activeExercise.id === 'squat' && <SquatAnim color={activeExercise.color} />}
                {activeExercise.id === 'deadlift' && <DeadliftAnim color={activeExercise.color} />}
                {activeExercise.id === 'bench' && <BenchAnim color={activeExercise.color} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-20">
          <AnimatePresence mode="wait">
            <motion.div key={activeExercise.id}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{activeExercise.name}</h3>
              <p className="text-gray-400 text-sm">{activeExercise.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Exercise Sequence */}
      <div className="lg:col-span-4 space-y-3">
        <div className="mb-6">
          <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">Sequence en cours</h4>
          <p className="text-white font-medium text-sm">Analyse automatique (3 exercices)</p>
        </div>

        {FC_EXERCISES.map((exercise, index) => {
          const isActive = index === activeIndex;
          return (
            <div key={exercise.id}
              className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
                isActive ? 'bg-[#0a0a0a] border-white/20 shadow-lg' : 'bg-[#0a0a0a]/30 border-white/5 opacity-60'
              }`}>
              {isActive && (
                <motion.div className="absolute inset-y-0 left-0 z-0"
                  style={{ backgroundColor: `${exercise.color}15` }}
                  initial={{ width: '0%' }} animate={{ width: '100%' }}
                  transition={{ duration: exercise.duration / 1000, ease: "linear" }} />
              )}
              <div className="relative z-10 p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  isActive ? 'border-white/20' : 'border-white/5'
                }`} style={isActive ? { backgroundColor: `${exercise.color}20` } : {}}>
                  <Dumbbell className="w-4 h-4" style={{ color: isActive ? exercise.color : '#666' }} />
                </div>
                <div className="flex-1">
                  <h5 className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>{exercise.name}</h5>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {isActive ? 'ANALYSE EN COURS...' : index < activeIndex ? 'TERMINE' : 'EN ATTENTE'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* System Status */}
        <div className="mt-6 p-4 rounded-xl border border-white/5 bg-[#0a0a0a]/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-gray-400">ETAT DU CAPTEUR</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: ACCENT, backgroundColor: `${ACCENT}15` }}>OPTIMAL</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono"><span className="text-gray-500">LATENCE</span><span className="text-white">12ms</span></div>
            <div className="flex justify-between text-[10px] font-mono"><span className="text-gray-500">IPS</span><span className="text-white">60</span></div>
            <div className="flex justify-between text-[10px] font-mono"><span className="text-gray-500">POINTS SUIVIS</span><span className="text-white">33</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Exercise Grid
// ============================================================================
function ExerciseGridVisual() {
  const HYROX_COLOR = "#FF6B00";
  const exercises: { name: string; hyrox?: boolean }[] = [
    { name: "SQUAT" }, { name: "DEADLIFT" }, { name: "BENCH" }, { name: "OHP" },
    { name: "ROW" }, { name: "PULL-UP" }, { name: "LUNGE" }, { name: "RDL" },
    { name: "CURL" }, { name: "PRESS" }, { name: "DIP" }, { name: "THRUSTER" },
    { name: "CLEAN" }, { name: "SNATCH" }, { name: "SWING" }, { name: "PLANK" },
    { name: "WALL BALL", hyrox: true }, { name: "SKI ERG", hyrox: true }, { name: "SLED PUSH", hyrox: true }, { name: "BURPEE B.O.", hyrox: true },
  ];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#25D366]/10 via-black to-[#25D366]/5 overflow-hidden rounded-sm border border-white/5 p-4">
      <div className="grid grid-cols-4 gap-2 h-full">
        {exercises.map((exercise, i) => (
          <motion.div
            key={i}
            className={`flex items-center justify-center bg-black/40 border rounded text-[8px] sm:text-[9px] font-mono ${exercise.hyrox ? 'border-[#FF6B00]/30' : 'border-white/10'} text-white/50`}
            animate={{
              borderColor: exercise.hyrox
                ? [`${HYROX_COLOR}30`, `${HYROX_COLOR}AA`, `${HYROX_COLOR}30`]
                : [`rgba(255,255,255,0.1)`, `${ACCENT}60`, `rgba(255,255,255,0.1)`],
              color: exercise.hyrox
                ? [`${HYROX_COLOR}80`, `${HYROX_COLOR}`, `${HYROX_COLOR}80`]
                : [`rgba(255,255,255,0.5)`, `${ACCENT}CC`, `rgba(255,255,255,0.5)`],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }}
          >
            {exercise.name}
          </motion.div>
        ))}
      </div>

      {/* Hyrox badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[#FF6B00]/15 border border-[#FF6B00]/30">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
        <span className="text-[8px] font-mono font-bold text-[#FF6B00] tracking-widest">HYROX</span>
      </div>

      <div className="absolute bottom-4 right-4 text-xs font-mono text-right" style={{ color: `${ACCENT}CC` }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          TOUS EXERCICES
        </motion.div>
        <div className="text-white/40">SUPPORTES</div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATED VISUALIZATION - Score Gauge
// ============================================================================
function ScoreGaugeVisual() {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#25D366]/10 via-black to-[#25D366]/5 flex items-center justify-center overflow-hidden rounded-sm border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,211,102,0.1)_0%,_transparent_70%)]" />

      <div className="flex flex-col items-center">
        {/* Semi-circular gauge */}
        <svg viewBox="0 0 200 120" className="w-48">
          {/* Background arc */}
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Animated progress arc */}
          <motion.path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke={ACCENT}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="252"
            animate={{ strokeDashoffset: [252, 33, 252] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Center score */}
          <motion.text
            x="100" y="95"
            textAnchor="middle"
            fill="white"
            fontSize="36"
            fontWeight="bold"
            fontFamily="monospace"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            87
          </motion.text>
          <text
            x="100" y="112"
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
            fontFamily="monospace"
          >
            / 100
          </text>
        </svg>

        {/* Sub-scores */}
        <div className="flex gap-4 mt-4">
          {[
            { label: "SECURITE", value: 92 },
            { label: "EFFICACITE", value: 85 },
            { label: "CONTROLE", value: 88 },
            { label: "SYMETRIE", value: 81 },
          ].map((sub, i) => (
            <motion.div
              key={i}
              className="text-center"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              <div className="text-sm font-bold font-mono" style={{ color: ACCENT }}>{sub.value}</div>
              <div className="text-[7px] font-mono text-white/40">{sub.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 text-xs font-mono" style={{ color: `${ACCENT}CC` }}>
        <div>FORM SCORE</div>
        <motion.div
          className="text-white/60"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          4 SOUS-SCORES
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function FormCheck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div ref={containerRef} className="bg-[#050505] min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px]" style={{ background: `${ACCENT}08` }} />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(${ACCENT}4D 1px, transparent 1px), linear-gradient(90deg, ${ACCENT}4D 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-sm px-4 py-2 mb-8"
            style={{ background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33` }}
          >
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: ACCENT }}>[ NOUVEAU — 100% WHATSAPP ]</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8"
          >
            Form
            <br />
            <span style={{ color: ACCENT }}>Check.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Envoie ta video d'exercice par WhatsApp. Recois une analyse biomecanique
            complete avec score, corrections et exercices correctifs. En quelques minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <div className="text-center">
              <span className="inline-block px-6 py-3 rounded-sm text-xl sm:text-2xl font-bold uppercase tracking-widest text-white border-2" style={{ borderColor: ACCENT, background: `${ACCENT}1A` }}>
                1ere analyse gratuite
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <span
              aria-disabled="true"
              className="inline-flex items-center gap-3 text-white/70 font-semibold text-base px-8 py-4 rounded-sm cursor-not-allowed select-none border border-white/15 bg-white/[0.04]"
            >
              Indisponible pour le moment
            </span>
            <a
              href="#packs"
              className="inline-flex items-center gap-2 text-white/60 font-semibold text-base px-8 py-4 rounded-sm border border-white/20 hover:border-white/40 transition-all"
            >
              Voir les offres
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white/60 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* REPORT SHOWCASE — Animated scroll */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
                Le rapport
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Pas un simple score.
                <br />
                <span style={{ color: ACCENT }}>Un vrai rapport.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Chaque video genere un rapport HTML complet, consultable sur mobile ou desktop.
                Score global, corrections prioritaires, analyse rep par rep, decomposition du score
                et plan d'action concret.
              </p>
              <ul className="space-y-4">
                {[
                  "Score global sur 100 avec jauge visuelle",
                  "4 sous-scores : securite, efficacite, controle, symetrie",
                  "Corrections classees par impact biomecanique",
                  "Analyse detaillee de chaque repetition",
                  "Point biomecanique educatif",
                  "Plan d'action en 3 points",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {/* Phone mockup with scrolling report */}
              <div className="relative mx-auto" style={{ maxWidth: 320 }}>
                {/* Phone frame */}
                <div className="rounded-[2.5rem] border-[3px] border-white/20 bg-black p-2 shadow-2xl" style={{ boxShadow: `0 0 80px ${ACCENT}1A` }}>
                  {/* Notch */}
                  <div className="relative rounded-[2rem] overflow-hidden bg-[#0a0a0a]" style={{ height: 560 }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />
                    {/* Scrolling report content */}
                    <div className="absolute inset-0 overflow-hidden">
                      <motion.div
                        animate={{ y: [0, -1200, -1200, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", times: [0, 0.45, 0.55, 1] }}
                        className="px-4 pt-10 pb-8"
                      >
                        {/* Report header */}
                        <div className="text-center mb-6">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">FORMCHECK</div>
                          <div className="text-white font-bold text-sm mb-1">Developpe incline machine</div>
                          <div className="text-white/40 text-xs">27 mars 2026</div>
                        </div>
                        {/* Score gauge */}
                        <div className="flex justify-center mb-6">
                          <div className="relative w-28 h-28">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                              <circle cx="50" cy="50" r="42" fill="none" stroke={ACCENT} strokeWidth="8" strokeDasharray={`${75 * 2.64} ${264 - 75 * 2.64}`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-white text-2xl font-black">75</span>
                              <span className="text-white/40 text-[10px]">/100</span>
                            </div>
                          </div>
                        </div>
                        {/* Sub-scores */}
                        <div className="grid grid-cols-4 gap-1 mb-6">
                          {[{l:"SEC",v:32,m:40},{l:"EFF",v:22,m:30},{l:"CTR",v:15,m:20},{l:"SYM",v:6,m:10}].map((s,i) => (
                            <div key={i} className="text-center p-2 rounded bg-white/5">
                              <div className="text-[9px] font-mono text-white/40">{s.l}</div>
                              <div className="text-white font-bold text-sm">{s.v}<span className="text-white/30 text-[10px]">/{s.m}</span></div>
                            </div>
                          ))}
                        </div>
                        {/* Section: Synthese */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Synthese</div>
                          <div className="text-white/60 text-xs leading-relaxed">
                            Tu effectues 15 repetitions en developpe incline convergent unilateral. L'execution est globalement solide avec une bonne amplitude articulaire. La fatigue se manifeste a partir de la 12eme repetition avec rotation du tronc.
                          </div>
                        </div>
                        {/* Section: Points Forts */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Points Forts</div>
                          <div className="space-y-2">
                            {["Stabilite du buste remarquable", "Amplitude complete respectee", "Controle excentrique maitrise"].map((p,i) => (
                              <div key={i} className="flex gap-2 text-xs text-white/60">
                                <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: ACCENT }} />
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Section: Corrections */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2 text-orange-400">Corrections Prioritaires</div>
                          <div className="space-y-3">
                            {[
                              {n:1, t:"Rotation du tronc", d:"Compensation de fatigue sur l'axe longitudinal"},
                              {n:2, t:"Elevation scapulaire", d:"Engagement compensatoire du trapeze superieur"},
                              {n:3, t:"Verrouillage coudes", d:"Lockout incomplet en fin de serie"},
                            ].map((c) => (
                              <div key={c.n} className="flex gap-2">
                                <div className="w-5 h-5 rounded-full bg-orange-400/20 text-orange-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold">{c.n}</div>
                                <div>
                                  <div className="text-white text-xs font-semibold">{c.t}</div>
                                  <div className="text-white/40 text-[10px]">{c.d}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Section: Rep par Rep */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Analyse Rep par Rep</div>
                          <div className="space-y-1">
                            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((r) => (
                              <div key={r} className="flex items-center gap-2 py-1 border-b border-white/5">
                                <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: r <= 12 ? `${ACCENT}20` : 'rgba(251,146,60,0.2)', color: r <= 12 ? ACCENT : '#fb923c' }}>{r}</span>
                                <span className="text-white/50 text-[10px] font-mono">{`0:${String((r-1)*3).padStart(2,'0')} - 0:${String(r*3).padStart(2,'0')}`}</span>
                                <span className="text-white/40 text-[10px] flex-1 truncate">{r <= 8 ? 'Execution propre' : r <= 12 ? 'Fatigue visible' : 'Compensation'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Section: Score Detaille */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Score Detaille</div>
                          {[{l:"Securite",v:32,m:40},{l:"Efficacite technique",v:22,m:30},{l:"Controle et tempo",v:15,m:20},{l:"Symetrie",v:6,m:10}].map((s,i) => (
                            <div key={i} className="mb-3">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-white/60">{s.l}</span>
                                <span className="text-white font-bold">{s.v}/{s.m}</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(s.v/s.m)*100}%`, background: ACCENT }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Section: Plan Action */}
                        <div className="mb-5">
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Plan d'Action</div>
                          <div className="space-y-2">
                            {["Reduis la charge de 10% pour eliminer les compensations", "Ajoute une pre-activation scapulaire avant chaque rep", "Filme-toi de 3/4 arriere pour le prochain rapport"].map((a,i) => (
                              <div key={i} className="flex gap-2 text-xs text-white/60">
                                <div className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center flex-shrink-0 font-bold" style={{ background: `${ACCENT}20`, color: ACCENT }}>{i+1}</div>
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute -inset-8 -z-10 rounded-[3rem] blur-3xl" style={{ background: `${ACCENT}08` }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
                Simple & Rapide
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Filme. Envoie.
                <br />
                <span style={{ color: ACCENT }}>Analyse.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Pas d'app a telecharger. Pas de capteur a porter. Juste ton telephone et WhatsApp.
                Tu filmes ton set, tu envoies la video, et tu recois ton analyse biomecanique complete.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Smartphone, title: "1. Filme ton set", desc: "Place ton telephone en face, a 2-3 metres, et filme ta serie complete" },
                  { icon: MessageCircle, title: "2. Envoie sur WhatsApp", desc: "Envoie la video au numero FormCheck. L'exercice est detecte automatiquement" },
                  { icon: FileText, title: "3. Recois ton rapport", desc: "En quelques minutes, tu recois ton analyse complete avec score et corrections" },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-sm"
                  >
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33` }}
                    >
                      <step.icon className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                      <p className="text-white/40 text-sm">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square">
                <HowItWorksVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BIOMECHANICS ANALYSIS */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <AngleAnalysisVisual />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
                Analyse de mouvement
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Chaque angle.
                <br />
                <span style={{ color: ACCENT }}>Chaque erreur.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                33 points articulaires detectes sur ton corps, angles mesures en temps reel,
                et comparaison avec les references optimales pour chaque exercice.
              </p>
              <ul className="space-y-4">
                {[
                  "Detection automatique de l'exercice",
                  "Analyse des angles articulaires en temps reel",
                  "Score de forme 0-100 avec 4 sous-scores",
                  "Corrections classees par priorite d'impact",
                  "Comparaison avec la forme optimale",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check className="w-5 h-5" style={{ color: ACCENT }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* EXERCISES SUPPORTED */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
                Exercices supportes
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Tous tes lifts.
                <br />
                <span style={{ color: ACCENT }}>Couverts.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Squat, deadlift, bench press, overhead press, barbell row, et bien plus.
                Chaque exercice a ses propres references biomecaniques et criteres d'evaluation.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: Dumbbell, label: "Squat (back, front, goblet)" },
                  { icon: Dumbbell, label: "Deadlift (conv, sumo, RDL)" },
                  { icon: Dumbbell, label: "Bench Press & OHP" },
                  { icon: Target, label: "Barbell Row & Pull-up" },
                  { icon: Ruler, label: "Lunge & Hip Thrust" },
                  { icon: Dumbbell, label: "Clean, Snatch, Swing..." },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-white/60"
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                    {item.label}
                  </motion.div>
                ))}
              </div>

              {/* Hyrox highlight */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="p-4 rounded-lg border border-[#FF6B00]/30 bg-[#FF6B00]/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
                  <span className="text-xs font-mono font-bold text-[#FF6B00] uppercase tracking-widest">Hyrox Ready</span>
                </div>
                <p className="text-white/50 text-sm">
                  Wall ball, ski erg, sled push, burpee broad jump — tous les exos Hyrox sont supportes avec leurs propres criteres.
                </p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="aspect-square">
                <ExerciseGridVisual />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PACKS & PRICING — Coming Soon */}
      <section id="packs" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
              Packs & Tarifs
            </p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Abonnements mensuels.
            </h2>
            <p className="text-white/50 mt-4 max-w-lg mx-auto">
              1ere analyse gratuite. Choisis ton plan et commence sur WhatsApp.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: "Essai",
                price: "0€",
                period: "",
                analyses: "1 analyse offerte",
                subtitle: "Decouvre le niveau de tes mouvements",
                features: ["Score de forme 0-100", "Detection d'exercice auto", "Corrections prioritaires", "Rapport HTML complet"],
                badge: "GRATUIT",
                highlight: false,
                cta: "Tester gratuitement",
                ctaHref: `https://wa.me/${WHATSAPP_NUMBER}?text=menu`,
              },
              {
                name: "Solo",
                price: "9,90€",
                period: "/1er mois",
                priceAfter: "puis 14,90€/mois",
                analyses: "10 analyses/mois",
                subtitle: "Corrige ta technique chaque semaine",
                features: ["Tout l'Essai inclus", "10 analyses par mois", "Historique et progression", "Sans engagement"],
                badge: null,
                highlight: false,
                cta: "Commencer a 9,90€",
                ctaHref: `https://wa.me/${WHATSAPP_NUMBER}?text=forfaits`,
              },
              {
                name: "Pro",
                price: "29,90€",
                period: "/1er mois",
                priceAfter: "puis 39,90€/mois",
                analyses: "30 analyses/mois",
                subtitle: "Pour ceux qui ne veulent plus deviner",
                features: ["Tout le Solo inclus", "30 analyses par mois", "Rapports partageables", "Ideal athletes serieux"],
                badge: "LE + POPULAIRE",
                highlight: true,
                cta: "Passer Pro maintenant",
                ctaHref: `https://wa.me/${WHATSAPP_NUMBER}?text=forfaits`,
              },
              {
                name: "Coach",
                price: "99€",
                period: "/mois",
                priceAfter: "",
                analyses: "Analyses illimitees",
                subtitle: "L'outil de tes seances et de tes clients",
                features: ["Tout le Pro inclus", "Volume illimite", "Multi-athletes", "Support prioritaire"],
                badge: "ILLIMITE",
                highlight: false,
                cta: "Devenir Coach",
                ctaHref: `https://wa.me/${WHATSAPP_NUMBER}?text=forfaits`,
              },
            ].map((pack, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-sm p-8 ${
                  pack.highlight
                    ? "border-2 scale-[1.02]"
                    : "border border-white/10 bg-white/[0.02]"
                }`}
                style={pack.highlight ? {
                  borderColor: `${ACCENT}50`,
                  background: `linear-gradient(to bottom, ${ACCENT}1A, transparent)`,
                  boxShadow: `0 0 60px ${ACCENT}1A`,
                } : {}}
              >
                {pack.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-mono uppercase tracking-widest rounded-sm text-white"
                    style={{ background: ACCENT }}
                  >
                    {pack.badge}
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-white text-xl font-bold mb-1">{pack.name}</h3>
                  <p className="text-white/40 text-xs mb-3">{pack.subtitle}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-white text-4xl font-bold">{pack.price}</span>
                    {pack.period && <span className="text-white/40 text-sm">{pack.period}</span>}
                  </div>
                  {pack.priceAfter && <div className="text-white/30 text-xs mt-1">{pack.priceAfter}</div>}
                  <div className="text-sm mt-2 font-semibold" style={{ color: ACCENT }}>{pack.analyses}</div>
                </div>
                <ul className="space-y-3 mb-8">
                  {pack.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                {pack.cta && (
                  <span
                    aria-disabled="true"
                    className="block w-full text-center py-3 rounded-sm text-sm font-bold uppercase tracking-wider cursor-not-allowed select-none border border-white/15 bg-white/[0.04] text-white/60"
                  >
                    Indisponible pour le moment
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Tout ce qui est inclus.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-sm backdrop-blur-xl p-10"
            style={{
              border: `1px solid ${ACCENT}4D`,
              background: `linear-gradient(to bottom, ${ACCENT}1A, transparent)`,
              boxShadow: `0 0 60px ${ACCENT}1A`,
            }}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "Score de forme 0-100",
                "4 sous-scores (securite, efficacite, controle, symetrie)",
                "Detection automatique d'exercice",
                "Analyse des angles articulaires",
                "Corrections prioritaires personnalisees",
                "Exercices correctifs recommandes",
                "Rapport HTML premium interactif",
                "Profil morphologique personnalise",
                "Comptage des repetitions",
                "Analyse du tempo",
                "Detection des asymetries",
                "20+ exercices supportes",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT }} />
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-white text-5xl font-bold tracking-[-0.04em]">Gratuit</span>
                <span className="text-white/40 ml-2">ta 1ere analyse</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="aspect-square w-10 rounded-sm flex items-center justify-center" style={{ background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33` }}>
                  <MessageCircle className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <span className="text-white/60 text-sm">Tout se passe sur WhatsApp</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMPARISON: YouTube vs FormCheck */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">
              Conseils YouTube <span className="text-white/30">vs</span> <span style={{ color: ACCENT }}>FormCheck</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* YouTube */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-sm border border-white/10 bg-white/[0.03] p-8"
            >
              <div className="text-white/40 text-sm font-medium uppercase tracking-widest mb-6">Conseils YouTube</div>
              <ul className="space-y-4">
                {[
                  "Generiques, pas adaptes a toi",
                  "Pas de mesure objective",
                  "Tu ne vois pas tes propres erreurs",
                  "Pas de suivi dans le temps",
                  "Informations contradictoires",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/50">
                    <X className="w-5 h-5 text-red-500/60 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* FormCheck */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-sm p-8"
              style={{
                border: `1px solid ${ACCENT}4D`,
                background: `linear-gradient(to bottom, ${ACCENT}1A, transparent)`,
                boxShadow: `0 0 60px ${ACCENT}1A`,
              }}
            >
              <div className="text-sm font-medium uppercase tracking-widest mb-6" style={{ color: ACCENT }}>FormCheck</div>
              <ul className="space-y-4">
                {[
                  "Analyse de TES angles, TES erreurs",
                  "Score objectif 0-100 mesurable",
                  "Corrections classees par priorite",
                  "Exercices correctifs personnalises",
                  "Historique et progression dans le temps",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SCORE GAUGE SECTION */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="aspect-[4/3]">
                <ScoreGaugeVisual />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
                Score & Feedback
              </p>
              <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em] mb-6 leading-tight">
                Un score.
                <br />
                <span style={{ color: ACCENT }}>Des reponses.</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Chaque analyse te donne un score global 0-100 decompose en 4 axes:
                securite articulaire, efficacite du mouvement, controle moteur et symetrie.
                Tu sais exactement ou tu en es et quoi corriger en premier.
              </p>
              <ul className="space-y-4">
                {[
                  "Score global composite 0-100",
                  "4 sous-scores pour cibler les faiblesses",
                  "Rep par rep: identification des meilleurs et pires reps",
                  "Exercices correctifs adaptes a TES compensations",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>FAQ</p>
            <h2 className="text-white text-4xl sm:text-5xl font-bold tracking-[-0.04em]">Questions frequentes</h2>
          </motion.div>
          <div className="divide-y divide-white/10">
            {[
              { q: "Comment envoyer ma video ?", a: "Ouvre WhatsApp, envoie ta video d'exercice au numero FormCheck. L'exercice est detecte automatiquement et ta forme est analysee. Tu recois ton rapport en quelques minutes. Filme de face ou de profil, a 2-3 metres, en format portrait ou paysage." },
              { q: "Quels exercices sont supportes ?", a: "20+ exercices: squat (back, front, goblet), deadlift (conventionnel, sumo, roumain), bench press, overhead press, barbell row, pull-up, lunge, hip thrust, curl, dip, clean, snatch, kettlebell swing, et plus. La liste s'agrandit regulierement." },
              { q: "Comment le score est-il calcule ?", a: "33 points articulaires sont detectes sur ton corps et les angles sont mesures en temps reel. Le score 0-100 est base sur la comparaison avec les angles optimaux pour chaque exercice, pondere par la gravite de chaque deviation. 4 sous-scores: securite, efficacite, controle, symetrie." },
              { q: "C'est quoi le rapport HTML ?", a: "Un rapport detaille avec score global, corrections prioritaires classees par impact, analyse rep par rep, decomposition du score (securite, efficacite, controle, symetrie), point biomecanique et plan d'action concret. Consultable sur n'importe quel appareil." },
              { q: "Est-ce que ca remplace un coach ?", a: "Non. FormCheck est un outil d'analyse objective qui complete le travail d'un coach. C'est un miroir qui te montre ce que tu ne peux pas voir seul. Ideal entre tes seances de coaching, pour valider ta technique en autonomie." },
              { q: "Combien ca coute ?", a: "1ere analyse gratuite. Ensuite : Solo a 9,90 EUR le 1er mois puis 14,90 EUR/mois (10 analyses). Pro a 29,90 EUR le 1er mois puis 39,90 EUR/mois (30 analyses). Coach a 99 EUR/mois illimite. Sans engagement, resiliable a tout moment." },
            ].map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] mb-8">
            Pret a corriger
            <br />
            <span style={{ color: ACCENT }}>ta forme ?</span>
          </h2>
          <p className="text-white/50 text-lg mb-12 max-w-xl mx-auto">
            Une video. Un score. Des corrections. C'est tout ce qu'il te faut pour progresser.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="aspect-square w-12 rounded-sm flex items-center justify-center" style={{ background: `${ACCENT}1A`, border: `1px solid ${ACCENT}33` }}>
              <MessageCircle className="w-6 h-6" style={{ color: ACCENT }} />
            </div>
            <span className="text-white/60">100% via WhatsApp — aucune app a telecharger</span>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
