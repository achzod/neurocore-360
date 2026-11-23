/**
 * Peptides EU : option 2 de commande proposee a cote de Peptaura (option 1).
 *
 * CONFIG UNIQUE : le lien affilie et le code vivent ici.
 * - PEPTIDES_EU_AFFILIATE_URL (variable d'env, optionnelle) remplace la constante ci-dessous.
 * - PEPTIDES_EU_CODE (variable d'env, optionnelle) remplace le code ci-dessous.
 * Les parametres de requete du lien affilie (ex. ?aff=...) sont recopies sur chaque
 * lien produit (https://www.peptides-eu.net/products/<slug>?aff=...).
 * Si le lien est vide ou invalide, fallback vers https://peptides-eu.net/store.
 *
 * Aucun appel reseau ici : les prix sont un releve fixe (au flacon, en euros)
 * fait le 20/11/2026 sur les pages produit. Un prix absent = lien seul.
 */

export const PEPTIDES_EU_AFFILIATE_URL_DEFAULT = "https://www.peptides-eu.net/?aff=AFF-F6AKX33F";
export const PEPTIDES_EU_CODE_DEFAULT = "AFF-F6AKX33F";
export const PEPTIDES_EU_FALLBACK_URL = "https://peptides-eu.net/store";
export const PEPTIDES_EU_PRICES_CHECKED_AT = "2026-11-20";

export const PEPTIDES_EU_OPTION_TEXT = {
  option1Label: "Option 1 : la moins chère",
  option2Label: "Option 2 : Peptides EU, livrée depuis l'UE",
  storeLabel: "la boutique Peptides EU",
  intro:
    "Tu as deux options pour commander. Option 1 : la source la moins chère, celle utilisée pour chiffrer ce rapport. Option 2 : Peptides EU, un peu plus cher, mais expédié depuis l'Union européenne en 2 à 5 jours ouvrés avec suivi (livraison à partir de 7,99 €), paiement par carte Visa ou Mastercard, virement SEPA ou BTC, et certificats d'analyse Janoshik. Les prix de l'option 2 sont indiqués au flacon, en euros. Vérifie toujours le prix et le stock sur la page avant de payer.",
} as const;

type PeptidesEuFormat = { size: string; eur: number };

/** Releve du 20/11/2026, formats en stock uniquement. */
const PEPTIDES_EU_PRICES: Record<string, PeptidesEuFormat[]> = {
  "5-amino-1mq": [{ size: "5mg", eur: 52.8 }, { size: "50mg", eur: 79.89 }],
  "acetic-acid": [{ size: "3ml", eur: 6 }, { size: "10ml", eur: 7.99 }],
  "adipotide": [{ size: "5mg", eur: 80.79 }],
  "ahk-cu": [{ size: "50mg", eur: 30 }, { size: "100mg", eur: 48 }],
  "aicar": [{ size: "50mg", eur: 46.99 }],
  "aod-9604": [{ size: "2mg", eur: 36 }, { size: "5mg", eur: 68.99 }],
  "ara-290": [{ size: "10mg", eur: 48 }],
  "bac-water": [{ size: "3ml", eur: 8.49 }, { size: "10ml", eur: 9.89 }],
  "bpc-157": [{ size: "5mg", eur: 42.99 }, { size: "10mg", eur: 76.99 }],
  "bpc-tb-blend-10": [{ size: "10mg", eur: 70.99 }],
  "bpc-tb-blend-20": [{ size: "20mg", eur: 130.99 }],
  "cagrilintide": [{ size: "5mg", eur: 66 }, { size: "10mg", eur: 123 }],
  "cjc-1295-dac": [{ size: "2mg", eur: 47.49 }, { size: "5mg", eur: 97.85 }],
  "cjc-1295-no-dac": [{ size: "2mg", eur: 28.99 }, { size: "5mg", eur: 54.99 }, { size: "10mg", eur: 83.85 }],
  "cjc-ipamorelin-blend": [{ size: "10mg", eur: 69 }],
  "dsip": [{ size: "5mg", eur: 26.99 }, { size: "10mg", eur: 44.89 }, { size: "15mg", eur: 53.45 }],
  "epitalon": [{ size: "10mg", eur: 31.99 }, { size: "50mg", eur: 74.99 }],
  "foxo4": [{ size: "10mg", eur: 198.99 }],
  "ghk-cu": [{ size: "50mg", eur: 38.99 }, { size: "100mg", eur: 68.99 }],
  "ghrp-2": [{ size: "5mg", eur: 21.99 }, { size: "10mg", eur: 38.99 }],
  "ghrp-6": [{ size: "5mg", eur: 21.99 }, { size: "10mg", eur: 39.89 }],
  "glow-blend": [{ size: "70mg", eur: 109.89 }],
  "glp-1-sm": [{ size: "5mg", eur: 28.99 }, { size: "10mg", eur: 39.89 }, { size: "15mg", eur: 44.99 }, { size: "20mg", eur: 53.49 }, { size: "30mg", eur: 64.99 }],
  "glp-2-trz": [{ size: "5mg", eur: 24 }, { size: "10mg", eur: 36 }, { size: "15mg", eur: 48 }, { size: "20mg", eur: 54 }, { size: "30mg", eur: 66 }, { size: "40mg", eur: 82.8 }, { size: "50mg", eur: 99 }, { size: "60mg", eur: 109.2 }, { size: "80mg", eur: 139.45 }, { size: "90mg", eur: 153 }, { size: "100mg", eur: 169.89 }, { size: "120mg", eur: 194.99 }],
  "glp-3-rt": [{ size: "5mg", eur: 43.49 }, { size: "10mg", eur: 68.99 }, { size: "15mg", eur: 93.49 }, { size: "20mg", eur: 117.99 }, { size: "30mg", eur: 176.99 }, { size: "40mg", eur: 216.99 }, { size: "50mg", eur: 261.99 }, { size: "60mg", eur: 309.99 }],
  "glutathione": [{ size: "600mg", eur: 24 }, { size: "1500mg", eur: 53.65 }],
  "gonadorelin": [{ size: "2mg", eur: 24.99 }],
  "hcg": [{ size: "5000IU", eur: 68.99 }],
  "hexarelin": [{ size: "5mg", eur: 54 }],
  "hmg": [{ size: "75IU", eur: 40.8 }],
  "igf-1-lr3": [{ size: "0.1mg", eur: 24.99 }, { size: "1mg", eur: 109.89 }],
  "ipamorelin": [{ size: "5mg", eur: 32.99 }, { size: "10mg", eur: 64.99 }],
  "kisspeptin-10": [{ size: "5mg", eur: 33.49 }, { size: "10mg", eur: 48.49 }],
  "kpv": [{ size: "5mg", eur: 30.49 }, { size: "10mg", eur: 45.99 }],
  "ll-37": [{ size: "5mg", eur: 75.99 }],
  "melanotan-1": [{ size: "10mg", eur: 34.99 }],
  "melatonin": [{ size: "10mg", eur: 39 }],
  "mgf": [{ size: "2mg", eur: 39 }],
  "mots-c": [{ size: "10mg", eur: 41.89 }, { size: "20mg", eur: 77.99 }, { size: "40mg", eur: 109.99 }],
  "nad": [{ size: "500mg", eur: 100.99 }, { size: "1000mg", eur: 159.99 }],
  "oxytocin": [{ size: "2mg", eur: 22.49 }, { size: "5mg", eur: 34.99 }],
  "peg-mgf": [{ size: "2mg", eur: 54.99 }],
  "pinealon": [{ size: "10mg", eur: 38.99 }],
  "pt-141": [{ size: "10mg", eur: 40.99 }],
  "selank": [{ size: "5mg", eur: 28.99 }, { size: "10mg", eur: 42.49 }],
  "semax": [{ size: "5mg", eur: 31.49 }, { size: "10mg", eur: 44.99 }],
  "sermorelin": [{ size: "5mg", eur: 45.6 }, { size: "10mg", eur: 79.99 }],
  "ss-31": [{ size: "10mg", eur: 63 }],
  "sterile-water": [{ size: "3ml", eur: 6 }, { size: "10ml", eur: 7.99 }],
  "tb-500": [{ size: "5mg", eur: 49.99 }, { size: "10mg", eur: 98.99 }],
  "tesamorelin": [{ size: "2mg", eur: 36 }, { size: "5mg", eur: 66 }, { size: "10mg", eur: 120 }, { size: "20mg", eur: 198.75 }],
  "thymalin": [{ size: "10mg", eur: 40.99 }],
  "thymosin-alpha-1": [{ size: "5mg", eur: 63 }, { size: "10mg", eur: 105.6 }],
  "vip": [{ size: "10mg", eur: 109.89 }]
};

/** Ordre important : les blends et variantes avant les molecules simples. */
const PEPTIDES_EU_ALIASES: Array<{ pattern: RegExp; slug: string | ((vialMg: number | null) => string) }> = [
  { pattern: /cagrilintide.*semaglutide|semaglutide.*cagrilintide|cagrisema/, slug: "cagrilintide-semaglutide-blend" },
  { pattern: /cjc.*ipamorelin|ipamorelin.*cjc/, slug: "cjc-ipamorelin-blend" },
  { pattern: /bpc.*(tb ?500|thymosin beta)|(tb ?500|thymosin beta).*bpc/, slug: (mg) => (mg === 20 ? "bpc-tb-blend-20" : "bpc-tb-blend-10") },
  { pattern: /\bklow\b/, slug: "klow-blend" },
  { pattern: /\bglow\b/, slug: "glow-blend" },
  { pattern: /cjc.*\b(no|sans|without)\b ?dac|mod ?grf/, slug: "cjc-1295-no-dac" },
  { pattern: /cjc.*\bdac\b/, slug: "cjc-1295-dac" },
  { pattern: /retatrutide|\bglp ?3\b/, slug: "glp-3-rt" },
  { pattern: /tirzepatide|\bglp ?2 ?trz\b/, slug: "glp-2-trz" },
  { pattern: /semaglutide|\bglp ?1 ?sm\b/, slug: "glp-1-sm" },
  { pattern: /cagrilintide/, slug: "cagrilintide" },
  { pattern: /\baod ?9604\b/, slug: "aod-9604" },
  { pattern: /kisspeptin/, slug: "kisspeptin-10" },
  { pattern: /tesamorelin/, slug: "tesamorelin" },
  { pattern: /ipamorelin/, slug: "ipamorelin" },
  { pattern: /\bbpc ?157\b/, slug: "bpc-157" },
  { pattern: /\btb ?500\b|thymosin beta/, slug: "tb-500" },
  { pattern: /\bghk ?cu\b/, slug: "ghk-cu" },
  { pattern: /\bahk ?cu\b/, slug: "ahk-cu" },
  { pattern: /\bmots ?c\b/, slug: "mots-c" },
  { pattern: /\bnad\b/, slug: "nad" },
  { pattern: /sermorelin/, slug: "sermorelin" },
  { pattern: /\bghrp ?2\b/, slug: "ghrp-2" },
  { pattern: /\bghrp ?6\b/, slug: "ghrp-6" },
  { pattern: /hexarelin/, slug: "hexarelin" },
  { pattern: /\bigf ?1 ?lr ?3\b/, slug: "igf-1-lr3" },
  { pattern: /\bpeg ?mgf\b/, slug: "peg-mgf" },
  { pattern: /\bmgf\b/, slug: "mgf" },
  { pattern: /\bdsip\b/, slug: "dsip" },
  { pattern: /epit?h?alon/, slug: "epitalon" },
  { pattern: /\bselank\b/, slug: "selank" },
  { pattern: /\bsemax\b/, slug: "semax" },
  { pattern: /pinealon/, slug: "pinealon" },
  { pattern: /thymalin/, slug: "thymalin" },
  { pattern: /thymosin alpha/, slug: "thymosin-alpha-1" },
  { pattern: /\bkpv\b/, slug: "kpv" },
  { pattern: /\bll ?37\b/, slug: "ll-37" },
  { pattern: /\bpt ?141\b|bremelanotide/, slug: "pt-141" },
  { pattern: /melanotan (1|i)\b/, slug: "melanotan-1" },
  { pattern: /melanotan (2|ii)\b|\bmt ?2\b/, slug: "melanotan-2" },
  { pattern: /oxytocin/, slug: "oxytocin" },
  { pattern: /\bss ?31\b|elamipretide/, slug: "ss-31" },
  { pattern: /\b5 ?amino ?1 ?mq\b/, slug: "5-amino-1mq" },
  { pattern: /\baicar\b/, slug: "aicar" },
  { pattern: /\bara ?290\b|cibinetide/, slug: "ara-290" },
  { pattern: /\bfoxo ?4\b|\bfox04\b/, slug: "foxo4" },
  { pattern: /glutathion/, slug: "glutathione" },
  { pattern: /gonadorelin/, slug: "gonadorelin" },
  { pattern: /\bhcg\b/, slug: "hcg" },
  { pattern: /\bhmg\b/, slug: "hmg" },
  { pattern: /\bvip\b/, slug: "vip" },
  { pattern: /\bsnap ?8\b/, slug: "snap-8" },
  { pattern: /adipotide/, slug: "adipotide" },
  { pattern: /melatonin/, slug: "melatonin" },
  { pattern: /bac(teriostatic)? water/, slug: "bac-water" },
];

function readEnv(name: string): string {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return String(env?.[name] ?? "").trim();
}

function resolveAffiliateUrl(): URL | null {
  const raw = readEnv("PEPTIDES_EU_AFFILIATE_URL") || PEPTIDES_EU_AFFILIATE_URL_DEFAULT;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !/(^|\.)peptides-eu\.net$/i.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function getPeptidesEuCode(): string {
  return readEnv("PEPTIDES_EU_CODE") || PEPTIDES_EU_CODE_DEFAULT;
}

/** Lien affilie general (accueil ou boutique), fallback /store. */
export function getPeptidesEuStoreUrl(): string {
  const affiliate = resolveAffiliateUrl();
  return affiliate ? affiliate.toString() : PEPTIDES_EU_FALLBACK_URL;
}

/** Lien produit avec les parametres du lien affilie recopies. */
export function buildPeptidesEuProductUrl(slug: string): string {
  const affiliate = resolveAffiliateUrl();
  if (!affiliate) return `https://peptides-eu.net/products/${encodeURIComponent(slug)}`;
  const url = new URL(`/products/${encodeURIComponent(slug)}`, affiliate.origin);
  affiliate.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

export function matchPeptidesEuSlug(peptideName: string, vialMg: number | null = null): string | null {
  const name = normalizeName(String(peptideName || ""));
  if (!name) return null;
  for (const alias of PEPTIDES_EU_ALIASES) {
    if (alias.pattern.test(name)) {
      return typeof alias.slug === "function" ? alias.slug(vialMg) : alias.slug;
    }
  }
  return null;
}

function formatEur(value: number): string {
  return `${value.toFixed(2).replace(".", ",").replace(/,00$/, "")} €`;
}

function formatSize(size: string): string {
  return size.replace(/^([\d.]+)(mg|ml|IU)$/i, (_m, n: string, unit: string) => `${n.replace(".", ",")} ${unit === "IU" ? "UI" : unit.toLowerCase()}`);
}

export function describePeptidesEuPrice(slug: string, vialMg: number | null): string | null {
  const formats = PEPTIDES_EU_PRICES[slug];
  if (!formats || formats.length === 0) return null;
  if (vialMg != null) {
    const same = formats.find((format) => Number.parseFloat(format.size) === vialMg && /mg$/i.test(format.size));
    if (same) return `Format ${formatSize(same.size)} : ${formatEur(same.eur)} le flacon`;
  }
  return `Formats : ${formats.map((format) => `${formatSize(format.size)} ${formatEur(format.eur)}`).join(", ")} (prix au flacon)`;
}

export type PeptidesEuPeptideOption = { name: string; url: string; priceLine: string | null };

export type PeptidesEuSourceOption = {
  vendor: "peptides-eu";
  option1Label: string;
  option2Label: string;
  intro: string;
  storeUrl: string;
  storeLabel: string;
  pricesCheckedAt: string;
  peptides: PeptidesEuPeptideOption[];
};

type PeptideLike = {
  name?: unknown;
  purchaseUrl?: unknown;
  activationStatus?: unknown;
  _vialPlanning?: { vialSizeMg?: unknown } | null;
};

/**
 * Construit l'option 2 a partir des peptides du rapport. Ne modifie rien :
 * l'option 1 (purchaseUrl, prix, shopping list) reste celle du rapport.
 */
export function buildPeptidesEuSourceOption(peptides: unknown): PeptidesEuSourceOption {
  const list = Array.isArray(peptides) ? (peptides as PeptideLike[]) : [];
  const options: PeptidesEuPeptideOption[] = [];
  for (const pep of list) {
    if (!pep || pep.activationStatus === "conditional-inactive") continue;
    if (!String(pep.purchaseUrl || "").trim()) continue;
    const name = String(pep.name || "").trim();
    const vialRaw = Number(pep._vialPlanning?.vialSizeMg);
    const vialMg = Number.isFinite(vialRaw) && vialRaw > 0 ? vialRaw : null;
    const slug = matchPeptidesEuSlug(name, vialMg);
    if (!slug) continue;
    options.push({ name, url: buildPeptidesEuProductUrl(slug), priceLine: describePeptidesEuPrice(slug, vialMg) });
  }
  return {
    vendor: "peptides-eu",
    option1Label: PEPTIDES_EU_OPTION_TEXT.option1Label,
    option2Label: PEPTIDES_EU_OPTION_TEXT.option2Label,
    intro: PEPTIDES_EU_OPTION_TEXT.intro,
    storeUrl: getPeptidesEuStoreUrl(),
    storeLabel: PEPTIDES_EU_OPTION_TEXT.storeLabel,
    pricesCheckedAt: PEPTIDES_EU_PRICES_CHECKED_AT,
    peptides: options,
  };
}
