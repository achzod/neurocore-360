import React from 'react';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface NeuroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    children: React.ReactNode;
    icon?: React.ReactNode;
}

export const NeuroButton: React.FC<NeuroButtonProps> = ({
    children,
    variant = 'primary',
    className,
    icon,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-mono uppercase tracking-widest text-xs transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none h-12 px-8";

    const variants = {
        primary: "bg-neuro-accent text-black font-bold hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(252,221,0,0.4)]",
        outline: "bg-transparent border border-white/20 text-white hover:border-neuro-accent hover:text-neuro-accent",
        ghost: "bg-transparent text-neutral-400 hover:text-neuro-accent"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
            {icon && <span className="ml-2">{icon}</span>}
        </button>
    );
};
