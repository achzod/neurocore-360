export function reportAccessHeaders(resourceId: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!resourceId) return headers;
  const sessionToken = localStorage.getItem("apexlabs_token");
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const key = `apexlabs_report_access_${resourceId}`;
  const queryToken = new URLSearchParams(window.location.search).get("access");
  if (queryToken) sessionStorage.setItem(key, queryToken);
  const reportToken = queryToken || sessionStorage.getItem(key);
  if (reportToken) headers["X-Report-Access"] = reportToken;
  return headers;
}

export function redirectLegacyReportLinkToLogin(response: Response): boolean {
  if (response.status !== 401) return false;
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  localStorage.setItem("apexlabs_post_login_redirect", returnTo);
  window.location.assign("/auth/login");
  return true;
}
