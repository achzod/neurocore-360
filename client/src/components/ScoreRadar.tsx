import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ScoreRadarProps {
  scores: Record<string, number>;
  size?: "sm" | "md" | "lg";
}

const SECTION_LABELS: Record<string, string> = {
  profilbase: "Profil",
  compositioncorporelle: "Composition",
  metabolismeenergie: "Métabolisme",
  nutritiontracking: "Nutrition",
  digestionmicrobiome: "Digestion",
  activiteperformance: "Performance",
  sommeilrecuperation: "Sommeil",
  hrvcardiaque: "HRV",
  analysesbiomarqueurs: "Biomarqueurs",
  hormonesstress: "Hormones",
  lifestylesubstances: "Lifestyle",
  biomecaniquemobilite: "Mobilité",
  psychologiemental: "Mental",
  neurotransmetteurs: "Neuro",
  hormonessexuelles: "Libido"
};

export function ScoreRadar({ scores, size = "md" }: ScoreRadarProps) {
  const data = Object.entries(scores)
    .filter(([key]) => key !== "global")
    .map(([key, value]) => ({
      subject: SECTION_LABELS[key] || key,
      score: value,
      fullMark: 100
    }));

  const heights = {
    sm: 250,
    md: 350,
    lg: 450
  };

  return (
    <div className="w-full" style={{ height: heights[size] }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.5}
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: size === "sm" ? 10 : 12 
            }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ScoreRadar;
