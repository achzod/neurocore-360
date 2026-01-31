import { motion } from "framer-motion";

export function AnimatedGradientMesh() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-20"
      aria-hidden="true"
    >
      {/* Orb 1: Cyan - top left */}
      <motion.div
        className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-cyan-500 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb 2: Blue - bottom right */}
      <motion.div
        className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-blue-500 blur-[120px]"
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb 3: Purple - center right (NOUVEAU) */}
      <motion.div
        className="absolute right-1/3 top-1/3 h-1/3 w-1/3 rounded-full bg-purple-500 blur-[80px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb 4: Amber - bottom left (NOUVEAU) */}
      <motion.div
        className="absolute left-1/4 bottom-1/4 h-1/4 w-1/4 rounded-full bg-amber-500 blur-[90px]"
        animate={{
          x: [0, -20, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
