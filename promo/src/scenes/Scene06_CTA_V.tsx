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

export const Scene06_CTA_V: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = interpolate(
    spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.6 } }),
    [0, 1],
    [1.5, 1]
  );
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const badgeOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" });
  const badgePulse = Math.sin(frame / 8) * 0.12 + 0.88;

  const url = "apexlabs.achzodcoaching.com";
  const urlStart = 110;
  const urlChars = Math.min(url.length, Math.max(0, Math.floor((frame - urlStart) * 1)));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />
      <ScanLine color={COLORS.yellow} duration={10} startFrame={0} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `scale(${titleScale})`, textAlign: "center", marginBottom: 30 }}>
          <GlitchText text="CHOISIS" fontSize={64} color={COLORS.white} glitchFrame={0} glitchDuration={4} />
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 64,
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

        {/* Pricing tiers — vertical stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 700 }}>
          {TIERS.map((tier, i) => {
            const tierY = interpolate(
              spring({ frame: frame - 20 - i * 4, fps, config: { damping: 18, stiffness: 80 } }),
              [0, 1],
              [40, 0]
            );
            const tierOpacity = interpolate(frame, [20 + i * 4, 30 + i * 4], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
            const accentColor = tier.color;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  border: tier.highlight ? `2px solid ${COLORS.yellow}60` : `1px solid rgba(255,255,255,0.08)`,
                  backgroundColor: tier.highlight ? `${COLORS.yellow}0A` : "rgba(255,255,255,0.02)",
                  borderRadius: 4,
                  transform: `translateY(${tierY}px)`,
                  opacity: tierOpacity,
                  boxShadow: tier.highlight ? `0 0 40px ${COLORS.yellow}12, inset 0 1px 0 ${COLORS.yellow}15` : "none",
                }}
              >
                {/* Left: name + features */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {tier.highlight && (
                      <span style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.yellow, letterSpacing: "0.2em", fontWeight: 700 }}>
                        ★
                      </span>
                    )}
                    <div style={{ fontFamily: FONTS.heading, fontSize: 15, color: COLORS.white, fontWeight: 700, letterSpacing: "0.02em" }}>
                      {tier.name}
                    </div>
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: tier.highlight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)", marginTop: 3, letterSpacing: "0.03em" }}>
                    {tier.features.join(" · ")}
                  </div>
                </div>

                {/* Right: price */}
                <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, color: accentColor, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                  {tier.price}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coaching badge */}
        <div
          style={{
            marginTop: 24,
            opacity: badgeOpacity * badgePulse,
            padding: "8px 22px",
            backgroundColor: `${COLORS.yellow}0C`,
            border: `1px solid ${COLORS.yellow}25`,
            borderRadius: 2,
          }}
        >
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.yellow, fontWeight: 700, letterSpacing: "0.08em" }}>
            100% DEDUIT SI TU PRENDS UN COACHING
          </span>
        </div>

        {/* URL */}
        {frame > urlStart && (
          <div style={{ marginTop: 16, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.yellow, opacity: 0.6, letterSpacing: "0.05em" }}>
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
