// 25s was too short for premium blood reports on production cold starts,
// causing avoidable fallback responses.
const DEFAULT_AI_SYNC_TIMEOUT_MS = 120000;
// Async blood reports can require multiple generation/rewrite passes.
// Keep a single long attempt by default to avoid double-running expensive pipelines.
const DEFAULT_AI_ASYNC_TIMEOUT_MS = 900000;
const DEFAULT_AI_ASYNC_RETRY_ATTEMPTS = 1;
const DEFAULT_AI_ASYNC_RETRY_DELAY_MS = 8000;

const parseTimeoutFromEnv = (): number => {
  const raw = Number(process.env.BLOOD_AI_SYNC_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw < 5000) {
    return DEFAULT_AI_SYNC_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

export const BLOOD_AI_SYNC_TIMEOUT_MS = parseTimeoutFromEnv();

const parseAsyncTimeoutFromEnv = (): number => {
  const raw = Number(process.env.BLOOD_AI_ASYNC_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw < 30000) {
    return DEFAULT_AI_ASYNC_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

const parseAsyncRetryAttemptsFromEnv = (): number => {
  const raw = Number(process.env.BLOOD_AI_ASYNC_RETRY_ATTEMPTS);
  if (!Number.isFinite(raw)) {
    return DEFAULT_AI_ASYNC_RETRY_ATTEMPTS;
  }
  return Math.max(1, Math.min(4, Math.floor(raw)));
};

const parseAsyncRetryDelayFromEnv = (): number => {
  const raw = Number(process.env.BLOOD_AI_ASYNC_RETRY_DELAY_MS);
  if (!Number.isFinite(raw) || raw < 1000) {
    return DEFAULT_AI_ASYNC_RETRY_DELAY_MS;
  }
  return Math.floor(raw);
};

export const BLOOD_AI_ASYNC_TIMEOUT_MS = parseAsyncTimeoutFromEnv();
export const BLOOD_AI_ASYNC_RETRY_ATTEMPTS = parseAsyncRetryAttemptsFromEnv();
export const BLOOD_AI_ASYNC_RETRY_DELAY_MS = parseAsyncRetryDelayFromEnv();

export class AIGenerationTimeoutError extends Error {
  public readonly timeoutMs: number;
  public readonly contextLabel: string;

  constructor(timeoutMs: number, contextLabel: string) {
    super(`[BloodAI] ${contextLabel} timed out after ${timeoutMs}ms`);
    this.name = "AIGenerationTimeoutError";
    this.timeoutMs = timeoutMs;
    this.contextLabel = contextLabel;
  }
}

export const isAIGenerationTimeoutError = (error: unknown): error is AIGenerationTimeoutError => {
  return error instanceof AIGenerationTimeoutError;
};

export const isRetryableAIGenerationError = (error: unknown): boolean => {
  if (isAIGenerationTimeoutError(error)) return true;
  const anyErr = error as any;
  const status = Number(anyErr?.status || anyErr?.statusCode || anyErr?.response?.status);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 529) {
    return true;
  }
  const message = String(anyErr?.message || anyErr || "");
  return /timeout|timed out|overloaded|rate limit|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i.test(message);
};

export const withAIGenerationTimeout = async <T>(
  run: () => Promise<T>,
  contextLabel: string,
  timeoutMs: number = BLOOD_AI_SYNC_TIMEOUT_MS
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new AIGenerationTimeoutError(timeoutMs, contextLabel));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

type AIGenerationRetryOptions = {
  attempts?: number;
  timeoutMs?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runAIGenerationWithRetry = async <T>(
  run: () => Promise<T>,
  contextLabel: string,
  options?: AIGenerationRetryOptions
): Promise<T> => {
  const attempts = Math.max(1, Math.floor(options?.attempts ?? BLOOD_AI_ASYNC_RETRY_ATTEMPTS));
  const timeoutMs = Math.floor(options?.timeoutMs ?? BLOOD_AI_ASYNC_TIMEOUT_MS);
  const backoffMultiplier = Math.max(1, Number(options?.backoffMultiplier ?? 1.8));
  let delayMs = Math.max(1000, Math.floor(options?.initialDelayMs ?? BLOOD_AI_ASYNC_RETRY_DELAY_MS));

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withAIGenerationTimeout(run, contextLabel, timeoutMs);
    } catch (error) {
      lastError = error;
      const canRetryByDefault = isRetryableAIGenerationError(error);
      const canRetryByHook = options?.shouldRetry ? options.shouldRetry(error, attempt) : canRetryByDefault;
      const canRetry = attempt < attempts && canRetryByHook;
      if (!canRetry) {
        throw error;
      }
      console.warn(
        `[BloodAI] ${contextLabel} retry ${attempt}/${attempts - 1} after error:`,
        (error as any)?.message || error
      );
      await sleep(delayMs);
      delayMs = Math.round(delayMs * backoffMultiplier);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || "AI generation failed"));
};
