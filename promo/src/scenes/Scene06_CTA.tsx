import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { GlitchText } from "../components/GlitchText";
import { ScanLine } from "../components/ScanLine";

const TIERS = [
  {
    name: "DISCOVERY SCAN",
    price: "GRATUIT",
    highlight: false,
    color: COLORS.gray[400],
    features: ["66 questions", "10 domaines", "Score /100"],
  },
  {
    name: "ANABOLIC BIOSCAN",
    price: "59\u20AC",
    highlight: true,
    color: COLORS.yellow,
    features: ["137 questions", "Profil hormonal", "Protocole 90j"],
  },
  {
    name: "BLOOD ANALYSIS",
    price: "99\u20AC",
    highlight: false,
    color: COLORS.blue,
    features: ["39 biomarqueurs", "6 panels", "Ranges optimaux"],
  },
  {
    name: "ULTIMATE SCAN",
    price: "79\u20AC",
    highlight: false,
    color: COLORS.gray[400],
    features: ["183 questions", "Analyse photo", "Wearables"],
  },
  {
    name: "FORMCHECK",
    price: "1ere GRATUITE",
    highlight: false,
    color: COLORS.green,
    features: ["Score 0-100", "20+ exercices", "Via WhatsApp"],
  },
];

export const Scene06_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title slam
  const titleScale = interpolate(
    spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.6 } }),
    [0, 1],
    [1.5, 1]
  );
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Badge
  const badgeOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" });
  const badgePulse = Math.sin(frame / 8) * 0.12 + 0.88;

  // URL typewriter
  const url = "apexlabs.achzodcoaching.com";
  const urlStart = 110;
  const urlChars = Math.min(url.length, Math.max(0, Math.floor((frame - urlStart) * 1)));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />
      <ScanLine color={COLORS.yellow} duration={10} startFrame={0} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `scale(${titleScale})`, textAlign: "center", marginBottom: 50 }}>
          <GlitchText text="CHOISIS" fontSize={90} color={COLORS.white} glitchFrame={0} glitchDuration={4} />
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 90,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              WebkitTextStroke: `2px rgba(255,255,255,0.2)`,
              color: "transparent",
              lineHeight: 0.95,
            }}
          >
            TON SCAN
          </div>
        </div>

        {/* Pricing tiers */}
        <div style={{ display: "flex", gap: 20 }}>
          {TIERS.map((tier, i) => {
            const tierY = interpolate(
              spring({ frame: frame - 30 - i * 5, fps, config: { damping: 18, stiffness: 80 } }),
              [0, 1],
              [60, 0]
            );
            const tierOpacity = interpolate(frame, [30 + i * 5, 40 + i * 5], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

            return (
              <div
                key={i}
                style={{
                  width: 240,
                  padding: "28px 24px",
                  border: tier.highlight ? `2px solid ${COLORS.yellow}60` : "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: tier.highlight ? `${COLORS.yellow}0A` : "rgba(255,255,255,0.02)",
                  borderRadius: 4,
                  textAlign: "center",
                  transform: `translateY(${tierY}px)`,
                  opacity: tierOpacity,
                  boxShadow: tier.highlight ? `0 0 60px ${COLORS.yellow}12, inset 0 1px 0 ${COLORS.yellow}15` : "none",
                }}
              >
                {tier.highlight && (
                  <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.yellow, letterSpacing: "0.25em", marginBottom: 12, fontWeight: 700 }}>
                    ★ POPULAIRE
                  </div>
                )}
                <div style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.white, fontWeight: 700, marginBottom: 6, letterSpacing: "0.02em" }}>
                  {tier.name}
                </div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 32, color: tier.color, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 16 }}>
                  {tier.price}
                </div>

                {/* Feature list */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                  {tier.features.map((feat, j) => (
                    <div key={j} style={{
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                      color: tier.highlight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
                    }}>
                      {feat}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coaching badge */}
        <div
          style={{
            marginTop: 36,
            opacity: badgeOpacity * badgePulse,
            padding: "10px 28px",
            backgroundColor: `${COLORS.yellow}0C`,
            border: `1px solid ${COLORS.yellow}25`,
            borderRadius: 2,
          }}
        >
          <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.yellow, fontWeight: 700, letterSpacing: "0.08em" }}>
            100% DEDUIT SI TU PRENDS UN COACHING
          </span>
        </div>

        {/* URL */}
        {frame > urlStart && (
          <div style={{ marginTop: 24, fontFamily: FONTS.mono, fontSize: 15, color: COLORS.yellow, opacity: 0.6, letterSpacing: "0.05em" }}>
            {url.slice(0, urlChars)}
            {urlChars < url.length && (
              <span style={{ opacity: frame % 8 < 4 ? 1 : 0 }}>_</span>
            )}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
