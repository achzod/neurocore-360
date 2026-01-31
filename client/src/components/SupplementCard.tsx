import { memo } from "react";

interface SupplementCardProps {
  supp: {
    name: string;
    mechanism: string;
    dosage: string;
    priority: number;
    citations?: string[];
  };
}

export const SupplementCard = memo(function SupplementCard({ supp }: SupplementCardProps) {
  return (
    <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
      <div className="space-y-2 text-sm text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">QUOI:</span> {supp.name}
        </div>
        <div>
          <span className="font-semibold text-slate-900">POURQUOI:</span> {supp.mechanism}
        </div>
        <div>
          <span className="font-semibold text-slate-900">COMMENT:</span> {supp.dosage}
        </div>
        <div>
          <span className="font-semibold text-slate-900">QUAND:</span>{" "}
          {supp.priority === 1 ? "Urgent" : "Phase d'optimisation"}
        </div>
        {supp.citations && supp.citations.length > 0 && (
          <div className="mt-3 rounded-lg bg-[--bg-secondary] p-3">
            <span className="font-semibold text-slate-900">EXPERT:</span>{" "}
            <span className="text-cyan-700">{supp.citations[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
});

SupplementCard.displayName = "SupplementCard";
