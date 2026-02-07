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

  return (
    <div className="space-y-8">
      {/* Horizontal stepper (desktop) */}
      <div className="hidden lg:block">
        <div className="relative flex items-center justify-between">
          {/* Connecting line */}
          <div className="absolute top-6 left-0 right-0 h-0.5" style={{ backgroundColor: theme.borderDefault }}>
            <motion.div
              className="h-full"
              style={{ background: `linear-gradient(to right, ${theme.status.optimal}, ${theme.primaryBlue})` }}
              initial={{ width: '0%' }}
              animate={{ width: `${((currentPhase - 1) / (phases.length - 1)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          {/* Phase circles */}
          {phases.map((phase, index) => {
            const isActive = phase.id === currentPhase;
            const isCompleted = phase.id < currentPhase || phase.completed;

            return (
              <div key={phase.id} className="relative flex flex-col items-center z-10">
                {/* Circle */}
                <motion.button
                  className="w-12 h-12 rounded-full flex items-center justify-center relative"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${theme.primaryBlue}, ${theme.status.normal})`
                      : isCompleted
                      ? theme.status.optimal
                      : `${theme.textTertiary}33`,
                    border: isActive ? `3px solid ${theme.primaryBlue}80` : 'none',
                  }}
                  onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isActive ? {
                    boxShadow: [
                      `0 0 0 0 ${theme.primaryBlue}66`,
                      `0 0 0 20px ${theme.primaryBlue}00`,
                    ],
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <span className="font-bold text-white">{phase.id}</span>
                  )}
                </motion.button>

                {/* Label */}
                <div className="mt-4 text-center max-w-[120px]">
                  <div className="text-sm font-semibold" style={{ color: isActive ? theme.primaryBlue : theme.textSecondary }}>
                    {phase.title}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textTertiary }}>{phase.duration}</div>
                </div>

                {/* Arrow (except last) */}
                {index < phases.length - 1 && (
                  <ArrowRight
                    className="absolute top-4 -right-8 w-5 h-5"
                    style={{ display: 'none', color: theme.textTertiary }}
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
                      ? `linear-gradient(135deg, ${theme.primaryBlue}, ${theme.status.normal})`
                      : isCompleted
                      ? theme.status.optimal
                      : `${theme.textTertiary}33`,
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className="font-bold text-sm text-white">{phase.id}</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="font-semibold" style={{ color: isActive ? theme.primaryBlue : theme.textSecondary }}>
                  {phase.title}
                </div>
                <div className="text-xs" style={{ color: theme.textTertiary }}>{phase.duration}</div>
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
                    background: `${theme.surfaceElevated}99`,
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${theme.primaryBlue}4D`,
                  }}
                >
                  <h4 className="text-lg font-bold mb-2" style={{ color: theme.primaryBlue }}>{phase.title}</h4>
                  <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>{phase.description}</p>

                  <ul className="space-y-2">
                    {phase.items.map((item, idx) => (
                      <motion.li
                        key={idx}
                        className="flex items-start gap-3 text-sm"
                        style={{ color: theme.textSecondary }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Circle className="w-1.5 h-1.5 mt-2 flex-shrink-0" style={{ fill: theme.primaryBlue, color: theme.primaryBlue }} />
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
