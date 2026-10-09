import { AlertTriangle } from "lucide-react";

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Avertissement médical"
      className={compact
        ? "border-t border-white/10 bg-black px-4 py-5"
        : "rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4"
      }
    >
      <div className={`mx-auto flex items-start gap-3 ${compact ? "max-w-7xl" : "max-w-3xl"}`}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="text-xs leading-5 text-white/55">
          <strong className="font-semibold text-white/80">Information médicale :</strong>{" "}
          contenu éducatif et préventif. APEXLABS ne remplace ni un diagnostic, ni une prescription, ni l’avis d’un professionnel de santé. Consulte un médecin pour toute pathologie, contre-indication ou symptôme inquiétant.
        </p>
      </div>
    </aside>
  );
}
