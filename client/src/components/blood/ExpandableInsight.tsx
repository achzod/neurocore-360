'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { useBloodTheme } from './BloodThemeContext';

interface ExpandableInsightProps {
  title: string;
  content: string;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  variant?: 'info' | 'warning' | 'success' | 'critical';
}

export const ExpandableInsight = ({
  title,
  content,
  defaultExpanded = false,
  icon,
  variant = 'info',
}: ExpandableInsightProps) => {
  const { theme, mode } = useBloodTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  const variantStyles = {
    info: {
      border: 'rgba(6, 182, 212, 0.3)',
      bg: 'rgba(6, 182, 212, 0.05)',
      icon: '#06b6d4',
    },
    warning: {
      border: 'rgba(245, 158, 11, 0.3)',
      bg: 'rgba(245, 158, 11, 0.05)',
      icon: '#f59e0b',
    },
    success: {
      border: 'rgba(16, 185, 129, 0.3)',
      bg: 'rgba(16, 185, 129, 0.05)',
      icon: '#10b981',
    },
    critical: {
      border: 'rgba(244, 63, 94, 0.3)',
      bg: 'rgba(244, 63, 94, 0.05)',
      icon: '#f43f5e',
    },
  }[variant];

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(26, 29, 36, 0.4)',
        border: `1px solid ${variantStyles.border}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-6 text-left transition-colors"
        style={{
          backgroundColor: isHovered
            ? (mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)')
            : 'transparent'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: variantStyles.bg,
              border: `1px solid ${variantStyles.border}`,
            }}
          >
            {icon || <Lightbulb className="w-5 h-5" style={{ color: variantStyles.icon }} />}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-slate-200">{title}</h3>
        </div>

        {/* Expand button */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-6 pb-6 pt-2 text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none"
              style={{
                borderTop: `1px solid ${variantStyles.border}`,
              }}
            >
              {/* Render content (simple text or Markdown component) */}
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
