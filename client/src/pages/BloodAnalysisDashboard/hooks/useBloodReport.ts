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
  createdAt?: string;
}

export const useBloodReport = (reportId: string | undefined) => {
  return useQuery({
    queryKey: ['blood-report', reportId],
    queryFn: async () => {
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      const response = await fetch(`/api/blood-analysis/report/${reportId}`);
      const data = await response.json();

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
      // Poll every 10s while waiting for AI report to be generated
      if (report && !report.aiReport) return 10_000;
      return false;
    },
  });
};
