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
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getArticleBySlug,
  BLOG_ARTICLES,
  BLOG_CATEGORIES,
  type BlogArticle,
} from "@/data/blogArticles";
import ReactMarkdown from "react-markdown";

export default function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const article = getArticleBySlug(params.slug || "");

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
  const relatedArticles = BLOG_ARTICLES.filter(
    (a) => a.category === article.category && a.id !== article.id
  ).slice(0, 3);

  const categoryLabel =
    BLOG_CATEGORIES.find((c) => c.id === article.category)?.label ||
    article.category;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main>
        {/* Hero Image */}
        <div className="relative h-[40vh] min-h-[300px] md:h-[50vh] w-full overflow-hidden">
          <img
            src={article.image}
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
                <span className="flex items-center gap-1 text-sm text-white/50">
                  <Clock className="h-4 w-4" />
                  {article.readTime}
                </span>
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
                          src={relatedArticle.image}
                          alt={relatedArticle.title}
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

        {/* CTA */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-6">
              [ COMMENCER ]
            </p>
            <h2 className="mb-4 text-3xl font-bold text-white">
              Prêt à optimiser votre santé ?
            </h2>
            <p className="mb-8 text-white/50">
              Découvrez votre profil métabolique avec notre analyse complète.
            </p>
            <Link href="/offers/ultimate-scan">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-[#FCDD00] text-black font-semibold rounded-sm hover:bg-[#FCDD00]/90 transition-colors">
                Commencer l'analyse
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
