import { motion } from "framer-motion";

interface NeuralNetworkProps {
  className?: string;
}

export function NeuralNetwork({ className = "" }: NeuralNetworkProps) {
  const nodes = [
    { id: 1, cx: 15, cy: 30 },
    { id: 2, cx: 15, cy: 50 },
    { id: 3, cx: 15, cy: 70 },
    { id: 4, cx: 40, cy: 25 },
    { id: 5, cx: 40, cy: 45 },
    { id: 6, cx: 40, cy: 65 },
    { id: 7, cx: 40, cy: 85 },
    { id: 8, cx: 65, cy: 35 },
    { id: 9, cx: 65, cy: 55 },
    { id: 10, cx: 65, cy: 75 },
    { id: 11, cx: 90, cy: 45 },
    { id: 12, cx: 90, cy: 65 },
  ];

  const connections = [
    [1, 4], [1, 5], [1, 6],
    [2, 4], [2, 5], [2, 6], [2, 7],
    [3, 5], [3, 6], [3, 7],
    [4, 8], [4, 9],
    [5, 8], [5, 9], [5, 10],
    [6, 8], [6, 9], [6, 10],
    [7, 9], [7, 10],
    [8, 11], [8, 12],
    [9, 11], [9, 12],
    [10, 11], [10, 12],
  ];

  return (
    <div className={`relative ${className}`} data-testid="animation-neural-network">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          </linearGradient>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {connections.map(([from, to], index) => {
          const fromNode = nodes.find(n => n.id === from)!;
          const toNode = nodes.find(n => n.id === to)!;
          
          return (
            <motion.line
              key={`conn-${from}-${to}`}
              x1={fromNode.cx}
              y1={fromNode.cy}
              x2={toNode.cx}
              y2={toNode.cy}
              stroke="url(#connectionGradient)"
              strokeWidth="0.5"
              animate={{
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.1,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {connections.map(([from, to], index) => {
          const fromNode = nodes.find(n => n.id === from)!;
          const toNode = nodes.find(n => n.id === to)!;
          
          return (
            <motion.circle
              key={`signal-${from}-${to}`}
              r="1"
              fill="hsl(var(--primary))"
              filter="url(#nodeGlow)"
              animate={{
                cx: [fromNode.cx, toNode.cx],
                cy: [fromNode.cy, toNode.cy],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.15 + Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {nodes.map((node, index) => (
          <g key={node.id}>
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="5"
              fill="hsl(var(--primary) / 0.1)"
              animate={{
                r: [4, 6, 4],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.1,
              }}
            />
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="2.5"
              fill="hsl(var(--primary))"
              filter="url(#nodeGlow)"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.15,
              }}
            />
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="1"
              fill="white"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.1,
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
