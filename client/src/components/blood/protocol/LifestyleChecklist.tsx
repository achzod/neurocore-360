import { useState } from "react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

const ITEMS = [
  "Sommeil: 7h30-8h minimum",
  "Nutrition: macros et calories stables",
  "Training: 3-5 seances / semaine",
  "Stress: respiration ou meditation quotidienne",
  "Alcool: limiter a 1-2 verres / semaine",
];

export default function LifestyleChecklist() {
  const { theme } = useBloodTheme();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
      <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Checklist lifestyle
      </div>
      <div className="mt-4 space-y-3">
        {ITEMS.map((item, idx) => (
          <label key={item} className="flex items-center gap-3 text-sm" style={{ color: theme.textSecondary }}>
            <input
              type="checkbox"
              checked={checked[idx] ?? false}
              onChange={(event) => setChecked((prev) => ({ ...prev, [idx]: event.target.checked }))}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}
