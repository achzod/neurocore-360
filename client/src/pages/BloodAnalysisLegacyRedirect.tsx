import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function BloodAnalysisLegacyRedirect() {
  const params = useParams<{ reportId?: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (params?.reportId) {
      navigate(`/analysis/${params.reportId}`);
      return;
    }
    navigate("/blood-dashboard");
  }, [navigate, params?.reportId]);

  return null;
}

