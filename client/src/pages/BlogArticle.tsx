import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Share2,
  Twitter,
  Linkedin,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { BLOG_CATEGORIES, type BlogArticle } from "@/data/blogTypes";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

const SITE_ORIGIN = "https://apexlabs.achzodcoaching.com";

const CATEGORY_CONVERSION: Record<
  string,
  {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
    cta: string;
    offer: string;
    sideStat: string;
    sideLabel: string;
  }
> = {
  musculation: {
    eyebrow: "Lecture complete",
    title: "Tu veux savoir si ton plan construit vraiment du muscle ?",
    body: "Le Discovery Scan identifie les blocages nutrition, recuperation, progression et adherence avant de changer encore de programme.",
    href: "/audit-complet?plan=gratuit&source=blog_musculation",
    cta: "Identifier mon frein",
    offer: "Discovery Scan",
    sideStat: "7 min",
    sideLabel: "diagnostic",
  },
  sarms: {
    eyebrow: "Cadre avance",
    title: "Avant de toucher aux PEDs, lis ton contexte complet.",
    body: "Le Peptides Engine et les analyses APEXLABS aident a cadrer les decisions avancees avec donnees, prudence et orientation claire.",
    href: "/offers/peptides-engine?source=blog_sarms",
    cta: "Voir Peptides Engine",
    offer: "Peptides Engine",
    sideStat: "74",
    sideLabel: "molecules",
  },
  supplements: {
    eyebrow: "Priorites d'abord",
    title: "Ne rajoute pas un supplement si le vrai frein est ailleurs.",
    body: "Commence par verifier sommeil, stress, digestion, nutrition et entrainement pour savoir ce qui merite vraiment d'etre corrige.",
    href: "/audit-complet?plan=gratuit&source=blog_supplements",
    cta: "Faire le scan gratuit",
    offer: "Discovery Scan",
    sideStat: "8",
    sideLabel: "axes lus",
  },
  hormones: {
    eyebrow: "Signal hormonal",
    title: "Energie, libido, recuperation : arrete de deviner.",
    body: "L'Anabolic Bioscan route les signaux hormonaux, le contexte lifestyle et les blocages de performance vers une lecture claire.",
    href: "/offers/anabolic-bioscan?source=blog_hormones",
    cta: "Analyser mon signal",
    offer: "Anabolic Bioscan",
    sideStat: "59€",
    sideLabel: "analyse",
  },
  sommeil: {
    eyebrow: "Sommeil & recovery",
    title: "Si ton sommeil bloque, ton physique bloque aussi.",
    body: "Le Discovery Scan met en relation sommeil, stress, energie, faim, digestion et performance pour isoler le levier prioritaire.",
    href: "/audit-complet?plan=gratuit&source=blog_sommeil",
    cta: "Tester mes signaux",
    offer: "Discovery Scan",
    sideStat: "5 min",
    sideLabel: "resultats",
  },
  stress: {
    eyebrow: "Stress & HRV",
    title: "Ton systeme nerveux peut etre le frein invisible.",
    body: "APEXLABS relie HRV, sommeil, charge mentale, entrainement et recuperation pour eviter de pousser le mauvais levier.",
    href: "/audit-complet?plan=gratuit&source=blog_stress",
    cta: "Voir ce qui bloque",
    offer: "Discovery Scan",
    sideStat: "HRV",
    sideLabel: "contexte",
  },
  nutrition: {
    eyebrow: "Nutrition utile",
    title: "Avant de baisser les calories, identifie le vrai levier.",
    body: "Le scan APEXLABS te montre si le probleme vient de la faim, du timing, de l'adherence, de la recuperation ou du metabolisme.",
    href: "/offers/ultimate-scan?source=blog_nutrition",
    cta: "Faire une lecture complete",
    offer: "Ultimate Scan",
    sideStat: "79€",
    sideLabel: "complet",
  },
  performance: {
    eyebrow: "Performance",
    title: "Plus d'effort ne suffit pas si la recuperation ne suit pas.",
    body: "Ultimate Scan croise entrainement, sommeil, HRV, nutrition et fatigue pour choisir le bon ajustement.",
    href: "/offers/ultimate-scan?source=blog_performance",
    cta: "Analyser ma performance",
    offer: "Ultimate Scan",
    sideStat: "16",
    sideLabel: "domaines",
  },
  metabolisme: {
    eyebrow: "Metabolisme",
    title: "Si ton moteur ralentit, il faut le lire avant de couper plus.",
    body: "Ultimate Scan analyse energie, NEAT, faim, glycemie percue, digestion, sommeil et contexte pour prioriser la correction.",
    href: "/offers/ultimate-scan?source=blog_metabolisme",
    cta: "Lire mon metabolisme",
    offer: "Ultimate Scan",
    sideStat: "16",
    sideLabel: "domaines",
  },
  longevite: {
    eyebrow: "Biomarqueurs",
    title: "On ne pilote pas la longevite avec des impressions.",
    body: "Blood Analysis transforme tes marqueurs en priorites actionnables pour performance, sante metabolique et prevention.",
    href: "/offers/blood-analysis?source=blog_longevite",
    cta: "Analyser mes marqueurs",
    offer: "Blood Analysis",
    sideStat: "99€",
    sideLabel: "blood",
  },
  biohacking: {
    eyebrow: "Data utile",
    title: "Le tracking ne sert a rien sans decision derriere.",
    body: "APEXLABS transforme les signaux wearable, lifestyle et performance en prochaines actions au lieu d'accumuler des chiffres.",
    href: "/offers/ultimate-scan?source=blog_biohacking",
    cta: "Transformer mes donnees",
    offer: "Ultimate Scan",
    sideStat: "data",
    sideLabel: "action",
  },
  femmes: {
    eyebrow: "Physiologie feminine",
    title: "Cycle, energie, sommeil : ton plan doit respecter ton contexte.",
    body: "Le Discovery Scan aide a poser les priorites avant de choisir nutrition, entrainement ou accompagnement.",
    href: "/audit-complet?plan=gratuit&source=blog_femmes",
    cta: "Faire le point",
    offer: "Discovery Scan",
    sideStat: "8",
    sideLabel: "axes",
  },
};

const DEFAULT_CONVERSION = {
  eyebrow: "Diagnostic APEXLABS",
  title: "Tu veux savoir quel levier bloque vraiment ton corps ?",
  body: "Commence par un diagnostic clair avant de changer encore de plan, de calories ou de supplements.",
  href: "/audit-complet?plan=gratuit&source=blog_article",
  cta: "Faire mon Discovery Scan",
  offer: "Discovery Scan",
  sideStat: "0€",
  sideLabel: "depart",
};

export default function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch("/blog-articles.json")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Impossible de charger les articles.");
        }
        const data = (await res.json()) as BlogArticle[];
        if (active) {
          setArticles(data);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : "Erreur chargement.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const article = useMemo(
    () => articles.find((entry) => entry.slug === (params.slug || "")) || null,
    [articles, params.slug]
  );

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | Blog ACHZOD`;
      const canonicalUrl = `${SITE_ORIGIN}/blog/${article.slug}`;

      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', article.excerpt);
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', article.title);

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', article.excerpt);

      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);

      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canonical) canonical.href = canonicalUrl;

      const ogImage = document.querySelector('meta[property="og:image"]');
      const image = article.image || article.imageUrl || "https://placehold.co/1200x600/0a0a0a/ffffff?text=APEXLABS";
      if (image) {
        if (ogImage) {
          ogImage.setAttribute('content', image);
        } else {
          const newOgImage = document.createElement('meta');
          newOgImage.setAttribute('property', 'og:image');
          newOgImage.setAttribute('content', image);
          document.head.appendChild(newOgImage);
        }
      }

      const existingSchema = document.getElementById("blog-article-schema");
      if (existingSchema) existingSchema.remove();

      const schema = document.createElement("script");
      schema.id = "blog-article-schema";
      schema.type = "application/ld+json";
      schema.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        image,
        datePublished: article.date,
        dateModified: article.date,
        author: {
          "@type": "Person",
          name: article.author || "ACHZOD",
          url: "https://www.achzodcoaching.com",
        },
        publisher: {
          "@type": "Organization",
          name: "APEXLABS by Achzod",
          url: SITE_ORIGIN,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      });
      document.head.appendChild(schema);

      return () => {
        document.getElementById("blog-article-schema")?.remove();
      };
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <main className="py-24">
          <div className="mx-auto max-w-2xl px-4 text-center text-white/60">
            Chargement de l'article...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <main className="py-24">
          <div className="mx-auto max-w-2xl px-4 text-center text-rose-400">
            {loadError}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <main className="py-24">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h1 className="mb-4 text-3xl font-bold text-white">Article non trouvé</h1>
            <p className="mb-8 text-white/50">
              L'article que vous cherchez n'existe pas ou a été déplacé.
            </p>
            <Link href="/blog">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#FCDD00] text-black font-semibold rounded-sm hover:bg-[#FCDD00]/90 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Retour au blog
              </button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get related articles (same category, excluding current)
  const relatedArticles = articles.filter(
    (a) => a.category === article.category && a.id !== article.id
  ).slice(0, 3);

  const categoryLabel =
    BLOG_CATEGORIES.find((c) => c.id === article.category)?.label ||
    article.category;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const heroImage = article.image || article.imageUrl || "https://placehold.co/1200x600/0a0a0a/ffffff?text=APEXLABS";
  const conversion = CATEGORY_CONVERSION[article.category] || DEFAULT_CONVERSION;
  const whatsappMessage = `Salut Achzod, je viens de lire l'article "${article.title}" sur APEXLABS. Je veux ton avis : est-ce que mon cas releve plutot d'un scan, d'une analyse avancee ou d'un coaching ?`;
  const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main>
        {/* Hero Image */}
        <div className="relative h-[40vh] min-h-[300px] md:h-[50vh] w-full overflow-hidden">
          <img
            src={heroImage}
            alt={article.title}
            className="h-full w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
          {/* Tech Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Article Content */}
        <article className="relative -mt-32 z-10">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-sm bg-[#0F0F0F] p-6 md:p-10 border border-white/10"
            >
              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#FCDD00] mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au blog
              </Link>

              {/* Meta */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <span className="inline-block px-2 py-1 text-xs font-mono uppercase tracking-wider text-[#FCDD00] bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm">
                  {categoryLabel}
                </span>
                {article.readTime && (
                <span className="flex items-center gap-1 text-sm text-white/50">
                  <Clock className="h-4 w-4" />
                  {article.readTime}
                </span>
                )}
                <span className="flex items-center gap-1 text-sm text-white/50">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Title */}
              <h1 className="mb-6 text-3xl font-bold tracking-[-0.04em] text-white md:text-4xl lg:text-5xl">
                {article.title}
              </h1>

              {/* Excerpt */}
              <p className="mb-8 text-lg text-white/60 leading-relaxed">
                {article.excerpt}
              </p>

              {/* Author */}
              <div className="mb-8 flex items-center gap-3 pb-8 border-b border-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20">
                  <User className="h-5 w-5 text-[#FCDD00]" />
                </div>
                <div>
                  <div className="font-semibold text-white">{article.author}</div>
                  <div className="text-sm text-white/50">
                    Coach & Auteur
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-bold mt-8 mb-3 text-white">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 text-white/60 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 space-y-2 list-disc list-inside text-white/60">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 space-y-2 list-decimal list-inside text-white/60">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-white/60">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-white">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#FCDD00] pl-4 italic text-white/50 my-6">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>

              {/* End-of-article CTA ,  converts SEO readers into Discovery leads */}
              <div className="mt-10 rounded-sm border border-[#FCDD00]/40 bg-gradient-to-br from-[#FCDD00]/5 to-transparent p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FCDD00] mb-2">
                  Va plus loin avec Achzod
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight">
                  Tu veux savoir quoi faire avec ton cas précis ?
                </h3>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-5">
                  Si tu te reconnais dans cet article, ne repars pas avec une idée de plus à tester au hasard. Envoie ton contexte à Achzod sur WhatsApp ou commence par un scan APEXLABS pour identifier le levier prioritaire.
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-sm font-bold text-sm hover:bg-[#20BD5A] transition-colors"
                    onClick={() => {
                      try {
                        trackWhatsAppClick({
                          offer: "Blog Orientation",
                          placement: "blog_article_inline",
                          tier: article.category,
                          destination: whatsappUrl,
                        });
                      } catch {
                        // Analytics must never block WhatsApp access.
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Demander l'avis d'Achzod
                  </a>
                  <a
                    href="/audit-complet?plan=gratuit"
                    className="inline-flex items-center justify-center gap-2 bg-[#FCDD00] text-black px-5 py-3 rounded-sm font-bold text-sm hover:bg-[#fce844] transition-colors"
                  >
                    Faire mon Discovery Scan (gratuit)
                  </a>
                  <span className="text-xs text-white/40 sm:w-full">
                    Sans carte bancaire · Résultats immédiats
                  </span>
                </div>
              </div>

              {/* Share */}
              <div className="mt-10 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Partager cet article</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        window.open(
                          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`,
                          "_blank"
                        )
                      }
                      className="p-2 rounded-sm bg-white/[0.03] border border-white/10 text-white/70 hover:text-[#FCDD00] hover:border-[#FCDD00]/30 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                          "_blank"
                        )
                      }
                      className="p-2 rounded-sm bg-white/[0.03] border border-white/10 text-white/70 hover:text-[#FCDD00] hover:border-[#FCDD00]/30 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                      }}
                      className="p-2 rounded-sm bg-white/[0.03] border border-white/10 text-white/70 hover:text-[#FCDD00] hover:border-[#FCDD00]/30 transition-colors"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-24 border-t border-white/5 mt-16">
            <div className="mx-auto max-w-7xl px-4">
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
                [ ARTICLES SIMILAIRES ]
              </p>
              <h2 className="mb-10 text-2xl font-bold text-white">Articles similaires</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/blog/${relatedArticle.slug}`}
                  >
                    <div className="group h-full cursor-pointer overflow-hidden rounded-sm bg-white/[0.03] border border-white/10 hover:border-[#FCDD00]/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={relatedArticle.image || (relatedArticle as any).imageUrl}
                          alt={relatedArticle.title}
                          loading="lazy"
                          className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="mb-2 font-bold text-white line-clamp-2 group-hover:text-[#FCDD00] transition-colors">
                          {relatedArticle.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          {relatedArticle.readTime}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contextual SEO CTA */}
        <section className="py-16 border-t border-amber-500/10 bg-amber-500/[0.02]">
            <div className="mx-auto max-w-4xl px-4">
              <div className="flex flex-col md:flex-row items-center gap-10 bg-black/40 border border-amber-500/20 p-8 md:p-12 rounded-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 blur-[80px] -translate-y-1/2 -translate-x-1/2" />

                <div className="flex-1 text-center md:text-left relative z-10">
                  <p className="text-amber-500 text-xs font-mono tracking-[0.3em] uppercase mb-4">
                    [ {conversion.eyebrow} ]
                  </p>
                  <h2 className="mb-4 text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">
                    {conversion.title}
                  </h2>
                  <p className="mb-6 text-base text-white/60">
                    {conversion.body}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <a
                      href={conversion.href}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-amber-500 text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-amber-400 transition-all rounded-sm shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    >
                      {conversion.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 border border-[#25D366]/40 text-[#25D366] text-xs font-black uppercase tracking-[0.16em] hover:bg-[#25D366]/10 transition-all rounded-sm"
                      onClick={() => {
                        try {
                          trackWhatsAppClick({
                            offer: conversion.offer,
                            placement: "blog_category_cta",
                            tier: article.category,
                            destination: whatsappUrl,
                          });
                        } catch {
                          // Analytics must never block WhatsApp access.
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-center gap-3 w-1/4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-5 text-center">
                    <div className="text-amber-500 font-bold text-3xl">{conversion.sideStat}</div>
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">{conversion.sideLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        {/* CTA Section - Traffic to AchzodCoaching */}
        <section className="py-24 border-t border-white/5 bg-[#FCDD00]/[0.02]">
          <div className="mx-auto max-w-4xl px-4">
            <div className="flex flex-col md:flex-row items-center gap-10 bg-white/[0.03] border border-white/10 p-8 md:p-12 rounded-sm relative overflow-hidden">
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCDD00]/10 blur-[60px] -translate-y-1/2 translate-x-1/2" />

              <div className="flex-1 text-center md:text-left relative z-10">
                <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
                  [ REJOINDRE L'ÉLITE ]
                </p>
                <h2 className="mb-4 text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
                  TRANSFORME TON PHYSIQUE <br />
                  <span className="text-[#FCDD00]">DÈS AUJOURD'HUI</span>
                </h2>
                <p className="mb-8 text-lg text-white/60">
                  Ton corps n'a jamais manqué d'effort. Il a manqué de méthode.
                  Biomécanique, hormones, récupération : rejoins le coaching ACHZOD pour des résultats réels.
                </p>
                <a
                  href="https://www.achzodcoaching.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#FCDD00] text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-white transition-all rounded-sm shadow-[0_0_20px_rgba(252,221,0,0.2)]"
                >
                  Découvrir mes formules
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="hidden md:block w-1/3">
                <div className="relative aspect-square">
                  <img
                    src="https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg"
                    alt="ACHZOD Coaching"
                    className="w-full h-full object-contain rotate-3 hover:rotate-0 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
