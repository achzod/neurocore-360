import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/audit-complet" component={Landing} />
      <Route path="/audit-complet/questionnaire" component={Questionnaire} />
      <Route path="/audit-complet/checkout" component={Checkout} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:auditId" component={AuditDetail} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/check-email" component={CheckEmail} />
      <Route path="/auth/verify" component={Verify} />
      <Route path="/mentions-legales" component={MentionsLegales} />
      <Route path="/cgv" component={CGV} />
      <Route path="/test" component={TestAudit} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
