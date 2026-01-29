import { useBloodTheme } from "@/components/blood/BloodThemeContext";

const ACTIONS = [
  {
    title: "Priorites protocole",
    description: "Passe au plan d action personnalise pour tes biomarqueurs.",
  },
  {
    title: "Exporter PDF",
    description: "Sauvegarde une version partageable de ton rapport.",
  },
  {
    title: "Planifier retest",
    description: "Ajoute un rappel pour ta prochaine prise de sang.",
  },
];

export default function QuickActionsSection() {
  const { theme } = useBloodTheme();

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}>
      <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Quick actions
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ACTIONS.map((action) => (
          <div
            key={action.title}
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: theme.borderSubtle, backgroundColor: theme.surfaceMuted }}
          >
            <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {action.title}
            </div>
            <div className="mt-1 text-xs" style={{ color: theme.textSecondary }}>
              {action.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
