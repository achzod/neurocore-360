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

        {/* Categories Section - Cleaned Navigation */}
        <section className="py-8 border-y border-white/5 sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between gap-8 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max">
                {BLOG_CATEGORIES.map((category) => {
                  const count = getArticleCountByCategory(category.id);
                  if (count === 0 && category.id !== "all") return null;
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        document.getElementById('articles-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all ${
                        activeCategory === category.id
                          ? "bg-[#FCDD00] text-black"
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {category.label}
                      {category.id !== "all" && <span className="ml-2 opacity-50">{count}</span>}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex bg-white/5 p-1 rounded-sm border border-white/10 text-[10px] font-black uppercase tracking-tighter min-w-max">
                <button 
                  onClick={() => setSortBy("popular")}
                  className={`px-3 py-1.5 rounded-sm transition-all ${sortBy === "popular" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                >
                  POPULAIRES
                </button>
                <button 
                  onClick={() => setSortBy("recent")}
                  className={`px-3 py-1.5 rounded-sm transition-all ${sortBy === "recent" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                >
                  RÉCENTS
                </button>
              </div>
            </div>
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

        {/* CTA Section - Traffic to AchzodCoaching */}
        <section className="py-24 border-t border-white/5 bg-[#FCDD00]/[0.02]">
          <div className="mx-auto max-w-4xl px-4">
            <div className="flex flex-col md:flex-row items-center gap-10 bg-white/[0.03] border border-white/10 p-8 md:p-12 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCDD00]/10 blur-[60px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex-1 text-center md:text-left relative z-10">
                <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
                  [ OPTIMISATION MAXIMALE ]
                </p>
                <h2 className="mb-4 text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
                  PASSE AU NIVEAU <br />
                  <span className="text-[#FCDD00]">SUPÉRIEUR</span>
                </h2>
                <p className="mb-8 text-lg text-white/60">
                  Ne te contente pas de lire. Applique. Rejoins le coaching ACHZOD pour un protocole sur mesure : nutrition, entraînement, et bio-data.
                </p>
                <a 
                  href="https://www.achzodcoaching.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#FCDD00] text-black text-xs font-black uppercase tracking-[0.2em] hover:bg-white transition-all rounded-sm shadow-[0_0_20px_rgba(252,221,0,0.2)]"
                >
                  Démarrer mon coaching
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="hidden md:block w-1/3">
                <img 
                  src="https://cdn.prod.website-files.com/5fd0a9c447b7bb9814a00d71/6851ebc888d485c358317cfe_Ebook%20Anabolic%20Code%20Cover-min.jpg" 
                  alt="ACHZOD Coaching"
                  className="w-full h-full object-contain rotate-3 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
