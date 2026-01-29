import { BloodRadar } from "@/components/blood/BloodRadar";
import { PANEL_LABELS, scoreToStatus } from "@/components/blood/overview/utils";
import type { PanelScore } from "@/types/blood";

interface GlobalRadarProps {
  panelScores: PanelScore[];
}

export default function GlobalRadar({ panelScores }: GlobalRadarProps) {
  const data = panelScores.map((panel) => ({
    key: panel.panel,
    label: PANEL_LABELS[panel.panel],
    score: panel.score,
    status: scoreToStatus(panel.score),
    muted: panel.markersCount === 0,
  }));

  return <BloodRadar data={data} height={320} />;
}
