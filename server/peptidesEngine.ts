/**
 * APEXLABS - Peptides Engine v2
 * Generates personalized peptide protocols via Claude.
 * Synced with real Peptaura marketplace catalog.
 * Temperature 0.3 for reproducibility and clinical consistency.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CONFIG, validateAnthropicConfig } from "./anthropicConfig";
import { storage } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeptideItem {
  name: string;
  purpose: string;
  dosage: string;
  timing: string;
  route: string;
  cycleDuration: string;
  purchaseUrl: string;
  priceEstimate: string;
  reconstitution?: string;
  whyThisPeptide?: string;
  vialsNeeded?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export interface PeptidesReport {
  clientName: string;
  tier: string;
  sections: ReportSection[];
  peptides: PeptideItem[];
  bloodMarkers: string[];
  weeklySchedule: string;
  shoppingList: string;
  promoCodesGenerated: string[];
}

// ─── Peptaura Real Catalog (synced 2026-03-28) ──────────────────────────────
// All prices in USD. All products are lyophilized vials (injectable).
// Source: peptaura.com marketplace , 13 Chinese suppliers.
// Active suppliers (2026-05-12): Lumira, Pepturion, Retalux, HelixBridge, Hang Sciences, Railion Tech.
// France-shipping suppliers (5): Lumira, HelixBridge, Hang Sciences, Railion Tech, Retalux. Pepturion does NOT ship to France.
// MOQs: Hang Sciences $39, Railion Tech $96. Others have no enforced minimum.

export interface PeptaurProduct {
  name: string;
  slug: string; // URL: peptaura.com/catalog/{slug}
  dosages: string[]; // e.g. ["5mg", "10mg"]
  priceRangeUSD: string; // e.g. "$9.65 - $266"
  cheapestSupplier: string;
  cheapestPriceUSD: number; // lowest single vial
  supplierCount: number;
  formFactor: "vial" | "cartridge" | "nasal spray";
  category: "recovery" | "gh-secretagogue" | "fat-loss" | "sleep" | "cognitive" | "libido" | "skin" | "longevity" | "endurance" | "glp1" | "blend" | "supplies" | "hpg-axis" | "other";
}

export const PEPTAURA_CATALOG: PeptaurProduct[] = [
// RECOVERY & HEALING
  { name: "Ara-290", slug: "Ara-290", dosages: ["10mg", "16mg"], priceRangeUSD: "$21.01 - $107.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 21.01, supplierCount: 3, formFactor: "vial", category: "recovery" },
  { name: "BPC-157", slug: "BPC157", dosages: ["5mg", "10mg"], priceRangeUSD: "$14.48 - $134.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 5, formFactor: "vial", category: "recovery" },
  { name: "Cerebrolysin", slug: "Cerebrolysin", dosages: ["60mg"], priceRangeUSD: "$22.65 - $116.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 22.65, supplierCount: 1, formFactor: "vial", category: "recovery" },
  { name: "Dermorphin", slug: "Dermorphin", dosages: ["5mg", "10mg"], priceRangeUSD: "$15.29 - $152.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.29, supplierCount: 1, formFactor: "vial", category: "recovery" },
  { name: "KPV", slug: "KPV", dosages: ["5mg", "10mg"], priceRangeUSD: "$18.56 - $107.10", cheapestSupplier: "Lumira", cheapestPriceUSD: 18.56, supplierCount: 5, formFactor: "vial", category: "recovery" },
  { name: "LL-37", slug: "LL-37", dosages: ["5mg"], priceRangeUSD: "$30.58 - $156.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 30.58, supplierCount: 3, formFactor: "vial", category: "recovery" },
  { name: "TB-500", slug: "TB500", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$15.61 - $268.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.61, supplierCount: 5, formFactor: "vial", category: "recovery" },
  { name: "Thymalin", slug: "Thymalin", dosages: ["10mg", "50mg"], priceRangeUSD: "$22.65 - $416", cheapestSupplier: "Lumira", cheapestPriceUSD: 22.65, supplierCount: 5, formFactor: "vial", category: "recovery" },
  { name: "Thymosin Alpha-1", slug: "Thymosin Alpha-1", dosages: ["5mg", "10mg"], priceRangeUSD: "$29.48 - $313.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 29.48, supplierCount: 4, formFactor: "vial", category: "recovery" },
  { name: "VIP", slug: "VIP", dosages: ["5mg", "10mg"], priceRangeUSD: "$28.66 - $268.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 28.66, supplierCount: 5, formFactor: "vial", category: "recovery" },

  // HPG-AXIS (TRT-alternatives, fertility)
  { name: "HCG", slug: "HCG", dosages: ["1000IU", "2000IU", "5000IU", "10000IU"], priceRangeUSD: "$27.02 - $253.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 27.02, supplierCount: 4, formFactor: "vial", category: "hpg-axis" },

  // GH SECRETAGOGUES
  { name: "CJC-1295 (no DAC)", slug: "CJC-1295 (no DAC)", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$13.65 - $228.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.65, supplierCount: 5, formFactor: "vial", category: "gh-secretagogue" },
  { name: "CJC-1295 (with DAC)", slug: "CJC-1295 (with DAC)", dosages: ["2mg", "5mg"], priceRangeUSD: "$27.30 - $302.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 27.3, supplierCount: 4, formFactor: "vial", category: "gh-secretagogue" },
  { name: "GHRP-2", slug: "GHRP-2 Acetate", dosages: ["5mg", "10mg", "15mg"], priceRangeUSD: "$12.01 - $112", cheapestSupplier: "Lumira", cheapestPriceUSD: 12.01, supplierCount: 4, formFactor: "vial", category: "gh-secretagogue" },
  { name: "GHRP-6", slug: "GHRP-6 Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$11.47 - $102.90", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.47, supplierCount: 4, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HGH (Somatropin)", slug: "Somatropin (HGH)", dosages: ["10IU", "12IU", "15IU", "24IU", "36IU"], priceRangeUSD: "$19.39 - $322", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.39, supplierCount: 1, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HGH Fragment 176-191", slug: "HGH Fragment 176-191", dosages: ["5mg", "10mg"], priceRangeUSD: "$31.95 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 31.95, supplierCount: 1, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HMG", slug: "HMG", dosages: ["75IU"], priceRangeUSD: "$20.75 - $106.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 20.75, supplierCount: 2, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Hexarelin", slug: "Hexarelin Acetate", dosages: ["2mg", "5mg"], priceRangeUSD: "$15.83 - $179.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.83, supplierCount: 2, formFactor: "vial", category: "gh-secretagogue" },
  { name: "IGF-1 LR3", slug: "IGF-1LR3", dosages: ["0.1mg", "1mg"], priceRangeUSD: "$13.38 - $380.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.38, supplierCount: 4, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Ipamorelin", slug: "Ipamorelin", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$13.38 - $134.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.38, supplierCount: 5, formFactor: "vial", category: "gh-secretagogue" },
  { name: "PEG-MGF", slug: "PEG MGF", dosages: ["2mg"], priceRangeUSD: "$29.20 - $149.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 29.2, supplierCount: 2, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Sermorelin", slug: "Sermorelin", dosages: ["5mg", "10mg"], priceRangeUSD: "$78 - $169", cheapestSupplier: "Retalux", cheapestPriceUSD: 7.8, supplierCount: 1, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Sermorelin Acetate", slug: "Sermorelin Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$25.68 - $198.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 25.68, supplierCount: 2, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Tesamorelin", slug: "Tesamorelin", dosages: ["2mg", "5mg", "10mg", "20mg"], priceRangeUSD: "$18.56 - $582.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 18.56, supplierCount: 5, formFactor: "vial", category: "gh-secretagogue" },

  // FAT LOSS (non-GLP1)
  { name: "5-Amino-1MQ", slug: "5-AMINO-1MQ", dosages: ["5mg", "10mg", "50mg"], priceRangeUSD: "$15.57 - $162.50", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.57, supplierCount: 5, formFactor: "vial", category: "fat-loss" },
  { name: "AOD-9604", slug: "AOD-9604", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$15.01 - $281.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.01, supplierCount: 3, formFactor: "vial", category: "fat-loss" },
  { name: "L-Carnitine", slug: "L-Carnitine", dosages: ["600mg", "1200mg"], priceRangeUSD: "$17.75 - $105", cheapestSupplier: "Lumira", cheapestPriceUSD: 17.75, supplierCount: 2, formFactor: "vial", category: "fat-loss" },
  { name: "Lipo-C", slug: "Lipo c", dosages: ["10ml"], priceRangeUSD: "$19.39 - $99.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.39, supplierCount: 1, formFactor: "vial", category: "fat-loss" },

  // GLP-1 AGONISTS
  { name: "Cagrilintide", slug: "Cagrilintide", dosages: ["2mg", "5mg", "10mg", "15mg"], priceRangeUSD: "$19.94 - $389.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.94, supplierCount: 5, formFactor: "vial", category: "glp1" },
  { name: "Cagrilintide + Semaglutide Blend", slug: "Cagrilintide+Semaglutide", dosages: ["5mg", "10mg"], priceRangeUSD: "$40.81 - $371", cheapestSupplier: "Lumira", cheapestPriceUSD: 40.81, supplierCount: 3, formFactor: "vial", category: "glp1" },
  { name: "Mazdutide", slug: "Mazdutide", dosages: ["5mg", "10mg"], priceRangeUSD: "$66.61 - $341.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 66.61, supplierCount: 3, formFactor: "vial", category: "glp1" },
  { name: "Retatrutide", slug: "Retatrutide", dosages: ["5mg", "10mg", "15mg", "20mg", "30mg", "40mg", "50mg", "60mg"], priceRangeUSD: "$20.48 - $735", cheapestSupplier: "Lumira", cheapestPriceUSD: 20.48, supplierCount: 6, formFactor: "vial", category: "glp1" },
  { name: "Semaglutide", slug: "Semaglutide", dosages: ["2mg", "5mg", "10mg", "15mg", "20mg", "30mg", "50mg"], priceRangeUSD: "$8.47 - $224", cheapestSupplier: "Lumira", cheapestPriceUSD: 8.47, supplierCount: 6, formFactor: "vial", category: "glp1" },
  { name: "Survodutide", slug: "Survodutide", dosages: ["10mg"], priceRangeUSD: "$100.73 - $516.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 100.73, supplierCount: 4, formFactor: "vial", category: "glp1" },
  { name: "Tirzepatide", slug: "Tirzepatide", dosages: ["5mg", "10mg", "15mg", "20mg", "30mg", "40mg", "45mg", "50mg", "60mg", "70mg", "80mg", "90mg", "100mg", "120mg"], priceRangeUSD: "$14.48 - $670.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 6, formFactor: "vial", category: "glp1" },

  // SLEEP
  { name: "DSIP", slug: "DSIP", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$9.83 - $121.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.83, supplierCount: 6, formFactor: "vial", category: "sleep" },
  { name: "Melatonin", slug: "Melatonin", dosages: ["10mg"], priceRangeUSD: "$20.47 - $105", cheapestSupplier: "Lumira", cheapestPriceUSD: 20.47, supplierCount: 2, formFactor: "vial", category: "sleep" },

  // COGNITIVE & NEUROPROTECTION
  { name: "Adamax", slug: "Adamax", dosages: ["5mg", "10mg"], priceRangeUSD: "$39.05 - $200.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 39.05, supplierCount: 2, formFactor: "vial", category: "cognitive" },
  { name: "KissPeptin-10", slug: "KissPeptin-10", dosages: ["5mg", "10mg"], priceRangeUSD: "$19.11 - $172.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.11, supplierCount: 6, formFactor: "vial", category: "cognitive" },
  { name: "Oxytocin", slug: "Oxytocin Acetate", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$13.38 - $99.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.38, supplierCount: 2, formFactor: "vial", category: "cognitive" },
  { name: "P21", slug: "P21", dosages: ["5mg"], priceRangeUSD: "$105.53 - $539", cheapestSupplier: "Lumira", cheapestPriceUSD: 105.53, supplierCount: 1, formFactor: "vial", category: "cognitive" },
  { name: "PE 22-28", slug: "PE 22-28", dosages: ["5mg", "10mg"], priceRangeUSD: "$13.38 - $131.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.38, supplierCount: 1, formFactor: "vial", category: "cognitive" },
  { name: "Pinealon", slug: "Pinealon", dosages: ["10mg"], priceRangeUSD: "$20.48 - $105", cheapestSupplier: "Lumira", cheapestPriceUSD: 20.48, supplierCount: 1, formFactor: "vial", category: "cognitive" },
  { name: "Selank", slug: "Selank", dosages: ["5mg", "10mg", "11mg"], priceRangeUSD: "$13.97 - $123.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.97, supplierCount: 5, formFactor: "nasal spray", category: "cognitive" },
  { name: "Semax", slug: "Semax", dosages: ["5mg", "10mg"], priceRangeUSD: "$14.48 - $123.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 5, formFactor: "nasal spray", category: "cognitive" },

  // LIBIDO & SEXUAL
  { name: "Melanotan II", slug: "MT-2", dosages: ["10mg"], priceRangeUSD: "$16.10 - $82.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.1, supplierCount: 4, formFactor: "vial", category: "libido" },
  { name: "PT-141", slug: "PT-141", dosages: ["10mg"], priceRangeUSD: "$21.57 - $112", cheapestSupplier: "Lumira", cheapestPriceUSD: 21.57, supplierCount: 5, formFactor: "vial", category: "libido" },

  // SKIN, HAIR & ANTI-AGING
  { name: "AHK-Cu", slug: "AHK-Cu", dosages: ["20mg", "50mg", "100mg"], priceRangeUSD: "$11.47 - $119.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.47, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "GHK", slug: "GHK", dosages: ["50mg"], priceRangeUSD: "$76.70 - $76.70", cheapestSupplier: "HelixBridge", cheapestPriceUSD: 7.67, supplierCount: 1, formFactor: "vial", category: "skin" },
  { name: "GHK-Cu", slug: "GHK-Cu", dosages: ["50mg", "100mg"], priceRangeUSD: "$11.47 - $100.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.47, supplierCount: 6, formFactor: "vial", category: "skin" },
  { name: "Hyaluronic Acid", slug: "Hyaluronic Acid", dosages: ["5mg"], priceRangeUSD: "$97.50 - $228.80", cheapestSupplier: "Retalux", cheapestPriceUSD: 9.75, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "Melanotan I", slug: "MT-1", dosages: ["10mg"], priceRangeUSD: "$16.11 - $89.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.11, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "Snap-8", slug: "Snap-8", dosages: ["10mg", "100mg"], priceRangeUSD: "$14.48 - $372.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 5, formFactor: "vial", category: "skin" },

  // LONGEVITY & MITOCHONDRIA
  { name: "Cartalax", slug: "Cartalax", dosages: ["10mg", "20mg"], priceRangeUSD: "$25.41 - $208", cheapestSupplier: "Lumira", cheapestPriceUSD: 25.41, supplierCount: 2, formFactor: "vial", category: "longevity" },
  { name: "Epitalon", slug: "Epitalon", dosages: ["10mg", "50mg"], priceRangeUSD: "$14.48 - $273", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 6, formFactor: "vial", category: "longevity" },
  { name: "FOX04", slug: "FOX04", dosages: ["10mg"], priceRangeUSD: "$94.46 - $484.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 94.46, supplierCount: 2, formFactor: "vial", category: "longevity" },
  { name: "FOX04-DRI", slug: "FOX04-DRI", dosages: ["10mg"], priceRangeUSD: "$123.76 - $952", cheapestSupplier: "Lumira", cheapestPriceUSD: 123.76, supplierCount: 1, formFactor: "vial", category: "longevity" },
  { name: "Glutathione", slug: "Glutathione", dosages: ["600mg", "1500mg"], priceRangeUSD: "$10.64 - $128.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.64, supplierCount: 3, formFactor: "vial", category: "longevity" },
  { name: "MOTS-c", slug: "MOTS-c", dosages: ["10mg", "20mg", "40mg"], priceRangeUSD: "$23.76 - $336", cheapestSupplier: "Lumira", cheapestPriceUSD: 23.76, supplierCount: 4, formFactor: "vial", category: "longevity" },
  { name: "NAD+", slug: "NAD+", dosages: ["100mg", "500mg", "1000mg"], priceRangeUSD: "$24.85 - $282", cheapestSupplier: "Lumira", cheapestPriceUSD: 24.85, supplierCount: 4, formFactor: "vial", category: "longevity" },
  { name: "NAD+ (buffered)", slug: "NAD (buffered)", dosages: ["500mg", "1000mg"], priceRangeUSD: "$15.01 - $133", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.01, supplierCount: 1, formFactor: "vial", category: "longevity" },

  // ENDURANCE
  { name: "SLU-PP-332", slug: "SLU-PP-332", dosages: ["5mg"], priceRangeUSD: "$156 - $167.70", cheapestSupplier: "Retalux", cheapestPriceUSD: 15.6, supplierCount: 2, formFactor: "vial", category: "endurance" },
  { name: "SS-31 (Elamipretide)", slug: "SS-31", dosages: ["5mg", "10mg", "50mg"], priceRangeUSD: "$16.80 - $646.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.8, supplierCount: 5, formFactor: "vial", category: "endurance" },

  // BLENDS & PROPRIETARY
  { name: "BPC-157 + TB-500 Blend", slug: "BPC157+TB500", dosages: ["10mg", "20mg", "30mg"], priceRangeUSD: "$34.40 - $530.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 34.4, supplierCount: 5, formFactor: "vial", category: "blend" },
  { name: "CJC-1295 + Ipamorelin Blend", slug: "CJC-1295 (no DAC) + Ipamorelin", dosages: ["10mg"], priceRangeUSD: "$34.94 - $179.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 34.94, supplierCount: 4, formFactor: "vial", category: "blend" },
  { name: "GLOW (blend)", slug: "GLOW", dosages: ["70mg"], priceRangeUSD: "$67.70 - $347.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 67.7, supplierCount: 4, formFactor: "vial", category: "blend" },
  { name: "KLOW (blend)", slug: "KLOW", dosages: ["80mg"], priceRangeUSD: "$81.09 - $436.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 81.09, supplierCount: 5, formFactor: "vial", category: "blend" },

  // SUPPLIES & EQUIPMENT
  { name: "Acetic Acid", slug: "Acetic Acid", dosages: ["3ml", "10ml"], priceRangeUSD: "$5.18 - $30.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 5.18, supplierCount: 2, formFactor: "vial", category: "supplies" },
  { name: "BAC Water", slug: "BAC Water", dosages: ["3ml", "5ml", "10ml"], priceRangeUSD: "$3.01 - $23.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 3.01, supplierCount: 2, formFactor: "vial", category: "supplies" },

  // OTHER
  { name: "B12", slug: "B12", dosages: ["10mg/ml"], priceRangeUSD: "$117 - $130", cheapestSupplier: "Hang Sciences", cheapestPriceUSD: 11.7, supplierCount: 2, formFactor: "vial", category: "other" },
];
// Total: 71 products synced from peptaura.com (2026-05-12 with real per-vial prices from JS-rendered scrape)

// Build catalog summary for Claude prompt
// Only inject protocol-relevant peptides into the prompt (not supplies/blends/niche)
const PROMPT_CATEGORIES = new Set(["recovery", "gh-secretagogue", "fat-loss", "sleep", "cognitive", "libido", "skin", "longevity", "endurance", "glp1"]);

function buildCatalogForPrompt(): string {
  const relevant = PEPTAURA_CATALOG.filter(p => PROMPT_CATEGORIES.has(p.category));
  const lines: string[] = [];
  lines.push("CATALOGUE PEPTAURA (peptaura.com) , PRIX RÉELS EN USD");
  lines.push("Marketplace, 6 fournisseurs COA-verifies actifs (Lumira, Pepturion, Retalux, HelixBridge, Hang Sciences, Railion Tech). Client FRANCE : 5 fournisseurs livrent (Lumira, HelixBridge, Hang Sciences MOQ $39, Railion Tech MOQ $96, Retalux). PEPTURION NE LIVRE PAS EN FRANCE (jamais recommander a un client FR).");
  lines.push("Tous les produits: vials lyophilises (reconstituer avec BAC water).\n");

  for (const p of relevant) {
    lines.push(`• ${p.name} | ${p.dosages.join("/")} | $${p.cheapestPriceUSD} (${p.cheapestSupplier}) | peptaura.com/catalog/${p.slug}`);
  }

  lines.push("\nEquipement: BAC water ($2/vial sur Peptaura), seringues insuline U-100 31G 8mm (les plus fines et courtes , parfaites pour injection SC, quasi indolores), tampons alcool.");
  return lines.join("\n");
}

// ─── Client (lazy init) ───────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!validateAnthropicConfig()) {
      throw new Error("[PeptidesEngine] Anthropic API key not configured");
    }
    _client = new Anthropic({ apiKey: ANTHROPIC_CONFIG.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Post-processing: remove all dashes/em-dashes from report content
 * and fix 3rd person references to direct "tu" form
 */
function cleanReportContent(report: PeptidesReport, firstName: string): PeptidesReport {
  const cleanText = (text: string): string => {
    if (!text) return text;
    // Replace em dash / en dash with comma or colon
    let cleaned = text.replace(/ — /g, ", ").replace(/ – /g, ", ");
    cleaned = cleaned.replace(/—/g, ", ").replace(/–/g, ", ");
    // Fix double commas from replacement
    cleaned = cleaned.replace(/,\s*,/g, ",");
    // Fix 3rd person: "Prénom cherche" → "Tu cherches"
    const namePattern = new RegExp(`${firstName}\\s+(cherche|veut|souhaite|a besoin|desire|préfère|prefere|fait|pratique|s'entraîne|s'entraine)`, "gi");
    cleaned = cleaned.replace(namePattern, (_match, verb) => {
      const verbMap: Record<string, string> = {
        "cherche": "Tu cherches",
        "veut": "Tu veux",
        "souhaite": "Tu souhaites",
        "a besoin": "Tu as besoin",
        "desire": "Tu desires",
        "désire": "Tu désires",
        "préfère": "Tu préfères",
        "prefere": "Tu preferes",
        "fait": "Tu fais",
        "pratique": "Tu pratiques",
        "s'entraîne": "Tu t'entraînes",
        "s'entraine": "Tu t'entraines",
      };
      return verbMap[verb.toLowerCase()] || `Tu ${verb}s`;
    });
    // Fix "Prénom va" → "Tu vas"
    cleaned = cleaned.replace(new RegExp(`${firstName} va `, "gi"), "Tu vas ");
    // Fix "Prénom est" → "Tu es"
    cleaned = cleaned.replace(new RegExp(`${firstName} est `, "gi"), "Tu es ");
    // Fix "Prénom a " → "Tu as "
    cleaned = cleaned.replace(new RegExp(`${firstName} a (un|une|des|le|la|les|besoin|deja|déjà)`, "gi"), "Tu as $1");
    return cleaned;
  };

  // Clean all sections
  for (const section of report.sections) {
    section.content = cleanText(section.content);
    if (section.title) section.title = section.title.replace(/—/g, ":").replace(/–/g, ":");
  }

  // Clean peptide descriptions
  for (const pep of report.peptides) {
    if (pep.purpose) pep.purpose = cleanText(pep.purpose);
    if (pep.whyThisPeptide) pep.whyThisPeptide = cleanText(pep.whyThisPeptide);
  }

  return report;
}

function generatePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PEPBLOOD-${code}`;
}

function extractFirstName(responses: Record<string, unknown>, email: string): string {
  const raw =
    (responses as any)?.prenom ??
    (responses as any)?.pep_name ??
    (responses as any)?.firstName ??
    (responses as any)?.firstname ??
    (responses as any)?.name;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().split(/\s+/)[0];
  }
  if (email.includes("@")) return email.split("@")[0];
  return "Profil";
}

function buildResponsesSummary(responses: Record<string, unknown>): string {
  const lines: string[] = [];

  const FIELD_LABELS: Record<string, string> = {
    pep_name: "Prénom",
    pep_age: "Age",
    pep_weight: "Poids (kg)",
    pep_height: "Taille (cm)",
    pep_bf: "Taux de masse grasse",
    pep_experience: "Expérience peptides",
    pep_primary_goal: "Objectif principal",
    pep_secondary_goals: "Objectifs secondaires",
    pep_timeline: "Timeline souhaitée",
    pep_injury_details: "Détails blessure",
    pep_fatloss_methods: "Méthodes fat loss passées",
    pep_sleep_type: "Type problème sommeil",
    pep_conditions: "Conditions médicales",
    pep_conditions_other: "Autres conditions",
    pep_medications: "Médicaments actuels",
    pep_allergies: "Allergies",
    pep_blood_recent: "Bilan sanguin récent",
    pep_trt: "TRT / Hormonothérapie",
    pep_trt_details: "Détails TRT",
    pep_peds_history: "Historique PEDs",
    pep_testo_symptoms: "Symptômes hypogonadisme ressentis",
    pep_testo_bloodwork: "Bilan hormonal récent",
    pep_testo_fertility: "Préservation fertilité",
    pep_testo_pct_context: "Contexte baisse testostérone",
    pep_budget: "Budget mensuel",
    pep_injection_comfort: "Confort injections",
    pep_injection_type: "Type injection préféré",
    pep_frequency: "Fréquence acceptable",
    pep_storage: "Accès réfrigérateur",
    pep_reconstitution: "Expérience reconstitution",
    pep_current_peptides: "Peptides actuels",
    pep_past_peptides: "Peptides passés",
    pep_current_supps: "Suppléments actuels",
    pep_training_type: "Type entraînement",
    pep_training_freq: "Fréquence entraînement",
    pep_nutrition: "Nutrition",
    pep_start_when: "Quand commencer",
    pep_blood_commit: "Engagement bilan sanguin",
    pep_coaching_interest: "Intérêt coaching",
    pep_requested_peptides: "Peptides specifiquement demandes par le client",
    pep_questions: "Questions additionnelles",
    // Legacy field names
    prenom: "Prénom",
    firstName: "Prénom",
    age: "Age",
    sexe: "Sexe",
    poids: "Poids (kg)",
    taille: "Taille (cm)",
    objectifPrincipal: "Objectif principal",
    objectifSecondaire: "Objectif secondaire",
    experience: "Expérience peptides",
    budget: "Budget mensuel (EUR)",
    budgetMensuel: "Budget mensuel (EUR)",
  };

  const SKIP_KEYS = new Set(["photo", "image", "photos", "password", "pep_email"]);

  for (const [key, value] of Object.entries(responses)) {
    if (!value && value !== 0) continue;
    if (SKIP_KEYS.has(key.toLowerCase())) continue;

    const label = FIELD_LABELS[key] || key;
    const strValue = Array.isArray(value)
      ? value.join(", ")
      : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

    if (strValue.startsWith("data:image/")) continue;
    if (strValue.trim().length === 0) continue;

    lines.push(`${label}: ${strValue}`);
  }

  return lines.join("\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es Achzod, coach en optimisation humaine. Tu as 15 ans d'expérience avec les peptides thérapeutiques, tu les utilises personnellement et tu coaches des dizaines de clients dessus. Tu t'exprimes en français.

TON ET STYLE : ABSOLUMENT CRITIQUE
Tu écris comme si le client était assis en face de toi dans ton bureau. Tu lui parles, tu lui expliques, tu prends ton temps. Ce rapport vaut 299 euros, chaque section doit être une masterclass.

INTERDIT (VIOLATION = RAPPORT REJETÉ):
Tu ne dois JAMAIS utiliser les caractères suivants : - ou • ou * ou – ou , ou >> NI EN DÉBUT DE LIGNE, NI EN MILIEU DE PHRASE. Le tiret long , est INTERDIT PARTOUT. Utilise des virgules, des points, des deux-points, ou reformule la phrase.
Tu ne dois JAMAIS faire de listes à puces. JAMAIS. Ni avec des tirets, ni avec des points, ni avec des étoiles, ni avec des numéros secs.
Tu ne dois JAMAIS écrire dans un style "fiche technique" ou "notice médicale".
Tu ne dois JAMAIS utiliser de phrases génériques type IA comme "Il est important de noter que...", "N'hésitez pas à...", "En conclusion...", "Voici les points clés...".
Tu ne dois JAMAIS avoir un ton impersonnel ou distant.
Tu ne dois JAMAIS parler du client à la 3ème personne ("Sofiane cherche à...", "Le client veut..."). Tu t'adresses DIRECTEMENT au client avec "tu" et "toi". C'est "Tu cherches à perdre du gras" et NON "Sofiane cherche à perdre du gras".
Chaque information doit être intégrée dans une PHRASE COMPLÈTE à l'intérieur d'un PARAGRAPHE. Pas de raccourcis, pas de listes, pas de tirets, pas de ,.

OBLIGATOIRE:
Des PARAGRAPHES de 3 à 5 phrases minimum. Tu développes, tu expliques, tu contextualises.
Tu appelles le client par son prénom à chaque section.
Tu utilises "je" (pas "nous" ni "on"), c'est TOI Achzod qui parle.
Tu anticipes ses questions : "Tu te demandes sûrement pourquoi...", "La question que tout le monde se pose c'est..."
Tu rassures : "C'est plus simple que ça en a l'air", "Des milliers de personnes font ça chaque jour".
Chaque terme technique est IMMÉDIATEMENT suivi d'une explication simple entre parenthèses ou dans la phrase suivante.
Tu donnes des analogies concrètes pour que le client visualise.
COHERENCE (CRITIQUE):
Avant de finaliser le rapport, RELIS TOUT et verifie qu'aucune section ne contredit une autre. Si tu dis dans une section qu'un aliment ou supplement est inutile, ne dis PAS dans une autre section qu'il est recommande. Chaque conseil doit etre coherent du debut a la fin. Si tu n'es pas sur d'une information, ne l'inclus pas. Mieux vaut moins de contenu que du contenu contradictoire. Le client paie 299 euros, il ne doit JAMAIS trouver de contradiction dans son rapport.

RAPPEL FINAL: AUCUN tiret (ni -, ni ,, ni –), aucun bullet point, aucune liste à puces. Le caractère , est INTERDIT même en milieu de phrase. Utilise une virgule ou un deux-points à la place. Tu TUTOIES le client directement ("tu", "toi", "ton"), jamais la 3ème personne.

EXEMPLE DE CE QUE JE VEUX:
"Lucas, la reconstitution c'est l'étape qui impressionne le plus les débutants, mais en réalité c'est aussi simple que de préparer un café. Ton flacon de BPC-157 contient une poudre blanche lyophilisée, c'est simplement le peptide qui a été déshydraté pour le conserver. Pour le réactiver, tu vas ajouter de l'eau bactériostatique, qu'on appelle BAC water. C'est de l'eau stérile avec une infime quantité d'alcool benzylique qui empêche les bactéries de s'y développer. C'est ce qui te permet de garder ton flacon au frigo pendant plusieurs semaines sans qu'il se dégrade."

EXEMPLE DE CE QUE JE NE VEUX PAS:
"BPC-157: Vial 5mg + 2ml BAC water = 2500 mcg/ml → 10 unités U-100 pour 250 mcg. Stockage: 2-8°C."

CADRE DE TRAVAIL
- Tu fournis des protocoles personnalisés basés sur les données du profil
- Tu ne prescris pas , tu informes et recommandes avec une approche harm reduction
- Tu adaptes aux contraintes individuelles (santé, budget, voie d'administration, expérience)
- IMPORTANT: Ajuste les dosages au poids du client (mcg/kg) quand pertinent
- IMPORTANT: Recommande UNIQUEMENT des produits disponibles sur Peptaura
- IMPORTANT: Pas de voie orale. SC (sous-cutané), IM (intramusculaire), ou intranasal uniquement

CHOIX DU FOURNISSEUR (CRITIQUE , LIVRAISON FRANCE/EUROPE)
Le client est en France/Europe. Peptaura est un marketplace mais TOUS les fournisseurs ne livrent PAS en France.

⚠️ INTERDICTION ABSOLUE , NE JAMAIS RECOMMANDER :
- Pepturion : NE LIVRE PAS EN FRANCE. Même si le catalogue indique "cheapestSupplier: Pepturion" pour certaines molécules, NE LE RECOMMANDE JAMAIS. C'est une erreur terrain confirmée.

FOURNISSEURS QUI LIVRENT EN FRANCE (hiérarchie à suivre selon budget) :

1. **LUMIRA** (fournisseur principal par défaut , recommander en PREMIER choix)
   - Livre en France, pas de MOQ bloquant, 4.82/5, meilleurs prix unitaires du marketplace
   - Convient pour TOUS les budgets (petits et gros)
   - URL catalogue : peptaura.com/catalog/[SLUG]
   - C'est le fournisseur que tu recommandes par défaut, sauf rupture de stock sur la molécule

2. **APEXION LABS** (fallback petit budget / produit rupture Lumira)
   - Livre en France, MOQ très bas ($24), bon rapport qualité/prix
   - Utile si Lumira est en rupture sur une molécule spécifique
   - Ou si le client veut commander petit et tester avant de scaler

3. **HANG SCIENCES, RAILION TECH, ARCADIA BIOLABS, HEBEI KTC, HELIXBRIDGE, NOVAVIAL, SOLVION, VIALFORGE**
   - Les 5 fournisseurs France-shipping sont des alternatives interchangeables (meme molecule, COA, purete)
   - Mentionne-les en fallback dans la section "rupture de stock"

RÈGLES :
- Par DÉFAUT : recommande LUMIRA en premier choix, avec explication "meilleurs prix + livraison France confirmée".
- Si le catalogue indique "cheapestSupplier: Pepturion" : DIS AU CLIENT DE NE PAS UTILISER PEPTURION (pas de livraison France), et recommande Lumira ou Retalux/HelixBridge à la place. Utilise le prix "priceRangeUSD" du catalogue comme fourchette indicative.
- Mentionne toujours : "vérifie la disponibilité sur peptaura.com/shipping?country=France avant de commander, certains fournisseurs peuvent être temporairement hors stock".
- PRIX : utilise UNIQUEMENT le catalogue (cheapestPriceUSD ou priceRangeUSD). N'INVENTE JAMAIS un prix. Si tu n'as que le prix Pepturion en cheapestPriceUSD, donne une fourchette réaliste basée sur priceRangeUSD et précise "prix Lumira à vérifier sur le site".

QUANTITES ET PRIX DEGRESSIFS
Quand tu calcules le nombre de vials necessaires pour le cycle, mentionne TOUJOURS au client que commander en lot de 10 vials est generalement plus economique (prix degressif) et que les fournisseurs ont plus de stock disponible sur les commandes groupees. Par exemple, si le client a besoin de 4 vials de BPC-157 pour un cycle de 8 semaines, suggere-lui de commander 10 vials d'un coup : ca couvre 2 cycles, le prix unitaire baisse, et il n'aura pas a recommander entre deux cycles. Precise que les vials lyophilises (non reconstitues) se conservent des mois voire des annees a temperature ambiante, donc pas de risque de gaspillage. Integre ce conseil dans la section "Liste de courses Peptaura" ou "Comment commander sur Peptaura".

RUPTURE DE STOCK / PRODUIT INDISPONIBLE
Dans la section "Comment commander sur Peptaura", tu DOIS expliquer au client ce qu'il doit faire si le fournisseur recommandé n'a pas le produit en stock. Explique-lui que Peptaura est un marketplace avec 6 fournisseurs actifs (Lumira, Pepturion, Retalux, HelixBridge, Hang Sciences, Railion Tech), mais que seulement 5 livrent en France. Si Lumira (fournisseur par défaut) est en rupture, bascule vers Retalux, HelixBridge, Hang Sciences (MOQ $39) ou Railion Tech (MOQ $96) , ces 5-la livrent tous en France. NE JAMAIS suggérer Pepturion (ne livre PAS en France). Le peptide est le même (même molécule, même pureté COA), seul le prix peut varier légèrement. Lien de vérification : peptaura.com/shipping?country=France pour voir qui est en stock et livre en France au moment de la commande.

PLAN B FOURNISSEURS (section "disclaimer-support")
Si Peptaura est en rupture totale sur une molécule ou si le client veut comparer les prix, il existe des fournisseurs chinois directs avec lesquels on peut échanger rapidement sur WhatsApp. Ce sont des manufacturers vérifiés sur GlobalSources. Mentionne ces 5 fournisseurs dans la section "disclaimer-support" comme plan B :
1. Luta : https://luta.manufacturer.globalsources.com/homepage_6003002403155.htm
2. Lijiu : https://lijiu.manufacturer.globalsources.com/homepage_6003002415560.htm
3. YX Trading : https://yxtrading.manufacturer.globalsources.com/homepage_6003002363820.htm
4. Meiliduo : https://meiliduo.manufacturer.globalsources.com/homepage_6003002415233.htm
5. Shangye : https://shangye.manufacturer.globalsources.com/homepage_6003002363391.htm
Explique au client que ces fournisseurs sont contactables directement via WhatsApp (bouton sur leur page GlobalSources), que les échanges sont rapides, et qu'il peut demander le COA (certificat d'analyse) avant de commander. Précise que c'est un plan B et que Peptaura reste la méthode la plus simple pour un débutant.

PLAN C FOURNISSEURS EUROPE/UK (section "disclaimer-support")
Pour les clients qui veulent une livraison rapide (2-5 jours au lieu de 7-14 depuis la Chine), il existe des fournisseurs basés au Royaume-Uni. Les prix sont plus élevés que Peptaura ou les fournisseurs chinois, mais la livraison est beaucoup plus rapide et il n'y a pas de risque douane. Mentionne ces 2 sources dans la section "disclaimer-support" comme plan C :
1. Peptiology UK : https://peptiology.co.uk/ (basé au Royaume-Uni, large catalogue de peptides, livraison rapide Europe)
2. UK Peptides : https://www.uk-peptides.com/ (basé au Royaume-Uni, peptides de recherche, livraison express)
Précise que ces sources sont plus chères que Peptaura (environ 2 à 3 fois le prix) mais que la livraison est en 2-5 jours ouvrés au lieu de 7-14 jours. C'est une option pour ceux qui veulent commencer rapidement ou qui ne veulent pas attendre la livraison depuis la Chine.

PLAN D FOURNISSEUR PREMIUM EUROPE (section "disclaimer-support")
Pour les clients qui veulent la meilleure fiabilité possible avec livraison Europe et paiement simple par virement bancaire :
1. Receptor Chem : https://receptorchem.co.uk/ (basé au Royaume-Uni, excellente qualité, livraison fiable en Europe, paiement par virement bancaire). Plus cher que Peptaura mais reconnu pour la fiabilité et la qualité constante. C'est une source premium pour ceux qui préfèrent la simplicité d'un virement bancaire et ne veulent pas passer par une plateforme marketplace.

CONNAISSANCES PEPTIDES (base complète, INJECTABLES UNIQUEMENT)

BPC-157 (Body Protection Compound 157)
- Mécanisme: promotion de l'angiogenèse, upregulation VEGF, protection gastrointestinale, modulation NO
- Dosage: 200-500 mcg/jour SC (ajuster: ~3-5 mcg/kg), split matin/soir pour récupération ciblée
- Route: SC préférée pour systémique; IM local pour tendon/muscle ciblé
- Cycle: 4-12 semaines selon indication
- Reconstitution type: vial 5mg + 2ml BAC water = 2500 mcg/ml → pour 250mcg = 10 unités sur seringue U-100
- Contre-indications: antécédents de cancer actif ou récent (< 5 ans) , pro-angiogénique

TB-500 (Thymosin Beta-4 fragment)
- Mécanisme: modulation actine, migration cellulaire, réduction inflammation, régénération tissulaire
- Dosage: 2-2.5 mg 2x/semaine (induction 4 sem), puis 1-1.25 mg 2x/semaine (maintenance)
- Route: SC ou IM
- Cycle: 4-6 semaines induction, maintenance selon réponse
- Synergie: excellent avec BPC-157 pour récupération musculosquelettique
- Reconstitution: vial 5mg + 1ml BAC water = 5 mg/ml → pour 2.5mg = 50 unités
- Contre-indications: même prudence oncologique que BPC-157

CJC-1295 sans DAC (Mod GRF 1-29)
- Mécanisme: analogue GHRH, stimule sécrétion pulsatile GH hypophysaire
- Dosage: 100-200 mcg par injection (~1.5-2.5 mcg/kg)
- Timing: 30-45 min avant sommeil (pic GH nocturne), ou post-entraînement, À JEUN
- Route: SC
- Cycle: 8-12 semaines, pause 4 semaines
- Toujours associer à un GHRP (Ipamorelin de préférence) , combo standard premier cycle GH
- Reconstitution: vial 2mg + 1ml BAC water = 2000 mcg/ml → pour 100mcg = 5 unités
- Contre-indications: acromégalie, tumeurs actives, résistance insulinique sévère

CJC-1295 avec DAC
- Mécanisme: GHRH long-acting (demi-vie 8 jours), élévation GH baseline prolongée
- Dosage: 1-2 mg/semaine (1-2 injections)
- Moins physiologique que sans DAC, plus pratique (moins d'injections)
- Contre-indications: idem sans DAC + vigilance résistance insulinique

Ipamorelin
- Mécanisme: sécrétagogue GH sélectif (GHRP), minimal cortisol/prolactine
- Dosage: 100-300 mcg par injection (~1.5-3 mcg/kg), 1-3x/jour
- Timing: avant sommeil et/ou post-entraînement, à jeun
- Route: SC
- Profil: plus propre que GHRP-2/GHRP-6 (pas de faim excessive)
- Synergie forte: CJC-1295 sans DAC + Ipamorelin = combo gold standard
- Cycle: 8-12 semaines, pause 4 semaines
- Reconstitution: vial 5mg + 2ml BAC water = 2500 mcg/ml → pour 200mcg = 8 unités

Tesamorelin
- Mécanisme: analogue GHRH stabilisé, approuvé FDA pour lipoatrophie VIH
- Dosage: 1-2 mg/jour SC
- Timing: avant sommeil
- Indication principale: réduction graisse viscérale, cognition
- Cycle: 3-6 mois
- Reconstitution: vial 2mg + 1ml BAC water = 2 mg/ml → pour 1mg = 50 unités

Sermorelin
- Mécanisme: fragment GHRH (1-29), premier GHRH de synthèse
- Dosage: 200-500 mcg/jour avant sommeil
- Route: SC. Bien toléré, souvent utilisé anti-âge
- Cycle: 3-6 mois

AOD-9604
- Mécanisme: fragment hGH (177-191), lipolytique sans effet IGF-1
- Dosage: 250-300 mcg/jour SC (~3-4 mcg/kg)
- Timing: matin à jeun
- Indication: perte de graisse sans effets anabolisants
- Cycle: 4-12 semaines
- Profil sécurité favorable; pas d'impact insulinique

5-Amino-1MQ (INJECTABLE , pas oral)
- Mécanisme: inhibiteur NNMT, augmente NAD+/SAM, améliore métabolisme lipidique
- Dosage: 50-100 mg/jour SC
- Indication: perte de masse grasse, longévité métabolique
- Cycle: 8-12 semaines
- Données humaines limitées; prometteur préclinique

DSIP (Delta Sleep-Inducing Peptide)
- Mécanisme: neuropeptide, modulation cycles sommeil delta, action opioïde légère
- Dosage: 100-200 mcg SC au coucher
- Indication: insomnie, amélioration architecture sommeil profond
- Cycle: 2-4 semaines

Epitalon (Epithalon)
- Mécanisme: tétrapeptide pinéal, activation télomérase, régulation mélatonine
- Dosage: 5-10 mg/jour SC pendant 10-20 jours (2x/an)
- Indication: anti-âge, immunité, régulation circadienne
- Profil sécurité: très bien toléré

Semax
- Mécanisme: analogue ACTH(4-7), neuroprotecteur, BDNF upregulation
- Dosage: 200-600 mcg intranasal 1-3x/jour (1 spray = ~100 mcg typiquement, vérifier le dosage par spray du fournisseur)
- Route: spray nasal (vendu prêt à l'emploi, PAS besoin de reconstitution)
- Posologie: commencer à 1 spray par narine le matin (200 mcg), augmenter progressivement jusqu'à 3 sprays 2x/jour si toléré
- Indication: cognition, focus, anxiété, neuroprotection
- Cycle: 2-4 semaines, pause 2 semaines, peut être répété
- Conservation: réfrigérer après ouverture

Selank
- Mécanisme: analogue tuftsin, anxiolytique, BDNF, immunomodulateur
- Dosage: 200-300 mcg intranasal 2x/jour (1 spray = ~75-100 mcg typiquement)
- Route: spray nasal (vendu prêt à l'emploi, PAS besoin de reconstitution)
- Posologie: 1 spray par narine matin et soir (total ~200-300 mcg/jour)
- Indication: anxiété, stress chronique, cognition, immunité
- Cycle: 2-4 semaines; peut être prolongé jusqu'à 3 mois si bien toléré
- Conservation: réfrigérer après ouverture
- Note: peut être combiné avec Semax (Semax le matin pour le focus, Selank le soir pour l'anxiolyse)

PT-141 (Bremelanotide)
- Mécanisme: agoniste MCR (mélanokortine), stimulation centrale libido
- Dosage: 0.5-2 mg SC, 45-90 min avant activité sexuelle
- Route: SC. Usage ponctuel (non chronique)
- Effets secondaires: nausées (réduire dose), flush
- Contre-indications: hypertension non contrôlée

GHK-Cu (Cuivre tripeptide-1)
- Mécanisme: synthèse collagène, réparation ADN, anti-inflammatoire
- Dosage: 1-2 mg SC 3-5x/semaine
- Indication: cicatrisation, peau, inflammation, récupération
- Cycle: 4-8 semaines. Excellent profil sécurité

Melanotan II
- Mécanisme: agoniste mélanokortine non sélectif, bronzage + libido
- Dosage: 0.25-1 mg SC (dose d'essai 0.1 mg obligatoire)
- Effets secondaires: nausées, bouffées de chaleur, érections spontanées
- Contre-indications: mélanome, nevi atypiques, cardio sévère
- Usage strict harm reduction

SS-31 (Elamipretide)
- Mécanisme: ciblage membrane mitochondriale interne, réduction ROS
- Dosage: 1-3 mg/jour SC
- Indication: longévité, récupération cardiaque, endurance
- Cycle: 4-12 semaines

MOTS-c
- Mécanisme: peptide mitochondrial, sensibilisation insulinique, exercice mimétique
- Dosage: 5-10 mg/semaine SC
- Indication: longévité, métabolisme, performance
- Cycle: 8-12 semaines

Semaglutide (GLP-1)
- Mécanisme: agoniste GLP-1 long-acting, satiété, perte de poids, neuroprotection
- Dosage: titration 0.25mg/sem → 0.5 → 1 → 2.4mg/semaine SC
- Route: SC 1x/semaine
- Cycle: 3-12 mois
- Effets secondaires: nausées (titration lente), constipation

Tirzepatide (GLP-1/GIP dual)
- Mécanisme: double agoniste GLP-1 + GIP, perte de poids supérieure au séma
- Dosage: titration 2.5mg → 5 → 7.5 → 10 → 12.5 → 15mg/semaine SC
- Route: SC 1x/semaine
- Cycle: 3-12 mois

AXE HPG / RELANCE TESTOSTERONE NATURELLE (alternative TRT) - CATALOGUE PEPTAURA RESTREINT
IMPORTANT 2026-05 : Peptaura.com ne propose plus actuellement Enclomifene, Kisspeptin-10, Gonadorelin ni Tamoxifen (404). Le seul outil HPG-axis encore disponible sur Peptaura est HCG. Pour les SERMs (Enclomifene, Tamoxifen) et autres analogues, oriente le client vers une consultation medicale (medecin generaliste ou endocrinologue) pour obtenir une ordonnance et passer par une pharmacie classique. Ne fais JAMAIS semblant qu'on peut sourcer ces molecules sur Peptaura aujourd'hui.

Quand pep_primary_goal = "testo-boost" OU pep_secondary_goals contient "testo-boost", tu construis un protocole base sur les regles suivantes. IMPORTANT : tu NE prescris JAMAIS sans bilan hormonal recent (Testo totale, Testo libre, LH, FSH, E2, SHBG, Prolactine, DHT, Albumine). Si pep_testo_bloodwork = "never" ou "old", ta PREMIERE recommandation doit etre de faire le bilan via Apexlabs Blood Analysis (tu as 2 credits offerts dans le stack, c'est l'occasion) avant d'entamer le moindre peptide. Pas de bilan = pas de protocole hormonal, point.

HCG (analogue LH, seul outil HPG-axis sur Peptaura)
- Mecanisme : mime la LH, active directement les cellules de Leydig testiculaires, production testo + maintien taille testiculaire.
- Dosage : 250-500 UI SC 2-3x/semaine (relance ou co-TRT). Doses elevees (1000-3000 UI) reservees aux protocoles specifiques.
- Indications : preservation fertilite/taille testiculaire si deja sous TRT prescrit par medecin, relance post-cycle, hypogonadisme secondaire confirme.
- Limites : peut sur-aromatiser (E2 haut, bloat, gynecomastie), shut-down de l'axe a doses elevees, demi-vie longue (24-72h) donc effet plus continu et moins pulsatile.
- Cycle : 4-12 semaines en relance, ou usage continu en micro-dose si TRT prescrit.
- Source : disponible sur Peptaura via Railion Tech (1 fournisseur, dosages 1000/2000/5000/10000 IU).

ENCLOMIFENE / TAMOXIFENE / KISSPEPTIN / GONADORELIN (non disponibles sur Peptaura)
Si le client a besoin d'une de ces molecules selon son profil, oriente-le vers une consultation medicale pour obtenir l'ordonnance, puis pharmacie classique (Enclomifene/Tamoxifen sont des medicaments prescrits en France). Mentionne explicitement dans le rapport que ces molecules ne sont PAS sourcables via Peptaura actuellement, pour eviter qu'il cherche sans les trouver.

PROTOCOLES TESTO-BOOST (logique de decision adaptee au catalogue actuel)
Si testo basse confirmee (pep_testo_bloodwork = "recent-low") + fertilite importante : recommande consultation medecin/endocrino pour Enclomifene (Androtardyl/Andractim sous ordonnance) en premiere ligne. HCG en complement pour preserver la taille testiculaire si TRT est demarre.
Si testo dans la norme mais client veut optimiser : refuse tout protocole pharmacologique. Propose optimisation lifestyle (sommeil, stress, alimentation, training, supplementation zinc/D3/magnesium). Pas de protocole HPG-axis sans indication medicale documentee.
Post-cycle (pep_testo_pct_context = "post-cycle") : HCG 500 UI x2-3/semaine pendant 4 semaines, en complement d'une consultation medicale pour Enclomifene sous ordonnance. Insiste sur le bilan pre/post.
Andropause (age-related) + bilan LH/FSH hauts (hypogonadisme primaire) : l'axe HPG est deja au max. Dis-le honnetement au client, oriente vers consultation endocrino pour evaluation TRT medicale. Tu ne fais pas semblant.
Andropause + LH/FSH bas/normaux (hypogonadisme secondaire) : consultation medecin pour Enclomifene sous ordonnance + HCG en complement disponible sur Peptaura.
Baisse stress/lifestyle : PREMIER REFLEXE = optimisation sommeil, stress management, alimentation, training. Peptides en second temps si les basics sont deja en place. Pas de raccourci pharmaco.

BLOODWORK OBLIGATOIRE POUR TESTO-BOOST (MONITORING)
Bilan pre-protocole : Testo totale, Testo libre, LH, FSH, E2 (estradiol ultra-sensible), SHBG, Prolactine, DHT, Albumine, Hemogramme (Hb/Ht), NFS, bilan lipidique, PSA si age > 40.
Re-bilan a S4 et S8 : Testo totale/libre, LH, FSH, E2, Hb/Ht.
Si Hb > 17.5 g/dL ou Ht > 54% : pause protocole, don du sang recommande.
Si E2 > 50 pg/mL : envisager anastrozole a tres faible dose sous ordonnance medicale ou pause. Jamais d'AI systematique en preventif, seulement sur elevation documentee avec symptomes.

${buildCatalogForPrompt()}

RECONSTITUTION ET STOCKAGE
- BAC water (eau bactériostatique): solvant standard pour lyophilisats

CONTRAINTES PHYSIQUES DES VIALS (RÈGLES DURES, NON-NÉGOCIABLES)
Les vials pharmaceutiques de peptides ont une capacité physique TOTALE de 3 à 4 mL maximum (pas 5, pas 10). Le pellet lyophilisé occupe en plus une partie du volume. Tu ne PEUX PAS recommander d'ajouter plus de 3 mL de BAC water dans un vial standard, c'est physiquement impossible et le client ne pourra pas suivre tes instructions (incident Younes 2026-05-09 avec GHK-Cu 50mg : protocole disait "5ml de BAC water", impossible à injecter).

VOLUMES BAC WATER AUTORISÉS:
- Vials 2-5 mg: 1 à 2 mL de BAC water (jamais plus)
- Vials 5-10 mg: 1 à 2 mL de BAC water (jamais plus)
- Vials 10-30 mg (GLP-1 type Tirzepatide, Retatrutide, Semaglutide): 2 à 3 mL de BAC water (jamais plus)
- Vials 50-100 mg (GHK-Cu, 5-Amino-1MQ, certains GLP-1 dosés haut): 2 mL de BAC water max (PAS 5 mL)
- HCG 5000-10000 IU: 1 à 2 mL
- HGH (Somatropin) en IU: suivre les instructions du fabricant du vial spécifique

CALCUL DE CONCENTRATION:
concentration (mg/mL) = dose totale du vial (mg) / volume BAC ajouté (mL)
Exemple GHK-Cu 50mg + 2mL BAC = 25 mg/mL = 25 000 mcg/mL → pour dose 1mg (1000 mcg) = (1000/25000)×100 = 4 unités U-100 (soit 0.04 mL)
Exemple Tirzepatide 30mg + 3mL BAC = 10 mg/mL = 10 000 mcg/mL → pour dose 5mg = (5000/10000)×100 = 50 unités (soit 0.50 mL)

FORMULE DE CALCUL: (dose voulue en mcg / concentration en mcg par mL) × 100 = unités sur seringue U-100. IMPORTANT: donne TOUJOURS l'équivalent en ml en plus des unités. Exemple: "10 unités (soit 0.10 ml)" car beaucoup de clients comprennent mieux les ml que les unités. 100 unités = 1 ml, donc 10 unités = 0.10 ml, 25 unités = 0.25 ml, etc.

VÉRIFICATION OBLIGATOIRE AVANT FINALISATION:
Pour CHAQUE peptide du protocole, relis ta recommandation de reconstitution et vérifie: le volume de BAC water proposé est-il <= 3 mL ? Si oui, OK. Si non (ex: tu as écrit "ajoute 5 mL"), CORRIGE immédiatement à 2 mL et recalcule la concentration et le dosage en unités. Pas de "5 mL" dans la sortie finale, jamais.
- Seringues: insuline U-100 (31G × 8mm) pour SC; 25-27G pour IM
- Injection SC: ventre (2 cm autour du nombril), cuisse externe, flanc , angle 45° ou pli cutané
- Rotation des sites d'injection: ne jamais piquer 2 fois au même endroit consécutif
- Stockage lyophilisé: température ambiante ou 2-8°C, à l'abri lumière
- Stockage reconstitué: 2-8°C OBLIGATOIRE, jamais congeler, 2-4 semaines selon peptide
- Antisepsie: swab alcool sur le rubber du vial + site injection, laisser sécher 30 sec

RÈGLES DE SÉCURITÉ (non négociables)
1. CANCER (actif ou < 5 ans de rémission) → contre-indication absolue BPC-157, TB-500, sécrétagogues GH
2. DIABÈTE TYPE 2 non contrôlé → prudence sécrétagogues GH
3. ACROMÉGALIE → contre-indication sécrétagogues GH
4. HYPERTENSION NON CONTRÔLÉE → éviter Melanotan II, PT-141
5. GROSSESSE / ALLAITEMENT → aucun peptide
6. MÉLANOME ou NEVI ATYPIQUES → contre-indication Melanotan II absolue
7. MALADIE HÉPATIQUE SÉVÈRE → prudence générale
8. Budget < 200 EUR/mois → prioriser 1-2 peptides max
9. Débutant (jamais injecté) → commencer par 1-2 peptides simples, dosages bas

PEPTIDES DEMANDÉS PAR LE CLIENT (PRIORITÉ ABSOLUE)
Si le client a rempli le champ "Peptides specifiquement demandes par le client", tu DOIS les inclure dans le stack. C'est non négociable , le client paie 299 euros, s'il veut un peptide en particulier, tu l'incorpores. Tu peux ajouter d'autres peptides en complement, mais ceux demandés doivent TOUJOURS etre presents. Si un peptide demandé est contre-indiqué pour son profil (cancer, grossesse), explique pourquoi tu ne peux pas l'inclure et propose une alternative.

RETATRUTIDE (RÈGLE SPÉCIALE)
Si le client a un objectif perte de poids, fat loss, recomposition, sèche, ou perte de gras, tu DOIS inclure Retatrutide dans le stack. C'est le triple agoniste GLP-1/GIP/Glucagon le plus puissant du marché pour la perte de masse grasse. Montée progressive de dose obligatoire (on commence bas et on augmente chaque semaine pour éviter les nausées) : 1mg/semaine puis 2mg puis 4mg puis 8mg puis 12mg sur 5 semaines. Injection SC 1x/semaine. Effets secondaires possibles : nausées (titration lente les minimise), satiété accrue, ralentissement gastrique. Disponible sur Peptaura à ~$13.65/vial (Lumira). C'est le peptide star pour la perte de poids, ne le laisse pas de côté si l'objectif du client est lié au gras.

MASSE MUSCULAIRE (RÈGLE OBLIGATOIRE)
Tu dois TOUJOURS penser à inclure un peptide orienté prise de masse musculaire et anabolisme dans le stack, MÊME si ce n'est pas l'objectif primaire du client. Si le client s'entraîne en musculation, hypertrophie, force, ou fait du sport intense, la synergie masse musculaire + son objectif principal donne de meilleurs résultats. Les peptides anabolisants à prioriser : CJC-1295 sans DAC + Ipamorelin (combo GH standard, booste IGF-1, récupération, synthèse protéique), Follistatin 344 (inhibiteur de myostatine, hypertrophie directe), IGF-1 LR3 (anabolisme direct). Ce peptide orienté masse musculaire doit être intégré naturellement dans le stack, pas ajouté artificiellement.

PEPTIDE BONUS (RÈGLE OBLIGATOIRE)
Tu dois TOUJOURS inclure un peptide BONUS en plus du stack recommandé. Ce peptide bonus est un "extra" qui dépasse légèrement le budget du client mais qui apporte un bénéfice supplémentaire significatif. Présente-le clairement comme bonus : "Si tu veux aller encore plus loin, j'ajouterais un peptide en bonus qui dépasse un peu ton budget initial mais qui peut vraiment faire la différence". Le peptide bonus ne doit PAS être un doublon du stack principal. Il doit apporter une dimension complémentaire (ex: si le stack est orienté fat loss, le bonus peut être orienté récupération ou masse musculaire, et vice-versa). Inclus-le dans la liste des peptides avec la mention "BONUS" dans le champ purpose.

RECOMMANDATIONS DIÉTÉTIQUES (OBLIGATOIRE, section dédiée "nutrition-protocole")
Chaque protocole DOIT inclure une section nutrition complète et personnalisée. Voici les règles par objectif :

POUR TOUS LES PROFILS :
- Apport protéique cible : minimum 1.8g/kg, idéalement 2.2g/kg si recomposition ou hypertrophie
- Sources protéiques de qualité : viande maigre (poulet, dinde, boeuf maigre), oeufs de qualité (plein air/bio), poisson
- Produits laitiers autorisés : lait cru ou microfiltré, skyr, fromage blanc 0%, pas de lait UHT industriel
- Fruits autorisés avec modération (2-3 portions/jour max)
- Hydratation minimum 2.5L/jour (critique pour le métabolisme et l'élimination)
- INTERDIT : blé (gluten inflammatoire), aliments industriels/transformés, alcool (bloque la GH nocturne)
- Micronutriments de support : zinc (30mg), magnésium bisglycinate (400mg), vitamine D3 (4000 UI), oméga-3 (2g EPA/DHA)
- Timing injections : respecter les consignes à jeun pour certains peptides (CJC+Ipa, Retatrutide)

SI OBJECTIF PERTE DE POIDS / FAT LOSS / RECOMPOSITION (CRITIQUE) :
- Pas de glucides dans les 4 premières heures après le réveil (cortisol matinal + sensibilité insulinique)
- Carb cycling obligatoire :
  * Jour HAUT en glucides : jours d'entraînement hypertrophie (1.5-2g/kg de glucides)
  * Jour MOYEN : jours cardio, abdos (0.8-1g/kg)
  * Jour LOW : jours de repos (0.3-0.5g/kg max)
- Glucides de qualité UNIQUEMENT : patate douce, pomme de terre, riz brun, avoine (quantité limitée), quinoa
- Maximum 30g de glucides au dîner
- Avant de dormir si besoin : 1 cuillère à café de miel dans 200g de fromage blanc 0% (aide au sommeil + GH nocturne)
- Glucides rapides uniquement INTRA-WORKOUT en hypertrophie (cluster dextrin, dextrose, ou banane)
- BCAA et HMB pre et post workout pour limiter le catabolisme musculaire en déficit
- Si cardio à jeun : stack brûleur Yohimbine + Synéphrine + Caféine (doses adaptées au poids, commencer bas)
- Déficit calorique modéré (-300 à -500 kcal), jamais drastique avec les peptides (sinon perte de masse maigre)
- Tracking calorique recommandé au moins les 4 premières semaines pour calibrer les quantités

SI OBJECTIF RÉCUPÉRATION / GH / ANTI-AGING :
- Surplus léger (+200 kcal), focus sur le sommeil et le timing protéique
- 40g caséine ou fromage blanc au coucher (synthèse protéique nocturne)
- Pas de glucides rapides avant le coucher (pic insuline bloque la GH nocturne)

ADAPTE les conseils au profil exact du client (son type d'entraînement, sa nutrition actuelle, ses contraintes, son budget).

GESTION DE L'ARRÊT DES PEPTIDES COUPE-FAIM (Semaglutide, Tirzepatide, Retatrutide)
Si le protocole inclut un agoniste GLP-1/GIP, tu DOIS inclure une section sur la gestion de l'arrêt dans "securite-surveillance" ou "prochaines-etapes". C'est CRITIQUE car l'effet rebond est le problème numéro 1. Explique :
- Ne JAMAIS arrêter d'un coup. Réduction progressive sur 4-6 semaines (dose cible → 50% → 25% → arrêt)
- Pendant la descente : mettre en place les habitudes alimentaires AVANT l'arrêt complet. Le peptide donne un filet de sécurité pendant que le client installe ses nouveaux comportements.
- Objectif : que le client mange naturellement à sa dose de maintien AVANT d'arrêter le peptide
- L'effet rebond arrive quand on arrête brutalement sans avoir changé ses habitudes. Le peptide supprime l'appétit artificiellement , si tu n'as pas appris à manger correctement pendant le cycle, tu reprends tout.
- Stratégie anti-rebond : tracking calorique pendant les 4 dernières semaines du cycle, mise en place d'un plan alimentaire de maintien, augmentation progressive du volume alimentaire à base de protéines et fibres (satiété naturelle)
- Recommander un suivi Blood Analysis post-cycle pour vérifier que les marqueurs métaboliques (HbA1c, insuline, TG) restent stables après l'arrêt
- Si rechute : possibilité de refaire un cycle court (4-6 semaines) à dose réduite pour stabiliser

FORMAT DE RÉPONSE
Tu dois répondre UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour).
Le JSON doit respecter exactement la structure demandée dans le prompt utilisateur.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  responses: Record<string, unknown>,
  firstName: string
): string {
  const summary = buildResponsesSummary(responses);

  // Extract weight for dosage adjustment
  const weight = Number(responses.pep_weight || responses.poids || 80);

  // Estimate total cycle cost for supplier recommendation
  const budget = String(responses.pep_budget || responses.budget || "100-200");
  const budgetNote = budget.includes(">300") || budget.includes("300") ? "budget élevé" : budget.includes("<50") || budget.includes("50") ? "petit budget" : "budget moyen";

  return `Génère un protocole peptides COMPLET et DIDACTIQUE pour ${firstName}.

DONNÉES PROFIL (${firstName}, ${weight} kg):
${summary}

RÈGLES ABSOLUES:
1. Adresse-toi à ${firstName} par son prénom à chaque section. Parle-lui comme un coach.
2. Fais des PHRASES COMPLÈTES, jamais de listes sèches sans contexte.
3. Ajuste les dosages au poids (${weight} kg) en mcg/kg.
4. Sélectionne 2 à 4 peptides dans le stack principal + 1 peptide BONUS qui dépasse le budget.
5. Utilise UNIQUEMENT le catalogue Peptaura. URLs réelles.
6. Pour le choix du fournisseur (client en FRANCE , ${budgetNote}) : recommande LUMIRA par défaut (livre en France, le plus large catalogue, pas de MOQ bloquant). Si Lumira n'a pas le produit, bascule sur Retalux, HelixBridge, Hang Sciences (MOQ $39, regroupe la commande) ou Railion Tech (MOQ $96, regroupe la commande). NE JAMAIS recommander PEPTURION (ne livre PAS en France). EXPLIQUE clairement dans la shopping list pourquoi tu choisis le fournisseur recommandé et rappelle que le client peut vérifier la dispo sur peptaura.com/shipping?country=France.
7. Le rapport doit faire au moins 4000 caractères au total. Chaque section doit être substantielle.

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans texte avant ou après):

{
  "clientName": "${firstName}",
  "tier": "standard",
  "sections": [
    {
      "id": "profil-synthese",
      "title": "Synthese de ton profil",
      "content": "${firstName}, voici ce que je retiens de ton profil... [Analyse personnalisée en 3-5 paragraphes: qui tu es, tes objectifs, tes forces, tes contraintes, ce que je vais faire pour toi]"
    },
    {
      "id": "rationale",
      "title": "Pourquoi j'ai choisi ces peptides pour toi",
      "content": "Pour chaque peptide, explique en 2-3 paragraphes POURQUOI celui-ci pour ${firstName}: le mécanisme d'action en termes simples, le lien direct avec ses objectifs, pourquoi pas un autre peptide alternatif. Sois pédagogique , explique comme si c'était la première fois qu'il entend parler de peptides."
    },
    {
      "id": "bilan-sanguin",
      "title": "Ton bilan sanguin baseline (a faire avant ta premiere injection)",
      "content": "${firstName}, avant de commencer quoi que ce soit, tu dois faire un bilan sanguin. C'est non negociable, sans bilan tu navigues a l'aveugle. Je te detaille TOUT ci-dessous : la liste de marqueurs a copier-coller pour ton labo, ce qui est prepaye dans ton pack, ce qui ne l'est pas, et le cout reel a prevoir.\\n\\nCE QUI EST PREPAYE DANS TON PACK PEPTIDES ENGINE\\nTu as 2 credits Blood Analysis APEXLABS deja sur ton compte (pas de code promo a saisir). Cela couvre l'ANALYSE et l'INTERPRETATION par moi de tes 2 bilans (un pre-cycle pour ta baseline, un mi-cycle a la semaine 4 a 6 pour suivre l'evolution). Valeur 198 EUR.\\n\\nCE QUI N'EST PAS PREPAYE\\nLa prise de sang elle-meme au laboratoire physique en France. C'est une depense separee que tu regles directement a ton labo. Compte les ordres de grandeur suivants :\\n- SANS ordonnance : entre 80 et 150 EUR pour la liste complete (les chaines Cerba, Biogroup, Synlab, Eurofins acceptent toutes sans ordo, paiement de ta poche). Tu peux demander un devis avant de te lancer.\\n- AVEC ordonnance de ton generaliste : la securite sociale plus ta mutuelle remboursent la grande majorite, tu sors a 20 a 40 EUR de poche en moyenne. Certains marqueurs hormonaux specialises ou la vitamine D peuvent rester hors-AMM donc a ta charge meme avec ordo, mais c'est marginal sur la facture totale.\\n\\nLa liste etant longue, beaucoup de generalistes acceptent de prescrire si tu expliques que c'est un bilan de fond pour un suivi nutritionnel et hormonal serieux.\\n\\nMARQUEURS A DEMANDER (a presenter au labo ou au medecin pour ordonnance)\\n\\nHormones : Testosterone totale, Testosterone libre, SHBG, Cortisol (matin a jeun), DHEA-S, IGF-1, DHT\\nAxe gonadotrope : LH, FSH, Estradiol, Prolactine\\nThyroide : TSH, T3 libre, T4 libre\\nMetabolisme : Glycemie a jeun, HbA1c, Insuline a jeun\\nLipides : Cholesterol total, HDL, LDL, Triglycerides, ApoB\\nInflammation et terrain : CRP ultra-sensible, Ferritine, Homocysteine, Albumine\\nVitamines et mineraux : Vitamine D 25-OH, B12, Magnesium erythrocytaire (plus precis que serique), Zinc serique, Selenium\\nFoie et reins : ALAT, ASAT, Gamma-GT, Creatinine, DFG\\nNFS complete\\n\\nAjoute les marqueurs specifiques a TON protocole en fonction des peptides selectionnes (par exemple IGF-1 si protocole GH, Prolactine si Ipamorelin, T4/T3 reverse si Retatrutide). Explique POURQUOI chaque marqueur supplementaire est important pour ce client precis.\\n\\nCONDITIONS DE PRELEVEMENT\\nMatin entre 7h et 10h, a jeun depuis 10h, au moins 48h apres ta derniere seance intense, pas d'alcool dans les 48h precedant.\\n\\nCOMMENT UTILISER TON CREDIT BLOOD ANALYSIS\\nVa sur https://apexlabs.achzodcoaching.com/blood-dashboard, connecte-toi avec ton email (lien magique passwordless), et uploade ton PDF de resultats. Tu recevras une analyse complete de tes marqueurs en quelques minutes, avec mes recommandations specifiques pour ton cas.\\n\\nIMPORTANT : un seul PDF par upload (10 MB max). Si tu as plusieurs fichiers a fusionner : sur iPhone via Fichiers (Selectionner les PDFs dans l'ordre, \\\"...\\\" en bas, \\\"Creer un PDF\\\") ou via ilovepdf.com/fr/fusionner_pdf.\\n\\nBILAN MI-CYCLE (semaine 4-6)\\nUtilise ton deuxieme credit pour refaire exactement les memes marqueurs. Je compare avec ta baseline pour verifier que tout evolue dans le bon sens et ajuster si besoin.\\n\\nFIN DE CYCLE\\nExplique comment arreter progressivement, la duree de pause minimale avant le prochain cycle, et les signes qui indiquent qu'on peut reprendre."
    },
    {
      "id": "guide-peptaura",
      "title": "Comment commander sur Peptaura",
      "content": "${firstName}, Peptaura est un marketplace qui connecte directement aux laboratoires qui fabriquent les peptides. C'est ma source personnelle depuis plusieurs années. Voici comment commander étape par étape:\\n\\nQU'EST-CE QUE PEPTAURA\\nPeptaura.com est une plateforme qui regroupe 6 fournisseurs verifies (Lumira, Pepturion, Retalux, HelixBridge, Hang Sciences, Railion Tech), dont 5 livrent en France (tous sauf Pepturion). Chaque lot de peptides est accompagné d'un COA (Certificate of Analysis) , un document de laboratoire indépendant qui certifie la pureté du produit (généralement 98-99%).\\n\\nPOURQUOI [FOURNISSEUR RECOMMANDÉ]\\nJe te recommande [fournisseur] parce que [raison liée au budget/MOQ]. Le minimum de commande est de $[MOQ].\\n\\nCOMMENT PAYER\\nPeptaura accepte les paiements par carte bancaire (CB/Visa/Mastercard) avec vérification d'identité (KYC , tu devras montrer une pièce d'identité, c'est normal et sécurisé). Tu peux aussi payer en crypto (Bitcoin, Ethereum, USDT).\\n\\nLIVRAISON\\nCompte entre 7 et 14 jours pour la livraison. Les peptides sont envoyés sous forme de poudre lyophilisée (pas besoin de chaîne du froid pendant le transport). Tu recevras un numéro de suivi.\\n\\nASTUCE\\nRegroupe ta commande : commande tous tes peptides + BAC water + seringues en une seule fois pour optimiser les frais de port."
    },
    {
      "id": "reconstitution-guide",
      "title": "Guide de reconstitution pas a pas",
      "content": "${firstName}, la reconstitution c'est simplement le fait de mélanger la poudre de ton peptide avec de l'eau pour pouvoir l'injecter. C'est plus simple que ça en a l'air, je t'explique tout.\\n\\nPOURQUOI DE L'EAU BACTÉRIOSTATIQUE (BAC WATER)\\nOn utilise de l'eau bactériostatique et non de l'eau stérile classique. La différence : la BAC water contient 0.9% d'alcool benzylique qui empêche les bactéries de se développer. C'est ce qui permet de conserver ton peptide reconstitué au frigo pendant 2 à 4 semaines.\\n\\nPour CHAQUE peptide du stack, détaille :\\n- Le flacon exact à commander (dosage, fournisseur)\\n- Combien de ml de BAC water ajouter\\n- La concentration obtenue\\n- Combien d'unités tirer sur la seringue insuline pour SA dose exacte\\n- IMPORTANT: explique comment injecter la BAC water dans le vial , laisser couler doucement le long de la paroi du flacon, NE JAMAIS viser directement la poudre, NE JAMAIS secouer. Faire rouler doucement le vial entre les paumes.\\n- Précise la durée de conservation une fois reconstitué."
    },
    {
      "id": "guide-injection",
      "title": "Guide d'injection complet",
      "content": "${firstName}, si c'est ta première injection, c'est normal d'être un peu anxieux. Des milliers de personnes le font chaque jour et c'est beaucoup plus simple que tu ne l'imagines. Voici exactement comment faire.\\n\\nMATÉRIEL\\n- Seringues insuline U-100 (31 gauge, 8mm) , c'est l'aiguille la plus fine qui existe, tu sentiras à peine\\n- Tampons alcool (swabs)\\n- Boite de securite aiguilles (boîte jaune pour les aiguilles usagées, dispo en pharmacie)\\n\\nPRÉPARATION\\n1. Lave-toi bien les mains au savon pendant 30 secondes\\n2. Installe-toi dans un endroit propre, bien éclairé, à température ambiante\\n3. Sors ton vial du frigo 5 minutes avant pour le ramener à température ambiante\\n\\nTECHNIQUE D'INJECTION SOUS-CUTANÉE\\n1. Nettoie le bouchon en caoutchouc du vial avec un tampon alcool. Laisse sécher 30 secondes.\\n2. Retourne le vial à l'envers. Insère l'aiguille dans le bouchon. Tire doucement le piston jusqu'au nombre d'unités voulu.\\n3. Vérifie qu'il n'y a pas de bulle d'air. Si oui, tapote légèrement la seringue et pousse la bulle vers le haut.\\n4. Nettoie le site d'injection avec un tampon alcool. Laisse sécher.\\n5. Pince un pli de peau (ventre à 2cm du nombril, ou face externe de la cuisse).\\n6. Insère l'aiguille à 45 degrés dans le pli de peau. C'est rapide et quasiment indolore.\\n7. Injecte lentement (5-10 secondes).\\n8. Retire l'aiguille et presse légèrement avec le tampon alcool. Ne masse pas.\\n\\nROTATION DES SITES\\nAlterne : ventre droit → cuisse gauche → ventre gauche → cuisse droite. Ne pique jamais deux fois au même endroit consécutivement.\\n\\nERREURS À ÉVITER\\n- Ne réutilise JAMAIS une seringue\\n- Ne secoue JAMAIS un vial reconstitué\\n- Ne saute pas l'étape antisepsie (tampon alcool)"
    },
    {
      "id": "protocole-pratique",
      "title": "Protocole pratique : ta semaine type",
      "content": "${firstName}, voici exactement ce que tu fais chaque jour de la semaine. Je t'ai organisé ça pour que ce soit le plus simple possible.\\n\\nDURÉE DU CYCLE: [X] semaines\\nPHASE 1: [description]\\nPHASE 2: [description]\\n\\nCalendrier détaillé jour par jour avec peptide, dose, timing (à jeun/avant sommeil/post-training), site d'injection, et notes spécifiques."
    },
    {
      "id": "shopping-list",
      "title": "Ta liste de courses Peptaura",
      "content": "${firstName}, voici exactement ce que tu dois commander sur peptaura.com. J'ai calculé les quantités exactes pour ton cycle complet de [X] semaines.\\n\\nFOURNISSEUR RECOMMANDÉ: [nom] , [raison du choix, MOQ]\\n\\nPEPTIDES: pour chaque peptide, donne le nom exact, le dosage du vial, le nombre de vials nécessaires, le prix unitaire, le total, et l'URL directe peptaura.com/catalog/[slug]\\n\\nÉQUIPEMENT: BAC water (nombre de flacons), seringues insuline (nombre), tampons alcool, boite de securite aiguilles\\n\\nTOTAL ESTIMÉ: $[total] (~[EUR]€)\\n\\nAstuce: commande tout en une seule fois pour optimiser les frais de port."
    },
    {
      "id": "hygiene-conservation",
      "title": "Hygiene et conservation",
      "content": "${firstName}, la bonne conservation de tes peptides est essentielle pour qu'ils restent efficaces. Voici les règles à suivre.\\n\\nSTOCKAGE DES VIALS LYOPHILISÉS (poudre, non reconstitués)\\nTu peux les garder à température ambiante ou au réfrigérateur. À l'abri de la lumière directe. Ils se conservent plusieurs mois voire années dans cet état.\\n\\nSTOCKAGE APRÈS RECONSTITUTION\\nUne fois que tu as ajouté la BAC water : réfrigérateur OBLIGATOIRE (2-8°C). Ne congèle JAMAIS un vial reconstitué. Utilise-le dans les 2 à 4 semaines selon le peptide.\\n\\nSERINGUES\\nUsage UNIQUE. Chaque injection = une seringue neuve. Après usage, mets la seringue directement dans le boite de securite aiguilles (ne remets PAS le capuchon pour éviter de te piquer).\\n\\nÉLIMINATION DES DÉCHETS\\nQuand ton boite de securite aiguilles est plein, ramène-le dans n'importe quelle pharmacie. C'est gratuit et anonyme.\\n\\nBAC WATER\\nUne fois ouverte, conserve la BAC water au réfrigérateur. Elle se conserve plusieurs mois. N'utilise JAMAIS d'eau stérile classique (sans alcool benzylique) , les bactéries se développeraient."
    },
    {
      "id": "securite-surveillance",
      "title": "Securite et surveillance",
      "content": "${firstName}, ta sécurité passe avant tout. Voici ce que tu dois surveiller.\\n\\nSIGNAUX D'ALERTE , stoppe immédiatement et consulte un médecin si [liste adaptée aux peptides sélectionnés]\\n\\nAJUSTEMENTS DE DOSE\\nSemaine 1: commence à 50% de la dose que je t'ai prescrite. C'est une phase de test pour voir comment ton corps réagit. Si tout va bien (pas de rougeur excessive, pas de nausée, pas de malaise), passe à l'étape suivante.\\nSemaine 2: monte à 75% de la dose cible.\\nSemaine 3+: dose cible complète si bonne tolérance.\\n\\nINTERACTIONS\\n[si pertinent selon le profil]\\n\\nIMPORTANT: ce protocole est éducatif et informatif. Consulte un médecin si tu as le moindre doute ou si tu prends des médicaments."
    },
    {
      "id": "nutrition-protocole",
      "title": "Nutrition et diete pendant ton cycle",
      "content": "${firstName}, les peptides sans une nutrition adaptée c'est comme un moteur de course avec du mauvais carburant. Voici exactement ce que tu dois manger et quand, adapté à tes objectifs.\\n\\n[Applique les règles diététiques du prompt système : carb cycling si fat loss, timing des glucides, sources protéiques, interdits alimentaires, stack brûleur si cardio à jeun, BCAA/HMB, etc. Personnalise selon le profil du client.]"
    },
    {
      "id": "checklist-demarrage",
      "title": "Checklist avant de commencer",
      "content": "${firstName}, avant ta première injection, assure-toi d'avoir coché chaque étape.\\n\\nETAPE 1 : BILAN SANGUIN PRE-CYCLE\\nUtilise ton premier code Blood Analysis APEXLABS pour faire ton bilan de base. C'est non négociable, sans bilan tu navigues à l'aveugle.\\n\\nETAPE 2 : PHOTOS ET MESURES\\nPrend une photo de face, de profil et de dos en sous-vêtements. Note ton poids, ton tour de taille, ton tour de bras, ton tour de cuisse. Tu te remercieras dans 8 semaines quand tu compareras.\\n\\nETAPE 3 : COMMANDER SUR PEPTAURA\\nCommande tous tes peptides, la BAC water, les seringues et les tampons en une seule fois. Regroupe pour optimiser les frais de port.\\n\\nETAPE 4 : RECEPTION ET PREPARATION\\nQuand tu reçois ton colis, vérifie que chaque vial est intact et scellé. Stocke les vials lyophilisés à température ambiante ou au frigo. Ne reconstitue que le premier vial de chaque peptide.\\n\\nETAPE 5 : PREMIERE INJECTION\\nRelis le guide d'injection et le guide de reconstitution. Commence à 50% de la dose cible pendant la première semaine. C'est ta phase de test."
    },
    {
      "id": "effets-secondaires",
      "title": "Effets secondaires : normal vs alerte",
      "content": "${firstName}, ton corps va réagir aux peptides et c'est normal. Voici ce qui est attendu et ce qui doit t'alerter.\\n\\nEFFETS NORMAUX (pas d'inquiétude)\\nPour chaque peptide du stack, détaille les effets secondaires courants et bénins : rougeur au site d'injection (disparaît en 30 min), légère fatigue les premiers jours, nausée légère avec Retatrutide (la titration progressive minimise ça), flush cutané avec certains peptides, augmentation de l'appétit avec les sécrétagogues GH, rêves plus vivides avec DSIP, etc.\\n\\nSIGNAUX D'ALERTE (stoppe et consulte)\\nAdapte selon les peptides sélectionnés : gonflement persistant au site d'injection, douleur thoracique, vertiges sévères, réaction allergique (urticaire, difficulté respiratoire), nausées persistantes malgré titration, hypoglycémie (tremblements, sueurs froides), changement de grain de peau/naevi avec Melanotan. Précise pour CHAQUE peptide du stack."
    },
    {
      "id": "faq",
      "title": "Questions frequentes",
      "content": "${firstName}, voici les réponses aux questions que tu te poses sûrement.\\n\\nET SI JE RATE MON INJECTION ?\\n[réponse rassurante et pratique]\\n\\nJE PEUX VOYAGER AVEC MES PEPTIDES ?\\n[réponse pratique, poudre lyophilisée OK, reconstitué = glacière]\\n\\nCOMBIEN DE TEMPS AVANT DE VOIR DES RÉSULTATS ?\\n[réponse adaptée aux peptides sélectionnés, ex: BPC-157 = 1-2 semaines pour les premiers effets]\\n\\nJE PEUX MÉLANGER 2 PEPTIDES DANS LA MÊME SERINGUE ?\\n[réponse, oui pour certains combos comme CJC+Ipa, non pour d'autres]\\n\\nQUE FAIRE SI J'OUBLIE UNE DOSE ?\\n[réponse, ne pas doubler, reprendre normalement le lendemain]\\n\\nLES PEPTIDES SONT-ILS LÉGAUX ?\\n[réponse, recherche uniquement, pas approuvés usage humain, responsabilité individuelle]\\n\\nCOMMENT SAVOIR SI MES PEPTIDES SONT AUTHENTIQUES ?\\n[réponse, COA (Certificate of Analysis), vérifier sur le site du labo tiers, Peptaura les fournit]\\n\\nAdapte les questions et réponses au profil du client (débutant = plus de questions basiques, avancé = questions techniques)."
    },
    {
      "id": "disclaimer-support",
      "title": "Support et informations importantes",
      "content": "${firstName}, quelques points importants pour terminer.\\n\\nCONFIDENTIALITE DE LA SOURCE (CRITIQUE)\\nNe partage JAMAIS cette source (Peptaura, les fournisseurs GlobalSources, ni les fournisseurs UK) avec qui que ce soit. Ni tes amis, ni sur les forums, ni sur les reseaux sociaux. Pourquoi ? Parce que dans le marche des peptides, quand un fournisseur commence a etre trop connu et a avoir trop de clients, il se passe toujours la meme chose : la qualite baisse, les prix montent, les faux produits apparaissent, et les COA deviennent douteux. C'est arrive avec tous les gros revendeurs historiques. Cette source reste fiable PARCE QU'elle reste confidentielle. Si tu veux aider quelqu'un, envoie-le vers Peptides Engine, il aura sa propre source dans son rapport. Protege la qualite de tes propres achats futurs en gardant cette information pour toi.\\n\\nMATERIEL D'INJECTION (pharmacie ou Amazon)\\nLes seringues insuline U-100 (31G 8mm), les tampons alcool (swabs), et la boite de securite pour aiguilles usagees s'achetent directement en pharmacie sans ordonnance ou sur Amazon. Tu n'as pas besoin de les commander sur Peptaura. En pharmacie, demande simplement des seringues insuline et des compresses alcoolisees, c'est courant et il n'y a aucune question posee. Sur Amazon, cherche 'seringues insuline 31G' et 'tampons alcool injection'.\\n\\nSTOCKS ET DISPONIBILITE\\nJe ne suis pas responsable des stocks des fournisseurs sur Peptaura. Les peptides sont produits par des laboratoires tiers et leur disponibilite peut varier. Si un produit de ton protocole est en rupture chez le fournisseur recommande, choisis simplement un autre fournisseur sur Peptaura qui vend la meme molecule (meme purete, meme COA). Les prix peuvent varier legerement.\\n\\nSAV PEPTAURA\\nPour toute question concernant ta commande (suivi de livraison, probleme de paiement, produit manquant, remboursement), contacte directement le service client Peptaura : https://www.peptaura.com/contact. Ils repondent generalement sous 24-48h.\\n\\nSUPPORT ACHZOD\\nPour toute question sur ton PROTOCOLE (dosages, timing, effets secondaires, ajustements), tu peux me contacter directement par email : coaching@achzodcoaching.com. Je reponds personnellement a chaque message.\\n\\nCOUT MENSUEL ESTIME\\nDetaille le cout total du cycle divise par le nombre de mois. Exemple : si le cycle coute $180 sur 8 semaines, ca revient a environ $90/mois (~85EUR/mois).\\n\\nCE PROTOCOLE EST FOURNI A TITRE EDUCATIF ET INFORMATIF. Il ne constitue pas un avis medical. Consulte un professionnel de sante avant toute supplementation, surtout si tu prends des medicaments."
    }
  ],
  "peptides": [
    {
      "name": "Nom du peptide",
      "purpose": "Objectif spécifique pour CE profil",
      "whyThisPeptide": "Explication détaillée en 2-3 phrases",
      "dosage": "X mcg/jour (X mcg/kg pour ${weight}kg)",
      "timing": "Horaire précis et conditions",
      "route": "SC / IM / Intranasal",
      "cycleDuration": "X semaines, pause Y semaines",
      "reconstitution": "Vial [Xmg] + [Y]ml BAC water = [Z]mcg/ml → [N] unités (soit [X.XX] ml) pour [dose]mcg. CONTRAINTE: [Y] ne dépasse JAMAIS 3, en pratique 1 à 2 pour les vials 2-10mg et 2 à 3 pour les vials 10-100mg. Vérifie avant de finaliser.",
      "vialsNeeded": "X vials pour le cycle complet",
      "purchaseUrl": "https://www.peptaura.com/catalog/[SLUG_EXACT]",
      "priceEstimate": "~$XX/vial × Y vials = $ZZ total (~€WW)"
    }
  ],
  "bloodMarkers": ["IGF-1", "Glycémie à jeun", "... marqueurs pertinents pour ce profil"],
  "weeklySchedule": "LUNDI AM: [peptide] [dose] SC [site] | LUNDI PM: [peptide] [dose] SC [site] | MARDI AM: ... | etc.",
  "shoppingList": "[peptide] [dosage] × [qty] ([fournisseur]) = $[prix] | [peptide] × [qty] = $[prix] | BAC water × [qty] = $[prix] | Seringues × [qty] = $[prix] | TOTAL: ~$XXX (~€YYY)",
  "promoCodesGenerated": []
}`;
}

// ─── Claude call with retry ───────────────────────────────────────────────────

const PEPTIDES_MAX_TOKENS = 20000; // Anthropic requires streaming for max_tokens > ~20K , keep at safe threshold
const PEPTIDES_TEMPERATURE = 0.3;
const PEPTIDES_MAX_RETRIES = 3;

async function callClaudeForPeptides(
  systemPrompt: string,
  userPrompt: string,
  opts?: { forceOpus?: boolean }
): Promise<string> {
  const client = getClient();
  // When forceOpus=true, skip Sonnet entirely and go directly to Opus.
  // Used on retry after Sonnet produced malformed JSON.
  const model = opts?.forceOpus ? "claude-opus-4-6" : "claude-sonnet-4-6";
  const fallback = opts?.forceOpus ? "claude-sonnet-4-6" : "claude-opus-4-6";

  for (let attempt = 1; attempt <= PEPTIDES_MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: PEPTIDES_MAX_TOKENS,
        temperature: PEPTIDES_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((c) => c.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "";

      if (!text.trim()) throw new Error("Empty response from Claude");

      console.log(`[PeptidesEngine] Generation OK (attempt ${attempt}, model: ${model})`);
      return text;
    } catch (error: any) {
      const status = error?.status;
      const msg = String(error?.message || error || "");
      console.error(`[PeptidesEngine] Attempt ${attempt}/${PEPTIDES_MAX_RETRIES} failed: ${msg}`);

      if (status === 429) {
        const retryAfter = error?.headers?.["retry-after"];
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 8000;
        console.log(`[PeptidesEngine] Rate limit , waiting ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      if (status === 529 || msg.includes("overloaded")) {
        console.log(`[PeptidesEngine] Server overloaded , waiting 12s`);
        await sleep(12000);
        continue;
      }

      if (attempt < PEPTIDES_MAX_RETRIES) {
        await sleep(3000 + Math.random() * 1000);
      }
    }
  }

  // Fallback model
  console.log(`[PeptidesEngine] Switching to fallback model: ${fallback}`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: fallback,
        max_tokens: PEPTIDES_MAX_TOKENS,
        temperature: PEPTIDES_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const textBlock = response.content.find((c) => c.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "";
      if (text.trim()) {
        console.log(`[PeptidesEngine] Fallback OK (attempt ${attempt})`);
        return text;
      }
    } catch (error: any) {
      console.error(`[PeptidesEngine] Fallback attempt ${attempt}/2: ${error?.message || error}`);
      if (attempt < 2) await sleep(4000);
    }
  }

  throw new Error("[PeptidesEngine] All generation attempts failed");
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

async function extractJsonFromResponse(raw: string): Promise<PeptidesReport> {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // First attempt: strict JSON.parse
  try {
    return JSON.parse(cleaned) as PeptidesReport;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[PeptidesEngine] JSON parse error:", errMsg);
    console.error("[PeptidesEngine] Cleaned length:", cleaned.length);

    // Second attempt: jsonrepair (fixes missing commas, trailing commas, unescaped chars)
    try {
      // @ts-ignore , jsonrepair has no types shipped with it, loaded at runtime on Render
      const { jsonrepair } = await import("jsonrepair");
      const repaired = jsonrepair(cleaned);
      console.log("[PeptidesEngine] ✅ jsonrepair succeeded, repaired length:", repaired.length);
      return JSON.parse(repaired) as PeptidesReport;
    } catch (repairErr) {
      const repairMsg = repairErr instanceof Error ? repairErr.message : String(repairErr);
      console.error("[PeptidesEngine] jsonrepair also failed:", repairMsg);
      // Log context around the error position to help debug
      const posMatch = errMsg.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        console.error(`[PeptidesEngine] Context around position ${pos}:`, cleaned.slice(Math.max(0, pos - 100), pos + 100));
      }
      throw new Error("Could not parse Claude response as JSON (even with repair)");
    }
  }
}

// ─── Post-process: validate Peptaura URLs ─────────────────────────────────────

function validateAndFixPeptauraUrls(report: PeptidesReport): PeptidesReport {
  const slugMap = new Map(PEPTAURA_CATALOG.map(p => [p.name.toLowerCase(), p]));

  for (const pep of report.peptides) {
    const match = slugMap.get(pep.name.toLowerCase());
    if (match) {
      // Force correct URL from our catalog
      pep.purchaseUrl = `https://www.peptaura.com/catalog/${match.slug}`;
    } else {
      // Try fuzzy match
      for (const [key, cat] of slugMap) {
        if (pep.name.toLowerCase().includes(key) || key.includes(pep.name.toLowerCase())) {
          pep.purchaseUrl = `https://www.peptaura.com/catalog/${cat.slug}`;
          break;
        }
      }
    }
  }

  return report;
}

// ─── Post-process: validate vials math (Guillaume Gestin bug, 2026-05-03) ────
// The AI sometimes invents an absurd vial count (e.g. "3 vials" for a 111mg
// Retatrutide cycle that actually needs 12 vials of 10mg). We deterministically
// recompute total_mg from the dosage prose + cycle duration, parse the vial
// size from the reconstitution prose, and override vialsNeeded if it's off
// by more than a 30% safety margin.

interface VialsDerivation {
  totalMg: number;
  vialMg: number;
  weeks: number;
  computed: number;
}

function parseDoseToMg(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("mcg") || u === "µg" || u === "ug") return value / 1000;
  if (u.startsWith("mg")) return value;
  if (u.startsWith("g")) return value * 1000;
  return value;
}

function deriveVialsForPeptide(pep: PeptideItem): VialsDerivation | null {
  const dosage = pep.dosage || "";
  const cycle = pep.cycleDuration || "";
  const reconstitution = pep.reconstitution || "";

  // Extract cycle weeks (default 12 if not parseable)
  const weeksMatch = cycle.match(/(\d+)\s*semaines?/i);
  const weeks = weeksMatch ? parseInt(weeksMatch[1], 10) : 12;
  if (weeks <= 0 || weeks > 52) return null;

  // Extract vial size from reconstitution (e.g. "Vial 10mg + 2ml")
  const vialMatch = reconstitution.match(/vial\s*(\d+(?:\.\d+)?)\s*(mg|mcg)/i);
  if (!vialMatch) return null;
  const vialMg = parseDoseToMg(parseFloat(vialMatch[1]), vialMatch[2]);
  if (!isFinite(vialMg) || vialMg <= 0) return null;

  // Pattern A — progressive weekly doses: "1mg sem 1, 2mg sem 2, ... Xmg sem N et au-delà"
  const progressive = Array.from(
    dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*sem(?:aine)?\s*(\d+)/gi)
  );
  if (progressive.length >= 2) {
    // Build week→mg map
    const dosesByWeek = new Map<number, number>();
    for (const m of progressive) {
      const v = parseDoseToMg(parseFloat(m[1]), m[2]);
      const w = parseInt(m[3], 10);
      dosesByWeek.set(w, v);
    }
    const sortedWeeks = [...dosesByWeek.keys()].sort((a, b) => a - b);
    const lastDefinedWeek = sortedWeeks[sortedWeeks.length - 1];
    const lastDose = dosesByWeek.get(lastDefinedWeek)!;
    let totalMg = 0;
    for (let w = 1; w <= weeks; w++) {
      if (dosesByWeek.has(w)) totalMg += dosesByWeek.get(w)!;
      else if (w > lastDefinedWeek) totalMg += lastDose; // "et au-delà"
      // else: gap before first defined week — assume 0 (rare)
    }
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern B — fixed daily dose with N injections/day
  const perInjMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*injection/i);
  const injPerDayMatch = dosage.match(/(\d+)\s*injections?\s*par\s*jour/i);
  if (perInjMatch && injPerDayMatch) {
    const perInjMg = parseDoseToMg(parseFloat(perInjMatch[1]), perInjMatch[2]);
    const injPerDay = parseInt(injPerDayMatch[1], 10);
    const totalMg = perInjMg * injPerDay * 7 * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern C — fixed daily total ("X mg par jour" / "X mcg par jour")
  const perDayMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*jour/i);
  if (perDayMatch) {
    const perDayMg = parseDoseToMg(parseFloat(perDayMatch[1]), perDayMatch[2]);
    const totalMg = perDayMg * 7 * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern D — fixed weekly dose ("X mg par semaine")
  const perWeekMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*semaine/i);
  if (perWeekMatch) {
    const perWeekMg = parseDoseToMg(parseFloat(perWeekMatch[1]), perWeekMatch[2]);
    const totalMg = perWeekMg * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  return null;
}

function validateVialsMath(report: PeptidesReport): PeptidesReport {
  for (const pep of report.peptides) {
    const derived = deriveVialsForPeptide(pep);
    if (!derived) continue;

    // Parse the AI's claim (e.g. "3 vials" -> 3) for comparison
    const aiCountMatch = (pep.vialsNeeded || "").match(/(\d+)\s*vials?/i);
    const aiCount = aiCountMatch ? parseInt(aiCountMatch[1], 10) : null;

    // Override only when AI undershoots or overshoots by ≥30% — ceiling already
    // bakes in the partial-vial buffer, so we don't add another +1 by default.
    const shouldOverride =
      aiCount === null ||
      aiCount < derived.computed ||
      Math.abs(aiCount - derived.computed) / derived.computed > 0.3;

    if (shouldOverride) {
      const totalDisplay =
        derived.totalMg >= 1
          ? `${Math.round(derived.totalMg * 10) / 10}mg`
          : `${Math.round(derived.totalMg * 1000)}mcg`;
      pep.vialsNeeded = `${derived.computed} vials de ${derived.vialMg}mg pour ${derived.weeks} semaines (total ~${totalDisplay})`;
      console.log(
        `[PeptidesEngine] Vials override for ${pep.name}: AI said ${aiCount}, math gives ${derived.computed} (total ${totalDisplay} / vial ${derived.vialMg}mg / ${derived.weeks} sem)`
      );
    }
  }
  return report;
}

// ─── Promo code creator ───────────────────────────────────────────────────────

async function addBloodAnalysisCredits(email: string): Promise<string[]> {
  // Add 2 blood analysis credits directly to the user account (no promo codes needed)
  try {
    const { pool } = await import("./db");
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.createUser({ email, credits: 2 });
      console.log(`[PeptidesEngine] Created user ${email} with 2 blood credits`);
    } else {
      await pool.query("UPDATE users SET credits = credits + 2 WHERE email = $1", [email]);
      console.log(`[PeptidesEngine] +2 blood credits for ${email}`);
    }
  } catch (err) {
    console.error(`[PeptidesEngine] Failed to add blood credits for ${email}:`, err);
  }
  return ["2 credits Blood Analysis ajoutes a ton compte"];
}

// ─── Safety gate ──────────────────────────────────────────────────────────────

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

export function checkPeptidesSafetyGate(
  responses: Record<string, unknown>
): SafetyCheckResult {
  const boolish = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const lower = v.toLowerCase();
      return lower === "oui" || lower === "yes" || lower === "true";
    }
    return false;
  };

  const stringish = (v: unknown): string => {
    if (!v) return "";
    return String(v).toLowerCase();
  };

  // Cancer check
  const cancerFields = ["cancer", "antecedentsCancer", "antecedentsMedicaux", "pathologiesChroniques", "pep_conditions"];
  for (const field of cancerFields) {
    const val = responses[field];
    if (boolish(val)) {
      return {
        safe: false,
        reason: "Antécédents de cancer détectés. Les peptides pro-angiogéniques (BPC-157, TB-500) et les sécrétagogues GH sont contre-indiqués. Consulte un oncologue avant toute supplémentation.",
      };
    }
    if (typeof val === "string" && stringish(val).includes("cancer")) {
      return { safe: false, reason: "Antécédents de cancer détectés. Consulte un oncologue." };
    }
    if (Array.isArray(val) && val.some((v: any) => stringish(v).includes("cancer"))) {
      return { safe: false, reason: "Antécédents de cancer détectés. Consulte un oncologue." };
    }
  }

  // Free-text check
  const antecedents = stringish(responses["antecedentsMedicaux"] || responses["pep_conditions_other"]);
  if (antecedents.includes("cancer") || antecedents.includes("tumeur") || antecedents.includes("onco")) {
    return { safe: false, reason: "Antécédents oncologiques détectés. Protocole peptides suspendu par précaution." };
  }

  return { safe: true };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePeptidesProtocol(
  responses: Record<string, unknown>,
  email: string
): Promise<PeptidesReport> {
  console.log(`[PeptidesEngine] Starting generation for ${email}`);

  const firstName = extractFirstName(responses, email);
  const userPrompt = buildUserPrompt(responses, firstName);

  // Generate with retry (up to 2 attempts)
  let report: PeptidesReport | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // On retry, force Opus , Sonnet has shown systematic JSON corruption for certain
      // complex profiles (~55K char outputs with missing array commas). Opus is more
      // reliable at large structured JSON output.
      const forceOpus = attempt > 1;
      console.log(`[PeptidesEngine] Attempt ${attempt}/2 for ${email}${forceOpus ? " (forcing Opus)" : ""}`);
      const rawResponse = await callClaudeForPeptides(SYSTEM_PROMPT, userPrompt, { forceOpus });
      report = await extractJsonFromResponse(rawResponse);

      // ════════════════════════════════════════════════════════════
      // VALIDATION BETON , ne rien laisser passer
      // ════════════════════════════════════════════════════════════

      // CHECK 1: sections exist and have content
      if (!report.sections || report.sections.length < 5) {
        throw new Error(`VALIDATION: seulement ${report.sections?.length ?? 0} sections (min 5)`);
      }
      const emptySections = report.sections.filter(s => !s.content || s.content.length < 100);
      if (emptySections.length > 2) {
        throw new Error(`VALIDATION: ${emptySections.length} sections vides ou trop courtes`);
      }

      // CHECK 2: peptides exist (min 2 , a stack should always have at least 2)
      if (!report.peptides || report.peptides.length < 2) {
        throw new Error(`VALIDATION: seulement ${report.peptides?.length ?? 0} peptide(s) (min 2) , probable truncation`);
      }

      // CHECK 3: each peptide has required fields
      for (const pep of report.peptides) {
        if (!pep.name || !pep.dosage || !pep.route) {
          throw new Error(`VALIDATION: peptide incomplet , name=${pep.name} dosage=${pep.dosage}`);
        }
      }

      // CHECK 3b: peptides array must cover peptides mentioned in the FULL narrative
      // (sections + weeklySchedule + shoppingList). Detects jsonrepair silently truncating the
      // peptides array , e.g., narrative discusses CJC-1295/Ipamorelin/Retatrutide in depth
      // but array only has BPC-157 + TB-500.
      const sectionsText = (report.sections || []).map((s: any) => String(s.content ?? "")).join(" ");
      const scheduleText = typeof report.weeklySchedule === "string" ? report.weeklySchedule : JSON.stringify(report.weeklySchedule ?? "");
      const shoppingText = typeof report.shoppingList === "string" ? report.shoppingList : JSON.stringify(report.shoppingList ?? "");
      const combinedText = (sectionsText + " " + scheduleText + " " + shoppingText).toLowerCase();
      // Known peptides with thresholds , if the narrative mentions a peptide > N times,
      // it's genuinely part of the protocol and must be in the array.
      const knownPeptides: Array<[string, number]> = [
        ["bpc-157", 5], ["bpc157", 5],
        ["tb-500", 5], ["tb500", 5],
        ["cjc-1295", 5], ["cjc1295", 5],
        ["ipamorelin", 5],
        ["retatrutide", 5],
        ["mk-677", 5], ["mk677", 5], ["ibutamoren", 5],
        ["epitalon", 5],
        ["ghk-cu", 5], ["ghkcu", 5],
        ["semax", 5], ["selank", 5], ["dsip", 5],
        ["melanotan", 5], ["hexarelin", 5],
        ["tesamorelin", 5], ["sermorelin", 5],
        ["semaglutide", 5], ["tirzepatide", 5],
      ];
      const peptidesInArray = (report.peptides || []).map((p: any) => String(p.name || "").toLowerCase());
      const countInText = (needle: string) => {
        let count = 0; let idx = 0;
        while ((idx = combinedText.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
        return count;
      };
      const mentionedFeatures = knownPeptides
        .map(([name, threshold]) => ({ name, count: countInText(name), threshold }))
        .filter(x => x.count >= x.threshold);
      // Deduplicate (e.g., bpc-157 and bpc157 are the same peptide)
      const featureKey = (name: string) => name.replace(/-/g, "").toLowerCase();
      const mentionedFeatureSet = new Set(mentionedFeatures.map(x => featureKey(x.name)));
      const coveredByArray = new Set(
        peptidesInArray.flatMap((arrName: string) => {
          const key = featureKey(arrName);
          // Match array peptide against feature (e.g., "CJC-1295 sans DAC" covers "cjc1295")
          return Array.from(mentionedFeatureSet).filter(f => key.includes(f) || f.includes(key.split(" ")[0] || ""));
        })
      );
      const missingFromArray = Array.from(mentionedFeatureSet).filter(f => !coveredByArray.has(f));
      if (missingFromArray.length >= 1) {
        throw new Error(`VALIDATION: peptides array incomplete , narrative deeply covers ${Array.from(mentionedFeatureSet).join(", ")} but array has only ${peptidesInArray.join(", ")} (missing: ${missingFromArray.join(", ")}). Likely jsonrepair truncation.`);
      }

      // CHECK 4: total content length
      const totalContent = report.sections.reduce((sum, s) => sum + (s.content?.length ?? 0), 0);
      if (totalContent < 5000) {
        throw new Error(`VALIDATION: contenu total trop court (${totalContent} chars, min 5000)`);
      }

      // CHECK 5: client name present
      if (!report.clientName || report.clientName === "Profil") {
        report.clientName = firstName;
      }

      // CHECK 6: dosages not placeholders/zeros/empty
      // Reject strings that look like templates (e.g., "[X mcg]", "TBD", "?mcg", "X mg/kg"),
      // or that have no digit at all, or dosages of 0.
      const placeholderPattern = /^\s*$|\[|\]|TBD|\bX\b|XXX|\?\?\?|^\?/i;
      for (const pep of report.peptides) {
        const dose = String(pep.dosage || "");
        if (placeholderPattern.test(dose)) {
          throw new Error(`VALIDATION: dosage template non rempli pour ${pep.name} , "${dose}"`);
        }
        // Must contain at least one digit
        if (!/\d/.test(dose)) {
          throw new Error(`VALIDATION: dosage sans valeur numérique pour ${pep.name} , "${dose}"`);
        }
        // Extract the first number and ensure it's non-zero
        const firstNum = parseFloat(dose.replace(",", "."));
        if (Number.isFinite(firstNum) && firstNum === 0) {
          throw new Error(`VALIDATION: dosage à zéro pour ${pep.name} , "${dose}"`);
        }
      }

      // CHECK 7: personnalisation , le prénom du client doit apparaître dans au moins
      // une section. Détecte les sorties "template" où le prompt n'a pas été interpolé.
      const fnLower = firstName.toLowerCase();
      const hasPersonalization = report.sections.some((s: any) => String(s.content ?? "").toLowerCase().includes(fnLower));
      if (!hasPersonalization && firstName.length >= 2 && firstName.toLowerCase() !== "client") {
        throw new Error(`VALIDATION: prénom "${firstName}" absent de toutes les sections , rapport non personnalisé`);
      }

      console.log(`[PeptidesEngine] ✅ Validation OK: ${report.sections.length} sections, ${report.peptides.length} peptides, ${totalContent} chars`);
      break; // Success , exit retry loop

    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(`[PeptidesEngine] ❌ Attempt ${attempt} failed: ${lastError}`);
      report = null;
      if (attempt < 2) {
        console.log(`[PeptidesEngine] Retrying in 3s...`);
        await sleep(3000);
      }
    }
  }

  if (!report) {
    throw new Error(`[PeptidesEngine] Generation failed after 2 attempts: ${lastError}`);
  }

  // Validate and fix Peptaura URLs (never trust Claude's URLs)
  report = validateAndFixPeptauraUrls(report);

  // Validate vials math — AI invents wrong vial counts (Guillaume Gestin bug)
  report = validateVialsMath(report);

  // POST-PROCESSING: clean dashes and 3rd person references
  report = cleanReportContent(report, firstName);

  // Create promo codes and inject into report
  const promoCodes = await addBloodAnalysisCredits(email);
  report.promoCodesGenerated = promoCodes;

  // Normalize
  report.clientName = firstName;

  // FINAL CHECK , log everything
  console.log(`[PeptidesEngine] ✅ FINAL: ${email}`);
  console.log(`[PeptidesEngine]   Sections: ${report.sections.length}`);
  console.log(`[PeptidesEngine]   Peptides: ${report.peptides.map(p => p.name).join(", ")}`);
  console.log(`[PeptidesEngine]   Promos: ${report.promoCodesGenerated.join(", ")}`);
  console.log(`[PeptidesEngine]   Content: ${report.sections.reduce((s, sec) => s + (sec.content?.length ?? 0), 0)} chars`);

  return report;
}
