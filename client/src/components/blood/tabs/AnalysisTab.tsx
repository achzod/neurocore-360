import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import ReactMarkdown from "react-markdown";
import { Brain, AlertCircle, Zap, TrendingUp } from "lucide-react";

interface AnalysisTabProps {
  aiSections: {
    alerts?: { title: string; content: string };
    systems?: { title: string; content: string };
    deepDive?: { title: string; content: string };
    interconnections?: { title: string; content: string };
    [key: string]: { title: string; content: string } | undefined;
  };
}

interface SectionCardProps {
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

function SectionCard({ title, content, icon: Icon, iconColor }: SectionCardProps) {
  const { theme } = useBloodTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-6"
      style={{
        borderColor: theme.borderDefault,
        backgroundColor: theme.surface,
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="rounded-lg p-2"
          style={{
            backgroundColor: `${iconColor}20`,
            color: iconColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
          {title}
        </h3>
      </div>
      <div
        className="prose prose-sm max-w-none"
        style={{
          color: theme.textSecondary,
        }}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-6 mb-3" style={{ color: theme.textPrimary }}>
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mt-5 mb-2" style={{ color: theme.textPrimary }}>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-medium mt-4 mb-2" style={{ color: theme.textPrimary }}>
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-3 space-y-1">
                {children}
              </ul>
            ),
            li: ({ children }) => (
              <li className="ml-2">
                {children}
              </li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold" style={{ color: theme.textPrimary }}>
                {children}
              </strong>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}

export function AnalysisTab({ aiSections }: AnalysisTabProps) {
  const { theme } = useBloodTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-10"
    >
      <div className="rounded-xl border p-4" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surfaceMuted }}>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5" style={{ color: theme.primaryBlue }} />
          <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            Analyse IA complète
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
          Analyse détaillée de vos biomarqueurs par notre IA, avec contexte scientifique et recommandations personnalisées.
        </p>
      </div>

      {aiSections.alerts && (
        <SectionCard
          title={aiSections.alerts.title || "Alertes prioritaires"}
          content={aiSections.alerts.content}
          icon={AlertCircle}
          iconColor={theme.status.critical}
        />
      )}

      {aiSections.systems && (
        <SectionCard
          title={aiSections.systems.title || "Analyse système par système"}
          content={aiSections.systems.content}
          icon={Zap}
          iconColor={theme.primaryBlue}
        />
      )}

      {aiSections.deepDive && (
        <SectionCard
          title={aiSections.deepDive.title || "Deep Dive - Marqueurs prioritaires"}
          content={aiSections.deepDive.content}
          icon={TrendingUp}
          iconColor={theme.status.suboptimal}
        />
      )}

      {aiSections.interconnections && (
        <SectionCard
          title={aiSections.interconnections.title || "Interconnexions clés"}
          content={aiSections.interconnections.content}
          icon={Brain}
          iconColor={theme.status.optimal}
        />
      )}

      {/* Any other sections that might exist (exclude known sections handled elsewhere) */}
      {Object.entries(aiSections).map(([key, section]) => {
        if (!section || [
          "alerts", "systems", "deepDive", "interconnections",
          "synthesis", "quality", "potential", "plan90",
          "nutrition", "supplements", "annexes", "sources",
        ].includes(key)) {
          return null;
        }
        return (
          <SectionCard
            key={key}
            title={section.title}
            content={section.content}
            icon={Brain}
            iconColor={theme.textSecondary}
          />
        );
      })}

      {!Object.values(aiSections).some(Boolean) && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <Brain className="mx-auto h-12 w-12 mb-4" style={{ color: theme.textTertiary }} />
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            L'analyse IA est en cours de génération. Veuillez patienter quelques instants.
          </p>
        </div>
      )}
    </motion.div>
  );
}
