import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../design/tokens";

export const ScanLine: React.FC<{
  color?: string;
  duration?: number;
  startFrame?: number;
}> = ({ color = COLORS.yellow, duration = 60, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const relFrame = frame - startFrame;

  if (relFrame < 0 || relFrame > duration) return null;

  const y = interpolate(relFrame, [0, duration], [0, height], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(relFrame, [0, duration * 0.1, duration * 0.9, duration], [0, 0.8, 0.8, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: y,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity,
          boxShadow: `0 0 20px ${color}80, 0 0 60px ${color}40`,
        }}
      />
    </AbsoluteFill>
  );
};
