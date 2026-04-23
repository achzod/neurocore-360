import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Clock, Calendar, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { BLOG_CATEGORIES, type BlogArticle } from "@/data/blogTypes";

const CATEGORY_INTROS: Record<string, string> = {
  musculation:
    "Programmation force/hypertrophie, périodisation, densité d'entraînement et recovery. Les articles qui expliquent POURQUOI ça marche, pas juste QUOI faire.",
  sarms:
    "Analyses objectives des SARMs et PEDs : mécanismes, risques, cycles raisonnés, monitoring sanguin. Lecture adulte, sans prosélytisme.",
  supplements:
    "Revues basées sur la science : ce qui marche vraiment, doses efficaces, timing, interactions, ce qui est du marketing.",
  hormones:
    "Testostérone, cortisol, thyroïde, IGF-1, estradiol. Comment les lire, les optimiser naturellement, quand intervenir médicalement.",
  sommeil:
    "Architecture du sommeil, HRV nocturne, chronotypes, protocoles de wind-down. Le premier levier de performance, trop souvent bâclé.",
  stress:
    "Cortisol chronique, système nerveux autonome, HRV et adaptations training. Pourquoi tu stagnes quand tu pousses trop fort.",
  nutrition:
    "Macros, timing, satiété, glycémie, micronutriments. Nutrition performance, pas régime minceur. Avec les chiffres qui comptent.",
  performance:
    "Force, puissance, endurance, capacité de travail. Programmer pour progresser, pas pour transpirer.",
  metabolisme:
    "Résistance à l'insuline, flexibilité métabolique, thermogénèse, NEAT. Comprendre ton moteur avant de toucher au carburant.",
  longevite:
    "Biomarqueurs du vieillissement, ApoB, CRP, zone cardio, VO2max, composition corporelle. Vieillir fort, pas juste vieillir.",
  biohacking:
    "Wearables, protocoles, tracking objectif. Ce qui se mesure se pilote. Filtrer le bruit, garder ce qui a des données derrière.",
  femmes:
    "Cycle menstruel, contraception, ménopause, entraînement par phase, anomalies hormonales. Protocoles calibrés sur la physiologie féminine.",
};

export default function BlogCategory() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";

  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categoryMeta = useMemo(
    () => BLOG_CATEGORIES.find((c) => c.id === slug),
    [slug],
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch("/blog-articles.json")
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger les articles.");
        const data = (await res.json()) as BlogArticle[];
        if (active) {
          setArticles(data);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : "Erreur chargement.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryArticles = useMemo(() => {
    return articles
      .filter((a) => a.category === slug)
      .sort((a, b) => {
        const aPri = (a as any).priority ?? 0;
        const bPri = (b as any).priority ?? 0;
        if (aPri !== bPri) return bPri - aPri;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [articles, slug]);

  useEffect(() => {
    if (!categoryMeta) return;
    const titleText = `${categoryMeta.label} , articles APEXLABS by Achzod`;
    const desc = CATEGORY_INTROS[slug] || `Tous les articles ${categoryMeta.label.toLowerCase()} par ACHZOD.`;
    document.title = titleText;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", desc);
  }, [categoryMeta, slug]);

  if (!categoryMeta) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Header />
        <main className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Catégorie introuvable</h1>
          <p className="text-white/60 mb-6">
            Cette catégorie n'existe pas dans le blog APEXLABS.
          </p>
          <Link href="/blog" className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
            <ChevronLeft className="w-4 h-4" />
            Retour au blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <nav className="text-xs text-white/50 mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-white/80">Accueil</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white/80">Blog</Link>
          <span>/</span>
          <span className="text-white/70">{categoryMeta.label}</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-400 mb-4">
            Catégorie
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {categoryMeta.label}
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-3xl leading-relaxed">
            {CATEGORY_INTROS[slug] || "Tous les articles dans cette catégorie."}
          </p>
          <p className="mt-4 text-sm text-white/40">
            {categoryArticles.length} article{categoryArticles.length > 1 ? "s" : ""}
          </p>
        </motion.div>

        {loadError && (
          <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 mb-8">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : categoryArticles.length === 0 ? (
          <p className="text-white/50">Aucun article dans cette catégorie pour l'instant.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {categoryArticles.map((article) => {
              const heroImage =
                article.image ||
                article.imageUrl ||
                "https://placehold.co/600x400/0a0a0a/ffffff?text=APEXLABS";
              return (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="group block rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-yellow-400/40 transition-colors"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={heroImage}
                      alt={article.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  </div>
                  <div className="p-5 space-y-3">
                    <h2 className="text-lg font-semibold leading-tight group-hover:text-yellow-400 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-white/55 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/40 pt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {article.date}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {article.readTime}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-yellow-400/80 group-hover:text-yellow-400">
                        Lire
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 pt-10 border-t border-white/10 flex flex-wrap gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-white/40 w-full mb-2">
            Autres catégories
          </span>
          {BLOG_CATEGORIES.filter((c) => c.id !== "all" && c.id !== slug).map((c) => (
            <Link
              key={c.id}
              href={`/blog/categorie/${c.id}`}
              className="px-4 py-2 rounded-full text-xs border border-white/10 text-white/70 hover:border-yellow-400/40 hover:text-yellow-400 transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
