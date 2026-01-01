import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarDataPoint {
  subject: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  title?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export function RadarChart({ data, title, color = "hsl(164, 100%, 78%)", size = "md" }: RadarChartProps) {
  const dimensions = {
    sm: { height: 220, outerRadius: 50 },
    md: { height: 320, outerRadius: 70 },
    lg: { height: 420, outerRadius: 95 },
  };

  const { height, outerRadius } = dimensions[size];

  return (
    <div className="w-full">
      {title && <h4 className="mb-2 text-center text-sm font-medium text-muted-foreground">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius={outerRadius} data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value}%`, "Score"]}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface GlobalRadarProps {
  sections: Record<string, { score: number }>;
}

const sectionLabels: Record<string, string> = {
  "profil-base": "Profil",
  "composition-corporelle": "Compo",
  "metabolisme-energie": "Energie",
  "nutrition-tracking": "Nutri",
  "digestion-microbiome": "Digest",
  "activite-performance": "Sport",
  "sommeil-recuperation": "Sommeil",
  "hrv-cardiaque": "HRV",
  "cardio-endurance": "Cardio",
  "analyses-biomarqueurs": "Bio",
  "hormones-stress": "Hormones",
  "lifestyle-substances": "Life",
  "biomecanique-mobilite": "Mobilite",
  "psychologie-mental": "Psy",
  neurotransmetteurs: "Neuro",
};

export function GlobalRadar({ sections }: GlobalRadarProps) {
  const data: RadarDataPoint[] = Object.entries(sections).map(([key, value]) => ({
    subject: sectionLabels[key] || key,
    score: value.score,
    fullMark: 100,
  }));

  return <RadarChart data={data} size="lg" />;
}

interface DomainGroupRadarProps {
  groupName: string;
  metrics: { name: string; score: number }[];
  color?: string;
}

export function DomainGroupRadar({ groupName, metrics, color }: DomainGroupRadarProps) {
  const data: RadarDataPoint[] = metrics.map((m) => ({
    subject: m.name,
    score: m.score,
    fullMark: 100,
  }));

  return <RadarChart data={data} title={groupName} color={color} size="sm" />;
}
