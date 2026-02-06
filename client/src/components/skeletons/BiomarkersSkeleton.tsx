import { Skeleton } from './Skeleton';

export function BiomarkersSkeleton() {
  return (
    <div className="space-y-10">
      {[...Array(3)].map((_, panelIdx) => (
        <section key={panelIdx} className="space-y-4">
          {/* Panel Header */}
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-5 h-5" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-6" />
              <Skeleton className="w-64 h-4" />
            </div>
          </div>

          {/* Biomarker Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="border border-zinc-800 rounded-lg p-4 space-y-4"
              >
                {/* Marker Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-32 h-5" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                  <Skeleton className="w-20 h-6 rounded-full" />
                </div>

                {/* Progress Bar */}
                <Skeleton className="w-full h-3 rounded-full" />

                {/* Range Indicator */}
                <div className="flex justify-between">
                  <Skeleton className="w-16 h-3" />
                  <Skeleton className="w-16 h-3" />
                  <Skeleton className="w-16 h-3" />
                </div>

                {/* Interpretation Text */}
                <div className="space-y-2">
                  <Skeleton className="w-full h-3" />
                  <Skeleton className="w-3/4 h-3" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
