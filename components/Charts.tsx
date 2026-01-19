import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Metric } from '../types';

interface RadarProps {
  data: Metric[];
  color: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#09090B] border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[120px] z-50">
        <p className="text-neutral-400 text-[10px] uppercase tracking-widest font-bold mb-1">{payload[0].payload.subject}</p>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-white leading-none">{payload[0].value}</span>
          <span className="text-sm text-neutral-600 font-medium mb-0.5">/10</span>
        </div>
      </div>
    );
  }
  return null;
};

export const MetricsRadar: React.FC<RadarProps> = ({ data, color }) => {
  // Transform data for Recharts
  const chartData = data.map(m => ({
    subject: m.label,
    A: m.value,
    fullMark: m.max
  }));

  return (
    <div className="w-full h-[320px] relative group cursor-crosshair">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#A1A1AA', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ strokeOpacity: 0.2 }}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Radar
            name="Score"
            dataKey="A"
            stroke={color}
            strokeWidth={3}
            fill={color}
            fillOpacity={0.2}
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
}

export const ProjectionChart: React.FC<ProjectionProps> = ({ color }) => {
  const data = [
    { name: 'Start', Potential: 35 },
    { name: '30 Jours', Potential: 55 },
    { name: '60 Jours', Potential: 75 },
    { name: '90 Jours', Potential: 95 },
  ];

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            stroke="#52525B" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#52525B', fontFamily: 'JetBrains Mono' }}
          />
          <YAxis hide domain={[0, 100]} />
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#09090B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#E4E4E7' }}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
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