/**
 * FormCheck V2 : annotation des frames fautives.
 * Le modèle renvoie des formes en coordonnées relatives (0..1). On les dessine
 * en SVG puis on les compose sur le JPEG avec sharp. Style sobre : trait jaune
 * AchZod avec un liseré noir pour rester lisible sur tous les fonds.
 */
import sharp from "sharp";
import type { FormcheckAnnotation } from "./analysis";

const YELLOW = "#FCDD00";
const BLACK = "#0A0A0A";

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

/** Angle en degrés au sommet b entre ba et bc. */
export function angleDegrees(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n1 = Math.hypot(v1.x, v1.y);
  const n2 = Math.hypot(v2.x, v2.y);
  if (!n1 || !n2) return 0;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

/** Construit le calque SVG (pur, testable). Les coordonnées sont converties en pixels. */
export function buildAnnotationSvg(
  width: number,
  height: number,
  annotations: FormcheckAnnotation[],
  badgeNumber?: number,
): string {
  const stroke = Math.max(3, Math.round(Math.min(width, height) / 110));
  const font = Math.max(16, Math.round(Math.min(width, height) / 20));
  const px = (p: { x: number; y: number }) => ({ x: Math.round(p.x * width), y: Math.round(p.y * height) });
  const parts: string[] = [];
  const shape = (d: string) => {
    // liseré noir puis trait jaune : lisible sur fond clair comme sombre
    parts.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">`
      + d.replace(/__S__/g, `stroke="${BLACK}" stroke-opacity="0.55" stroke-width="${stroke + 3}"`)
      + d.replace(/__S__/g, `stroke="${YELLOW}" stroke-width="${stroke}"`)
      + `</g>`);
  };
  const label = (x: number, y: number, value: string) => {
    if (!value) return;
    const w = Math.round(value.length * font * 0.58 + font);
    const h = Math.round(font * 1.5);
    const lx = Math.max(4, Math.min(width - w - 4, x));
    const ly = Math.max(4, Math.min(height - h - 4, y));
    parts.push(`<rect x="${lx}" y="${ly}" width="${w}" height="${h}" rx="${Math.round(h / 4)}" fill="${BLACK}" fill-opacity="0.78"/>`
      + `<text x="${lx + Math.round(font / 2)}" y="${ly + Math.round(h * 0.7)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${font}" font-weight="700" fill="${YELLOW}">${esc(value)}</text>`);
  };

  for (const annotation of annotations) {
    const pts = annotation.points.map(px);
    if (annotation.type === "circle" && pts[0]) {
      const r = Math.max(stroke * 4, Math.round((annotation.radius || 0.06) * width));
      shape(`<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${r}" __S__/>`);
      label(pts[0].x + r + 6, pts[0].y - Math.round(font * 0.75), annotation.label);
    } else if (annotation.type === "line" && pts.length >= 2) {
      shape(`<line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke-dasharray="${stroke * 4} ${stroke * 2}" __S__/>`);
      label(Math.round((pts[0].x + pts[1].x) / 2) + 8, Math.round((pts[0].y + pts[1].y) / 2), annotation.label);
    } else if (annotation.type === "arrow" && pts.length >= 2) {
      const [a, b] = pts;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const head = stroke * 5;
      const h1 = { x: Math.round(b.x - head * Math.cos(ang - 0.45)), y: Math.round(b.y - head * Math.sin(ang - 0.45)) };
      const h2 = { x: Math.round(b.x - head * Math.cos(ang + 0.45)), y: Math.round(b.y - head * Math.sin(ang + 0.45)) };
      shape(`<path d="M${a.x},${a.y} L${b.x},${b.y} M${h1.x},${h1.y} L${b.x},${b.y} L${h2.x},${h2.y}" __S__/>`);
      label(b.x + 8, b.y - Math.round(font * 0.75), annotation.label);
    } else if (annotation.type === "angle" && pts.length >= 3) {
      const [a, v, c] = pts;
      const deg = angleDegrees(annotation.points[0], annotation.points[1], annotation.points[2]);
      const r = Math.max(stroke * 6, Math.round(Math.min(width, height) * 0.06));
      const a1 = Math.atan2(a.y - v.y, a.x - v.x);
      const a2 = Math.atan2(c.y - v.y, c.x - v.x);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const s = { x: Math.round(v.x + r * Math.cos(a1)), y: Math.round(v.y + r * Math.sin(a1)) };
      const e = { x: Math.round(v.x + r * Math.cos(a1 + delta)), y: Math.round(v.y + r * Math.sin(a1 + delta)) };
      shape(`<path d="M${a.x},${a.y} L${v.x},${v.y} L${c.x},${c.y}" __S__/>`
        + `<path d="M${s.x},${s.y} A${r},${r} 0 0 ${delta > 0 ? 1 : 0} ${e.x},${e.y}" __S__/>`);
      label(v.x + r + 6, v.y - Math.round(font * 0.75), `${annotation.label ? `${annotation.label} ` : ""}${deg}°`.trim());
    }
  }

  if (badgeNumber !== undefined) {
    const r = Math.round(font * 1.1);
    parts.push(`<circle cx="${r + 10}" cy="${r + 10}" r="${r}" fill="${YELLOW}" stroke="${BLACK}" stroke-width="3"/>`
      + `<text x="${r + 10}" y="${r + 10 + Math.round(font * 0.38)}" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${Math.round(font * 1.1)}" font-weight="800" fill="${BLACK}">${badgeNumber}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}

export async function annotateFrame(jpeg: Buffer, annotations: FormcheckAnnotation[], badgeNumber?: number): Promise<Buffer> {
  const image = sharp(jpeg);
  const meta = await image.metadata();
  const width = meta.width || 1024;
  const height = meta.height || 576;
  const svg = buildAnnotationSvg(width, height, annotations, badgeNumber);
  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
