export const DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS = 200;

export interface DiscoveryKnowledgePreflightDiagnostic {
  stage: "knowledge_preflight";
  failureKind: "undersized_context" | "knowledge_loader_error";
  scope: string;
  actualChars: number | null;
  minimumChars: number;
  errorCode: string;
}

export class DiscoveryKnowledgeContextError extends Error {
  readonly code = "DISCOVERY_KNOWLEDGE_CONTEXT_UNDERSIZED";

  constructor(
    readonly scope: string,
    readonly actualChars: number,
    readonly minimumChars = DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS,
  ) {
    super(
      `[Discovery Premium] Knowledge context unavailable for ${scope}: ` +
      `${actualChars}/${minimumChars} characters. ` +
      `Premium generation is fail-closed; degraded generation is forbidden.`,
    );
    this.name = "DiscoveryKnowledgeContextError";
  }
}

/**
 * Return only bounded operational metadata. Knowledge text and the original
 * error message are deliberately excluded so stdout can be retained safely.
 */
export function getDiscoveryKnowledgePreflightDiagnostic(
  error: unknown,
): DiscoveryKnowledgePreflightDiagnostic {
  if (error instanceof DiscoveryKnowledgeContextError) {
    return {
      stage: "knowledge_preflight",
      failureKind: "undersized_context",
      scope: error.scope,
      actualChars: error.actualChars,
      minimumChars: error.minimumChars,
      errorCode: error.code,
    };
  }

  const candidate = error as { code?: unknown } | null;
  const rawCode = String(candidate?.code || "DISCOVERY_KNOWLEDGE_LOAD_ERROR");
  const safeCode = /^[A-Z0-9_-]{1,40}$/i.test(rawCode)
    ? rawCode.toUpperCase()
    : "DISCOVERY_KNOWLEDGE_LOAD_ERROR";
  return {
    stage: "knowledge_preflight",
    failureKind: "knowledge_loader_error",
    scope: "unknown",
    actualChars: null,
    minimumChars: DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS,
    errorCode: safeCode,
  };
}

const DISCOVERY_SOURCE_NAME_REGEX = new RegExp(
  "\\b(huberman|andrew\\s+huberman|huberman\\s+lab|peter\\s+attia|attia|applied\\s+metabolics|stronger\\s+by\\s+science|sbs|examine(?:\\.com)?|renaissance\\s+periodization|mpmd|more\\s+plates(?:\\s+more\\s+dates)?|moreplates|newsletter|achzod|matthew\\s+walker|sapolsky|layne\\s+norton|ben\\s+bikman|rhonda\\s+patrick|robert\\s+lustig|andy\\s+galpin|brad\\s+schoenfeld|mike\\s+israetel|justin\\s+sonnenburg|chris\\s+kresser)\\b",
  "gi",
);

/**
 * Prepare trusted scientific material for the model prompt.
 *
 * The canonical knowledge base is mostly written in English. English is valid
 * input evidence even though the customer-facing report must be French. Never
 * pass this input through the output-language cleaner: doing so can erase the
 * entire evidence corpus before generation.
 */
export function sanitizeDiscoveryKnowledgeContext(value: string): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(?:sources?|references?|références?)\s*:.*$/gim, "")
    .replace(/^\[[^\]]+\]\s*/gm, "")
    .replace(DISCOVERY_SOURCE_NAME_REGEX, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assertDiscoveryPremiumKnowledgeContext(
  value: string,
  scope: string,
): string {
  const context = sanitizeDiscoveryKnowledgeContext(value);
  if (context.length < DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS) {
    throw new DiscoveryKnowledgeContextError(scope, context.length);
  }
  return context;
}
