'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface TrendSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  animationDelay?: number;
}

export const TrendSparkline = ({
  data,
  width = 80,
  height = 24,
  color = '#06b6d4',
  showGradient = true,
  animationDelay = 0,
}: TrendSparklineProps) => {
  // Generate SVG path from data
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    // Create smooth curve using quadratic bezier
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      pathData += ` Q ${cpX} ${prev.y}, ${curr.x} ${curr.y}`;
    }

    return pathData;
  }, [data, width, height]);

  // Calculate path length for animation
  const pathLength = useMemo(() => {
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', path);
    return tempPath.getTotalLength();
  }, [path]);

  // Determine trend direction
  const trend = data[data.length - 1] > data[0] ? 'up' : 'down';

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        {/* Gradient fill */}
        {showGradient && (
          <linearGradient id={`sparklineGradient-${animationDelay}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        )}
      </defs>

      {/* Gradient fill area */}
      {showGradient && (
        <motion.path
          d={`${path} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#sparklineGradient-${animationDelay})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animationDelay + 0.3, duration: 0.5 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: animationDelay, duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Last point indicator */}
      {data.length > 0 && (
        <motion.circle
          cx={width}
          cy={height - ((data[data.length - 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * height}
          r="3"
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: animationDelay + 1, type: 'spring', stiffness: 300 }}
        />
      )}
    </svg>
  );
};
