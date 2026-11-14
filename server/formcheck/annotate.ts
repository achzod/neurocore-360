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
  // Tailles calées sur le côté le plus long : les vidéos verticales (576 x 1024)
  // gardent des traits épais et des libellés lisibles une fois réduites dans le PDF.
  const long = Math.max(width, height);
  const stroke = Math.max(4, Math.round(long / 140));
  const baseFont = Math.max(18, Math.round(long / 26));
  const px = (p: { x: number; y: number }) => ({ x: Math.round(p.x * width), y: Math.round(p.y * height) });
  const parts: string[] = [];
  const labels: string[] = [];
  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const shape = (d: string) => {
    // liseré noir puis trait jaune : lisible sur fond clair comme sombre
    parts.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">`
      + d.replace(/__S__/g, `stroke="${BLACK}" stroke-opacity="0.6" stroke-width="${stroke + 4}"`)
      + d.replace(/__S__/g, `stroke="${YELLOW}" stroke-width="${stroke}"`)
      + `</g>`);
  };
  type Rect = { x: number; y: number; w: number; h: number };
  const overlaps = (r: Rect) =>
    placed.some((o) => r.x < o.x + o.w + 6 && r.x + r.w + 6 > o.x && r.y < o.y + o.h + 6 && r.y + r.h + 6 > o.y);
  // Libellés mis en file pendant le tracé, puis placés quand toutes les formes sont connues,
  // pour éviter de recouvrir la zone annotée (le corps) et les autres libellés.
  const queue: Array<{ x: number; y: number; value: string; anchor: { x: number; y: number }; ring: number }> = [];
  const zone = { x1: width, y1: height, x2: 0, y2: 0 };
  const grow = (x: number, y: number, r = 0) => {
    zone.x1 = Math.min(zone.x1, x - r); zone.y1 = Math.min(zone.y1, y - r);
    zone.x2 = Math.max(zone.x2, x + r); zone.y2 = Math.max(zone.y2, y + r);
  };
  const label = (x: number, y: number, value: string, anchor: { x: number; y: number }, ring = 0) => {
    if (value) queue.push({ x, y, value, anchor, ring });
  };
  const layoutLabels = () => {
    // Zone protégée : formes + marge, plus haute que large (un corps s'étend surtout en hauteur).
    const mx = Math.round(Math.min(width, height) * 0.04);
    const my = Math.round(height * 0.08);
    const ob = { x: zone.x1 - mx, y: zone.y1 - my, w: zone.x2 - zone.x1 + 2 * mx, h: zone.y2 - zone.y1 + 2 * my };
    const inter = (r: Rect) => Math.max(0, Math.min(r.x + r.w, ob.x + ob.w) - Math.max(r.x, ob.x)) * Math.max(0, Math.min(r.y + r.h, ob.y + ob.h) - Math.max(r.y, ob.y));
    for (const item of queue) {
      const { value, anchor } = item;
      // La police rétrécit seulement si le libellé ne tient pas dans la largeur.
      const font = Math.max(14, Math.min(baseFont, Math.floor((width - 16) / (value.length * 0.62 + 1))));
      const w = Math.round(value.length * font * 0.62 + font);
      const h = Math.round(font * 1.5);
      const fit = (cx: number, cy: number): Rect => ({
        x: Math.max(4, Math.min(width - w - 4, Math.round(cx))),
        y: Math.max(4, Math.min(height - h - 4, Math.round(cy))),
        w, h,
      });
      const candidates: Rect[] = [fit(item.x, item.y), fit(item.x, item.y - h - 8), fit(item.x, item.y + h + 8)];
      for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
        const cy = anchor.y - h / 2 + k * (h + 8);
        candidates.push(fit(ob.x - w - 10, cy), fit(ob.x + ob.w + 10, cy), fit(8, cy), fit(width - w - 8, cy));
      }
      for (const k of [1, 2]) {
        candidates.push(fit(anchor.x - w / 2, ob.y - k * (h + 8)), fit(anchor.x - w / 2, ob.y + ob.h + 8 + (k - 1) * (h + 8)));
      }
      let best: Rect | null = null;
      let bestCost = Infinity;
      for (const c of candidates) {
        if (overlaps(c)) continue;
        const cover = inter(c) / (w * h);
        const dist = Math.hypot(c.x + w / 2 - anchor.x, c.y + h / 2 - anchor.y) / long;
        // Le sujet est le plus souvent au centre du cadre : on préfère les bords.
        const central = 1 - Math.abs(c.x + w / 2 - width / 2) / (width / 2);
        const cost = cover * 10 + dist + central * 0.25;
        if (cost < bestCost) { bestCost = cost; best = c; }
      }
      const rect = best || candidates[0];
      placed.push(rect);
      // Trait de rappel entre le libellé et sa forme quand ils sont éloignés.
      const nx = Math.max(rect.x, Math.min(anchor.x, rect.x + w));
      const ny = Math.max(rect.y, Math.min(anchor.y, rect.y + h));
      let tx = anchor.x;
      let ty = anchor.y;
      if (item.ring > 0) {
        const d = Math.hypot(nx - anchor.x, ny - anchor.y) || 1;
        tx = Math.round(anchor.x + ((nx - anchor.x) / d) * item.ring);
        ty = Math.round(anchor.y + ((ny - anchor.y) / d) * item.ring);
      }
      if (Math.hypot(nx - tx, ny - ty) > h * 0.4) {
        const lw = Math.max(2, Math.round(stroke * 0.5));
        leaders.push(`<line x1="${nx}" y1="${ny}" x2="${tx}" y2="${ty}" stroke="${BLACK}" stroke-opacity="0.6" stroke-width="${lw + 3}" stroke-linecap="round"/>`
          + `<line x1="${nx}" y1="${ny}" x2="${tx}" y2="${ty}" stroke="${YELLOW}" stroke-width="${lw}" stroke-linecap="round"/>`
          + `<circle cx="${tx}" cy="${ty}" r="${lw + 2}" fill="${YELLOW}" stroke="${BLACK}" stroke-width="1.5"/>`);
      }
      labels.push(`<rect x="${rect.x}" y="${rect.y}" width="${w}" height="${h}" rx="${Math.round(h / 4)}" fill="${BLACK}" fill-opacity="0.85" stroke="${YELLOW}" stroke-width="2"/>`
        + `<text x="${rect.x + Math.round(font / 2)}" y="${rect.y + Math.round(h * 0.7)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${font}" font-weight="700" fill="${YELLOW}">${esc(value)}</text>`);
    }
  };
  const leaders: string[] = [];
  const font = baseFont;
  if (badgeNumber !== undefined) placed.push({ x: 0, y: 0, w: font * 2 + 20, h: font * 2 + 20 });

  for (const annotation of annotations) {
    const pts = annotation.points.map(px);
    if (annotation.type === "circle" && pts[0]) {
      const r = Math.max(stroke * 4, Math.round((annotation.radius || 0.06) * width));
      shape(`<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${r}" __S__/>`);
      grow(pts[0].x, pts[0].y, r);
      label(pts[0].x + r + 8, pts[0].y - Math.round(font * 0.75), annotation.label, pts[0], r);
    } else if (annotation.type === "line" && pts.length >= 2) {
      shape(`<line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke-dasharray="${stroke * 4} ${stroke * 2}" __S__/>`);
      grow(pts[0].x, pts[0].y); grow(pts[1].x, pts[1].y);
      const mid = { x: Math.round((pts[0].x + pts[1].x) / 2), y: Math.round((pts[0].y + pts[1].y) / 2) };
      label(mid.x + 8, mid.y, annotation.label, mid);
    } else if (annotation.type === "arrow" && pts.length >= 2) {
      const [a, b] = pts;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const head = stroke * 6;
      const h1 = { x: Math.round(b.x - head * Math.cos(ang - 0.45)), y: Math.round(b.y - head * Math.sin(ang - 0.45)) };
      const h2 = { x: Math.round(b.x - head * Math.cos(ang + 0.45)), y: Math.round(b.y - head * Math.sin(ang + 0.45)) };
      shape(`<path d="M${a.x},${a.y} L${b.x},${b.y} M${h1.x},${h1.y} L${b.x},${b.y} L${h2.x},${h2.y}" __S__/>`);
      grow(a.x, a.y); grow(b.x, b.y);
      label(b.x + 10, b.y - Math.round(font * 0.75), annotation.label, b);
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
      grow(a.x, a.y); grow(v.x, v.y); grow(c.x, c.y);
      label(v.x + r + 8, v.y - Math.round(font * 0.75), `${annotation.label ? `${annotation.label} ` : ""}${deg}°`.trim(), v);
    }
  }

  // Libellés placés et dessinés après toutes les formes : jamais recouverts par un trait.
  layoutLabels();
  parts.push(...leaders, ...labels);

  if (badgeNumber !== undefined) {
    const r = Math.round(font * 1.0);
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
