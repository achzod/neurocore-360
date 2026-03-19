import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const HUDCorners: React.FC<{
  color?: string;
  size?: number;
  padding?: number;
  fadeInStart?: number;
  fadeInDuration?: number;
}> = ({ color = "#FCDD00", size = 40, padding = 40, fadeInStart = 0, fadeInDuration = 15 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [fadeInStart, fadeInStart + fadeInDuration], [0, 0.6], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const cornerStyle = (top: boolean, left: boolean): React.CSSProperties => ({
    position: "absolute",
    top: top ? padding : undefined,
    bottom: !top ? padding : undefined,
    left: left ? padding : undefined,
    right: !left ? padding : undefined,
    width: size,
    height: size,
    borderTop: top ? `2px solid ${color}` : "none",
    borderBottom: !top ? `2px solid ${color}` : "none",
    borderLeft: left ? `2px solid ${color}` : "none",
    borderRight: !left ? `2px solid ${color}` : "none",
    opacity,
  });

  return (
    <AbsoluteFill>
      <div style={cornerStyle(true, true)} />
      <div style={cornerStyle(true, false)} />
      <div style={cornerStyle(false, true)} />
      <div style={cornerStyle(false, false)} />
    </AbsoluteFill>
  );
};
