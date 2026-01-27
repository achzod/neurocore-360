import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { BiomarkerStatus } from "@/lib/biomarker-colors";
import { getBiomarkerStatusColor } from "@/lib/biomarker-colors";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

type RadarPoint = {
  key: string;
  label: string;
  score: number;
  status: BiomarkerStatus;
  muted?: boolean;
};

interface BloodRadarProps {
  className?: string;
  data: RadarPoint[];
  height?: number;
  outerRadius?: number | string;
  accentColor?: string;
}

export function BloodRadar({
  className,
  data,
  height = 350,
  outerRadius = "80%",
  accentColor,
}: BloodRadarProps) {
  const { theme } = useBloodTheme();
  const accent = accentColor ?? theme.primaryBlue;
  const metaByLabel = new Map(data.map((item) => [item.label, { status: item.status, muted: !!item.muted }]));

  return (
    <Card className={`border-none bg-transparent shadow-none ${className || ""}`}>
      <CardContent className="p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
          style={{ height }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={outerRadius} data={data}>
              <PolarGrid stroke={theme.borderDefault} strokeOpacity={0.7} />
              <PolarAngleAxis
                dataKey="label"
                tick={({ payload, x, y, textAnchor }) => {
                  const meta = metaByLabel.get(payload.value) || { status: "normal", muted: false };
                  const colors = getBiomarkerStatusColor(meta.status);
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      fill={meta.muted ? "rgba(255, 255, 255, 0.35)" : colors.primary}
                      fontSize={12}
                      fontWeight={600}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="score"
                stroke={accent}
                strokeWidth={3}
                fill={accent}
                fillOpacity={0.35}
                dot={({ payload }) => {
                  const colors = getBiomarkerStatusColor(payload.status);
                  return (
                    <circle
                      r={4}
                      fill={payload.muted ? "rgba(255, 255, 255, 0.35)" : colors.primary}
                      stroke={theme.textPrimary}
                      strokeWidth={1}
                    />
                  );
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
                itemStyle={{ color: "hsl(var(--primary))" }}
                formatter={(value: number) => [`${value}/100`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
