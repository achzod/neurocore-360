import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { ECGLine } from "../components/ECGLine";

export const Scene07_End: React.FC = () => {
  const frame = useCurrentFrame();
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const logoScale = 1 + Math.sin(frame / 15) * 0.008;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={COLORS.yellow} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Monogram */}
        <svg
          viewBox="0 0 38.047 30.012"
          width={50}
          height={50 * (30.012 / 38.047)}
          fill={COLORS.yellow}
          style={{ opacity: logoOpacity, marginBottom: 24 }}
        >
          <g>
            <path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)" />
            <path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z" />
          </g>
        </svg>

        {/* APEXLABS */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 80,
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
            fontSize: 12,
            color: COLORS.gray[600],
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: logoOpacity,
            marginTop: -4,
          }}
        >
          by Achzod
        </div>
      </AbsoluteFill>

      {/* ECG line */}
      <ECGLine color={COLORS.yellow} />
    </AbsoluteFill>
  );
};
