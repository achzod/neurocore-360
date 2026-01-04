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
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-emerald-400 font-medium">Bientôt disponible</span>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className="text-white">Apex</span>
              <span className="italic text-emerald-400">Labs</span>
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-gray-400 mb-4 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              L'analyse corporelle la plus complète.
            </motion.p>

            <motion.p
              className="text-base text-gray-500 mb-10 max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              180+ questions. 16 sections d'analyse. Protocoles personnalisés basés sur 11 certifications internationales.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-gray-900/50 border border-gray-800 text-white placeholder:text-gray-600 rounded-full focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
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
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 text-emerald-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Tu es sur la liste VIP</span>
                </motion.div>
              )}
              <p className="mt-4 text-sm text-gray-600">Offre exclusive réservée aux premiers inscrits.</p>
            </motion.div>

            <motion.div className="mt-12 flex gap-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <div>
                <div className="text-2xl font-bold text-white">11</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Certifications</div>
              </div>
              <div className="w-px bg-gray-800" />
              <div>
                <div className="text-2xl font-bold text-white">5</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Scans</div>
              </div>
              <div className="w-px bg-gray-800" />
              <div>
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider">Pages</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:flex justify-center"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px]"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
            </div>
            <div className="relative">
              <motion.div
                className="w-80 h-80 rounded-full border border-gray-800 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <motion.div
                className="absolute inset-8 rounded-full border border-gray-800/50"
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              >
                <motion.div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
              </motion.div>
              <motion.div
                className="absolute inset-16 rounded-full border border-emerald-500/30 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div className="text-4xl font-bold" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: "spring" }}>
                  <span className="text-white">A</span>
                  <span className="text-emerald-400">L</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-gray-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        by <span className="text-gray-400">Achzod</span>
      </motion.div>
    </section>
  );
}

function OffersPreview() {
  const offers = [
    { name: "Discovery Scan", description: "Diagnostic complet de tes blocages", icon: Scan },
    { name: "Anabolic Bioscan", description: "16 sections + protocoles personnalisés", icon: Activity },
    { name: "Ultimate Scan", description: "Analyse visuelle + biomécanique", icon: Zap, featured: true },
    { name: "Blood Analysis", description: "Ton bilan sanguin décodé", icon: Droplet },
    { name: "Burnout Engine", description: "Détection + protocole récupération", icon: Brain },
  ];

  return (
    <section className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 mb-4">5 Scans disponibles au lancement</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Du diagnostic à l'optimisation complète</h2>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            return (
              <motion.div
                key={offer.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`group relative rounded-2xl border p-6 transition-all duration-300 ${offer.featured ? "border-emerald-500/50 bg-emerald-500/5" : "border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/50"}`}
              >
                {offer.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-black text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Populaire</span>
                  </div>
                )}
                <div className="mb-4">
                  <Icon className={`h-6 w-6 ${offer.featured ? "text-emerald-400" : "text-gray-500"}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{offer.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{offer.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AchzodSection() {
  const certifications = ["NASM-CPT", "NASM-CNC", "NASM-PES", "ISSA-CPT", "ISSA-SNS", "ISSA-SFC", "Precision Nutrition PN1", "Pre-Script L1"];

  return (
    <section className="py-32 bg-gradient-to-b from-black to-gray-950">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-8">Créé par</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Achzod</h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Coach certifié avec plus de 11 certifications internationales. Des années d'expérience à accompagner des clients en coaching individuel, maintenant accessible à tous.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {certifications.map((cert, index) => (
              <motion.span
                key={cert}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="text-xs text-emerald-400/80 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 rounded-full"
              >
                {cert}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTA() {
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
    <section className="relative py-32 bg-gray-950 overflow-hidden">
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[150px]"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sois le premier informé</h2>
          <p className="text-gray-500 mb-10">Offre de lancement exclusive réservée à la liste VIP.</p>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-14 px-6 bg-gray-900/50 border border-gray-800 text-white placeholder:text-gray-600 rounded-full focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
              />
              <button type="submit" disabled={isSubmitting} className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full transition-all flex items-center justify-center gap-2">
                {isSubmitting ? "..." : "Rejoindre"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-3 text-emerald-400">
              <Check className="h-5 w-5" />
              <span className="font-medium">Tu es sur la liste VIP</span>
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="mt-20 text-center text-sm text-gray-700">ApexLabs by Achzod</div>
    </section>
  );
}

export default function ApexLabs() {
  return (
    <div className="min-h-screen bg-black">
      <HeroSection />
      <OffersPreview />
      <AchzodSection />
      <FinalCTA />
    </div>
  );
}
