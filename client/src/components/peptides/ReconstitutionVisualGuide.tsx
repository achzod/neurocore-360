/**
 * ReconstitutionVisualGuide.tsx
 *
 * Three standalone animated visual guide components for the Peptides Engine report.
 *
 * Usage:
 *   import { ReconstitutionStepByStep, FiveReconstitutionErrors, DoseCalculatorVisual }
 *     from '@/components/peptides/ReconstitutionVisualGuide';
 *
 * All components are static (no required props).
 * Dependencies: framer-motion, lucide-react, tailwind
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  FlaskConical,
  Droplets,
  CheckCircle2,
  XCircle,
  Thermometer,
  Shield,
  Beaker,
  Eye,
  Ban,
  ChevronDown,
  Star,
  Calculator,
  RefreshCw,
} from 'lucide-react';

// ─── Shared design tokens ───────────────────────────────────────────────────

const C = {
  bg: '#0a0a0a',
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.15)',
  amberBorder: 'rgba(245,158,11,0.35)',
  cyan: '#06b6d4',
  cyanDim: 'rgba(6,182,212,0.12)',
  cyanBorder: 'rgba(6,182,212,0.3)',
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.12)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.12)',
  card: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim: 'rgba(255,255,255,0.65)',
};

// ─── Shared sub-components ───────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className="inline-block text-xs font-mono tracking-[0.2em] uppercase mb-3"
    style={{ color: C.amber }}
  >
    {children}
  </span>
);

const Divider: React.FC = () => (
  <div className="w-full h-px my-6" style={{ background: C.border }} />
);

// Animated counter hook
function useCountUp(to: number, duration = 1.2, trigger: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      setVal(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration, trigger]);
  return val;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT 1 — ReconstitutionStepByStep
// ══════════════════════════════════════════════════════════════════════════════

interface Step {
  id: number;
  icon: React.ReactNode;
  label: string;
  title: string;
  content: React.ReactNode;
}

const FormulaAnimated: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const peptide = useCountUp(10, 1, inView);
  const water = useCountUp(2, 1, inView);
  const conc = useCountUp(5, 1.2, inView);

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-3 my-4">
      {[
        { val: peptide, unit: 'mg', label: 'Peptide', color: C.amber },
        { val: null, unit: '÷', label: '', color: C.textMuted },
        { val: water, unit: 'ml', label: 'Eau BAC', color: C.cyan },
        { val: null, unit: '=', label: '', color: C.textMuted },
        { val: conc, unit: 'mg/ml', label: 'Concentration', color: C.green },
      ].map((item, i) =>
        item.val === null ? (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="text-3xl font-bold"
            style={{ color: item.color }}
          >
            {item.unit}
          </motion.span>
        ) : (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div
              className="px-4 py-2 rounded-lg font-mono text-2xl font-bold border"
              style={{
                background: `${item.color}18`,
                borderColor: `${item.color}40`,
                color: item.color,
                minWidth: 72,
                textAlign: 'center',
              }}
            >
              {item.val}
              <span className="text-sm ml-1 font-normal opacity-70">{item.unit}</span>
            </div>
            {item.label && (
              <span className="text-xs mt-1 font-mono" style={{ color: C.textMuted }}>
                {item.label}
              </span>
            )}
          </motion.div>
        )
      )}
    </div>
  );
};

const SyringeAngle: React.FC = () => {
  const [showCorrect, setShowCorrect] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setShowCorrect((v) => !v), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-6 items-center justify-center my-4">
      {/* Wrong */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="px-3 py-1 rounded text-xs font-mono border"
          style={{ color: C.red, borderColor: `${C.red}40`, background: C.redDim }}
        >
          A EVITER
        </div>
        <motion.div
          animate={{ rotate: showCorrect ? 0 : [0, 0, 0] }}
          className="flex flex-col items-center"
        >
          <div
            className="relative flex items-center gap-1"
            style={{ transform: 'rotate(0deg)' }}
          >
            <div
              className="w-1.5 h-10 rounded-full"
              style={{ background: C.red, opacity: 0.7 }}
            />
            <div
              className="w-8 h-5 rounded border flex items-center justify-end pr-1"
              style={{ borderColor: `${C.red}60`, background: C.redDim }}
            >
              <div className="w-2 h-3 rounded-sm" style={{ background: C.red, opacity: 0.4 }} />
            </div>
            <div className="w-3 h-2 rounded" style={{ background: `${C.red}50` }} />
          </div>
        </motion.div>
        <span className="text-xs text-center" style={{ color: C.textMuted, maxWidth: 80 }}>
          Droit — eau sur poudre
        </span>
      </div>

      {/* Arrow */}
      <motion.div
        animate={{ x: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: C.cyan, fontSize: 22 }}
      >
        →
      </motion.div>

      {/* Correct */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="px-3 py-1 rounded text-xs font-mono border"
          style={{ color: C.green, borderColor: `${C.green}40`, background: C.greenDim }}
        >
          RECOMMANDE
        </div>
        <motion.div
          className="relative flex items-center gap-1"
          style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}
          animate={{ opacity: showCorrect ? 1 : 0.55 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="w-1.5 h-10 rounded-full"
            style={{ background: C.green, opacity: 0.9 }}
          />
          <div
            className="w-8 h-5 rounded border flex items-center justify-end pr-1"
            style={{ borderColor: `${C.green}60`, background: C.greenDim }}
          >
            <div className="w-2 h-3 rounded-sm" style={{ background: C.green, opacity: 0.4 }} />
          </div>
          <div className="w-3 h-2 rounded" style={{ background: `${C.green}50` }} />
        </motion.div>
        <span className="text-xs text-center" style={{ color: C.textMuted, maxWidth: 80 }}>
          45° — contre la paroi
        </span>
      </div>
    </div>
  );
};

const DissolveStates: React.FC = () => {
  const states = [
    { label: 'En cours', color: C.amber, desc: 'Rotation douce, attendre…', opacity: 0.7 },
    { label: 'Pret', color: C.green, desc: 'Solution claire et limpide', opacity: 1 },
    { label: 'Inutilisable', color: C.red, desc: 'Solution trouble — ne pas injecter', opacity: 0.9 },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % states.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-3 my-4">
      {states.map((s, i) => (
        <motion.div
          key={i}
          animate={{
            borderColor: active === i ? s.color : C.border,
            background: active === i ? `${s.color}18` : C.card,
            scale: active === i ? 1.04 : 1,
          }}
          transition={{ duration: 0.4 }}
          className="flex-1 rounded-lg p-3 border text-center cursor-pointer"
          style={{ borderColor: C.border, background: C.card }}
          onClick={() => setActive(i)}
        >
          <div
            className="w-8 h-8 rounded-full mx-auto mb-2 border-2"
            style={{
              background: active === i ? `${s.color}30` : 'transparent',
              borderColor: active === i ? s.color : C.border,
            }}
          />
          <div
            className="text-xs font-bold mb-1"
            style={{ color: active === i ? s.color : C.textDim }}
          >
            {s.label}
          </div>
          <div className="text-xs leading-tight" style={{ color: C.textMuted }}>
            {s.desc}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const StepChecklist: React.FC<{ steps: string[] }> = ({ steps }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="space-y-2 mt-2">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.08 * i, duration: 0.4 }}
          className="flex items-center gap-3 py-2 px-3 rounded-lg"
          style={{ background: C.greenDim, border: `1px solid ${C.green}25` }}
        >
          <CheckCircle2 size={15} style={{ color: C.green, flexShrink: 0 }} />
          <span className="text-sm" style={{ color: C.textDim }}>
            {s}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

const storageData = [
  { temp: '20°C', poudre: 'Quelques mois', icn: '🌡' },
  { temp: '2–8°C', poudre: '2 ans', icn: '❄' },
  { temp: '-20°C', poudre: '+10 ans', icn: '🧊' },
];

export const ReconstitutionStepByStep: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number | null>(0);

  const steps: Step[] = [
    {
      id: 1,
      icon: <Beaker size={18} />,
      label: '01',
      title: 'Materiel',
      content: (
        <div className="space-y-3">
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: C.amber }}>
              OBLIGATOIRE
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Seringue insuline U-100',
                'BAC water 0.9% alcool benzylique',
                'Flacon peptide lyophilise',
                'Compresses alcool 70%',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs py-1.5 px-2 rounded"
                  style={{ background: C.amberDim, color: C.textDim }}
                >
                  <CheckCircle2 size={12} style={{ color: C.amber }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: C.textMuted }}>
              OPTIONNEL
            </div>
            <div className="flex flex-wrap gap-2">
              {['Aiguille 25G', 'Gants nitrile'].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 text-xs py-1 px-2 rounded"
                  style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textMuted }}
                >
                  <span className="opacity-50">+</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      icon: <Calculator size={18} />,
      label: '02',
      title: 'Calcul de concentration',
      content: (
        <div>
          <p className="text-sm mb-3" style={{ color: C.textDim }}>
            Avant toute reconstitution, calculer la concentration finale :
          </p>
          <FormulaAnimated />
          <div
            className="mt-3 p-3 rounded-lg text-sm"
            style={{ background: C.cyanDim, border: `1px solid ${C.cyanBorder}`, color: C.textDim }}
          >
            <strong style={{ color: C.cyan }}>Exemple :</strong> 10 mg ÷ 2 ml = 5 mg/ml.
            Chaque unité de la seringue = 50 mcg.
          </div>
        </div>
      ),
    },
    {
      id: 3,
      icon: <Shield size={18} />,
      label: '03',
      title: 'Sterilite',
      content: (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: C.cyan }}>
              PROTOCOLE DE DESINFECTION
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                'Compresse alcool',
                '→ Bouchon BAC (10s)',
                '→ Bouchon peptide (10s)',
                '→ Secher 15s',
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-1"
                >
                  {i > 0 && (
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {step.startsWith('→') ? '' : '→'}
                    </span>
                  )}
                  <span
                    className="text-xs py-1 px-2 rounded"
                    style={{
                      background: i === 3 ? C.greenDim : C.cyanDim,
                      color: i === 3 ? C.green : C.cyan,
                      border: `1px solid ${i === 3 ? C.green : C.cyan}30`,
                    }}
                  >
                    {step.replace('→ ', '')}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-xs font-mono mb-1" style={{ color: C.green }}>
                A FAIRE
              </div>
              {['Surface propre et plane', 'Seringue neuve a chaque fois'].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: C.textDim }}
                >
                  <CheckCircle2 size={12} style={{ color: C.green }} />
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-mono mb-1" style={{ color: C.red }}>
                JAMAIS
              </div>
              {['Souffler dans la seringue', "Toucher l'aiguille"].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: C.textDim }}
                >
                  <XCircle size={12} style={{ color: C.red }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      icon: <Droplets size={18} />,
      label: '04',
      title: "Injection de l'eau",
      content: (
        <div className="space-y-3">
          <SyringeAngle />
          <div className="space-y-2 mt-1">
            {[
              "Aspirer l'air equivalent au volume d'eau a injecter",
              'Piquer au centre du bouchon, incline ~45° vers la paroi',
              'Injecter lentement en laissant couler contre la paroi',
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-sm py-2 px-3 rounded-lg"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <span
                  className="text-xs font-mono font-bold mt-0.5"
                  style={{ color: C.cyan, flexShrink: 0 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ color: C.textDim }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 5,
      icon: <RefreshCw size={18} />,
      label: '05',
      title: 'Dissolution',
      content: (
        <div className="space-y-3">
          <DissolveStates />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { rule: 'Rouler doucement entre les paumes', ok: true },
              { rule: 'Attendre 5 a 10 min', ok: true },
              { rule: 'Ne JAMAIS secouer le flacon', ok: false },
            ].map((r, i) => (
              <div
                key={i}
                className="text-xs text-center py-2 px-2 rounded-lg"
                style={{
                  background: r.ok ? C.greenDim : C.redDim,
                  border: `1px solid ${r.ok ? C.green : C.red}30`,
                  color: r.ok ? C.green : C.red,
                }}
              >
                {r.ok ? <CheckCircle2 size={12} className="mx-auto mb-1" /> : <XCircle size={12} className="mx-auto mb-1" />}
                {r.rule}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 6,
      icon: <Thermometer size={18} />,
      label: '06',
      title: 'Conservation',
      content: (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: C.amber }}>
              POUDRE SECHE
            </div>
            <div className="space-y-1.5">
              {storageData.map((row) => (
                <div
                  key={row.temp}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <span style={{ color: C.textDim }}>
                    {row.icn} {row.temp}
                  </span>
                  <span className="font-mono text-xs" style={{ color: C.amber }}>
                    {row.poudre}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: C.cyan }}>
              SOLUTION RECONSTITUEE
            </div>
            <div
              className="p-3 rounded-lg text-sm space-y-1.5"
              style={{ background: C.cyanDim, border: `1px solid ${C.cyanBorder}` }}
            >
              {[
                'Toujours au refrigerateur 2–8°C',
                'Duree de vie : 2 mois et plus',
                'Sortir 10 min avant injection (temperature ambiante)',
                'Etiqueter : date + concentration + nom peptide',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2" style={{ color: C.textDim }}>
                  <CheckCircle2 size={12} style={{ color: C.cyan }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      icon: <CheckCircle2 size={18} />,
      label: '07',
      title: 'Recap complet',
      content: (
        <StepChecklist
          steps={[
            'Materiel complet et verifie (seringue U-100, BAC water, flacon)',
            "Calcul de concentration effectue (mg ÷ ml = mg/ml)",
            'Bouchons desinfectes a l\'alcool 70%, seches 15 secondes',
            "Eau injectee lentement contre la paroi a 45°",
            'Dissolution par rotation douce — jamais de secouage',
            'Flacon etiquete et conserve au frigo 2–8°C',
            'Dose calculee en unites avant chaque injection',
          ]}
        />
      ),
    },
  ];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: C.bg, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-4 border-b"
        style={{ borderColor: C.border }}
      >
        <SectionLabel>Guide Pratique</SectionLabel>
        <h2 className="text-xl font-bold text-white">
          Reconstitution Peptide — 7 Etapes
        </h2>
        <p className="text-sm mt-1" style={{ color: C.textMuted }}>
          Protocole complet pour une reconstitution sterile et precise.
        </p>

        {/* Progress bar */}
        <div className="mt-4 flex gap-1">
          {steps.map((s) => (
            <div
              key={s.id}
              className="h-1 flex-1 rounded-full cursor-pointer transition-all duration-300"
              style={{
                background:
                  activeStep !== null && s.id <= activeStep + 1
                    ? C.amber
                    : C.border,
              }}
              onClick={() => setActiveStep(s.id - 1)}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-2">
        {steps.map((step, idx) => {
          const isOpen = activeStep === idx;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              <div
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{
                  border: `1px solid ${isOpen ? C.amberBorder : C.border}`,
                  background: isOpen ? C.amberDim : C.card,
                  boxShadow: isOpen ? `0 0 20px ${C.amber}18` : 'none',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveStep(isOpen ? null : idx)}
              >
                {/* Step header */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg font-mono text-xs font-bold flex-shrink-0"
                    style={{
                      background: isOpen ? C.amber : `${C.amber}18`,
                      color: isOpen ? C.bg : C.amber,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    className="flex-1 flex items-center gap-2"
                    style={{ color: isOpen ? C.amber : C.textDim }}
                  >
                    <span
                      style={{ color: isOpen ? C.amber : C.textMuted, flexShrink: 0 }}
                    >
                      {step.icon}
                    </span>
                    <span className="font-semibold text-sm">{step.title}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ color: C.textMuted }}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </div>

                {/* Expanded content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="px-4 pb-4"
                        style={{ borderTop: `1px solid ${C.amberBorder}` }}
                      >
                        <div className="pt-4">{step.content}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT 2 — FiveReconstitutionErrors
// ══════════════════════════════════════════════════════════════════════════════

interface ErrorCard {
  num: number;
  title: string;
  badLabel: string;
  goodLabel: string;
  bad: React.ReactNode;
  good: React.ReactNode;
}

const ComparisonTable: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  const rows = [
    { label: 'Conservation', sterile: '24 heures maximum', bac: '2 mois et plus' },
    { label: 'Anti-bacterien', sterile: 'Aucun', bac: '0.9% alcool benzylique' },
    { label: 'Usage', sterile: 'Une seule ponction', bac: 'Plusieurs ponctions' },
    { label: 'Risque contamination', sterile: 'Eleve apres 24h', bac: 'Faible avec frigo' },
  ];
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 font-mono" style={{ color: C.textMuted }}>
              Critere
            </th>
            <th
              className="text-center py-2 px-3 font-mono"
              style={{ color: C.red }}
            >
              Eau sterile
            </th>
            <th
              className="text-center py-2 px-3 font-mono"
              style={{ color: C.green }}
            >
              Eau BAC ✓
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="transition-colors"
              style={{
                background: hovered === i ? `${C.cyan}0d` : 'transparent',
                cursor: 'default',
              }}
            >
              <td
                className="py-2 px-3 font-medium"
                style={{ color: hovered === i ? C.cyan : C.textDim }}
              >
                {row.label}
              </td>
              <td
                className="py-2 px-3 text-center"
                style={{ color: C.red, opacity: 0.8 }}
              >
                {row.sterile}
              </td>
              <td className="py-2 px-3 text-center" style={{ color: C.green }}>
                {row.bac}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DisinfectFlow: React.FC = () => {
  const steps = [
    { label: 'Compresse alcool 70%', color: C.cyan },
    { label: 'Bouchon BAC — 10s', color: C.amber },
    { label: 'Bouchon peptide — 10s', color: C.amber },
    { label: 'Laisser secher 15s', color: C.green },
  ];
  return (
    <div className="flex flex-wrap gap-2 items-center mt-2">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div
            className="text-xs py-1.5 px-3 rounded-lg font-medium"
            style={{
              background: `${s.color}15`,
              border: `1px solid ${s.color}35`,
              color: s.color,
            }}
          >
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <span style={{ color: C.textMuted, fontSize: 16 }}>→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const DoseFormulaRow: React.FC<{
  flacon: string;
  eau: string;
  conc: string;
  unit1: string;
}> = ({ flacon, eau, conc, unit1 }) => (
  <div
    className="grid grid-cols-4 gap-2 text-xs py-2 px-3 rounded-lg"
    style={{ background: C.card, border: `1px solid ${C.border}` }}
  >
    <span style={{ color: C.amber }}>{flacon}</span>
    <span style={{ color: C.cyan }}>{eau}</span>
    <span style={{ color: C.green }}>{conc}</span>
    <span style={{ color: C.textDim }}>{unit1}</span>
  </div>
);

export const FiveReconstitutionErrors: React.FC = () => {
  const [showGood, setShowGood] = useState<Record<number, boolean>>({});

  const toggle = (n: number) =>
    setShowGood((prev) => ({ ...prev, [n]: !prev[n] }));

  const errors: ErrorCard[] = [
    {
      num: 1,
      title: 'Secouer le flacon',
      badLabel: 'A eviter',
      goodLabel: 'Correct',
      bad: (
        <div className="space-y-2">
          <div
            className="text-sm py-2 px-3 rounded-lg"
            style={{ background: C.redDim, color: C.textDim, border: `1px solid ${C.red}30` }}
          >
            Agitation cree des bulles, des forces mecaniques et degrade les liaisons peptidiques.
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.red }}>
            <Ban size={14} />
            Solution mousseuse — peptide deteriore
          </div>
        </div>
      ),
      good: (
        <div className="space-y-2">
          <div
            className="text-sm py-2 px-3 rounded-lg"
            style={{ background: C.greenDim, color: C.textDim, border: `1px solid ${C.green}30` }}
          >
            Rotation douce entre les paumes. Solution claire et limpide en 5–10 minutes.
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: C.green }}>
            <CheckCircle2 size={14} />
            Solution transparente — peptide intact
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: "Eau directe sur la poudre",
      badLabel: 'A eviter',
      goodLabel: 'Correct',
      bad: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: C.red }}>
            <XCircle size={14} />
            Aiguille droite — eau tombe directement sur la poudre
          </div>
          <div className="text-sm" style={{ color: C.textMuted }}>
            Choc mécanique degradant les structures fragiles du peptide.
          </div>
        </div>
      ),
      good: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: C.green }}>
            <CheckCircle2 size={14} />
            Centre bouchon, incliné ~45°, piston lent
          </div>
          <div className="text-sm" style={{ color: C.textMuted }}>
            L'eau coule doucement le long de la paroi, dissolut progressivement.
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: "Eau sterile au lieu de BAC",
      badLabel: 'Eau sterile',
      goodLabel: 'Eau BAC',
      bad: (
        <div>
          <div className="text-sm mb-2" style={{ color: C.textMuted }}>
            Comparaison des deux solutions :
          </div>
          <ComparisonTable />
        </div>
      ),
      good: (
        <div>
          <div className="text-sm mb-2" style={{ color: C.textMuted }}>
            Comparaison des deux solutions :
          </div>
          <ComparisonTable />
        </div>
      ),
    },
    {
      num: 4,
      title: 'Oublier de desinfecter les bouchons',
      badLabel: 'Sans desinfection',
      goodLabel: 'Protocole correct',
      bad: (
        <div className="space-y-2">
          <div
            className="text-sm py-2 px-3 rounded-lg"
            style={{ background: C.redDim, color: C.textDim, border: `1px solid ${C.red}30` }}
          >
            Contamination bacterienne directe dans le flacon. Risque d'infection systematique.
          </div>
          <div
            className="text-xs py-2 px-3 rounded border font-medium"
            style={{
              borderColor: `${C.red}50`,
              color: C.red,
              background: `${C.red}0a`,
            }}
          >
            ⚠ Un peptide contamine = solution trouble. Ne jamais injecter une solution trouble.
          </div>
        </div>
      ),
      good: (
        <div>
          <div className="text-sm mb-1" style={{ color: C.textDim }}>
            Protocole de desinfection obligatoire :
          </div>
          <DisinfectFlow />
        </div>
      ),
    },
    {
      num: 5,
      title: 'Mal calculer concentration et dose',
      badLabel: 'Calcul approximatif',
      goodLabel: 'Formule correcte',
      bad: (
        <div className="space-y-2">
          <div
            className="text-sm py-2 px-3 rounded-lg"
            style={{ background: C.redDim, color: C.textDim, border: `1px solid ${C.red}30` }}
          >
            Sous-dosage ou surdosage. Erreurs de concentration au facteur 2 ou 10 possibles.
          </div>
          <div className="text-xs font-mono" style={{ color: C.red }}>
            Ex: confondre 5 mg/ml avec 0.5 mg/ml → ×10 erreur
          </div>
        </div>
      ),
      good: (
        <div className="space-y-2">
          <div
            className="text-sm py-2 px-3 rounded-lg font-mono"
            style={{ background: C.greenDim, color: C.green, border: `1px solid ${C.green}30` }}
          >
            mg ÷ ml = mg/ml &nbsp;|&nbsp; Dose (mcg) ÷ Conc (mcg/ml) × 100 = Unites
          </div>
          <div
            className="grid grid-cols-4 gap-1 text-xs"
            style={{ color: C.textMuted }}
          >
            <span style={{ color: C.amber }}>Flacon</span>
            <span style={{ color: C.cyan }}>Eau</span>
            <span style={{ color: C.green }}>Conc.</span>
            <span>1U</span>
          </div>
          <DoseFormulaRow flacon="10 mg" eau="1 ml" conc="10 mg/ml" unit1="100 mcg" />
          <DoseFormulaRow flacon="10 mg" eau="2 ml" conc="5 mg/ml" unit1="50 mcg" />
          <DoseFormulaRow flacon="20 mg" eau="2 ml" conc="10 mg/ml" unit1="100 mcg" />
        </div>
      ),
    },
  ];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: C.bg, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: C.border }}>
        <SectionLabel>Erreurs Communes</SectionLabel>
        <h2 className="text-xl font-bold text-white">5 Erreurs a Eviter Absolument</h2>
        <p className="text-sm mt-1" style={{ color: C.textMuted }}>
          Identifier et corriger les erreurs les plus frequentes lors de la reconstitution.
        </p>
      </div>

      {/* Error cards */}
      <div className="p-4 space-y-3">
        {errors.map((err, idx) => {
          const isShowingGood = showGood[err.num] ?? false;
          return (
            <motion.div
              key={err.num}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${C.border}`, background: C.card }}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Pulsing error number */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2.2, delay: idx * 0.3 }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: C.red }}
                  />
                  <div
                    className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                    style={{ background: `${C.red}25`, border: `1.5px solid ${C.red}60`, color: C.red }}
                  >
                    {String(err.num).padStart(2, '0')}
                  </div>
                </div>
                <span className="font-semibold text-sm flex-1 text-white">{err.title}</span>
                {/* Toggle button */}
                <button
                  onClick={() => toggle(err.num)}
                  className="flex items-center gap-1.5 text-xs py-1 px-3 rounded-full font-mono transition-all"
                  style={{
                    background: isShowingGood ? C.greenDim : C.redDim,
                    border: `1px solid ${isShowingGood ? C.green : C.red}40`,
                    color: isShowingGood ? C.green : C.red,
                  }}
                >
                  <RefreshCw size={10} />
                  {isShowingGood ? err.goodLabel : err.badLabel}
                </button>
              </div>

              {/* Content with crossfade */}
              <div className="px-4 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="pt-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isShowingGood ? 'good' : 'bad'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                    >
                      {isShowingGood ? err.good : err.bad}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Final recap card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="rounded-xl p-4"
          style={{
            background: `${C.amber}0e`,
            border: `1px solid ${C.amberBorder}`,
          }}
        >
          <div className="text-sm font-bold mb-3" style={{ color: C.amber }}>
            Les 5 regles a retenir
          </div>
          <div className="space-y-2">
            {[
              'Ne jamais secouer — rotation douce uniquement',
              "Toujours injecter l'eau a 45° contre la paroi",
              "Utiliser de l'eau BAC, pas de l'eau sterile simple",
              "Desinfecter les deux bouchons avant chaque ponction",
              "Calculer la concentration et la dose en unites avant d'injecter",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: C.textDim }}>
                <CheckCircle2 size={14} style={{ color: C.amber, marginTop: 2, flexShrink: 0 }} />
                {rule}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT 3 — DoseCalculatorVisual
// ══════════════════════════════════════════════════════════════════════════════

// Animated syringe fill component
const SyringeFill: React.FC<{ fill: number; label: string; color?: string }> = ({
  fill,
  label,
  color = C.cyan,
}) => {
  const total = 100;
  const filledUnits = Math.round(fill * total);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: 28,
          height: 100,
          background: C.card,
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Graduation marks */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <div
            key={pct}
            className="absolute w-full"
            style={{
              top: `${100 - pct}%`,
              borderTop: `1px solid ${C.border}`,
            }}
          />
        ))}
        {/* Fill */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-b-lg"
          initial={{ height: 0 }}
          animate={{ height: `${fill * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: `${color}55`, borderTop: `2px solid ${color}` }}
        />
      </div>
      <div className="text-xs font-mono text-center" style={{ color }}>
        {filledUnits}U
      </div>
      <div className="text-xs text-center" style={{ color: C.textMuted }}>
        {label}
      </div>
    </div>
  );
};

// U-100 syringe diagram
const SyringeDiagram: React.FC = () => (
  <div
    className="rounded-xl p-4"
    style={{ background: C.card, border: `1px solid ${C.border}` }}
  >
    <div className="text-xs font-mono mb-3" style={{ color: C.cyan }}>
      SERINGUE INSULINE U-100 — LECTURE DES GRADUATIONS
    </div>
    <div className="flex items-start gap-4">
      {/* Syringe SVG */}
      <svg
        width="48"
        height="160"
        viewBox="0 0 48 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Body */}
        <rect x="14" y="20" width="20" height="110" rx="3" fill={C.card} stroke={C.border} strokeWidth="1.5" />
        {/* Plunger */}
        <rect x="17" y="22" width="14" height="95" rx="2" fill={`${C.cyan}18`} />
        {/* Graduations 0–100 by 10 */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((u) => (
          <line
            key={u}
            x1="14"
            y1={20 + (u / 100) * 110}
            x2={u % 50 === 0 ? '24' : '20'}
            y2={20 + (u / 100) * 110}
            stroke={C.border}
            strokeWidth="1"
          />
        ))}
        {/* Labels */}
        <text x="36" y="25" fill={C.textMuted} fontSize="7" fontFamily="monospace">0</text>
        <text x="36" y="80" fill={C.textMuted} fontSize="7" fontFamily="monospace">50</text>
        <text x="32" y="133" fill={C.textMuted} fontSize="7" fontFamily="monospace">100</text>
        {/* Needle */}
        <rect x="22" y="130" width="4" height="24" rx="2" fill={`${C.cyan}60`} />
        <polygon points="22,154 26,154 24,160" fill={`${C.cyan}80`} />
        {/* Thumb ring */}
        <rect x="10" y="16" width="28" height="6" rx="3" fill={`${C.cyan}20`} stroke={C.border} strokeWidth="1" />
        {/* Piston */}
        <rect x="20" y="117" width="8" height="8" rx="1" fill={`${C.cyan}40`} />
      </svg>

      {/* Legend */}
      <div className="space-y-3 flex-1">
        <div>
          <div className="text-xs font-bold mb-1" style={{ color: C.amber }}>
            Regle fondamentale
          </div>
          <div
            className="text-sm font-mono py-2 px-3 rounded"
            style={{ background: C.amberDim, color: C.amber, border: `1px solid ${C.amberBorder}` }}
          >
            100 unites = 1 ml
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { u: '1 unite', ml: '= 0.01 ml', note: '' },
            { u: '10 unites', ml: '= 0.1 ml', note: '' },
            { u: '50 unites', ml: '= 0.5 ml', note: '' },
            { u: '100 unites', ml: '= 1 ml', note: '= max' },
          ].map((row) => (
            <div
              key={row.u}
              className="flex items-center gap-2 text-xs"
              style={{ color: C.textDim }}
            >
              <span className="font-mono" style={{ color: C.cyan, minWidth: 70 }}>
                {row.u}
              </span>
              <span style={{ color: C.textMuted }}>{row.ml}</span>
              {row.note && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: C.cyanDim, color: C.cyan }}
                >
                  {row.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Scenario card
interface Scenario {
  label: string;
  mg: number;
  ml: number;
  conc: number;
  u1: string;
  doses: Array<{ dose: string; units: string }>;
  recommended?: boolean;
}

const ScenarioCard: React.FC<{ scenario: Scenario }> = ({ scenario }) => (
  <div
    className="rounded-xl p-4 flex-1 relative overflow-hidden"
    style={{
      background: scenario.recommended ? `${C.amber}0a` : C.card,
      border: `1px solid ${scenario.recommended ? C.amberBorder : C.border}`,
    }}
  >
    {scenario.recommended && (
      <div
        className="absolute top-2 right-2 flex items-center gap-1 text-xs py-0.5 px-2 rounded-full font-mono"
        style={{ background: C.amberDim, color: C.amber, border: `1px solid ${C.amberBorder}` }}
      >
        <Star size={10} fill={C.amber} />
        Recommande
      </div>
    )}
    <div className="text-xs font-mono mb-3" style={{ color: scenario.recommended ? C.amber : C.cyan }}>
      {scenario.label}
    </div>
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span
        className="text-sm px-2 py-0.5 rounded font-mono"
        style={{ background: `${C.amber}18`, color: C.amber }}
      >
        {scenario.mg}mg
      </span>
      <span style={{ color: C.textMuted, fontSize: 14 }}>+</span>
      <span
        className="text-sm px-2 py-0.5 rounded font-mono"
        style={{ background: C.cyanDim, color: C.cyan }}
      >
        {scenario.ml}ml
      </span>
      <span style={{ color: C.textMuted, fontSize: 14 }}>=</span>
      <span
        className="text-sm px-2 py-0.5 rounded font-mono font-bold"
        style={{ background: C.greenDim, color: C.green }}
      >
        {scenario.conc}mg/ml
      </span>
    </div>
    <div
      className="text-xs font-mono mb-3 py-1.5 px-2 rounded"
      style={{ background: C.card, color: C.textDim, border: `1px solid ${C.border}` }}
    >
      1 unite = {scenario.u1}
    </div>
    <div className="space-y-1">
      {scenario.doses.map((d) => (
        <div
          key={d.dose}
          className="flex justify-between text-xs py-1 px-2 rounded"
          style={{ background: C.bg }}
        >
          <span style={{ color: C.textMuted }}>{d.dose}</span>
          <span className="font-mono" style={{ color: C.textDim }}>
            {d.units}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Worked example for the formula
interface WorkedExample {
  dose: string;
  conc: string;
  result: string;
  desc: string;
}

const WorkedExampleCard: React.FC<{ ex: WorkedExample; delay: number }> = ({ ex, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.4 }}
      className="rounded-lg p-3"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div className="text-xs font-mono mb-2" style={{ color: C.textMuted }}>
        {ex.desc}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap text-sm">
        <span
          className="px-2 py-0.5 rounded font-mono"
          style={{ background: C.amberDim, color: C.amber }}
        >
          {ex.dose}
        </span>
        <span style={{ color: C.textMuted }}>÷</span>
        <span
          className="px-2 py-0.5 rounded font-mono"
          style={{ background: C.cyanDim, color: C.cyan }}
        >
          {ex.conc}
        </span>
        <span style={{ color: C.textMuted }}>× 100</span>
        <span style={{ color: C.textMuted }}>=</span>
        <span
          className="px-2 py-0.5 rounded font-mono font-bold"
          style={{ background: C.greenDim, color: C.green }}
        >
          {ex.result}
        </span>
      </div>
    </motion.div>
  );
};

// Full reference table
interface TableRow {
  flacon: string;
  eau: string;
  conc: string;
  u1: string;
  u10: string;
  recommended?: boolean;
}

const ReferenceTable: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  const rows: TableRow[] = [
    { flacon: '5 mg', eau: '1 ml', conc: '5 mg/ml', u1: '50 mcg', u10: '500 mcg' },
    { flacon: '5 mg', eau: '2 ml', conc: '2.5 mg/ml', u1: '25 mcg', u10: '250 mcg', recommended: true },
    { flacon: '10 mg', eau: '1 ml', conc: '10 mg/ml', u1: '100 mcg', u10: '1 mg' },
    { flacon: '10 mg', eau: '2 ml', conc: '5 mg/ml', u1: '50 mcg', u10: '500 mcg', recommended: true },
    { flacon: '10 mg', eau: '4 ml', conc: '2.5 mg/ml', u1: '25 mcg', u10: '250 mcg' },
    { flacon: '20 mg', eau: '1 ml', conc: '20 mg/ml', u1: '200 mcg', u10: '2 mg' },
    { flacon: '20 mg', eau: '2 ml', conc: '10 mg/ml', u1: '100 mcg', u10: '1 mg', recommended: true },
    { flacon: '20 mg', eau: '4 ml', conc: '5 mg/ml', u1: '50 mcg', u10: '500 mcg' },
  ];

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.border}` }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: `${C.cyan}0a`, borderBottom: `1px solid ${C.border}` }}>
            {['Flacon', 'Eau BAC', 'Concentration', '1 unite', '10 unites'].map((h) => (
              <th
                key={h}
                className="text-left py-2.5 px-3 font-mono font-semibold"
                style={{ color: C.cyan }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background:
                  hovered === i
                    ? `${C.cyan}10`
                    : row.recommended
                    ? `${C.amber}06`
                    : 'transparent',
                borderBottom: `1px solid ${C.border}`,
                transition: 'background 0.2s',
                cursor: 'default',
              }}
            >
              <td className="py-2 px-3 font-mono" style={{ color: C.amber }}>
                {row.flacon}
                {row.recommended && (
                  <Star
                    size={10}
                    fill={C.amber}
                    style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }}
                  />
                )}
              </td>
              <td className="py-2 px-3 font-mono" style={{ color: C.cyan }}>
                {row.eau}
              </td>
              <td className="py-2 px-3 font-mono font-bold" style={{ color: C.green }}>
                {row.conc}
              </td>
              <td className="py-2 px-3" style={{ color: C.textDim }}>
                {row.u1}
              </td>
              <td className="py-2 px-3" style={{ color: C.textDim }}>
                {row.u10}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const DoseCalculatorVisual: React.FC = () => {
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const shortcutsInView = useInView(shortcutsRef, { once: false });

  const scenarios10A: Scenario = {
    label: 'Scenario A — 1 ml',
    mg: 10,
    ml: 1,
    conc: 10,
    u1: '100 mcg',
    doses: [
      { dose: '250 mcg', units: '2.5 U' },
      { dose: '500 mcg', units: '5 U' },
      { dose: '1 mg', units: '10 U' },
    ],
  };
  const scenarios10B: Scenario = {
    label: 'Scenario B — 2 ml',
    mg: 10,
    ml: 2,
    conc: 5,
    u1: '50 mcg',
    recommended: true,
    doses: [
      { dose: '250 mcg', units: '5 U' },
      { dose: '500 mcg', units: '10 U' },
      { dose: '1 mg', units: '20 U' },
    ],
  };
  const scenarios20A: Scenario = {
    label: 'Scenario A — 1 ml',
    mg: 20,
    ml: 1,
    conc: 20,
    u1: '200 mcg',
    doses: [
      { dose: '250 mcg', units: '1.25 U' },
      { dose: '500 mcg', units: '2.5 U' },
      { dose: '1 mg', units: '5 U' },
    ],
  };
  const scenarios20B: Scenario = {
    label: 'Scenario B — 2 ml',
    mg: 20,
    ml: 2,
    conc: 10,
    u1: '100 mcg',
    recommended: true,
    doses: [
      { dose: '250 mcg', units: '2.5 U' },
      { dose: '500 mcg', units: '5 U' },
      { dose: '1 mg', units: '10 U' },
    ],
  };

  const workedExamples: WorkedExample[] = [
    { dose: '500 mcg', conc: '5000 mcg/ml', result: '10 U', desc: 'Flacon 10mg + 2ml → dose 500mcg' },
    { dose: '250 mcg', conc: '5000 mcg/ml', result: '5 U', desc: 'Flacon 10mg + 2ml → dose 250mcg' },
    { dose: '1000 mcg', conc: '10000 mcg/ml', result: '10 U', desc: 'Flacon 20mg + 2ml → dose 1mg' },
  ];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: C.bg, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: C.border }}>
        <SectionLabel>Calcul des Doses</SectionLabel>
        <h2 className="text-xl font-bold text-white">
          Guide Visuel — Concentrations & Unites
        </h2>
        <p className="text-sm mt-1" style={{ color: C.textMuted }}>
          Calculer sa concentration et convertir en unites de seringue U-100.
        </p>
      </div>

      <div className="p-4 space-y-6">

        {/* Section 1 — La formule */}
        <div>
          <SectionLabel>1. La Formule</SectionLabel>
          <div
            className="rounded-xl p-4"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              {[
                { label: 'Flacon (mg)', val: 'mg', color: C.amber, icon: <FlaskConical size={14} /> },
                { label: '', val: '÷', color: C.textMuted, icon: null },
                { label: 'BAC Water (ml)', val: 'ml', color: C.cyan, icon: <Droplets size={14} /> },
                { label: '', val: '=', color: C.textMuted, icon: null },
                { label: 'Solution', val: 'mg/ml', color: C.green, icon: <Beaker size={14} /> },
              ].map((item, i) =>
                item.icon === null ? (
                  <span key={i} className="text-2xl font-bold" style={{ color: item.color }}>
                    {item.val}
                  </span>
                ) : (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono font-bold text-lg border"
                      style={{
                        background: `${item.color}15`,
                        borderColor: `${item.color}35`,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                      {item.val}
                    </div>
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {item.label}
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ex: '10mg + 2ml', res: '5 mg/ml' },
                { ex: '20mg + 2ml', res: '10 mg/ml' },
              ].map((e) => (
                <div
                  key={e.ex}
                  className="text-center py-2 px-3 rounded-lg text-sm"
                  style={{ background: C.greenDim, border: `1px solid ${C.green}30` }}
                >
                  <span style={{ color: C.textDim }}>{e.ex}</span>
                  <span style={{ color: C.textMuted }}> = </span>
                  <span className="font-mono font-bold" style={{ color: C.green }}>
                    {e.res}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 — Seringue U-100 */}
        <div>
          <SectionLabel>2. Lire sa Seringue Insuline U-100</SectionLabel>
          <SyringeDiagram />
        </div>

        {/* Section 3 — Flacon 10mg */}
        <div>
          <SectionLabel>3. Flacon 10mg — 2 Scenarios</SectionLabel>
          <div className="flex gap-3 flex-col sm:flex-row">
            <ScenarioCard scenario={scenarios10A} />
            <ScenarioCard scenario={scenarios10B} />
          </div>
        </div>

        {/* Section 4 — Flacon 20mg */}
        <div>
          <SectionLabel>4. Flacon 20mg — 2 Scenarios</SectionLabel>
          <div className="flex gap-3 flex-col sm:flex-row">
            <ScenarioCard scenario={scenarios20A} />
            <ScenarioCard scenario={scenarios20B} />
          </div>
        </div>

        {/* Section 5 — Formule dose → unites */}
        <div>
          <SectionLabel>5. Formule Dose → Unites</SectionLabel>
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="text-xs font-mono mb-2" style={{ color: C.textMuted }}>
              FORMULE
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { val: 'Dose (mcg)', color: C.amber },
                { val: '÷', color: C.textMuted },
                { val: 'Concentration (mcg/ml)', color: C.cyan },
                { val: '× 100', color: C.textMuted },
                { val: '=', color: C.textMuted },
                { val: 'Unites a tirer', color: C.green },
              ].map((item, i) => (
                <span
                  key={i}
                  className={
                    [C.amber, C.cyan, C.green].includes(item.color)
                      ? 'px-2 py-0.5 rounded font-mono font-bold'
                      : 'font-mono'
                  }
                  style={{
                    color: item.color,
                    background:
                      item.color === C.amber
                        ? C.amberDim
                        : item.color === C.cyan
                        ? C.cyanDim
                        : item.color === C.green
                        ? C.greenDim
                        : 'transparent',
                  }}
                >
                  {item.val}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {workedExamples.map((ex, i) => (
              <WorkedExampleCard key={i} ex={ex} delay={i * 0.1} />
            ))}
          </div>
        </div>

        {/* Section 6 — Tableau recap */}
        <div>
          <SectionLabel>6. Tableau de Reference Complet</SectionLabel>
          <p className="text-xs mb-3" style={{ color: C.textMuted }}>
            Les configurations avec <Star size={10} fill={C.amber} style={{ display: 'inline', verticalAlign: 'middle' }} /> sont recommandees pour une precision optimale des doses.
          </p>
          <ReferenceTable />
        </div>

        {/* Section 7 — Les 2 raccourcis */}
        <div ref={shortcutsRef}>
          <SectionLabel>7. Les 2 Raccourcis a Retenir</SectionLabel>
          <motion.div
            animate={
              shortcutsInView
                ? {
                    boxShadow: [
                      `0 0 0px ${C.amber}00`,
                      `0 0 24px ${C.amber}35`,
                      `0 0 8px ${C.amber}18`,
                      `0 0 24px ${C.amber}30`,
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            className="rounded-xl p-5"
            style={{
              background: `${C.amber}0c`,
              border: `1.5px solid ${C.amberBorder}`,
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  conc: '5 mg/ml',
                  rule: '1 unite = 50 mcg',
                  note: '(10mg + 2ml ou 20mg + 4ml)',
                  color: C.amber,
                },
                {
                  conc: '10 mg/ml',
                  rule: '1 unite = 100 mcg',
                  note: '(20mg + 2ml ou 10mg + 1ml)',
                  color: C.cyan,
                },
              ].map((shortcut) => (
                <div
                  key={shortcut.conc}
                  className="rounded-lg p-4 text-center"
                  style={{
                    background: `${shortcut.color}0f`,
                    border: `1px solid ${shortcut.color}35`,
                  }}
                >
                  <div
                    className="text-lg font-mono font-bold mb-1"
                    style={{ color: shortcut.color }}
                  >
                    {shortcut.conc}
                  </div>
                  <div className="text-base font-bold text-white mb-1">
                    {shortcut.rule}
                  </div>
                  <div className="text-xs" style={{ color: C.textMuted }}>
                    {shortcut.note}
                  </div>
                </div>
              ))}
            </div>
            <Divider />
            <div className="flex items-start gap-2 text-sm" style={{ color: C.textDim }}>
              <Eye size={15} style={{ color: C.amber, marginTop: 2, flexShrink: 0 }} />
              Memoriser ces deux raccourcis couvre 80% des configurations courantes. Verifier
              toujours le calcul complet pour les configurations non standard.
            </div>
          </motion.div>
        </div>

        {/* Visual syringe fills for quick ref */}
        <div>
          <div className="text-xs font-mono mb-3" style={{ color: C.textMuted }}>
            VISUALISATION — SERINGUE U-100 A 5 mg/ml
          </div>
          <div className="flex gap-4 justify-start">
            {[
              { fill: 0.05, label: '250mcg' },
              { fill: 0.1, label: '500mcg' },
              { fill: 0.2, label: '1mg' },
              { fill: 0.5, label: '2.5mg' },
            ].map((item) => (
              <SyringeFill key={item.label} fill={item.fill} label={item.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
