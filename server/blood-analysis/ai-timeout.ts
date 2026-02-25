const DEFAULT_AI_SYNC_TIMEOUT_MS = 120000;

const parseTimeoutFromEnv = (): number => {
  const raw = Number(process.env.BLOOD_AI_SYNC_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw < 5000) {
    return DEFAULT_AI_SYNC_TIMEOUT_MS;
  }
  return Math.floor(raw);
};

export const BLOOD_AI_SYNC_TIMEOUT_MS = parseTimeoutFromEnv();

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
