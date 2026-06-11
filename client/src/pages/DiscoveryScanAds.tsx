import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";

/**
 * Landing page Discovery Scan - Google Ads Compliant
 *
 * Page optimisée pour campagnes publicitaires
 * Vocabulaire neutre: questionnaire, rapport personnalisé, performance
 * Noms de remplacement pour les offres: Rapport Avancé, Rapport Complet, Analyse Données
 * Meta noindex pour ne pas indexer dans Google Search
 */

export default function DiscoveryScanAds() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);

    // Set page title
    document.title = "Discovery Scan - Questionnaire Gratuit | APEXLABS";

    // CRITICAL: Override meta tags with Google Ads compliant content
    // Description - NO medical/hormonal terms
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Questionnaire gratuit en 5 minutes. Découvre ton profil performance et reçois un rapport personnalisé. Par APEXLABS.');
    }

    // Keywords - NO medical/hormonal terms
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'questionnaire gratuit, profil performance, rapport personnalisé, coaching, optimisation, apexlabs');
    }

    // Open Graph description - NO medical/hormonal terms
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', 'Questionnaire gratuit. Découvre ton profil performance et reçois un rapport personnalisé en 24h.');
    }

    // Add noindex meta tag
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
    }

    // Store original values for cleanup
    const originalDescription = metaDescription?.getAttribute('content');
    const originalKeywords = metaKeywords?.getAttribute('content');
    const originalOgDescription = ogDescription?.getAttribute('content');

    return () => {
      // Restore original meta tags on unmount
      if (metaDescription && originalDescription) {
        metaDescription.setAttribute('content', originalDescription);
      }
      if (metaKeywords && originalKeywords) {
        metaKeywords.setAttribute('content', originalKeywords);
      }
      if (ogDescription && originalOgDescription) {
        ogDescription.setAttribute('content', originalOgDescription);
      }

      // Remove noindex
      const metaToRemove = document.querySelector('meta[name="robots"]');
      if (metaToRemove && metaToRemove.getAttribute('content') === 'noindex, nofollow') {
        metaToRemove.setAttribute('content', 'index, follow');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Navbar - APEXLABS Design System */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#000000] border-b border-[#333333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Format APEXLABS */}
            <Link href="/">
              <a className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black tracking-tighter text-white">
                    APEX<span className="text-[#FCDD00]">LABS</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#525252] tracking-widest uppercase">by Achzod</span>
                </div>
              </a>
            </Link>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#hero" className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white">
                Discovery Scan
              </a>
              <a href="#offres" className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white">
                Mes Offres
              </a>
              <Link href="/blog">
                <a className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white">Blog</a>
              </Link>
              <a
                href="https://www.achzodcoaching.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold uppercase text-[#9CA3AF] transition-colors hover:text-white"
              >
                Coaching
              </a>
            </div>

            {/* CTA Button */}
            <Link href="/questionnaire">
              <a className="px-5 py-2.5 text-xs font-black uppercase tracking-wide bg-[#FCDD00] text-black rounded-sm transition-all duration-300 hover:bg-[#FCDD00]/90">
                Commencer
              </a>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Label */}
            <div className="inline-block mb-6">
              <span className="bg-[#FCDD00]/10 border border-[#FCDD00]/30 text-[#FCDD00] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider">
                QUESTIONNAIRE GRATUIT
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-tight">
              Découvre ton{" "}
              <span className="text-[#FCDD00]">profil performance</span>
              {" "}en 5 minutes.
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-white/70 mb-10 leading-relaxed max-w-3xl mx-auto">
              Réponds à 66 questions sur 10 domaines : sommeil, énergie, récupération, entraînement, nutrition, lifestyle.
              Reçois un rapport personnalisé avec tes points forts et tes axes d'amélioration.
            </p>

            {/* CTA */}
            <Link href="/questionnaire">
              <a className="inline-flex items-center gap-2 bg-[#FCDD00] text-black font-semibold px-8 py-4 rounded-lg text-lg hover:bg-[#FCDD00]/90 transition-all">
                Commencer le questionnaire
                <ArrowRight size={20} />
              </a>
            </Link>

            {/* Social Proof */}
            <p className="mt-8 text-sm text-white/50">
              Plus de 2 000 personnes ont déjà complété leur questionnaire
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Comment ça marche
            </h2>
            <p className="text-xl text-white/60">3 étapes simples pour découvrir ton profil</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#FCDD00]/10 border-2 border-[#FCDD00] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-black text-[#FCDD00]">01</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Réponds aux questions</h3>
              <p className="text-white/70 leading-relaxed">
                66 questions ciblées sur 10 domaines essentiels. Ça prend environ 5 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#FCDD00]/10 border-2 border-[#FCDD00] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-black text-[#FCDD00]">02</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Reçois ton rapport</h3>
              <p className="text-white/70 leading-relaxed">
                Un rapport personnalisé de 5-7 pages avec ton score global sur 100 et une analyse détaillée par domaine.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#FCDD00]/10 border-2 border-[#FCDD00] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-black text-[#FCDD00]">03</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Passe à l'action</h3>
              <p className="text-white/70 leading-relaxed">
                Des recommandations concrètes et un plan d'action pour progresser dans chaque domaine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Domains */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Les 10 domaines analysés
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: "Sommeil", desc: "Qualité et durée de tes nuits" },
              { name: "Énergie", desc: "Ton niveau d'énergie au quotidien" },
              { name: "Récupération", desc: "Comment ton corps récupère" },
              { name: "Entraînement", desc: "Tes performances à l'effort" },
              { name: "Nutrition", desc: "Tes habitudes alimentaires" },
              { name: "Lifestyle", desc: "Ton mode de vie global" },
              { name: "Mindset", desc: "Ta mentalité et motivation" },
              { name: "Mobilité", desc: "Ta souplesse et amplitude" },
              { name: "Performance", desc: "Tes résultats globaux" },
              { name: "Stress Management", desc: "Ta gestion du stress" },
            ].map((domain, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">{domain.name}</h3>
                <p className="text-sm text-white/60">{domain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
                Ce que tu reçois
              </h2>
            </div>

            <div className="bg-white/5 border border-[#FCDD00]/30 rounded-2xl p-8 lg:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Ton rapport comprend :</h3>
                  <ul className="space-y-4">
                    {[
                      "Score global sur 100",
                      "Analyse par domaine",
                      "Points forts identifiés",
                      "Axes d'amélioration prioritaires",
                      "Format : Rapport PDF de 5-7 pages",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-white/80">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="bg-[#FCDD00]/10 border-2 border-[#FCDD00] rounded-2xl p-8 mb-4">
                      <span className="text-6xl font-black text-[#FCDD00]">100%</span>
                    </div>
                    <p className="text-xl font-semibold text-white">
                      gratuit, sans engagement
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Offers Section */}
      <section id="offres" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Envie d'aller plus loin ?
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Le questionnaire gratuit te donne ton profil. Mes offres premium te donnent un plan d'action complet et personnalisé.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Discovery Scan - Free */}
            <div className="bg-white/5 border-2 border-[#FCDD00] rounded-2xl p-8">
              <div className="mb-6">
                <span className="bg-[#FCDD00] text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  GRATUIT
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Discovery Scan</h3>
              <p className="text-4xl font-black text-[#FCDD00] mb-6">0€</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Questionnaire 66 questions",
                  "10 domaines analysés",
                  "Score global sur 100",
                  "Rapport personnalisé 5-7 pages",
                  "Axes d'amélioration identifiés",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/80">
                    <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/questionnaire">
                <a className="block w-full text-center bg-[#FCDD00] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#FCDD00]/90 transition-all">
                  Commencer →
                </a>
              </Link>
            </div>

            {/* Rapport Avancé */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <span className="bg-[#FCDD00]/20 border border-[#FCDD00] text-[#FCDD00] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  POPULAIRE
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Rapport Avancé</h3>
              <p className="text-4xl font-black text-white mb-2">59€</p>
              <p className="text-sm text-white/60 mb-6">💯 100% déduit si tu prends un accompagnement</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Tout le Discovery Scan inclus",
                  "137 questions sur 16 domaines",
                  "Protocoles d'action personnalisés",
                  "Plan d'action 30-60-90 jours",
                  "Rapport de 20+ pages",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/80">
                    <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/offers/anabolic-bioscan">
                <a className="block w-full text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-all">
                  Découvrir →
                </a>
              </Link>
            </div>

            {/* Rapport Complet */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <span className="bg-white/10 border border-white/30 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  LE PLUS COMPLET
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Rapport Complet</h3>
              <p className="text-4xl font-black text-white mb-2">79€</p>
              <p className="text-sm text-white/60 mb-6">💯 100% déduit si tu prends un accompagnement</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Tout le Rapport Avancé inclus",
                  "183 questions sur 18 domaines",
                  "Analyse photo posturale incluse",
                  "Rapport de 40-50 pages avec protocoles",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/80">
                    <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/offers/ultimate-scan">
                <a className="block w-full text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-all">
                  Découvrir →
                </a>
              </Link>
            </div>

            {/* Analyse Données */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <span className="bg-white/10 border border-white/30 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  PRECISION
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Analyse Données</h3>
              <p className="text-4xl font-black text-white mb-2">99€</p>
              <p className="text-sm text-white/60 mb-6">💯 100% déduit si tu prends un accompagnement</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Upload tes données existantes",
                  "50+ indicateurs analysés sur 6 panels",
                  "Comparaison avec les ranges optimaux",
                  "Protocoles de correction personnalisés",
                  "Rapport complet avec visuels radar",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/80">
                    <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/offers/blood-analysis">
                <a className="block w-full text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-all">
                  Découvrir →
                </a>
              </Link>
            </div>

            {/* FormCheck */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:col-span-2 lg:col-span-1">
              <div className="mb-6">
                <span className="bg-[#FCDD00]/20 border border-[#FCDD00] text-[#FCDD00] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  NOUVEAU
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">FormCheck</h3>
              <p className="text-xl font-bold text-white/60 mb-6">Bientôt disponible</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Envoie ta vidéo d'exercice par WhatsApp",
                  "Score de forme 0-100",
                  "Corrections prioritaires avec angles",
                  "Exercices correctifs personnalisés",
                  "20+ exercices supportés",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/80">
                    <Check className="text-[#FCDD00] flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/offers/formcheck">
                <a className="block w-full text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-all">
                  En savoir plus →
                </a>
              </Link>
            </div>
          </div>

          {/* Deduction Banner */}
          <div className="bg-[#FCDD00]/10 border border-[#FCDD00]/30 rounded-xl p-6 text-center">
            <p className="text-white/90 mb-4">
              Le montant de ton rapport est intégralement déduit si tu prends un accompagnement avec Achzod.
              Tu ne paies qu'une seule fois.
            </p>
            <a
              href="https://www.achzodcoaching.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#FCDD00] font-semibold hover:text-[#FCDD00]/80 transition-colors"
            >
              En savoir plus sur l'accompagnement
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#FCDD00] text-3xl">★</span>
              ))}
            </div>
            <p className="text-2xl font-bold text-white mb-2">4.9/5</p>
            <p className="text-white/60">Basé sur 148+ avis</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Review 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[#FCDD00]">★</span>
                ))}
              </div>
              <p className="text-white/80 mb-4 leading-relaxed">
                "L'analyse est ultra précise et les recommandations sont concrètes. J'ai enfin compris où concentrer mes efforts pour progresser."
              </p>
              <p className="text-sm text-white/50">— Alexandre M.</p>
            </div>

            {/* Review 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[#FCDD00]">★</span>
                ))}
              </div>
              <p className="text-white/80 mb-4 leading-relaxed">
                "Le rapport est complet et facile à comprendre. Les protocoles personnalisés m'ont permis d'améliorer mes performances rapidement."
              </p>
              <p className="text-sm text-white/50">— Thomas B.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              Questions fréquentes
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Combien de temps ça prend ?",
                a: "Environ 5 minutes pour répondre aux 66 questions.",
              },
              {
                q: "C'est vraiment gratuit ?",
                a: "Oui, 100% gratuit, sans carte bancaire ni engagement.",
              },
              {
                q: "Que contient le rapport ?",
                a: "Un score global sur 100, une analyse de tes 10 domaines avec tes points forts et axes d'amélioration, et des recommandations personnalisées.",
              },
              {
                q: "Qui analyse mes réponses ?",
                a: "Ton rapport est généré par notre système et vérifié par Achzod, expert certifié avec 12 certifications internationales (NASM, ISSA, Precision Nutrition, etc.).",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                <p className="text-white/70 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Prêt à découvrir ton profil ?
          </h2>
          <p className="text-xl text-white/60 mb-10">
            5 minutes. 66 questions. Un rapport complet.
          </p>
          <Link href="/questionnaire">
            <a className="inline-flex items-center gap-2 bg-[#FCDD00] text-black font-semibold px-8 py-4 rounded-lg text-lg hover:bg-[#FCDD00]/90 transition-all">
              Commencer maintenant
              <ArrowRight size={20} />
            </a>
          </Link>
        </div>
      </section>

      {/* Footer - Simplified version with renamed offers */}
      <footer className="bg-black/50 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">APEXLABS</h3>
              <p className="text-white/60 text-sm">by Achzod</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Offres</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/questionnaire"><a className="hover:text-white transition-colors">Discovery Scan</a></Link></li>
                <li><Link href="/offers/anabolic-bioscan"><a className="hover:text-white transition-colors">Rapport Avancé</a></Link></li>
                <li><Link href="/offers/ultimate-scan"><a className="hover:text-white transition-colors">Rapport Complet</a></Link></li>
                <li><Link href="/offers/blood-analysis"><a className="hover:text-white transition-colors">Analyse Données</a></Link></li>
                <li><Link href="/offers/formcheck"><a className="hover:text-white transition-colors">FormCheck</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/mentions-legales"><a className="hover:text-white transition-colors">Mentions Légales</a></Link></li>
                <li><Link href="/cgv"><a className="hover:text-white transition-colors">CGV</a></Link></li>
                <li><Link href="/politique-confidentialite"><a className="hover:text-white transition-colors">Confidentialité</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="https://www.achzodcoaching.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Accompagnement</a></li>
                <li><Link href="/blog"><a className="hover:text-white transition-colors">Blog</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/50">
            © 2026 APEXLABS by Achzod. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
