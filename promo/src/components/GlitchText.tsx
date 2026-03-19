import { useCurrentFrame, interpolate } from "remotion";
import { FONTS } from "../design/tokens";

export const GlitchText: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
  glitchFrame?: number;
  glitchDuration?: number;
  style?: React.CSSProperties;
}> = ({ text, fontSize = 72, color = "#fff", glitchFrame = 0, glitchDuration = 4, style }) => {
  const frame = useCurrentFrame();
  const isGlitching = frame >= glitchFrame && frame < glitchFrame + glitchDuration;

  const baseStyle: React.CSSProperties = {
    fontFamily: FONTS.heading,
    fontSize,
    fontWeight: 900,
    color,
    textTransform: "uppercase" as const,
    letterSpacing: "-0.04em",
    position: "relative" as const,
    ...style,
  };

  if (!isGlitching) {
    return <div style={baseStyle}>{text}</div>;
  }

  const offset = interpolate(frame - glitchFrame, [0, glitchDuration], [6, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "relative" }}>
      {/* Red channel */}
      <div style={{ ...baseStyle, color: "#ff000080", position: "absolute", transform: `translate(${offset}px, ${-offset / 2}px)` }}>
        {text}
      </div>
      {/* Blue channel */}
      <div style={{ ...baseStyle, color: "#0000ff80", position: "absolute", transform: `translate(${-offset}px, ${offset / 2}px)` }}>
        {text}
      </div>
      {/* Main */}
      <div style={baseStyle}>{text}</div>
    </div>
  );
};
