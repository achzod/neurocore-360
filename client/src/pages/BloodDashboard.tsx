import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Sidebar } from '@/components/ultrahuman/Sidebar';
import { RadialProgress } from '@/components/ultrahuman/RadialProgress';
import { MetricsRadar } from '@/components/ultrahuman/Charts';
import { ULTRAHUMAN_THEMES } from '@/components/ultrahuman/themes';
import { SectionContent, Theme, Metric } from '@/components/ultrahuman/types';
import { SCIENCE_DATA, CATEGORY_SCORES } from '@/data/blood-analysis-data';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Beaker,
  Heart,
  Menu,
  Shield,
  TrendingUp
} from 'lucide-react';

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

type CategoryKey = keyof typeof CATEGORY_SCORES;

const CATEGORY_ICONS: Record<CategoryKey, React.ElementType> = {
  Hormonal: TrendingUp,
  Metabolic: Activity,
  Inflammation: Shield,
  Liver: Beaker,
  Kidney: Beaker,
  Blood: Heart,
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatMarkerStatus = (status: string): string => {
  switch (status) {
    case 'Optimal':
      return 'Optimal';
    case 'Normal':
      return 'Normal';
    case 'Suboptimal':
      return 'Suboptimal';
    case 'Critical':
      return 'Critique';
    default:
      return status;
  }
};

const buildCategoryContent = (category: CategoryKey): string => {
  const markers = Object.values(SCIENCE_DATA).filter((m) => m.category === category);
  if (markers.length === 0) {
    return '<p>Aucun marqueur disponible pour cette categorie.</p>';
  }

  const rows = markers
    .map(
      (marker) => `
      <div style="border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; background: var(--surface-2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: var(--text);">${marker.name}</strong>
          <span style="color: var(--text-secondary); font-size: 12px;">${formatMarkerStatus(marker.status)}</span>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary); margin-bottom: 10px;">
          <span>${marker.value} ${marker.unit}</span>
          <span>Optimal: ${marker.optimalRange[0]}-${marker.optimalRange[1]}</span>
          <span>Normal: ${marker.normalRange[0]}-${marker.normalRange[1]}</span>
        </div>
        <p style="margin: 0 0 8px;">${marker.definition}</p>
        <p style="margin: 0 0 8px;">${marker.whyItMatters}</p>
        ${marker.recommendation ? `<p style="margin: 0;"><strong>Action:</strong> ${marker.recommendation}</p>` : ''}
      </div>
    `
    )
    .join('');

  return rows;
};

export default function BloodDashboard() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const metrics: Metric[] = useMemo(() => {
    return (Object.keys(CATEGORY_SCORES) as CategoryKey[]).map((category) => ({
      key: category.toLowerCase(),
      label: category,
      value: Math.round((CATEGORY_SCORES[category] / 100) * 10),
      max: 10,
      description: category,
    }));
  }, []);

  const sections: SectionContent[] = useMemo(() => {
    return (Object.keys(CATEGORY_SCORES) as CategoryKey[]).map((category) => {
      const markers = Object.values(SCIENCE_DATA).filter((m) => m.category === category);
      const suboptimal = markers.filter((m) => m.status === 'Suboptimal' || m.status === 'Critical').length;
      const chips = [
        `${markers.length} marqueurs`,
        `${suboptimal} a corriger`,
      ];
      return {
        id: `category-${category.toLowerCase()}`,
        title: category,
        subtitle: 'Lecture par biomarqueur',
        chips,
        content: buildCategoryContent(category),
      };
    });
  }, []);

  const navigationSections: SectionContent[] = useMemo(() => {
    return [{ id: 'dashboard', title: "Vue d'ensemble", content: '' }, ...sections];
  }, [sections]);

  const globalScore = useMemo(() => {
    const values = Object.values(CATEGORY_SCORES);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    return Math.round(avg);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg', currentTheme.colors.background);
    root.style.setProperty('--color-surface', currentTheme.colors.surface);
    root.style.setProperty('--color-border', currentTheme.colors.border);
    root.style.setProperty('--color-text', currentTheme.colors.text);
    root.style.setProperty('--color-text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--color-primary', currentTheme.colors.primary);
    root.style.setProperty('--color-grid', currentTheme.colors.grid);
    root.style.setProperty('--color-on-primary', currentTheme.type === 'dark' ? '#000' : '#fff');
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--text', currentTheme.colors.text);
    root.style.setProperty('--text-secondary', currentTheme.colors.textMuted);
    root.style.setProperty('--text-muted', currentTheme.colors.textMuted);
    root.style.setProperty('--surface-1', currentTheme.colors.surface);
    root.style.setProperty('--surface-2', currentTheme.colors.background);
    root.style.setProperty('--border', currentTheme.colors.border);
    root.style.setProperty('--accent-ok', currentTheme.colors.primary);
    root.style.setProperty('--accent-warning', currentTheme.colors.primary);
  }, [currentTheme]);

  useEffect(() => {
    const handleScroll = () => {
      if (!mainContentRef.current) return;
      const container = mainContentRef.current;
      const totalScroll = container.scrollTop;
      const windowHeight = container.clientHeight;
      const totalHeight = container.scrollHeight - windowHeight;
      const progress = totalHeight > 0 ? (totalScroll / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      const sectionsList = navigationSections.map(s => document.getElementById(s.id));
      const scrollPos = container.scrollTop + 200;
      for (let i = sectionsList.length - 1; i >= 0; i--) {
        const section = sectionsList[i];
        if (section && section.offsetTop <= scrollPos) {
          setActiveSection(navigationSections[i].id);
          break;
        }
      }
    };

    const container = mainContentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [navigationSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const primary = currentTheme.colors.primary;
  const primarySoft = withAlpha(primary, 0.12);

  return (
    <div
      className="ultrahuman-report min-h-screen flex"
      style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
    >
      <div className="fixed top-0 left-0 right-0 h-1 bg-black/50 z-50">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${scrollProgress}%`, backgroundColor: currentTheme.colors.primary }}
        />
      </div>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}
      >
        <Sidebar
          sections={navigationSections}
          activeSection={activeSection}
          onNavigate={scrollToSection}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName="Profil"
          auditType="BLOOD_ANALYSIS"
        />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main ref={mainContentRef} className="flex-1 overflow-y-auto h-screen">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
          style={{ backgroundColor: currentTheme.colors.surface }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <section id="dashboard" className="mb-16 scroll-mt-24">
            <div className="grid lg:grid-cols-2 gap-8 mb-10">
              <div
                className="flex flex-col items-center justify-center p-8 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
              >
                <RadialProgress
                  score={globalScore}
                  max={100}
                  subLabel="SCORE GLOBAL"
                  size={200}
                  strokeWidth={6}
                  color={currentTheme.colors.primary}
                />
                <p className="text-xs mt-4" style={{ color: currentTheme.colors.textMuted }}>
                  Version beta - dashboard en construction.
                </p>
              </div>

              <div
                className="p-6 rounded-sm border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Beaker className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
                  <h2 className="text-xl font-semibold">Radar systemique</h2>
                </div>
                <MetricsRadar data={metrics} color={currentTheme.colors.primary} />
                <div className="mt-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                  Lecture rapide des 6 panels clefs.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(CATEGORY_SCORES) as CategoryKey[]).map((category) => {
                const score = CATEGORY_SCORES[category];
                const Icon = CATEGORY_ICONS[category];
                const statusLabel = score >= 80 ? 'FORT' : score >= 65 ? 'MOYEN' : 'A AMELIORER';

                return (
                  <div
                    key={category}
                    className="rounded p-4"
                    style={{ backgroundColor: currentTheme.colors.surface, border: `1px solid ${currentTheme.colors.border}` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-5 h-5" style={{ color: primary }} />
                      <span className="text-xs px-2 py-1 rounded-full" style={{ color: primary, backgroundColor: primarySoft }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{score}%</div>
                    <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {category}
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%`, backgroundColor: primary }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {sections.map((section, idx) => (
            <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-4 mb-6">
                <span
                  className="text-4xl font-bold"
                  style={{ color: withAlpha(currentTheme.colors.textMuted, 0.2) }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  {section.subtitle && (
                    <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {section.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {section.chips && section.chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {section.chips.map((chip) => (
                    <span
                      key={chip}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${currentTheme.colors.primary}20`, color: currentTheme.colors.primary }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <div
                className={`p-6 rounded-sm border prose max-w-none ${currentTheme.type === 'dark' ? 'prose-invert' : ''}`}
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border, color: currentTheme.colors.text }}
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>
      </main>

      <button
        onClick={() => scrollToSection('dashboard')}
        className="hidden lg:flex fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: currentTheme.colors.surface }}
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      <button
        onClick={() => scrollToSection(sections[0]?.id || 'dashboard')}
        className="hidden lg:flex fixed bottom-6 right-16 p-3 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ backgroundColor: currentTheme.colors.primary, color: currentTheme.type === 'dark' ? '#000' : '#fff' }}
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  );
}
