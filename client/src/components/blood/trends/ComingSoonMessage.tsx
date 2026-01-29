import { useBloodTheme } from "@/components/blood/BloodThemeContext";

export default function ComingSoonMessage() {
  const { theme } = useBloodTheme();

  return (
    <div className="rounded-2xl border p-8 text-center" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
      <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
        Trends bientot disponibles
      </div>
      <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
        Cette section affichera l evolution de tes biomarqueurs sur plusieurs bilans.
      </p>
    </div>
  );
}
