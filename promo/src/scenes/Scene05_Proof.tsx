import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { ScoreCounter } from "../components/ScoreCounter";
import { ScanLine } from "../components/ScanLine";

// REAL stats from the platform
const STATS = [
  { value: 39, suffix: "", label: "BIOMARQUEURS", sublabel: "Blood Analysis" },
  { value: 183, suffix: "", label: "QUESTIONS", sublabel: "Ultimate Scan" },
  { value: 11, suffix: "", label: "CERTIFICATIONS", sublabel: "Internationales" },
];

const CERTS = [
  { org: "NASM", certs: "CPT · CNC · PES" },
  { org: "ISSA", certs: "CPT · SNS · SFC · SBC" },
  { org: "PRECISION NUTRITION", certs: "PN1" },
];

export const Scene05_Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Review card
  const reviewOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const reviewY = interpolate(
    spring({ frame: frame - 60, fps, config: { damping: 20 } }),
    [0, 1],
    [40, 0]
  );

  // Certifications
  const certOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateRight: "clamp" });

  // Scan line accent
  const scanProgress = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />

      {/* Opening scan line */}
      <ScanLine color={COLORS.yellow} duration={15} startFrame={0} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 100, marginBottom: 50 }}>
          {STATS.map((stat, i) => {
            const statScale = spring({ frame: frame - i * 8, fps, config: { damping: 15, stiffness: 80 } });
            return (
              <div key={i} style={{ textAlign: "center", transform: `scale(${0.7 + statScale * 0.3})`, opacity: statScale }}>
                <div style={{ marginBottom: 4 }}>
                  <ScoreCounter value={stat.value} suffix={stat.suffix} color={COLORS.yellow} fontSize={64} delay={i * 8} />
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.yellow, letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                  {stat.sublabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Separator line */}
        <div style={{
          width: 600,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${COLORS.yellow}40, transparent)`,
          marginBottom: 40,
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" }),
        }} />

        {/* Review quote */}
        <div
          style={{
            opacity: reviewOpacity,
            transform: `translateY(${reviewY}px)`,
            padding: "28px 56px",
            border: `1px solid ${COLORS.yellow}25`,
            backgroundColor: `${COLORS.yellow}06`,
            borderRadius: 2,
            maxWidth: 750,
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Quote marks */}
          <div style={{
            position: "absolute", top: -20, left: 30,
            fontFamily: FONTS.heading, fontSize: 60, color: COLORS.yellow, opacity: 0.2, lineHeight: 1,
          }}>
            "
          </div>

          <div style={{ fontFamily: FONTS.heading, fontSize: 22, color: "rgba(255,255,255,0.9)", fontStyle: "italic", lineHeight: 1.6, marginBottom: 16, letterSpacing: "-0.01em" }}>
            L'audit a detecte mon pre-diabete. Mon medecin traitant avait rien vu.
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              — Pierre L., Avocat
            </div>
            {/* Stars */}
            <div style={{ display: "flex", gap: 3 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ color: COLORS.yellow, fontSize: 14 }}>★</span>
              ))}
            </div>
          </div>
        </div>

        {/* Certifications grid */}
        <div style={{ opacity: certOpacity, marginTop: 40, display: "flex", gap: 40, alignItems: "flex-start" }}>
          {CERTS.map((cert, i) => {
            const certY = interpolate(
              spring({ frame: frame - 100 - i * 6, fps, config: { damping: 20 } }),
              [0, 1],
              [20, 0]
            );
            return (
              <div key={i} style={{
                textAlign: "center",
                transform: `translateY(${certY}px)`,
                padding: "16px 24px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 2,
                minWidth: 200,
              }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.yellow, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 8 }}>
                  {cert.org}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>
                  {cert.certs}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
