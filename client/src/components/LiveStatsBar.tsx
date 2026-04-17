import { useEffect, useState } from "react";

interface LiveStats {
  totalClients: number;
  discoveryScans: number;
  anabolicBioscans: number;
  ultimateScans: number;
  peptidesProtocols: number;
  peptidesAvgPerProtocol: number;
  bloodAnalyses: number;
  totalReportsDelivered: number;
  since: string;
  computedAt: string;
  error?: boolean;
}

type Variant = "peptides" | "checkout" | "discovery" | "blood";

interface LiveStatsBarProps {
  variant?: Variant;
  className?: string;
}

// Social-proof bar showing live, factual numbers pulled from the DB.
// Never fabricates — if the API returns `error` or totalReportsDelivered === 0
// (brand new install, pre-launch), the component renders nothing.
export function LiveStatsBar({ variant = "peptides", className = "" }: LiveStatsBarProps) {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/live")
      .then(r => r.ok ? r.json() : null)
      .then((data: LiveStats | null) => {
        if (cancelled || !data || data.error) return;
        if (!data.totalReportsDelivered || data.totalReportsDelivered < 3) return;
        setStats(data);
      })
      .catch(() => { /* silent — social proof is nice-to-have, not critical */ });
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

function getItems(variant: Variant, s: LiveStats): Array<{ value: string; label: string }> {
  const all: Array<{ value: string; label: string }> = [];

  switch (variant) {
    case "peptides":
      if (s.peptidesProtocols > 0) {
        all.push({ value: `${s.peptidesProtocols}`, label: "protocoles livrés" });
      }
      if (s.peptidesAvgPerProtocol > 0) {
        all.push({ value: `${s.peptidesAvgPerProtocol}`, label: "peptides en moyenne" });
      }
      if (s.bloodAnalyses > 0) {
        all.push({ value: `${s.bloodAnalyses}`, label: "Blood Analysis livrées" });
      }
      all.push({ value: "2", label: "crédits Blood offerts" });
      break;

    case "checkout":
      if (s.totalClients > 0) {
        all.push({ value: `${s.totalClients}`, label: "clients servis" });
      }
      if (s.totalReportsDelivered > 0) {
        all.push({ value: `${s.totalReportsDelivered}`, label: "rapports livrés" });
      }
      all.push({ value: `${new Date(s.since).getFullYear()}`, label: "lancé en" });
      all.push({ value: "24h", label: "délai moyen" });
      break;

    case "discovery":
      if (s.discoveryScans > 0) {
        all.push({ value: `${s.discoveryScans}`, label: "Discovery Scans livrés" });
      }
      if (s.totalClients > 0) {
        all.push({ value: `${s.totalClients}`, label: "clients APEXLABS" });
      }
      all.push({ value: "15", label: "axes analysés" });
      all.push({ value: "gratuit", label: "et personnalisé" });
      break;

    case "blood":
      if (s.bloodAnalyses > 0) {
        all.push({ value: `${s.bloodAnalyses}`, label: "bilans analysés" });
      }
      if (s.totalClients > 0) {
        all.push({ value: `${s.totalClients}`, label: "clients APEXLABS" });
      }
      all.push({ value: "30+", label: "marqueurs" });
      all.push({ value: "24h", label: "délai rapport" });
      break;
  }

  return all.slice(0, 4);
}
