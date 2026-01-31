'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { useBloodTheme } from './BloodThemeContext';

interface Phase {
  id: number;
  title: string;
  duration: string;
  description: string;
  items: string[];
  completed?: boolean;
}

interface ProtocolStepperProps {
  phases: Phase[];
  currentPhase?: number;
}

export const ProtocolStepper = ({ phases, currentPhase = 1 }: ProtocolStepperProps) => {
  const { theme } = useBloodTheme();
  const [expandedPhase, setExpandedPhase] = useState<number | null>(currentPhase);

  const iconTextColor = theme.mode === 'dark' ? '#ffffff' : '#000000';

  return (
    <div className="space-y-8">
      {/* Horizontal stepper (desktop) */}
      <div className="hidden lg:block">
        <div className="relative flex items-center justify-between">
          {/* Connecting line */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentPhase - 1) / (phases.length - 1)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          {/* Phase circles */}
          {phases.map((phase, index) => {
            const isActive = phase.id === currentPhase;
            const isCompleted = phase.id < currentPhase || phase.completed;
            const isFuture = phase.id > currentPhase;

            return (
              <div key={phase.id} className="relative flex flex-col items-center z-10">
                {/* Circle */}
                <motion.button
                  className="w-12 h-12 rounded-full flex items-center justify-center relative"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                      : isCompleted
                      ? '#10b981'
                      : 'rgba(148, 163, 184, 0.2)',
                    border: isActive ? '3px solid rgba(6, 182, 212, 0.5)' : 'none',
                  }}
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 0 0 rgba(6, 182, 212, 0.4)',
                      '0 0 0 20px rgba(6, 182, 212, 0)',
                    ],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" style={{ color: iconTextColor }} />
                  ) : (
                    <span className="font-bold" style={{ color: iconTextColor }}>{phase.id}</span>
                  )}
                </motion.button>

                {/* Label */}
                <div className="mt-4 text-center max-w-[120px]">
                  <div className={`text-sm font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {phase.title}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{phase.duration}</div>
                </div>

                {/* Arrow (except last) */}
                {index < phases.length - 1 && (
                  <ArrowRight
                    className="absolute top-4 -right-8 w-5 h-5 text-slate-700"
                    style={{ display: 'none' }} // Handled by connecting line instead
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical stepper (mobile) */}
      <div className="lg:hidden space-y-4">
        {phases.map((phase) => {
          const isActive = phase.id === currentPhase;
          const isCompleted = phase.id < currentPhase || phase.completed;

          return (
            <motion.div
              key={phase.id}
              className="flex gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: phase.id * 0.1 }}
            >
              {/* Circle */}
              <div className="flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                      : isCompleted
                      ? '#10b981'
                      : 'rgba(148, 163, 184, 0.2)',
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" style={{ color: iconTextColor }} />
                  ) : (
                    <span className="font-bold text-sm" style={{ color: iconTextColor }}>{phase.id}</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className={`font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {phase.title}
                </div>
                <div className="text-xs text-slate-600">{phase.duration}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded phase details */}
      <AnimatePresence mode="wait">
        {expandedPhase !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {phases
              .filter((p) => p.id === expandedPhase)
              .map((phase) => (
                <div
                  key={phase.id}
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(26, 29, 36, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <h4 className="text-lg font-bold text-cyan-400 mb-2">{phase.title}</h4>
                  <p className="text-sm text-slate-400 mb-4">{phase.description}</p>

                  <ul className="space-y-2">
                    {phase.items.map((item, idx) => (
                      <motion.li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-slate-300"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Circle className="w-1.5 h-1.5 mt-2 flex-shrink-0 fill-cyan-500 text-cyan-500" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
