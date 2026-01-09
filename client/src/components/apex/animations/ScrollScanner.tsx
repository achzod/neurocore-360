import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollScannerProps {
    children: React.ReactNode;
    className?: string;
}

export const ScrollScanner: React.FC<ScrollScannerProps> = ({ children, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const scanLineTop = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* The Scanning Line */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-[2px] bg-neuro-accent/50 z-50 pointer-events-none shadow-[0_0_20px_rgba(252,221,0,0.5)]"
                style={{ top: scanLineTop, opacity: useTransform(smoothProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0]) }}
            />

            {/* Digital Noise / Scan Overlay */}
            <motion.div
                className="fixed inset-0 bg-scanlines pointer-events-none z-40 opacity-[0.03]"
                style={{ backgroundPositionY: useTransform(scrollYProgress, [0, 1], [0, 1000]) }}
            />

            {children}
        </div>
    );
};
