import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { ProtocolStepper } from "../ProtocolStepper";
import ReactMarkdown from "react-markdown";
import { Clipboard, Apple, Pill, Calendar } from "lucide-react";

interface ProtocolsTabProps {
  aiSections: {
    plan90?: { title: string; content: string };
    nutrition?: { title: string; content: string };
    supplements?: { title: string; content: string };
  };
  protocolPhases?: Array<{
    id: number;
    title: string;
    duration: string;
    description: string;
    items: string[];
    completed?: boolean;
  }>;
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
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm border-collapse">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border px-3 py-2 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border px-3 py-2">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}

export function ProtocolsTab({ aiSections, protocolPhases }: ProtocolsTabProps) {
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
          <Clipboard className="h-5 w-5" style={{ color: theme.primaryBlue }} />
          <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            Protocoles personnalisés
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
          Plan d'action détaillé sur 90 jours pour optimiser vos biomarqueurs.
        </p>
      </div>

      {/* Protocol Stepper */}
      {protocolPhases && protocolPhases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-5 w-5" style={{ color: theme.primaryBlue }} />
            <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
              Timeline 90 jours
            </h3>
          </div>
          <ProtocolStepper phases={protocolPhases} currentPhase={1} />
        </motion.div>
      )}

      {/* Plan 90 Jours */}
      {aiSections.plan90 && (
        <SectionCard
          title={aiSections.plan90.title || "Plan 90 jours détaillé"}
          content={aiSections.plan90.content}
          icon={Calendar}
          iconColor={theme.primaryBlue}
        />
      )}

      {/* Nutrition */}
      {aiSections.nutrition && (
        <SectionCard
          title={aiSections.nutrition.title || "Nutrition & Lifestyle"}
          content={aiSections.nutrition.content}
          icon={Apple}
          iconColor={theme.status.optimal}
        />
      )}

      {/* Supplements */}
      {aiSections.supplements && (
        <SectionCard
          title={aiSections.supplements.title || "Suppléments recommandés"}
          content={aiSections.supplements.content}
          icon={Pill}
          iconColor={theme.status.suboptimal}
        />
      )}

      {!aiSections.plan90 && !aiSections.nutrition && !aiSections.supplements && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <Clipboard className="mx-auto h-12 w-12 mb-4" style={{ color: theme.textTertiary }} />
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            Les protocoles personnalisés sont en cours de génération. Veuillez patienter quelques instants.
          </p>
        </div>
      )}
    </motion.div>
  );
}
