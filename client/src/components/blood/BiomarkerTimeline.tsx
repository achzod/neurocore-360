'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBloodTheme } from './BloodThemeContext';

interface TimelineDataPoint {
  date: string;
  value: number;
  status: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  notes?: string;
}

interface BiomarkerTimelineProps {
  markerName: string;
  unit: string;
  data: TimelineDataPoint[];
  optimalMin?: number;
  optimalMax?: number;
}

export const BiomarkerTimeline = ({
  markerName,
  unit,
  data,
  optimalMin,
  optimalMax,
}: BiomarkerTimelineProps) => {
  const { theme } = useBloodTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const statusColors = {
    optimal: '#06b6d4',
    normal: '#3b82f6',
    suboptimal: '#f59e0b',
    critical: '#f43f5e',
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return TrendingUp;
    if (current < previous) return TrendingDown;
    return Minus;
  };

  return (
    <div className="relative py-8">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-200 mb-1">{markerName}</h3>
        <p className="text-sm text-slate-500">Evolution sur {data.length} tests</p>
      </div>

      {/* Timeline line */}
      <div
        className="absolute left-8 top-24 bottom-0 w-0.5"
        style={{
          background: 'linear-gradient(180deg, rgba(6,182,212,0.5), rgba(59,130,246,0.5))',
        }}
      />

      {/* Data points */}
      <div className="space-y-8 relative">
        {data.map((point, index) => {
          const TrendIcon = index > 0 ? getTrendIcon(point.value, data[index - 1].value) : null;

          return (
            <motion.div
              key={index}
              className="relative flex items-start gap-6 group"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
            >
              {/* Timeline node */}
              <motion.div
                className="relative z-10 flex-shrink-0"
                whileHover={{ scale: 1.3 }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: statusColors[point.status],
                    border: `2px solid ${theme.border || theme.background}`,
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 0 0 ${statusColors[point.status]}40`,
                      `0 0 0 8px ${statusColors[point.status]}00`,
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                />

                {/* Connecting line to card */}
                <motion.div
                  className="absolute top-2 left-4 h-0.5 w-6"
                  style={{ background: statusColors[point.status] }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                />
              </motion.div>

              {/* Content card */}
              <motion.div
                className="flex-1 rounded-xl p-6 cursor-pointer"
                style={{
                  background: hoveredIndex === index ? 'rgba(26, 29, 36, 0.8)' : 'rgba(26, 29, 36, 0.4)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${hoveredIndex === index ? statusColors[point.status] : 'rgba(148, 163, 184, 0.2)'}`,
                }}
                whileHover={{ x: 8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {/* Date & trend */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(point.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {TrendIcon && (
                    <div className="flex items-center gap-1 text-xs">
                      <TrendIcon
                        className="w-4 h-4"
                        style={{
                          color: point.value > data[index - 1].value
                            ? '#10b981'
                            : point.value < data[index - 1].value
                            ? '#f43f5e'
                            : '#94a3b8',
                        }}
                      />
                      <span
                        style={{
                          color: point.value > data[index - 1].value
                            ? '#10b981'
                            : point.value < data[index - 1].value
                            ? '#f43f5e'
                            : '#94a3b8',
                        }}
                      >
                        {index > 0
                          ? `${((point.value - data[index - 1].value) / data[index - 1].value * 100).toFixed(1)}%`
                          : 'Baseline'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="flex items-baseline gap-2 mb-2">
                  <motion.span
                    className="text-4xl font-bold font-mono tabular-nums"
                    style={{
                      color: statusColors[point.status],
                      textShadow: `0 0 20px ${statusColors[point.status]}40`,
                    }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.5, type: 'spring' }}
                  >
                    {point.value}
                  </motion.span>
                  <span className="text-lg text-slate-500">{unit}</span>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs uppercase tracking-wider px-2 py-1 rounded-full font-semibold"
                    style={{
                      background: `${statusColors[point.status]}20`,
                      color: statusColors[point.status],
                      border: `1px solid ${statusColors[point.status]}`,
                    }}
                  >
                    {point.status}
                  </span>

                  {/* Optimal range indicator */}
                  {optimalMin !== undefined && optimalMax !== undefined && (
                    <span className="text-xs text-slate-500">
                      Optimal: {optimalMin}-{optimalMax} {unit}
                    </span>
                  )}
                </div>

                {/* Notes (if any) */}
                <AnimatePresence>
                  {hoveredIndex === index && point.notes && (
                    <motion.div
                      className="mt-4 pt-4 border-t border-slate-700"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-sm text-slate-400 italic">{point.notes}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
