/**
 * Normalise le corps d'un webhook SendPulse en liste d'événements plats
 * ({ event, email, task_id, link_url, timestamp, ... }).
 *
 * SendPulse envoie deux formats :
 *  - l'ancien : un tableau d'événements plats ;
 *  - le nouveau (vu en prod le 2026-11-19) : une enveloppe
 *    { "0": {...}, user_id, scope, event_type, occurred_at,
 *      data: { action, data: [ {...événements plats...} ] } }.
 *
 * Avant ce correctif, l'enveloppe était traitée comme un seul événement sans
 * champ `event` ni `email` : tous les open/redirect/unsubscribe/spam étaient
 * ignorés (« missing required fields »).
 */
type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withEventFallback(item: AnyRecord, fallbackEvent: unknown): AnyRecord {
  if (item.event || !fallbackEvent) return { ...item };
  return { ...item, event: fallbackEvent };
}

function unwrapEnvelope(body: AnyRecord): AnyRecord[] {
  const fallbackEvent =
    (isRecord(body.data) && body.data.action) || body.event_type || body.action || undefined;

  // Nouveau format : data.data = [événements]
  if (isRecord(body.data) && Array.isArray(body.data.data)) {
    const items = body.data.data.filter(isRecord);
    if (items.length > 0) return items.map((item) => withEventFallback(item, fallbackEvent));
  }

  // Même enveloppe sans data.data : événements sous des clés numériques "0", "1"...
  const numericItems = Object.keys(body)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => body[key])
    .filter(isRecord);
  if (numericItems.length > 0) {
    return numericItems.map((item) => withEventFallback(item, fallbackEvent));
  }

  // Ancien format : un événement plat isolé.
  return [{ ...body }];
}

export function extractSendPulseEvents(body: unknown): AnyRecord[] {
  if (Array.isArray(body)) {
    return body.filter(isRecord).flatMap((item) =>
      item.event || item.email || item.task_id ? [{ ...item }] : unwrapEnvelope(item),
    );
  }
  if (isRecord(body)) return unwrapEnvelope(body);
  return [];
}
