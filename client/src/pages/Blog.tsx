import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import {
  BLOG_ARTICLES,
  BLOG_CATEGORIES,
  getFeaturedArticles,
  getArticlesByCategory,
} from "@/data/blogArticles";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("all");
  const featuredArticles = getFeaturedArticles();
  const filteredArticles = getArticlesByCategory(activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
                Le Blog APEX LABS
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Articles, guides et insights sur l'optimisation de votre santé,
                sommeil, nutrition et performance.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <section className="py-12 bg-background">
            <div className="mx-auto max-w-7xl px-4">
              <h2 className="mb-8 text-2xl font-bold">Articles à la une</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {featuredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/blog/${article.slug}`}>
                      <Card className="group h-full cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <CardContent className="p-5">
                          <Badge variant="secondary" className="mb-3">
                            {BLOG_CATEGORIES.find((c) => c.id === article.category)?.label || article.category}
                          </Badge>
                          <h3 className="mb-2 text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Category Filter */}
        <section className="py-8 border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-wrap items-center gap-2">
              {BLOG_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className="rounded-full"
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* All Articles */}
        <section className="py-12 bg-background">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-2xl font-bold">
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
                    <Card className="group h-full cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-5">
                        <Badge variant="secondary" className="mb-3">
                          {BLOG_CATEGORIES.find((c) => c.id === article.category)?.label || article.category}
                        </Badge>
                        <h3 className="mb-2 text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Lire <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucun article dans cette catégorie pour le moment.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-primary/5">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold">
              Restez informé
            </h2>
            <p className="mb-6 text-muted-foreground">
              Recevez nos derniers articles et conseils d'optimisation directement dans votre boîte mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm"
              />
              <Button>S'abonner</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
