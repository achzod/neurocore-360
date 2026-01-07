import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, X, Sparkles, Zap, Crown, Watch, Camera, FileText, Brain, ArrowRight } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  badge?: string;
  features: { text: string; included: boolean }[];
  cta: string;
  href: string;
  popular?: boolean;
  icon: React.ReactNode;
  gradient: string;
}

const tiers: PricingTier[] = [
  {
    name: "Gratuit",
    price: "0",
    period: "",
    description: "Découvre ton profil de base avec 50 questions - Dashboard interactif",
    features: [
      { text: "50 questions essentielles", included: true },
      { text: "Dashboard interactif", included: true },
      { text: "Scores des 5 domaines", included: true },
      { text: "Radar de performance", included: true },
      { text: "Recommandations générales", included: true },
      { text: "Rapport personnalisé", included: false },
      { text: "Stack suppléments", included: false },
      { text: "Sync wearables", included: false },
      { text: "Analyse photo", included: false },
    ],
    cta: "Commencer gratuitement",
    href: "/audit-complet/questionnaire?plan=free",
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-gray-500 to-gray-600",
  },
  {
    name: "Anabolic Bioscan",
    price: "49",
    period: "one-time",
    description: "L'audit complet: rapport ~25 pages (17 sections) + protocoles 90j",
    badge: "POPULAIRE",
    popular: true,
    features: [
      { text: "150 questions approfondies", included: true },
      { text: "Dashboard interactif", included: true },
      { text: "Rapport 17 sections", included: true },
      { text: "Questions genre-spécifiques", included: true },
      { text: "Axes cliniques (thyroïde, SII...)", included: true },
      { text: "Stack suppléments personnalisé", included: true },
      { text: "Plan 90 jours détaillé", included: true },
      { text: "Sync wearables", included: false },
      { text: "Analyse photo", included: false },
    ],
    cta: "Obtenir Anabolic",
    href: "/audit-complet/questionnaire?plan=essential",
    icon: <Sparkles className="w-5 h-5" />,
    gradient: "from-primary to-emerald-400",
  },
  {
    name: "Pro Panel 360",
    price: "99",
    period: "one-time",
    description: "Rapport ~45 pages (25+ sections) + wearables + analyse photo",
    badge: "COMPLET",
    features: [
      { text: "210 questions ultra-détaillées", included: true },
      { text: "Dashboard avancé temps réel", included: true },
      { text: "Rapport premium 25+ sections", included: true },
      { text: "Sync Apple Watch, Oura, Garmin...", included: true },
      { text: "Analyse photo (posture, composition)", included: true },
      { text: "Nutrition timing avancé", included: true },
      { text: "HRV & performance cardio", included: true },
      { text: "Psychologie & blocages mentaux", included: true },
      { text: "Support prioritaire", included: true },
    ],
    cta: "Passer Pro Panel",
    href: "/audit-complet/questionnaire?plan=elite",
    icon: <Crown className="w-5 h-5" />,
    gradient: "from-violet-500 to-purple-500",
  },
];

export function Pricing() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,252,109,0.05),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
              Choisis ton niveau
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            3 formules, un objectif:{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              t'optimiser
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Pas d'abonnement. Paiement unique. Accès à vie à ton rapport.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-sm ${
                tier.popular
                  ? "bg-gradient-to-b from-primary/20 to-transparent border-2 border-primary/50 scale-105 z-10"
                  : "bg-white/5 border border-white/10"
              } p-6 lg:p-8 flex flex-col`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`px-4 py-1 rounded-full text-xs font-bold tracking-wider ${
                      tier.popular
                        ? "bg-primary text-black"
                        : "bg-violet-500 text-white"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Header with Icon + Name + Price inline */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded bg-gradient-to-br ${tier.gradient}`}
                    >
                      {tier.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                  </div>
                  {/* Price - right aligned */}
                  <div className="text-right">
                    <div className="flex items-baseline gap-0.5 justify-end">
                      <span className="text-4xl font-black text-white">{tier.price}</span>
                      <span className="text-xl font-bold text-white">€</span>
                    </div>
                    {tier.period === "one-time" && (
                      <span className="text-white/40 text-xs">paiement unique</span>
                    )}
                  </div>
                </div>
                <p className="text-white/50 text-sm">{tier.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-white/80" : "text-white/30"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={tier.href}>
                <button
                  className={`w-full py-4 rounded font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    tier.popular
                      ? "bg-primary text-black hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                      : tier.name === "Pro Panel 360"
                      ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Coaching discount banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-sm bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <p className="text-white/80 text-sm">
              <span className="font-semibold text-primary">Offre coaching :</span>{" "}
              Le montant de ton audit est <span className="font-bold text-white">déduit de ton coaching</span>
              <span className="text-white/50 text-xs ml-2">(hors offre Starter)</span>
            </p>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Paiement sécurisé Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Satisfait ou remboursé 14j</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Rapport sous 48h</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Compact version for other pages
export function PricingCompact() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {tiers.map((tier) => (
        <Link key={tier.name} href={tier.href}>
          <div
            className={`p-4 rounded border transition-all cursor-pointer hover:scale-[1.02] ${
              tier.popular
                ? "border-primary/50 bg-primary/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{tier.name}</span>
              <span className="font-bold text-white">{tier.price}€</span>
            </div>
            <p className="text-xs text-white/50">{tier.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
