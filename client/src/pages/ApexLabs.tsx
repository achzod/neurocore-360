import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Scan,
  Activity,
  Zap,
  Droplet,
  Brain,
  Check,
  Mail,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ============================================================================
// HERO SECTION
// ============================================================================
function HeroSection() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Animated metallic gradients */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-white/10 via-gray-400/5 to-transparent rounded-full blur-[200px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-gray-500/10 via-white/5 to-transparent rounded-full blur-[150px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Content */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-[#FCDD00]"
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white/80 font-medium">Lancement imminent</span>
            </motion.div>

            <motion.h1
              className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <span className="text-white">Apex</span>
              <span className="italic bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">Labs</span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-gray-300 mb-3 font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              L'analyse corporelle la plus complete.
            </motion.p>

            <motion.p
              className="text-base text-gray-500 mb-10 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Decouvre tes blocages caches. Recois des protocoles personnalises bases sur 11 certifications internationales et des annees d'experience terrain.
            </motion.p>

            {/* Email form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 rounded-full focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all backdrop-blur-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-8 bg-gradient-to-r from-gray-200 via-white to-gray-200 hover:from-white hover:via-gray-100 hover:to-white text-black font-bold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <motion.div
                        className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        Rejoindre la liste VIP
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 text-white bg-white/10 border border-white/20 rounded-full px-6 py-4 max-w-md backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <Check className="h-5 w-5 text-black" />
                  </div>
                  <span className="font-semibold text-lg">Tu es sur la liste VIP</span>
                </motion.div>
              )}
              <p className="mt-4 text-sm text-gray-600">Offre de lancement exclusive reservee aux inscrits.</p>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex gap-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[
                { value: "11", label: "Certifications" },
                { value: "5", label: "Scans" },
                { value: "50+", label: "Pages" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  <div className="text-3xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
            className="relative hidden lg:flex justify-center items-center"
          >
            {/* Glow behind phone */}
            <motion.div
              className="absolute w-[500px] h-[500px] bg-gradient-to-br from-white/20 via-gray-500/10 to-transparent rounded-full blur-[120px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 6, repeat: Infinity }}
            />

            {/* Phone */}
            <motion.div
              className="relative"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative w-[300px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-[0_0_100px_rgba(255,255,255,0.1)] border border-white/10">
                {/* Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20" />

                {/* Screen */}
                <div className="bg-black rounded-[2.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-8 pt-4 pb-2">
                    <span className="text-white text-xs font-medium">9:41</span>
                    <div className="flex gap-1 items-center">
                      <div className="w-4 h-2 bg-white rounded-sm" />
                    </div>
                  </div>

                  {/* App content */}
                  <div className="px-5 pb-8 pt-4">
                    <div className="text-center mb-6">
                      <motion.div
                        className="inline-flex items-center gap-1 text-white/60 text-xs font-medium mb-3"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        APEX LABS
                      </motion.div>
                      <motion.div
                        className="text-6xl font-bold bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent mb-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.2, type: "spring" }}
                      >
                        87
                      </motion.div>
                      <p className="text-white/60 text-sm font-medium">Score Global</p>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-3">
                      {[
                        { label: "ENERGIE", score: 92 },
                        { label: "SOMMEIL", score: 78 },
                        { label: "STRESS", score: 45 },
                      ].map((metric, i) => (
                        <motion.div
                          key={metric.label}
                          className="bg-white/5 rounded-2xl p-4 border border-white/5"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.4 + i * 0.15 }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-500 tracking-wider">{metric.label}</span>
                            <span className="text-2xl font-bold text-white">{metric.score}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-gray-400 to-white"
                              initial={{ width: 0 }}
                              animate={{ width: `${metric.score}%` }}
                              transition={{ delay: 1.6 + i * 0.15, duration: 0.8 }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="absolute -right-8 top-20 bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-sm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Protocole</p>
                    <p className="text-sm font-semibold text-white">Optimise</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -left-6 bottom-32 bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Analyse</p>
                    <p className="text-sm font-semibold text-white">16 sections</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* by Achzod */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        by <span className="text-gray-400 font-medium">Achzod</span>
      </motion.div>
    </section>
  );
}

// ============================================================================
// PRESS/MEDIA LOGOS - Scrolling
// ============================================================================
function PressSection() {
  const pressLogos = [
    "BENZINGA",
    "StreetInsider",
    "MarketWatch",
    "REUTERS",
    "Yahoo Finance",
    "Digital Journal",
    "AP News",
  ];

  return (
    <section className="py-8 bg-black border-y border-white/5 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center">
          Vu dans les medias
        </p>
      </div>

      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

        {/* Scrolling logos */}
        <motion.div
          className="flex gap-16 items-center"
          animate={{ x: [0, -1000] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...pressLogos, ...pressLogos, ...pressLogos].map((logo, i) => (
            <span
              key={i}
              className="text-gray-500 text-lg font-semibold whitespace-nowrap tracking-wide"
            >
              {logo}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFERS SECTION - Enhanced descriptions
// ============================================================================
function OffersPreview() {
  const offers = [
    {
      name: "Discovery Scan",
      price: "Gratuit",
      description: "Ton diagnostic complet : detection de tes blocages, patterns problematiques, desequilibres reveles. Score global sur 100 avec rapport 5-7 pages.",
      icon: Scan,
      features: ["Score global /100", "Blocages identifies", "Rapport 5-7 pages"]
    },
    {
      name: "Anabolic Bioscan",
      price: "59€",
      description: "16 sections d'analyse approfondie + protocoles matin anti-cortisol, soir sommeil, digestion 14 jours et stack supplements optimise.",
      icon: Activity,
      features: ["16 sections", "4 protocoles", "Plan 30-60-90 jours"]
    },
    {
      name: "Ultimate Scan",
      price: "79€",
      description: "L'analyse ultime : tout l'Anabolic + analyse visuelle posturale, biomecanique complete. 18 sections, rapport 40-50 pages.",
      icon: Zap,
      featured: true,
      features: ["18 sections", "Analyse photo", "Rapport 40-50 pages"]
    },
    {
      name: "Blood Analysis",
      price: "99€",
      description: "Upload ton bilan sanguin PDF. Radars de risques visuels, interpretation experte avec ranges optimaux, protocoles cibles.",
      icon: Droplet,
      features: ["Ranges optimaux", "Radars visuels", "Protocoles cibles"]
    },
    {
      name: "Burnout Engine",
      price: "39€",
      description: "Score de risque burnout, analyse stress et fatigue, protocole recuperation 4 semaines avec alertes personnalisees.",
      icon: Brain,
      features: ["Score burnout", "Protocole 4 sem.", "Alertes perso"]
    },
  ];

  return (
    <section className="py-32 bg-gradient-to-b from-black via-gray-950 to-black relative overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[200px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <motion.p
            className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            5 Scans au lancement
          </motion.p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Choisis ton <span className="italic bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">scan</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Du simple diagnostic a l'optimisation complete de ta biologie.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            const isFeatured = offer.featured;
            return (
              <motion.div
                key={offer.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`group relative rounded-3xl border p-8 transition-all duration-500 ${
                  isFeatured
                    ? "border-white/20 bg-gradient-to-b from-white/10 to-transparent"
                    : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                }`}
              >
                {isFeatured && (
                  <motion.div
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="bg-[#FCDD00] text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_20px_rgba(252,221,0,0.4)]">
                      Le + populaire
                    </span>
                  </motion.div>
                )}

                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
                  isFeatured ? "bg-white/20 border border-white/20" : "bg-white/5 border border-white/10"
                } transition-all duration-300 group-hover:scale-110`}>
                  <Icon className={`h-7 w-7 ${isFeatured ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{offer.name}</h3>
                <div className={`text-2xl font-bold mb-3 ${isFeatured ? "text-[#FCDD00]" : "text-gray-300"}`}>
                  {offer.price}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{offer.description}</p>

                {/* Features list */}
                <div className="flex flex-wrap gap-2">
                  {offer.features.map((feature) => (
                    <span key={feature} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WEARABLES SECTION
// ============================================================================
function WearablesSection() {
  const wearables = [
    { name: "Apple Health", logo: "https://logo.clearbit.com/apple.com" },
    { name: "Garmin", logo: "https://logo.clearbit.com/garmin.com" },
    { name: "Fitbit", logo: "https://logo.clearbit.com/fitbit.com" },
    { name: "Oura", logo: "https://logo.clearbit.com/ouraring.com" },
    { name: "Google Fit", logo: "https://logo.clearbit.com/google.com" },
    { name: "Samsung Health", logo: "https://logo.clearbit.com/samsung.com" },
    { name: "Withings", logo: "https://logo.clearbit.com/withings.com" },
    { name: "WHOOP", logo: "https://logo.clearbit.com/whoop.com" },
    { name: "Ultrahuman", logo: "https://logo.clearbit.com/ultrahuman.com" },
  ];

  return (
    <section className="py-20 bg-black">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-4">
            Synchronise tes donnees
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Compatible avec tes <span className="italic bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">wearables</span>
          </h2>
          <p className="text-gray-500 mb-12 max-w-xl mx-auto">
            Connecte ta montre ou ton ring pour une analyse encore plus precise de tes biomarqueurs.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {wearables.map((device, i) => (
            <motion.div
              key={device.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-3 transition-all group-hover:border-white/20 group-hover:bg-white/10">
                <img
                  src={device.logo}
                  alt={device.name}
                  className="w-full h-full object-contain filter grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 transition-all"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">{device.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// REVIEWS SECTION - 127 beta testers
// ============================================================================
function ReviewsSection() {
  const [currentPage, setCurrentPage] = useState(0);

  const reviews = [
    { name: "Thomas M.", date: "15 decembre 2025", content: "J'avais teste la version gratuite qui etait deja pas mal. J'ai pris le Premium par curiosite et franchement ca m'a ouvert les yeux sur mes desequilibres hormonaux. Le protocole matin a change ma vie.", rating: 5 },
    { name: "Emma V.", date: "10 decembre 2025", content: "Ce qui m'a plu c'est les dosages precis des supplements. Pas juste 'prends du magnesium' mais vraiment quand, combien, quelle forme. Tres pro.", rating: 5 },
    { name: "Romain D.", date: "29 novembre 2025", content: "Pour le prix c'est honnete. J'ai eu l'equivalent d'un mois de coaching personnalise. Les protocoles sont clairs et actionables.", rating: 5 },
    { name: "Sophie L.", date: "25 novembre 2025", content: "L'analyse biomecanique a identifie mes compensations. Mon coach physio a confirme tout ce qui etait dans le rapport. Impressionnant.", rating: 5 },
    { name: "Marc B.", date: "20 novembre 2025", content: "Le Burnout Engine m'a litteralement sauve. J'etais au bord du gouffre sans le savoir. Score de 23/100, j'ai tout arrete et suivi le protocole.", rating: 5 },
    { name: "Julie R.", date: "18 novembre 2025", content: "Tres satisfaite de l'Ultimate Scan. L'analyse photo est bluffante, il a detecte ma scoliose legere que meme mon medecin n'avait pas vue.", rating: 5 },
    { name: "Antoine P.", date: "15 novembre 2025", content: "Le rapport de 45 pages est dense mais bien structure. J'y reviens regulierement. Ca vaut largement le prix.", rating: 5 },
    { name: "Camille F.", date: "12 novembre 2025", content: "Enfin quelqu'un qui explique le POURQUOI et pas juste le quoi faire. J'ai compris mes problemes de sommeil grace aux explications sur le cortisol.", rating: 5 },
    { name: "Lucas T.", date: "8 novembre 2025", content: "J'ai fait le Blood Analysis avec mon dernier bilan. Les ranges optimaux vs les ranges 'normaux' du labo, c'est le jour et la nuit.", rating: 5 },
    { name: "Marie K.", date: "5 novembre 2025", content: "Le plan 30-60-90 jours est genial. Ca structure vraiment la progression. Je suis a J+45 et je vois deja des resultats.", rating: 5 },
    { name: "Nicolas H.", date: "1 novembre 2025", content: "Sceptique au debut, convaincu a la fin. L'analyse de mon entrainement a pointe exactement ce que je faisais mal depuis 2 ans.", rating: 5 },
    { name: "Laura M.", date: "28 octobre 2025", content: "Le Discovery Scan gratuit m'a donne envie d'aller plus loin. Bon move marketing et le contenu est vraiment utile.", rating: 4 },
  ];

  const reviewsPerPage = 3;
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const displayedReviews = reviews.slice(currentPage * reviewsPerPage, (currentPage + 1) * reviewsPerPage);

  return (
    <section className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-6 w-6 fill-[#FCDD00] text-[#FCDD00]" />
            ))}
            <span className="text-2xl font-bold text-white ml-2">4.9/5</span>
          </div>
          <p className="text-gray-500">127 avis de beta-testeurs verifies</p>
        </motion.div>

        <div className="flex justify-between items-center mb-8">
          <div />
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {displayedReviews.map((review, index) => (
            <motion.div
              key={review.name + review.date}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FCDD00]/20 flex items-center justify-center text-[#FCDD00] font-bold">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold">{review.name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-[#FCDD00] text-[#FCDD00]" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">{review.content}</p>
              <p className="text-xs text-gray-600">{review.date}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ACHZOD SECTION
// ============================================================================
function AchzodSection() {
  const certifications = [
    { name: "NASM", certs: ["CPT", "CNC", "PES"] },
    { name: "ISSA", certs: ["CPT", "SNS", "SFC", "SBC"] },
    { name: "Precision Nutrition", certs: ["PN1"] },
    { name: "Pre-Script", certs: ["Level 1"] },
  ];

  return (
    <section className="py-32 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-6">Cree par</p>

          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">Achzod</h2>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Coach certifie avec <span className="text-white font-semibold">11 certifications internationales</span>.
            Des annees a accompagner des clients en coaching individuel, maintenant accessible a tous.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certifications.map((org, index) => (
              <motion.div
                key={org.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
              >
                <p className="text-white font-semibold mb-3">{org.name}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {org.certs.map((cert) => (
                    <span key={cert} className="text-xs text-gray-300 border border-white/20 bg-white/5 px-2 py-1 rounded-full">
                      {cert}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  return (
    <footer className="py-12 bg-gray-950 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-2xl font-bold mb-2">
          <span className="text-white">Apex</span>
          <span className="italic bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">Labs</span>
        </p>
        <p className="text-gray-600 text-sm">by Achzod</p>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
export default function ApexLabs() {
  return (
    <div className="min-h-screen bg-black">
      <HeroSection />
      <PressSection />
      <OffersPreview />
      <WearablesSection />
      <ReviewsSection />
      <AchzodSection />
      <Footer />
    </div>
  );
}
