import { useEffect, useState, lazy, Suspense, memo } from "react";
import { useParams } from "wouter";
import { Sidebar } from "@/components/ultrahuman/Sidebar";
import { ULTRAHUMAN_THEMES } from "@/components/ultrahuman/themes";
import { SectionContent, Theme } from "@/components/ultrahuman/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BloodThemeProvider } from "@/components/blood/BloodThemeContext";
import { AlertTriangle, Loader2, Menu } from "lucide-react";

// Custom hooks
import { useBloodReport } from "./BloodAnalysisDashboard/hooks/useBloodReport";
import { useBloodCalculations } from "./BloodAnalysisDashboard/hooks/useBloodCalculations";
import { useReportSections } from "./BloodAnalysisDashboard/hooks/useReportSections";

// Skeleton loaders
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { BiomarkersSkeleton } from "@/components/skeletons/BiomarkersSkeleton";
import { ReportSkeleton } from "@/components/skeletons/ReportSkeleton";

// Lazy-loaded tab components for better code splitting
const OverviewTab = lazy(() => import("./BloodAnalysisDashboard/tabs/OverviewTab").then(m => ({ default: m.OverviewTab })));
const BiomarkersTab = lazy(() => import("./BloodAnalysisDashboard/tabs/BiomarkersTab").then(m => ({ default: m.BiomarkersTab })));
const ReportSectionTab = lazy(() => import("./BloodAnalysisDashboard/tabs/ReportSectionTab").then(m => ({ default: m.ReportSectionTab })));

const THEMES: Theme[] = ULTRAHUMAN_THEMES;

// Force light theme - find "Claude Creme" or "Titanium Light"
const DEFAULT_THEME = THEMES.find(t => t.id === "metabolic") || THEMES.find(t => t.type === "light") || THEMES[1];

const BloodAnalysisDashboardInner = memo(function BloodAnalysisDashboardInner() {
  const { reportId } = useParams<{ reportId: string }>();
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_THEME);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch report data using React Query
  const { data: report, isLoading: loading, error: queryError } = useBloodReport(reportId);
  const error = queryError ? (queryError as Error).message : null;

  // Calculate derived data
  const { normalizedMarkers, panelGroups, globalScore, radarData } = useBloodCalculations(report || null);

  // Parse AI report sections
  const { reportSections, axeSections, normalizeSectionId } = useReportSections(report?.aiReport);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-bg", currentTheme.colors.background);
    root.style.setProperty("--color-surface", currentTheme.colors.surface);
    root.style.setProperty("--color-border", currentTheme.colors.border);
    root.style.setProperty("--color-text", currentTheme.colors.text);
    root.style.setProperty("--color-text-muted", currentTheme.colors.textMuted);
    root.style.setProperty("--color-primary", currentTheme.colors.primary);
    root.style.setProperty("--color-grid", currentTheme.colors.grid);
    root.style.setProperty("--color-on-primary", currentTheme.type === "dark" ? "#000" : "#fff");
    root.style.setProperty("--primary", currentTheme.colors.primary);
    root.style.setProperty("--text", currentTheme.colors.text);
    root.style.setProperty("--text-secondary", currentTheme.colors.textMuted);
    root.style.setProperty("--text-muted", currentTheme.colors.textMuted);
    root.style.setProperty("--surface-1", currentTheme.colors.surface);
    root.style.setProperty("--surface-2", currentTheme.colors.background);
    root.style.setProperty("--border", currentTheme.colors.border);
    root.style.setProperty("--accent-ok", currentTheme.colors.primary);
    root.style.setProperty("--accent-warning", currentTheme.colors.primary);
  }, [currentTheme]);

  const summary = report?.analysis?.summary || { optimal: [], watch: [], action: [] };

  const sidebarSections: SectionContent[] = [
    { id: "overview", title: "Overview", subtitle: "Vue d'ensemble", content: "" },
    { id: "biomarkers", title: "Biomarqueurs", subtitle: "Lecture par marqueur", content: "" },
    { id: "synthese", title: "Synthèse", subtitle: "Executive summary", content: "" },
    { id: "donnees", title: "Données & Tests", subtitle: "Limites & manquants", content: "" },
    { id: "axes", title: "Analyse Axes", subtitle: "Lecture par systèmes", content: "" },
    { id: "plan", title: "Plan 90j", subtitle: "Action concrète", content: "" },
    { id: "protocoles", title: "Protocoles", subtitle: "Nutrition & supps", content: "" },
    { id: "annexes", title: "Annexes", subtitle: "Détails techniques", content: "" },
  ];

  const clientName = report?.profile?.prenom
    ? String(report?.profile?.prenom)
    : report?.email
    ? report.email.split("@")[0]
    : "Profil";

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.colors.background }}>
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto" style={{ color: currentTheme.colors.primary }} />
          <p className="text-lg font-semibold" style={{ color: currentTheme.colors.text }}>Impossible de charger le rapport</p>
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ultrahuman-report min-h-screen flex"
      style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
    >
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 border-r z-40 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: currentTheme.colors.background, borderColor: currentTheme.colors.border }}
      >
        <Sidebar
          sections={sidebarSections}
          activeSection={activeTab}
          onNavigate={setActiveTab}
          themes={THEMES}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          clientName={clientName}
          auditType="BLOOD_ANALYSIS"
        />
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            backgroundColor: currentTheme.type === 'dark'
              ? 'rgba(0, 0, 0, 0.5)'
              : 'rgba(0, 0, 0, 0.2)'
          }}
        />
      )}

      <main className="flex-1 overflow-y-auto h-screen">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
          style={{ backgroundColor: currentTheme.colors.surface }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textMuted }}>
              Blood Analysis
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">Tableau de bord biomarqueurs</h1>
            <p className="text-xs sm:text-sm mt-2" style={{ color: currentTheme.colors.textMuted }}>
              Lecture premium de ton bilan sanguin, ranges optimaux et axes de correction.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-6 overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
              <TabsList className="inline-flex lg:grid lg:grid-cols-8 gap-2 h-auto w-full lg:w-full p-2 min-w-max lg:min-w-0">
                <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
                <TabsTrigger value="biomarkers" className="whitespace-nowrap">Biomarqueurs</TabsTrigger>
                <TabsTrigger value="synthese" className="whitespace-nowrap">Synthèse</TabsTrigger>
                <TabsTrigger value="donnees" className="whitespace-nowrap">Données & Tests</TabsTrigger>
                <TabsTrigger value="axes" className="whitespace-nowrap">Analyse Axes</TabsTrigger>
                <TabsTrigger value="plan" className="whitespace-nowrap">Plan 90j</TabsTrigger>
                <TabsTrigger value="protocoles" className="whitespace-nowrap">Protocoles</TabsTrigger>
                <TabsTrigger value="annexes" className="whitespace-nowrap">Annexes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <Suspense fallback={<DashboardSkeleton />}>
                <OverviewTab
                  globalScore={globalScore}
                  normalizedMarkers={normalizedMarkers}
                  panelGroups={panelGroups}
                  summary={summary}
                  currentTheme={currentTheme}
                  setActiveTab={setActiveTab}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="biomarkers">
              <Suspense fallback={<BiomarkersSkeleton />}>
                <BiomarkersTab
                  panelGroups={panelGroups}
                  currentTheme={currentTheme}
                />
              </Suspense>
            </TabsContent>

            {/* Synthèse: Synthese executive + Tableau de bord */}
            <TabsContent value="synthese">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={['synthese-executive', 'tableau-de-bord-scores-priorites', 'potentiel-recomposition']}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>

            {/* Données & Tests: Qualité données + Marqueurs manquants */}
            <TabsContent value="donnees">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={['qualite-des-donnees-limites', 'marqueurs-manquants-recommandations-de-tests', 'tests-complementaires']}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>

            {/* Analyse Axes: Tous les axes */}
            <TabsContent value="axes">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={[
                    'lecture-compartimentee-par-axes',
                    ...axeSections,
                    'interconnexions-majeures',
                    'deep-dive'
                  ]}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>

            {/* Plan 90j */}
            <TabsContent value="plan">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={['plan-90-jours', 'plan-action']}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>

            {/* Protocoles: Nutrition + Supplements */}
            <TabsContent value="protocoles">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={['protocole-nutrition', 'protocole-supplements', 'nutrition-entrainement', 'supplementation']}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>

            {/* Annexes */}
            <TabsContent value="annexes">
              <Suspense fallback={<ReportSkeleton />}>
                <ReportSectionTab
                  sectionIds={['annexes', 'bibliographie']}
                  reportSections={reportSections}
                  aiReport={report?.aiReport}
                  currentTheme={currentTheme}
                  normalizeSectionId={normalizeSectionId}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
});

export default function BloodAnalysisDashboard() {
  return (
    <BloodThemeProvider>
      <BloodAnalysisDashboardInner />
    </BloodThemeProvider>
  );
}
