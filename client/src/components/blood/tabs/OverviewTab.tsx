import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { RadialScoreChart } from "../RadialScoreChart";
import { MetricCard3D } from "../MetricCard3D";
import { AnimatedStatCard } from "../AnimatedStatCard";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import type { BloodMarker, PanelKey } from "@/types/blood";

interface OverviewTabProps {
  globalScore: number;
  optimalMarkers: BloodMarker[];
  watchMarkers: BloodMarker[];
  actionMarkers: BloodMarker[];
  panelGroups: Record<PanelKey, BloodMarker[]>;
  patientInfo?: {
    prenom?: string;
    gender?: string;
    dob?: string;
    poids?: number;
    taille?: number;
    sleepHours?: number;
    stressLevel?: number;
  };
}

export function OverviewTab({
  globalScore,
  optimalMarkers,
  watchMarkers,
  actionMarkers,
  panelGroups,
  patientInfo,
}: OverviewTabProps) {
  const { theme } = useBloodTheme();

  const formatValue = (value: number, unit: string) => {
    if (!unit) return value.toString();
    if (unit === "%") return `${value}%`;
    return `${value} ${unit}`;
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const age = calculateAge(patientInfo?.dob);
  const bmi =
    patientInfo?.poids && patientInfo?.taille
      ? (patientInfo.poids / Math.pow(patientInfo.taille / 100, 2)).toFixed(1)
      : null;

  const infoRows = [
    patientInfo?.prenom && { label: "Prénom", value: patientInfo.prenom },
    patientInfo?.gender && { label: "Genre", value: patientInfo.gender === "homme" ? "Homme" : "Femme" },
    age && { label: "Âge", value: `${age} ans` },
    bmi && { label: "IMC", value: bmi },
    patientInfo?.sleepHours && { label: "Sommeil", value: `${patientInfo.sleepHours}h/nuit` },
    patientInfo?.stressLevel && { label: "Stress", value: `${patientInfo.stressLevel}/10` },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      {/* Global Score Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div
          className="rounded-2xl border p-8"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
            Score global
          </h3>
          <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
            Vue d'ensemble de ta santé métabolique
          </p>
          <div className="mt-6 flex justify-center">
            <RadialScoreChart score={globalScore} size={220} strokeWidth={8} />
          </div>
        </div>

        <div className="space-y-4">
          <AnimatedStatCard
            label="Optimal"
            value={optimalMarkers.length}
            color={theme.status.optimal}
            icon={CheckCircle}
          />
          <AnimatedStatCard
            label="À surveiller"
            value={watchMarkers.length}
            color={theme.status.suboptimal}
            icon={AlertTriangle}
          />
          <AnimatedStatCard
            label="Action requise"
            value={actionMarkers.length}
            color={theme.status.critical}
            icon={AlertCircle}
          />
        </div>
      </div>

      {/* Key Markers Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold" style={{ color: theme.textPrimary }}>
          Marqueurs clés par système
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(panelGroups).map(([panelKey, markers]) => {
            if (!markers.length) return null;

            const avgScore =
              markers.reduce((sum, m) => {
                const score =
                  m.status === "optimal" ? 100 : m.status === "normal" ? 75 : m.status === "suboptimal" ? 50 : 25;
                return sum + score;
              }, 0) / markers.length;

            const panelLabels: Record<PanelKey, string> = {
              hormonal: "Hormonal",
              metabolic: "Métabolique",
              thyroid: "Thyroïde",
              inflammation: "Inflammatoire",
              vitamins: "Vitamines",
              liver_kidney: "Foie & Reins",
            };

            return (
              <MetricCard3D
                key={panelKey}
                title={panelLabels[panelKey as PanelKey]}
                value={Math.round(avgScore)}
                unit="/100"
              />
            );
          })}
        </div>
      </div>

      {/* Patient Info */}
      {infoRows.length > 0 && (
        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
            Informations personnelles
          </h3>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2" style={{ color: theme.textSecondary }}>
            {infoRows.map((row) => (
              <div key={row.label}>
                <span style={{ color: theme.textTertiary }}>{row.label}:</span>{" "}
                <span style={{ color: theme.textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
