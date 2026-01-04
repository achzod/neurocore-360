import React from 'react';

interface RadialProgressProps {
  score: number;
  max: number;
  label: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ 
  score, 
  max, 
  label, 
  subLabel,
  size = 120, 
  strokeWidth = 4,
  color = "#E1E1E1"
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = score / max;
  const dashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          strokeOpacity={0.5}
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="square" 
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-medium tracking-tighter" style={{ color: 'var(--color-text)' }}>{score}</span>
        {subLabel && <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mt-1">{subLabel}</span>}
      </div>
    </div>
  );
};