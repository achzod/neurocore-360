import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
    articleUrl: "https://www.reuters.com/business/achzodcoaching-launches-elite-athlete-coaching-programs-2025-02-05/",
  },
  {
    name: "Apple News",
    logo: "https://logo.clearbit.com/apple.com",
    reach: "438M",
    category: "News",
    articleUrl: "https://apple.news/AchzodCoaching-Elite-Athlete-Programs",
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
    articleUrl: "https://www.theglobeandmail.com/business/article-achzodcoaching-elite-athlete-programs/",
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
    articleUrl: "https://www.barchart.com/story/news/achzodcoaching-launches-elite-athlete-coaching-programs",
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
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-8">
                [ PRESS & MEDIA ]
              </p>
              <h1 className="mb-6 text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em]">
                Ils parlent de moi
              </h1>
              <p className="mx-auto mb-12 max-w-2xl text-lg text-white/50">
                ACHZOD Coaching a été présenté dans plus de 300 médias internationaux,
                atteignant une audience potentielle de plus de 200 millions de personnes.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-4 rounded-sm bg-white/[0.03] border border-white/10"
                  >
                    <div className="text-3xl font-bold text-[#FCDD00]">{stat.value}</div>
                    <div className="text-sm text-white/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Media Logos Banner */}
        <section className="py-12 border-y border-white/5 bg-white/[0.01]">
          <div className="mx-auto max-w-7xl px-4">
            <p className="text-center text-xs font-mono uppercase tracking-[0.3em] text-[#FCDD00] mb-8">
              [ VU SUR ]
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
                  <span className="hidden text-lg font-bold text-white/50">{media.name}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Placements Grid */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
                [ PLACEMENTS PREMIUM ]
              </p>
              <h2 className="mb-4 text-3xl font-bold text-white">Placements Presse</h2>
              <p className="text-white/50">
                Cliquez pour lire l'article sur chaque média
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="group"
                >
                  <div className="h-full cursor-pointer rounded-sm bg-white/[0.03] border border-white/10 p-6 transition-all hover:border-[#FCDD00]/30 hover:-translate-y-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-sm bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={media.logo}
                          alt={media.name}
                          className="h-8 w-8 object-contain grayscale group-hover:grayscale-0 transition-all"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-xl font-bold text-[#FCDD00]">${media.name[0]}</span>`;
                            }
                          }}
                        />
                      </div>
                      <ExternalLink className="h-4 w-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-1 group-hover:text-[#FCDD00] transition-colors">
                      {media.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono uppercase tracking-wider text-[#FCDD00] bg-[#FCDD00]/10 border border-[#FCDD00]/20 rounded-sm">
                        {media.category}
                      </span>
                      <span className="text-xs text-white/40">
                        {media.reach} monthly visitors
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Podcasts Section */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Radio className="h-5 w-5 text-[#FCDD00]" />
                <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase">
                  [ PODCASTS ]
                </p>
              </div>
              <h2 className="text-3xl font-bold text-white">Podcasts</h2>
              <p className="mt-2 text-white/50">
                Disponible sur les principales plateformes de podcasts
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {PODCASTS.map((podcast, index) => (
                <motion.div
                  key={podcast.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center gap-3 p-6 rounded-sm bg-white/[0.03] border border-white/10 hover:border-[#FCDD00]/30 transition-colors"
                >
                  <img
                    src={podcast.logo}
                    alt={podcast.name}
                    className="h-12 w-12 object-contain grayscale hover:grayscale-0 transition-all"
                  />
                  <span className="font-semibold text-white">{podcast.name}</span>
                  <span className="text-xs text-white/40">{podcast.reach} users</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Media */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <Newspaper className="h-5 w-5 text-[#FCDD00]" />
                <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase">
                  [ + 300 AUTRES ]
                </p>
              </div>
              <h2 className="text-3xl font-bold text-white">+ 300 autres médias</h2>
              <p className="mt-2 text-white/50">
                Notre communiqué de presse a été repris par plus de 300 médias
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {ADDITIONAL_MEDIA.map((media, index) => (
                <motion.div
                  key={media.name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                  className="px-4 py-2 rounded-sm bg-white/[0.03] border border-white/10 text-sm font-medium text-white/60 hover:border-[#FCDD00]/30 hover:text-[#FCDD00] transition-colors"
                >
                  {media.name}
                </motion.div>
              ))}
              <div className="px-4 py-2 rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20 text-sm font-medium text-[#FCDD00]">
                +290 autres...
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <TrendingUp className="h-12 w-12 text-[#FCDD00] mx-auto mb-6" />
            <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
              [ REJOIGNEZ LE MOUVEMENT ]
            </p>
            <h2 className="mb-4 text-3xl font-bold text-white">
              Rejoignez le mouvement
            </h2>
            <p className="mb-8 text-lg text-white/50">
              Découvrez pourquoi les médias internationaux parlent de mon approche
              révolutionnaire du coaching athlétique.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://www.achzodcoaching.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-sm bg-[#FCDD00] text-black font-semibold hover:bg-[#FCDD00]/90 transition-colors"
              >
                Visiter achzodcoaching.com
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="mailto:press@achzodcoaching.com"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-sm border border-white/10 text-white font-semibold hover:border-[#FCDD00]/30 hover:text-[#FCDD00] transition-colors"
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
