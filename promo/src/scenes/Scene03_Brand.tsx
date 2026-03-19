import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { DataTicker } from "../components/DataTicker";

// Achzod monogram SVG paths
const AchzodMonogram: React.FC<{ size: number; opacity: number }> = ({ size, opacity }) => (
  <svg viewBox="0 0 38.047 30.012" width={size} height={size * (30.012 / 38.047)} style={{ opacity }} fill={COLORS.yellow}>
    <g>
      <path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" />
      <path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" />
    </g>
  </svg>
);

export const Scene03_Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flash
  const flashOpacity = interpolate(frame, [0, 3, 10], [1, 0.9, 0], { extrapolateRight: "clamp" });

  // Logo scale spring
  const logoScale = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 80, mass: 0.8 } }),
    [0, 1],
    [1.8, 1]
  );
  const logoOpacity = interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" });

  // Monogram fade
  const monoOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" });

  // "by Achzod" fade
  const byOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });

  // Tagline typewriter
  const tagline = "OPTIMISATION HUMAINE & BIO-DATA";
  const taglineStart = 55;
  const taglineChars = Math.min(
    tagline.length,
    Math.max(0, Math.floor((frame - taglineStart) * 1.2))
  );

  // Ticker fade
  const tickerOpacity = interpolate(frame, [70, 80], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />

      {/* White flash */}
      <AbsoluteFill style={{ backgroundColor: COLORS.white, opacity: flashOpacity }} />

      {/* Main content */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Monogram */}
        <div style={{ marginBottom: 20 }}>
          <AchzodMonogram size={60} opacity={monoOpacity} />
        </div>

        {/* APEXLABS */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: "-0.06em",
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <span style={{ color: COLORS.white }}>APEX</span>
          <span style={{ color: COLORS.yellow }}>LABS</span>
        </div>

        {/* by Achzod */}
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 14,
            color: COLORS.gray[600],
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: byOpacity,
            marginTop: -8,
          }}
        >
          by Achzod
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: COLORS.yellow,
            letterSpacing: "0.15em",
            marginTop: 40,
            opacity: frame > taglineStart ? 1 : 0,
          }}
        >
          {tagline.slice(0, taglineChars)}
          {taglineChars < tagline.length && taglineChars > 0 && (
            <span style={{ opacity: frame % 8 < 4 ? 1 : 0 }}>_</span>
          )}
        </div>
      </AbsoluteFill>

      {/* Data ticker */}
      <div style={{ opacity: tickerOpacity }}>
        <DataTicker />
      </div>
    </AbsoluteFill>
  );
};
