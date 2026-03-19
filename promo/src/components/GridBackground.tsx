import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../design/tokens";

export const GridBackground: React.FC<{
  color?: string;
  fadeIn?: boolean;
  fadeInDuration?: number;
}> = ({ color = COLORS.yellow, fadeIn = false, fadeInDuration = 30 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacity = fadeIn
    ? interpolate(frame, [0, fadeInDuration], [0, 0.06], { extrapolateRight: "clamp" })
    : 0.06;

  const lines: React.ReactNode[] = [];
  const spacing = 60;

  for (let x = 0; x <= width; x += spacing) {
    lines.push(
      <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1} opacity={opacity} />
    );
  }
  for (let y = 0; y <= height; y += spacing) {
    lines.push(
      <line key={`h-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1} opacity={opacity} />
    );
  }

  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        {lines}
      </svg>
    </AbsoluteFill>
  );
};
