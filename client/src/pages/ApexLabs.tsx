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
  ChevronRight,
} from "lucide-react";

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
      {/* Multiple animated gradients */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[200px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Content */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-emerald-400 font-medium">Lancement imminent</span>
            </motion.div>

            <motion.h1
              className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <span className="text-white">Apex</span>
              <span className="italic text-emerald-400">Labs</span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-gray-300 mb-3 font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              L'analyse corporelle la plus complète.
            </motion.p>

            <motion.p
              className="text-base text-gray-500 mb-10 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Découvre tes blocages cachés. Reçois des protocoles personnalisés basés sur 11 certifications internationales et des années d'expérience terrain.
            </motion.p>

            {/* Email form - UNIQUE */}
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
                      className="w-full h-14 pl-12 pr-4 bg-white/5 border border-gray-700 text-white placeholder:text-gray-500 rounded-full focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all backdrop-blur-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
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
                  className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-4 max-w-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-5 w-5 text-black" />
                  </div>
                  <span className="font-semibold text-lg">Tu es sur la liste VIP !</span>
                </motion.div>
              )}
              <p className="mt-4 text-sm text-gray-600">🎁 Offre de lancement exclusive réservée aux inscrits.</p>
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
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
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
              className="absolute w-[500px] h-[500px] bg-emerald-500/30 rounded-full blur-[120px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 6, repeat: Infinity }}
            />

            {/* Phone */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02, rotateY: 5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-[300px] bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-[3rem] p-3 shadow-[0_0_100px_rgba(16,185,129,0.2)] border border-gray-700/50">
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
                        className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium mb-3"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        APEX LABS
                      </motion.div>
                      <motion.div
                        className="text-6xl font-bold text-white mb-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.2, type: "spring" }}
                      >
                        87
                      </motion.div>
                      <p className="text-emerald-400 text-sm font-medium">Score Global</p>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-3">
                      {[
                        { label: "ÉNERGIE", score: 92, color: "emerald" },
                        { label: "SOMMEIL", score: 78, color: "cyan" },
                        { label: "STRESS", score: 45, color: "amber" },
                      ].map((metric, i) => (
                        <motion.div
                          key={metric.label}
                          className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800/50"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.4 + i * 0.15 }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-500 tracking-wider">{metric.label}</span>
                            <span className="text-2xl font-bold text-white">{metric.score}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${metric.color === 'emerald' ? 'bg-emerald-500' : metric.color === 'cyan' ? 'bg-cyan-500' : 'bg-amber-500'}`}
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
                className="absolute -right-8 top-20 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 shadow-xl"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Protocole</p>
                    <p className="text-sm font-semibold text-white">Optimisé</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -left-6 bottom-32 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 shadow-xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Analyse</p>
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

function OffersPreview() {
  const offers = [
    { name: "Discovery Scan", description: "Diagnostic complet de tes blocages. Identifie ce qui te freine.", icon: Scan, color: "gray" },
    { name: "Anabolic Bioscan", description: "16 sections d'analyse + protocoles personnalisés complets.", icon: Activity, color: "emerald" },
    { name: "Ultimate Scan", description: "L'analyse la plus poussée. Visuelle + biomécanique + métabolique.", icon: Zap, color: "cyan", featured: true },
    { name: "Blood Analysis", description: "Ton bilan sanguin décodé avec des ranges optimaux de performance.", icon: Droplet, color: "red" },
    { name: "Burnout Engine", description: "Détecte les signaux faibles avant qu'il ne soit trop tard.", icon: Brain, color: "purple" },
  ];

  return (
    <section className="py-32 bg-gradient-to-b from-black via-gray-950 to-black relative overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[200px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
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
            className="text-xs uppercase tracking-[0.3em] text-emerald-500 mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            5 Scans au lancement
          </motion.p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Choisis ton <span className="italic text-emerald-400">scan</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Du simple diagnostic à l'optimisation complète de ta biologie.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            const isFeautred = offer.featured;
            return (
              <motion.div
                key={offer.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`group relative rounded-3xl border p-8 transition-all duration-500 cursor-pointer ${
                  isFeautred
                    ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent lg:col-span-1 lg:row-span-1"
                    : "border-gray-800 bg-gray-900/30 hover:border-gray-600 hover:bg-gray-900/60"
                }`}
              >
                {isFeautred && (
                  <motion.div
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="bg-emerald-500 text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                      Le + populaire
                    </span>
                  </motion.div>
                )}

                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
                  isFeautred ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-gray-800/50 border border-gray-700/50"
                } transition-all duration-300 group-hover:scale-110`}>
                  <Icon className={`h-7 w-7 ${isFeautred ? "text-emerald-400" : "text-gray-400 group-hover:text-white"}`} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{offer.name}</h3>
                <p className="text-gray-400 leading-relaxed mb-6">{offer.description}</p>

                <div className="flex items-center text-sm text-gray-500 group-hover:text-emerald-400 transition-colors">
                  <span>En savoir plus</span>
                  <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-6">Créé par</p>

          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">Achzod</h2>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Coach certifié avec <span className="text-white font-semibold">11 certifications internationales</span>.
            Des années à accompagner des clients en coaching individuel, maintenant accessible à tous.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {certifications.map((org, index) => (
              <motion.div
                key={org.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all"
              >
                <p className="text-white font-semibold mb-3">{org.name}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {org.certs.map((cert) => (
                    <span key={cert} className="text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-full">
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

function Footer() {
  return (
    <footer className="py-12 bg-gray-950 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-2xl font-bold mb-2">
          <span className="text-white">Apex</span>
          <span className="italic text-emerald-400">Labs</span>
        </p>
        <p className="text-gray-600 text-sm">by Achzod — Bientôt disponible</p>
      </div>
    </footer>
  );
}

export default function ApexLabs() {
  return (
    <div className="min-h-screen bg-black">
      <HeroSection />
      <OffersPreview />
      <AchzodSection />
      <Footer />
    </div>
  );
}
