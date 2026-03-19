import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { HUDCorners } from "../components/HUDCorners";
import { ScanLine } from "../components/ScanLine";

const TERMINAL_LINES = [
  { text: "> SYSTEM_INIT... OK", startFrame: 15, color: COLORS.signal },
  { text: "> BIO_ENGINE v3.2", startFrame: 30, color: COLORS.signal },
  { text: "> MODULES: 5 LOADED", startFrame: 45, color: COLORS.yellow },
];

export const Scene01_Boot_V: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const crosshairScale = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const crosshairOpacity = interpolate(frame, [0, 15], [0, 0.6], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} fadeIn fadeInDuration={45} />

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={80} height={80} style={{ opacity: crosshairOpacity, transform: `scale(${crosshairScale})` }}>
          <line x1={40} y1={0} x2={40} y2={80} stroke={COLORS.yellow} strokeWidth={1} opacity={0.5} />
          <line x1={0} y1={40} x2={80} y2={40} stroke={COLORS.yellow} strokeWidth={1} opacity={0.5} />
          <circle cx={40} cy={40} r={15} stroke={COLORS.yellow} strokeWidth={1} fill="none" opacity={0.4} />
          <circle cx={40} cy={40} r={3} fill={COLORS.yellow} opacity={0.8} />
        </svg>
      </AbsoluteFill>

      <HUDCorners color={COLORS.yellow} fadeInStart={40} fadeInDuration={15} />

      <div style={{ position: "absolute", top: 120, left: 50 }}>
        {TERMINAL_LINES.map((line, i) => {
          const relFrame = frame - line.startFrame;
          if (relFrame < 0) return null;
          const charsToShow = Math.min(line.text.length, Math.floor(relFrame * 1.5));
          return (
            <div
              key={i}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 14,
                color: line.color,
                opacity: 0.9,
                marginBottom: 8,
                letterSpacing: "0.05em",
              }}
            >
              {line.text.slice(0, charsToShow)}
              {charsToShow < line.text.length && (
                <span style={{ opacity: frame % 8 < 4 ? 1 : 0 }}>_</span>
              )}
            </div>
          );
        })}
      </div>

      {frame > 60 && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            right: 50,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.signal, boxShadow: `0 0 10px ${COLORS.signal}` }} />
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.signal, letterSpacing: "0.2em" }}>
            ONLINE
          </span>
        </div>
      )}

      <ScanLine color={COLORS.yellow} duration={30} startFrame={60} />
    </AbsoluteFill>
  );
};
