import React, { useEffect, useState } from 'react';
import { NeuroButton } from './NeuroButton';
import { LivingBody } from './animations/LivingBody';
import { motion, useAnimation } from 'framer-motion';

export const Hero: React.FC = () => {
    const [calibrationStep, setCalibrationStep] = useState(0);
    const controls = useAnimation();

    useEffect(() => {
        // Sequence the "System Calibration" entrance
        const sequence = async () => {
            await controls.start({ opacity: 1, scale: 1, transition: { duration: 1 } });
            setCalibrationStep(1); // Grid alignment
            await new Promise(r => setTimeout(r, 800));
            setCalibrationStep(2); // Body scan
            await new Promise(r => setTimeout(r, 1000));
            setCalibrationStep(3); // Text decode
        };
        sequence();
    }, [controls]);

    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center bg-neuro-dark overflow-hidden pt-20">

            {/* Background Elements */}
            <div className="absolute inset-0 bg-scales-hero z-0 opacity-50" />
            <div className="absolute inset-0 bg-grid-pattern opacity-10 z-0 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* LEFT COLUMN: Text Content */}
                <div className="text-left order-2 lg:order-1">
                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-2 mb-8 bg-neutral-900/80 w-fit px-4 py-2 border border-neutral-800"
                    >
                        <div className={`w-2 h-2 rounded-full ${calibrationStep >= 3 ? 'bg-neuro-accent animate-pulse' : 'bg-red-500'}`} />
                        <span className="font-mono text-neuro-accent text-xs uppercase tracking-[0.2em]">
                            {calibrationStep >= 3 ? 'System Online v3.2' : 'Calibrating...'}
                        </span>
                    </motion.div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter mb-8 leading-[0.9]">
                        <span className="block text-transparent stroke-text opacity-30 text-5xl md:text-6xl mb-[-0.2em]">
                            Bio-Metrics
                        </span>
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 1.5 }}
                        >
                            Decoded
                        </motion.span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="font-light text-neutral-400 text-xl max-w-xl mb-12 border-l-2 border-neuro-accent pl-6"
                    >
                        Your body is a data system. Most people run it blind.
                        <br className="mb-2" />
                        <span className="text-white font-medium">We visualize the code.</span>
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.2 }}
                        className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
                    >
                        <NeuroButton variant="primary">
                            Run Diagnostics
                        </NeuroButton>
                        <NeuroButton variant="outline">
                            View Sample Data
                        </NeuroButton>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: Living Body Animation */}
                <div className="order-1 lg:order-2 flex justify-center h-[50vh] lg:h-[80vh] relative">
                    <motion.div
                        initial={{ opacity: 0, filter: 'blur(20px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 2 }}
                        className="relative w-full max-w-[400px]"
                    >
                        <LivingBody
                            mode={calibrationStep >= 2 ? 'optimized' : 'neutral'}
                            activeZones={calibrationStep >= 2 ? ['brain', 'heart', 'spine'] : []}
                            className="w-full h-full drop-shadow-[0_0_15px_rgba(252,221,0,0.3)]"
                        />

                        {/* Holographic scanning effect */}
                        <motion.div
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-neuro-accent/50 shadow-[0_0_20px_rgba(252,221,0,0.8)] z-20"
                        />
                    </motion.div>
                </div>

            </div>

            {/* Footer Marquee */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-neutral-900 border-t border-neutral-800 flex items-center overflow-hidden">
                <div className="flex animate-scroll whitespace-nowrap">
                    {[...Array(10)].map((_, i) => (
                        <span key={i} className="mx-8 font-mono text-xs text-neutral-500 uppercase tracking-widest flex items-center">
                            <span className="w-1 h-1 bg-neuro-accent rounded-full mr-2" />
                            Cortisol: Optimal // HRV: 142ms // Sleep: 94% // Recovery: High
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
};
