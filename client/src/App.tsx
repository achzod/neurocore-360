import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Questionnaire from "@/pages/Questionnaire";
import Checkout from "@/pages/Checkout";
import Dashboard from "@/pages/Dashboard";
import AuditDetail from "@/pages/AuditDetail";
import AdminReviews from "@/pages/AdminReviews";
import AdminDashboard from "@/pages/AdminDashboard";
import Login from "@/pages/auth/Login";
import CheckEmail from "@/pages/auth/CheckEmail";
import Verify from "@/pages/auth/Verify";
import MentionsLegales from "@/pages/MentionsLegales";
import CGV from "@/pages/CGV";
import TestAudit from "@/pages/TestAudit";
import FAQ from "@/pages/FAQ";
import Report from "@/pages/Report";
import BloodAnalysis from "@/pages/BloodAnalysis";
import BurnoutDetectionPage from "@/pages/BurnoutDetectionPage";
import Blog from "@/pages/Blog";
import BlogArticle from "@/pages/BlogArticle";
import Press from "@/pages/Press";
import DeductionCoaching from "@/pages/DeductionCoaching";
import ApexLabs from "@/pages/ApexLabs";
import DiscoveryScanReport from "@/pages/DiscoveryScanReport";
import AnabolicScanReport from "@/pages/AnabolicScanReport";
import UltimateScanReport from "@/pages/UltimateScanReport";
import BurnoutEngineReport from "@/pages/BurnoutEngineReport";

// Offer Pages
import AuditGratuit from "@/pages/offers/AuditGratuit";
import AuditPremium from "@/pages/offers/AuditPremium";
import BloodAnalysisOffer from "@/pages/offers/BloodAnalysisOffer";
import ProPanel from "@/pages/offers/ProPanel";
import BurnoutDetection from "@/pages/offers/BurnoutDetection";

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
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/apexlabs" component={ApexLabs} />
      <Route path="/audit-complet" component={Landing} />
      <Route path="/audit-complet/questionnaire" component={Questionnaire} />
      <Route path="/audit-complet/checkout" component={Checkout} />
      <Route path="/blood-analysis" component={BloodAnalysis} />
      <Route path="/burnout-detection" component={BurnoutDetectionPage} />

      {/* Offer Pages - New Names */}
      <Route path="/offers/discovery-scan" component={AuditGratuit} />
      <Route path="/offers/anabolic-bioscan" component={AuditPremium} />
      <Route path="/offers/blood-analysis" component={BloodAnalysisOffer} />
      <Route path="/offers/ultimate-scan" component={ProPanel} />
      <Route path="/offers/burnout-detection" component={BurnoutDetection} />

      {/* Legacy routes - redirects */}
      <Route path="/offers/audit-gratuit" component={AuditGratuit} />
      <Route path="/offers/audit-premium" component={AuditPremium} />
      <Route path="/offers/pro-panel" component={ProPanel} />

      {/* Ultrahuman-style Reports */}
      <Route path="/scan/:auditId" component={DiscoveryScanReport} />
      <Route path="/anabolic/:auditId" component={AnabolicScanReport} />
      <Route path="/ultimate/:auditId" component={UltimateScanReport} />
      <Route path="/burnout/:auditId" component={BurnoutEngineReport} />

      <Route path="/dashboard" component={Dashboard} />
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
