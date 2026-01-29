import { Loader2 } from "lucide-react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label = "Chargement" }: LoadingSpinnerProps) {
  const { theme } = useBloodTheme();

  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textSecondary }}>
      <Loader2 className="h-4 w-4 animate-spin" style={{ color: theme.primaryBlue }} />
      <span>{label}</span>
    </div>
  );
}
