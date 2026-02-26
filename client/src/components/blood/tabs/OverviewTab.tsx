import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { RadialScoreChart } from "../RadialScoreChart";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  Zap,
  Heart,
  Flame,
  Droplets,
  Shield,
  User,
  Target,
  TrendingUp,
} from "lucide-react";
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
    objectives?: string;
  };
}

const PANEL_CONFIG: Record<PanelKey, { icon: typeof Activity; label: string; gradient: string }> = {
  hormonal: { icon: Zap, label: "Hormonal", gradient: "from-violet-500/20 to-purple-500/10" },
  metabolic: { icon: Flame, label: "Métabolique", gradient: "from-orange-500/20 to-amber-500/10" },
  thyroid: { icon: Activity, label: "Thyroïde", gradient: "from-cyan-500/20 to-teal-500/10" },
  inflammation: { icon: Shield, label: "Inflammation", gradient: "from-red-500/20 to-rose-500/10" },
  vitamins: { icon: Droplets, label: "Vitamines", gradient: "from-emerald-500/20 to-green-500/10" },
  liver_kidney: { icon: Heart, label: "Foie & Reins", gradient: "from-blue-500/20 to-indigo-500/10" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  delay?: number;
}) {
  const { theme, mode } = useBloodTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: mode === "dark"
          ? `linear-gradient(135deg, ${theme.surface} 0%, ${theme.surfaceMuted} 100%)`
          : theme.surface,
        border: `1px solid ${theme.borderSubtle}`,
        boxShadow: theme.shadowMedium,
      }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ background: color }}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <p
            className="text-sm font-medium tracking-wide uppercase"
            style={{ color: theme.textTertiary }}
          >
            {label}
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
            className="text-4xl font-bold mt-1 tabular-nums"
            style={{ color: theme.textPrimary }}
          >
            {value}
          </motion.p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: bgColor }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

function PanelCard({
  panelKey,
  markers,
  delay = 0,
}: {
  panelKey: PanelKey;
  markers: BloodMarker[];
  delay?: number;
}) {
  const { theme, mode } = useBloodTheme();
  const config = PANEL_CONFIG[panelKey];
  const Icon = config?.icon || Activity;

  const avgScore =
    markers.reduce((sum, m) => {
      const score =
        m.status === "optimal" ? 100 : m.status === "normal" ? 80 : m.status === "suboptimal" ? 55 : 30;
      return sum + score;
    }, 0) / markers.length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.status.optimal;
    if (score >= 60) return theme.status.normal;
    if (score >= 40) return theme.status.suboptimal;
    return theme.status.critical;
  };

  const scoreColor = getScoreColor(avgScore);
  const criticalCount = markers.filter((m) => m.status === "critical").length;
  const optimalCount = markers.filter((m) => m.status === "optimal").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: mode === "dark"
          ? `linear-gradient(145deg, ${theme.surface} 0%, ${theme.surfaceMuted} 100%)`
          : theme.surface,
        border: `1px solid ${theme.borderDefault}`,
        boxShadow: theme.shadowMedium,
      }}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config?.gradient || "from-gray-500/10 to-gray-500/5"} opacity-60`}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: `${scoreColor}15`,
                border: `1px solid ${scoreColor}25`,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: scoreColor }} />
            </div>
            <div>
              <h4
                className="text-base font-semibold"
                style={{ color: theme.textPrimary }}
              >
                {config?.label || panelKey}
              </h4>
              <p
                className="text-xs"
                style={{ color: theme.textTertiary }}
              >
                {markers.length} marqueur{markers.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Score badge */}
          <div
            className="px-3 py-1.5 rounded-lg"
            style={{
              background: `${scoreColor}15`,
              border: `1px solid ${scoreColor}30`,
            }}
          >
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: scoreColor }}
            >
              {Math.round(avgScore)}
            </span>
            <span
              className="text-xs ml-0.5"
              style={{ color: theme.textTertiary }}
            >
              /100
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 rounded-full overflow-hidden mb-4"
          style={{ background: theme.surfaceMuted }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${avgScore}%` }}
            transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${scoreColor}CC 0%, ${scoreColor} 100%)`,
              boxShadow: `0 0 12px ${scoreColor}40`,
            }}
          />
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 text-xs">
          {optimalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: theme.status.optimal }}
              />
              <span style={{ color: theme.textSecondary }}>
                {optimalCount} optimal{optimalCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: theme.status.critical }}
              />
              <span style={{ color: theme.status.critical }}>
                {criticalCount} critique{criticalCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function OverviewTab({
  globalScore,
  optimalMarkers,
  watchMarkers,
  actionMarkers,
  panelGroups,
  patientInfo,
}: OverviewTabProps) {
  const { theme, mode } = useBloodTheme();

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

  const totalMarkers = optimalMarkers.length + watchMarkers.length + actionMarkers.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      {/* Hero Section - Global Score */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-5">
        {/* Score Card - Larger */}
        <div
          className="lg:col-span-2 relative overflow-hidden rounded-3xl p-8"
          style={{
            background: mode === "dark"
              ? `linear-gradient(145deg, ${theme.surface} 0%, ${theme.surfaceElevated} 100%)`
              : `linear-gradient(145deg, ${theme.surface} 0%, ${theme.surfaceMuted} 100%)`,
            border: `1px solid ${theme.borderDefault}`,
            boxShadow: theme.shadowStrong,
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ background: theme.primaryBlue }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-2xl opacity-10"
            style={{ background: theme.accentGold }}
          />

          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <Target className="h-5 w-5" style={{ color: theme.primaryBlue }} />
              <h3
                className="text-sm font-semibold tracking-wide uppercase"
                style={{ color: theme.textSecondary }}
              >
                Score Global
              </h3>
            </div>

            <div className="flex justify-center">
              <RadialScoreChart score={globalScore} size={200} strokeWidth={10} />
            </div>

            <div className="mt-6 text-center">
              <p
                className="text-sm"
                style={{ color: theme.textTertiary }}
              >
                {totalMarkers} biomarqueurs analysés
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Optimal"
            value={optimalMarkers.length}
            icon={CheckCircle2}
            color={theme.status.optimal}
            bgColor={theme.status.optimalBg}
            delay={0.1}
          />
          <StatCard
            label="À surveiller"
            value={watchMarkers.length}
            icon={AlertTriangle}
            color={theme.status.suboptimal}
            bgColor={theme.status.suboptimalBg}
            delay={0.2}
          />
          <StatCard
            label="Action requise"
            value={actionMarkers.length}
            icon={AlertCircle}
            color={theme.status.critical}
            bgColor={theme.status.criticalBg}
            delay={0.3}
          />
        </div>
      </motion.div>

      {/* Panel Groups Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2 rounded-lg"
            style={{ background: theme.primaryGlow }}
          >
            <TrendingUp className="h-5 w-5" style={{ color: theme.primaryBlue }} />
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ color: theme.textPrimary }}
            >
              Analyse par système
            </h3>
            <p
              className="text-sm"
              style={{ color: theme.textTertiary }}
            >
              Performance de chaque axe biologique
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(panelGroups).map(([panelKey, markers], index) => {
            if (!markers.length) return null;
            return (
              <PanelCard
                key={panelKey}
                panelKey={panelKey as PanelKey}
                markers={markers}
                delay={0.1 + index * 0.05}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Patient Info Section */}
      {patientInfo && (patientInfo.prenom || patientInfo.gender || age || patientInfo.objectives) && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl p-6"
          style={{
            background: mode === "dark"
              ? `linear-gradient(145deg, ${theme.surface} 0%, ${theme.surfaceMuted} 100%)`
              : theme.surface,
            border: `1px solid ${theme.borderSubtle}`,
            boxShadow: theme.shadowSoft,
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="p-2 rounded-lg"
              style={{ background: theme.surfaceMuted }}
            >
              <User className="h-5 w-5" style={{ color: theme.textSecondary }} />
            </div>
            <h3
              className="text-base font-semibold"
              style={{ color: theme.textPrimary }}
            >
              Profil patient
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {patientInfo.prenom && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.textTertiary }}>
                  Prénom
                </p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>
                  {patientInfo.prenom}
                </p>
              </div>
            )}
            {patientInfo.gender && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.textTertiary }}>
                  Genre
                </p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>
                  {patientInfo.gender === "homme" ? "Homme" : "Femme"}
                </p>
              </div>
            )}
            {age && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.textTertiary }}>
                  Âge
                </p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>
                  {age} ans
                </p>
              </div>
            )}
            {bmi && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.textTertiary }}>
                  IMC
                </p>
                <p className="font-medium" style={{ color: theme.textPrimary }}>
                  {bmi}
                </p>
              </div>
            )}
          </div>

          {patientInfo.objectives && (
            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${theme.borderSubtle}` }}>
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: theme.textTertiary }}>
                Objectifs
              </p>
              <p className="text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                {patientInfo.objectives}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
