import Dashboard from "@/pages/Dashboard";
import BloodClientDashboard from "@/pages/BloodClientDashboard";

export default function DashboardRouter() {
  const token = typeof window !== "undefined" ? localStorage.getItem("apexlabs_token") : null;
  if (token) {
    return <BloodClientDashboard />;
  }
  return <Dashboard />;
}
