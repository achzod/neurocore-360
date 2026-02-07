'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';
import { useBloodTheme } from './BloodThemeContext';

interface MetricCard3DProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: ReactNode;
  status?: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  children?: ReactNode;
}

export const MetricCard3D = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  status = 'normal',
  children,
}: MetricCard3DProps) => {
  const { theme } = useBloodTheme();
  const ref = useRef<HTMLDivElement>(null);

  // Mouse tracking for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animations
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const statusBase = theme.status[status];
  const statusColors = {
    border: `${statusBase}66`,
    glow: `${statusBase}33`,
    text: statusBase,
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <motion.div
      ref={ref}
      className="relative group cursor-pointer"
      style={{
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: `${theme.surfaceElevated}99`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${statusColors.border}`,
        }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${statusColors.border}, transparent, ${statusColors.border})`,
            opacity: 0,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 60px ${statusColors.glow}`,
            opacity: 0,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Content */}
        <div className="relative z-10 p-8" style={{ transform: 'translateZ(20px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${statusColors.glow}, transparent)`,
                    border: `1px solid ${statusColors.border}`,
                  }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {icon}
                </motion.div>
              )}
              <div>
                <h3 className="text-sm uppercase tracking-wider font-semibold" style={{ color: theme.textSecondary }}>
                  {title}
                </h3>
                {trend && trendValue && (
                  <div className="flex items-center gap-1 mt-1">
                    <span style={{ color: statusColors.text }}>{trendIcons[trend]}</span>
                    <span className="text-xs" style={{ color: theme.textTertiary }}>{trendValue}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-3">
            <motion.div
              className="text-6xl font-bold font-mono tabular-nums"
              style={{
                color: statusColors.text,
                textShadow: `0 0 30px ${statusColors.glow}`,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              {value}
            </motion.div>
            {unit && (
              <span className="text-2xl font-medium" style={{ color: theme.textTertiary }}>{unit}</span>
            )}
          </div>

          {/* Additional content */}
          {children && <div className="mt-6">{children}</div>}
        </div>

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-x-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${statusColors.text}, transparent)`,
            boxShadow: `0 0 10px ${statusColors.glow}`,
          }}
          animate={{
            top: ['-10%', '110%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>
    </motion.div>
  );
};
