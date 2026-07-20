/**
 * Public WhatsApp Business contact used across APEXLABS offers.
 * wa.me expects the international number without "+", spaces or punctuation.
 */
export const WHATSAPP_NUMBER = "971585210514";

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim())}`;
}
