import React, { useState, useEffect, useRef } from 'react';
import { REPORT_DATA } from './data';
import { Sidebar } from './components/Sidebar';
import { RadialProgress } from './components/RadialProgress';
import { MetricsRadar, ProjectionChart } from './components/Charts';
import { Menu, X, ChevronRight, Activity, Zap, Brain, ArrowUpRight, ArrowDown, ArrowUp, Search, Check, AlertCircle } from 'lucide-react';
import { Theme } from './types';

// --- THEME DEFINITIONS ---
const THEMES: Theme[] = [
  { 
    id: 'ultrahuman', 
    name: 'M1 Black', 
    type: 'dark',
    colors: {
      primary: '#E1E1E1',
      background: '#000000',
      surface: '#09090B',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#EDEDED',
      textMuted: '#71717A',
      grid: 'rgba(255, 255, 255, 0.08)',
      glow: 'rgba(255, 255, 255, 0.1)'
    }
  },
  { 
    id: 'metabolic', 
    name: 'Metabolic Fire', 
    type: 'dark',
    colors: {
      primary: '#FF4F00',
      background: '#050505',
      surface: '#111111', 
      border: 'rgba(255, 79, 0, 0.2)',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      grid: 'rgba(255, 79, 0, 0.08)',
      glow: 'rgba(255, 79, 0, 0.25)'
    }
  },
  { 
    id: 'titanium', 
    name: 'Titanium Light', 
    type: 'light',
    colors: {
      primary: '#000000', 
      background: '#F2F2F2', 
      surface: '#FFFFFF', 
      border: 'rgba(0, 0, 0, 0.08)',
      text: '#171717', 
      textMuted: '#737373', 
      grid: 'rgba(0, 0, 0, 0.04)',
      glow: 'rgba(0, 0, 0, 0.05)'
    }
  },
  { 
    id: 'organic', 
    name: 'Sand Stone', 
    type: 'light',
    colors: {
      primary: '#A85A32', 
      background: '#F0EFE9', 
      surface: '#E6E4DD', 
      border: 'rgba(168, 90, 50, 0.1)',
      text: '#292524', 
      textMuted: '#78716C', 
      grid: 'rgba(168, 90, 50, 0.05)',
      glow: 'rgba(168, 90, 50, 0.1)'
    }
  }
];

// --- COMPONENTS ---

const PricingCard = ({ 
  name, 
  price, 
  features, 
  highlight = false, 
  primaryColor, 
  url 
}: { 
  name: string, 
  price: string, 
  features: string[], 
  highlight?: boolean, 
  primaryColor: string,
  url: string
}) => (
  <div className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group h-full
    ${highlight 
      ? 'bg-[var(--color-surface)] border-[var(--color-primary)] shadow-lg' 
      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
    }`}
  >
    {highlight && (
      <div className="absolute top-0 right-0 bg-[var(--color-primary)] text-[var(--color-background)] text-[10px] font-bold px-3 py-1 rounded-bl-lg">
        RECOMMANDÉ
      </div>
    )}
    
    <h3 className="text-xl font-bold mb-2 tracking-tight">{name}</h3>
    <div className="text-3xl font-mono font-bold mb-6 flex items-baseline gap-2">
      {price} <span className="text-sm text-[var(--color-text-muted)] font-sans font-normal">/ mois</span>
    </div>
    
    <div className="flex-1 space-y-3 mb-8">
      {features.map((feature, i) => (
        <div key={i} className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]">
          <Check size={16} style={{ color: primaryColor }} className="shrink-0 mt-0.5" />
          <span>{feature}</span>
        </div>
      ))}
    </div>

    <div className="space-y-3">
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-mono text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
            <span>Scan 49€</span>
            <span style={{ color: primaryColor }}>DÉDUIT (-49€)</span>
        </div>
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full py-3 rounded-lg text-sm font-bold text-center transition-all
            ${highlight 
              ? 'bg-[var(--color-text)] text-[var(--color-background)] hover:opacity-90' 
              : 'border border-[var(--color-border)] hover:bg-[var(--color-border)]'
            }`}
        >
          CANDIDATER
        </a>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(REPORT_DATA.sections[0].id);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg', currentTheme.colors.background);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-grid', currentTheme.colors.grid);
  }, [currentTheme]);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const container = mainContentRef.current;
      
      // Calculate Scroll Progress
      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      // Scroll Spy for Active Section
      const headings = REPORT_DATA.sections.map(s => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 300; 
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPos) {
          setActiveSection(REPORT_DATA.sections[i].id);
          break;
        }
      }
    };
    const container = mainContentRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const navigateChapter = (direction: 'next' | 'prev') => {
    const currentIndex = REPORT_DATA.sections.findIndex(s => s.id === activeSection);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Bounds check
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= REPORT_DATA.sections.length) nextIndex = REPORT_DATA.sections.length - 1;
    
    const nextId = REPORT_DATA.sections[nextIndex].id;
    scrollToSection(nextId);
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden selection:bg-white/20 relative bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-500">
      
      {/* READING PROGRESS BAR (Top Fixed) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-[var(--color-border)]">
        <div 
          className="h-full transition-all duration-150 ease-out"
          style={{ 
            width: `${scrollProgress}%`, 
            backgroundColor: currentTheme.colors.primary 
          }}
        />
      </div>

      {/* Background Grid */}
      <div 
        className="tech-grid"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${currentTheme.colors.grid} 1px, transparent 1px),
            linear-gradient(to bottom, ${currentTheme.colors.grid} 1px, transparent 1px)
          `
        }}
      />
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} bg-[var(--color-bg)] lg:bg-transparent border-r border-[var(--color-border)] flex flex-col`}>
        <div className="p-8 pb-4 pt-10 relative">
           {/* Beta Badge in Sidebar */}
           <div className="absolute top-4 left-8 text-[9px] font-bold uppercase tracking-widest text-[var(--color-primary)] border border-[var(--color-primary)] px-2 py-0.5 rounded-full opacity-70">
              Beta Test • Oct 2025
           </div>
           
           <div className="flex items-center gap-2 mb-1 mt-4">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }}></div>
             <span className="text-xs font-mono font-bold tracking-widest uppercase">Neurocore 360</span>
           </div>
           <h1 className="text-xl font-bold tracking-tight">Audit: Lucas</h1>
           <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">17 SECTIONS • PREMIUM ANALYSIS</div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Sidebar 
            sections={REPORT_DATA.sections} 
            activeSection={activeSection} 
            onNavigate={scrollToSection}
            themes={THEMES}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
          />
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 backdrop-blur-sm">
           <div className="flex items-center justify-between gap-4">
              <button className="flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors rounded">
                Export PDF
              </button>
              <button className="flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 transition-opacity rounded">
                Share
              </button>
           </div>
        </div>
      </aside>

      {/* Main Scrollable Area */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto relative z-10 scroll-smooth no-scrollbar">
        
        {/* Floating Navigation Controls (Bottom Right) */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
           <button 
             onClick={() => scrollToSection('dashboard')}
             className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-all shadow-xl"
             title="Back to Top"
           >
             <ArrowUp size={16} />
           </button>
           <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full shadow-xl overflow-hidden">
             <button 
               onClick={() => navigateChapter('prev')}
               className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-border)] transition-colors text-[var(--color-text)]"
               title="Previous Chapter"
             >
               <ArrowUp size={16} />
             </button>
             <div className="h-[1px] bg-[var(--color-border)] w-full"></div>
             <button 
               onClick={() => navigateChapter('next')}
               className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-border)] transition-colors text-[var(--color-text)]"
               title="Next Chapter"
             >
               <ArrowDown size={16} />
             </button>
           </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)] px-4 py-4 flex items-center justify-between">
           <span className="font-bold text-sm tracking-widest uppercase">Audit Lucas</span>
           <button onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 lg:p-12 space-y-12 lg:space-y-32">

          {/* Header Section (ID for scrolling back to top) */}
          <div id="dashboard" className="pt-8 lg:pt-12 animate-fade-in">
             <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                 <div className="space-y-6 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500"></span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Audit Expert</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-medium tracking-tighter leading-[0.9]">
                      Lucas, <br/>
                      <span style={{ color: currentTheme.colors.textMuted }}>voici ton audit.</span>
                    </h1>
                    <p className="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-lg">
                      60/100 c'est une base solide. Optimiser ton stress va tout changer.
                    </p>
                 </div>
                 
                 <div className="flex gap-4 items-end">
                    <div className="text-right hidden md:block">
                      <div className="text-3xl font-bold font-mono">60<span className="text-lg opacity-50">/100</span></div>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Global Score</div>
                    </div>
                 </div>
             </header>

             {/* GIFT BANNER */}
             <div className="mb-16 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] to-transparent p-4 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 bg-[var(--color-primary)] transition-opacity group-hover:opacity-15"></div>
                <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center z-10 shrink-0">
                  <Zap size={20} style={{ color: currentTheme.colors.primary }} />
                </div>
                <div className="z-10 flex-1">
                   <p className="text-sm font-medium">
                     Ton audit <strong style={{ color: currentTheme.colors.primary }}>PREMIUM</strong> — L'investissement de <strong>49€</strong> est 100% déduit de ton coaching.
                   </p>
                </div>
             </div>

             {/* DASHBOARD GRID */}
             <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Main Score */}
                <div className="lg:col-span-1 lg:row-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                     <Activity size={80} />
                   </div>
                   <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Performance Globale</h3>
                   <div className="flex items-center justify-center py-8">
                      <RadialProgress 
                        score={REPORT_DATA.globalScore} 
                        max={10} 
                        label="Score" 
                        size={180} 
                        strokeWidth={4} 
                        color={currentTheme.colors.primary} 
                      />
                   </div>
                   <div className="flex items-center justify-center">
                     <span className="text-xs font-medium px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">BASE SOLIDE</span>
                   </div>
                </div>

                {/* Radar */}
                <div className="lg:col-span-2 lg:row-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-1 relative group">
                   <div className="absolute top-6 left-6 z-10">
                     <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Balance Systémique</h3>
                   </div>
                   <div className="h-full w-full min-h-[300px] flex items-center justify-center pt-8">
                     <MetricsRadar data={REPORT_DATA.metrics} color={currentTheme.colors.primary} />
                   </div>
                </div>

                {/* KPIs */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--color-text-muted)] transition-colors cursor-default">
                   <div className="flex justify-between items-start">
                      <Brain className="text-[var(--color-text-muted)]" size={20} />
                      <span className="text-[10px] font-mono bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">CRITIQUE</span>
                   </div>
                   <div>
                      <div className="text-2xl font-medium mt-4">4.5<span className="text-sm text-[var(--color-text-muted)]">/10</span></div>
                      <div className="text-xs font-mono uppercase text-[var(--color-text-muted)] mt-1">Système Nerveux</div>
                   </div>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--color-text-muted)] transition-colors cursor-default">
                   <div className="flex justify-between items-start">
                      <Zap className="text-[var(--color-text-muted)]" size={20} />
                      <span className="text-[10px] font-mono bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">FORT</span>
                   </div>
                   <div>
                      <div className="text-2xl font-medium mt-4">8.5<span className="text-sm text-[var(--color-text-muted)]">/10</span></div>
                      <div className="text-xs font-mono uppercase text-[var(--color-text-muted)] mt-1">Sommeil</div>
                   </div>
                </div>

                 {/* Trend Graph */}
                 <div className="lg:col-span-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-full md:w-1/3">
                      <h3 className="text-sm font-bold text-[var(--color-primary)] mb-2 flex items-center gap-2">
                         <ArrowUpRight size={16} /> Potentiel Inexploité
                       </h3>
                       <p className="text-sm text-[var(--color-text-muted)]">
                         Actuellement à 35% de ton potentiel. En débloquant le système nerveux, la projection montre une atteinte de 95% en 90 jours.
                       </p>
                    </div>
                    <div className="w-full md:w-2/3 h-[150px]">
                      <ProjectionChart color={currentTheme.colors.primary} />
                    </div>
                 </div>
             </section>
          </div>

          {/* LONG FORM CONTENT STREAM */}
          <div className="space-y-0 relative">
            {/* Vertical Line Guide */}
            <div className="absolute left-0 lg:left-[240px] top-0 bottom-0 w-[1px] bg-[var(--color-border)] hidden lg:block"></div>

            {REPORT_DATA.sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="scroll-mt-32 group relative pb-24 lg:pb-32">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-24">
                  
                  {/* Sticky Header / Metadata */}
                  <div className="lg:w-[240px] flex-shrink-0">
                    <div className="sticky top-24 pr-8 lg:text-right">
                      <span className="font-mono text-4xl lg:text-5xl font-bold text-[var(--color-border)] group-hover:text-[var(--color-text-muted)] transition-colors block mb-2 opacity-30">
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <h2 className="text-xl font-bold tracking-tight mb-2 text-[var(--color-text)] leading-tight">
                        {section.title}
                      </h2>
                      {section.subtitle && (
                        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: currentTheme.colors.primary }}>
                          {section.subtitle}
                        </p>
                      )}
                      {section.chips && (
                        <div className="flex flex-wrap lg:justify-end gap-2 mt-4">
                          {section.chips.map(chip => (
                            <span key={chip} className="px-2 py-1 text-[9px] font-mono uppercase border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-lg max-w-none prose-invert
                        prose-p:text-[var(--color-text-muted)] prose-p:text-[17px] prose-p:leading-relaxed prose-p:font-normal
                        prose-headings:text-[var(--color-text)] prose-headings:font-medium prose-headings:tracking-tight
                        prose-strong:text-[var(--color-text)] prose-strong:font-semibold
                        prose-ul:text-[var(--color-text-muted)] prose-li:marker:text-[var(--color-primary)]">
                        <div dangerouslySetInnerHTML={{ __html: section.content }} />
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* PRICING / COACHING SECTION */}
          <section id="offers" className="pb-32 border-t border-[var(--color-border)] pt-24">
             <div className="text-center mb-16">
               <h2 className="text-3xl font-bold mb-4 tracking-tight">Passe à l'action</h2>
               <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
                 Les plans génériques ne fonctionnent pas. Tu as besoin d'un système de pilotage complet.
                 Ton Anabolic Scan de 49€ est un crédit immédiat.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PricingCard 
                  name="Starter"
                  price="150€"
                  features={["Plan 8 semaines sur-mesure", "Bilan à 4 et 8 semaines", "Autonomie complète"]}
                  primaryColor={currentTheme.colors.primary}
                  url="https://www.achzodcoaching.com/coaching-starter"
                />
                <PricingCard 
                  name="Essential"
                  price="200€"
                  features={["Suivi WhatsApp 5j/7", "Ajustements hebdo", "Nutrition calibrée"]}
                  primaryColor={currentTheme.colors.primary}
                  url="https://www.achzodcoaching.com/coaching-essential"
                />
                <PricingCard 
                  name="Elite"
                  price="350€"
                  features={["Calls Visio Hebdo", "Support Prioritaire 7j/7", "Biofeedback avancé"]}
                  highlight={true}
                  primaryColor={currentTheme.colors.primary}
                  url="https://www.achzodcoaching.com/coaching-elite"
                />
             </div>
          </section>
          
          <footer className="py-24 border-t border-[var(--color-border)] flex flex-col md:flex-row justify-between items-start gap-8">
             <div>
                <h4 className="font-bold text-lg mb-2 tracking-tight">Neurocore 360</h4>
                <p className="text-[var(--color-text-muted)] text-sm max-w-xs">
                  Achzod Coaching - Excellence · Science · Transformation
                </p>
             </div>
             <div className="text-right">
               <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                 Confidential Report • {new Date().getFullYear()}
               </p>
             </div>
          </footer>

        </div>
      </main>
    </div>
  );
};

export default App;