export const DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS = 200;

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
    throw new Error(
      `[Discovery Premium] Knowledge context unavailable for ${scope}: ` +
      `${context.length}/${DISCOVERY_MIN_KNOWLEDGE_CONTEXT_CHARS} characters. ` +
      `Premium generation is fail-closed; degraded generation is forbidden.`,
    );
  }
  return context;
}
