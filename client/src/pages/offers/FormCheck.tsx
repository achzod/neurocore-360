/**
 * APEXLABS - FormCheck V2
 * Analyse vidéo automatique : paiement Stripe, upload, rapport PDF annoté par email.
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Check, ChevronDown, Smartphone, Upload, FileText, Loader2, ShieldCheck } from "lucide-react";

const ACCENT = "#FCDD00";

type PackId = "1" | "3" | "6";

const PACKS: Array<{
  id: PackId;
  name: string;
  price: string;
  unit: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}> = [
  {
    id: "1",
    name: "1 analyse",
    price: "9,90 €",
    unit: "9,90 € l'analyse",
    tagline: "Pour vérifier un mouvement précis.",
    features: ["1 vidéo analysée", "Rapport PDF avec captures annotées", "3 corrections prioritaires"],
  },
  {
    id: "3",
    name: "3 analyses",
    price: "24,90 €",
    unit: "8,30 € l'analyse",
    tagline: "Pour tes 3 mouvements de base, ou pour suivre ta progression.",
    features: ["3 vidéos analysées", "Rapport PDF à chaque vidéo", "Compare avant et après corrections"],
    popular: true,
  },
  {
    id: "6",
    name: "6 analyses",
    price: "44,90 €",
    unit: "7,48 € l'analyse",
    tagline: "Idéal pour les athlètes sérieux qui filment leurs séries chaque semaine.",
    features: ["6 vidéos analysées", "Rapport PDF à chaque vidéo", "Suivi technique sur tout un cycle"],
  },
];

const DELIVERABLES = [
  "Une note technique sur 100 pour ta série",
  "Le nombre de répétitions et ton tempo estimé",
  "L'amplitude du mouvement et la symétrie quand l'angle de vue le permet",
  "Ta proximité de l'échec (répétitions en réserve)",
  "Chaque phase du mouvement passée au crible : mise en place, départ, milieu, verrouillage, descente",
  "Trajectoire de la charge, gainage, compensations, position de la tête et des pieds",
  "Jusqu'à 6 erreurs montrées sur tes images annotées, avec le pourquoi et comment corriger",
  "Des exercices correctifs et un plan de correction sur 4 semaines",
  "Tes 3 corrections prioritaires avec une consigne simple à te répéter",
  "Tes points forts et tes consignes pour la prochaine séance et la prochaine vidéo",
];

const FILMING_TIPS = [
  "Une seule série, 60 secondes maximum, en .mp4 ou .mov (200 Mo maximum).",
  "Téléphone posé et stable, à hauteur de hanche, à 3 ou 4 mètres.",
  "De profil pour le squat, le soulevé de terre, le hip thrust et le développé couché. De face en complément si tu veux juger la symétrie.",
  "Corps entier et charge visibles de la première à la dernière répétition, avec une bonne lumière.",
];

const FAQ = [
  {
    q: "Comment se passe l'analyse ?",
    a: "Après ton paiement, tu reçois un lien personnel par email. Tu choisis l'exercice, tu envoies la vidéo de ta série, et l'analyse démarre automatiquement : des images sont extraites sur toute la série, analysées selon la méthode Achzod, puis ton rapport PDF arrive par email, en général en quelques minutes et au plus tard sous 2 heures.",
  },
  {
    q: "Quand un crédit est-il utilisé ?",
    a: "Uniquement quand ton rapport est livré. Si ta vidéo est inexploitable (corps coupé, trop sombre, mauvais exercice), tu reçois un message clair pour la refilmer et ton crédit reste intact.",
  },
  {
    q: "Quels exercices sont pris en charge ?",
    a: "Les grands mouvements de musculation : squat, front squat, soulevé de terre et sa version roumaine, développé couché, développé militaire, rowing, traction, hip thrust, fentes, squat bulgare, presse, pompes et dips. Tu peux aussi choisir « Autre exercice ».",
  },
  {
    q: "Mes crédits expirent-ils ?",
    a: "Non. Tes crédits restent sur ton compte et tu les utilises quand tu veux, avec le même lien.",
  },
  {
    q: "Est-ce déductible d'un coaching ?",
    a: "Non. FormCheck est un service à part, au prix le plus bas possible, et n'est pas déductible des formules de coaching.",
  },
  {
    q: "Est-ce un avis médical ?",
    a: "Non. FormCheck analyse uniquement ta technique : placement, trajectoire, amplitude et tempo. Il ne pose aucun diagnostic et ne remplace pas un professionnel de santé. En cas de douleur, arrête et consulte.",
  },
  {
    q: "Que devient ma vidéo ?",
    a: "Ta vidéo est supprimée dès que les images nécessaires à l'analyse sont extraites. Seules ces images et ton rapport sont conservés pour que tu puisses retélécharger ton PDF.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-8 py-6 text-left">
        <h3 className="text-lg font-semibold text-white">{q}</h3>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 pt-1">
          <ChevronDown className="h-5 w-5" style={{ color: ACCENT }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-6 text-base leading-relaxed text-white/60">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FormCheck() {
  const [email, setEmail] = useState("");
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cancelled") === "true";

  const startCheckout = async (pack: PackId) => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Indique ton email : c'est là que tu recevras ton lien d'envoi et tes rapports.");
      document.getElementById("formcheck-email")?.focus();
      return;
    }
    setLoadingPack(pack);
    try {
      const res = await fetch("/api/formcheck/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || "Le paiement n'a pas pu démarrer.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || "Le paiement n'a pas pu démarrer. Réessaie dans un instant.");
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-36 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(252,221,0,0.10),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-block rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-widest" style={{ borderColor: ACCENT, color: ACCENT }}>
            Analyse vidéo automatique
          </span>
          <h1 className="mt-6 text-5xl font-black tracking-[-0.04em] sm:text-7xl">FormCheck</h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-white/70">
            Filme ta série, envoie la vidéo, reçois ton analyse technique en PDF avec tes erreurs annotées et tes 3 corrections prioritaires. En quelques minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#packs" data-testid="formcheck-hero-cta" className="inline-flex items-center gap-2 px-8 py-4 font-bold text-black transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              Voir les packs, dès 9,90 € <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/formcheck/upload" className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
              Déjà client ? Envoyer une vidéo
            </Link>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Comment ça marche</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "1. Choisis ton pack", text: "Paiement sécurisé par Stripe. Tes crédits sont ajoutés à ton email et ton lien d'envoi arrive aussitôt." },
              { icon: Smartphone, title: "2. Filme et envoie", text: "Une série, 60 secondes maximum, en .mp4 ou .mov. Tu choisis l'exercice et tu envoies la vidéo depuis ton téléphone." },
              { icon: FileText, title: "3. Reçois ton rapport", text: "Ton rapport PDF arrive par email : note sur 100, captures annotées, corrections et consignes pour la prochaine séance." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-sm border border-white/10 bg-white/[0.03] p-8">
                <Icon className="h-8 w-8" style={{ color: ACCENT }} />
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CE QUE TU REÇOIS */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Ce que contient ton rapport</h2>
            <p className="mt-6 text-lg text-white/60">
              Un PDF clair, au fond blanc, que tu peux garder sur ton téléphone à la salle. Chaque erreur est montrée sur l'image de ta vidéo où elle se voit le mieux.
            </p>
          </div>
          <ul className="space-y-4">
            {DELIVERABLES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-white/80">
                <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: ACCENT }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PACKS */}
      <section id="packs" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Formules et tarifs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-white/60">
            Paiement unique, sans abonnement. Un crédit = une vidéo analysée. Crédits sans date d'expiration.
          </p>

          {cancelled && (
            <p className="mx-auto mt-6 max-w-xl rounded-sm border border-white/15 bg-white/5 p-3 text-center text-sm text-white/70">
              Paiement annulé : aucun montant n'a été prélevé.
            </p>
          )}

          <div className="mx-auto mt-10 max-w-xl">
            <label htmlFor="formcheck-email" className="mb-2 block text-sm font-semibold text-white/80">
              Ton email (pour recevoir ton lien d'envoi et tes rapports)
            </label>
            <input
              id="formcheck-email"
              data-testid="formcheck-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@email.com"
              className="w-full rounded-sm border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#FCDD00] focus:outline-none"
            />
            {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                data-testid={`formcheck-pack-${pack.id}`}
                className={`relative flex flex-col rounded-sm p-8 ${pack.popular ? "border-2 bg-[#FCDD00]/[0.06]" : "border border-white/10 bg-white/[0.03]"}`}
                style={pack.popular ? { borderColor: ACCENT } : undefined}
              >
                {pack.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black" style={{ backgroundColor: ACCENT }}>
                    Le plus choisi
                  </span>
                )}
                <h3 className="text-2xl font-bold">{pack.name}</h3>
                <div className="mt-4 text-5xl font-black">{pack.price}</div>
                <div className="mt-1 text-sm text-white/50">{pack.unit}</div>
                <p className="mt-4 text-white/60">{pack.tagline}</p>
                <ul className="mt-6 flex-grow space-y-3">
                  {pack.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-testid={`formcheck-checkout-${pack.id}`}
                  onClick={() => startCheckout(pack.id)}
                  disabled={loadingPack !== null}
                  className={`mt-8 flex w-full items-center justify-center gap-2 py-4 font-bold transition-opacity disabled:opacity-60 ${pack.popular ? "text-black" : "border border-white/20 text-white hover:bg-white/10"}`}
                  style={pack.popular ? { backgroundColor: ACCENT } : undefined}
                >
                  {loadingPack === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Choisir ce pack
                </button>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-white/50">
            Un crédit n'est utilisé que lorsque ton rapport est livré. Vidéo inexploitable ? Tu la refilmes, ton crédit reste intact.
          </p>
        </div>
      </section>

      {/* BIEN FILMER */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <Upload className="h-8 w-8" style={{ color: ACCENT }} />
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Bien filmer ta série</h2>
            <p className="mt-6 text-lg text-white/60">Une vidéo propre, c'est une analyse précise. Trente secondes de mise en place suffisent.</p>
          </div>
          <ul className="space-y-4">
            {FILMING_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-white/80">
                <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: ACCENT }} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Questions fréquentes</h2>
          <div className="mt-10">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Ta prochaine série mérite mieux qu'un doute.</h2>
          <a href="#packs" data-testid="formcheck-final-cta" className="mt-10 inline-flex items-center gap-2 px-8 py-4 font-bold text-black transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
            Choisir mon pack <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-8 text-xs text-white/40">
            FormCheck analyse uniquement la technique d'exécution. Il ne pose aucun diagnostic médical et ne remplace pas un professionnel de santé.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
