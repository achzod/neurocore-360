'use client';

import { motion } from 'framer-motion';

interface GradientDividerProps {
  label?: string;
  variant?: 'default' | 'accent' | 'warning' | 'success';
  animated?: boolean;
}

export const GradientDivider = ({
  label,
  variant = 'default',
  animated = true,
}: GradientDividerProps) => {
  const variantColors = {
    default: {
      from: '#06b6d4',
      to: '#3b82f6',
      glow: 'rgba(6, 182, 212, 0.4)',
    },
    accent: {
      from: '#8b5cf6',
      to: '#ec4899',
      glow: 'rgba(139, 92, 246, 0.4)',
    },
    warning: {
      from: '#f59e0b',
      to: '#f97316',
      glow: 'rgba(245, 158, 11, 0.4)',
    },
    success: {
      from: '#10b981',
      to: '#06b6d4',
      glow: 'rgba(16, 185, 129, 0.4)',
    },
  }[variant];

  return (
    <div className="relative flex items-center justify-center my-16">
      {/* Base line */}
      <div
        className="absolute inset-x-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${variantColors.from}, ${variantColors.to}, transparent)`,
          opacity: 0.3,
        }}
      />

      {/* Animated glow */}
      {animated && (
        <motion.div
          className="absolute inset-x-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${variantColors.glow}, transparent)`,
            boxShadow: `0 0 20px ${variantColors.glow}`,
            width: '30%',
          }}
          animate={{
            left: ['-30%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Label (if provided) */}
      {label && (
        <motion.div
          className="relative z-10 px-6 text-xs uppercase tracking-widest font-semibold"
          style={{
            background: '#0a0b0d',
            color: variantColors.from,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
};
