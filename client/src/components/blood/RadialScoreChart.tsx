'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

interface RadialScoreChartProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  targetScore?: number;
  percentile?: number;
  showComparison?: boolean;
}

export const RadialScoreChart = ({
  score,
  maxScore = 100,
  size = 280,
  strokeWidth = 14,
  label = 'Score Global',
  sublabel,
  targetScore,
  percentile,
  showComparison = false,
}: RadialScoreChartProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (score / maxScore) * 100;
  const offset = circumference - (percentage / 100) * circumference;

  // Animated counter
  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 2000;
    const increment = (end - start) / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  // Color based on score
  const getScoreColor = (pct: number) => {
    if (pct >= 85) return { from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.3)' };
    if (pct >= 70) return { from: '#3b82f6', to: '#8b5cf6', glow: 'rgba(59,130,246,0.3)' };
    if (pct >= 50) return { from: '#f59e0b', to: '#f97316', glow: 'rgba(245,158,11,0.3)' };
    return { from: '#f43f5e', to: '#dc2626', glow: 'rgba(244,63,94,0.3)' };
  };

  const colors = getScoreColor(percentage);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="figure"
      aria-label={`${label}: ${score} sur ${maxScore}${sublabel ? `, ${sublabel}` : ''}${percentile !== undefined && showComparison ? `, Top ${100 - percentile}%` : ''}`}
    >
      {/* SVG Chart */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="scoreGrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth="0.5"
            />
          </pattern>

          {/* Score gradient */}
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle with grid */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="url(#scoreGrid)"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth={strokeWidth}
        />

        {/* Target score ring (if provided) */}
        {targetScore && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth={strokeWidth / 2}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - ((targetScore / maxScore) * circumference)}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: circumference - ((targetScore / maxScore) * circumference),
            }}
            transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
          />
        )}

        {/* Current score ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          filter="url(#scoreGlow)"
        />

        {/* Animated glow layer */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.from}
          strokeWidth={strokeWidth / 3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          opacity={0.5}
          animate={{
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            filter: 'blur(6px)',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Score number */}
        <motion.div
          className="text-7xl font-bold font-mono tabular-nums"
          style={{
            color: colors.from,
            textShadow: `0 0 40px ${colors.glow}`,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          aria-live="polite"
          aria-atomic="true"
        >
          {animatedScore}
        </motion.div>

        {/* Label */}
        <div className="text-xs uppercase tracking-widest text-slate-500 mt-2 font-semibold">
          {label}
        </div>

        {/* Sublabel */}
        {sublabel && (
          <div className="text-[10px] text-slate-600 mt-1">{sublabel}</div>
        )}

        {/* Percentile badge */}
        {percentile !== undefined && showComparison && (
          <motion.div
            className="mt-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: `linear-gradient(135deg, ${colors.glow}, transparent)`,
              border: `1px solid ${colors.from}`,
              color: colors.from,
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            Top {100 - percentile}%
          </motion.div>
        )}
      </div>

      {/* Floating labels */}
      {targetScore && (
        <motion.div
          className="absolute text-xs text-emerald-400 font-semibold"
          style={{
            top: '20%',
            right: '10%',
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          Objectif: {targetScore}
        </motion.div>
      )}
    </div>
  );
};
