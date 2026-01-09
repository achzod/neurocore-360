import React, { useState } from 'react';
import { SectionWrapper } from '../apex/SectionWrapper';
import { LivingBody } from '../apex/animations/LivingBody';
import { NeuroButton } from '../apex/NeuroButton';
import { motion, AnimatePresence } from 'framer-motion';

export const BodyIntelligence: React.FC = () => {
    const [activeZone, setActiveZone] = useState<string | null>(null);

    return (
        <SectionWrapper id="body-intelligence" className="bg-black/80">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* Visual Side - Night Vision Body */}
                <div className="order-2 lg:order-1 relative h-[500px] border border-green-900/30 bg-black rounded-sm overflow-hidden flex items-center justify-center group">
                    {/* Night Vision Overlay */}
                    <div className="absolute inset-0 bg-green-900/10 pointer-events-none z-10 mix-blend-screen" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] z-20" />

                    {/* Scan Line */}
                    <motion.div
                        className="absolute left-0 right-0 h-[1px] bg-green-500/50 z-30"
                        animate={{ top: ['0%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />

                    <LivingBody
                        mode="night-vision"
                        className="h-[90%] w-auto z-0 opacity-80"
                    />

                    {/* Interactive Hover Zones (Invisible divs over body parts) */}
                    <div
                        className="absolute top-[20%] left-[45%] w-[10%] h-[15%] cursor-crosshair z-40"
                        onMouseEnter={() => setActiveZone('Neck/Spine')}
                        onMouseLeave={() => setActiveZone(null)}
                    />
                    <div
                        className="absolute top-[75%] left-[30%] w-[10%] h-[10%] cursor-crosshair z-40"
                        onMouseEnter={() => setActiveZone('Right Knee')}
                        onMouseLeave={() => setActiveZone(null)}
                    />

                    <AnimatePresence>
                        {activeZone && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-4 left-4 bg-black/90 border border-green-500/50 p-2 z-50"
                            >
                                <div className="text-green-500 font-mono text-xs uppercase">
                                    Target: {activeZone} <br />
                                    Status: <span className="text-red-500 animate-pulse">Load Warning</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="absolute bottom-4 right-4 font-mono text-[10px] text-green-700/50 uppercase">
                        IR-Thermography // Real-time
                    </div>
                </div>

                {/* Content Side */}
                <div className="order-1 lg:order-2">
                    <span className="font-mono text-neuro-accent text-xs uppercase tracking-widest mb-4 block">
                        Module 02 // Structural Scan
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-6 relative">
                        Body Intelligence™
                        <div className="absolute -top-6 -left-6 text-[120px] font-black text-neutral-800 opacity-20 pointer-events-none select-none z-0">
                            02
                        </div>
                    </h2>
                    <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                        Pain is a signal. Posture is the architecture.
                        We use a clinical visual audit to identify mechanical stress before it becomes an injury.
                    </p>

                    <ul className="space-y-4 mb-10">
                        {[
                            "Mechanical Stress Mapping",
                            "Asymmetry Detection",
                            "Force Output Optimization"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center text-neutral-300 font-mono text-sm">
                                <span className="w-1.5 h-1.5 bg-green-500 mr-3 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                {item}
                            </li>
                        ))}
                    </ul>

                    <NeuroButton variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black">
                        Start Structure Scan
                    </NeuroButton>
                </div>

            </div>
        </SectionWrapper>
    );
};
