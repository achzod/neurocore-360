interface AchzodLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AchzodLogo({ className = "", showText = true, size = "md" }: AchzodLogoProps) {
  const sizes = {
    sm: { svg: "h-6 w-6", text: "text-lg" },
    md: { svg: "h-8 w-8", text: "text-xl" },
    lg: { svg: "h-10 w-10", text: "text-2xl" },
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="logo-achzod">
      <svg 
        viewBox="0 0 38.047 30.012" 
        className={`${sizes[size].svg} text-primary`}
        fill="currentColor"
      >
        <g>
          <path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" />
          <path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" />
        </g>
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${sizes[size].text}`}>
          <span className="text-foreground">ACHZOD</span>
        </span>
      )}
    </div>
  );
}

export function AchzodMonogram({ className = "" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 38.047 30.012" 
      className={`text-primary ${className}`}
      fill="currentColor"
      data-testid="logo-achzod-monogram"
    >
      <g>
        <path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" />
        <path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" />
      </g>
    </svg>
  );
}
