import React from 'react';
import { motion } from 'framer-motion';

interface LivingBodyProps {
    mode?: 'neutral' | 'stress' | 'optimized' | 'night-vision';
    activeZones?: ('brain' | 'heart' | 'muscle' | 'spine')[];
    className?: string;
}

export const LivingBody: React.FC<LivingBodyProps> = ({
    mode = 'neutral',
    activeZones = [],
    className
}) => {
    const colorMap = {
        neutral: '#333',
        stress: '#ef4444',     // Red
        optimized: '#FCDD00',  // Yellow/Accent
        'night-vision': '#10b981' // Green
    };

    const primaryColor = colorMap[mode];

    // Animation variants
    const pulse = {
        initial: { opacity: 0.3, scale: 0.98 },
        animate: {
            opacity: [0.3, 0.6, 0.3],
            scale: [0.98, 1.02, 0.98],
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
    };

    const flow = {
        initial: { pathLength: 0, opacity: 0 },
        animate: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 1.5, ease: "easeOut" }
        }
    };

    return (
        <div className={className}>
            <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">

                {/* Silhouette Outline */}
                <motion.path
                    d="M200,50 
             C230,50 240,80 240,100 
             C240,120 230,130 250,140 
             280,150 320,160 330,180
             340,250 330,350 320,400
             320,400 330,600 340,750
             300,750 280,600 270,500
             270,500 260,750 220,750
             210,550 200,500 190,550
             180,750 140,750 130,500
             120,600 100,750 60,750
             70,600 80,400 70,350
             60,250 70,180 80,160
             120,150 150,140 170,130
             160,120 160,100 160,80
             170,50 200,50 Z"
                    stroke={mode === 'night-vision' ? '#10b981' : '#333'}
                    strokeWidth="2"
                    strokeOpacity={0.5}
                    fill={mode === 'night-vision' ? '#10b981' : '#111'}
                    fillOpacity={mode === 'night-vision' ? 0.1 : 0.8}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                />

                {/* SPINE / NERVOUS SYSTEM */}
                {(activeZones.includes('spine') || mode !== 'neutral') && (
                    <motion.path
                        d="M200,100 L200,450"
                        stroke={activeZones.includes('spine') ? '#FCDD00' : primaryColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        variants={flow}
                        initial="initial"
                        animate="animate"
                    />
                )}

                {/* BRAIN */}
                {activeZones.includes('brain') && (
                    <motion.circle
                        cx="200"
                        cy="80"
                        r="20"
                        fill={primaryColor}
                        variants={pulse}
                        initial="initial"
                        animate="animate"
                    />
                )}

                {/* HEART */}
                {activeZones.includes('heart') && (
                    <motion.g variants={pulse} initial="initial" animate="animate">
                        <circle cx="215" cy="220" r="15" fill={primaryColor} opacity="0.6" />
                        <circle cx="215" cy="220" r="8" fill="#fff" />
                    </motion.g>
                )}

                {/* NERVES / LINES */}
                {/* Radiating lines from spine to limbs */}
                <motion.path
                    d="M200,150 L280,180 M200,150 L120,180" // Shoulders
                    stroke={primaryColor}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    variants={flow}
                    initial="initial"
                    animate="animate"
                />
                <motion.path
                    d="M200,450 L320,700 M200,450 L80,700" // Legs
                    stroke={primaryColor}
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    variants={flow}
                    initial="initial"
                    animate="animate"
                />

                {/* HEATMAP ZONES (Night Vision) */}
                {mode === 'night-vision' && (
                    <>
                        {/* Heatmap stress on knees/shoulders */}
                        <circle cx="330" cy="600" r="30" fill="url(#heatGradient)" opacity="0.6" filter="blur(10px)" />
                        <circle cx="70" cy="600" r="30" fill="url(#heatGradient)" opacity="0.6" filter="blur(10px)" />
                        <circle cx="280" cy="180" r="25" fill="url(#heatGradient)" opacity="0.4" filter="blur(8px)" />
                    </>
                )}

                <defs>
                    <radialGradient id="heatGradient">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                </defs>

            </svg>
        </div>
    );
};
