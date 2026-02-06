import { Skeleton } from './Skeleton';

export function ReportSkeleton() {
  return (
    <div className="border border-zinc-800 rounded-lg p-6 space-y-6">
      {/* Section Title */}
      <Skeleton className="w-64 h-8" />

      {/* Paragraphs */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-11/12 h-4" />
            <Skeleton className="w-4/5 h-4" />
          </div>
        ))}
      </div>

      {/* Subsection */}
      <div className="space-y-3 mt-8">
        <Skeleton className="w-48 h-6" />
        <div className="space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-10/12 h-4" />
        </div>
      </div>

      {/* Another Subsection */}
      <div className="space-y-3 mt-8">
        <Skeleton className="w-56 h-6" />
        <div className="space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-9/12 h-4" />
        </div>
      </div>
    </div>
  );
}
