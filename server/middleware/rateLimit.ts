import type { Request, Response, NextFunction } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * IP client derrière le proxy Render/Cloudflare. "trust proxy" n'est pas activé,
 * donc req.ip vaut l'IP du proxy et tous les clients partageaient le même compteur.
 * cf-connecting-ip est posé par Cloudflare (non falsifiable par le client) ;
 * à défaut, première IP de X-Forwarded-For, puis req.ip.
 */
export function clientIpKey(req: Request): string {
  const cf = req.headers["cf-connecting-ip"];
  const cfIp = (Array.isArray(cf) ? cf[0] : cf || "").trim();
  if (cfIp) return cfIp;
  const xff = req.headers["x-forwarded-for"];
  const first = (Array.isArray(xff) ? xff[0] : xff || "").split(",")[0]?.trim();
  if (first) return first;
  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>();
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator ?? clientIpKey;

  // Proactive cleanup every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Allow the process to exit without waiting for the interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = hits.get(key);

    if (!existing || existing.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      existing.count += 1;
    }

    const current = hits.get(key);
    if (!current) {
      next();
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - current.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      res.status(429).json({
        error: "RATE_LIMITED",
        message: "Trop de requêtes. Réessaie plus tard.",
      });
      return;
    }

    next();
  };
}
