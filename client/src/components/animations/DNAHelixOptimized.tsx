interface DNAHelixOptimizedProps {
  className?: string;
}

export function DNAHelixOptimized({ className = "" }: DNAHelixOptimizedProps) {
  return (
    <div className={`relative ${className}`} data-testid="animation-dna-helix">
      <svg viewBox="0 0 60 200" className="h-full w-full">
        <defs>
          <linearGradient id="dnaGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          <linearGradient id="dnaGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        
        <style>
          {`
            @keyframes dnaMove1 {
              0%, 100% { cx: 10; opacity: 0.6; }
              50% { cx: 50; opacity: 1; }
            }
            @keyframes dnaMove2 {
              0%, 100% { cx: 50; opacity: 1; }
              50% { cx: 10; opacity: 0.6; }
            }
            .dna-dot-1 { animation: dnaMove1 3s ease-in-out infinite; }
            .dna-dot-2 { animation: dnaMove2 3s ease-in-out infinite; }
          `}
        </style>
        
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <g key={i}>
            <circle
              className="dna-dot-1"
              cy={20 + i * 22}
              r="3"
              fill="url(#dnaGrad1)"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
            <circle
              className="dna-dot-2"
              cy={20 + i * 22}
              r="3"
              fill="url(#dnaGrad2)"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
            <line
              x1="10"
              y1={20 + i * 22}
              x2="50"
              y2={20 + i * 22}
              stroke="hsl(var(--primary) / 0.2)"
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
