import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-24">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h1 className="mb-4 text-3xl font-bold">Article non trouvé</h1>
            <p className="mb-8 text-muted-foreground">
              L'article que vous cherchez n'existe pas ou a été déplacé.
            </p>
            <Link href="/blog">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au blog
              </Button>
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
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Image */}
        <div className="relative h-[40vh] min-h-[300px] md:h-[50vh] w-full overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Article Content */}
        <article className="relative -mt-32 z-10">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-background p-6 md:p-10 shadow-lg border border-border"
            >
              {/* Back Link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au blog
              </Link>

              {/* Meta */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <Badge variant="secondary">{categoryLabel}</Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {article.readTime}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Title */}
              <h1 className="mb-6 text-3xl font-black tracking-tight md:text-4xl lg:text-5xl">
                {article.title}
              </h1>

              {/* Excerpt */}
              <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
                {article.excerpt}
              </p>

              {/* Author */}
              <div className="mb-8 flex items-center gap-3 pb-8 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{article.author}</div>
                  <div className="text-sm text-muted-foreground">
                    Coach & Auteur
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold mt-10 mb-4 text-foreground">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-bold mt-8 mb-3 text-foreground">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 text-muted-foreground leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 space-y-2 list-disc list-inside text-muted-foreground">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-4 space-y-2 list-decimal list-inside text-muted-foreground">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-muted-foreground">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-foreground">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-6">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>

              {/* Share */}
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Partager cet article</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        window.open(
                          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`,
                          "_blank"
                        )
                      }
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                          "_blank"
                        )
                      }
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-16 bg-muted/30">
            <div className="mx-auto max-w-7xl px-4">
              <h2 className="mb-8 text-2xl font-bold">Articles similaires</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/blog/${relatedArticle.slug}`}
                  >
                    <Card className="group h-full cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={relatedArticle.image}
                          alt={relatedArticle.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-5">
                        <h3 className="mb-2 font-bold line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedArticle.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {relatedArticle.readTime}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 bg-background">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="mb-4 text-2xl font-bold">
              Prêt à optimiser votre santé ?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Découvrez votre profil métabolique avec notre analyse complète.
            </p>
            <Link href="/offers/ultimate-scan">
              <Button size="lg" className="gap-2">
                Commencer l'analyse
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
