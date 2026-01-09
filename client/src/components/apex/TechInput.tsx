import React, { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { UseFormRegisterReturn } from 'react-hook-form';

interface TechInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    register?: UseFormRegisterReturn;
}

export const TechInput: React.FC<TechInputProps> = ({ label, error, className, register, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block font-mono text-xs text-neuro-accent uppercase tracking-widest mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    className={cn(
                        "w-full bg-transparent border-b border-neutral-800 py-3 text-white font-mono focus:outline-none focus:border-neuro-accent transition-colors placeholder:text-neutral-700",
                        error ? "border-red-500" : "",
                        className
                    )}
                    {...props}
                    {...register}
                />
                {/* Animated bottom bar on focus could be added here */}
            </div>
            {error && (
                <span className="text-red-500 text-xs mt-1 block font-mono">
                    {`>> ERROR: ${error}`}
                </span>
            )}
        </div>
    );
};
