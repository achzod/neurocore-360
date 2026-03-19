import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { ScoreCounter } from "../components/ScoreCounter";
import { ScanLine } from "../components/ScanLine";

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

export const Scene05_Proof_V: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reviewOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const reviewY = interpolate(
    spring({ frame: frame - 60, fps, config: { damping: 20 } }),
    [0, 1],
    [40, 0]
  );
  const certOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />
      <ScanLine color={COLORS.yellow} duration={15} startFrame={0} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 50px" }}>
        {/* Stats — vertical stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30, marginBottom: 40, alignItems: "center" }}>
          {STATS.map((stat, i) => {
            const statScale = spring({ frame: frame - i * 8, fps, config: { damping: 15, stiffness: 80 } });
            return (
              <div key={i} style={{ textAlign: "center", transform: `scale(${0.7 + statScale * 0.3})`, opacity: statScale }}>
                <div style={{ marginBottom: 4 }}>
                  <ScoreCounter value={stat.value} suffix={stat.suffix} color={COLORS.yellow} fontSize={52} delay={i * 8} />
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.yellow, letterSpacing: "0.15em", fontWeight: 700, marginBottom: 2 }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                  {stat.sublabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{
          width: 400,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${COLORS.yellow}40, transparent)`,
          marginBottom: 30,
          opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" }),
        }} />

        {/* Review quote */}
        <div
          style={{
            opacity: reviewOpacity,
            transform: `translateY(${reviewY}px)`,
            padding: "20px 28px",
            border: `1px solid ${COLORS.yellow}25`,
            backgroundColor: `${COLORS.yellow}06`,
            borderRadius: 2,
            maxWidth: 700,
            textAlign: "center",
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute", top: -18, left: 20,
            fontFamily: FONTS.heading, fontSize: 48, color: COLORS.yellow, opacity: 0.2, lineHeight: 1,
          }}>
            "
          </div>

          <div style={{ fontFamily: FONTS.heading, fontSize: 18, color: "rgba(255,255,255,0.9)", fontStyle: "italic", lineHeight: 1.6, marginBottom: 12, letterSpacing: "-0.01em" }}>
            L'audit a detecte mon pre-diabete. Mon medecin traitant avait rien vu.
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              — Pierre L., Avocat
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ color: COLORS.yellow, fontSize: 12 }}>★</span>
              ))}
            </div>
          </div>
        </div>

        {/* Certifications — vertical */}
        <div style={{ opacity: certOpacity, marginTop: 30, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%" }}>
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
                padding: "12px 20px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 2,
                width: 400,
              }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.yellow, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 4 }}>
                  {cert.org}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>
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
