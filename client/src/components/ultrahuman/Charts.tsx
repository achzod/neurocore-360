import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Metric } from './types';

interface RadarProps {
  data: Metric[];
  color: string;
  gridColor?: string;
  labelColor?: string;
  tooltipBg?: string;
  tooltipBorder?: string;
  tooltipText?: string;
}

const CustomTooltip = ({
  active,
  payload,
  tooltipBg,
  tooltipBorder,
  tooltipText,
  tooltipMuted
}: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-4 rounded shadow-2xl backdrop-blur-md min-w-[120px] z-50"
        style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
      >
        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: tooltipMuted }}>
          {payload[0].payload.subject}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold leading-none" style={{ color: tooltipText }}>
            {payload[0].value}
          </span>
          <span className="text-sm font-medium mb-0.5" style={{ color: tooltipMuted }}>/10</span>
        </div>
      </div>
    );
  }
  return null;
};

export const MetricsRadar: React.FC<RadarProps> = ({
  data,
  color,
  gridColor = 'var(--color-grid)',
  labelColor = 'var(--color-text-muted)',
  tooltipBg = 'var(--color-surface)',
  tooltipBorder = 'var(--color-border)',
  tooltipText = 'var(--color-text)'
}) => {
  const tooltipMuted = labelColor;
  const radarStrokeOpacity = 0.9;
  const radarFillOpacity = 0.28;
  const radarDot = { r: 2, fill: color, fillOpacity: 0.9, stroke: "none" };
  const chartData = data.map(m => ({
    subject: m.label,
    A: m.value,
    fullMark: m.max
  }));

  return (
    <div className="w-full h-[320px] relative group cursor-crosshair">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: labelColor, fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Tooltip
            content={<CustomTooltip tooltipBg={tooltipBg} tooltipBorder={tooltipBorder} tooltipText={tooltipText} tooltipMuted={tooltipMuted} />}
            cursor={{ stroke: gridColor, strokeOpacity: 0.4 }}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Radar
            name="Score"
            dataKey="A"
            stroke={color}
            strokeWidth={3}
            fill={color}
            fillOpacity={radarFillOpacity}
            strokeOpacity={radarStrokeOpacity}
            dot={radarDot}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ProjectionProps {
  color: string;
  currentScore: number;
}

export const ProjectionChart: React.FC<ProjectionProps> = ({ color, currentScore }) => {
  const startPercentage = Math.round((currentScore / 10) * 100);
  const data = [
    { name: 'Actuel', Potential: startPercentage },
    { name: '30 Jours', Potential: Math.min(startPercentage + 20, 100) },
    { name: '60 Jours', Potential: Math.min(startPercentage + 35, 100) },
    { name: '90 Jours', Potential: Math.min(startPercentage + 45, 100) },
  ];

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="var(--color-text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-text-muted)' }}
          />
          <YAxis hide domain={[0, 100]} />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: 'var(--color-text)' }}
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="Potential"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPotential)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
