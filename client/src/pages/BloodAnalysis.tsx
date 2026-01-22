import { Link } from 'wouter';

export default function BloodAnalysisLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-3xl"></div>

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium">
            🔬 Nouveau Produit
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Décode Ton Sang.<br />
            Optimise Ta Biologie.<br />
            Deviens Apex.
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transforme tes analyses sanguines en plan d'action personnalisé avec Claude Opus 4.5.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/blood-analysis/analyze">
              <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl font-bold text-lg shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105">
                Analyser Maintenant - GRATUIT (MVP)
              </button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span>✓ Ranges Optimaux Huberman/Attia</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✓ Protocoles Evidence-Based</span>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Ce Que Tu Obtiens
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🔬"
              title="Biomarqueurs Optimaux"
              description="Ranges optimaux vs normaux (Huberman, Attia, Examine)"
            />
            <FeatureCard
              icon="🧠"
              title="IA Claude Sonnet 4"
              description="Analyse contextuelle + détection patterns"
            />
            <FeatureCard
              icon="💊"
              title="Protocoles Actionnables"
              description="Suppléments, nutrition, lifestyle - dosages précis"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-t border-slate-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à Optimiser Ta Santé ?
          </h2>
          <Link href="/blood-analysis/analyze">
            <button className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl font-bold text-xl shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105">
              Analyser Mes Résultats
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
