'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useBloodTheme } from './BloodThemeContext';

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
  const { theme, mode } = useBloodTheme();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 85) return { bg: `${theme.status.optimal}33`, border: theme.status.optimal, text: theme.status.optimal };
    if (score >= 70) return { bg: `${theme.status.normal}33`, border: theme.status.normal, text: theme.status.normal };
    if (score >= 50) return { bg: `${theme.status.suboptimal}33`, border: theme.status.suboptimal, text: theme.status.suboptimal };
    return { bg: `${theme.status.critical}33`, border: theme.status.critical, text: theme.status.critical };
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
            className="relative group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
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
                background: isHovered || isSelected ? colors.bg : theme.surfaceMuted,
                backdropFilter: 'blur(8px)',
                border: `2px solid ${isHovered || isSelected ? colors.border : theme.borderSubtle}`,
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
                <h3 className="text-sm uppercase tracking-wider font-semibold mb-4" style={{ color: theme.textTertiary }}>
                  {category.label}
                </h3>

                {/* Score */}
                <div className="flex items-baseline gap-2 mb-3">
                  <motion.span
                    className="text-5xl font-bold font-mono tabular-nums"
                    style={{
                      color: colors.text,
                      textShadow: mode === 'dark' ? `0 0 30px ${colors.bg}` : 'none',
                    }}
                    animate={isHovered ? {
                      scale: [1, 1.1, 1],
                      textShadow: mode === 'dark' ? [
                        `0 0 30px ${colors.bg}`,
                        `0 0 50px ${colors.bg}`,
                        `0 0 30px ${colors.bg}`,
                      ] : ['none', 'none', 'none'],
                    } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    {category.score}
                  </motion.span>
                  <span className="text-xl" style={{ color: theme.textTertiary }}>/100</span>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs" style={{ color: theme.textTertiary }}>
                  <span>{category.markerCount} marqueurs</span>
                  {category.criticalCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: `${theme.status.critical}33`,
                        color: theme.status.critical,
                      }}
                    >
                      {category.criticalCount} critique{category.criticalCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: theme.borderSubtle }}>
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
                    color: theme.surface,
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
