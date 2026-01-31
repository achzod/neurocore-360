export function BiometricProgressCircleSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="BiometricProgressCircle h-[220px] w-[220px] animate-pulse rounded-full bg-slate-200/70" />
      <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200/70" />
    </div>
  );
}
