import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface ParticleGridProps {
  className?: string;
  particleCount?: number;
}

export function ParticleGrid({ className = "", particleCount = 50 }: ParticleGridProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, [particleCount]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} data-testid="animation-particle-grid">
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {[...Array(10)].map((_, i) => (
          <motion.line
            key={`h-line-${i}`}
            x1="0"
            y1={i * 10}
            x2="100"
            y2={i * 10}
            stroke="hsl(var(--primary) / 0.05)"
            strokeWidth="0.1"
            animate={{
              opacity: [0.02, 0.08, 0.02],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
        {[...Array(10)].map((_, i) => (
          <motion.line
            key={`v-line-${i}`}
            x1={i * 10}
            y1="0"
            x2={i * 10}
            y2="100"
            stroke="hsl(var(--primary) / 0.05)"
            strokeWidth="0.1"
            animate={{
              opacity: [0.02, 0.08, 0.02],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}

        {particles.map((particle) => (
          <motion.circle
            key={particle.id}
            r={particle.size * 0.1}
            fill="url(#particleGradient)"
            initial={{ cx: particle.x, cy: particle.y, opacity: 0 }}
            animate={{
              cx: [particle.x, particle.x + (Math.random() - 0.5) * 20, particle.x],
              cy: [particle.y, particle.y - 10, particle.y],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        <motion.circle
          cx="80"
          cy="20"
          r="15"
          fill="none"
          stroke="hsl(var(--primary) / 0.1)"
          strokeWidth="0.5"
          animate={{
            r: [10, 20, 10],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="20"
          cy="80"
          r="10"
          fill="none"
          stroke="hsl(var(--accent) / 0.1)"
          strokeWidth="0.5"
          animate={{
            r: [8, 15, 8],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </svg>

      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.03) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.03) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.03) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
