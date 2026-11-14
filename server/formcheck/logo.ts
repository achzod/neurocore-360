/**
 * FormCheck V2 : logo officiel Achzod (même tracé que client/src/components/AchzodLogo.tsx).
 * SVG inline pour le PDF ; pour les emails, un PNG servi par le site lui-même
 * (Gmail et Outlook n'affichent ni le SVG inline ni les images en data URL).
 */

export const ACHZOD_LOGO_VIEWBOX = "0 0 38.047 30.012";
export const ACHZOD_LOGO_PATHS = [
  `<path d="M128.282,57.01v6.646H108.06V59.6l4.9-19.315H119.9l-4.243,16.72Z" transform="translate(-90.235 -33.644)"/>`,
  `<path d="M19.506,0V4.048L14.6,23.366H7.667L11.91,6.646H0V0Z"/>`,
].join("");

/** Chemin public du PNG utilisé dans les emails (fichier client/public, servi par le site). */
export const ACHZOD_EMAIL_LOGO_PATH = "/images/formcheck/achzod-logo-email.png";

/** Le monogramme seul, en SVG inline. */
export function achzodMarkSvg(color: string, heightPx: number): string {
  const width = Math.round((heightPx * 38.047) / 30.012);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ACHZOD_LOGO_VIEWBOX}" width="${width}" height="${heightPx}" fill="${color}" aria-hidden="true"><g>${ACHZOD_LOGO_PATHS}</g></svg>`;
}

/** Logo complet : monogramme suivi du texte ACHZOD, en HTML + SVG inline (pour le PDF). */
export function achzodLogoHtml(input: { markColor: string; textColor: string; heightPx: number; className?: string }): string {
  const fontPt = Math.round(input.heightPx * 0.62);
  return `<span class="achzod-logo${input.className ? ` ${input.className}` : ""}" style="display:inline-flex;align-items:center;gap:${Math.round(input.heightPx * 0.3)}px;">`
    + achzodMarkSvg(input.markColor, input.heightPx)
    + `<span style="font-weight:900;letter-spacing:-0.01em;font-size:${fontPt}px;line-height:1;color:${input.textColor};">ACHZOD</span></span>`;
}

/** SVG autonome du logo complet (sert à générer le PNG des emails). */
export function achzodLogoStandaloneSvg(input: { markColor: string; textColor: string; background?: string; height?: number }): string {
  const h = input.height ?? 120;
  const markH = Math.round(h * 0.7);
  const markW = Math.round((markH * 38.047) / 30.012);
  const pad = Math.round(h * 0.15);
  const font = Math.round(h * 0.52);
  const textX = pad + markW + Math.round(h * 0.22);
  const width = textX + Math.round(font * 4.75) + pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">`
    + (input.background ? `<rect width="${width}" height="${h}" fill="${input.background}"/>` : "")
    + `<svg x="${pad}" y="${Math.round((h - markH) / 2)}" width="${markW}" height="${markH}" viewBox="${ACHZOD_LOGO_VIEWBOX}" fill="${input.markColor}"><g>${ACHZOD_LOGO_PATHS}</g></svg>`
    + `<text x="${textX}" y="${Math.round(h / 2 + font * 0.36)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${font}" font-weight="900" fill="${input.textColor}">ACHZOD</text>`
    + `</svg>`;
}
