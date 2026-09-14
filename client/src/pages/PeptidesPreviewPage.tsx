import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { trackClick, trackFormSubmit } from "@/lib/analytics";

type Goal = "recovery" | "gh-antiaging" | "fatloss" | "sleep" | "cognitive" | "libido" | "testo-boost" | "skin-hair" | "endurance";
type PreviewResult = {
  status: "eligible" | "review_required";
  moleculeCount: number;
  molecules: Array<{ name: string; role: string; reason: string; startingFormat: string; startingPackagePriceUsd: number }>;
  estimatedStarterCostUsd: number | null;
  priceCheckedAt: string;
  durationLabel: string;
  budgetFit: "within" | "above" | "unknown";
  headline: string;
  rationale: string;
  blockers: string[];
  nextStep: "peptides_engine" | "blood_analysis" | "manual_review";
};

type FormState = {
  firstName: string;
  email: string;
  age: string;
  weightKg: string;
  primaryGoal: Goal | "";
  secondaryGoals: Goal[];
  conditions: string[];
  bloodwork: "recent" | "old" | "never";
  injectionComfort: "comfortable" | "possible" | "anxious" | "refuse";
  experience: "none" | "read" | "tried" | "regular";
  budget: "under100" | "100-200" | "200-300" | "over300";
  country: string;
  medications: string;
  consent: boolean;
};

const goals: Array<{ value: Goal; label: string; detail: string }> = [
  { value: "fatloss", label: "Perte de graisse", detail: "Appétit, métabolisme, recomposition" },
  { value: "recovery", label: "Récupération", detail: "Tendons, articulations, blessure" },
  { value: "gh-antiaging", label: "Axe GH", detail: "Récupération, longévité, composition" },
  { value: "sleep", label: "Sommeil", detail: "Endormissement, réveils, profondeur" },
  { value: "cognitive", label: "Cognition", detail: "Focus, mémoire, stabilité sous stress" },
  { value: "endurance", label: "Endurance", detail: "Capacité de travail, mitochondries" },
  { value: "libido", label: "Libido", detail: "Réponse sexuelle et performance" },
  { value: "testo-boost", label: "Axe testostérone", detail: "Production endogène et fertilité" },
  { value: "skin-hair", label: "Peau et cheveux", detail: "Matrice, qualité cutanée, densité" },
];

const conditions = [
  ["none", "Aucune"], ["diabetes", "Diabète"], ["cancer", "Cancer actif ou antécédent"],
  ["pregnant", "Grossesse"], ["breastfeeding", "Allaitement"], ["autoimmune", "Maladie auto-immune"],
  ["cardiac", "Problème cardiaque"], ["hypertension", "Hypertension"], ["thyroid", "Trouble thyroïdien"],
  ["renal-hepatic", "Atteinte rénale ou hépatique"],
] as const;

const countries = [
  ["FR", "France"], ["BE", "Belgique"], ["CH", "Suisse"], ["LU", "Luxembourg"],
  ["AE", "Émirats arabes unis"], ["CA", "Canada"], ["US", "États-Unis"], ["GB", "Royaume-Uni"],
  ["DE", "Allemagne"], ["ES", "Espagne"], ["IT", "Italie"], ["NL", "Pays-Bas"],
  ["PT", "Portugal"], ["MA", "Maroc"], ["DZ", "Algérie"], ["TN", "Tunisie"],
] as const;

const initialForm: FormState = {
  firstName: "", email: "", age: "", weightKg: "", primaryGoal: "", secondaryGoals: [], conditions: ["none"],
  bloodwork: "never", injectionComfort: "possible", experience: "none", budget: "100-200", country: "FR", medications: "", consent: false,
};

function Choice({ active, title, detail, onClick }: { active: boolean; title: string; detail?: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-amber-400 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,.2)]" : "border-white/10 bg-white/[.035] hover:border-white/25"}`}>
    <span className="flex items-center gap-3"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-amber-400 bg-amber-400 text-black" : "border-white/30"}`}>{active && <Check className="h-3.5 w-3.5" />}</span><span><strong className="block text-sm text-white">{title}</strong>{detail && <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{detail}</span>}</span></span>
  </button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.16em] text-zinc-400">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3.5 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400";

export default function PeptidesPreviewPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedPrimary = goals.find((goal) => goal.value === form.primaryGoal);
  const canContinue = useMemo(() => {
    if (step === 0) return form.firstName.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email) && Number(form.age) >= 18 && Number(form.weightKg) >= 40;
    if (step === 1) return Boolean(form.primaryGoal);
    if (step === 2) return form.conditions.length > 0;
    return form.consent;
  }, [form, step]);

  const toggleSecondary = (value: Goal) => setForm((current) => {
    if (value === current.primaryGoal) return current;
    const exists = current.secondaryGoals.includes(value);
    return { ...current, secondaryGoals: exists ? current.secondaryGoals.filter((goal) => goal !== value) : [...current.secondaryGoals, value].slice(-2) };
  });

  const toggleCondition = (value: string) => setForm((current) => {
    if (value === "none") return { ...current, conditions: ["none"] };
    const withoutNone = current.conditions.filter((item) => item !== "none");
    const next = withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value];
    return { ...current, conditions: next.length > 0 ? next : ["none"] };
  });

  const submit = async () => {
    if (!canContinue || !form.primaryGoal) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/peptides-preview/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, age: Number(form.age), weightKg: Number(form.weightKg),
          attribution: { source: params.get("utm_source") || undefined, medium: params.get("utm_medium") || undefined, campaign: params.get("utm_campaign") || undefined, content: params.get("utm_content") || undefined },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Impossible de calculer ton aperçu maintenant.");
      setResult(payload.result); setCheckoutUrl(payload.checkoutUrl); trackFormSubmit("peptides_preview_completed"); trackClick(`peptides_preview_result_${payload.result.status}`); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erreur temporaire."); }
    finally { setLoading(false); }
  };

  if (result) return <main className="min-h-screen bg-[#08090b] px-4 py-10 text-white sm:px-6">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between"><a href="/offers/peptides-engine" className="text-sm font-black tracking-[.22em] text-white">APEX<span className="text-amber-400">LABS</span></a><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Prix et disponibilité vérifiés</span></div>
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[.075] to-white/[.025]">
        <div className="border-b border-white/10 p-6 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.22em] text-amber-400">Aperçu pré-protocole de {form.firstName}</p><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">{result.headline}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">{result.rationale}</p></div>{result.status === "eligible" ? <div className="shrink-0 rounded-2xl bg-amber-400 p-5 text-center text-black"><span className="block text-5xl font-black">{result.moleculeCount}</span><span className="text-xs font-bold uppercase tracking-wider">molécule{result.moleculeCount > 1 ? "s" : ""}</span></div> : <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5 text-emerald-300"><ShieldCheck className="h-7 w-7" /><span className="text-left text-xs font-bold uppercase tracking-wider">Sélection<br />personnalisée</span></div>}</div></div>
        {result.molecules.length > 0 && <div className="grid gap-4 p-6 sm:p-10">{result.molecules.map((molecule, index) => <article key={molecule.name} className="rounded-2xl border border-white/10 bg-black/25 p-5"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-mono text-amber-400">0{index + 1}</span><h2 className="mt-1 text-xl font-semibold">{molecule.name}</h2><p className="mt-1 text-sm font-medium text-zinc-300">{molecule.role}</p></div><span className="whitespace-nowrap rounded-full bg-white/[.06] px-3 py-1.5 text-xs text-zinc-300">${molecule.startingPackagePriceUsd.toFixed(2)}</span></div><p className="mt-4 text-sm leading-6 text-zinc-400">{molecule.reason}</p><p className="mt-3 text-xs text-zinc-600">Format d'entrée vérifié : {molecule.startingFormat}</p></article>)}</div>}
        <div className="border-t border-white/10 bg-black/25 p-6 sm:p-10"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 p-5"><span className="text-xs uppercase tracking-wider text-zinc-500">Budget molécules initial estimé</span><strong className="mt-2 block text-3xl text-white">{result.estimatedStarterCostUsd == null ? "À valider" : `$${result.estimatedStarterCostUsd.toFixed(2)}`}</strong><span className="mt-2 block text-xs leading-5 text-zinc-500">Hors livraison. Estimation fondée sur le premier format achetable de chaque molécule, pas sur les quantités finales du cycle.</span></div><div className="rounded-2xl border border-white/10 p-5"><span className="text-xs uppercase tracking-wider text-zinc-500">Durée envisagée</span><strong className="mt-2 block text-lg text-white">{result.durationLabel}</strong><span className="mt-2 block text-xs text-zinc-500">Les dosages, quantités et arbitrages restent à calculer dans ton rapport complet.</span></div></div>
          <a href={checkoutUrl} onClick={() => trackClick("peptides_preview_unlock", checkoutUrl)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-4 text-center text-sm font-bold text-black transition hover:bg-amber-300">{result.nextStep === "blood_analysis" ? "Vérifier mes marqueurs" : result.nextStep === "manual_review" ? "Voir les options Peptides Engine" : "Débloquer mon protocole complet"}<ArrowRight className="h-4 w-4" /></a>
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-xs text-emerald-300">Une copie de ce résultat est en cours d'envoi à {form.email}. Tu peux fermer cette page.</div>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-zinc-600"><LockKeyhole className="h-3.5 w-3.5" />Dosages, calendrier, reconstitution et quantités exactes restent privés jusqu'au rapport.</div>
        </div>
      </motion.section>
    </div>
  </main>;

  const panels = [
    <div className="grid gap-5 sm:grid-cols-2" key="identity"><Field label="Prénom"><input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" placeholder="Ton prénom" /></Field><Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder="ton@email.com" /></Field><Field label="Âge"><input className={inputClass} type="number" min="18" max="75" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="32" /></Field><Field label="Poids actuel"><div className="relative"><input className={inputClass} type="number" min="40" max="220" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="82" /><span className="absolute right-4 top-3.5 text-sm text-zinc-500">kg</span></div></Field></div>,
    <div key="goals"><p className="mb-3 text-sm text-zinc-400">Choisis la priorité qui doit piloter tout le reste.</p><div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => <Choice key={goal.value} active={form.primaryGoal === goal.value} title={goal.label} detail={goal.detail} onClick={() => setForm({ ...form, primaryGoal: goal.value, secondaryGoals: form.secondaryGoals.filter((item) => item !== goal.value) })} />)}</div>{form.primaryGoal && <div className="mt-7"><p className="mb-3 text-sm text-zinc-400">Objectifs secondaires, deux maximum.</p><div className="flex flex-wrap gap-2">{goals.filter((goal) => goal.value !== form.primaryGoal).map((goal) => <button key={goal.value} type="button" onClick={() => toggleSecondary(goal.value)} className={`rounded-full border px-3 py-2 text-xs ${form.secondaryGoals.includes(goal.value) ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400"}`}>{goal.label}</button>)}</div></div>}</div>,
    <div key="safety"><p className="mb-4 text-sm leading-6 text-zinc-400">Ce check sert uniquement à personnaliser la sélection et à écarter automatiquement ce qui ne correspond pas à ton profil.</p><div className="grid gap-3 sm:grid-cols-2">{conditions.map(([value, label]) => <Choice key={value} active={form.conditions.includes(value)} title={label} onClick={() => toggleCondition(value)} />)}</div><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Bilan sanguin"><select className={inputClass} value={form.bloodwork} onChange={(e) => setForm({ ...form, bloodwork: e.target.value as FormState["bloodwork"] })}><option value="recent">Moins de 3 mois</option><option value="old">Plus de 3 mois</option><option value="never">Jamais fait</option></select></Field><Field label="Médicaments actuels"><input className={inputClass} value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} placeholder="Aucun, ou liste courte" /></Field></div></div>,
    <div className="grid gap-5 sm:grid-cols-2" key="constraints"><Field label="Expérience peptides"><select className={inputClass} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value as FormState["experience"] })}><option value="none">Aucune</option><option value="read">Je me suis renseigné</option><option value="tried">Déjà utilisé</option><option value="regular">Utilisateur régulier</option></select></Field><Field label="Confort injections"><select className={inputClass} value={form.injectionComfort} onChange={(e) => setForm({ ...form, injectionComfort: e.target.value as FormState["injectionComfort"] })}><option value="comfortable">À l'aise</option><option value="possible">Possible si nécessaire</option><option value="anxious">Anxieux mais ouvert</option><option value="refuse">Je refuse les injections</option></select></Field><Field label="Budget molécules"><select className={inputClass} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value as FormState["budget"] })}><option value="under100">Moins de 100 USD</option><option value="100-200">100 à 200 USD</option><option value="200-300">200 à 300 USD</option><option value="over300">Plus de 300 USD</option></select></Field><Field label="Pays"><select className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{countries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"><input type="checkbox" className="mt-1 h-4 w-4 accent-amber-400" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /><span className="text-xs leading-5 text-zinc-400">J'accepte que mes réponses et mon email soient enregistrés pour générer cet aperçu et recevoir les informations liées à Peptides Engine. Je peux demander leur suppression à tout moment.</span></label></div>,
  ];

  return <main className="min-h-screen bg-[#08090b] px-4 py-8 text-white sm:px-6 sm:py-12"><div className="mx-auto max-w-3xl"><header className="mb-8 flex items-center justify-between"><a href="/offers/peptides-engine" className="text-sm font-black tracking-[.22em]">APEX<span className="text-amber-400">LABS</span></a><div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="h-4 w-4 text-emerald-400" />Catalogue live</div></header><div className="mb-8"><div className="flex items-center justify-between text-xs text-zinc-500"><span>Étape {step + 1} sur 4</span><span>{Math.round(((step + 1) / 4) * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div animate={{ width: `${((step + 1) / 4) * 100}%` }} className="h-full rounded-full bg-amber-400" /></div></div><section className="rounded-[28px] border border-white/10 bg-white/[.04] p-5 sm:p-9"><div className="mb-7"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400"><Sparkles className="h-5 w-5" /></div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">Pré Peptides Engine</p><h1 className="mt-2 text-2xl font-semibold sm:text-4xl">{["Ton profil de départ", "Quel résultat doit guider le stack ?", "Ta compatibilité personnelle", "Tes contraintes réelles"][step]}</h1>{selectedPrimary && step > 1 && <p className="mt-3 text-sm text-zinc-500">Priorité active : {selectedPrimary.label}</p>}</div><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>{panels[step]}</motion.div></AnimatePresence>{error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-8 flex gap-3">{step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-zinc-300"><ArrowLeft className="h-4 w-4" />Retour</button>}<button type="button" disabled={!canContinue || loading} onClick={() => step < 3 ? (step === 0 ? (trackClick("peptides_preview_started"), setStep(step + 1)) : setStep(step + 1)) : submit()} className="ml-auto flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Vérification des disponibilités</> : step < 3 ? <>Continuer<ArrowRight className="h-4 w-4" /></> : <>Calculer mon aperçu<ArrowRight className="h-4 w-4" /></>}</button></div></section><p className="mt-5 text-center text-xs leading-5 text-zinc-600">Aucun dosage ni calendrier n'est généré dans ce preview. Le résultat complet reste personnalisé dans Peptides Engine.</p></div></main>;
}
