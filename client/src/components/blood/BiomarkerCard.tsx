import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Info,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    BookOpen,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import type { Biomarker } from "@/data/blood-analysis-data";

interface BiomarkerCardProps {
    data: Biomarker;
}

export function BiomarkerCard({ data }: BiomarkerCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Optimal": return "text-green-500 border-green-500/20 bg-green-500/10";
            case "Normal": return "text-blue-500 border-blue-500/20 bg-blue-500/10";
            case "Suboptimal": return "text-amber-500 border-amber-500/20 bg-amber-500/10";
            case "Critical": return "text-red-500 border-red-500/20 bg-red-500/10";
            default: return "text-muted-foreground";
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Optimal": return "default"; // or green variant if you have one
            case "Normal": return "secondary";
            case "Suboptimal": return "outline"; // usually yellow/warning in many systems
            case "Critical": return "destructive";
            default: return "outline";
        }
    };


    return (
        <Card className="overflow-hidden transition-all hover:border-primary/50">
            <div
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getStatusColor(data.status)}`}>
                            {/* Icon placeholder could be dynamic based on category */}
                            <Info className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{data.name}</h3>
                            <p className="text-xs text-muted-foreground">{data.category}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-2xl font-bold">{data.value}</span>
                            <span className="text-sm text-muted-foreground mb-1">{data.unit}</span>
                        </div>
                        <Badge variant={getStatusBadge(data.status) as any} className="text-[10px] h-5">
                            {data.status}
                        </Badge>
                    </div>
                </div>

                {/* Mini Range Visualization */}
                <div className="mt-4 relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    {/* Simple visual representation of where value sits */}
                    <div
                        className="absolute top-0 bottom-0 bg-primary rounded-full"
                        style={{
                            left: `${Math.min(Math.max((data.value / data.normalRange[1]) * 100, 0), 100)}%`,
                            width: '4px',
                            transform: 'translateX(-50%)'
                        }}
                    />
                    {/* Optimal Range Zone */}
                    <div
                        className="absolute top-0 bottom-0 bg-green-500/30"
                        style={{
                            left: `${(data.optimalRange[0] / data.normalRange[1]) * 100}%`,
                            width: `${((data.optimalRange[1] - data.optimalRange[0]) / data.normalRange[1]) * 100}%`
                        }}
                    />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t bg-muted/30"
                    >
                        <div className="p-4 space-y-4">

                            {/* Definition & Context */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <BookOpen className="h-4 w-4" />
                                        <span>Définition</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {data.definition}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-amber-500 font-semibold">
                                        <Info className="h-4 w-4" />
                                        <span>Pourquoi c'est important</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {data.whyItMatters}
                                    </p>
                                </div>
                            </div>

                            {/* History Chart */}
                            <div className="h-32 w-full mt-4">
                                <p className="text-xs font-semibold mb-2">Historique</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.history}>
                                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                                            itemStyle={{ color: 'hsl(var(--primary))' }}
                                        />
                                        <XAxis dataKey="date" hide />
                                        <YAxis hide domain={['auto', 'auto']} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Actionable Advice */}
                            <div className="bg-background border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm">Recommendation</span>
                                    {data.reference && (
                                        <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                            <ExternalLink className="h-3 w-3" /> {data.reference}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm">{data.recommendation}</p>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
