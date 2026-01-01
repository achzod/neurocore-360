interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-emerald-400";
  if (score >= 70) return "from-blue-500 to-blue-400";
  if (score >= 60) return "from-amber-500 to-amber-400";
  return "from-red-500 to-red-400";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Très Bon";
  if (score >= 65) return "Bon";
  if (score >= 55) return "À Optimiser";
  return "Prioritaire";
}

export function ScoreGauge({ score, size = "md", showLabel = true }: ScoreGaugeProps) {
  const sizes = {
    sm: { container: "w-24 h-24", text: "text-2xl", label: "text-xs" },
    md: { container: "w-36 h-36", text: "text-4xl", label: "text-sm" },
    lg: { container: "w-48 h-48", text: "text-5xl", label: "text-base" }
  };

  const config = sizes[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`${config.container} relative flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`${getScoreColor(score)}`} stopColor="currentColor" />
            <stop offset="100%" className={`${getScoreColor(score)}`} stopColor="currentColor" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="text-center z-10">
        <span className={`${config.text} font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
        {showLabel && (
          <p className={`${config.label} text-muted-foreground mt-1`}>
            {getScoreLabel(score)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ScoreGauge;
