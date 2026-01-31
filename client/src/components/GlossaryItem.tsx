import { memo } from "react";

interface GlossaryItemProps {
  term: string;
  definition: string;
}

export const GlossaryItem = memo(function GlossaryItem({ term, definition }: GlossaryItemProps) {
  return (
    <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
      <div className="text-sm font-semibold text-slate-900 font-display">{term}</div>
      <p className="mt-2 text-sm text-slate-700">{definition}</p>
    </div>
  );
});

GlossaryItem.displayName = "GlossaryItem";
