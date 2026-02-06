import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({
  className = '',
  variant = 'rectangular'
}: SkeletonProps) {
  const variantClasses = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4 my-2',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-zinc-800/50',
        variantClasses[variant],
        className
      )}
    />
  );
}
