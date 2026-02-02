import { Switch, Route, useLocation } from "wouter";
import { Suspense, lazy, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

const Questionnaire = lazy(() => import("@/pages/Questionnaire"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const DashboardRouter = lazy(() => import("@/pages/DashboardRouter"));
const BloodAnalysisReport = lazy(() => import("@/pages/BloodAnalysisReport"));
const AuditDetail = lazy(() => import("@/pages/AuditDetail"));
const AdminReviews = lazy(() => import("@/pages/AdminReviews"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Login = lazy(() => import("@/pages/auth/Login"));
const CheckEmail = lazy(() => import("@/pages/auth/CheckEmail"));
const Verify = lazy(() => import("@/pages/auth/Verify"));
const MentionsLegales = lazy(() => import("@/pages/MentionsLegales"));
const CGV = lazy(() => import("@/pages/CGV"));
const TestAudit = lazy(() => import("@/pages/TestAudit"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Report = lazy(() => import("@/pages/Report"));
const BloodAnalysisDashboard = lazy(() => import("@/pages/BloodAnalysisDashboard"));
const BloodAnalysisStart = lazy(() => import("@/pages/BloodAnalysisStart"));
const BloodAnalysisLegacyRedirect = lazy(() => import("@/pages/BloodAnalysisLegacyRedirect"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogArticle = lazy(() => import("@/pages/BlogArticle"));
const Press = lazy(() => import("@/pages/Press"));
const DeductionCoaching = lazy(() => import("@/pages/DeductionCoaching"));
const ApexLabs = lazy(() => import("@/pages/ApexLabs"));
const DiscoveryScanReport = lazy(() => import("@/pages/DiscoveryScanReport"));
const AnabolicScanReport = lazy(() => import("@/pages/AnabolicScanReport"));
const UltimateScanReport = lazy(() => import("@/pages/UltimateScanReport"));
const BloodClientDashboard = lazy(() => import("@/pages/BloodClientDashboard"));

// Offer Pages
const AuditGratuit = lazy(() => import("@/pages/offers/AuditGratuit"));
const AuditPremium = lazy(() => import("@/pages/offers/AuditPremium"));
const BloodAnalysisOffer = lazy(() => import("@/pages/offers/BloodAnalysisOffer"));
const ProPanel = lazy(() => import("@/pages/offers/ProPanel"));

// Scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement...</div>}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/apexlabs" component={ApexLabs} />
        <Route path="/audit-complet" component={Landing} />
        <Route path="/audit-complet/questionnaire" component={Questionnaire} />
        <Route path="/questionnaire" component={Questionnaire} />
        <Route path="/audit-complet/checkout" component={Checkout} />
        <Route path="/blood-dashboard" component={BloodClientDashboard} />
        <Route path="/blood-analysis" component={BloodAnalysisStart} />
        <Route path="/blood-analysis/dashboard/:reportId" component={BloodAnalysisLegacyRedirect} />
        <Route path="/blood-analysis/:reportId" component={BloodAnalysisLegacyRedirect} />

        {/* Offer Pages - New Names */}
        <Route path="/offers/discovery-scan" component={AuditGratuit} />
        <Route path="/offers/anabolic-bioscan" component={AuditPremium} />
        <Route path="/offers/blood-analysis" component={BloodAnalysisOffer} />
        <Route path="/offers/ultimate-scan" component={ProPanel} />

        {/* Legacy routes - redirects */}
        <Route path="/offers/audit-gratuit" component={AuditGratuit} />
        <Route path="/offers/audit-premium" component={AuditPremium} />
        <Route path="/offers/pro-panel" component={ProPanel} />

        {/* Ultrahuman-style Reports */}
        <Route path="/scan/:auditId" component={DiscoveryScanReport} />
        <Route path="/anabolic/:auditId" component={AnabolicScanReport} />
        <Route path="/ultimate/:auditId" component={UltimateScanReport} />

        <Route path="/dashboard" component={DashboardRouter} />
        <Route path="/analysis/:reportId" component={BloodAnalysisDashboard} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard/:auditId" component={AuditDetail} />
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/check-email" component={CheckEmail} />
        <Route path="/auth/verify" component={Verify} />
        <Route path="/mentions-legales" component={MentionsLegales} />
        <Route path="/cgv" component={CGV} />
        <Route path="/faq" component={FAQ} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogArticle} />
        <Route path="/press" component={Press} />
        <Route path="/deduction-coaching" component={DeductionCoaching} />
        <Route path="/test" component={TestAudit} />
        <Route path="/report" component={Report} />
        <Route path="/report/:auditId" component={Report} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
