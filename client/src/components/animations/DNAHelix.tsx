import { motion } from "framer-motion";

interface DNAHelixProps {
  className?: string;
}

export function DNAHelix({ className = "" }: DNAHelixProps) {
  const nucleotides = Array.from({ length: 20 }, (_, i) => i);
  
  return (
    <div className={`relative ${className}`} data-testid="animation-dna-helix">
      <svg
        viewBox="0 0 100 400"
        className="h-full w-full"
        style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.5))" }}
      >
        <defs>
          <linearGradient id="helixGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="helixGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {nucleotides.map((i) => {
          const y = 20 + i * 18;
          const phase = i * 0.5;
          
          return (
            <g key={i}>
              <motion.circle
                cx="50"
                cy={y}
                r="4"
                fill="url(#helixGradient1)"
                filter="url(#glow)"
                animate={{
                  cx: [20, 80, 20],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: phase * 0.15,
                  ease: "easeInOut",
                }}
              />
              <motion.circle
                cx="50"
                cy={y}
                r="4"
                fill="url(#helixGradient2)"
                filter="url(#glow)"
                animate={{
                  cx: [80, 20, 80],
                  opacity: [1, 0.6, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: phase * 0.15,
                  ease: "easeInOut",
                }}
              />
              <motion.line
                x1="20"
                y1={y}
                x2="80"
                y2={y}
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="1"
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: phase * 0.1,
                }}
              />
            </g>
          );
        })}
        
        <motion.path
          d="M 20 20 Q 50 100, 80 180 T 20 340"
          fill="none"
          stroke="url(#helixGradient1)"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            pathLength: [0, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.path
          d="M 80 20 Q 50 100, 20 180 T 80 340"
          fill="none"
          stroke="url(#helixGradient2)"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            pathLength: [0, 1],
            opacity: [0.8, 0.3, 0.8],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
}
