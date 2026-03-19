import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const ECG_PATH = "M0,50 L30,50 L35,50 L40,30 L45,70 L50,20 L55,80 L60,45 L65,55 L70,50 L100,50 L130,50 L135,50 L140,30 L145,70 L150,20 L155,80 L160,45 L165,55 L170,50 L200,50";

export const ECGLine: React.FC<{
  color?: string;
  y?: number;
  duration?: number;
}> = ({ color = "#FCDD00", y, duration = 60 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const offset = interpolate(frame % duration, [0, duration], [0, -200]);
  const lineY = y ?? height - 60;
  const repeats = Math.ceil(width / 200) + 2;

  return (
    <svg
      width={width}
      height={100}
      style={{ position: "absolute", top: lineY, left: 0 }}
      viewBox={`0 0 ${width} 100`}
    >
      {Array.from({ length: repeats }).map((_, i) => (
        <path
          key={i}
          d={ECG_PATH}
          transform={`translate(${i * 200 + offset}, 0)`}
          stroke={color}
          strokeWidth={2}
          fill="none"
          opacity={0.6}
        />
      ))}
    </svg>
  );
};
