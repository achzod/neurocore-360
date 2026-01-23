import jwt from "jsonwebtoken";
import type { Request } from "express";

export type AuthPayload = {
  userId: string;
  email: string;
};

const getAuthSecret = (): string => {
  return (
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    "dev-auth-secret"
  );
};

export const signAuthToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, getAuthSecret(), { expiresIn: "30d" });
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
