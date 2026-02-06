import { Skeleton } from './Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-96 h-5" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="w-28 h-10 flex-shrink-0" />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Radial Score Chart */}
        <div className="flex flex-col items-center justify-center p-6 border border-zinc-800 rounded-lg">
          <Skeleton variant="circular" className="w-56 h-56" />
          <Skeleton className="w-40 h-4 mt-4" />
        </div>

        {/* Heatmap */}
        <div className="p-6 border border-zinc-800 rounded-lg space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-5 h-5" />
            <Skeleton className="w-48 h-6" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>

      {/* Panel Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-3 h-3" />
              <Skeleton className="w-24 h-5" />
            </div>
            <div className="space-y-2">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="w-full h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
