import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";

export function TrendsTab() {
  const { theme } = useBloodTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: theme.borderDefault,
          backgroundColor: theme.surface,
        }}
      >
        <div
          className="mx-auto w-fit rounded-full p-4 mb-4"
          style={{
            backgroundColor: `${theme.primaryBlue}20`,
          }}
        >
          <TrendingUp className="h-12 w-12" style={{ color: theme.primaryBlue }} />
        </div>

        <h3 className="text-xl font-semibold mb-2" style={{ color: theme.textPrimary }}>
          Tendances disponibles bientôt
        </h3>
        <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>
          Cette fonctionnalité sera disponible lorsque vous aurez plusieurs analyses sanguines. Vous pourrez suivre l'évolution de vos biomarqueurs dans le temps.
        </p>

        <div className="grid gap-4 md:grid-cols-3 text-left">
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surfaceMuted,
            }}
          >
            <Calendar className="h-8 w-8 mb-3" style={{ color: theme.primaryBlue }} />
            <div className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Suivi temporel
            </div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              Visualisez l'évolution de chaque marqueur sur 3, 6 ou 12 mois
            </div>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surfaceMuted,
            }}
          >
            <BarChart3 className="h-8 w-8 mb-3" style={{ color: theme.status.optimal }} />
            <div className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Comparaison avant/après
            </div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              Mesurez l'impact de vos protocoles sur vos biomarqueurs
            </div>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: theme.borderSubtle,
              backgroundColor: theme.surfaceMuted,
            }}
          >
            <TrendingUp className="h-8 w-8 mb-3" style={{ color: theme.status.suboptimal }} />
            <div className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Prédictions IA
            </div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              Recevez des alertes si une tendance négative est détectée
            </div>
          </div>
        </div>

        <div
          className="mt-6 rounded-lg border p-4 text-left"
          style={{
            borderColor: theme.borderSubtle,
            backgroundColor: `${theme.primaryBlue}10`,
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: theme.primaryBlue }}>
            💡 Conseil
          </p>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            Pour un suivi optimal, nous recommandons de refaire une analyse complète tous les 90 jours après avoir appliqué les protocoles.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
