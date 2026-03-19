import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SUBTITLES } from "../data/subtitles";
import { FONTS } from "../design/tokens";

export const SubtitleTrack_V: React.FC = () => {
  const frame = useCurrentFrame();

  const current = SUBTITLES.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  if (!current) return null;

  const fadeIn = interpolate(
    frame,
    [current.startFrame, current.startFrame + 8],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(
    frame,
    [current.endFrame - 8, current.endFrame],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(fadeIn, fadeOut),
          padding: "0 30px",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            borderRadius: 4,
            padding: "10px 24px",
            maxWidth: 900,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.heading,
              fontSize: 22,
              fontWeight: 500,
              color: "rgba(255,255,255,0.95)",
              lineHeight: 1.4,
            }}
          >
            {current.text}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
