import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function BloodAnalysisLegacyRedirect() {
  const params = useParams<{ reportId?: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    if (params?.reportId) {
      navigate(`/analysis/${params.reportId}${search}`);
      return;
    }
    navigate(`/blood-dashboard${search}`);
  }, [navigate, params?.reportId]);

  return null;
}
