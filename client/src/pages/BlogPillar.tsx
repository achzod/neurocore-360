import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Calendar, ChevronLeft, Clock } from "lucide-react";
import { type BlogArticle } from "@/data/blogTypes";

type Pillar = {
  slug: string;
  label: string;
  title: string;
  description: string;
  offerHref: string;
  offerLabel: string;
  keywords: RegExp;
};

const PILLARS: Pillar[] = [
  {
    slug: "perte-de-gras",
    label: "Perte de gras",
    title: "Perte de gras : métabolisme, nutrition et progression",
    description:
      "Articles APEXLABS pour comprendre pourquoi la perte de gras bloque : calories, glycémie, sommeil, stress, NEAT, digestion et signaux hormonaux.",
    offerHref: "/offers/discovery-scan?utm_source=blog&utm_medium=pillar_cta&utm_campaign=fat_loss_pillar",
    offerLabel: "Faire le Discovery Scan",
    keywords: /perte de gras|maigr|seche|sèche|cut|coupe|calorie|recomposition|glyc|insuline|metabol|métabol|ventre|graisse|poids/i,
  },
  {
    slug: "testosterone-hormones",
    label: "Testostérone & hormones",
    title: "Testostérone et hormones : lire les vrais signaux",
    description:
      "Guides sur testostérone, cortisol, thyroïde, libido, récupération et hormones pour relier les symptômes, l'entraînement et les données.",
    offerHref: "/offers/anabolic-bioscan?utm_source=blog&utm_medium=pillar_cta&utm_campaign=hormone_pillar",
    offerLabel: "Faire l'Anabolic Bioscan",
    keywords: /testost|hormone|cortisol|thyro|libido|estradiol|igf|anabol|récup|recup|stress/i,
  },
  {
    slug: "bilan-sanguin",
    label: "Bilan sanguin",
    title: "Bilan sanguin : biomarqueurs pour performance et santé",
    description:
      "Articles pour savoir quels marqueurs regarder : glycémie, lipides, CRP, ferritine, vitamine D, foie, reins, thyroïde et inflammation.",
    offerHref: "/offers/blood-analysis?utm_source=blog&utm_medium=pillar_cta&utm_campaign=blood_pillar",
    offerLabel: "Analyser mon bilan",
    keywords: /bilan sanguin|biomarqueur|prise de sang|glyc|cholest|ldl|hdl|foie|rein|crp|ferritine|vitamine d|insuline|inflammation/i,
  },
  {
    slug: "peptides-peds",
    label: "Peptides & PEDs",
    title: "Peptides, SARMs et PEDs : risques, logique et monitoring",
    description:
      "Analyses éducatives sur peptides, SARMs, HGH, IGF-1, bénéfices supposés, limites, risques et suivi nécessaire avant toute décision.",
    offerHref: "/offers/peptides-engine?utm_source=blog&utm_medium=pillar_cta&utm_campaign=peptides_pillar",
    offerLabel: "Voir Peptides Engine",
    keywords: /peptide|sarm|peds|hgh|igf|mk-677|rad-140|lgd|ostarine|pct|steroid|stéro/i,
  },
];

function matchPillar(article: BlogArticle, pillar: Pillar) {
  return pillar.keywords.test(`${article.slug} ${article.title} ${article.excerpt} ${article.category}`);
}

export default function BlogPillar() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const pillar = useMemo(() => PILLARS.find((p) => p.slug === slug), [slug]);
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/blog-articles.json")
      .then((res) => res.json())
      .then((data: BlogArticle[]) => {
        if (active) setArticles(data);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pillarArticles = useMemo(() => {
    if (!pillar) return [];
    return articles
      .filter((article) => matchPillar(article, pillar))
      .sort((a, b) => ((b as any).priority ?? 0) - ((a as any).priority ?? 0))
      .slice(0, 36);
  }, [articles, pillar]);

  useEffect(() => {
    if (!pillar) return;
    document.title = `${pillar.label} | Guides APEXLABS by Achzod`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", pillar.description);
  }, [pillar]);

  if (!pillar) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Header />
        <main className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="mb-4 text-3xl font-bold">Pilier introuvable</h1>
          <Link href="/blog" className="inline-flex items-center gap-2 text-yellow-400">
            <ChevronLeft className="h-4 w-4" />
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
      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <Link href="/" className="hover:text-white/80">Accueil</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white/80">Blog</Link>
          <span>/</span>
          <span className="text-white/70">{pillar.label}</span>
        </nav>

        <section className="mb-14 max-w-4xl">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-yellow-400">Pilier APEXLABS</p>
          <h1 className="mb-5 text-4xl font-bold leading-tight md:text-6xl">{pillar.title}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-white/65 md:text-lg">{pillar.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={pillar.offerHref} className="inline-flex items-center gap-2 rounded-sm bg-yellow-400 px-5 py-3 text-sm font-bold text-black hover:bg-yellow-300">
              {pillar.offerLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 hover:border-yellow-400/50 hover:text-yellow-400">
              Tous les articles
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Articles prioritaires</h2>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-sm bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {pillarArticles.map((article) => (
                <Link key={article.slug} href={`/blog/${article.slug}`} className="group block overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] hover:border-yellow-400/40">
                  <div className="aspect-video overflow-hidden">
                    <img src={article.image || article.imageUrl || "https://placehold.co/600x400/050505/ffffff?text=APEXLABS"} alt={article.title} loading="lazy" className="h-full w-full object-cover grayscale transition group-hover:scale-105 group-hover:grayscale-0" />
                  </div>
                  <div className="p-5">
                    <h3 className="mb-3 line-clamp-2 text-lg font-bold group-hover:text-yellow-400">{article.title}</h3>
                    <p className="mb-4 line-clamp-3 text-sm text-white/55">{article.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{article.date}</span>
                      {article.readTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
