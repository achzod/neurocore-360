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

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>();
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator ?? ((req) => req.ip || "unknown");

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

    // Simple cleanup to avoid unbounded growth.
    if (hits.size > 10000) {
      for (const [entryKey, entry] of hits) {
        if (entry.resetAt <= now) {
          hits.delete(entryKey);
        }
      }
    }

    next();
  };
}
