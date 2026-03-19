import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { COLORS, FONTS } from "../design/tokens";
import { GridBackground } from "../components/GridBackground";
import { ScanLine } from "../components/ScanLine";
import { HUDCorners } from "../components/HUDCorners";
import { PRODUCTS, Product } from "../data/products";

const FRAMES_PER_PRODUCT = 108;

// ============================================================================
// PRODUCT-SPECIFIC VISUALS (same logic, scaled for vertical)
// ============================================================================

const DiscoveryVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 30, stiffness: 60 } });
  const score = Math.round(progress * 87);
  const domains = ["Sommeil", "Stress", "Energie", "Digestion", "Training", "Nutrition", "Lifestyle", "Mindset", "Hormones", "Cardio"];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 300 200" width={320} height={220}>
        <path d="M 30 170 A 120 120 0 0 1 270 170" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} strokeLinecap="round" />
        <path
          d="M 30 170 A 120 120 0 0 1 270 170"
          fill="none"
          stroke={COLORS.yellow}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={380}
          strokeDashoffset={380 - progress * 380 * 0.87}
          style={{ filter: `drop-shadow(0 0 8px ${COLORS.yellow}60)` }}
        />
        <text x={150} y={145} textAnchor="middle" fill={COLORS.white} fontSize={56} fontWeight={900} fontFamily="Inter, sans-serif">
          {score}
        </text>
        <text x={150} y={175} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={16} fontFamily="JetBrains Mono, monospace">
          / 100
        </text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", maxWidth: 340, marginTop: 12 }}>
        {domains.map((d, i) => {
          const delay = i * 5;
          const pillOpacity = interpolate(frame, [delay + 20, delay + 30], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
          return (
            <div key={i} style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.yellow, opacity: pillOpacity, padding: "3px 8px", border: `1px solid ${COLORS.yellow}40`, borderRadius: 2, letterSpacing: "0.05em" }}>
              {d.toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnabolicVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = [
    { label: "TESTOSTERONE", value: 85, color: COLORS.yellow },
    { label: "CORTISOL", value: 42, color: "#F97316" },
    { label: "THYROIDE", value: 78, color: "#8B5CF6" },
    { label: "HRV", value: 91, color: "#10B981" },
    { label: "SOMMEIL", value: 67, color: "#3B82F6" },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 30px", gap: 14 }}>
      {bars.map((bar, i) => {
        const progress = spring({ frame: frame - i * 8, fps, config: { damping: 25, stiffness: 70 } });
        const width = progress * bar.value;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>{bar.label}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: bar.color, fontWeight: 700 }}>{Math.round(width)}%</span>
            </div>
            <div style={{ height: 7, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${width}%`, height: "100%", backgroundColor: bar.color, borderRadius: 4, boxShadow: `0 0 12px ${bar.color}60`, transition: "none" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BloodVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const markers = ["CRP", "TSH", "HbA1c", "Ferritine", "Vit D", "LDL"];
  const numPairs = 8;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 120 300" width={100} height={260}>
        {Array.from({ length: numPairs }).map((_, i) => {
          const yPos = (i / numPairs) * 280 + 10;
          const phase = (i / numPairs) * Math.PI * 2 + (frame / 15);
          const xLeft = 30 + Math.sin(phase) * 25;
          const xRight = 90 - Math.sin(phase) * 25;
          return (
            <g key={i}>
              <circle cx={xLeft} cy={yPos} r={5} fill={COLORS.cyan} opacity={0.8} />
              <line x1={xLeft + 5} y1={yPos} x2={xRight - 5} y2={yPos} stroke={`${COLORS.cyan}40`} strokeWidth={1.5} />
              <circle cx={xRight} cy={yPos} r={5} fill={COLORS.purple} opacity={0.8} />
            </g>
          );
        })}
      </svg>
      {markers.map((m, i) => {
        const angle = (i / markers.length) * Math.PI * 2 + frame / 40;
        const radius = 130;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.5;
        const opacity = interpolate(frame, [i * 8, i * 8 + 15], [0, 0.8], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              fontFamily: FONTS.mono,
              fontSize: 10,
              color: COLORS.blue,
              opacity,
              padding: "2px 6px",
              border: `1px solid ${COLORS.blue}40`,
              borderRadius: 2,
              backgroundColor: `${COLORS.blue}15`,
              transform: "translate(-50%, -50%)",
              letterSpacing: "0.05em",
            }}
          >
            {m}
          </div>
        );
      })}
    </div>
  );
};

const UltimateVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const scanY = interpolate(frame % 60, [0, 60], [0, 100]);
  const pathProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <svg viewBox="0 0 400 800" width={180} height={360} style={{ overflow: "visible" }}>
        <path
          d="M200,50 C230,50 240,80 240,100 C240,120 230,130 250,140 280,150 320,160 330,180 340,250 330,350 320,400 320,400 330,600 340,750 300,750 280,600 270,500 270,500 260,750 220,750 210,550 200,500 190,550 180,750 140,750 130,500 120,600 100,750 60,750 70,600 80,400 70,350 60,250 70,180 80,160 120,150 150,140 170,130 160,120 160,100 160,80 170,50 200,50 Z"
          stroke={COLORS.yellow}
          strokeWidth={2}
          fill={`${COLORS.yellow}08`}
          strokeDasharray={2000}
          strokeDashoffset={2000 - pathProgress * 2000}
        />
        <line x1={200} y1={100} x2={200} y2={450} stroke={COLORS.yellow} strokeWidth={3} opacity={pathProgress * 0.6} />
        <circle cx={200} cy={80} r={18} fill={COLORS.yellow} opacity={0.15 + Math.sin(frame / 5) * 0.15} />
        <circle cx={215} cy={220} r={12} fill={COLORS.yellow} opacity={0.2 + Math.sin(frame / 4) * 0.2} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: "15%",
          right: "15%",
          height: 2,
          top: `${15 + scanY * 0.7}%`,
          background: `linear-gradient(90deg, transparent, ${COLORS.yellow}, transparent)`,
          opacity: 0.6,
          boxShadow: `0 0 15px ${COLORS.yellow}60`,
        }}
      />

      {[
        { text: "HRV: 142ms", x: "68%", y: "25%" },
        { text: "Sleep: 94%", x: "68%", y: "40%" },
        { text: "VO2: 48", x: "68%", y: "55%" },
      ].map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: COLORS.yellow,
            opacity: interpolate(frame, [20 + i * 10, 30 + i * 10], [0, 0.8], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}
        >
          {d.text}
        </div>
      ))}
    </div>
  );
};

const FormCheckVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const drawProgress = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const exercises = ["SQUAT", "DEADLIFT", "BENCH", "OHP", "ROW", "PULL-UP", "LUNGE", "RDL"];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <svg viewBox="0 0 200 260" width={150} height={200}>
        <g stroke={COLORS.green} strokeWidth={2.5} strokeLinecap="round" opacity={drawProgress}>
          <circle cx={100} cy={40} r={14} fill="none" />
          <line x1={100} y1={54} x2={100} y2={140} />
          <line x1={100} y1={75} x2={65} y2={110} />
          <line x1={100} y1={75} x2={135} y2={110} />
          <line x1={100} y1={140} x2={70} y2={200} />
          <line x1={100} y1={140} x2={130} y2={200} />
          <line x1={70} y1={200} x2={55} y2={250} />
          <line x1={130} y1={200} x2={145} y2={250} />
        </g>
        {[[100, 75], [70, 200], [130, 200], [100, 140]].map(([cx, cy], i) => {
          const pulse = Math.sin((frame + i * 10) / 6) * 0.3 + 0.7;
          return <circle key={i} cx={cx} cy={cy} r={5} fill={COLORS.green} opacity={drawProgress * pulse} />;
        })}
        <text x={42} y={195} fill={COLORS.green} fontSize={12} fontFamily="JetBrains Mono, monospace"
          opacity={interpolate(frame, [30, 40], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}>
          92°
        </text>
        <text x={145} y={195} fill={COLORS.green} fontSize={12} fontFamily="JetBrains Mono, monospace"
          opacity={interpolate(frame, [35, 45], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}>
          89°
        </text>
        <text x={108} y={135} fill={COLORS.yellow} fontSize={12} fontFamily="JetBrains Mono, monospace"
          opacity={interpolate(frame, [40, 50], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}>
          78°
        </text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 300, marginTop: 10 }}>
        {exercises.map((ex, i) => {
          const pulse = Math.sin((frame + i * 8) / 8) * 0.3 + 0.7;
          return (
            <div key={i} style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.green, opacity: interpolate(frame, [50 + i * 3, 55 + i * 3], [0, pulse], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), padding: "2px 6px", border: `1px solid ${COLORS.green}40`, borderRadius: 2 }}>
              {ex}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// VERTICAL PRODUCT CARD LAYOUT
// ============================================================================
const ProductSlide: React.FC<{ product: Product; visual: React.ReactNode }> = ({ product, visual }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const textY = interpolate(slideIn, [0, 1], [60, 0]);
  const textOpacity = interpolate(slideIn, [0, 1], [0, 1]);
  const visualY = interpolate(slideIn, [0, 1], [-40, 0]);

  const nameLines = product.name.split("\n");

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <GridBackground color={product.accentColor} />
      <HUDCorners color={product.accentColor} padding={24} size={24} />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", padding: "0 50px" }}>
        {/* Watermark number */}
        <div style={{ fontFamily: FONTS.mono, fontSize: 160, fontWeight: 900, color: "rgba(255,255,255,0.03)", position: "absolute", top: 100, right: 40, lineHeight: 1 }}>
          {product.number}
        </div>

        {/* Visual at top area */}
        <div style={{ flex: "0 0 auto", height: 420, transform: `translateY(${visualY}px)`, opacity: textOpacity, position: "relative", borderRadius: 4, overflow: "hidden", border: `1px solid ${product.accentColor}20`, marginBottom: 30 }}>
          {visual}
        </div>

        {/* Text below */}
        <div style={{ transform: `translateY(${textY}px)`, opacity: textOpacity }}>
          {/* Subtitle label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: product.accentColor, boxShadow: `0 0 8px ${product.accentColor}` }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: product.accentColor, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {product.subtitle}
            </span>
          </div>

          {/* Product name */}
          {nameLines.map((line, i) => (
            <div key={i} style={{ fontFamily: FONTS.heading, fontSize: 56, fontWeight: 900, color: i === 1 ? product.accentColor : COLORS.white, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
              {line}
            </div>
          ))}

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 24 }}>
            {product.features.map((feat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: interpolate(frame, [15 + i * 5, 25 + i * 5], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: product.accentColor, fontWeight: 700 }}>&gt;</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: "0.03em" }}>{feat}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{ marginTop: 24, display: "inline-block", padding: "10px 20px", border: `1px solid ${product.accentColor}30`, backgroundColor: `${product.accentColor}0A` }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>
              Investissement
            </div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, color: COLORS.white, letterSpacing: "-0.02em" }}>
              {product.price}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN SCENE 04 (VERTICAL)
// ============================================================================
const VISUALS = [DiscoveryVisual, AnabolicVisual, BloodVisual, UltimateVisual, FormCheckVisual];

export const Scene04_Products_V: React.FC = () => {
  return (
    <AbsoluteFill>
      {PRODUCTS.map((product, i) => (
        <Sequence key={product.id} from={i * FRAMES_PER_PRODUCT} durationInFrames={FRAMES_PER_PRODUCT}>
          <ProductSlide product={product} visual={React.createElement(VISUALS[i])} />
          <ScanLine color={product.accentColor} duration={10} startFrame={FRAMES_PER_PRODUCT - 10} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
