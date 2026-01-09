import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_SCORES } from "@/data/blood-analysis-data";

interface BloodRadarProps {
    className?: string;
}

export function BloodRadar({ className }: BloodRadarProps) {
    const data = Object.entries(CATEGORY_SCORES).map(([subject, score]) => ({
        subject,
        score,
        fullMark: 100,
    }));

    return (
        <Card className={`border-none bg-transparent shadow-none ${className}`}>
            <CardContent className="p-0">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                            <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                            />
                            <Radar
                                name="Score"
                                dataKey="score"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                fill="hsl(var(--primary))"
                                fillOpacity={0.4}
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
                </div>
            </CardContent>
        </Card>
    );
}
