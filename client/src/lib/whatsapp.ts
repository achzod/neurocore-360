/**
 * Public WhatsApp Business contact used across APEXLABS offers.
 * wa.me expects the international number without "+", spaces or punctuation.
 */
export const WHATSAPP_NUMBER = "971585210514";

function encodeWhatsAppMessage(message: string): string {
  return encodeURIComponent(message.trim()).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeWhatsAppMessage(message)}`;
}
