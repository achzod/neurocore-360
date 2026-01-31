'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface CategoryScore {
  key: string;
  label: string;
  score: number;
  markerCount: number;
  criticalCount: number;
}

interface InteractiveHeatmapProps {
  categories: CategoryScore[];
  onCategoryClick?: (key: string) => void;
}

export const InteractiveHeatmap = ({
  categories,
  onCategoryClick,
}: InteractiveHeatmapProps) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 85) return { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', text: '#06b6d4' };
    if (score >= 70) return { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#3b82f6' };
    if (score >= 50) return { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#f59e0b' };
    return { bg: 'rgba(244, 63, 94, 0.2)', border: '#f43f5e', text: '#f43f5e' };
  };

  const handleClick = (key: string) => {
    setSelectedKey(selectedKey === key ? null : key);
    onCategoryClick?.(key);
  };

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Heatmap des catégories de biomarqueurs"
    >
      {categories.map((category, index) => {
        const colors = getScoreColor(category.score);
        const isHovered = hoveredKey === category.key;
        const isSelected = selectedKey === category.key;

        return (
          <motion.button
            key={category.key}
            type="button"
            role="button"
            aria-label={`${category.label}: score ${category.score}%, ${category.markerCount} biomarqueurs, ${category.criticalCount} critiques`}
            aria-pressed={isSelected}
            tabIndex={0}
            className="relative group text-left"
            onClick={() => handleClick(category.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(category.key);
              }
            }}
            onHoverStart={() => setHoveredKey(category.key)}
            onHoverEnd={() => setHoveredKey(null)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative overflow-hidden rounded-xl p-6 h-full"
              style={{
                background: isHovered || isSelected ? colors.bg : 'rgba(26, 29, 36, 0.4)',
                backdropFilter: 'blur(8px)',
                border: `2px solid ${isHovered || isSelected ? colors.border : 'rgba(148, 163, 184, 0.2)'}`,
                transition: 'all 0.3s ease',
              }}
            >
              {/* Grain texture */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 60px ${colors.bg}`,
                  opacity: 0,
                }}
                animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Label */}
                <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-4">
                  {category.label}
                </h3>

                {/* Score */}
                <div className="flex items-baseline gap-2 mb-3">
                  <motion.span
                    className="text-5xl font-bold font-mono tabular-nums"
                    style={{
                      color: colors.text,
                      textShadow: `0 0 30px ${colors.bg}`,
                    }}
                    animate={isHovered ? {
                      scale: [1, 1.1, 1],
                      textShadow: [
                        `0 0 30px ${colors.bg}`,
                        `0 0 50px ${colors.bg}`,
                        `0 0 30px ${colors.bg}`,
                      ],
                    } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    {category.score}
                  </motion.span>
                  <span className="text-xl text-slate-500">/100</span>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{category.markerCount} marqueurs</span>
                  {category.criticalCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: 'rgba(244, 63, 94, 0.2)',
                        color: '#f43f5e',
                      }}
                    >
                      {category.criticalCount} critique{category.criticalCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${colors.border}, ${colors.text})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${category.score}%` }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: colors.border,
                    color: '#0a0b0d',
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <span className="text-sm">✓</span>
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
