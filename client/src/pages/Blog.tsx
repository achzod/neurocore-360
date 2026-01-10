import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Clock, Calendar, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  BLOG_ARTICLES,
  BLOG_CATEGORIES,
  getFeaturedArticles,
  getArticlesByCategory,
  getArticleCountByCategory,
} from "@/data/blogArticles";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("popular");

  const featuredArticles = getFeaturedArticles();
  let categoryArticles = getArticlesByCategory(activeCategory);

  // Sorting
  categoryArticles = [...categoryArticles].sort((a, b) => {
    if (sortBy === "popular") {
      return ((b as any).priority || 0) - ((a as any).priority || 0);
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Filter by search query
  const filteredArticles = searchQuery.trim()
    ? categoryArticles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categoryArticles;

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          {/* Background with Grid */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
            {/* Tech Grid Overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-8">
                [ BLOG ]
              </p>
              <h1 className="mb-6 text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em]">
                APEX LABS Blog
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-white/50">
                Articles, guides et insights sur l'optimisation de votre santé,
                sommeil, nutrition et performance.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Categories Section - MAIN */}
        <section className="py-16 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4">
            <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
              [ CATÉGORIES ]
            </p>
            <h2 className="mb-8 text-2xl font-bold text-white flex items-center justify-between">
              Explorer par thème
              <div className="flex bg-white/5 p-1 rounded-sm border border-white/10 text-xs">
                <button 
                  onClick={() => setSortBy("popular")}
                  className={`px-3 py-1.5 rounded-sm transition-all ${sortBy === "popular" ? "bg-[#FCDD00] text-black font-bold" : "text-white/50 hover:text-white"}`}
                >
                  Populaires
                </button>
                <button 
                  onClick={() => setSortBy("recent")}
                  className={`px-3 py-1.5 rounded-sm transition-all ${sortBy === "recent" ? "bg-[#FCDD00] text-black font-bold" : "text-white/50 hover:text-white"}`}
                >
                  Récents
                </button>
              </div>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {BLOG_CATEGORIES.filter(c => c.id !== "all").map((category, index) => {
                const count = getArticleCountByCategory(category.id);
                if (count === 0) return null;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      setActiveCategory(category.id);
                      document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`group p-4 rounded-sm text-left transition-all duration-300 hover:-translate-y-1 ${
                      activeCategory === category.id
                        ? "bg-[#FCDD00] text-black"
                        : "bg-white/[0.03] border border-white/10 hover:border-[#FCDD00]/50"
                    }`}
                  >
                    <span className={`text-sm font-semibold block mb-1 ${
                      activeCategory === category.id ? "text-black" : "text-white group-hover:text-[#FCDD00]"
                    }`}>
                      {category.label}
                    </span>
                    <span className={`text-xs ${
                      activeCategory === category.id ? "text-black/70" : "text-white/40"
                    }`}>
                      {count} article{count > 1 ? 's' : ''}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {activeCategory !== "all" && (
              <button
                onClick={() => setActiveCategory("all")}
                className="mt-4 text-sm text-[#FCDD00] hover:underline"
              >
                ← Voir tous les articles
              </button>
            )}
          </div>
        </section>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && activeCategory === "all" && (
          <section className="py-16 border-t border-white/5">
            <div className="mx-auto max-w-7xl px-4">
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
                [ À LA UNE ]
              </p>
              <h2 className="mb-10 text-2xl font-bold text-white">Articles à la une</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {featuredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/blog/${article.slug}`}>
                      <div className="group h-full cursor-pointer overflow-hidden rounded-sm bg-white/[0.03] border border-white/10 hover:border-[#FCDD00]/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-5">
                          <span className="inline-block mb-3 px-2 py-1 text-xs font-mono uppercase tracking-wider text-[#FCDD00] bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm">
                            {BLOG_CATEGORIES.find((c) => c.id === article.category)?.label || article.category}
                          </span>
                          <h3 className="mb-2 text-lg font-bold text-white line-clamp-2 group-hover:text-[#FCDD00] transition-colors">
                            {article.title}
                          </h3>
                          <p className="mb-4 text-sm text-white/50 line-clamp-2">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.readTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(article.date).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Search Bar */}
        <section id="articles-section" className="py-8 border-y border-white/5 bg-white/[0.01]">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center gap-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white/[0.03] border border-white/10 rounded-sm text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FCDD00]/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {activeCategory !== "all" && (
                <span className="text-sm text-white/50">
                  Filtre: <span className="text-[#FCDD00]">{BLOG_CATEGORIES.find(c => c.id === activeCategory)?.label}</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* All Articles */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-10 text-2xl font-bold text-white">
              {activeCategory === "all"
                ? "Tous les articles"
                : BLOG_CATEGORIES.find((c) => c.id === activeCategory)?.label}
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 6) * 0.05 }}
                >
                  <Link href={`/blog/${article.slug}`}>
                    <div className="group h-full cursor-pointer overflow-hidden rounded-sm bg-white/[0.03] border border-white/10 hover:border-[#FCDD00]/30 transition-all duration-300 hover:-translate-y-1">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <span className="inline-block mb-3 px-2 py-1 text-xs font-mono uppercase tracking-wider text-[#FCDD00] bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm">
                          {BLOG_CATEGORIES.find((c) => c.id === article.category)?.label || article.category}
                        </span>
                        <h3 className="mb-2 text-lg font-bold text-white line-clamp-2 group-hover:text-[#FCDD00] transition-colors">
                          {article.title}
                        </h3>
                        <p className="mb-4 text-sm text-white/50 line-clamp-2">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-sm font-medium text-[#FCDD00] opacity-0 group-hover:opacity-100 transition-opacity">
                            Lire <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/50">
                  Aucun article dans cette catégorie pour le moment.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-6">
              [ NEWSLETTER ]
            </p>
            <h2 className="mb-4 text-3xl font-bold text-white">
              Restez informé
            </h2>
            <p className="mb-8 text-white/50">
              Recevez nos derniers articles et conseils d'optimisation directement dans votre boîte mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-sm text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FCDD00]/50"
              />
              <button className="px-6 py-3 bg-[#FCDD00] text-black font-semibold rounded-sm hover:bg-[#FCDD00]/90 transition-colors">
                S'abonner
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
