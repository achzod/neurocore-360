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

  lines.push("\nEquipement: BAC water ($2/vial sur Peptaura), seringues insuline U-100 31G, tampons alcool, container sharps.");
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

const SYSTEM_PROMPT = `Tu es un expert en peptides thérapeutiques avec 15 ans d'expérience clinique et de terrain. Tu combines rigueur scientifique, harm reduction et pragmatisme. Tu t'exprimes en français, de façon directe et sans paternalisme.

CADRE DE TRAVAIL
- Tu fournis des protocoles personnalisés basés sur les données du profil
- Tu ne prescris pas — tu informes et tu recommandes avec une approche harm reduction
- Tu adaptes toujours les protocoles aux contraintes individuelles (santé, budget, voie d'administration, expérience)
- Tu cites des fenêtres de dosage basées sur la littérature disponible et les pratiques documentées
- IMPORTANT: Tu dois AJUSTER les dosages au poids du client (mcg/kg) quand c'est pertinent
- IMPORTANT: Tu recommandes UNIQUEMENT des produits disponibles sur Peptaura (voir catalogue ci-dessous)
- IMPORTANT: Pas de voie orale. Tous les protocoles sont SC (sous-cutané), IM (intramusculaire), ou intranasal

CONNAISSANCES PEPTIDES (base complète — INJECTABLES UNIQUEMENT)

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
- FORMULE DE CALCUL: (dose voulue en mcg / concentration en mcg par mL) × 100 = unités sur seringue U-100
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

  return `Génère un protocole peptides personnalisé pour ce profil.

DONNÉES PROFIL (${firstName}, ${weight} kg):
${summary}

INSTRUCTIONS CRITIQUES:
1. Analyse les objectifs, contraintes de santé, budget, expérience et stack actuel
2. Applique les règles de sécurité strictes
3. AJUSTE les dosages au poids du client (${weight} kg) — utilise mcg/kg quand pertinent
4. Sélectionne 2 à 5 peptides adaptés au profil
5. Pour chaque peptide, utilise UNIQUEMENT des produits du catalogue Peptaura fourni — donne l'URL réelle peptaura.com/catalog/{slug}
6. Pour chaque peptide, CALCULE la reconstitution exacte:
   - Dosage vial recommandé (5mg, 10mg, etc. — choisis parmi les dosages dispo sur Peptaura)
   - Volume BAC water à ajouter
   - Concentration résultante (mcg/ml)
   - Nombre d'unités à tirer sur seringue insuline U-100 pour la dose du client
   - Nombre de vials nécessaires pour le cycle complet
   - Coût total estimé en USD (nombre de vials × prix unitaire le plus bas)
7. Génère un CALENDRIER HEBDOMADAIRE complet (Lundi à Dimanche, AM/PM)
8. Génère une LISTE DE COURSES Peptaura complète (peptides + BAC water + seringues)
9. Pour chaque peptide, explique POURQUOI celui-ci spécifiquement pour CE profil
10. Les sections narratives en français, directes, sans jargon inutile
11. Les bloodMarkers doivent être les marqueurs à surveiller pendant le protocole

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans texte avant ou après):

{
  "clientName": "${firstName}",
  "tier": "standard",
  "sections": [
    {
      "id": "profil-synthese",
      "title": "Synthèse de ton profil",
      "content": "Analyse personnalisée: qui tu es, tes objectifs, tes forces et contraintes..."
    },
    {
      "id": "rationale",
      "title": "Pourquoi ces peptides pour toi",
      "content": "Pour chaque peptide sélectionné, explique le POURQUOI détaillé: mécanisme d'action, lien avec les objectifs du client, pourquoi pas un autre peptide..."
    },
    {
      "id": "reconstitution-guide",
      "title": "Guide de reconstitution complet",
      "content": "Pour CHAQUE peptide du stack:\\n\\n[NOM DU PEPTIDE]\\nTon flacon: [dosage] de [fournisseur] sur Peptaura\\nAjoute [X] ml d'eau bactériostatique (BAC water)\\nConcentration: [Y] mcg/ml\\nTa dose: [Z] mcg = [N] unités sur ta seringue insuline U-100\\nStockage: réfrigérateur 2-8°C, utiliser dans les [X] semaines\\n\\nGUIDE D'INJECTION SC:\\n1. Lave-toi les mains\\n2. Swab alcool sur le rubber du vial + site d'injection\\n3. Aspire [N] unités sur la seringue\\n4. Pince un pli de peau (ventre 2cm du nombril, ou cuisse externe)\\n5. Insère l'aiguille à 45°\\n6. Injecte lentement\\n7. Retire et presse légèrement\\n8. Alterne les sites (droite/gauche, ventre/cuisse)"
    },
    {
      "id": "protocole-pratique",
      "title": "Protocole pratique — Semaine type",
      "content": "CALENDRIER HEBDOMADAIRE DÉTAILLÉ:\\n\\nLUNDI\\n• AM (à jeun, 30 min avant petit-déj): [peptide] [dose] SC [site]\\n• PM (avant sommeil): [peptide] [dose] SC [site]\\n\\nMARDI\\n[...]\\n\\nRépéter pour chaque jour de la semaine avec rotations de sites."
    },
    {
      "id": "shopping-list",
      "title": "Liste de courses Peptaura",
      "content": "PEPTIDES:\\n• [Nom] [dosage] × [nombre de vials] — [fournisseur] — $[prix]/vial — Total: $[total] — URL: peptaura.com/catalog/[slug]\\n\\nÉQUIPEMENT:\\n• BAC water (eau bactériostatique) × [nombre de flacons]\\n• Seringues insuline U-100 31G × [nombre]\\n• Tampons alcool × [nombre]\\n• Container sharps\\n\\nTOTAL ESTIMÉ: $[total] (~[total en EUR]€)"
    },
    {
      "id": "securite-surveillance",
      "title": "Sécurité et surveillance",
      "content": "SIGNAUX D'ALERTE (stopper immédiatement si):\\n- [liste]\\n\\nAJUSTEMENTS DE DOSE:\\n- Semaine 1: commencer à 50% de la dose cible pour évaluer tolérance\\n- Semaine 2: monter à 75%\\n- Semaine 3+: dose cible si bonne tolérance\\n\\nINTERACTIONS:\\n- [liste si pertinent]"
    },
    {
      "id": "prochaines-etapes",
      "title": "Prochaines étapes",
      "content": "BILAN SANGUIN PRE-CYCLE (obligatoire):\\n- Liste des marqueurs à tester AVANT de commencer\\n- Où faire le bilan (utilise tes 2 codes Blood Analysis APEXLABS inclus)\\n\\nBILAN MI-CYCLE (semaine 4-6):\\n- Même marqueurs pour comparer\\n\\nFIN DE CYCLE:\\n- Protocole d'arrêt progressif\\n- Quand recommencer (pause minimum)"
    }
  ],
  "peptides": [
    {
      "name": "Nom du peptide",
      "purpose": "Objectif spécifique pour CE profil",
      "whyThisPeptide": "Explication détaillée: pourquoi ce peptide et pas un autre pour ce client",
      "dosage": "X mcg/jour (X mcg/kg pour ${weight}kg)",
      "timing": "Horaire précis et conditions (à jeun, avant sommeil, post-training...)",
      "route": "SC / IM / Intranasal",
      "cycleDuration": "X semaines, pause Y semaines",
      "reconstitution": "Vial [Xmg] + [Y]ml BAC water = [Z]mcg/ml → [N] unités U-100 pour [dose]mcg",
      "vialsNeeded": "X vials pour le cycle complet de Y semaines",
      "purchaseUrl": "https://www.peptaura.com/catalog/[SLUG_EXACT]",
      "priceEstimate": "~$XX/vial × Y vials = $ZZ total (~€WW)"
    }
  ],
  "bloodMarkers": [
    "IGF-1",
    "Glycémie à jeun",
    "HbA1c",
    "... autres marqueurs pertinents"
  ],
  "weeklySchedule": "Tableau récapitulatif semaine type: LUNDI AM: ..., PM: ... | MARDI AM: ..., PM: ... | etc.",
  "shoppingList": "Liste récap: [peptide] × [qty] = $[prix] | [peptide] × [qty] = $[prix] | BAC water × [qty] | Seringues × [qty] | TOTAL: ~$XXX",
  "promoCodesGenerated": []
}`;
}

// ─── Claude call with retry ───────────────────────────────────────────────────

const PEPTIDES_MAX_TOKENS = 8000;
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

  // Generate protocol
  const rawResponse = await callClaudeForPeptides(SYSTEM_PROMPT, userPrompt);
  let report = extractJsonFromResponse(rawResponse);

  // Validate and fix Peptaura URLs (never trust Claude's URLs)
  report = validateAndFixPeptauraUrls(report);

  // Create promo codes and inject into report
  const promoCodes = await createBloodAnalysisPromoCodes(email);
  report.promoCodesGenerated = promoCodes;

  // Normalize
  report.clientName = firstName;

  console.log(
    `[PeptidesEngine] Done for ${email} — ${report.peptides?.length ?? 0} peptides, ${report.sections?.length ?? 0} sections`
  );

  return report;
}
