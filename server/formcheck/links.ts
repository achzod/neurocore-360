import { signFormcheckAccessToken } from "../auth";

/** Liens client signés : page d'upload et PDF d'une analyse. */
export function formcheckLinks(baseUrl: string, email: string, analysisId?: string) {
  const token = signFormcheckAccessToken(email);
  const base = baseUrl.replace(/\/+$/, "");
  return {
    token,
    uploadUrl: `${base}/formcheck/upload?token=${encodeURIComponent(token)}`,
    pdfUrl: analysisId ? `${base}/api/formcheck/analyses/${encodeURIComponent(analysisId)}/pdf?token=${encodeURIComponent(token)}` : "",
  };
}
