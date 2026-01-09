import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { SectionWrapper } from '../apex/SectionWrapper';

export const ComparisonSlider: React.FC = () => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setSliderPosition(percent);
    };

    return (
        <SectionWrapper id="recalibration" className="bg-black py-32">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                    System Recalibration
                </h2>
                <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest">
                    Drag to synchronize
                </p>
            </div>

            <div
                ref={containerRef}
                className="relative w-full max-w-4xl mx-auto h-[400px] border border-neutral-800 cursor-ew-resize overflow-hidden rounded-sm group select-none"
                onMouseMove={handleMouseMove}
                onTouchMove={(e) => {
                    if (!containerRef.current) return;
                    const rect = containerRef.current.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
                    setSliderPosition((x / rect.width) * 100);
                }}
            >
                {/* RIGHT SIDE (Optimized / Green) */}
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-neuro-accent text-6xl font-black mb-2 tracking-tighter">ALIGNED</div>
                        <div className="font-mono text-xs text-neutral-500">
                            CORTISOL: <span className="text-neuro-accent">LOW</span> // SLEEP: <span className="text-neuro-accent">DEEP</span>
                        </div>

                        {/* Constructive Interference Lines */}
                        <svg className="w-64 h-24 mt-8 mx-auto opacity-50">
                            <path d="M0,12 Q32,0 64,12 T128,12 T192,12 T256,12" fill="none" stroke="#FCDD00" strokeWidth="2" />
                            <path d="M0,12 Q32,24 64,12 T128,12 T192,12 T256,12" fill="none" stroke="#FCDD00" strokeWidth="2" />
                        </svg>
                    </div>
                </div>

                {/* LEFT SIDE (Chaos / Red) - Clip Path controlled by slider */}
                <div
                    className="absolute inset-0 bg-neutral-950 flex items-center justify-center border-r-2 border-white/20"
                    style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                >
                    <div className="text-center filter blur-[1px]">
                        <div className="text-red-500 text-6xl font-black mb-2 tracking-tighter opacity-80">CHAOS</div>
                        <div className="font-mono text-xs text-red-900">
                            CORTISOL: <span className="text-red-500">HI</span> // SLEEP: <span className="text-red-500">ERR</span>
                        </div>

                        {/* Chaos Lines */}
                        <svg className="w-64 h-24 mt-8 mx-auto opacity-30">
                            <path d="M0,10 Q20,40 40,0 T80,50 T120,0 T200,60" fill="none" stroke="#ef4444" strokeWidth="2" />
                            <path d="M0,30 Q30,0 50,40 T100,10 T150,50 T240,0" fill="none" stroke="#ef4444" strokeWidth="2" />
                        </svg>
                    </div>
                </div>

                {/* Slider Handle */}
                <div
                    className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    style={{ left: `${sliderPosition}%` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-1 h-4 bg-white mx-[1px]" />
                        <div className="w-1 h-4 bg-white mx-[1px]" />
                    </div>
                </div>

            </div>
        </SectionWrapper>
    );
};
