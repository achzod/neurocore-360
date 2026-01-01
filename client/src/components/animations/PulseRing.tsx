import { motion } from "framer-motion";

interface PulseRingProps {
  className?: string;
  color?: "primary" | "accent";
}

export function PulseRing({ className = "", color = "primary" }: PulseRingProps) {
  return (
    <div className={`relative ${className}`} data-testid="animation-pulse-ring">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {[0, 1, 2, 3].map((i) => (
          <motion.circle
            key={i}
            cx="50"
            cy="50"
            r="20"
            fill="none"
            stroke={`hsl(var(--${color}))`}
            strokeWidth="0.5"
            initial={{ r: 15, opacity: 0.8 }}
            animate={{
              r: [15, 45],
              opacity: [0.6, 0],
              strokeWidth: [1, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.75,
              ease: "easeOut",
            }}
          />
        ))}
        
        <motion.circle
          cx="50"
          cy="50"
          r="12"
          fill={`hsl(var(--${color}) / 0.2)`}
          animate={{
            r: [10, 14, 10],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.circle
          cx="50"
          cy="50"
          r="6"
          fill={`hsl(var(--${color}))`}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <circle cx="50" cy="50" r="2" fill="white" opacity="0.9" />
      </svg>
    </div>
  );
}
