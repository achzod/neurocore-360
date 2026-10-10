import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, ShieldCheck, Sparkles, Zap } from "lucide-react";

const DEADLINE = new Date("2026-10-11T23:59:00+02:00");
const FORMULES_URL = "https://www.achzodcoaching.com/formules-coaching";

const offers = [
  { duration: "4 semaines", bonus: "+2 semaines", detail: "6 semaines de suivi au total" },
  { duration: "8 semaines", bonus: "+4 semaines", detail: "12 semaines de suivi au total", discount: "99 € de réduction", featured: true },
  { duration: "12 semaines", bonus: "+6 semaines", detail: "18 semaines de suivi au total", discount: "99 € de réduction" },
];

const formulas = [
  { name: "Essential", href: "https://www.achzodcoaching.com/coaching-essential", description: "Le cadre essentiel pour avancer avec une stratégie claire et un suivi régulier." },
  { name: "Elite", href: "https://www.achzodcoaching.com/coaching-elite", description: "Un accompagnement plus poussé pour accélérer ta progression et ajuster chaque détail." },
  { name: "Private Lab", href: "https://www.achzodcoaching.com/coaching-achzod-private-lab", description: "Mon niveau d'accompagnement le plus complet pour une optimisation approfondie." },
];

function getRemaining(now: number) {
  const total = Math.max(0, DEADLINE.getTime() - now);
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1_000) % 60),
    expired: total === 0,
  };
}

export default function CoachingOffer() {
  const [now, setNow] = useState(() => Date.now());
  const remaining = useMemo(() => getRemaining(now), [now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const description = "Offre coaching exceptionnelle : 2, 4 ou 6 semaines supplémentaires offertes, avec 99 € de réduction sur les suivis 8 et 12 semaines.";
    const metaDescription = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const previous = {
      description: metaDescription?.getAttribute("content"),
      ogTitle: ogTitle?.getAttribute("content"),
      ogDescription: ogDescription?.getAttribute("content"),
    };
    metaDescription?.setAttribute("content", description);
    ogTitle?.setAttribute("content", "L'offre coaching unique de 2026 | AchZod Coaching");
    ogDescription?.setAttribute("content", description);
    return () => {
      if (previous.description) metaDescription?.setAttribute("content", previous.description);
      if (previous.ogTitle) ogTitle?.setAttribute("content", previous.ogTitle);
      if (previous.ogDescription) ogDescription?.setAttribute("content", previous.ogDescription);
    };
  }, []);

  const timeUnits = [
    [remaining.days, "jours"],
    [remaining.hours, "heures"],
    [remaining.minutes, "min"],
    [remaining.seconds, "sec"],
  ] as const;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-white selection:bg-amber-300 selection:text-black">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-amber-400/15 blur-[110px]" />
        <div className="absolute bottom-[-18rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-32 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <span className="text-lg font-black tracking-[0.16em] text-white" aria-label="APEXLABS">APEX<span className="text-amber-300">LABS</span></span>
          <div className="flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" /> Offre en cours
          </div>
        </header>

        <section className="mx-auto max-w-4xl pt-14 text-center sm:pt-20">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
            <Sparkles className="h-4 w-4 text-amber-300" /> Accessible à tous
          </div>
          <h1 className="text-balance text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            L'offre coaching que je n'ai
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">encore jamais proposée.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-300 sm:text-xl">
            Plus de temps pour obtenir des résultats solides, sans payer les semaines supplémentaires. Cette offre ne sera proposée <strong className="font-semibold text-white">qu'une seule fois cette année.</strong>
          </p>

          {!remaining.expired ? (
            <div className="mx-auto mt-9 max-w-xl rounded-2xl border border-amber-300/20 bg-gradient-to-b from-amber-300/[0.08] to-transparent p-4 shadow-2xl shadow-amber-950/20">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-amber-100"><Clock3 className="h-4 w-4" /> Fin de l'offre demain, dimanche 11 octobre à 23 h 59, heure de France</div>
              <div className="grid grid-cols-4 gap-2">
                {timeUnits.map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/40 px-2 py-3">
                    <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">{String(value).padStart(2, "0")}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="mx-auto mt-9 max-w-xl rounded-2xl border border-red-400/30 bg-red-500/10 p-5 font-semibold text-red-100">Cette offre est terminée.</div>}
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-3" aria-label="Options de suivi">
          {offers.map((offer) => (
            <article key={offer.duration} className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 ${offer.featured ? "border-amber-300/60 bg-gradient-to-b from-amber-300/[0.14] via-white/[0.05] to-white/[0.02] shadow-[0_24px_80px_-30px_rgba(251,191,36,.65)]" : "border-white/10 bg-white/[0.035]"}`}>
              {offer.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black">Le plus choisi</div>}
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Suivi {offer.duration}</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white">{offer.bonus}</h2>
              <p className="mt-1 font-medium text-zinc-300">supplémentaires offertes</p>
              <div className="my-6 h-px bg-white/10" />
              <div className="space-y-3 text-sm text-zinc-300">
                <p className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {offer.detail}</p>
                {offer.discount && <p className="flex items-start gap-3 font-bold text-amber-200"><Zap className="mt-0.5 h-4 w-4 shrink-0" /> {offer.discount}</p>}
                <p className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Essential, Elite ou Private Lab</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-16 max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-amber-300"><ShieldCheck className="h-5 w-5" /> Choisis ton niveau d'accompagnement</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Je t'accompagne avec trois formules.</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-zinc-300">Choisis la formule qui correspond à ton objectif. Tu retrouveras tous les détails directement sur le site coaching.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {formulas.map((formula) => (
              <a
                key={formula.name}
                href={formula.href}
                target="_blank"
                rel="noreferrer"
                className={`group flex min-h-52 flex-col rounded-2xl border p-6 transition ${remaining.expired ? "pointer-events-none border-white/10 bg-black/20 opacity-50" : "border-white/10 bg-black/30 hover:-translate-y-1 hover:border-amber-300/50 hover:bg-amber-300/[0.06]"}`}
              >
                <h3 className="text-2xl font-black text-white">{formula.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{formula.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-black text-amber-300">Voir la formule <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </a>
            ))}
          </div>
        </section>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-zinc-600">Offre valable pour toute nouvelle souscription à un suivi coaching Essential, Elite ou Private Lab avant la date limite affichée. Les semaines offertes prolongent la durée du suivi choisi. La réduction de 99 € s'applique aux formules 8 et 12 semaines.</p>
      </div>

      {!remaining.expired && <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/85 p-3 backdrop-blur-xl md:hidden"><a href={FORMULES_URL} target="_blank" rel="noreferrer" className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-300 px-5 font-black text-black shadow-lg shadow-amber-400/20">Voir les formules coaching <ArrowRight className="h-5 w-5" /></a></div>}
    </main>
  );
}
