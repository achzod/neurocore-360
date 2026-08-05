import { useQuery } from '@tanstack/react-query';

export interface BloodAnalysisReport {
  id: string;
  email: string;
  profile?: Record<string, unknown>;
  markers?: unknown[];
  analysis?: {
    summary?: { optimal?: string[]; watch?: string[]; action?: string[] };
    markers?: Array<{
      markerId?: string;
      id?: string;
      name: string;
      value: number;
      unit: string;
      status: string;
      normalRange?: string;
      optimalRange?: string;
      interpretation?: string;
      history?: Array<{ date: string; value: number }>;
    }>;
    patterns?: Array<{ name: string; causes?: string[] }>;
  };
  aiReport?: string;
  aiMeta?: {
    status?: string | null;
    model?: string | null;
    generatedAt?: string | null;
    validationMissing?: string[] | null;
    fallbackAt?: string | null;
    fallbackReason?: string | null;
  };
  createdAt?: string;
}

export const useBloodReport = (reportId: string | undefined) => {
  return useQuery({
    queryKey: ['blood-report', reportId],
    queryFn: async () => {
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      // Direct links must use the public UUID endpoint immediately when no
      // session token exists. Calling the protected endpoint first produced a
      // noisy 403 in the browser before the public fallback succeeded.
      const token = localStorage.getItem("apexlabs_token");
      let response = token
        ? await fetch(`/api/blood-analysis/report/${reportId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await fetch(`/api/blood-analysis/report/${reportId}/public`);
      let data = await response.json();

      // A stale session token must not break a valid direct UUID link.
      if (token && (!response.ok || !data?.success)) {
        response = await fetch(`/api/blood-analysis/report/${reportId}/public`);
        data = await response.json();
      }

      if (!response.ok || !data?.success || !data?.report) {
        throw new Error(data?.error || 'Impossible de charger le rapport');
      }

      return data.report as BloodAnalysisReport;
    },
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const report = query.state.data;
      if (!report) return false;

      const aiReportText = String(report.aiReport || "").trim();
      const aiStatus = String(report.aiMeta?.status || "").toLowerCase();
      const generatedAtMs = Date.parse(String(report.aiMeta?.generatedAt || ""));
      const ageMs = Number.isFinite(generatedAtMs) ? Math.max(0, Date.now() - generatedAtMs) : Number.POSITIVE_INFINITY;

      // If report text is missing, keep polling aggressively.
      if (!aiReportText) return 7_000;

      // Keep polling while backend background generation is in-flight.
      if (aiStatus === "processing") return 8_000;

      // A fallback may be replaced asynchronously after retries; poll for a bounded window.
      if (aiStatus === "fallback" && ageMs < 20 * 60 * 1000) return 15_000;

      return false;
    },
  });
};
