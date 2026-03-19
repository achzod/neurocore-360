import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { FONTS, COLORS } from "../design/tokens";

export const ScoreCounter: React.FC<{
  value: number;
  suffix?: string;
  color?: string;
  fontSize?: number;
  delay?: number;
}> = ({ value, suffix = "", color = COLORS.yellow, fontSize = 64, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 80 },
  });

  const displayValue = Math.round(progress * value);

  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize,
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {displayValue}{suffix}
    </span>
  );
};
