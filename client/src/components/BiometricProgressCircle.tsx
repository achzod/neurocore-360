import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface BiometricProgressCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function BiometricProgressCircle({
  score,
  size = 200,
  strokeWidth = 12,
}: BiometricProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, score, {
      duration: 2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [score, count]);

  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`Score global: ${Math.round(score)} sur 100`}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(15, 23, 42, 0.08)"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="url(#grid)"
          stroke="rgba(15, 23, 42, 0.12)"
          strokeWidth={strokeWidth}
        />

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
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            filter: "drop-shadow(0 6px 12px rgba(6, 182, 212, 0.25))",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div className="font-data text-5xl font-bold text-cyan-700">
          {rounded}
        </motion.div>
        <div className="font-body text-xs uppercase tracking-widest text-slate-600">
          SCORE GLOBAL
        </div>
      </div>
    </div>
  );
}
