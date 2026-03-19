import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { GlitchText } from "../components/GlitchText";
import { ScanLine } from "../components/ScanLine";

// Floating data fragments for visual atmosphere
const DATA_FRAGMENTS = [
  { text: "Cortisol: ???", x: 120, y: 180 },
  { text: "HRV: ---", x: 1650, y: 250 },
  { text: "TSH: ???", x: 200, y: 750 },
  { text: "Testo: ---", x: 1550, y: 700 },
  { text: "Sleep: ???", x: 350, y: 400 },
  { text: "VO2: ---", x: 1400, y: 500 },
];

export const Scene02_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: "TON CORPS EST UN SYSTEME DE DONNEES" (frames 0-80)
  const words1 = ["TON", "CORPS", "EST", "UN"];
  const words2 = ["SYSTEME", "DE", "DONNEES"];

  // Phase 2: Glitch transition at frame 80, then new text (frames 80-120)
  const isPhase2 = frame >= 80;
  const phase2Opacity = interpolate(frame, [83, 93], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Heartbeat pulse (subtle background circle)
  const heartbeat = Math.sin(frame / 8) * 0.5 + 0.5;
  const heartbeatScale = 1 + heartbeat * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />

      {/* Heartbeat pulse ring behind text */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: `1px solid ${COLORS.yellow}15`,
            transform: `scale(${heartbeatScale})`,
            opacity: isPhase2 ? 0 : 0.4,
          }}
        />
      </AbsoluteFill>

      {/* Floating data fragments — show as "unknown" in phase 1 */}
      {!isPhase2 && DATA_FRAGMENTS.map((frag, i) => {
        const fragOpacity = interpolate(frame, [15 + i * 6, 25 + i * 6], [0, 0.3], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        const drift = Math.sin((frame + i * 20) / 20) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: frag.x,
              top: frag.y + drift,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.05em",
              opacity: fragOpacity,
            }}
          >
            {frag.text}
          </div>
        );
      })}

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {!isPhase2 ? (
          <>
            {/* Line 1 */}
            <div style={{ display: "flex", gap: 24, marginBottom: 8 }}>
              {words1.map((word, i) => {
                const wordDelay = i * 5;
                const wordOpacity = spring({ frame: frame - wordDelay, fps, config: { damping: 30 } });
                const wordY = interpolate(
                  spring({ frame: frame - wordDelay, fps, config: { damping: 20, stiffness: 80 } }),
                  [0, 1],
                  [30, 0]
                );
                return (
                  <div
                    key={i}
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 80,
                      fontWeight: 900,
                      color: COLORS.white,
                      textTransform: "uppercase",
                      letterSpacing: "-0.04em",
                      opacity: wordOpacity,
                      transform: `translateY(${wordY}px)`,
                    }}
                  >
                    {word}
                  </div>
                );
              })}
            </div>

            {/* Line 2 */}
            <div style={{ display: "flex", gap: 24 }}>
              {words2.map((word, i) => {
                const wordDelay = (i + 4) * 5;
                const wordOpacity = spring({ frame: frame - wordDelay, fps, config: { damping: 30 } });
                const wordY = interpolate(
                  spring({ frame: frame - wordDelay, fps, config: { damping: 20, stiffness: 80 } }),
                  [0, 1],
                  [30, 0]
                );
                return (
                  <div
                    key={i}
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 80,
                      fontWeight: 900,
                      color: COLORS.white,
                      textTransform: "uppercase",
                      letterSpacing: "-0.04em",
                      opacity: wordOpacity,
                      transform: `translateY(${wordY}px)`,
                    }}
                  >
                    {word}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ opacity: phase2Opacity, textAlign: "center" }}>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 36,
                fontWeight: 300,
                color: COLORS.gray[400],
                marginBottom: 24,
                letterSpacing: "0.02em",
              }}
            >
              La plupart le font tourner a l'aveugle.
            </div>
            <GlitchText
              text="MOI, JE LE DECODE."
              fontSize={80}
              color={COLORS.yellow}
              glitchFrame={0}
              glitchDuration={6}
              style={{ textAlign: "center" }}
            />

            {/* Underline accent */}
            <div style={{
              width: interpolate(frame, [90, 105], [0, 400], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
              height: 3,
              backgroundColor: COLORS.yellow,
              margin: "20px auto 0",
              boxShadow: `0 0 20px ${COLORS.yellow}60`,
            }} />
          </div>
        )}
      </AbsoluteFill>

      {/* Scan line on glitch transition */}
      <ScanLine color={COLORS.yellow} duration={6} startFrame={78} />

      {/* White flash on transition */}
      {frame >= 78 && frame <= 83 && (
        <AbsoluteFill
          style={{
            backgroundColor: COLORS.white,
            opacity: interpolate(frame, [78, 80, 83], [0, 0.9, 0], { extrapolateRight: "clamp" }),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
