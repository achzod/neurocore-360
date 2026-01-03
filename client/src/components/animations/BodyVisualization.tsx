import { motion } from "framer-motion";
import { useState } from "react";

interface BodyZone {
  id: string;
  name: string;
  cx: number;
  cy: number;
  category: "metabolism" | "biomechanics" | "neurology" | "cardio" | "hormones" | "immunity";
  description: string;
  // Label position relative to point
  labelSide?: "left" | "right";
  showLabel?: boolean;
}

const bodyZones: BodyZone[] = [
  { id: "brain", name: "Cerveau", cx: 50, cy: 12, category: "neurology", description: "Fonction cognitive & neurotransmetteurs", labelSide: "right", showLabel: true },
  { id: "thyroid", name: "Thyroide", cx: 50, cy: 22, category: "hormones", description: "Regulation hormonale & metabolisme", labelSide: "left", showLabel: true },
  { id: "heart", name: "Coeur", cx: 45, cy: 32, category: "cardio", description: "Sante cardiovasculaire", labelSide: "left", showLabel: true },
  { id: "lungs", name: "Poumons", cx: 55, cy: 32, category: "cardio", description: "Capacite respiratoire", labelSide: "right", showLabel: true },
  { id: "liver", name: "Foie", cx: 40, cy: 42, category: "metabolism", description: "Detoxification & metabolisme", labelSide: "left", showLabel: true },
  { id: "stomach", name: "Estomac", cx: 55, cy: 45, category: "metabolism", description: "Digestion & absorption", labelSide: "right", showLabel: true },
  { id: "gut", name: "Intestins", cx: 50, cy: 55, category: "immunity", description: "Microbiome & immunite", labelSide: "right", showLabel: true },
  { id: "shoulder_l", name: "Epaule", cx: 28, cy: 28, category: "biomechanics", description: "Mobilite articulaire", labelSide: "left", showLabel: true },
  { id: "shoulder_r", name: "Epaule", cx: 72, cy: 28, category: "biomechanics", description: "Mobilite articulaire" },
  { id: "hip_l", name: "Hanches", cx: 38, cy: 58, category: "biomechanics", description: "Stabilite pelvienne", labelSide: "left", showLabel: true },
  { id: "hip_r", name: "Hanche", cx: 62, cy: 58, category: "biomechanics", description: "Stabilite pelvienne" },
  { id: "knee_l", name: "Genoux", cx: 40, cy: 75, category: "biomechanics", description: "Flexion & extension", labelSide: "left", showLabel: true },
  { id: "knee_r", name: "Genou", cx: 60, cy: 75, category: "biomechanics", description: "Flexion & extension" },
  { id: "adrenal", name: "Surrenales", cx: 50, cy: 48, category: "hormones", description: "Gestion du stress & energie", labelSide: "left", showLabel: true },
];

const categoryColors: Record<string, string> = {
  metabolism: "hsl(160 84% 39%)",
  biomechanics: "hsl(280 70% 50%)",
  neurology: "hsl(200 80% 50%)",
  cardio: "hsl(0 70% 50%)",
  hormones: "hsl(45 90% 50%)",
  immunity: "hsl(120 60% 45%)",
};

interface BodyVisualizationProps {
  className?: string;
  activeCategory?: string;
  onCategoryChange?: (category: string | null) => void;
}

export function BodyVisualization({ className = "", activeCategory, onCategoryChange }: BodyVisualizationProps) {
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  const handleZoneClick = (zone: BodyZone) => {
    if (onCategoryChange) {
      onCategoryChange(activeCategory === zone.category ? null : zone.category);
    }
  };

  return (
    <div className={`relative ${className}`} data-testid="animation-body-visualization">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <filter id="bodyGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="pulseGradient">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.path
          d="M50 8 
             C52 8 54 10 54 14
             C54 18 52 20 50 20
             C48 20 46 18 46 14
             C46 10 48 8 50 8
             M50 20
             L50 25
             M42 28 L50 25 L58 28
             M50 25 L50 55
             M50 55 L42 90
             M50 55 L58 90
             M42 28 L32 45
             M58 28 L68 45"
          fill="none"
          stroke="hsl(var(--primary) / 0.3)"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {bodyZones.map((zone, index) => {
          // Si une catégorie est active, seules les zones de cette catégorie sont animées et brillantes
          // Sinon, toutes les zones sont visibles mais moins animées
          const isActive = !activeCategory || zone.category === activeCategory;
          const color = categoryColors[zone.category];
          
          return (
            <g key={zone.id}>
              {/* Halo externe pulsant - seulement si actif ET que la catégorie correspond */}
              {isActive && (
                <motion.circle
                  cx={zone.cx}
                  cy={zone.cy}
                  r="8"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="1"
                  animate={{
                    r: [8, 14, 8],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut",
                  }}
                />
              )}
              
              {/* Cercle de pulse moyen - seulement si actif */}
              {isActive && (
                <motion.circle
                  cx={zone.cx}
                  cy={zone.cy}
                  r="6"
                  fill={color}
                  animate={{
                    r: [6, 9, 6],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.15,
                    ease: "easeInOut",
                  }}
                />
              )}
              
              {/* Point central - toujours visible mais animé seulement si actif */}
              <motion.circle
                cx={zone.cx}
                cy={zone.cy}
                r={isActive ? "4" : "2"}
                fill={isActive ? color : color}
                opacity={isActive ? 1 : 0.3}
                filter={isActive ? "url(#bodyGlow)" : undefined}
                style={{ cursor: "pointer" }}
                animate={isActive ? {
                  scale: [1, 1.4, 1],
                  opacity: [0.9, 1, 0.9],
                } : {
                  opacity: 0.3,
                }}
                transition={isActive ? {
                  duration: 1.2,
                  repeat: Infinity,
                  delay: index * 0.1,
                  ease: "easeInOut",
                } : {
                  duration: 0.3,
                }}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                whileHover={{ scale: isActive ? 1.6 : 1.3 }}
              />
              
              {/* Point blanc central pulsant - seulement si actif */}
              {isActive && (
                <motion.circle
                  cx={zone.cx}
                  cy={zone.cy}
                  r="1.5"
                  fill="white"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: index * 0.15,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Label cliquable avec ligne de connexion */}
              {zone.showLabel && (
                <>
                  {/* Ligne de connexion */}
                  <motion.line
                    x1={zone.cx}
                    y1={zone.cy}
                    x2={zone.labelSide === "left" ? zone.cx - 18 : zone.cx + 18}
                    y2={zone.cy}
                    stroke={isActive ? color : "hsl(var(--muted-foreground) / 0.3)"}
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 0.8 : 0.3 }}
                  />
                  {/* Label texte cliquable */}
                  <motion.text
                    x={zone.labelSide === "left" ? zone.cx - 20 : zone.cx + 20}
                    y={zone.cy + 1}
                    textAnchor={zone.labelSide === "left" ? "end" : "start"}
                    fill={isActive ? color : "hsl(var(--muted-foreground))"}
                    fontSize="3.5"
                    fontWeight={isActive ? "600" : "400"}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleZoneClick(zone)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                    whileHover={{ scale: 1.1, opacity: 1 }}
                  >
                    {zone.name}
                  </motion.text>
                </>
              )}
            </g>
          );
        })}

              </svg>

      {hoveredZone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 bottom-4 -translate-x-1/2 rounded-md bg-card/90 px-4 py-2 text-center shadow-lg backdrop-blur-sm"
          style={{ borderColor: categoryColors[hoveredZone.category], borderWidth: 1 }}
        >
          <p className="text-sm font-semibold" style={{ color: categoryColors[hoveredZone.category] }}>
            {hoveredZone.name}
          </p>
          <p className="text-xs text-muted-foreground">{hoveredZone.description}</p>
        </motion.div>
      )}
    </div>
  );
}
