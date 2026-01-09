import React from 'react';
import { cn } from '@/lib/utils';

interface SectionWrapperProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({ children, className, id }) => {
    return (
        <section
            id={id}
            className={cn(
                "py-24 bg-neuro-dark border-b border-neutral-800 relative overflow-hidden",
                className
            )}
        >
            {/* Decorative Grid Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-tech-grid" />

            {/* Decorative Side Lines */}
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-neutral-800 z-10 hidden md:block" />
            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-neutral-800 z-10 hidden md:block" />

            <div className="container mx-auto px-6 relative z-10">
                {children}
            </div>
        </section>
    );
};
