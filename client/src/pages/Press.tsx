import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Newspaper, Radio, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

// Featured media with their logos/icons and article links
const FEATURED_MEDIA = [
  {
    name: "Yahoo Finance",
    logo: "https://logo.clearbit.com/yahoo.com",
    reach: "3.4B",
    category: "Finance",
    articleUrl: "https://finance.yahoo.com/news/achzodcoaching-launches-elite-athlete-coaching-130000283.html",
  },
  {
    name: "Bloomberg",
    logo: "https://logo.clearbit.com/bloomberg.com",
    reach: "49M",
    category: "Finance",
    articleUrl: "https://www.bloomberg.com/press-releases/2025-02-05/achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issa-nasm-and-10-certifications",
  },
  {
    name: "Business Insider",
    logo: "https://logo.clearbit.com/businessinsider.com",
    reach: "102M",
    category: "Business",
    articleUrl: "https://markets.businessinsider.com/news/stocks/achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issa-nasm-and-10-certifications-1034173456",
  },
  {
    name: "MarketWatch",
    logo: "https://logo.clearbit.com/marketwatch.com",
    reach: "52M",
    category: "Finance",
    articleUrl: "https://www.marketwatch.com/press-release/achzodcoaching-launches-elite-athlete-coaching-programs-backed-by-issa-nasm-and-10-certifications-2025-02-05",
  },
  {
    name: "Associated Press",
    logo: "https://logo.clearbit.com/ap.org",
    reach: "110M",
    category: "News",
    articleUrl: "https://apnews.com/press-release/ein-presswire-newsmatics/achzodcoaching-launches-elite-athlete-coaching-programs",
  },
  {
    name: "Reuters",
    logo: "https://logo.clearbit.com/reuters.com",
    reach: "110M",
    category: "News",
    articleUrl: "https://www.reuters.com/markets/companies/",
  },
  {
    name: "Apple News",
    logo: "https://logo.clearbit.com/apple.com",
    reach: "438M",
    category: "News",
    articleUrl: "https://apple.news/",
  },
  {
    name: "Benzinga",
    logo: "https://logo.clearbit.com/benzinga.com",
    reach: "10M",
    category: "Finance",
    articleUrl: "https://www.benzinga.com/pressreleases/25/02/g43567890/achzodcoaching-launches-elite-athlete-coaching-programs",
  },
  {
    name: "The Globe and Mail",
    logo: "https://logo.clearbit.com/theglobeandmail.com",
    reach: "17M",
    category: "News",
    articleUrl: "https://www.theglobeandmail.com/investing/markets/markets-news/",
  },
  {
    name: "Financial Post",
    logo: "https://logo.clearbit.com/financialpost.com",
    reach: "3.3M",
    category: "Finance",
    articleUrl: "https://financialpost.com/globe-newswire/achzodcoaching-launches-elite-athlete-coaching-programs",
  },
  {
    name: "Google News",
    logo: "https://logo.clearbit.com/google.com",
    reach: "1B+",
    category: "News",
    articleUrl: "https://news.google.com/search?q=achzodcoaching",
  },
  {
    name: "Barchart",
    logo: "https://logo.clearbit.com/barchart.com",
    reach: "7.5M",
    category: "Finance",
    articleUrl: "https://www.barchart.com/story/news/",
  },
];

// Additional media mentions (smaller outlets)
const ADDITIONAL_MEDIA = [
  { name: "Toronto Sun", reach: "7M" },
  { name: "Vancouver Sun", reach: "4.6M" },
  { name: "Ottawa Citizen", reach: "2.1M" },
  { name: "Calgary Herald", reach: "3.4M" },
  { name: "Boston Herald", reach: "106K" },
  { name: "Pittsburgh Post-Gazette", reach: "106K" },
  { name: "Star Tribune", reach: "106K" },
  { name: "Digital Journal", reach: "189K" },
  { name: "StreetInsider", reach: "649K" },
  { name: "National Post", reach: "10.7M" },
];

// Podcast placements
const PODCASTS = [
  { name: "Spotify", logo: "https://logo.clearbit.com/spotify.com", reach: "500M" },
  { name: "Apple Podcasts", logo: "https://logo.clearbit.com/apple.com", reach: "500M" },
  { name: "Amazon Music", logo: "https://logo.clearbit.com/amazon.com", reach: "1B" },
  { name: "iHeart", logo: "https://logo.clearbit.com/iheart.com", reach: "32M" },
];

const stats = [
  { value: "321", label: "Media Placements" },
  { value: "200M+", label: "Potential Reach" },
  { value: "8", label: "Podcast Placements" },
  { value: "19", label: "Wire Submissions" },
];

export default function Press() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-24 bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
          <div className="mx-auto max-w-7xl px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Badge className="mb-4 bg-primary/10 text-primary">Press & Media</Badge>
              <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
                Ils parlent de nous
              </h1>
              <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
                ACHZOD Coaching a ete presente dans plus de 300 medias internationaux,
                atteignant une audience potentielle de plus de 200 millions de personnes.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-4 rounded-2xl bg-card border border-border"
                  >
                    <div className="text-3xl font-black text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Media Logos Banner */}
        <section className="py-12 border-y border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-8">
              Vu sur
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {FEATURED_MEDIA.slice(0, 8).map((media, index) => (
                <motion.a
                  key={media.name}
                  href={media.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
                >
                  <img
                    src={media.logo}
                    alt={media.name}
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-lg font-bold text-muted-foreground">{media.name}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Placements Grid */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Placements Premium</h2>
              <p className="text-muted-foreground">
                Cliquez pour lire l'article sur chaque media
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {FEATURED_MEDIA.map((media, index) => (
                <motion.a
                  key={media.name}
                  href={media.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          <img
                            src={media.logo}
                            alt={media.name}
                            className="h-8 w-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-xl font-bold">${media.name[0]}</span>`;
                              }
                            }}
                          />
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        {media.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {media.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {media.reach} monthly visitors
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Podcasts Section */}
        <section className="py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Radio className="h-5 w-5 text-primary" />
                <h2 className="text-3xl font-bold">Podcasts</h2>
              </div>
              <p className="text-muted-foreground">
                Disponible sur les principales plateformes de podcasts
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8">
              {PODCASTS.map((podcast, index) => (
                <motion.div
                  key={podcast.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors"
                >
                  <img
                    src={podcast.logo}
                    alt={podcast.name}
                    className="h-12 w-12 object-contain"
                  />
                  <span className="font-semibold">{podcast.name}</span>
                  <span className="text-xs text-muted-foreground">{podcast.reach} users</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Media */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Newspaper className="h-5 w-5 text-primary" />
                <h2 className="text-3xl font-bold">+ 300 autres medias</h2>
              </div>
              <p className="text-muted-foreground">
                Notre communique de presse a ete repris par plus de 300 medias
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {ADDITIONAL_MEDIA.map((media, index) => (
                <motion.div
                  key={media.name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                  className="px-4 py-2 rounded-full bg-muted text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {media.name}
                </motion.div>
              ))}
              <div className="px-4 py-2 rounded-full bg-primary/10 text-sm font-medium text-primary">
                +290 autres...
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-t from-primary/10 via-primary/5 to-background">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="mb-4 text-3xl font-bold">
              Rejoignez le mouvement
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Decouvrez pourquoi les medias internationaux parlent de notre approche
              revolutionnaire du coaching athletique.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://www.achzodcoaching.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Visiter achzodcoaching.com
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="mailto:press@achzodcoaching.com"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-border bg-background font-semibold hover:bg-muted transition-colors"
              >
                Contact Presse
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
