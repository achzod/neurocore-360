import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { GlitchText } from "../components/GlitchText";
import { ScanLine } from "../components/ScanLine";

const DATA_FRAGMENTS = [
  { text: "Cortisol: ???", x: 60, y: 300 },
  { text: "HRV: ---", x: 750, y: 400 },
  { text: "TSH: ???", x: 100, y: 1200 },
  { text: "Testo: ---", x: 700, y: 1100 },
  { text: "Sleep: ???", x: 180, y: 700 },
  { text: "VO2: ---", x: 650, y: 800 },
];

export const Scene02_Problem_V: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words1 = ["TON", "CORPS"];
  const words2 = ["EST", "UN"];
  const words3 = ["SYSTEME", "DE"];
  const words4 = ["DONNEES"];

  const isPhase2 = frame >= 80;
  const phase2Opacity = interpolate(frame, [83, 93], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const heartbeat = Math.sin(frame / 8) * 0.5 + 0.5;
  const heartbeatScale = 1 + heartbeat * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: `1px solid ${COLORS.yellow}15`,
            transform: `scale(${heartbeatScale})`,
            opacity: isPhase2 ? 0 : 0.4,
          }}
        />
      </AbsoluteFill>

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
            {[words1, words2, words3, words4].map((line, lineIdx) => (
              <div key={lineIdx} style={{ display: "flex", gap: 18, marginBottom: 4 }}>
                {line.map((word, i) => {
                  const globalIdx = [0, 2, 4, 6][lineIdx] + i;
                  const wordDelay = globalIdx * 4;
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
                        fontSize: 64,
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
            ))}
          </>
        ) : (
          <div style={{ opacity: phase2Opacity, textAlign: "center", padding: "0 40px" }}>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 28,
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
              fontSize={56}
              color={COLORS.yellow}
              glitchFrame={0}
              glitchDuration={6}
              style={{ textAlign: "center" }}
            />
            <div style={{
              width: interpolate(frame, [90, 105], [0, 350], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
              height: 3,
              backgroundColor: COLORS.yellow,
              margin: "20px auto 0",
              boxShadow: `0 0 20px ${COLORS.yellow}60`,
            }} />
          </div>
        )}
      </AbsoluteFill>

      <ScanLine color={COLORS.yellow} duration={6} startFrame={78} />

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
