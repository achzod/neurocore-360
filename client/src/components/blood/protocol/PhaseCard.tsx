import { useBloodTheme } from "@/components/blood/BloodThemeContext";

interface PhaseCardProps {
  title: string;
  subtitle: string;
  items: string[];
  accent: string;
}

export default function PhaseCard({ title, subtitle, items, accent }: PhaseCardProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {title}
          </div>
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            {subtitle}
          </div>
        </div>
        <span className="h-2 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <ul className="mt-4 space-y-2 text-sm" style={{ color: theme.textSecondary }}>
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>- {item}</li>
        ))}
        {!items.length && <li>Aucune action definie.</li>}
      </ul>
    </div>
  );
}
