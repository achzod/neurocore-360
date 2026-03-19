import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { FONTS, COLORS } from "../design/tokens";

const TICKER_TEXT = "Cortisol: Optimal  //  HRV: 142ms  //  Sleep: 94%  //  Recovery: High  //  VO2max: 48  //  Body Fat: 14.2%  //  ";

export const DataTicker: React.FC<{
  y?: number;
  speed?: number;
  color?: string;
}> = ({ y, speed = 2, color = COLORS.yellow }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const repeatedText = TICKER_TEXT.repeat(6);
  const offset = interpolate(frame, [0, 600], [0, -3000]) * speed / 2;
  const tickerY = y ?? height - 40;

  return (
    <div
      style={{
        position: "absolute",
        top: tickerY,
        left: 0,
        width: "100%",
        overflow: "hidden",
        height: 30,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 14,
          color,
          opacity: 0.5,
          whiteSpace: "nowrap",
          transform: `translateX(${offset}px)`,
          letterSpacing: "0.05em",
        }}
      >
        {repeatedText}
      </div>
    </div>
  );
};
