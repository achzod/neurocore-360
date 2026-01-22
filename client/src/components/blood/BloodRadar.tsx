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

type RadarPoint = {
  key: string;
  label: string;
  score: number;
  status: BiomarkerStatus;
};

interface BloodRadarProps {
  className?: string;
  data: RadarPoint[];
}

export function BloodRadar({ className, data }: BloodRadarProps) {
  const statusByLabel = new Map(data.map((item) => [item.label, item.status]));

  return (
    <Card className={`border-none bg-transparent shadow-none ${className || ""}`}>
      <CardContent className="p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-[350px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <PolarAngleAxis
                dataKey="label"
                tick={({ payload, x, y, textAnchor }) => {
                  const status = statusByLabel.get(payload.value) || "normal";
                  const colors = getBiomarkerStatusColor(status);
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      fill={colors.primary}
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
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="hsl(var(--primary))"
                fillOpacity={0.35}
                dot={({ payload }) => {
                  const colors = getBiomarkerStatusColor(payload.status);
                  return <circle r={4} fill={colors.primary} stroke="#0a0a0a" strokeWidth={1} />;
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
