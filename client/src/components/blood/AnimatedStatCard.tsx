'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
}

export const AnimatedStatCard = ({
  label,
  value,
  unit,
  icon: Icon,
  color = '#06b6d4',
  trend,
}: AnimatedStatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Counter animation when in view
  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      className="relative group cursor-default"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -4 }}
      role="article"
      aria-label={`${label}: ${value}${unit || ''}${trend ? `, tendance ${trend.direction === 'up' ? 'en hausse' : 'en baisse'} de ${trend.value}` : ''}`}
    >
      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--color-surface, rgba(26, 29, 36, 0.4))',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border, rgba(148, 163, 184, 0.2))',
        }}
      >
        {/* Icon */}
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{
            background: `${color}20`,
            border: `1px solid ${color}40`,
          }}
          whileHover={{ rotate: 15 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </motion.div>

        {/* Value */}
        <div className="flex items-baseline gap-2 mb-2">
          <motion.span
            className="text-4xl font-bold font-mono tabular-nums"
            style={{
              color,
              textShadow: `0 0 20px ${color}40`,
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {displayValue}
          </motion.span>
          {unit && <span className="text-lg" style={{ color: 'var(--color-text-muted, #94a3b8)' }}>{unit}</span>}
        </div>

        {/* Label */}
        <div className="text-sm" style={{ color: 'var(--color-text-muted, #94a3b8)' }}>{label}</div>

        {/* Trend (if provided) */}
        {trend && (
          <div
            className="mt-2 flex items-center gap-1 text-xs"
            style={{
              color: trend.direction === 'up' ? '#10b981' : '#f43f5e',
            }}
          >
            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
            <span className="font-semibold">{trend.value}</span>
          </div>
        )}

        {/* Glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 40px ${color}20`,
            opacity: 0,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
};
