import { useState, useEffect } from "react";
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
  Heart,
  TrendingUp,
  Moon,
  Flame,
  Target,
  AlertTriangle,
  Camera,
  FileText,
} from "lucide-react";

// ============================================================================
// HEADER
// ============================================================================
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center">
          <a href="/apexlabs" className="flex flex-col">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#FCDD00]">APEX</span>
              <span className="text-white">LABS</span>
            </span>
            <span className="text-xs text-gray-500">by Achzod</span>
          </a>
        </div>
      </div>
    </header>
  );
}

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
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black pt-20">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-white/10 via-gray-400/5 to-transparent rounded-full blur-[200px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-[#FCDD00]"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white/80 font-medium">Lancement imminent</span>
            </motion.div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-6">
              <span className="text-white">Apex</span>
              <span className="italic bg-gradient-to-r from-gray-300 via-white to-gray-400 bg-clip-text text-transparent">Labs</span>
            </h1>

            <p className="text-xl text-gray-300 mb-3">L'analyse corporelle la plus complete.</p>
            <p className="text-base text-gray-500 mb-10 max-w-lg">
              Decouvre tes blocages caches. Protocoles personnalises bases sur 11 certifications internationales.
            </p>

            <div className="mb-8">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 rounded-full focus:border-white/30 focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-8 bg-gradient-to-r from-gray-200 via-white to-gray-200 text-black font-bold rounded-full transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <motion.div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      <>Rejoindre la liste VIP <ArrowRight className="h-5 w-5" /></>
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3 text-white bg-white/10 border border-white/20 rounded-full px-6 py-4 max-w-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <Check className="h-5 w-5 text-black" />
                  </div>
                  <span className="font-semibold">Tu es sur la liste VIP</span>
                </div>
              )}
            </div>

            <div className="flex gap-10">
              {[{ value: "11", label: "Certifications" }, { value: "5", label: "Scans" }, { value: "50+", label: "Pages" }].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="relative hidden lg:flex justify-center"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <div className="relative w-[280px] bg-gradient-to-b from-gray-700 to-gray-900 rounded-[3rem] p-3 border border-white/10">
                <div className="bg-black rounded-[2.5rem] overflow-hidden">
                  <div className="px-5 py-6">
                    <div className="text-center mb-4">
                      <p className="text-white/60 text-xs mb-2">APEX LABS</p>
                      <div className="text-5xl font-bold bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">87</div>
                      <p className="text-white/60 text-sm">Score Global</p>
                    </div>
                    <div className="space-y-2">
                      {[{ label: "ENERGIE", score: 92 }, { label: "SOMMEIL", score: 78 }, { label: "STRESS", score: 45 }].map((m) => (
                        <div key={m.label} className="bg-white/5 rounded p-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">{m.label}</span>
                            <span className="text-white font-bold">{m.score}</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full">
                            <motion.div className="h-full rounded-full bg-gradient-to-r from-gray-400 to-white" initial={{ width: 0 }} animate={{ width: `${m.score}%` }} transition={{ delay: 1.5, duration: 0.8 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-gray-600">
        by <span className="text-gray-400 font-medium">Achzod</span>
      </div>
    </section>
  );
}

// ============================================================================
// CERTIFICATIONS (moved above press)
// ============================================================================
function CertificationsSection() {
  const certs = [
    { org: "NASM", items: ["CPT", "CNC", "PES"] },
    { org: "ISSA", items: ["CPT", "SNS", "SFC", "SBC"] },
    { org: "Precision Nutrition", items: ["PN1"] },
    { org: "Pre-Script", items: ["Level 1"] },
  ];

  return (
    <section className="py-16 bg-black border-y border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-8">11 Certifications Internationales</p>
        <div className="flex flex-wrap justify-center gap-4">
          {certs.map((c) => (
            <div key={c.org} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
              <span className="text-white font-medium text-sm">{c.org}</span>
              <div className="flex gap-1">
                {c.items.map((item) => (
                  <span key={item} className="text-[10px] text-gray-400 bg-white/10 px-2 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRESS LOGOS
// ============================================================================
function PressSection() {
  const logos = ["BENZINGA", "StreetInsider", "MarketWatch", "REUTERS", "Yahoo Finance", "AP News"];

  return (
    <section className="py-8 bg-black overflow-hidden">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-600 text-center mb-6">Vu dans les medias</p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
        <motion.div className="flex gap-16 items-center" animate={{ x: [0, -800] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <span key={i} className="text-gray-600 text-lg font-semibold whitespace-nowrap">{logo}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// VIDEO SECTION
// ============================================================================
function VideoSection() {
  return (
    <section className="relative h-[60vh] overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src="https://cdn.speedsize.com/3f711f28-1488-44dc-b013-5e43284ac4b0/https://public-web-assets.uh-static.com/web_v2/m1/space.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black" />
      <div className="relative z-10 h-full flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#FCDD00] mb-4">5 Scans disponibles</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Chaque aspect de ta biologie</h2>
          <p className="text-gray-400 max-w-xl mx-auto">analyse en profondeur</p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER SECTION 1: DISCOVERY SCAN - Animated radar
// ============================================================================
function DiscoveryScanSection() {
  return (
    <section className="py-24 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="aspect-square max-w-md mx-auto relative">
              {/* Animated radar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Circles */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: `scale(${i * 0.25})` }} />
                  ))}
                  {/* Scanning line */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-[#FCDD00] to-transparent origin-left"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#FCDD00] rounded-full" />
                  {/* Blips */}
                  {[{ x: 30, y: -40 }, { x: -50, y: 20 }, { x: 20, y: 50 }].map((pos, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"
                      style={{ x: pos.x, y: pos.y }}
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    />
                  ))}
                </div>
              </div>
              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(252,221,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(252,221,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            </div>
          </motion.div>

          {/* Text - Right */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <Scan className="h-5 w-5 text-[#FCDD00]" />
              <span className="text-[#FCDD00] text-sm font-medium uppercase tracking-wider">Discovery Scan</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">Gratuit</h2>
            <p className="text-gray-400 text-lg mb-6">Diagnostic complet de tes blocages</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Detection de tes patterns problematiques, desequilibres reveles. Score global sur 100 avec rapport 5-7 pages. Sans recommandations - juste le diagnostic brut.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Score global /100", "Blocages identifies", "Rapport 5-7 pages"].map((f) => (
                <span key={f} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER SECTION 2: ANABOLIC BIOSCAN - Hormone waves
// ============================================================================
function AnabolicBioscanSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text - Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium uppercase tracking-wider">Anabolic Bioscan</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">59€</h2>
            <p className="text-gray-400 text-lg mb-6">16 sections d'analyse approfondie</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              L'ancien audit hormonal anabolique. Protocoles matin anti-cortisol, soir sommeil, digestion 14 jours et stack supplements optimise. Plan 30-60-90 jours structure.
            </p>
            <div className="flex flex-wrap gap-2">
              {["16 sections", "4 protocoles", "Plan 30-60-90 jours", "Stack supplements"].map((f) => (
                <span key={f} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>

          {/* Visual - Right: Hormone waves */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="aspect-square max-w-md mx-auto relative rounded-sm overflow-hidden bg-gradient-to-br from-emerald-950 to-black border border-emerald-500/20">
              {/* Animated waves */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
                {[0, 1, 2].map((i) => (
                  <motion.path
                    key={i}
                    d={`M0,${200 + i * 30} Q100,${150 + i * 30} 200,${200 + i * 30} T400,${200 + i * 30}`}
                    fill="none"
                    stroke={`rgba(52, 211, 153, ${0.3 - i * 0.1})`}
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </svg>
              {/* Labels */}
              <div className="absolute top-8 left-8 text-emerald-400 text-xs font-mono">CORTISOL</div>
              <div className="absolute top-8 right-8 text-emerald-400 text-xs font-mono">TESTOSTERONE</div>
              <div className="absolute bottom-8 left-8 text-emerald-400 text-xs font-mono">INSULIN</div>
              {/* Center stats */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    className="text-5xl font-bold text-emerald-400"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    16
                  </motion.div>
                  <p className="text-emerald-400/60 text-sm">SECTIONS</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER SECTION 3: ULTIMATE SCAN - Photo analysis visual
// ============================================================================
function UltimateScanSection() {
  return (
    <section className="py-24 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - Left: Body scan */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="aspect-[3/4] max-w-sm mx-auto relative rounded-sm overflow-hidden bg-gradient-to-b from-purple-950 to-black border border-purple-500/20">
              {/* Scan lines */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
              {/* Body outline placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-48 border-2 border-purple-400/30 rounded-full" />
              </div>
              {/* Markers */}
              {[
                { label: "Posture", top: "15%", right: "10%" },
                { label: "Epaules", top: "25%", left: "10%" },
                { label: "Bassin", top: "55%", right: "10%" },
                { label: "Genoux", top: "75%", left: "10%" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  className="absolute px-2 py-1 rounded border border-purple-400/30 bg-purple-500/10 text-xs text-purple-300"
                  style={{ top: m.top, left: m.left, right: m.right }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                >
                  {m.label}
                </motion.div>
              ))}
              {/* Camera icon */}
              <div className="absolute bottom-4 right-4">
                <Camera className="h-6 w-6 text-purple-400/50" />
              </div>
              {/* Popular badge */}
              <div className="absolute top-4 left-4 bg-[#FCDD00] text-black text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                Le + populaire
              </div>
            </div>
          </motion.div>

          {/* Text - Right */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium uppercase tracking-wider">Ultimate Scan</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">79€</h2>
            <p className="text-gray-400 text-lg mb-6">L'analyse la plus complete</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              L'ancien audit complet metabolique. Tout l'Anabolic + analyse visuelle posturale et biomecanique complete. 18 sections, rapport 40-50 pages. Detection des compensations invisibles.
            </p>
            <div className="flex flex-wrap gap-2">
              {["18 sections", "Analyse photo", "Rapport 40-50 pages", "Biomecanique"].map((f) => (
                <span key={f} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER SECTION 4: BLOOD ANALYSIS - ECG Animation
// ============================================================================
function BloodAnalysisSection() {
  const [bpm, setBpm] = useState(72);

  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(70 + Math.floor(Math.random() * 8));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text - Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <Droplet className="h-5 w-5 text-red-400" />
              <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Blood Analysis</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">99€</h2>
            <p className="text-gray-400 text-lg mb-6">Ton bilan sanguin decode</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Upload ton PDF de bilan sanguin. J'analyse chaque marqueur avec des ranges optimaux de performance, pas les ranges "normaux" de labo. Radars de risques visuels et protocoles ciblés.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Ranges optimaux", "Radars visuels", "Protocoles cibles", "Upload PDF"].map((f) => (
                <span key={f} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>

          {/* Visual - Right: ECG */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="aspect-square max-w-md mx-auto relative rounded-sm overflow-hidden bg-gradient-to-br from-red-950 to-black border border-red-500/20">
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

              {/* ECG Line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
                <motion.path
                  d="M0,200 L50,200 L60,200 L70,180 L80,220 L90,150 L100,250 L110,200 L120,200 L200,200 L210,200 L220,180 L230,220 L240,150 L250,250 L260,200 L270,200 L350,200 L360,200 L370,180 L380,220 L390,150 L400,250"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </svg>

              {/* BPM Display */}
              <div className="absolute top-8 left-8">
                <div className="flex items-center gap-2">
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                  </motion.div>
                  <span className="text-red-400 text-3xl font-mono font-bold">{bpm}</span>
                  <span className="text-red-400/60 text-sm">BPM</span>
                </div>
              </div>

              {/* Markers */}
              <div className="absolute bottom-8 left-8 right-8 flex justify-between text-xs font-mono text-red-400/60">
                <span>FERRITINE</span>
                <span>VITAMINE D</span>
                <span>TSH</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// OFFER SECTION 5: BURNOUT ENGINE - Stress meter
// ============================================================================
function BurnoutEngineSection() {
  const [stressLevel, setStressLevel] = useState(23);

  useEffect(() => {
    const interval = setInterval(() => {
      setStressLevel(20 + Math.floor(Math.random() * 15));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - Left: Stress meter */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="aspect-square max-w-md mx-auto relative rounded-sm overflow-hidden bg-gradient-to-br from-orange-950 to-black border border-orange-500/20">
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:25px_25px]" />

              {/* Circular gauge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Background circle */}
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(249,115,22,0.2)" strokeWidth="12" />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="80"
                      fill="none"
                      stroke={stressLevel < 30 ? "#22c55e" : stressLevel < 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={502}
                      animate={{ strokeDashoffset: 502 - (502 * stressLevel) / 100 }}
                      transition={{ duration: 1 }}
                    />
                  </svg>
                  {/* Center value */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className="text-5xl font-bold"
                      style={{ color: stressLevel < 30 ? "#22c55e" : stressLevel < 60 ? "#f59e0b" : "#ef4444" }}
                      key={stressLevel}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                    >
                      {stressLevel}
                    </motion.span>
                    <span className="text-orange-400/60 text-sm">/100</span>
                  </div>
                </div>
              </div>

              {/* Alert icon */}
              <div className="absolute top-8 right-8">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </motion.div>
              </div>

              {/* Status */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <p className="text-orange-400 text-sm font-medium">
                  {stressLevel < 30 ? "Risque faible" : stressLevel < 60 ? "Attention requise" : "Risque eleve"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Text - Right */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-orange-400" />
              <span className="text-orange-400 text-sm font-medium uppercase tracking-wider">Burnout Engine</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">39€</h2>
            <p className="text-gray-400 text-lg mb-6">Detection avant qu'il ne soit trop tard</p>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Score de risque burnout en temps reel. Analyse stress et fatigue accumulee. Protocole recuperation 4 semaines avec alertes personnalisees. Detecte les signaux faibles.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Score burnout", "Protocole 4 sem.", "Alertes perso", "Signaux faibles"].map((f) => (
                <span key={f} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// WEARABLES - Text logos
// ============================================================================
function WearablesSection() {
  const wearables = ["Apple Health", "Garmin", "Fitbit", "Oura", "WHOOP", "Ultrahuman", "Samsung", "Withings", "Google Fit"];

  return (
    <section className="py-16 bg-black border-y border-white/5">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-6">Synchronise tes donnees</p>
        <div className="flex flex-wrap justify-center gap-4">
          {wearables.map((w) => (
            <div key={w} className="px-4 py-2 rounded border border-white/10 bg-white/5 text-gray-400 text-sm font-medium hover:border-white/20 hover:text-white transition-all">
              {w}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// REVIEWS - Compact version
// ============================================================================
function ReviewsSection() {
  const [page, setPage] = useState(0);
  const reviews = [
    { name: "Thomas M.", content: "Le Discovery Scan gratuit etait spot on. Ca m'a motive a prendre l'Anabolic.", rating: 5 },
    { name: "Emma V.", content: "L'audit hormonal en beta m'a change la vie. Le protocole cortisol du matin, je me reveille enfin reposee.", rating: 5 },
    { name: "Lucas T.", content: "Le Blood Analysis m'a montre que ma ferritine 'normale' etait trop basse pour un sportif.", rating: 5 },
    { name: "Marc B.", content: "Burnout Engine score 23/100. J'etais en deni. Le protocole 4 semaines m'a sauve.", rating: 5 },
    { name: "Sophie L.", content: "L'Ultimate Scan a detecte mon anteversion pelvienne. Meme mon osteo l'avait pas vue.", rating: 5 },
    { name: "Romain D.", content: "L'Anabolic pour 59€ c'est donne. Stack supplements hyper precis.", rating: 5 },
  ];
  const perPage = 3;
  const displayed = reviews.slice(page * perPage, (page + 1) * perPage);

  return (
    <section className="py-20 bg-black">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-[#FCDD00] text-[#FCDD00]" />)}
            <span className="text-white font-bold ml-2">4.9/5</span>
            <span className="text-gray-500 text-sm ml-2">127 avis</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-white/10 text-gray-500 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(Math.min(1, page + 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-white/10 text-gray-500 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {displayed.map((r) => (
            <div key={r.name} className="p-4 rounded border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#FCDD00]/20 flex items-center justify-center text-[#FCDD00] text-sm font-bold">{r.name[0]}</div>
                <span className="text-white text-sm font-medium">{r.name}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
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
        <p className="text-xl font-bold mb-1">
          <span className="text-[#FCDD00]">APEX</span>
          <span className="text-white">LABS</span>
        </p>
        <p className="text-gray-600 text-sm">by Achzod</p>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function ApexLabs() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <HeroSection />
      <CertificationsSection />
      <PressSection />
      <VideoSection />
      <DiscoveryScanSection />
      <AnabolicBioscanSection />
      <UltimateScanSection />
      <BloodAnalysisSection />
      <BurnoutEngineSection />
      <WearablesSection />
      <ReviewsSection />
      <Footer />
    </div>
  );
}
