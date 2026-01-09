import React from 'react';
import { SectionWrapper } from '../apex/SectionWrapper';
import { NeuroButton } from '../apex/NeuroButton';
import { motion } from 'framer-motion';
import { Droplet, Activity, Clock } from 'lucide-react';

export const BloodIntelligence: React.FC = () => {
    return (
        <SectionWrapper id="blood-intelligence" className="bg-neutral-900/30">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* Content Side */}
                <div>
                    <span className="font-mono text-neuro-accent text-xs uppercase tracking-widest mb-4 block">
                        Module 01 // Internal Fluid Analysis
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-6 relative">
                        Blood Intelligence™
                        <div className="absolute -top-6 -left-6 text-[120px] font-black text-neutral-800 opacity-20 pointer-events-none select-none z-0">
                            01
                        </div>
                    </h2>
                    <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                        Stop guessing. Your blood contains the code to your performance.
                        We don't just read the values; we map them to your daily metabolic timeline.
                    </p>

                    <ul className="space-y-4 mb-10">
                        {[
                            "Metabolic Timeline Analysis",
                            "Hormonal Optimization Protocols",
                            "Inflammation & Recovery Index"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center text-neutral-300 font-mono text-sm">
                                <span className="w-1.5 h-1.5 bg-neuro-accent mr-3 shadow-[0_0_8px_rgba(252,221,0,0.8)]" />
                                {item}
                            </li>
                        ))}
                    </ul>

                    <NeuroButton variant="outline" className="border-neuro-accent text-neuro-accent hover:bg-neuro-accent hover:text-black">
                        Analyze Blood Data
                    </NeuroButton>
                </div>

                {/* Visual Side - Abstract Timeline Animation */}
                <div className="relative h-[400px] bg-neutral-900 border border-neutral-800 p-6 overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    {/* Timeline Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-neutral-700" />

                    {/* Animated Curve */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        <motion.path
                            d="M0,200 C100,200 150,150 200,100 S300,50 400,200 S500,350 600,200"
                            fill="none"
                            stroke="#FCDD00"
                            strokeWidth="2"
                            initial={{ pathLength: 0, opacity: 0 }}
                            whileInView={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                        {/* Shadow Path */}
                        <motion.path
                            d="M0,200 C100,200 150,150 200,100 S300,50 400,200 S500,350 600,200"
                            fill="none"
                            stroke="#FCDD00"
                            strokeWidth="8"
                            strokeOpacity="0.2"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        />
                    </svg>

                    {/* Floating Data Points */}
                    {[1, 2, 3].map((n) => (
                        <motion.div
                            key={n}
                            className="absolute w-3 h-3 bg-neuro-accent rounded-full shadow-[0_0_15px_#FCDD00]"
                            style={{ left: `${n * 25}%`, top: '50%' }}
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 3, delay: n, repeat: Infinity, ease: "easeInOut" }}
                        />
                    ))}

                    <div className="absolute bottom-4 left-4 font-mono text-[10px] text-neutral-500 uppercase">
                        Cortisol / Melatonin Sequence
                    </div>
                </div>

            </div>
        </SectionWrapper>
    );
};
