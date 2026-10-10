import jwt from "jsonwebtoken";
import type { Request } from "express";

export type AuthPayload = {
  userId: string;
  email: string;
};

export type ReportResource = "audit" | "blood" | "peptides";

type ReportAccessPayload = {
  tokenType: "report_access";
  resource: ReportResource;
  resourceId: string;
  email?: string;
};

const getAuthSecret = (): string => {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: SESSION_SECRET must be set in production. Refusing to start with insecure default.");
    }
    console.warn("[Auth] WARNING: No SESSION_SECRET set. Using insecure default for development only.");
    return "dev-auth-secret";
  }
  return secret;
};

export const signAuthToken = (payload: AuthPayload): string => {
  // Keep a trusted device signed in for a year. The emailed magic link remains
  // short-lived and one-time, so a leaked email cannot become a permanent key.
  return jwt.sign(payload, getAuthSecret(), { expiresIn: "365d" });
};

export const verifyAuthToken = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, getAuthSecret()) as AuthPayload;
  } catch {
    return null;
  }
};

export const getAuthPayload = (req: Request): AuthPayload | null => {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifyAuthToken(match[1]);
};

export const signReportAccessToken = (
  resource: ReportResource,
  resourceId: string,
  email?: string,
): string => jwt.sign(
  {
    tokenType: "report_access",
    resource,
    resourceId,
    ...(email ? { email: email.trim().toLowerCase() } : {}),
  } satisfies ReportAccessPayload,
  getAuthSecret(),
  { expiresIn: "30d", issuer: "apexlabs", audience: "report-access" },
);

export const verifyReportAccessToken = (
  token: string,
  resource: ReportResource,
  resourceId: string,
): ReportAccessPayload | null => {
  try {
    const payload = jwt.verify(token, getAuthSecret(), {
      issuer: "apexlabs",
      audience: "report-access",
    }) as ReportAccessPayload;
    if (
      payload.tokenType !== "report_access" ||
      payload.resource !== resource ||
      payload.resourceId !== resourceId
    ) return null;
    return payload;
  } catch {
    return null;
  }
};

export const getReportAccessToken = (req: Request): string | null => {
  const header = req.headers["x-report-access"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const query = req.query.access;
  return typeof query === "string" && query.trim() ? query.trim() : null;
};

export const hasValidReportAccess = (
  req: Request,
  resource: ReportResource,
  resourceId: string,
): boolean => {
  const token = getReportAccessToken(req);
  return Boolean(token && verifyReportAccessToken(token, resource, resourceId));
};

export const getReportAccessDecision = (
  req: Request,
  resource: ReportResource,
  resourceId: string,
  ownerEmail: string,
): 200 | 401 | 403 => {
  if (hasValidReportAccess(req, resource, resourceId)) return 200;
  const payload = getAuthPayload(req);
  if (!payload) return 401;
  return payload.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase() ? 200 : 403;
};

export const buildReportAccessUrl = (
  baseUrl: string,
  path: string,
  resource: ReportResource,
  resourceId: string,
  email?: string,
): string => {
  const url = new URL(path, baseUrl);
  url.searchParams.set("access", signReportAccessToken(resource, resourceId, email));
  return url.toString();
};
