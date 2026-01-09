import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NeuroCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    step?: string;
}

export const NeuroCard: React.FC<NeuroCardProps> = ({ children, className, title, step }) => {
    return (
        <div className={cn("group relative p-8 bg-neutral-900/50 border border-neutral-800 transition-all duration-300 hover:border-neuro-accent", className)}>

            {/* Decorative Crosshairs */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neutral-500 transition-colors group-hover:border-neuro-accent" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-neutral-500 transition-colors group-hover:border-neuro-accent" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neutral-500 transition-colors group-hover:border-neuro-accent" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neutral-500 transition-colors group-hover:border-neuro-accent" />

            {step && (
                <span className="font-mono text-xs text-neuro-accent mb-4 block tracking-widest">
                    {step}
                </span>
            )}

            {title && (
                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight group-hover:text-neuro-accent transition-colors">
                    {title}
                </h3>
            )}

            <div className="relative z-10">
                {children}
            </div>

            {/* Scanline Effect on Hover */}
            <div className="absolute inset-0 bg-neuro-accent/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
        </div>
    );
};
