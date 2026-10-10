import { useEffect, useState } from "react";

interface PublicLiveStats {
  clientsServed: string;
  discoveryScansDelivered: string;
  reportsDelivered: string;
  peptidesAvgPerProtocol: number;
  sinceYear: number;
  publicAggregate: true;
  error?: boolean;
}

type Variant = "peptides" | "checkout" | "discovery" | "blood";

interface LiveStatsBarProps {
  variant?: Variant;
  className?: string;
}

// Social proof deliberately exposes rounded display buckets only. Exact product,
// client and report counts remain server-side commercial data.
export function LiveStatsBar({ variant = "peptides", className = "" }: LiveStatsBarProps) {
  const [stats, setStats] = useState<PublicLiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/live")
      .then(r => r.ok ? r.json() : null)
      .then((data: PublicLiveStats | null) => {
        if (cancelled || !data || data.error || data.publicAggregate !== true) return;
        setStats(data);
      })
      .catch(() => { /* La preuve sociale ne doit jamais bloquer la page. */ });
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;
  const items = getItems(variant, stats);
  if (items.length === 0) return null;

  return (
    <div className={`rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-xl font-bold text-primary">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getItems(variant: Variant, s: PublicLiveStats): Array<{ value: string; label: string }> {
  const all: Array<{ value: string; label: string }> = [];

  switch (variant) {
    case "peptides":
      if (s.peptidesAvgPerProtocol > 0) {
        all.push({ value: `${s.peptidesAvgPerProtocol}`, label: "peptides en moyenne" });
      }
      all.push({ value: "2", label: "crédits Blood offerts" });
      break;

    case "checkout":
      if (s.clientsServed) all.push({ value: s.clientsServed, label: "clients servis" });
      if (s.reportsDelivered) all.push({ value: s.reportsDelivered, label: "rapports livrés" });
      all.push({ value: `${s.sinceYear}`, label: "lancé en" });
      all.push({ value: "24h", label: "délai moyen" });
      break;

    case "discovery":
      if (s.discoveryScansDelivered) {
        all.push({ value: s.discoveryScansDelivered, label: "Discovery Scans livrés" });
      }
      if (s.clientsServed) all.push({ value: s.clientsServed, label: "clients APEXLABS" });
      all.push({ value: "15", label: "axes analysés" });
      all.push({ value: "gratuit", label: "et personnalisé" });
      break;

    case "blood":
      if (s.clientsServed) all.push({ value: s.clientsServed, label: "clients APEXLABS" });
      all.push({ value: "30+", label: "marqueurs" });
      all.push({ value: "24h", label: "délai rapport" });
      break;
  }

  return all.slice(0, 4);
}
