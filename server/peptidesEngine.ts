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
// Source: peptaura.com marketplace — 13 Chinese suppliers.
// Best value supplier: Lumira (Welon) — 4.82/5, $1120 MOQ, free shipping $1120+
// Lowest MOQ: Pepturion (Yimei) — 4.80/5, $260 MOQ

export interface PeptaurProduct {
  name: string;
  slug: string; // URL: peptaura.com/catalog/{slug}
  dosages: string[]; // e.g. ["5mg", "10mg"]
  priceRangeUSD: string; // e.g. "$9.65 - $266"
  cheapestSupplier: string;
  cheapestPriceUSD: number; // lowest single vial
  supplierCount: number;
  formFactor: "vial" | "cartridge";
  category: "recovery" | "gh-secretagogue" | "fat-loss" | "sleep" | "cognitive" | "libido" | "skin" | "longevity" | "endurance" | "glp1" | "blend" | "supplies" | "other";
}

export const PEPTAURA_CATALOG: PeptaurProduct[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // RECOVERY & HEALING
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "BPC-157", slug: "BPC157", dosages: ["5mg", "10mg"], priceRangeUSD: "$9.65 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.65, supplierCount: 13, formFactor: "vial", category: "recovery" },
  { name: "TB-500", slug: "TB500", dosages: ["5mg", "10mg"], priceRangeUSD: "$10.37 - $434", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.37, supplierCount: 12, formFactor: "vial", category: "recovery" },
  { name: "BPC-157 + TB-500 Blend", slug: "BPC157+TB500", dosages: ["combo"], priceRangeUSD: "$22.93 - $450", cheapestSupplier: "Lumira", cheapestPriceUSD: 22.93, supplierCount: 12, formFactor: "vial", category: "blend" },
  { name: "LL-37", slug: "LL-37", dosages: ["5mg", "10mg"], priceRangeUSD: "$20.38 - $210", cheapestSupplier: "Lumira", cheapestPriceUSD: 20.38, supplierCount: 11, formFactor: "vial", category: "recovery" },
  { name: "Thymosin Alpha-1", slug: "Thymosin Alpha-1", dosages: ["5mg", "10mg"], priceRangeUSD: "$19.66 - $280", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.66, supplierCount: 11, formFactor: "vial", category: "recovery" },
  { name: "KPV", slug: "KPV", dosages: ["10mg"], priceRangeUSD: "$12.38 - $112", cheapestSupplier: "Lumira", cheapestPriceUSD: 12.38, supplierCount: 10, formFactor: "vial", category: "recovery" },
  { name: "VIP", slug: "VIP", dosages: ["5mg", "10mg"], priceRangeUSD: "$19.11 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 19.11, supplierCount: 12, formFactor: "vial", category: "recovery" },
  { name: "HCG", slug: "HCG", dosages: ["5000IU", "10000IU"], priceRangeUSD: "$18.02 - $239", cheapestSupplier: "Lumira", cheapestPriceUSD: 18.02, supplierCount: 11, formFactor: "vial", category: "recovery" },
  { name: "Ara-290", slug: "Ara-290", dosages: ["5mg", "10mg"], priceRangeUSD: "$14.01 - $112", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.01, supplierCount: 10, formFactor: "vial", category: "recovery" },
  { name: "Cerebrolysin", slug: "Cerebrolysin", dosages: ["5ml", "10ml"], priceRangeUSD: "$15.11 - $116", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.11, supplierCount: 11, formFactor: "vial", category: "recovery" },
  { name: "Dermorphin", slug: "Dermorphin", dosages: ["5mg"], priceRangeUSD: "$54.60 - $105", cheapestSupplier: "VialForge", cheapestPriceUSD: 54.60, supplierCount: 7, formFactor: "vial", category: "recovery" },

  // ══════════════════════════════════════════════════════════════════════════════
  // GH SECRETAGOGUES
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "CJC-1295 (no DAC)", slug: "CJC-1295", dosages: ["2mg", "5mg", "10mg"], priceRangeUSD: "$18.02 - $228", cheapestSupplier: "Lumira", cheapestPriceUSD: 18.02, supplierCount: 12, formFactor: "vial", category: "gh-secretagogue" },
  { name: "CJC-1295 (with DAC)", slug: "CJC-1295 (DAC)", dosages: ["2mg", "5mg"], priceRangeUSD: "$33.67 - $420", cheapestSupplier: "Lumira", cheapestPriceUSD: 33.67, supplierCount: 11, formFactor: "vial", category: "gh-secretagogue" },
  { name: "CJC-1295 + Ipamorelin Blend", slug: "CJC-1295 (no DAC) + Ipamorelin", dosages: ["combo"], priceRangeUSD: "$23.30 - $210", cheapestSupplier: "Lumira", cheapestPriceUSD: 23.30, supplierCount: 12, formFactor: "vial", category: "blend" },
  { name: "Ipamorelin", slug: "Ipamorelin", dosages: ["5mg", "10mg"], priceRangeUSD: "$8.92 - $210", cheapestSupplier: "Lumira", cheapestPriceUSD: 8.92, supplierCount: 13, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Tesamorelin", slug: "Tesamorelin", dosages: ["2mg", "5mg", "10mg", "20mg"], priceRangeUSD: "$23.30 - $588", cheapestSupplier: "Lumira", cheapestPriceUSD: 23.30, supplierCount: 12, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Sermorelin", slug: "Sermorelin", dosages: ["5mg", "10mg"], priceRangeUSD: "$54.60 - $232", cheapestSupplier: "VialForge", cheapestPriceUSD: 54.60, supplierCount: 3, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Sermorelin Acetate", slug: "Sermorelin Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$17.11 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 17.11, supplierCount: 8, formFactor: "vial", category: "gh-secretagogue" },
  { name: "Hexarelin", slug: "Hexarelin Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$63.34 - $238", cheapestSupplier: "Lumira", cheapestPriceUSD: 63.34, supplierCount: 7, formFactor: "vial", category: "gh-secretagogue" },
  { name: "GHRP-2", slug: "GHRP-2 Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$36.40 - $98", cheapestSupplier: "NovaVial", cheapestPriceUSD: 36.40, supplierCount: 10, formFactor: "vial", category: "gh-secretagogue" },
  { name: "GHRP-6", slug: "GHRP-6 Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$7.64 - $98", cheapestSupplier: "Lumira", cheapestPriceUSD: 7.64, supplierCount: 10, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HGH (Somatropin)", slug: "Somatropin (HGH)", dosages: ["6IU", "10IU", "12IU", "15IU", "24IU", "36IU"], priceRangeUSD: "$12.92 - $490", cheapestSupplier: "Lumira", cheapestPriceUSD: 12.92, supplierCount: 10, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HGH Fragment 176-191", slug: "HGH Fragment 176-191", dosages: ["5mg", "10mg"], priceRangeUSD: "$21.29 - $259", cheapestSupplier: "Lumira", cheapestPriceUSD: 21.29, supplierCount: 7, formFactor: "vial", category: "gh-secretagogue" },
  { name: "IGF-1 LR3", slug: "IGF-1LR3", dosages: ["1mg"], priceRangeUSD: "$8.92 - $360", cheapestSupplier: "Lumira", cheapestPriceUSD: 8.92, supplierCount: 10, formFactor: "vial", category: "gh-secretagogue" },
  { name: "PEG-MGF", slug: "PEG MGF", dosages: ["2mg", "5mg"], priceRangeUSD: "$112 - $140", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 112.00, supplierCount: 5, formFactor: "vial", category: "gh-secretagogue" },
  { name: "HMG", slug: "HMG", dosages: ["75IU", "150IU"], priceRangeUSD: "$13.83 - $106", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.83, supplierCount: 9, formFactor: "vial", category: "gh-secretagogue" },

  // ══════════════════════════════════════════════════════════════════════════════
  // FAT LOSS & GLP-1
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "AOD-9604", slug: "AOD-9604", dosages: ["5mg", "10mg"], priceRangeUSD: "$23.84 - $319", cheapestSupplier: "Lumira", cheapestPriceUSD: 23.84, supplierCount: 9, formFactor: "vial", category: "fat-loss" },
  { name: "5-Amino-1MQ", slug: "5-AMINO-1MQ", dosages: ["50mg", "100mg"], priceRangeUSD: "$10.37 - $252", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.37, supplierCount: 12, formFactor: "vial", category: "fat-loss" },
  { name: "Semaglutide", slug: "Semaglutide", dosages: ["5mg", "10mg", "15mg", "20mg", "30mg"], priceRangeUSD: "$5.64 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 5.64, supplierCount: 13, formFactor: "vial", category: "glp1" },
  { name: "Tirzepatide", slug: "Tirzepatide", dosages: ["5mg", "10mg", "15mg", "20mg", "30mg", "60mg", "100mg"], priceRangeUSD: "$9.65 - $671", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.65, supplierCount: 13, formFactor: "vial", category: "glp1" },
  { name: "Retatrutide", slug: "Retatrutide", dosages: ["5mg", "10mg", "15mg", "20mg", "30mg", "50mg"], priceRangeUSD: "$13.65 - $735", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.65, supplierCount: 13, formFactor: "vial", category: "glp1" },
  { name: "Cagrilintide", slug: "Cagrilintide", dosages: ["5mg", "10mg"], priceRangeUSD: "$30.76 - $389", cheapestSupplier: "Lumira", cheapestPriceUSD: 30.76, supplierCount: 13, formFactor: "vial", category: "glp1" },
  { name: "Cagrilintide + Semaglutide Blend", slug: "Cagrilintide+Semaglutide", dosages: ["combo"], priceRangeUSD: "$193.70 - $350", cheapestSupplier: "Pepturion", cheapestPriceUSD: 193.70, supplierCount: 9, formFactor: "vial", category: "glp1" },
  { name: "Mazdutide", slug: "Mazdutide", dosages: ["5mg", "10mg"], priceRangeUSD: "$154 - $322", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 154.00, supplierCount: 6, formFactor: "vial", category: "glp1" },
  { name: "Survodutide", slug: "Survodutide", dosages: ["5mg", "10mg"], priceRangeUSD: "$294 - $521", cheapestSupplier: "HelixBridge", cheapestPriceUSD: 294.00, supplierCount: 9, formFactor: "vial", category: "glp1" },
  { name: "L-Carnitine", slug: "L-Carnitine", dosages: ["500mg", "1000mg"], priceRangeUSD: "$10.37 - $126", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.37, supplierCount: 3, formFactor: "vial", category: "fat-loss" },
  { name: "Lipo-C", slug: "Lipo c", dosages: ["10ml"], priceRangeUSD: "$12.92 - $136", cheapestSupplier: "Lumira", cheapestPriceUSD: 12.92, supplierCount: 6, formFactor: "vial", category: "fat-loss" },

  // ══════════════════════════════════════════════════════════════════════════════
  // SLEEP
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "DSIP", slug: "DSIP", dosages: ["5mg", "10mg"], priceRangeUSD: "$6.55 - $154", cheapestSupplier: "Lumira", cheapestPriceUSD: 6.55, supplierCount: 12, formFactor: "vial", category: "sleep" },
  { name: "Melatonin", slug: "Melatonin", dosages: ["10mg"], priceRangeUSD: "$13.65 - $182", cheapestSupplier: "Lumira", cheapestPriceUSD: 13.65, supplierCount: 4, formFactor: "vial", category: "sleep" },

  // ══════════════════════════════════════════════════════════════════════════════
  // COGNITIVE & NEUROPROTECTION
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "Semax", slug: "Semax", dosages: ["10mg", "30mg"], priceRangeUSD: "$9.65 - $266", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.65, supplierCount: 13, formFactor: "vial", category: "cognitive" },
  { name: "Selank", slug: "Selank", dosages: ["10mg"], priceRangeUSD: "$9.28 - $252", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.28, supplierCount: 10, formFactor: "vial", category: "cognitive" },
  { name: "Adamax", slug: "Adamax", dosages: ["10mg"], priceRangeUSD: "$18.02 - $259", cheapestSupplier: "Lumira", cheapestPriceUSD: 18.02, supplierCount: 8, formFactor: "vial", category: "cognitive" },
  { name: "Pinealon", slug: "Pinealon", dosages: ["10mg", "20mg"], priceRangeUSD: "$9.46 - $203", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.46, supplierCount: 8, formFactor: "vial", category: "cognitive" },
  { name: "P21", slug: "P21", dosages: ["10mg", "20mg"], priceRangeUSD: "$56 - $539", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 56.00, supplierCount: 6, formFactor: "vial", category: "cognitive" },
  { name: "PE 22-28", slug: "PE 22-28", dosages: ["10mg"], priceRangeUSD: "$106 - $126", cheapestSupplier: "VialForge", cheapestPriceUSD: 106.40, supplierCount: 5, formFactor: "vial", category: "cognitive" },
  { name: "Oxytocin", slug: "Oxytocin Acetate", dosages: ["5mg", "10mg"], priceRangeUSD: "$8.92 - $126", cheapestSupplier: "Lumira", cheapestPriceUSD: 8.92, supplierCount: 8, formFactor: "vial", category: "cognitive" },
  { name: "KissPeptin-10", slug: "KissPeptin-10", dosages: ["5mg", "10mg"], priceRangeUSD: "$12.74 - $172", cheapestSupplier: "Lumira", cheapestPriceUSD: 12.74, supplierCount: 12, formFactor: "vial", category: "cognitive" },

  // ══════════════════════════════════════════════════════════════════════════════
  // LIBIDO & SEXUAL
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "PT-141", slug: "PT-141", dosages: ["10mg"], priceRangeUSD: "$14.38 - $111", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.38, supplierCount: 11, formFactor: "vial", category: "libido" },
  { name: "Melanotan II", slug: "MT-2", dosages: ["10mg"], priceRangeUSD: "$10.74 - $84", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.74, supplierCount: 12, formFactor: "vial", category: "libido" },
  { name: "Melanotan I", slug: "MT-1", dosages: ["10mg"], priceRangeUSD: "$10.74 - $84", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.74, supplierCount: 7, formFactor: "vial", category: "skin" },

  // ══════════════════════════════════════════════════════════════════════════════
  // SKIN, HAIR & ANTI-AGING
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "GHK-Cu", slug: "GHK-Cu", dosages: ["50mg", "100mg"], priceRangeUSD: "$7.64 - $126", cheapestSupplier: "Lumira", cheapestPriceUSD: 7.64, supplierCount: 13, formFactor: "vial", category: "skin" },
  { name: "GHK", slug: "GHK", dosages: ["50mg", "100mg"], priceRangeUSD: "$70 - $83", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 70.00, supplierCount: 2, formFactor: "vial", category: "skin" },
  { name: "AHK-Cu", slug: "AHK-Cu", dosages: ["50mg", "100mg"], priceRangeUSD: "$10.01 - $129", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.01, supplierCount: 9, formFactor: "vial", category: "skin" },
  { name: "Snap-8", slug: "Snap-8", dosages: ["50mg", "100mg"], priceRangeUSD: "$9.65 - $318", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.65, supplierCount: 10, formFactor: "vial", category: "skin" },
  { name: "Hyaluronic Acid", slug: "Hyaluronic Acid", dosages: ["100mg"], priceRangeUSD: "$29.41 - $259", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 29.41, supplierCount: 7, formFactor: "vial", category: "skin" },

  // ══════════════════════════════════════════════════════════════════════════════
  // LONGEVITY & MITOCHONDRIA
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "Epitalon", slug: "Epitalon", dosages: ["10mg", "50mg"], priceRangeUSD: "$9.65 - $294", cheapestSupplier: "Lumira", cheapestPriceUSD: 9.65, supplierCount: 13, formFactor: "vial", category: "longevity" },
  { name: "SS-31 (Elamipretide)", slug: "SS-31", dosages: ["50mg"], priceRangeUSD: "$11.28 - $647", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.28, supplierCount: 12, formFactor: "vial", category: "endurance" },
  { name: "MOTS-c", slug: "MOTS-c", dosages: ["10mg"], priceRangeUSD: "$15.83 - $336", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.83, supplierCount: 10, formFactor: "vial", category: "longevity" },
  { name: "NAD+", slug: "NAD+", dosages: ["100mg", "250mg", "500mg"], priceRangeUSD: "$16.56 - $448", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.56, supplierCount: 11, formFactor: "vial", category: "longevity" },
  { name: "NAD+ (buffered)", slug: "NAD (buffered)", dosages: ["100mg", "250mg"], priceRangeUSD: "$10.01 - $133", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.01, supplierCount: 2, formFactor: "vial", category: "longevity" },
  { name: "Glutathione", slug: "Glutathione", dosages: ["200mg", "500mg"], priceRangeUSD: "$7.10 - $196", cheapestSupplier: "Lumira", cheapestPriceUSD: 7.10, supplierCount: 8, formFactor: "vial", category: "longevity" },
  { name: "FOX04-DRI", slug: "FOX04-DRI", dosages: ["5mg", "10mg"], priceRangeUSD: "$952+", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 952.00, supplierCount: 13, formFactor: "vial", category: "longevity" },
  { name: "FOX04", slug: "FOX04", dosages: ["5mg", "10mg"], priceRangeUSD: "$231 - $952", cheapestSupplier: "Hebei Ktc", cheapestPriceUSD: 231.00, supplierCount: 7, formFactor: "vial", category: "longevity" },
  { name: "SLU-PP-332", slug: "SLU-PP-332", dosages: ["50mg", "100mg"], priceRangeUSD: "$28.76 - $221", cheapestSupplier: "Lumira", cheapestPriceUSD: 28.76, supplierCount: 4, formFactor: "vial", category: "endurance" },
  { name: "PNC-27", slug: "PNC-27", dosages: ["5mg", "10mg"], priceRangeUSD: "$126 - $280", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 126.00, supplierCount: 4, formFactor: "vial", category: "longevity" },
  { name: "GDF-8 (Myostatin inhibitor)", slug: "GDF-8", dosages: ["1mg"], priceRangeUSD: "$280 - $343", cheapestSupplier: "Hebei Ktc", cheapestPriceUSD: 280.00, supplierCount: 6, formFactor: "vial", category: "longevity" },

  // ══════════════════════════════════════════════════════════════════════════════
  // IMMUNE & THYMIC
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "Thymalin", slug: "Thymalin", dosages: ["10mg", "20mg"], priceRangeUSD: "$15.11 - $448", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.11, supplierCount: 13, formFactor: "vial", category: "recovery" },
  { name: "Testagen", slug: "Testagen", dosages: ["10mg", "20mg"], priceRangeUSD: "$168 - $322", cheapestSupplier: "Ultrapept", cheapestPriceUSD: 168.00, supplierCount: 4, formFactor: "vial", category: "other" },
  { name: "Vilon", slug: "Vilon", dosages: ["10mg", "20mg"], priceRangeUSD: "$168 - $179", cheapestSupplier: "Hebei Ktc", cheapestPriceUSD: 168.00, supplierCount: 6, formFactor: "vial", category: "longevity" },

  // ══════════════════════════════════════════════════════════════════════════════
  // BLENDS & PROPRIETARY
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "GLOW (blend)", slug: "GLOW", dosages: ["combo"], priceRangeUSD: "$240.50 - $347", cheapestSupplier: "Railion Tech", cheapestPriceUSD: 240.50, supplierCount: 10, formFactor: "vial", category: "blend" },
  { name: "KLOW (blend)", slug: "KLOW", dosages: ["combo"], priceRangeUSD: "$54.05 - $432", cheapestSupplier: "Lumira", cheapestPriceUSD: 54.05, supplierCount: 10, formFactor: "vial", category: "blend" },

  // ══════════════════════════════════════════════════════════════════════════════
  // SUPPLIES & EQUIPMENT
  // ══════════════════════════════════════════════════════════════════════════════
  { name: "BAC Water", slug: "BAC Water", dosages: ["10ml"], priceRangeUSD: "$2 - $24", cheapestSupplier: "Lumira", cheapestPriceUSD: 2.00, supplierCount: 11, formFactor: "vial", category: "supplies" },
  { name: "Acetic Acid", slug: "Acetic Acid", dosages: ["10ml"], priceRangeUSD: "$3.46 - $31", cheapestSupplier: "Lumira", cheapestPriceUSD: 3.46, supplierCount: 7, formFactor: "vial", category: "supplies" },
  { name: "B12", slug: "B12", dosages: ["5mg", "10mg"], priceRangeUSD: "$9.80 - $160", cheapestSupplier: "NovaVial", cheapestPriceUSD: 9.80, supplierCount: 4, formFactor: "vial", category: "other" },
];
// Total: 74 products synced from peptaura.com (2026-03-28)

// Build catalog summary for Claude prompt
// Only inject protocol-relevant peptides into the prompt (not supplies/blends/niche)
const PROMPT_CATEGORIES = new Set(["recovery", "gh-secretagogue", "fat-loss", "sleep", "cognitive", "libido", "skin", "longevity", "endurance", "glp1"]);

function buildCatalogForPrompt(): string {
  const relevant = PEPTAURA_CATALOG.filter(p => PROMPT_CATEGORIES.has(p.category));
  const lines: string[] = [];
  lines.push("CATALOGUE PEPTAURA (peptaura.com) — PRIX RÉELS EN USD");
  lines.push("Marketplace, 13 fournisseurs COA-verifies. Lumira = meilleur prix. Pepturion = MOQ le plus bas ($260).");
  lines.push("Tous les produits: vials lyophilises (reconstituer avec BAC water).\n");

  for (const p of relevant) {
    lines.push(`• ${p.name} | ${p.dosages.join("/")} | $${p.cheapestPriceUSD} (${p.cheapestSupplier}) | peptaura.com/catalog/${p.slug}`);
  }

  lines.push("\nEquipement: BAC water ($2/vial sur Peptaura), seringues insuline U-100 31G 8mm (les plus fines et courtes — parfaites pour injection SC, quasi indolores), tampons alcool.");
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
Tu ne dois JAMAIS utiliser les caractères suivants : - ou • ou * ou – ou — ou >> NI EN DÉBUT DE LIGNE, NI EN MILIEU DE PHRASE. Le tiret long — est INTERDIT PARTOUT. Utilise des virgules, des points, des deux-points, ou reformule la phrase.
Tu ne dois JAMAIS faire de listes à puces. JAMAIS. Ni avec des tirets, ni avec des points, ni avec des étoiles, ni avec des numéros secs.
Tu ne dois JAMAIS écrire dans un style "fiche technique" ou "notice médicale".
Tu ne dois JAMAIS utiliser de phrases génériques type IA comme "Il est important de noter que...", "N'hésitez pas à...", "En conclusion...", "Voici les points clés...".
Tu ne dois JAMAIS avoir un ton impersonnel ou distant.
Tu ne dois JAMAIS parler du client à la 3ème personne ("Sofiane cherche à...", "Le client veut..."). Tu t'adresses DIRECTEMENT au client avec "tu" et "toi". C'est "Tu cherches à perdre du gras" et NON "Sofiane cherche à perdre du gras".
Chaque information doit être intégrée dans une PHRASE COMPLÈTE à l'intérieur d'un PARAGRAPHE. Pas de raccourcis, pas de listes, pas de tirets, pas de —.

OBLIGATOIRE:
Des PARAGRAPHES de 3 à 5 phrases minimum. Tu développes, tu expliques, tu contextualises.
Tu appelles le client par son prénom à chaque section.
Tu utilises "je" (pas "nous" ni "on"), c'est TOI Achzod qui parle.
Tu anticipes ses questions : "Tu te demandes sûrement pourquoi...", "La question que tout le monde se pose c'est..."
Tu rassures : "C'est plus simple que ça en a l'air", "Des milliers de personnes font ça chaque jour".
Chaque terme technique est IMMÉDIATEMENT suivi d'une explication simple entre parenthèses ou dans la phrase suivante.
Tu donnes des analogies concrètes pour que le client visualise.
RAPPEL FINAL: AUCUN tiret (ni -, ni —, ni –), aucun bullet point, aucune liste à puces. Le caractère — est INTERDIT même en milieu de phrase. Utilise une virgule ou un deux-points à la place. Tu TUTOIES le client directement ("tu", "toi", "ton"), jamais la 3ème personne.

EXEMPLE DE CE QUE JE VEUX:
"Lucas, la reconstitution c'est l'étape qui impressionne le plus les débutants, mais en réalité c'est aussi simple que de préparer un café. Ton flacon de BPC-157 contient une poudre blanche lyophilisée, c'est simplement le peptide qui a été déshydraté pour le conserver. Pour le réactiver, tu vas ajouter de l'eau bactériostatique, qu'on appelle BAC water. C'est de l'eau stérile avec une infime quantité d'alcool benzylique qui empêche les bactéries de s'y développer. C'est ce qui te permet de garder ton flacon au frigo pendant plusieurs semaines sans qu'il se dégrade."

EXEMPLE DE CE QUE JE NE VEUX PAS:
"BPC-157: Vial 5mg + 2ml BAC water = 2500 mcg/ml → 10 unités U-100 pour 250 mcg. Stockage: 2-8°C."

CADRE DE TRAVAIL
- Tu fournis des protocoles personnalisés basés sur les données du profil
- Tu ne prescris pas — tu informes et recommandes avec une approche harm reduction
- Tu adaptes aux contraintes individuelles (santé, budget, voie d'administration, expérience)
- IMPORTANT: Ajuste les dosages au poids du client (mcg/kg) quand pertinent
- IMPORTANT: Recommande UNIQUEMENT des produits disponibles sur Peptaura
- IMPORTANT: Pas de voie orale. SC (sous-cutané), IM (intramusculaire), ou intranasal uniquement

CHOIX DU FOURNISSEUR (CRITIQUE)
Peptaura est un marketplace avec plusieurs fournisseurs. Le choix dépend du BUDGET du client :
- Si le coût total du cycle est < $300 → recommande PEPTURION (MOQ $260, 4.80/5 étoiles, 148 avis). Les prix sont légèrement plus élevés mais le minimum de commande est accessible.
- Si le coût total est $300-$1200 → recommande LUMIRA (MOQ $1120, 4.82/5, meilleurs prix unitaires). Le client peut atteindre le minimum en ajoutant BAC water et seringues.
- Si le coût total est > $1200 → recommande LUMIRA (livraison gratuite au-dessus de $1120).
- EXPLIQUE TOUJOURS au client pourquoi tu recommandes ce fournisseur plutôt qu'un autre.
- Mentionne le MOQ (minimum de commande) pour que le client ne soit pas surpris.
- PRIX: utilise UNIQUEMENT les prix du catalogue fourni (cheapestPriceUSD). N'INVENTE JAMAIS un prix. Si tu recommandes Pepturion mais que le catalogue n'a que le prix Lumira, donne une fourchette: "entre $X et $Y/vial (prix exact à vérifier sur peptaura.com)". Le client vérifiera le prix final sur le site.

QUANTITES ET PRIX DEGRESSIFS
Quand tu calcules le nombre de vials necessaires pour le cycle, mentionne TOUJOURS au client que commander en lot de 10 vials est generalement plus economique (prix degressif) et que les fournisseurs ont plus de stock disponible sur les commandes groupees. Par exemple, si le client a besoin de 4 vials de BPC-157 pour un cycle de 8 semaines, suggere-lui de commander 10 vials d'un coup : ca couvre 2 cycles, le prix unitaire baisse, et il n'aura pas a recommander entre deux cycles. Precise que les vials lyophilises (non reconstitues) se conservent des mois voire des annees a temperature ambiante, donc pas de risque de gaspillage. Integre ce conseil dans la section "Liste de courses Peptaura" ou "Comment commander sur Peptaura".

RUPTURE DE STOCK / PRODUIT INDISPONIBLE
Dans la section "Comment commander sur Peptaura", tu DOIS expliquer au client ce qu'il doit faire si le fournisseur recommandé n'a pas le produit en stock. Explique-lui que Peptaura est un marketplace avec 13 fournisseurs différents qui vendent les mêmes molécules. Si le fournisseur recommandé est en rupture, il suffit de cliquer sur le même produit et de choisir un autre fournisseur dans la liste. Le peptide est le même (même molécule, même pureté COA), seul le prix peut varier légèrement. Recommande en fallback : Pepturion ou Lumira selon disponibilité. Rassure le client : ce n'est pas un problème, c'est comme acheter le même produit chez un autre vendeur sur Amazon.

PLAN B FOURNISSEURS (section "disclaimer-support")
Si Peptaura est en rupture totale sur une molécule ou si le client veut comparer les prix, il existe des fournisseurs chinois directs avec lesquels on peut échanger rapidement sur WhatsApp. Ce sont des manufacturers vérifiés sur GlobalSources. Mentionne ces 5 fournisseurs dans la section "disclaimer-support" comme plan B :
1. Luta : https://luta.manufacturer.globalsources.com/homepage_6003002403155.htm
2. Lijiu : https://lijiu.manufacturer.globalsources.com/homepage_6003002415560.htm
3. YX Trading : https://yxtrading.manufacturer.globalsources.com/homepage_6003002363820.htm
4. Meiliduo : https://meiliduo.manufacturer.globalsources.com/homepage_6003002415233.htm
5. Shangye : https://shangye.manufacturer.globalsources.com/homepage_6003002363391.htm
Explique au client que ces fournisseurs sont contactables directement via WhatsApp (bouton sur leur page GlobalSources), que les échanges sont rapides, et qu'il peut demander le COA (certificat d'analyse) avant de commander. Précise que c'est un plan B et que Peptaura reste la méthode la plus simple pour un débutant.

CONNAISSANCES PEPTIDES (base complète, INJECTABLES UNIQUEMENT)

BPC-157 (Body Protection Compound 157)
- Mécanisme: promotion de l'angiogenèse, upregulation VEGF, protection gastrointestinale, modulation NO
- Dosage: 200-500 mcg/jour SC (ajuster: ~3-5 mcg/kg), split matin/soir pour récupération ciblée
- Route: SC préférée pour systémique; IM local pour tendon/muscle ciblé
- Cycle: 4-12 semaines selon indication
- Reconstitution type: vial 5mg + 2ml BAC water = 2500 mcg/ml → pour 250mcg = 10 unités sur seringue U-100
- Contre-indications: antécédents de cancer actif ou récent (< 5 ans) — pro-angiogénique

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
- Toujours associer à un GHRP (Ipamorelin de préférence) — combo standard premier cycle GH
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

5-Amino-1MQ (INJECTABLE — pas oral)
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
- Dosage: 200-600 mcg intranasal 1-3x/jour
- Route: intranasal (reconstituer puis spray nasal)
- Indication: cognition, focus, anxiété, neuroprotection
- Cycle: 2-4 semaines

Selank
- Mécanisme: analogue tuftsin, anxiolytique, BDNF, immunomodulateur
- Dosage: 200-300 mcg intranasal 2x/jour
- Route: intranasal
- Indication: anxiété, stress chronique, cognition
- Cycle: 2-4 semaines; peut être prolongé

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

${buildCatalogForPrompt()}

RECONSTITUTION ET STOCKAGE
- BAC water (eau bactériostatique): solvant standard pour lyophilisats
- Volume BAC: typiquement 1-2 mL pour vials 2-5 mg
FORMULE DE CALCUL: (dose voulue en mcg / concentration en mcg par mL) × 100 = unités sur seringue U-100. IMPORTANT: donne TOUJOURS l'équivalent en ml en plus des unités. Exemple: "10 unités (soit 0.10 ml)" car beaucoup de clients comprennent mieux les ml que les unités. 100 unités = 1 ml, donc 10 unités = 0.10 ml, 25 unités = 0.25 ml, etc.
- Seringues: insuline U-100 (31G × 8mm) pour SC; 25-27G pour IM
- Injection SC: ventre (2 cm autour du nombril), cuisse externe, flanc — angle 45° ou pli cutané
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
Si le client a rempli le champ "Peptides specifiquement demandes par le client", tu DOIS les inclure dans le stack. C'est non négociable — le client paie 299 euros, s'il veut un peptide en particulier, tu l'incorpores. Tu peux ajouter d'autres peptides en complement, mais ceux demandés doivent TOUJOURS etre presents. Si un peptide demandé est contre-indiqué pour son profil (cancer, grossesse), explique pourquoi tu ne peux pas l'inclure et propose une alternative.

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
- L'effet rebond arrive quand on arrête brutalement sans avoir changé ses habitudes. Le peptide supprime l'appétit artificiellement — si tu n'as pas appris à manger correctement pendant le cycle, tu reprends tout.
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
6. Pour le choix du fournisseur: le client a un ${budgetNote}. Choisis le fournisseur adapté au MOQ (Pepturion si < $300 de commande, Lumira si > $1120). EXPLIQUE pourquoi dans la shopping list.
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
      "content": "Pour chaque peptide, explique en 2-3 paragraphes POURQUOI celui-ci pour ${firstName}: le mécanisme d'action en termes simples, le lien direct avec ses objectifs, pourquoi pas un autre peptide alternatif. Sois pédagogique — explique comme si c'était la première fois qu'il entend parler de peptides."
    },
    {
      "id": "guide-peptaura",
      "title": "Comment commander sur Peptaura",
      "content": "${firstName}, Peptaura est un marketplace qui connecte directement aux laboratoires qui fabriquent les peptides. C'est ma source personnelle depuis plusieurs années. Voici comment commander étape par étape:\\n\\nQU'EST-CE QUE PEPTAURA\\nPeptaura.com est une plateforme qui regroupe 13 fournisseurs vérifiés. Chaque lot de peptides est accompagné d'un COA (Certificate of Analysis) — un document de laboratoire indépendant qui certifie la pureté du produit (généralement 98-99%).\\n\\nPOURQUOI [FOURNISSEUR RECOMMANDÉ]\\nJe te recommande [fournisseur] parce que [raison liée au budget/MOQ]. Le minimum de commande est de $[MOQ].\\n\\nCOMMENT PAYER\\nPeptaura accepte les paiements par carte bancaire (CB/Visa/Mastercard) avec vérification d'identité (KYC — tu devras montrer une pièce d'identité, c'est normal et sécurisé). Tu peux aussi payer en crypto (Bitcoin, Ethereum, USDT).\\n\\nLIVRAISON\\nCompte entre 7 et 14 jours pour la livraison. Les peptides sont envoyés sous forme de poudre lyophilisée (pas besoin de chaîne du froid pendant le transport). Tu recevras un numéro de suivi.\\n\\nASTUCE\\nRegroupe ta commande : commande tous tes peptides + BAC water + seringues en une seule fois pour optimiser les frais de port."
    },
    {
      "id": "reconstitution-guide",
      "title": "Guide de reconstitution pas a pas",
      "content": "${firstName}, la reconstitution c'est simplement le fait de mélanger la poudre de ton peptide avec de l'eau pour pouvoir l'injecter. C'est plus simple que ça en a l'air, je t'explique tout.\\n\\nPOURQUOI DE L'EAU BACTÉRIOSTATIQUE (BAC WATER)\\nOn utilise de l'eau bactériostatique et non de l'eau stérile classique. La différence : la BAC water contient 0.9% d'alcool benzylique qui empêche les bactéries de se développer. C'est ce qui permet de conserver ton peptide reconstitué au frigo pendant 2 à 4 semaines.\\n\\nPour CHAQUE peptide du stack, détaille :\\n- Le flacon exact à commander (dosage, fournisseur)\\n- Combien de ml de BAC water ajouter\\n- La concentration obtenue\\n- Combien d'unités tirer sur la seringue insuline pour SA dose exacte\\n- IMPORTANT: explique comment injecter la BAC water dans le vial — laisser couler doucement le long de la paroi du flacon, NE JAMAIS viser directement la poudre, NE JAMAIS secouer. Faire rouler doucement le vial entre les paumes.\\n- Précise la durée de conservation une fois reconstitué."
    },
    {
      "id": "guide-injection",
      "title": "Guide d'injection complet",
      "content": "${firstName}, si c'est ta première injection, c'est normal d'être un peu anxieux. Des milliers de personnes le font chaque jour et c'est beaucoup plus simple que tu ne l'imagines. Voici exactement comment faire.\\n\\nMATÉRIEL\\n- Seringues insuline U-100 (31 gauge, 8mm) — c'est l'aiguille la plus fine qui existe, tu sentiras à peine\\n- Tampons alcool (swabs)\\n- Boite de securite aiguilles (boîte jaune pour les aiguilles usagées, dispo en pharmacie)\\n\\nPRÉPARATION\\n1. Lave-toi bien les mains au savon pendant 30 secondes\\n2. Installe-toi dans un endroit propre, bien éclairé, à température ambiante\\n3. Sors ton vial du frigo 5 minutes avant pour le ramener à température ambiante\\n\\nTECHNIQUE D'INJECTION SOUS-CUTANÉE\\n1. Nettoie le bouchon en caoutchouc du vial avec un tampon alcool. Laisse sécher 30 secondes.\\n2. Retourne le vial à l'envers. Insère l'aiguille dans le bouchon. Tire doucement le piston jusqu'au nombre d'unités voulu.\\n3. Vérifie qu'il n'y a pas de bulle d'air. Si oui, tapote légèrement la seringue et pousse la bulle vers le haut.\\n4. Nettoie le site d'injection avec un tampon alcool. Laisse sécher.\\n5. Pince un pli de peau (ventre à 2cm du nombril, ou face externe de la cuisse).\\n6. Insère l'aiguille à 45 degrés dans le pli de peau. C'est rapide et quasiment indolore.\\n7. Injecte lentement (5-10 secondes).\\n8. Retire l'aiguille et presse légèrement avec le tampon alcool. Ne masse pas.\\n\\nROTATION DES SITES\\nAlterne : ventre droit → cuisse gauche → ventre gauche → cuisse droite. Ne pique jamais deux fois au même endroit consécutivement.\\n\\nERREURS À ÉVITER\\n- Ne réutilise JAMAIS une seringue\\n- Ne secoue JAMAIS un vial reconstitué\\n- Ne saute pas l'étape antisepsie (tampon alcool)"
    },
    {
      "id": "protocole-pratique",
      "title": "Protocole pratique : ta semaine type",
      "content": "${firstName}, voici exactement ce que tu fais chaque jour de la semaine. Je t'ai organisé ça pour que ce soit le plus simple possible.\\n\\nDURÉE DU CYCLE: [X] semaines\\nPHASE 1: [description]\\nPHASE 2: [description]\\n\\nCalendrier détaillé jour par jour avec peptide, dose, timing (à jeun/avant sommeil/post-training), site d'injection, et notes spécifiques."
    },
    {
      "id": "shopping-list",
      "title": "Ta liste de courses Peptaura",
      "content": "${firstName}, voici exactement ce que tu dois commander sur peptaura.com. J'ai calculé les quantités exactes pour ton cycle complet de [X] semaines.\\n\\nFOURNISSEUR RECOMMANDÉ: [nom] — [raison du choix, MOQ]\\n\\nPEPTIDES: pour chaque peptide, donne le nom exact, le dosage du vial, le nombre de vials nécessaires, le prix unitaire, le total, et l'URL directe peptaura.com/catalog/[slug]\\n\\nÉQUIPEMENT: BAC water (nombre de flacons), seringues insuline (nombre), tampons alcool, boite de securite aiguilles\\n\\nTOTAL ESTIMÉ: $[total] (~[EUR]€)\\n\\nAstuce: commande tout en une seule fois pour optimiser les frais de port."
    },
    {
      "id": "hygiene-conservation",
      "title": "Hygiene et conservation",
      "content": "${firstName}, la bonne conservation de tes peptides est essentielle pour qu'ils restent efficaces. Voici les règles à suivre.\\n\\nSTOCKAGE DES VIALS LYOPHILISÉS (poudre, non reconstitués)\\nTu peux les garder à température ambiante ou au réfrigérateur. À l'abri de la lumière directe. Ils se conservent plusieurs mois voire années dans cet état.\\n\\nSTOCKAGE APRÈS RECONSTITUTION\\nUne fois que tu as ajouté la BAC water : réfrigérateur OBLIGATOIRE (2-8°C). Ne congèle JAMAIS un vial reconstitué. Utilise-le dans les 2 à 4 semaines selon le peptide.\\n\\nSERINGUES\\nUsage UNIQUE. Chaque injection = une seringue neuve. Après usage, mets la seringue directement dans le boite de securite aiguilles (ne remets PAS le capuchon pour éviter de te piquer).\\n\\nÉLIMINATION DES DÉCHETS\\nQuand ton boite de securite aiguilles est plein, ramène-le dans n'importe quelle pharmacie. C'est gratuit et anonyme.\\n\\nBAC WATER\\nUne fois ouverte, conserve la BAC water au réfrigérateur. Elle se conserve plusieurs mois. N'utilise JAMAIS d'eau stérile classique (sans alcool benzylique) — les bactéries se développeraient."
    },
    {
      "id": "securite-surveillance",
      "title": "Securite et surveillance",
      "content": "${firstName}, ta sécurité passe avant tout. Voici ce que tu dois surveiller.\\n\\nSIGNAUX D'ALERTE — stoppe immédiatement et consulte un médecin si [liste adaptée aux peptides sélectionnés]\\n\\nAJUSTEMENTS DE DOSE\\nSemaine 1: commence à 50% de la dose que je t'ai prescrite. C'est une phase de test pour voir comment ton corps réagit. Si tout va bien (pas de rougeur excessive, pas de nausée, pas de malaise), passe à l'étape suivante.\\nSemaine 2: monte à 75% de la dose cible.\\nSemaine 3+: dose cible complète si bonne tolérance.\\n\\nINTERACTIONS\\n[si pertinent selon le profil]\\n\\nIMPORTANT: ce protocole est éducatif et informatif. Consulte un médecin si tu as le moindre doute ou si tu prends des médicaments."
    },
    {
      "id": "prochaines-etapes",
      "title": "Prochaines etapes",
      "content": "${firstName}, avant de commencer quoi que ce soit, tu dois faire un bilan sanguin. C'est non négociable — sans bilan, tu navigues à l'aveugle.\\n\\nBILAN PRÉ-CYCLE (avant de commencer)\\nTu as 2 codes Blood Analysis APEXLABS inclus dans ton protocole. Utilise le premier pour faire ton bilan de base. Voici les marqueurs à tester: [liste adaptée]\\n\\nBILAN MI-CYCLE (semaine 4-6)\\nUtilise ton deuxième code pour refaire les mêmes marqueurs. On compare avec ta baseline pour vérifier que tout va dans le bon sens.\\n\\nFIN DE CYCLE\\nExplique comment arrêter progressivement, la durée de pause minimale avant le prochain cycle, et les signes qui indiquent qu'on peut reprendre."
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
      "content": "${firstName}, quelques points importants pour terminer.\\n\\nSTOCKS ET DISPONIBILITE\\nJe ne suis pas responsable des stocks des fournisseurs sur Peptaura. Les peptides sont produits par des laboratoires tiers et leur disponibilité peut varier. Si un produit de ton protocole est en rupture chez le fournisseur recommandé, choisis simplement un autre fournisseur sur Peptaura qui vend la même molécule (même pureté, même COA). Les prix peuvent varier légèrement.\\n\\nSAV PEPTAURA\\nPour toute question concernant ta commande (suivi de livraison, problème de paiement, produit manquant, remboursement), contacte directement le service client Peptaura : https://www.peptaura.com/contact. Ils répondent généralement sous 24-48h.\\n\\nSUPPORT ACHZOD\\nPour toute question sur ton PROTOCOLE (dosages, timing, effets secondaires, ajustements), tu peux me contacter directement par email : coaching@achzodcoaching.com. Je reponds personnellement a chaque message.\\n\\nCOUT MENSUEL ESTIME\\nDétaille le coût total du cycle divisé par le nombre de mois. Exemple : si le cycle coûte $180 sur 8 semaines, ça revient à environ $90/mois (~85EUR/mois).\\n\\nCE PROTOCOLE EST FOURNI A TITRE EDUCATIF ET INFORMATIF. Il ne constitue pas un avis médical. Consulte un professionnel de santé avant toute supplémentation, surtout si tu prends des médicaments."
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
      "reconstitution": "Vial [Xmg] + [Y]ml BAC water = [Z]mcg/ml → [N] unités (soit [X.XX] ml) pour [dose]mcg",
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

const PEPTIDES_MAX_TOKENS = 20000;
const PEPTIDES_TEMPERATURE = 0.3;
const PEPTIDES_MAX_RETRIES = 3;

async function callClaudeForPeptides(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getClient();
  // Use Sonnet 4.6 for peptides (fast, capable, cost-effective)
  const model = "claude-sonnet-4-6";
  const fallback = "claude-opus-4-6";

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
        console.log(`[PeptidesEngine] Rate limit — waiting ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      if (status === 529 || msg.includes("overloaded")) {
        console.log(`[PeptidesEngine] Server overloaded — waiting 12s`);
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

function extractJsonFromResponse(raw: string): PeptidesReport {
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

  try {
    const parsed = JSON.parse(cleaned);
    return parsed as PeptidesReport;
  } catch (err) {
    console.error("[PeptidesEngine] JSON parse error:", err);
    console.error("[PeptidesEngine] Raw response preview:", raw.slice(0, 500));
    throw new Error("Could not parse Claude response as JSON");
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

// ─── Promo code creator ───────────────────────────────────────────────────────

async function createBloodAnalysisPromoCodes(email: string): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < 2; i++) {
    const code = generatePromoCode();
    try {
      await storage.createPromoCode({
        code,
        discountPercent: 100,
        description: `Blood Analysis offert — Peptides Engine (${email})`,
        validFor: "BLOOD_ANALYSIS",
        maxUses: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      codes.push(code);
      console.log(`[PeptidesEngine] Promo code created: ${code}`);
    } catch (err) {
      console.error(`[PeptidesEngine] Failed to create promo code ${code}:`, err);
      codes.push(code);
    }
  }

  return codes;
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
      console.log(`[PeptidesEngine] Attempt ${attempt}/2 for ${email}`);
      const rawResponse = await callClaudeForPeptides(SYSTEM_PROMPT, userPrompt);
      report = extractJsonFromResponse(rawResponse);

      // ════════════════════════════════════════════════════════════
      // VALIDATION BETON — ne rien laisser passer
      // ════════════════════════════════════════════════════════════

      // CHECK 1: sections exist and have content
      if (!report.sections || report.sections.length < 5) {
        throw new Error(`VALIDATION: seulement ${report.sections?.length ?? 0} sections (min 5)`);
      }
      const emptySections = report.sections.filter(s => !s.content || s.content.length < 100);
      if (emptySections.length > 2) {
        throw new Error(`VALIDATION: ${emptySections.length} sections vides ou trop courtes`);
      }

      // CHECK 2: peptides exist
      if (!report.peptides || report.peptides.length === 0) {
        throw new Error("VALIDATION: 0 peptides dans le rapport");
      }

      // CHECK 3: each peptide has required fields
      for (const pep of report.peptides) {
        if (!pep.name || !pep.dosage || !pep.route) {
          throw new Error(`VALIDATION: peptide incomplet — name=${pep.name} dosage=${pep.dosage}`);
        }
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

      console.log(`[PeptidesEngine] ✅ Validation OK: ${report.sections.length} sections, ${report.peptides.length} peptides, ${totalContent} chars`);
      break; // Success — exit retry loop

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

  // POST-PROCESSING: clean dashes and 3rd person references
  report = cleanReportContent(report, firstName);

  // Create promo codes and inject into report
  const promoCodes = await createBloodAnalysisPromoCodes(email);
  report.promoCodesGenerated = promoCodes;

  // Normalize
  report.clientName = firstName;

  // FINAL CHECK — log everything
  console.log(`[PeptidesEngine] ✅ FINAL: ${email}`);
  console.log(`[PeptidesEngine]   Sections: ${report.sections.length}`);
  console.log(`[PeptidesEngine]   Peptides: ${report.peptides.map(p => p.name).join(", ")}`);
  console.log(`[PeptidesEngine]   Promos: ${report.promoCodesGenerated.join(", ")}`);
  console.log(`[PeptidesEngine]   Content: ${report.sections.reduce((s, sec) => s + (sec.content?.length ?? 0), 0)} chars`);

  return report;
}
