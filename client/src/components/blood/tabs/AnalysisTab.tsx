import { motion, AnimatePresence } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import {
  Brain,
  AlertCircle,
  Zap,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  Target,
  Activity,
  Beaker,
  ArrowRight,
} from "lucide-react";

interface AnalysisTabProps {
  aiSections: {
    synthesis?: { title: string; content: string };
    quality?: { title: string; content: string };
    dashboard?: { title: string; content: string };
    potential?: { title: string; content: string };
    systems?: { title: string; content: string };
    interconnections?: { title: string; content: string };
    deepDive?: { title: string; content: string };
    alerts?: { title: string; content: string };
    [key: string]: { title: string; content: string } | undefined;
  };
}

type SectionConfig = {
  key: string;
  icon: typeof Brain;
  gradient: string;
  accentColor: string;
  priority: number;
  defaultOpen?: boolean;
};

const SECTION_CONFIG: Record<string, SectionConfig> = {
  synthesis: {
    key: "synthesis",
    icon: Target,
    gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
    accentColor: "#22D3EE",
    priority: 1,
    defaultOpen: true,
  },
  quality: {
    key: "quality",
    icon: FileText,
    gradient: "from-slate-500/20 via-slate-500/10 to-transparent",
    accentColor: "#94A3B8",
    priority: 2,
  },
  dashboard: {
    key: "dashboard",
    icon: Activity,
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
    accentColor: "#8B5CF6",
    priority: 3,
  },
  potential: {
    key: "potential",
    icon: TrendingUp,
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    accentColor: "#10B981",
    priority: 4,
  },
  systems: {
    key: "systems",
    icon: Zap,
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    accentColor: "#F59E0B",
    priority: 5,
    defaultOpen: true,
  },
  interconnections: {
    key: "interconnections",
    icon: Brain,
    gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
    accentColor: "#A855F7",
    priority: 6,
  },
  deepDive: {
    key: "deepDive",
    icon: Beaker,
    gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
    accentColor: "#F43F5E",
    priority: 7,
    defaultOpen: true,
  },
  alerts: {
    key: "alerts",
    icon: AlertCircle,
    gradient: "from-red-500/20 via-red-500/10 to-transparent",
    accentColor: "#EF4444",
    priority: 0,
    defaultOpen: true,
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function SectionCard({
  title,
  content,
  config,
  index,
}: {
  title: string;
  content: string;
  config: SectionConfig;
  index: number;
}) {
  const { theme, mode } = useBloodTheme();
  const [isExpanded, setIsExpanded] = useState(config.defaultOpen ?? false);
  const Icon = config.icon;

  // Truncate preview to ~200 chars
  const previewLength = 200;
  const preview = content.length > previewLength
    ? content.slice(0, previewLength).replace(/\s+\S*$/, "...").trim()
    : content;

  return (
    <motion.div
      variants={itemVariants}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: mode === "dark"
          ? `linear-gradient(145deg, ${theme.surface} 0%, ${theme.surfaceMuted} 100%)`
          : theme.surface,
        border: `1px solid ${theme.borderDefault}`,
        boxShadow: theme.shadowMedium,
      }}
    >
      {/* Gradient accent top border */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`}
        style={{ opacity: 0.8 }}
      />

      {/* Header - Always visible */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 text-left"
        whileHover={{ backgroundColor: theme.surfaceMuted + "40" }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: `${config.accentColor}15`,
              border: `1px solid ${config.accentColor}25`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: config.accentColor }} />
          </div>
          <div>
            <h3
              className="text-base font-semibold tracking-tight"
              style={{ color: theme.textPrimary }}
            >
              {title}
            </h3>
            {!isExpanded && (
              <p
                className="text-sm mt-1 line-clamp-1"
                style={{ color: theme.textTertiary }}
              >
                {preview}
              </p>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="p-2 rounded-lg"
          style={{ background: theme.surfaceMuted }}
        >
          <ChevronDown className="h-4 w-4" style={{ color: theme.textSecondary }} />
        </motion.div>
      </motion.button>

      {/* Content - Expandable */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-6 pt-2"
              style={{ borderTop: `1px solid ${theme.borderSubtle}` }}
            >
              <div
                className="prose prose-sm max-w-none"
                style={{ color: theme.textSecondary }}
              >
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1
                        className="text-xl font-bold mt-6 mb-4 flex items-center gap-2"
                        style={{ color: theme.textPrimary }}
                      >
                        <ArrowRight className="h-4 w-4" style={{ color: config.accentColor }} />
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2
                        className="text-lg font-semibold mt-5 mb-3 flex items-center gap-2"
                        style={{ color: theme.textPrimary }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: config.accentColor }}
                        />
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3
                        className="text-base font-medium mt-4 mb-2"
                        style={{ color: theme.textPrimary }}
                      >
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4
                        className="text-sm font-medium mt-3 mb-2"
                        style={{ color: theme.textSecondary }}
                      >
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="mb-3 leading-relaxed text-[15px]">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 space-y-2 list-decimal list-inside">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-2 text-[15px]">
                        <span
                          className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: config.accentColor, opacity: 0.6 }}
                        />
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong
                        className="font-semibold"
                        style={{ color: theme.textPrimary }}
                      >
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ color: theme.textSecondary }}>{children}</em>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote
                        className="border-l-3 pl-4 py-2 my-4 italic"
                        style={{
                          borderColor: config.accentColor,
                          background: `${config.accentColor}08`,
                          borderRadius: "0 8px 8px 0",
                        }}
                      >
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code
                        className="px-1.5 py-0.5 rounded text-sm font-mono"
                        style={{
                          background: theme.surfaceMuted,
                          color: config.accentColor,
                        }}
                      >
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-lg" style={{ border: `1px solid ${theme.borderSubtle}` }}>
                        <table className="w-full text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead style={{ background: theme.surfaceMuted }}>
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th
                        className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide"
                        style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.borderSubtle}` }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        className="px-4 py-3"
                        style={{ color: theme.textPrimary, borderBottom: `1px solid ${theme.borderSubtle}` }}
                      >
                        {children}
                      </td>
                    ),
                    hr: () => (
                      <hr
                        className="my-6"
                        style={{ borderColor: theme.borderSubtle }}
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AnalysisTab({ aiSections }: AnalysisTabProps) {
  const { theme, mode } = useBloodTheme();

  // Sort sections by priority
  const sortedSections = Object.entries(aiSections)
    .filter(([key, section]) => {
      if (!section) return false;
      // Exclude sections handled by other tabs
      if (["plan90", "nutrition", "supplements", "annexes", "sources"].includes(key)) {
        return false;
      }
      return true;
    })
    .sort(([keyA], [keyB]) => {
      const priorityA = SECTION_CONFIG[keyA]?.priority ?? 99;
      const priorityB = SECTION_CONFIG[keyB]?.priority ?? 99;
      return priorityA - priorityB;
    });

  const hasContent = sortedSections.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: mode === "dark"
            ? `linear-gradient(135deg, ${theme.primaryGlow} 0%, transparent 60%)`
            : `linear-gradient(135deg, ${theme.primaryGlow} 0%, ${theme.surface} 100%)`,
          border: `1px solid ${theme.borderGlow}`,
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ background: theme.primaryBlue }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="p-3 rounded-xl"
            style={{
              background: `${theme.primaryBlue}20`,
              border: `1px solid ${theme.borderGlow}`,
            }}
          >
            <Brain className="h-6 w-6" style={{ color: theme.primaryBlue }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="text-xl font-semibold"
                style={{ color: theme.textPrimary }}
              >
                Analyse approfondie
              </h2>
              <Sparkles
                className="h-4 w-4"
                style={{ color: theme.accentGold }}
              />
            </div>
            <p
              className="mt-2 text-sm leading-relaxed max-w-2xl"
              style={{ color: theme.textSecondary }}
            >
              Analyse détaillée de vos biomarqueurs par notre intelligence artificielle,
              avec contexte scientifique et recommandations personnalisées basées sur
              votre profil unique.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      {hasContent ? (
        sortedSections.map(([key, section], index) => {
          if (!section) return null;
          const config = SECTION_CONFIG[key] || {
            key,
            icon: Brain,
            gradient: "from-gray-500/20 via-gray-500/10 to-transparent",
            accentColor: theme.textSecondary,
            priority: 99,
          };

          return (
            <SectionCard
              key={key}
              title={section.title}
              content={section.content}
              config={config}
              index={index}
            />
          );
        })
      ) : (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl p-12 text-center"
          style={{
            background: theme.surface,
            border: `1px solid ${theme.borderDefault}`,
          }}
        >
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: theme.surfaceMuted }}
          >
            <Brain className="h-8 w-8" style={{ color: theme.textTertiary }} />
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: theme.textPrimary }}
          >
            Analyse en cours de génération
          </h3>
          <p
            className="text-sm max-w-md mx-auto"
            style={{ color: theme.textSecondary }}
          >
            Nous analysons vos biomarqueurs pour générer un rapport personnalisé.
            Veuillez patienter quelques instants.
          </p>

          {/* Loading animation */}
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: theme.primaryBlue }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
