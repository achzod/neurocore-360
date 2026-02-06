import { motion } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import ReactMarkdown from "react-markdown";
import { BookOpen, ExternalLink } from "lucide-react";

interface SourcesTabProps {
  aiSections: {
    sources?: { title: string; content: string };
  };
}

export function SourcesTab({ aiSections }: SourcesTabProps) {
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
          <BookOpen className="h-5 w-5" style={{ color: theme.primaryBlue }} />
          <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            Sources scientifiques
          </h2>
        </div>
        <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
          Références scientifiques et ressources utilisées pour votre analyse.
        </p>
      </div>

      {aiSections.sources ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
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
                  <p className="mb-3 leading-relaxed" style={{ color: theme.textSecondary }}>
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-none mb-3 space-y-2" style={{ color: theme.textSecondary }}>
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2" style={{ color: theme.textSecondary }}>
                    <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: theme.primaryBlue }} />
                    <span>{children}</span>
                  </li>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                    style={{ color: theme.primaryBlue }}
                  >
                    {children}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {children}
                  </strong>
                ),
              }}
            >
              {aiSections.sources.content}
            </ReactMarkdown>
          </div>
        </motion.div>
      ) : (
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            borderColor: theme.borderDefault,
            backgroundColor: theme.surface,
          }}
        >
          <BookOpen className="mx-auto h-12 w-12 mb-4" style={{ color: theme.textTertiary }} />
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            Les références scientifiques sont en cours de compilation.
          </p>
          <p className="mt-2 text-xs" style={{ color: theme.textTertiary }}>
            Nous utilisons des sources de Huberman Lab, Peter Attia, Examine.com, Renaissance Periodization, et autres experts reconnus.
          </p>
        </div>
      )}

      {/* Additional Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border p-6"
        style={{
          borderColor: theme.borderDefault,
          backgroundColor: theme.surface,
        }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: theme.textPrimary }}>
          Ressources recommandées
        </h3>
        <div className="space-y-3">
          {[
            { name: "Huberman Lab", url: "https://hubermanlab.com", description: "Neuroscience & optimisation de la performance" },
            { name: "Peter Attia MD", url: "https://peterattiamd.com", description: "Longévité & médecine préventive" },
            { name: "Examine.com", url: "https://examine.com", description: "Base de données sur les suppléments" },
            { name: "Renaissance Periodization", url: "https://rpstrength.com", description: "Science de la nutrition & training" },
          ].map((resource) => (
            <a
              key={resource.name}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-opacity-80"
              style={{
                borderColor: theme.borderSubtle,
                backgroundColor: theme.surfaceMuted,
              }}
            >
              <ExternalLink className="h-4 w-4 mt-1 flex-shrink-0" style={{ color: theme.primaryBlue }} />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: theme.textPrimary }}>
                  {resource.name}
                </div>
                <div className="text-xs" style={{ color: theme.textSecondary }}>
                  {resource.description}
                </div>
              </div>
            </a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
