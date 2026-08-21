/**
 * APEXLABS - Peptides Engine v2
 * Generates personalized peptide protocols via GPT-5.6 Sol.
 * Synced with real Peptaura marketplace catalog.
 */

import { OPENAI_REPORT_MODEL, runOpenAIText } from "./openaiResponses";
import {
  validatePeptidesReport,
  estimateNeedMg,
  extractTotalMgFromVials,
  extractVialQty,
  extractVialMg,
  findOperationalPeptidesMissingFromArray,
  calculateBacWaterNeedMl,
} from "./peptidesReportValidator";
import { storage } from "./storage";
import {
  collectClientFacingStrings,
  sanitizeClientFacingText,
} from "./clientFacingQuality";
import {
  hasPeptidesHardRedFlag,
  pruneUnintegratedBonusPeptides,
  repairPeptidesReportContent,
} from "./peptidesReportRepair";
import {
  assertPeptauraGenerationPreflight,
  PeptauraSourceUnavailableError,
} from "./peptidesSourcePreflight";
import {
  buildConditionalReconstitutionText,
  buildPurchasePlan,
  effectivePackagePrice,
  offerTotalPrice,
  packageCountForVials,
  parseListingMg,
  selectBestPurchasePlan,
  type PeptidePurchasePlan,
} from "./peptidesPurchasePlan";
import {
  PEPTAURA_PRODUCT_FEED_URL,
  parsePeptauraProductFeed,
} from "./peptauraProductFeed";
export {
  evaluatePeptauraGenerationPreflight,
  PeptauraSourceUnavailableError,
} from "./peptidesSourcePreflight";
import {
  formatOperationalVials,
  formatOperationalVialPolicySummary,
  parseDocumentedStabilityConfig,
  planOperationalVials,
} from "./peptidesVialPlanning";

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
  _vialPlanning?: ReturnType<typeof planOperationalVials>;
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
  qualityVersion?: "expert-standard-v1" | "medical-review-v1";
  _generationMeta?: {
    provider: "openai";
    model: string;
    reasoningEffort?: string;
    reasoningMode?: string;
    generatedAt: string;
  };
  _validationContext?: {
    confirmedLowTestosterone: boolean;
    consentAccepted?: boolean;
    profile?: {
      weightKg?: number;
      primaryGoal?: string;
      secondaryGoals?: string[];
      country?: string;
      budget?: string;
      timeline?: string;
      experience?: string;
      injectionComfort?: string;
    };
  };
  _enclomipheneSourceSync?: {
    url: string;
    fetchedAt: string;
    available: boolean;
    format: string;
    priceGbp: number;
  };
}

export const PEPTIDES_PRIMARY_MODEL = OPENAI_REPORT_MODEL;
const configuredPeptidesOutputTokens = Number(
  process.env.PEPTIDES_OPENAI_MAX_OUTPUT_TOKENS || 32_000
);
export const PEPTIDES_MAX_OUTPUT_TOKENS = Number.isFinite(configuredPeptidesOutputTokens)
  ? Math.min(40_000, Math.max(28_000, configuredPeptidesOutputTokens))
  : 32_000;
export const ENCLOMIPHENE_SOURCE_URL = "https://receptorchem.co.uk/enclomiphene-citrate/";
export const PEPTIDES_REASONING = Object.freeze({
  effort: "xhigh",
  mode: "pro",
});

// ─── Peptaura fallback catalog ───────────────────────────────────────────────
// Static fallback only. Runtime generation refreshes the live sitemap, country
// shipping page and final product pages before saving a report.
// All prices in USD. Most products are lyophilized vials unless noted.

export interface PeptaurProduct {
  name: string;
  slug: string; // URL: peptaura.com/catalog/{slug}
  dosages: string[]; // e.g. ["5mg", "10mg"]
  priceRangeUSD: string; // e.g. "$9.65 - $266"
  cheapestSupplier: string;
  cheapestPriceUSD: number; // lowest single vial
  supplierCount: number;
  formFactor: "vial" | "cartridge" | "nasal spray";
  category: "recovery" | "gh-secretagogue" | "fat-loss" | "sleep" | "cognitive" | "libido" | "skin" | "longevity" | "endurance" | "glp1" | "blend" | "supplies" | "hpg-axis" | "anabolic" | "other";
}

export const PEPTAURA_CATALOG: PeptaurProduct[] = [
// RECOVERY & HEALING
  { name: "Ara-290", slug: "Ara-290", dosages: ["10mg", "16mg"], priceRangeUSD: "$21.01 - $107.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 21.01, supplierCount: 3, formFactor: "vial", category: "recovery" },
  { name: "BPC-157", slug: "BPC-157", dosages: ["5mg", "10mg"], priceRangeUSD: "$14.48 - $134.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 5, formFactor: "vial", category: "recovery" },
  { name: "Cerebroprotein hydrolysate", slug: "Cerebroprotein hydrolysate", dosages: ["60mg"], priceRangeUSD: "$22.65 - $116.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 22.65, supplierCount: 1, formFactor: "vial", category: "recovery" },
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
  { name: "Melanotan II", slug: "Melanotan-2", dosages: ["10mg"], priceRangeUSD: "$16.10 - $82.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.1, supplierCount: 4, formFactor: "vial", category: "libido" },
  { name: "PT-141", slug: "PT-141", dosages: ["10mg"], priceRangeUSD: "$21.57 - $112", cheapestSupplier: "Lumira", cheapestPriceUSD: 21.57, supplierCount: 5, formFactor: "vial", category: "libido" },

  // SKIN, HAIR & ANTI-AGING
  { name: "AHK-Cu", slug: "AHK-Cu", dosages: ["20mg", "50mg", "100mg"], priceRangeUSD: "$11.47 - $119.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.47, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "GHK", slug: "GHK", dosages: ["50mg"], priceRangeUSD: "$76.70 - $76.70", cheapestSupplier: "HelixBridge", cheapestPriceUSD: 7.67, supplierCount: 1, formFactor: "vial", category: "skin" },
  { name: "GHK-Cu", slug: "GHK-Cu", dosages: ["50mg", "100mg"], priceRangeUSD: "$11.47 - $100.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 11.47, supplierCount: 6, formFactor: "vial", category: "skin" },
  { name: "Hyaluronic Acid", slug: "Hyaluronic Acid", dosages: ["5mg"], priceRangeUSD: "$97.50 - $228.80", cheapestSupplier: "Retalux", cheapestPriceUSD: 9.75, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "Melanotan I", slug: "Melanotan-1", dosages: ["10mg"], priceRangeUSD: "$16.11 - $89.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.11, supplierCount: 3, formFactor: "vial", category: "skin" },
  { name: "Snap-8", slug: "Snap-8", dosages: ["10mg", "100mg"], priceRangeUSD: "$14.48 - $372.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 5, formFactor: "vial", category: "skin" },

  // LONGEVITY & MITOCHONDRIA
  { name: "Cartalax", slug: "Cartalax", dosages: ["10mg", "20mg"], priceRangeUSD: "$25.41 - $208", cheapestSupplier: "Lumira", cheapestPriceUSD: 25.41, supplierCount: 2, formFactor: "vial", category: "longevity" },
  { name: "Epitalon", slug: "Epitalon", dosages: ["10mg", "50mg"], priceRangeUSD: "$14.48 - $273", cheapestSupplier: "Lumira", cheapestPriceUSD: 14.48, supplierCount: 6, formFactor: "vial", category: "longevity" },
  { name: "FOX04", slug: "FOX04", dosages: ["10mg"], priceRangeUSD: "$94.46 - $484.40", cheapestSupplier: "Lumira", cheapestPriceUSD: 94.46, supplierCount: 2, formFactor: "vial", category: "longevity" },
  { name: "FOX04-DRI", slug: "FOX04-DRI", dosages: ["10mg"], priceRangeUSD: "$123.76 - $952", cheapestSupplier: "Lumira", cheapestPriceUSD: 123.76, supplierCount: 1, formFactor: "vial", category: "longevity" },
  { name: "Glutathione", slug: "Glutathione", dosages: ["600mg", "1500mg"], priceRangeUSD: "$10.64 - $128.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 10.64, supplierCount: 3, formFactor: "vial", category: "longevity" },
  { name: "MOTS-c", slug: "MOTS-c", dosages: ["10mg", "20mg", "40mg"], priceRangeUSD: "$23.76 - $336", cheapestSupplier: "Lumira", cheapestPriceUSD: 23.76, supplierCount: 4, formFactor: "vial", category: "longevity" },
  { name: "NAD+", slug: "NAD+", dosages: ["100mg", "500mg", "1000mg"], priceRangeUSD: "$24.85 - $282", cheapestSupplier: "Lumira", cheapestPriceUSD: 24.85, supplierCount: 4, formFactor: "vial", category: "longevity" },
  { name: "NAD+ (buffered)", slug: "NAD+ (buffered)", dosages: ["500mg", "1000mg"], priceRangeUSD: "$15.01 - $133", cheapestSupplier: "Lumira", cheapestPriceUSD: 15.01, supplierCount: 1, formFactor: "vial", category: "longevity" },

  // ENDURANCE
  { name: "SLU-PP-332", slug: "SLU-PP-332", dosages: ["5mg"], priceRangeUSD: "$156 - $167.70", cheapestSupplier: "Retalux", cheapestPriceUSD: 15.6, supplierCount: 2, formFactor: "vial", category: "endurance" },
  { name: "SS-31 (Elamipretide)", slug: "SS-31", dosages: ["5mg", "10mg", "50mg"], priceRangeUSD: "$16.80 - $646.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 16.8, supplierCount: 5, formFactor: "vial", category: "endurance" },

  // BLENDS & PROPRIETARY
  { name: "BPC-157 + TB-500 Blend", slug: "BPC-157+TB500", dosages: ["10mg", "20mg", "30mg"], priceRangeUSD: "$34.40 - $530.60", cheapestSupplier: "Lumira", cheapestPriceUSD: 34.4, supplierCount: 5, formFactor: "vial", category: "blend" },
  { name: "CJC-1295 + Ipamorelin Blend", slug: "CJC-1295 (no DAC) + Ipamorelin", dosages: ["10mg"], priceRangeUSD: "$34.94 - $179.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 34.94, supplierCount: 4, formFactor: "vial", category: "blend" },
  { name: "GLOW (blend)", slug: "GLOW", dosages: ["70mg"], priceRangeUSD: "$67.70 - $347.20", cheapestSupplier: "Lumira", cheapestPriceUSD: 67.7, supplierCount: 4, formFactor: "vial", category: "blend" },
  { name: "KLOW (blend)", slug: "KLOW", dosages: ["80mg"], priceRangeUSD: "$81.09 - $436.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 81.09, supplierCount: 5, formFactor: "vial", category: "blend" },

  // SUPPLIES & EQUIPMENT
  { name: "Acetic Acid", slug: "Acetic Acid", dosages: ["3ml", "10ml"], priceRangeUSD: "$5.18 - $30.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 5.18, supplierCount: 2, formFactor: "vial", category: "supplies" },
  { name: "BAC Water", slug: "BAC Water", dosages: ["3ml", "5ml", "10ml"], priceRangeUSD: "$3.01 - $23.80", cheapestSupplier: "Lumira", cheapestPriceUSD: 3.01, supplierCount: 2, formFactor: "vial", category: "supplies" },

  // OTHER
  { name: "B12", slug: "B12", dosages: ["10mg/ml"], priceRangeUSD: "$117 - $130", cheapestSupplier: "Hang Sciences", cheapestPriceUSD: 11.7, supplierCount: 2, formFactor: "vial", category: "other" },
];
// Static fallback count differs from the live sitemap. The live sitemap wins.

const PEPTAURA_LIVE_ONLY_PRODUCTS: PeptaurProduct[] = [
  { name: "Dihexa", slug: "Dihexa", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "cognitive" },
  { name: "Eloralintide", slug: "Eloralintide", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "glp1" },
  { name: "GDF-8", slug: "GDF-8", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "anabolic" },
  { name: "KP1", slug: "KP1", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "recovery" },
  { name: "PBS Water", slug: "PBS Water", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "supplies" },
  { name: "PNC-27", slug: "PNC-27", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "other" },
  { name: "Testagen", slug: "Testagen", dosages: [], priceRangeUSD: "live", cheapestSupplier: "live", cheapestPriceUSD: 0, supplierCount: 0, formFactor: "vial", category: "hpg-axis" },
];

function normalizePeptauraKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+]+/g, "");
}

function getPeptauraCatalogProducts(): PeptaurProduct[] {
  const seen = new Set<string>();
  const products: PeptaurProduct[] = [];
  for (const product of [...PEPTAURA_CATALOG, ...PEPTAURA_LIVE_ONLY_PRODUCTS]) {
    const key = normalizePeptauraKey(product.slug);
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(product);
  }
  return products;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface PeptauraShippingAvailability {
  country: string;
  shippingUrl: string;
  availableVendors: string[];
  blockedVendors: string[];
  fetchedAt: string;
  live: boolean;
}

interface PeptauraPromptContext {
  country: string;
  shippingUrl: string;
  shippingAvailability: PeptauraShippingAvailability;
  liveCatalogSlugs: string[] | null;
  catalogRefreshedAt: string;
  catalogSnapshots: PeptauraLiveProductSnapshot[];
  enclomipheneSource: EnclomipheneSourceSnapshot | null;
  promptBlock: string;
}

export interface EnclomipheneSourceSnapshot {
  url: string;
  fetchedAt: string;
  available: boolean;
  format: string;
  priceGbp: number;
}

interface PeptauraPriceTier {
  price: number;
  minQty: number;
}

interface PeptauraLiveListing {
  id: number;
  name: string;
  dosage: string;
  supplier: string;
  supplierDisplayName: string;
  outOfStock: boolean;
  form: string;
  priceTiers: PeptauraPriceTier[];
  warehouse: string;
  shippingOptionCount: number;
  orderingMode: string;
  enabled: boolean;
  suspended: boolean;
  boxSize: number;
  marginRate: number;
  productUrl?: string;
}

interface PeptauraLiveProductSnapshot {
  slug: string;
  url: string;
  listings: PeptauraLiveListing[];
  fetchedAt: string;
  live: boolean;
  source?: "catalog_page" | "product_feed";
  sourceGeneratedAt?: string;
}

const PEPTAURA_CACHE_TTL_MS = Number(process.env.PEPTAURA_CACHE_TTL_MS || 15 * 60 * 1000);
const PEPTAURA_CATALOG_MAX_AGE_MS = Number(process.env.PEPTAURA_CATALOG_MAX_AGE_MS || 20 * 60 * 1000);
const PEPTAURA_CRAWL_INTERVAL_MS = Number(process.env.PEPTAURA_CRAWL_INTERVAL_MS || 15 * 60 * 1000);
const PEPTAURA_CRAWL_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.PEPTAURA_CRAWL_CONCURRENCY || 4)));
const PEPTAURA_FETCH_TIMEOUT_MS = Number(process.env.PEPTAURA_FETCH_TIMEOUT_MS || 8000);
let peptauraSitemapCache: CacheEntry<string[] | null> | null = null;
let peptauraProductFeedCache: CacheEntry<PeptauraLiveProductSnapshot[] | null> | null = null;
const peptauraShippingCache = new Map<string, CacheEntry<PeptauraShippingAvailability>>();
const peptauraProductCache = new Map<string, CacheEntry<PeptauraLiveProductSnapshot>>();
let enclomipheneSourceCache: CacheEntry<EnclomipheneSourceSnapshot | null> | null = null;
let peptauraCatalogLastRefreshAt = 0;
let peptauraCatalogRefreshPromise: Promise<PeptauraCatalogRefreshResult> | null = null;
let peptauraCatalogCron: NodeJS.Timeout | null = null;

export interface PeptauraCatalogRefreshResult {
  ok: boolean;
  startedAt: string;
  completedAt: string;
  sitemapProducts: number;
  refreshedProducts: number;
  failedProducts: string[];
}

const PEPTAURA_COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  BE: "Belgium",
  CH: "Switzerland",
  LU: "Luxembourg",
  CA: "Canada",
  US: "United States",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  DE: "Germany",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  PT: "Portugal",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  "EU-other": "Other Europe",
  world: "Other country",
};

function normalizeDeliveryCountry(responses: Record<string, unknown>): string {
  const raw = String(
    responses.pep_country ??
    responses.country ??
    responses.pays ??
    responses.deliveryCountry ??
    ""
  ).trim();
  const euOther = String(responses.pep_country_eu_other ?? "").trim();
  const worldOther = String(responses.pep_country_other ?? "").trim();

  if (raw === "EU-other" && euOther) return euOther;
  if (raw === "world" && worldOther) return worldOther;

  if (!raw) return "France";
  return PEPTAURA_COUNTRY_LABELS[raw] || PEPTAURA_COUNTRY_LABELS[raw.toUpperCase()] || raw;
}

function peptauraShippingUrl(country: string): string {
  return `https://www.peptaura.com/shipping?country=${encodeURIComponent(country)}`;
}

function peptauraProductUrl(slug: string): string {
  return `https://www.peptaura.com/catalog/${encodeURIComponent(slug).replace(/%2B/g, "+")}`;
}

function isEnclomipheneName(value: string): boolean {
  return /\benclomiph[eè]ne(?:\s+citrate)?\b/i.test(value);
}

function hasConfirmedLowTestosterone(responses: Record<string, unknown>): boolean {
  return String(responses.pep_testo_bloodwork || "").trim().toLowerCase() === "recent-low";
}

function buildPeptidesValidationContext(
  responses: Record<string, unknown>,
  country = normalizeDeliveryCountry(responses),
  consentAccepted = false
): NonNullable<PeptidesReport["_validationContext"]> {
  const weightKg = Number(responses.pep_weight || responses.poids || 0);
  const secondaryGoalsRaw = responses.pep_secondary_goals || responses.objectifSecondaire;
  const secondaryGoals = Array.isArray(secondaryGoalsRaw)
    ? secondaryGoalsRaw.map(String).filter(Boolean)
    : String(secondaryGoalsRaw || "").split(/[,;|]/).map((value) => value.trim()).filter(Boolean);

  return {
    confirmedLowTestosterone: hasConfirmedLowTestosterone(responses),
    consentAccepted,
    profile: {
      ...(Number.isFinite(weightKg) && weightKg > 0 ? { weightKg } : {}),
      primaryGoal: String(responses.pep_primary_goal || responses.objectifPrincipal || "").trim(),
      secondaryGoals,
      country,
      budget: String(responses.pep_budget || responses.budget || "").trim(),
      timeline: String(responses.pep_timeline || responses.timeline || "").trim(),
      experience: String(responses.pep_experience || responses.experience || "").trim(),
      injectionComfort: String(responses.pep_injection_comfort || "").trim(),
    },
  };
}

async function fetchTextWithTimeout(
  url: string,
  timeoutMs = PEPTAURA_FETCH_TIMEOUT_MS,
  forceFresh = false
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "APEXLABS-PeptidesEngine/1.0 (+https://apexlabs.achzodcoaching.com)",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(forceFresh ? { "cache-control": "no-cache", "pragma": "no-cache" } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`[PeptidesEngine] Source fetch ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[PeptidesEngine] Source fetch failed for ${url}:`, err instanceof Error ? err.message : String(err));
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPeptauraProductFeedSnapshots(
  forceFresh = false,
): Promise<PeptauraLiveProductSnapshot[] | null> {
  const now = Date.now();
  if (
    !forceFresh
    && peptauraProductFeedCache
    && peptauraProductFeedCache.expiresAt > now
  ) {
    return peptauraProductFeedCache.value;
  }

  const raw = await fetchTextWithTimeout(
    PEPTAURA_PRODUCT_FEED_URL,
    Math.max(PEPTAURA_FETCH_TIMEOUT_MS, 12_000),
    forceFresh,
  );
  const parsed = raw
    ? parsePeptauraProductFeed(raw, {
        nowMs: now,
        maxAgeMs: PEPTAURA_CATALOG_MAX_AGE_MS,
        fetchedAt: new Date(now).toISOString(),
      })
    : null;
  if (!parsed) {
    const cached = peptauraProductFeedCache?.value;
    const newestCachedAt = Math.max(
      ...(cached || []).map((snapshot) => Date.parse(snapshot.fetchedAt)),
      0,
    );
    if (cached?.length && now - newestCachedAt <= PEPTAURA_CATALOG_MAX_AGE_MS) {
      return cached;
    }
    return null;
  }

  const snapshots = parsed.snapshots as PeptauraLiveProductSnapshot[];
  peptauraProductFeedCache = {
    value: snapshots,
    expiresAt: now + PEPTAURA_CACHE_TTL_MS,
  };
  return snapshots;
}

function decodePeptauraHtml(html: string): string {
  return html
    .replace(/\\"/g, "\"")
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchEnclomipheneSourceSnapshot(
  forceFresh = false
): Promise<EnclomipheneSourceSnapshot | null> {
  const now = Date.now();
  if (!forceFresh && enclomipheneSourceCache && enclomipheneSourceCache.expiresAt > now) {
    return enclomipheneSourceCache.value;
  }

  const html = await fetchTextWithTimeout(
    ENCLOMIPHENE_SOURCE_URL,
    PEPTAURA_FETCH_TIMEOUT_MS,
    forceFresh
  );
  if (!html) {
    enclomipheneSourceCache = { value: null, expiresAt: now + 60_000 };
    return null;
  }

  const productAt = html.indexOf('id="product-11658"');
  const productBlock = productAt >= 0 ? html.slice(productAt, productAt + 35_000) : html;
  const hasExpectedTitle = /product_title[^>]*>\s*Enclomiphene\s*</i.test(productBlock);
  const hasExpectedFormat = /30\s*ml\s*(?:@|[^\d]{1,20})\s*12[.,]5\s*mg\s*\/\s*ml/i.test(productBlock);
  const available = /\binstock\b/i.test(productBlock)
    && /name="add-to-cart"\s+value="11658"/i.test(productBlock);
  const priceMatch = productBlock.match(
    /woocommerce-Price-currencySymbol">&pound;<\/span>(\d+(?:\.\d+)?)/i
  );
  const priceGbp = Number(priceMatch?.[1] || 0);
  const snapshot: EnclomipheneSourceSnapshot = {
    url: ENCLOMIPHENE_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    available: hasExpectedTitle && hasExpectedFormat && available && priceGbp > 0,
    format: "30 ml a 12,5 mg/ml",
    priceGbp,
  };
  enclomipheneSourceCache = {
    value: snapshot,
    expiresAt: now + PEPTAURA_CACHE_TTL_MS,
  };
  return snapshot;
}

async function fetchPeptauraCatalogSlugs(forceFresh = false): Promise<string[] | null> {
  const now = Date.now();
  if (!forceFresh && peptauraSitemapCache && peptauraSitemapCache.expiresAt > now) return peptauraSitemapCache.value;

  const html = await fetchTextWithTimeout("https://www.peptaura.com/sitemap.xml", PEPTAURA_FETCH_TIMEOUT_MS, forceFresh);
  if (!html) {
    if (peptauraSitemapCache?.value && peptauraSitemapCache.value.length > 0) {
      return peptauraSitemapCache.value;
    }
    return null;
  }

  const slugs = Array.from(html.matchAll(/https:\/\/www\.peptaura\.com\/catalog\/([^<]+)/g))
    .map((m) => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    })
    .filter(Boolean);

  peptauraSitemapCache = { value: slugs, expiresAt: now + PEPTAURA_CACHE_TTL_MS };
  return slugs;
}

function parsePeptauraShipping(html: string, country: string): PeptauraShippingAvailability {
  const decoded = decodePeptauraHtml(html);
  const availableVendors: string[] = [];
  const blockedVendors: string[] = [];

  const availableRows = decoded.matchAll(/<a class="flex items-center gap-3 px-3 py-3[^"]*" href="\/vendors\/([^"]+)">([\s\S]*?)<\/a>/g);
  for (const row of availableRows) {
    const text = stripHtml(row[2]);
    const vendor = text || decodeURIComponent(row[1]);
    if (vendor && !availableVendors.includes(vendor)) availableVendors.push(vendor);
  }

  const blockedRows = decoded.matchAll(/<div class="flex items-center gap-3 rounded-lg px-3 py-3 opacity-60">([\s\S]*?)<\/div>/g);
  for (const row of blockedRows) {
    const text = stripHtml(row[1]);
    const vendor = text.split(/\u2014|\u2013/)[0]?.trim();
    if (vendor && !blockedVendors.includes(vendor)) blockedVendors.push(vendor);
  }

  return {
    country,
    shippingUrl: peptauraShippingUrl(country),
    availableVendors,
    blockedVendors,
    fetchedAt: new Date().toISOString(),
    live: availableVendors.length > 0 || blockedVendors.length > 0,
  };
}

async function fetchPeptauraShippingAvailability(
  country: string,
  forceFresh = false
): Promise<PeptauraShippingAvailability> {
  const cacheKey = country.toLowerCase();
  const now = Date.now();
  const cached = peptauraShippingCache.get(cacheKey);
  if (!forceFresh && cached && cached.expiresAt > now) return cached.value;

  const shippingUrl = peptauraShippingUrl(country);
  let html = await fetchTextWithTimeout(shippingUrl, PEPTAURA_FETCH_TIMEOUT_MS, forceFresh);
  if (!html && forceFresh) {
    html = await fetchTextWithTimeout(shippingUrl, PEPTAURA_FETCH_TIMEOUT_MS, false);
  }
  if (!html && cached?.value?.live) {
    const cachedAgeMs = now - new Date(cached.value.fetchedAt).getTime();
    if (Number.isFinite(cachedAgeMs) && cachedAgeMs <= PEPTAURA_CATALOG_MAX_AGE_MS) {
      return cached.value;
    }
  }
  const parsed = html
    ? parsePeptauraShipping(html, country)
    : { country, shippingUrl, availableVendors: [], blockedVendors: [], fetchedAt: new Date().toISOString(), live: false };

  peptauraShippingCache.set(cacheKey, { value: parsed, expiresAt: now + PEPTAURA_CACHE_TTL_MS });
  return parsed;
}

function extractPeptauraCatalogArray(decoded: string): unknown[] {
  const marker = "\"catalog\":[";
  const markerAt = decoded.indexOf(marker);
  if (markerAt < 0) return [];
  const start = markerAt + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < decoded.length; index++) {
    const char = decoded[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "[") depth++;
    if (char === "]") {
      depth--;
      if (depth === 0) {
        const rawArray = decoded.slice(start, index + 1);
        try {
          const parsed = JSON.parse(rawArray);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export function parsePeptauraProductSnapshot(slug: string, html: string): PeptauraLiveProductSnapshot {
  const decoded = decodePeptauraHtml(html);
  const listings: PeptauraLiveListing[] = [];
  const parsedCatalog = extractPeptauraCatalogArray(decoded);

  for (const rawEntry of parsedCatalog) {
    const entry = rawEntry as Record<string, any>;
    const supplierDetails = entry.suppliers && typeof entry.suppliers === "object"
      ? entry.suppliers as Record<string, any>
      : {};
    const priceTiers = Array.isArray(entry.price_tiers)
      ? entry.price_tiers
          .map((tier: any) => ({ price: Number(tier?.price), minQty: Number(tier?.min_qty) }))
          .filter((tier: PeptauraPriceTier) => Number.isFinite(tier.price) && tier.price > 0 && Number.isFinite(tier.minQty) && tier.minQty > 0)
      : [];
    if (priceTiers.length === 0) continue;

    listings.push({
      id: Number(entry.id),
      name: String(entry.name || slug),
      dosage: String(entry.dosage || ""),
      supplier: String(entry.supplier || supplierDetails.display_name || ""),
      supplierDisplayName: String(supplierDetails.display_name || entry.supplier || ""),
      outOfStock: entry.out_of_stock === true,
      form: String(entry.form || "vial"),
      priceTiers,
      warehouse: String(entry.warehouse || "unknown"),
      shippingOptionCount: Number(supplierDetails.shipping_option_count || 0),
      orderingMode: String(supplierDetails.orderingMode || ""),
      enabled: supplierDetails.enabled !== false,
      suspended: supplierDetails.suspended === true,
      boxSize: Math.max(1, Number(entry.box_size || 1)),
      marginRate: Math.max(0, Number(entry.margin_rate ?? supplierDetails.margin_rate ?? 0)),
    });
  }

  if (listings.length > 0) {
    return {
      slug,
      url: peptauraProductUrl(slug),
      listings,
      fetchedAt: new Date().toISOString(),
      live: true,
    };
  }

  const listingPattern = /"id":(\d+),"name":"([^"]+)","dosage":"([^"]+)","supplier":"([^"]+)"([\s\S]*?)"orderingMode":"([^"]+)"/g;

  for (const match of decoded.matchAll(listingPattern)) {
    const [, id, name, dosage, supplier, block, orderingMode] = match;
    const tiers = Array.from(block.matchAll(/"price":(\d+(?:\.\d+)?),"min_qty":(\d+)/g)).map((tier) => ({
      price: Number(tier[1]),
      minQty: Number(tier[2]),
    })).filter((tier) => Number.isFinite(tier.price) && Number.isFinite(tier.minQty));
    if (tiers.length === 0) continue;

    const displayName = block.match(/"display_name":"([^"]+)"/)?.[1] || supplier;
    const warehouse = block.match(/"warehouse":"([^"]+)"/)?.[1] || "unknown";
    const form = block.match(/"form":"([^"]+)"/)?.[1] || "vial";
    const shippingOptionCount = Number(block.match(/"shipping_option_count":(\d+)/)?.[1] || 0);
    const boxSize = Number(block.match(/"box_size":(\d+)/)?.[1] || 1);
    const marginMatches = Array.from(block.matchAll(/"margin_rate":(\d+(?:\.\d+)?)/g));
    const marginRate = Number(marginMatches.at(-1)?.[1] || 0);

    listings.push({
      id: Number(id),
      name,
      dosage,
      supplier,
      supplierDisplayName: displayName,
      outOfStock: /"out_of_stock":true/.test(block),
      form,
      priceTiers: tiers,
      warehouse,
      shippingOptionCount,
      orderingMode,
      enabled: !/"enabled":false/.test(block),
      suspended: /"suspended":true/.test(block),
      boxSize: Math.max(1, boxSize),
      marginRate: Math.max(0, marginRate),
    });
  }

  return {
    slug,
    url: peptauraProductUrl(slug),
    listings,
    fetchedAt: new Date().toISOString(),
    live: listings.length > 0,
  };
}

async function fetchPeptauraProductSnapshot(
  slug: string,
  forceFresh = false
): Promise<PeptauraLiveProductSnapshot | null> {
  const cacheKey = normalizePeptauraKey(slug);
  const now = Date.now();
  const cached = peptauraProductCache.get(cacheKey);
  if (!forceFresh && cached && cached.expiresAt > now) return cached.value;

  const url = peptauraProductUrl(slug);
  const html = await fetchTextWithTimeout(url, PEPTAURA_FETCH_TIMEOUT_MS, forceFresh);
  if (!html) return null;
  const pageHead = html.slice(0, 50000);
  const isMissingPage = /<title>\s*(?:404|[^<]*not found)|<h1[^>]*>\s*(?:404|[^<]*not found)|\bpage not found\b/i.test(pageHead);
  if (isMissingPage) return null;

  const snapshot = parsePeptauraProductSnapshot(slug, html);
  if (!snapshot.live || snapshot.listings.length === 0) return null;
  snapshot.source = "catalog_page";
  peptauraProductCache.set(cacheKey, { value: snapshot, expiresAt: now + PEPTAURA_CACHE_TTL_MS });
  return snapshot;
}

function getCachedPeptauraSnapshots(): PeptauraLiveProductSnapshot[] {
  return Array.from(peptauraProductCache.values())
    .map((entry) => entry.value)
    .filter((snapshot) => snapshot.live && snapshot.listings.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function refreshPeptauraCatalog(
  options: { forceFresh?: boolean } = {}
): Promise<PeptauraCatalogRefreshResult> {
  if (peptauraCatalogRefreshPromise) return peptauraCatalogRefreshPromise;

  peptauraCatalogRefreshPromise = (async () => {
    const startedAt = new Date().toISOString();
    const forceFresh = options.forceFresh !== false;
    const slugs = await fetchPeptauraCatalogSlugs(forceFresh);
    if (!slugs || slugs.length === 0) {
      return {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        sitemapProducts: 0,
        refreshedProducts: 0,
        failedProducts: ["sitemap"],
      };
    }

    // Prefer Peptaura's own robots-advertised product feed. One versioned,
    // horodated response replaces 76 large dynamic page reads and avoids
    // overloading the marketplace origin. Individual pages remain a final
    // live check for the selected products; the fresh feed is their safe
    // fallback when a page times out.
    const feedSnapshots = await fetchPeptauraProductFeedSnapshots(forceFresh);
    if (feedSnapshots?.length) {
      const feedKeys = new Set(feedSnapshots.map((snapshot) => normalizePeptauraKey(snapshot.slug)));
      const coveredSlugs = slugs.filter((slug) => feedKeys.has(normalizePeptauraKey(slug)));
      const minimumCoverage = Math.ceil(slugs.length * 0.95);
      if (coveredSlugs.length >= minimumCoverage) {
        for (const snapshot of feedSnapshots) {
          peptauraProductCache.set(normalizePeptauraKey(snapshot.slug), {
            value: snapshot,
            expiresAt: Date.now() + PEPTAURA_CACHE_TTL_MS,
          });
        }
        const completedAt = new Date().toISOString();
        peptauraCatalogLastRefreshAt = Date.parse(completedAt);
        return {
          ok: true,
          startedAt,
          completedAt,
          sitemapProducts: slugs.length,
          refreshedProducts: coveredSlugs.length,
          failedProducts: slugs.filter((slug) => !feedKeys.has(normalizePeptauraKey(slug))),
        };
      }
      console.warn(
        `[Peptaura Catalog] Official product feed coverage too low: ${coveredSlugs.length}/${slugs.length}`,
      );
    }

    const queue = [...slugs];
    const failedProducts: string[] = [];
    let refreshedProducts = 0;
    const workers = Array.from(
      { length: Math.min(PEPTAURA_CRAWL_CONCURRENCY, queue.length) },
      async () => {
        while (queue.length > 0) {
          const slug = queue.shift();
          if (!slug) return;
          let snapshot = await fetchPeptauraProductSnapshot(slug, forceFresh);
          if (!snapshot) {
            console.warn(`[Peptaura Catalog] Retry product after timeout or unreadable response: ${slug}`);
            snapshot = await fetchPeptauraProductSnapshot(slug, true);
          }
          if (snapshot) refreshedProducts++;
          else failedProducts.push(slug);
        }
      }
    );
    await Promise.all(workers);

    const completedAt = new Date().toISOString();
    const minimumCoverage = Math.ceil(slugs.length * 0.95);
    const ok = refreshedProducts >= minimumCoverage;
    if (ok) peptauraCatalogLastRefreshAt = Date.parse(completedAt);
    const result: PeptauraCatalogRefreshResult = {
      ok,
      startedAt,
      completedAt,
      sitemapProducts: slugs.length,
      refreshedProducts,
      failedProducts,
    };
    console.log(
      `[Peptaura Catalog] Refresh ${ok ? "OK" : "PARTIAL"}: ${refreshedProducts}/${slugs.length} products, ${failedProducts.length} failures`
    );
    return result;
  })();

  try {
    return await peptauraCatalogRefreshPromise;
  } finally {
    peptauraCatalogRefreshPromise = null;
  }
}

async function ensurePeptauraCatalogFresh(): Promise<PeptauraCatalogRefreshResult> {
  const cached = getCachedPeptauraSnapshots();
  const ageMs = peptauraCatalogLastRefreshAt > 0
    ? Date.now() - peptauraCatalogLastRefreshAt
    : Number.POSITIVE_INFINITY;
  if (cached.length > 0 && ageMs <= PEPTAURA_CATALOG_MAX_AGE_MS) {
    const timestamp = new Date(peptauraCatalogLastRefreshAt).toISOString();
    return {
      ok: true,
      startedAt: timestamp,
      completedAt: timestamp,
      sitemapProducts: peptauraSitemapCache?.value?.length || cached.length,
      refreshedProducts: cached.length,
      failedProducts: [],
    };
  }
  return refreshPeptauraCatalog({ forceFresh: true });
}

export function getPeptauraCatalogHealth() {
  const snapshots = getCachedPeptauraSnapshots();
  const refreshedAt = peptauraCatalogLastRefreshAt > 0
    ? new Date(peptauraCatalogLastRefreshAt).toISOString()
    : null;
  return {
    running: Boolean(peptauraCatalogRefreshPromise),
    refreshedAt,
    ageMs: peptauraCatalogLastRefreshAt > 0
      ? Date.now() - peptauraCatalogLastRefreshAt
      : null,
    snapshotCount: snapshots.length,
    sitemapCount: peptauraSitemapCache?.value?.length ?? null,
    maxAgeMs: PEPTAURA_CATALOG_MAX_AGE_MS,
    intervalMs: PEPTAURA_CRAWL_INTERVAL_MS,
  };
}

export function startPeptauraCatalogCron(): void {
  if (peptauraCatalogCron) return;
  void refreshPeptauraCatalog({ forceFresh: true }).catch((error) => {
    console.error("[Peptaura Catalog] Initial refresh failed:", error);
  });
  peptauraCatalogCron = setInterval(() => {
    void refreshPeptauraCatalog({ forceFresh: true }).catch((error) => {
      console.error("[Peptaura Catalog] Scheduled refresh failed:", error);
    });
  }, PEPTAURA_CRAWL_INTERVAL_MS);
  peptauraCatalogCron.unref();
  console.log(`[Peptaura Catalog] Cron started every ${Math.round(PEPTAURA_CRAWL_INTERVAL_MS / 60000)} minutes`);
}

function vendorKey(value: string): string {
  return normalizePeptauraKey(value);
}

function listingVendorKeys(listing: PeptauraLiveListing): string[] {
  return [listing.supplier, listing.supplierDisplayName].map(vendorKey);
}

function isVendorInList(listing: PeptauraLiveListing, vendors: string[]): boolean {
  const allowed = new Set(vendors.map(vendorKey));
  return listingVendorKeys(listing).some((key) => allowed.has(key));
}

function selectBestLiveListing(
  snapshot: PeptauraLiveProductSnapshot,
  shipping: PeptauraShippingAvailability,
  targetVialMg: number | null,
  qty: number
): PeptauraLiveListing | null {
  let candidates = snapshot.listings.filter((listing) =>
    listing.enabled &&
    !listing.suspended &&
    !listing.outOfStock &&
    listing.orderingMode === "available" &&
    listing.shippingOptionCount > 0
  );
  if (candidates.length === 0) return null;

  if (shipping.blockedVendors.length > 0) {
    candidates = candidates.filter((listing) => !isVendorInList(listing, shipping.blockedVendors));
  }
  if (candidates.length === 0) return null;

  if (shipping.availableVendors.length > 0) {
    candidates = candidates.filter((listing) =>
      isVendorInList(listing, shipping.availableVendors)
    );
    if (candidates.length === 0) return null;
  }

  const maxAllowedVials = Math.max(qty, Math.floor(qty * 1.2));
  const withoutForcedOverstock = candidates.filter((listing) => {
    const deliveredVials = packageCountForVials(listing, qty) * listing.boxSize;
    return deliveredVials <= maxAllowedVials;
  });
  if (withoutForcedOverstock.length > 0) candidates = withoutForcedOverstock;
  else return null;

  candidates.sort((a, b) => {
    const aMg = parseListingMg(a.dosage);
    const bMg = parseListingMg(b.dosage);
    const aExact = targetVialMg != null && aMg != null && Math.abs(aMg - targetVialMg) < 0.05 ? 0 : 1;
    const bExact = targetVialMg != null && bMg != null && Math.abs(bMg - targetVialMg) < 0.05 ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aTotal = offerTotalPrice(a, qty);
    const bTotal = offerTotalPrice(b, qty);
    if (aTotal !== bTotal) return aTotal - bTotal;
    const aDelivered = packageCountForVials(a, qty) * a.boxSize;
    const bDelivered = packageCountForVials(b, qty) * b.boxSize;
    return aDelivered - bDelivered;
  });

  return candidates[0];
}

function eligibleLiveListings(
  snapshot: PeptauraLiveProductSnapshot,
  shipping: PeptauraShippingAvailability,
): PeptauraLiveListing[] {
  let candidates = snapshot.listings.filter((listing) =>
    listing.enabled
    && !listing.suspended
    && !listing.outOfStock
    && listing.orderingMode === "available"
    && listing.shippingOptionCount > 0
  );
  if (shipping.blockedVendors.length > 0) {
    candidates = candidates.filter((listing) => !isVendorInList(listing, shipping.blockedVendors));
  }
  if (shipping.availableVendors.length > 0) {
    candidates = candidates.filter((listing) => isVendorInList(listing, shipping.availableVendors));
  }
  return candidates;
}

function selectBestLivePurchasePlan(
  snapshot: PeptauraLiveProductSnapshot,
  shipping: PeptauraShippingAvailability,
  needMg: number,
  preferredVialMg: number | null = null,
): PeptidePurchasePlan<PeptauraLiveListing> | null {
  const eligible = eligibleLiveListings(snapshot, shipping);
  if (preferredVialMg != null) {
    const preferredPlans = eligible
      .filter((listing) => {
        const vialMg = parseListingMg(listing.dosage);
        return vialMg != null && Math.abs(vialMg - preferredVialMg) < 0.05;
      })
      .map((listing) => buildPurchasePlan(listing, needMg, 1.2))
      .filter((plan): plan is PeptidePurchasePlan<PeptauraLiveListing> => plan != null)
      .sort((a, b) => a.totalPriceUsd - b.totalPriceUsd);
    if (preferredPlans[0]) return preferredPlans[0];
  }
  return selectBestPurchasePlan(eligible, needMg, 1.2);
}

/**
 * MOTS-c is administered weekly across multi-week cycles. Keep each opened
 * vial limited to at most two weekly administrations instead of selecting a
 * cheaper oversized vial whose post-reconstitution lifetime is not proven by
 * the official feed.
 */
export function preferredStagedVialMgForCycle(pep: Pick<PeptideItem, "name" | "dosage" | "cycleDuration">): number | null {
  if (!/^MOTS[- ]?c$/i.test(String(pep.name || "").trim())) return null;
  const durationWeeks = Number(String(pep.cycleDuration || "").match(/(\d+(?:[.,]\d+)?)\s*semaines?/i)?.[1]?.replace(",", "."));
  const weeklyDoseMg = Number(String(pep.dosage || "").match(/(\d+(?:[.,]\d+)?)\s*mg\s*(?:une|1)\s*fois\s*par\s*semaine/i)?.[1]?.replace(",", "."));
  if (!Number.isFinite(durationWeeks) || durationWeeks < 3 || !Number.isFinite(weeklyDoseMg) || weeklyDoseMg <= 0) return null;
  return weeklyDoseMg * 2;
}

function findPeptauraProductForPeptide(pepName: string): PeptaurProduct | null {
  const cleanName = normalizePeptauraKey(pepName)
    .replace("sansdac", "nodac")
    .replace("avecdac", "withdac");
  const products = getPeptauraCatalogProducts();
  const direct = products.find((p) =>
    normalizePeptauraKey(p.name) === cleanName ||
    normalizePeptauraKey(p.slug) === cleanName
  );
  if (direct) return direct;
  return products.find((p) => {
    const nameKey = normalizePeptauraKey(p.name);
    const slugKey = normalizePeptauraKey(p.slug);
    return cleanName.includes(nameKey) || nameKey.includes(cleanName) || cleanName.includes(slugKey) || slugKey.includes(cleanName);
  }) || null;
}

function findLiveSnapshotForPeptide(
  pepName: string,
  snapshots: PeptauraLiveProductSnapshot[]
): PeptauraLiveProductSnapshot | null {
  const cleanName = normalizePeptauraKey(pepName)
    .replace("sansdac", "nodac")
    .replace("avecdac", "withdac");
  const scored = snapshots.map((snapshot) => {
    const slugKey = normalizePeptauraKey(snapshot.slug)
      .replace("sansdac", "nodac")
      .replace("avecdac", "withdac");
    const listingKeys = snapshot.listings.map((listing) =>
      normalizePeptauraKey(listing.name)
        .replace("sansdac", "nodac")
        .replace("avecdac", "withdac")
    );
    const candidateKeys = [slugKey, ...listingKeys].filter(Boolean);
    const exact = candidateKeys.some((key) => key === cleanName);
    const longestPartialMatch = candidateKeys.reduce((longest, key) => {
      if (!cleanName.includes(key) && !key.includes(cleanName)) return longest;
      return Math.max(longest, Math.min(cleanName.length, key.length));
    }, 0);
    return {
      snapshot,
      score: exact ? 10_000 + cleanName.length : longestPartialMatch,
    };
  });
  const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
  return bestMatch?.score ? bestMatch.snapshot : null;
}

function buildLivePriceEstimate(pep: PeptideItem, listing: PeptauraLiveListing, qty: number): string | null {
  const packagePrice = effectivePackagePrice(listing, qty);
  if (!Number.isFinite(packagePrice) || packagePrice <= 0) return null;
  const packageCount = packageCountForVials(listing, qty);
  const deliveredVials = packageCount * listing.boxSize;
  const total = Math.round(packagePrice * packageCount * 100) / 100;
  const eur = Math.round(total * 0.92);
  const supplier = listing.supplierDisplayName || listing.supplier;
  const effectiveUnit = Math.round((total / Math.max(qty, 1)) * 100) / 100;
  if (listing.boxSize > 1) {
    return `~$${effectiveUnit.toFixed(2)}/vial effectif × ${qty} vial${qty > 1 ? "s" : ""} = $${total.toFixed(2)} total (~${eur}€), commande reelle ${packageCount} boite${packageCount > 1 ? "s" : ""} de ${listing.boxSize} vials (${listing.dosage}, ${supplier}), ${deliveredVials} vials recus`;
  }
  return `~$${packagePrice.toFixed(2)}/vial × ${qty} vial${qty > 1 ? "s" : ""} = $${total.toFixed(2)} total (~${eur}€) (${listing.dosage}, ${supplier})`;
}

function parseListingMl(value: string): number | null {
  const match = String(value || "").replace(/(\d),(\d)/g, "$1.$2").match(
    /(\d+(?:\.\d+)?)\s*ml\b/i
  );
  return match ? Number(match[1]) : null;
}

async function applyLivePeptauraPricing(
  report: PeptidesReport,
  context: PeptauraPromptContext,
  forceFresh = true
): Promise<PeptidesReport> {
  const liveNotes: string[] = [];
  const failures: string[] = [];
  const listingSnapshots: Array<Record<string, unknown>> = [];

  for (const pep of report.peptides) {
    if (isEnclomipheneName(pep.name)) {
      const source = context.enclomipheneSource
        || await fetchEnclomipheneSourceSnapshot(forceFresh);
      const sourceSync = source || {
        url: ENCLOMIPHENE_SOURCE_URL,
        fetchedAt: new Date().toISOString(),
        available: false,
        format: "30 ml a 12,5 mg/ml",
        priceGbp: 0,
      };
      report._enclomipheneSourceSync = sourceSync;
      if (!source?.available) {
        failures.push("Enclomiphene: source ReceptorChem live indisponible ou format inattendu");
        continue;
      }

      const needMg = estimateNeedMg(pep);
      if (needMg == null || needMg <= 0) {
        failures.push("Enclomiphene: quantite totale incalculable depuis le protocole");
        continue;
      }
      const bottleMg = 30 * 12.5;
      const bottleCount = Math.max(1, Math.ceil(needMg / bottleMg));
      const totalGbp = Math.round(source.priceGbp * bottleCount * 100) / 100;
      pep.purchaseUrl = ENCLOMIPHENE_SOURCE_URL;
      pep.reconstitution = "Aucune reconstitution, solution liquide de 30 ml concentree a 12,5 mg/ml";
      pep.vialsNeeded = `${bottleCount} flacon${bottleCount > 1 ? "s" : ""} de 30 ml a 12,5 mg/ml pour ${pep.cycleDuration} (besoin calcule environ ${needMg.toFixed(1)} mg)`;
      pep.priceEstimate = `Environ £${source.priceGbp.toFixed(2)} par flacon, ${bottleCount} flacon${bottleCount > 1 ? "s" : ""}, total £${totalGbp.toFixed(2)}`;
      liveNotes.push(`Enclomiphene: ${source.format} via ReceptorChem`);
      listingSnapshots.push({
        peptide: pep.name,
        slug: "enclomiphene-citrate",
        url: source.url,
        supplier: "ReceptorChem",
        dosage: source.format,
        requestedVials: bottleCount,
        boxSize: 1,
        packageCount: bottleCount,
        deliveredVials: bottleCount,
        unitPackagePriceGbp: source.priceGbp,
        totalPriceGbp: totalGbp,
        fetchedAt: source.fetchedAt,
      });
      continue;
    }

    const product = findPeptauraProductForPeptide(pep.name);
    const cachedSnapshot = findLiveSnapshotForPeptide(pep.name, context.catalogSnapshots);
    const slug = cachedSnapshot?.slug || product?.slug;
    if (!slug) {
      failures.push(`${pep.name}: aucune page produit Peptaura trouvee`);
      continue;
    }

    pep.purchaseUrl = peptauraProductUrl(slug);
    const estimatedNeedMg = estimateNeedMg(pep);
    const orderedNeedMg = extractTotalMgFromVials(pep.vialsNeeded);
    const needMg = estimatedNeedMg ?? orderedNeedMg;
    if (needMg == null || needMg <= 0) {
      failures.push(`${pep.name}: quantite totale incalculable depuis le dosage et la duree`);
      continue;
    }
    const fetchedSnapshot = await fetchPeptauraProductSnapshot(slug, forceFresh);
    const cachedSnapshotAgeMs = cachedSnapshot
      ? Date.now() - new Date(cachedSnapshot.fetchedAt).getTime()
      : Number.POSITIVE_INFINITY;
    const snapshot = fetchedSnapshot
      || (
        cachedSnapshot
        && Number.isFinite(cachedSnapshotAgeMs)
        && cachedSnapshotAgeMs <= PEPTAURA_CATALOG_MAX_AGE_MS
          ? cachedSnapshot
          : null
      );
    if (!snapshot || snapshot.listings.length === 0) {
      failures.push(`${pep.name}: page produit live indisponible`);
      continue;
    }

    const preferredVialMg = preferredStagedVialMgForCycle(pep)
      || extractVialMg(pep.vialsNeeded)
      || extractVialMg(pep.reconstitution);
    const purchasePlan = selectBestLivePurchasePlan(snapshot, context.shippingAvailability, needMg, preferredVialMg);
    if (!purchasePlan) {
      failures.push(`${pep.name}: aucune offre en stock ne couvre le besoin de ${needMg.toFixed(2)} mg sans plus de 20 % de surstock`);
      continue;
    }
    const best = purchasePlan.listing;
    let qty = purchasePlan.requestedVials;
    const bestMg = purchasePlan.vialMg;
    const durationLabel = String(pep.cycleDuration || "le cycle").split(/[,.]/)[0].trim();
    const naturalDurationLabel = durationLabel.charAt(0).toLowerCase() + durationLabel.slice(1);
    const needSourceLabel = estimatedNeedMg != null ? "besoin calcule" : "besoin reconstruit depuis la quantite initiale";
    pep.vialsNeeded = `${qty} vial${qty > 1 ? "s" : ""} de ${bestMg} mg pour ${naturalDurationLabel} (${needSourceLabel} ~${needMg.toFixed(2)} mg, capacite livree ${purchasePlan.deliveredMg.toFixed(2)} mg)`;
    if (/aucune offre live exploitable|format de vial.*(?:manque|indisponible)|(?:reconstitution.{0,80})?unit[ée]s?.{0,40}suspendues|feed officiel ne fournit pas le volume/i.test(pep.reconstitution || "")) {
      const conditional = buildConditionalReconstitutionText(pep.dosage, bestMg);
      if (!conditional) {
        failures.push(`${pep.name}: dose illisible pour le calcul conditionnel de reconstitution`);
        continue;
      }
      pep.reconstitution = conditional;
    }

    const livePlan = planOperationalVials(
      {
        ...pep,
        pharmacologicalNeedMg: needMg,
        reconstitution: `Vial ${bestMg}mg. ${pep.reconstitution || ""}`,
        vialsNeeded: `${qty} vials de ${bestMg}mg`,
      },
      parseDocumentedStabilityConfig()
    );
    pep._vialPlanning = livePlan;
    qty = livePlan.status === "documented" && livePlan.operationalVials != null
      ? livePlan.operationalVials
      : livePlan.mathematicalMinimumVials || qty;
    pep.vialsNeeded = formatOperationalVials(
      livePlan,
      pep.cycleDuration || "le cycle",
      pep.name || "cette molecule"
    );

    // The official feed exposes the exact listing URL. Never synthesize a
    // vendor URL; use it only after the listing passed country/stock/price
    // selection, otherwise retain the canonical catalog page.
    if (best.productUrl) pep.purchaseUrl = best.productUrl;

    const livePrice = buildLivePriceEstimate(pep, best, qty);
    if (livePrice) {
      pep.priceEstimate = livePrice;
      liveNotes.push(`${pep.name}: ${best.dosage} via ${best.supplierDisplayName || best.supplier}`);
      const packageCount = packageCountForVials(best, qty);
      listingSnapshots.push({
        peptide: pep.name,
        slug,
        url: best.productUrl || snapshot.url,
        source: snapshot.source || "catalog_page",
        sourceGeneratedAt: snapshot.sourceGeneratedAt,
        supplier: best.supplierDisplayName || best.supplier,
        dosage: best.dosage,
        requestedVials: qty,
        boxSize: best.boxSize,
        packageCount,
        deliveredVials: packageCount * best.boxSize,
        needMg,
        deliveredMg: packageCount * best.boxSize * bestMg,
        unitPackagePriceUsd: effectivePackagePrice(best, qty),
        totalPriceUsd: offerTotalPrice(best, qty),
        marginRate: best.marginRate,
        fetchedAt: snapshot.fetchedAt,
      });
    } else {
      failures.push(`${pep.name}: prix live illisible`);
    }
  }

  let bacWaterLine = "";
  const bacWaterNeedMl = calculateBacWaterNeedMl(report);
  const bacProduct = getPeptauraCatalogProducts().find((product) =>
    /^bac\s*water$/i.test(product.name)
  );
  const bacCachedSnapshot = bacProduct
    ? findLiveSnapshotForPeptide(bacProduct.name, context.catalogSnapshots)
    : null;
  const bacSlug = bacCachedSnapshot?.slug || bacProduct?.slug;
  if (bacWaterNeedMl > 0 && bacSlug) {
    const fetchedBacSnapshot = await fetchPeptauraProductSnapshot(
      bacSlug,
      forceFresh
    );
    const bacSnapshot = fetchedBacSnapshot || bacCachedSnapshot;
    const nominalBottleMl = Math.max(
      1,
      ...((bacSnapshot?.listings || [])
        .map((listing) => parseListingMl(listing.dosage))
        .filter((value): value is number => value != null && value > 0))
    );
    const bacBottleQty = Math.max(1, Math.ceil(bacWaterNeedMl / nominalBottleMl));
    const bacListing = bacSnapshot
      ? selectBestLiveListing(
          bacSnapshot,
          context.shippingAvailability,
          null,
          bacBottleQty
        )
      : null;

    if (bacSnapshot && bacListing) {
      const bottleMl = parseListingMl(bacListing.dosage) || nominalBottleMl;
      const finalBottleQty = Math.max(1, Math.ceil(bacWaterNeedMl / bottleMl));
      const packageCount = packageCountForVials(bacListing, finalBottleQty);
      const deliveredBottles = packageCount * bacListing.boxSize;
      const packagePrice = effectivePackagePrice(bacListing, finalBottleQty);
      const totalPrice = offerTotalPrice(bacListing, finalBottleQty);
      const supplier =
        bacListing.supplierDisplayName || bacListing.supplier;
      const effectiveBottlePrice = Math.round((totalPrice / Math.max(finalBottleQty, 1)) * 100) / 100;
      bacWaterLine =
        `BAC Water: besoin calcule ${bacWaterNeedMl.toFixed(1)} ml, ` +
        `${finalBottleQty} vial${finalBottleQty > 1 ? "s" : ""} de ${bottleMl}ml. ` +
        `~$${effectiveBottlePrice.toFixed(2)}/vial × ${finalBottleQty} vial${finalBottleQty > 1 ? "s" : ""} = $${totalPrice.toFixed(2)} total (${supplier}). ` +
        `Commande reelle: ${packageCount} boite${packageCount > 1 ? "s" : ""}, ${deliveredBottles} vials recus. ` +
        `${peptauraProductUrl(bacSlug)}`;
      liveNotes.push(`BAC Water: ${bacListing.dosage} via ${supplier}`);
      listingSnapshots.push({
        peptide: "BAC Water",
        slug: bacSlug,
        url: bacSnapshot.url,
        supplier,
        dosage: bacListing.dosage,
        requestedVials: finalBottleQty,
        boxSize: bacListing.boxSize,
        packageCount,
        deliveredVials: deliveredBottles,
        unitPackagePriceUsd: packagePrice,
        totalPriceUsd: totalPrice,
        marginRate: bacListing.marginRate,
        fetchedAt: bacSnapshot.fetchedAt,
      });
    } else {
      failures.push("BAC Water: aucune offre live compatible avec le pays");
    }
  } else if (bacWaterNeedMl > 0) {
    failures.push("BAC Water: page produit Peptaura introuvable");
  }

  (report as any)._peptauraLiveSync = {
    country: context.country,
    shippingUrl: context.shippingUrl,
    shippingLive: context.shippingAvailability.live,
    availableVendors: context.shippingAvailability.availableVendors,
    blockedVendors: context.shippingAvailability.blockedVendors,
    liveCatalogCount: context.liveCatalogSlugs?.length ?? null,
    catalogRefreshedAt: context.catalogRefreshedAt,
    syncedAt: new Date().toISOString(),
    applied: liveNotes,
    failures,
    listingSnapshots,
  };

  report.shoppingList = [
    ...report.peptides.map((pep) =>
      `${pep.name}: ${pep.vialsNeeded}. ${pep.priceEstimate}. ${pep.purchaseUrl}`
    ),
    formatOperationalVialPolicySummary(
      report.peptides.map((peptide) => ({
        name: peptide.name,
        plan: peptide._vialPlanning || {
          pharmacologicalNeedMg: null,
          vialSizeMg: null,
          mathematicalMinimumVials: null,
          operationalVials: null,
          optionalSealedReserveVials: null,
          stabilityDays: null,
          stabilitySource: null,
          cadence: null,
          status: "unparseable" as const,
        },
      }))
    ),
    ...(bacWaterLine ? [bacWaterLine] : []),
    ...(report.peptides.some((pep) => isEnclomipheneName(pep.name))
      ? [`Avant de payer Enclomiphene, verifie une derniere fois le stock sur ${ENCLOMIPHENE_SOURCE_URL}.`]
      : []),
    `Avant de payer, verifie une derniere fois le stock et la livraison vers ${context.country} sur ${context.shippingUrl}.`,
  ].filter(Boolean).join("\n");

  return report;
}

// Build catalog summary for the report prompt
// Only inject protocol-relevant peptides into the prompt (not supplies/blends/niche)
const PROMPT_CATEGORIES = new Set(["recovery", "gh-secretagogue", "fat-loss", "sleep", "cognitive", "libido", "skin", "longevity", "endurance", "glp1", "hpg-axis", "anabolic"]);
const FALLBACK_DELISTED_PRODUCT_KEYS = new Set(["vip", "hghfragment176191", "slupp332"]);

function buildCatalogForPrompt(context: PeptauraPromptContext): string {
  const liveSlugKeys = context.liveCatalogSlugs ? new Set(context.liveCatalogSlugs.map(normalizePeptauraKey)) : null;
  const relevant = getPeptauraCatalogProducts()
    .filter(p => PROMPT_CATEGORIES.has(p.category))
    .filter(p => {
      const key = normalizePeptauraKey(p.slug);
      return liveSlugKeys ? liveSlugKeys.has(key) : !FALLBACK_DELISTED_PRODUCT_KEYS.has(key);
    });
  const lines: string[] = [];
  const shipping = context.shippingAvailability;
  lines.push("CONTEXTE PEPTAURA LIVE (peptaura.com)");
  lines.push(`Pays de livraison client: ${context.country}. Page a verifier: ${context.shippingUrl}`);
  if (shipping.live) {
    lines.push(`Fournisseurs qui livrent vers ${context.country}: ${shipping.availableVendors.join(", ") || "aucun detecte"}.`);
    lines.push(`Fournisseurs a ne PAS utiliser pour ${context.country}: ${shipping.blockedVendors.join(", ") || "aucun detecte"}.`);
  } else {
    lines.push("Shipping live indisponible au moment de la generation: ne promets pas un fournisseur, demande de verifier la page shipping avant commande.");
  }
  lines.push(`Catalogue live rafraichi le ${context.catalogRefreshedAt}: ${context.liveCatalogSlugs ? `${context.liveCatalogSlugs.length} pages produit detectees` : "indisponible"}.`);
  lines.push("Les prix ci-dessous viennent des pages produit live. Le serveur recontrole ensuite chaque page retenue avant sauvegarde et juste avant livraison.");
  lines.push("Tous les produits: vials lyophilises sauf mention spray/cartridge. Reconstitution avec BAC water quand applicable.\n");
  if (context.enclomipheneSource) {
    const source = context.enclomipheneSource;
    lines.push("SOURCE EXTERNE ENCLOMIPHENE VERIFIEE EN DIRECT");
    lines.push(
      `Enclomiphene Citrate | ${source.format} | £${source.priceGbp.toFixed(2)} | ` +
      `${source.available ? "en stock" : "indisponible"} | ${source.url}`
    );
    lines.push("Cette URL exacte remplace Peptaura uniquement pour Enclomiphene.\n");
  }

  const snapshotsBySlug = new Map(
    context.catalogSnapshots.map((snapshot) => [normalizePeptauraKey(snapshot.slug), snapshot])
  );
  for (const p of relevant) {
    const snapshot = snapshotsBySlug.get(normalizePeptauraKey(p.slug));
    const offers = snapshot?.listings
      .filter((listing) => listing.enabled && !listing.suspended && !listing.outOfStock && listing.orderingMode === "available")
      .slice(0, 12)
      .map((listing) => {
        const visible = effectivePackagePrice(listing, 1);
        const box = listing.boxSize > 1 ? `boite ${listing.boxSize}` : "vial";
        return `${listing.dosage}, ${listing.supplierDisplayName || listing.supplier}, ${box}, $${visible.toFixed(2)}`;
      });
    lines.push(`${p.name} | ${offers?.join(" ; ") || "aucune offre live exploitable"} | peptaura.com/catalog/${p.slug}`);
  }

  const knownKeys = new Set(relevant.map((product) => normalizePeptauraKey(product.slug)));
  for (const snapshot of context.catalogSnapshots) {
    if (knownKeys.has(normalizePeptauraKey(snapshot.slug))) continue;
    const offers = snapshot.listings
      .filter((listing) => listing.enabled && !listing.suspended && !listing.outOfStock && listing.orderingMode === "available")
      .slice(0, 8)
      .map((listing) => `${listing.dosage}, ${listing.supplierDisplayName || listing.supplier}, $${effectivePackagePrice(listing, 1).toFixed(2)}`);
    if (offers.length > 0) {
      lines.push(`${snapshot.slug} | ${offers.join(" ; ")} | peptaura.com/catalog/${snapshot.slug}`);
    }
  }

  lines.push("\nEquipement: BAC water et materiel sterile. Le client verifie les offres live avant de payer.");
  return lines.join("\n");
}

async function buildPeptauraPromptContext(responses: Record<string, unknown>): Promise<PeptauraPromptContext> {
  const country = normalizeDeliveryCountry(responses);
  const [shippingAvailability, catalogRefresh, enclomipheneSource] = await Promise.all([
    fetchPeptauraShippingAvailability(country, true),
    ensurePeptauraCatalogFresh(),
    hasConfirmedLowTestosterone(responses)
      ? fetchEnclomipheneSourceSnapshot(true)
      : Promise.resolve(null),
  ]);
  const liveCatalogSlugs = await fetchPeptauraCatalogSlugs();
  const catalogSnapshots = getCachedPeptauraSnapshots();
  const health = getPeptauraCatalogHealth();
  const context: PeptauraPromptContext = {
    country,
    shippingUrl: peptauraShippingUrl(country),
    shippingAvailability,
    liveCatalogSlugs,
    catalogRefreshedAt: health.refreshedAt || catalogRefresh.completedAt,
    catalogSnapshots,
    enclomipheneSource,
    promptBlock: "",
  };
  context.promptBlock = buildCatalogForPrompt(context);
  return context;
}

export async function refreshPeptauraPricingForDelivery(
  sourceReport: PeptidesReport,
  responses: Record<string, unknown>,
  tier: string | null | undefined,
  consentAccepted: boolean
): Promise<PeptidesReport> {
  const report = validateVialsMath(JSON.parse(JSON.stringify(sourceReport)));
  report.qualityVersion = hasPeptidesHardRedFlag(responses)
    ? "medical-review-v1"
    : consentAccepted
    ? "expert-standard-v1"
    : String(report.qualityVersion || "").toLowerCase() === "medical-review-v1"
    ? "medical-review-v1"
    : "expert-standard-v1";
  const context = await buildPeptauraPromptContext(responses);
  report._validationContext = buildPeptidesValidationContext(
    responses,
    context.country,
    consentAccepted
  );
  await applyLivePeptauraPricing(report, context, true);
  const repaired = repairPeptidesReportContent(report, responses, tier);
  return cleanReportContent(repaired, repaired.clientName || extractFirstName(responses, ""));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Post-processing: remove all dashes/em-dashes from report content
 * and fix 3rd person references to direct "tu" form
 */
function cleanReportContent(report: PeptidesReport, firstName: string): PeptidesReport {
  const cleanText = (text: string): string => {
    if (!text) return text;
    // Replace em dash / en dash with comma or colon
    let cleaned = sanitizeClientFacingText(text);
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
    cleaned = cleaned
      .replace(/\bil est important de noter que\b/gi, "concretement,")
      .replace(/\bil convient de souligner que\b/gi, "le point a retenir,")
      .replace(/\bn['’]h[ée]site pas [àa]\b/gi, "tu peux")
      .replace(/\ben conclusion\b/gi, "au final")
      .replace(/\bvoici les points cl[ée]s\b/gi, "retiens ceci");
    return sanitizeClientFacingText(cleaned);
  };

  for (const section of report.sections) {
    section.content = cleanText(section.content);
    if (section.title) section.title = cleanText(section.title);
  }

  for (const pep of report.peptides) {
    for (const key of [
      "name",
      "purpose",
      "dosage",
      "timing",
      "route",
      "cycleDuration",
      "priceEstimate",
      "reconstitution",
      "whyThisPeptide",
      "vialsNeeded",
    ] as const) {
      const value = pep[key];
      if (typeof value === "string") (pep as any)[key] = cleanText(value);
    }
  }
  report.clientName = cleanText(report.clientName);
  report.weeklySchedule = cleanText(report.weeklySchedule);
  report.shoppingList = cleanText(report.shoppingList);
  report.bloodMarkers = (report.bloodMarkers || []).map(cleanText);

  const safetyText = collectClientFacingStrings(report).join("\n");
  const reportMode = String((report as any).qualityVersion || "");
  const verificationAction = "(?:valid(?:e|er|ation)|v[ée]rifi(?:e|er|cation)|avis|accord|confirm(?:e|er|ation))";
  const hasMedicalVerification = new RegExp(
    `\\b(?:m[ée]decin|pharmacien)\\b[\\s\\S]{0,180}\\b${verificationAction}\\b|\\b${verificationAction}\\b[\\s\\S]{0,180}\\b(?:m[ée]decin|pharmacien)\\b`,
    "i"
  ).test(safetyText);
  if (reportMode === "medical-review-v1"
    && (!/\b(?:experimental|non approuv[ée]|produit de recherche)\b/i.test(safetyText)
    || !hasMedicalVerification)) {
    const safetySection = report.sections.find((section) =>
      /securite|s[ée]curit[ée]|disclaimer|support|avant de commencer/i.test(`${section.id} ${section.title}`)
    ) || report.sections.at(-1);
    if (safetySection) {
      safetySection.content = cleanText(
        `${safetySection.content}\n\n${firstName}, je veux etre net sur ce point. Plusieurs molecules citees ici sont experimentales ou non approuvees, avec des donnees humaines encore limitees. Ce rapport ne transforme pas un produit de recherche en traitement valide. Avant tout achat ou toute utilisation, demande a ton medecin ou a ton pharmacien de verifier la molecule, la dose, tes allergies, tes traitements et tes analyses. Sans cet accord, tu suspends la demarche.`
      );
    }
  }

  const unresolved = collectClientFacingStrings(report)
    .filter((value) => /[\u2013\u2014]|&(?:mdash|ndash);/i.test(value));
  if (unresolved.length > 0) {
    throw new Error(`QUALITY: ${unresolved.length} ponctuation(s) Unicode interdite(s) apres nettoyage`);
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
    pep_country: "Pays de livraison Peptaura",
    pep_country_eu_other: "Pays Europe precise",
    pep_country_other: "Pays de livraison precise",
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

const SYSTEM_PROMPT = `Tu rediges en francais le rapport expert Peptides Engine signe Achzod.

TON ET STYLE
Tu tutoies toujours. Les mots "vous", "votre", "vos" et les imperatifs au pluriel sont interdits.
Les caracteres Unicode U+2014 et U+2013 sont interdits partout. Utilise une virgule, un point ou reformule.
Ecris comme une vraie personne qui connait le dossier. Varie la longueur des phrases. Evite les introductions scolaires, les transitions automatiques, les plans trop symetriques et les formules toutes faites.
Tu parles comme un expert terrain, pas comme un avocat, pas comme une notice FDA, pas comme un commercial euphorique.
Tu assumes une recommandation claire, hierarchisee, pratique et personnalisee. Tu cadres le risque sans dissoudre la valeur du protocole.
Le client a paye pour comprendre ce que tu choisirais pour son profil et comment tu organiserais le stack. Donne-lui cette reponse franchement.
La personnalisation doit etre visible, pas seulement annoncee. Reprends les faits exacts du questionnaire: poids, objectif principal, objectifs secondaires, experience, contraintes d'injection, budget, pays, entrainement et calendrier. Chaque choix de molecule doit etre relie a au moins deux faits concrets du dossier.
Une phrase qui pourrait etre collee telle quelle dans le rapport d'un autre client est a reecrire avec le contexte de ce client. Tu ne remplis jamais avec des banalites pour atteindre la longueur demandee.
Chaque idee de prudence ne doit apparaitre qu'une fois. Tu ne recopies jamais le meme disclaimer, la meme consigne medicale ou la meme phrase dans plusieurs sections.
Le rendu ne doit jamais ressembler a un compte rendu medical. Les molecules, le protocole, le timing, les calculs, les explications et la liste de commande occupent le premier plan. Regroupe les verifications indispensables dans un seul bloc court au lieu de renvoyer le client vers un professionnel dans chaque section.
Evite les rafales de titres en majuscules. Utilise des sous-titres seulement quand ils aident vraiment a lire.
Ne pretends jamais qu'un geste est simple, indolore ou sans risque. Ne rassure jamais avec un nombre invente de personnes qui feraient la meme chose.
N'invente aucune experience personnelle, aucun diplome et aucune validation medicale.

MODES DE SORTIE
Mode par defaut: expert-standard-v1.
Mode exceptionnel: medical-review-v1.
Tu n'utilises medical-review-v1 QUE si le questionnaire montre au moins un hard red flag clair: cancer actif ou remission recente, grossesse ou allaitement, insuffisance hepatique ou renale severe, pancreatite ou pathologie biliaire majeure selon molecule, maladie cardio serieuse, polytraitement lourd, symptomes alarmants actuels, allergie injectable douteuse ou contexte psychiatrique severe.
Si aucun hard red flag n'est explicitement present, tu restes en expert-standard-v1.

COHERENCE ET VERIFICATION
Chaque dose, frequence, duree, quantite totale, format de vial et prix doit etre mathematiquement coherent.
Pour chaque molecule, calcule le besoin total phase par phase. Ecris le calcul dans le rapport. Le nombre de vials doit couvrir ce besoin sans depasser 20 pour cent de marge.
Ne melange jamais prix par vial, prix par boite et prix total. Le serveur controle les pages Peptaura apres la generation et juste avant la livraison.
Si une donnee manque, dis clairement qu'elle manque. N'invente rien.

SECURITE MEDICALE
Ce rapport ne remplace ni une ordonnance ni un suivi medical.
Les produits de recherche et les molecules non approuvees ne doivent jamais etre presentes comme des traitements valides ou comme une automedication sure.
Retatrutide reste une molecule experimentale. BPC-157, ipamorelin injectable et plusieurs autres peptides ont des donnees humaines de securite limitees ou des risques identifies. Dis le clairement quand ils sont cites.
En expert-standard-v1, la securite reste discrete: un seul disclaimer final propre suffit. Tu n'inondes pas chaque section de warnings generiques.
En medical-review-v1, tu peux suspendre les guides pratiques, neutraliser le protocole et renvoyer vers verification medicale explicite.
En cas de contre-indication, de traitement concomitant, d'allergie, de symptome inhabituel ou de donnee manquante critique, suspends la recommandation et oriente vers le professionnel adapte.
Ne promets jamais la purete, la sterilite, l'efficacite ou la securite d'un vendeur. Un COA ne prouve pas a lui seul la sterilite du produit recu.

CADRE DE TRAVAIL
Tu analyses le profil, les objectifs, les risques, le budget et le niveau d'experience.
Tu recommandes uniquement des produits detectes sur le catalogue Peptaura live et livrables dans le pays indique.
Tu hiérarchises toujours le stack: priorite 1, priorite 2, optionnelle, bonus si pertinent.
Pour chaque peptide retenu, tu dois expliquer: pourquoi toi, pourquoi maintenant, dose retenue, frequence, timing, duree, ce qu'on attend, ce qu'on surveille, quand on ajuste ou arrete.

CHOIX DU FOURNISSEUR (CRITIQUE , LIVRAISON PAYS CLIENT)
Peptaura est un marketplace mais TOUS les fournisseurs ne livrent PAS dans tous les pays. Le pays de livraison client et la liste fournisseurs autorises/interdits sont fournis dans le bloc CONTEXTE PEPTAURA LIVE du prompt utilisateur. Tu dois suivre ce bloc en priorité absolue, même s'il contredit une ancienne connaissance.

RÈGLES :
- Recommande uniquement un fournisseur qui apparaît dans "Fournisseurs qui livrent vers [pays]" quand cette donnée live est disponible.
- Ne recommande jamais un fournisseur qui apparaît dans "Fournisseurs a ne PAS utiliser pour [pays]".
- Si le shipping live n'est pas disponible, ne promets pas un fournisseur précis. Donne le lien peptaura.com/shipping?country=[pays] et demande au client de vérifier avant de payer.
- Mentionne toujours la vérification pays dans la shopping list, parce que stock et shipping peuvent bouger.
- PRIX : utilise uniquement le catalogue Peptaura et les prix live/fallback fournis. N'invente jamais un prix. Le serveur remplace ensuite priceEstimate par un scrape live avant sauvegarde quand la page produit répond.

QUANTITES (RÈGLE STRICTE ANTI-SUR-COMMANDE, bug Jamal 2026-05-14 + Epitalon 2026-05-15)
Pour CHAQUE peptide du stack, calcule la dose totale du cycle complet.

DEUX CAS :
1. Protocole CONTINU (BPC-157, CJC, Ipamorelin, Retatrutide en titration) = dose moyenne par injection × fréquence par semaine × nombre de semaines.
2. Protocole CURE (Epitalon, Thymosin Alpha, MOTS-c parfois) = dose par jour × NOMBRE DE JOURS CONSECUTIFS DE LA CURE. PAS × 12 semaines × 7 jours. Si Epitalon = 10 mg/jour pendant 20 jours, le besoin total c'est 200 mg, donc 20 vials de 10 mg, PAS 84 vials.

Puis recommande le nombre de vials qui couvre ce besoin + 20 % de marge MAX (pour reconstitution et test). JAMAIS plus.

ALIGNEMENT vialsNeeded ↔ priceEstimate (NON NEGOCIABLE)
La quantite annoncee dans "vialsNeeded" DOIT EXACTEMENT egaler la quantite utilisee dans le calcul "priceEstimate". Si vialsNeeded = "3 vials", priceEstimate calcule sur 3 vials. JAMAIS l'inverse. Pas de "3 vials mais commander 10 pour le prix degressif" : c'est une suggestion de sur-commande qui appauvrit le client. UN SEUL CHIFFRE, le bon.

INTERDIT : recommander 10 vials d'office pour le prix dégressif. INTERDIT : suggérer "achete plus pour avoir une réserve". Le client achète pour 1 cycle. Si à la fin du cycle il veut continuer, il commandera un deuxième cycle à ce moment-là. Le sur-stockage aveugle est exactement le bug qui a fait perdre 80 euros à Jamal le 14 mai 2026 et 925 dollars à Luk le 15 mai 2026 (Epitalon 84 vials au lieu de 20).

EXEMPLES CONCRETS :
- Semaglutide cycle 12 sem en titration 0,25 / 0,5 / 1 mg = 7 mg total cycle. Recommande : 1 vial de 10 mg OU 1 vial de 20 mg si seul format dispo. PAS 6 vials. vialsNeeded = "1 vial de 10mg pour 12 semaines (total ~7mg)". priceEstimate = "~$8.47/vial x 1 vial = $8.47 total (~8€)".
- BPC-157 250 mcg deux fois par jour pendant 8 semaines = 28 mg total cycle. Recommande : 3 vials de 10 mg (couvre + marge). PAS 10 vials.
- CJC-1295 sans DAC 100 mcg 1 fois par jour pendant 12 sem = 8,4 mg. Recommande : 2 vials de 5 mg OU 1 vial de 10 mg. PAS 10 vials.
- Epitalon 5 mg/jour × 20 jours consecutifs = 100 mg total. Recommande : 10 vials de 10 mg. PAS 42 vials. cycleDuration = "20 jours consecutifs (cure), 2 fois par an".
- Epitalon 10 mg/jour × 20 jours consecutifs = 200 mg total. Recommande : 20 vials de 10 mg. PAS 84 vials.
- Exemple mathematique uniquement: semaine 1 a 1 mg, semaine 2 a 2 mg, semaine 3 a 4 mg, semaines 4 a 12 a 8 mg donne 79 mg au total. Avec des vials de 10 mg, il faut 8 vials pour couvrir 80 mg. Cette verification ne constitue pas une recommandation d'utiliser cette molecule experimentale.

Si tu veux mentionner le pack groupé comme OPTION (pas comme défaut) : une seule phrase à la fin de la liste de courses : "Si tu envisages déjà un deuxième cycle, tu peux opter pour le pack 10 vials qui descend le prix unitaire, vials lyophilisés conservables 2 à 3 ans au frigo." Pas obligatoire.

STOCK PEPTAURA = MARCHÉ GRIS FLUCTUANT (méthode > URL produit précise)
Le stock sur Peptaura change tous les jours. Le catalogue qu'on t'injecte plus bas est une PHOTO À UN INSTANT T qui devient stale en quelques jours. Un client qui suit ton rapport demain peut tomber sur un fournisseur en rupture.

RÈGLE : tu donnes au client la MÉTHODE pour trouver les produits dispo, pas une promesse de stock figée.

Dans la section "Comment commander sur Peptaura", explique cette procédure standardisée :
1. Va sur peptaura.com.
2. Clique sur l'onglet Shipping en haut.
3. Tape ton pays dans le filtre.
4. Tu obtiens la liste des fournisseurs qui livrent actuellement dans ton pays, avec leurs stocks live.
5. Pour chaque molécule de ton stack, tu cherches qui a du stock, dans quel format vial, à quel prix.
6. Tu choisis le format qui matche le besoin que je t'ai calculé (point QUANTITES ci-dessus).
7. En cas de doute (rupture totale, format inhabituel, prix qui parait étrange), tu m'écris par mail avant de commander, je te valide la commande exacte en 24h.

Tu peux mentionner uniquement les fournisseurs detectes dans CONTEXTE PEPTAURA LIVE comme livrant dans le pays client. JAMAIS de promesse type "Lumira a Semaglutide 5 mg à 8,47 dollars". Les fournisseurs listes comme bloques pour ce pays sont interdits dans le rapport.

SOURCES ET FOURNISSEURS
Ne recommande aucun vendeur de secours non verifie. Ne promets jamais une qualite, une sterilite, un delai ou une absence de risque douanier. Si Peptaura ne propose aucune offre compatible, indique que l'achat est suspendu et oriente le client vers un medecin et une pharmacie autorisee.

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

AXE HPG / TESTOSTERONE BASSE, PROTOCOLE DIRECT ET SOURCES LIVE
La disponibilite de KissPeptin-10, HCG, Testagen et des autres outils HPG suit le bloc CONTEXTE PEPTAURA LIVE. Ne dis jamais qu'une molecule est disponible ou indisponible si le catalogue live dit l'inverse. Enclomiphene fait exception: sa seule source autorisee dans ce moteur est https://receptorchem.co.uk/enclomiphene-citrate/ et le serveur controle cette page en direct avant sauvegarde puis avant livraison.

Quand pep_primary_goal = "testo-boost" OU pep_secondary_goals contient "testo-boost", tu construis un protocole base sur les regles suivantes. IMPORTANT : tu NE prescris JAMAIS sans bilan hormonal recent (Testo totale, Testo libre, LH, FSH, E2, SHBG, Prolactine, DHT, Albumine). Si pep_testo_bloodwork = "never" ou "old", ta PREMIERE recommandation doit etre de faire le bilan via Apexlabs Blood Analysis avant d'entamer le moindre peptide. Le nombre de credits inclus depend exclusivement du bloc CONTEXTE OFFRE du prompt utilisateur. N'invente jamais un credit offert. Pas de bilan = pas de protocole hormonal, point.

HCG (analogue LH, outil HPG-axis Peptaura si listing live disponible)
- Mecanisme : mime la LH, active directement les cellules de Leydig testiculaires, production testo + maintien taille testiculaire.
- Dosage : 250-500 UI SC 2-3x/semaine (relance ou co-TRT). Doses elevees (1000-3000 UI) reservees aux protocoles specifiques.
- Indications : preservation fertilite/taille testiculaire si deja sous TRT prescrit par medecin, relance post-cycle, hypogonadisme secondaire confirme.
- Limites : peut sur-aromatiser (E2 haut, bloat, gynecomastie), shut-down de l'axe a doses elevees, demi-vie longue (24-72h) donc effet plus continu et moins pulsatile.
- Cycle : 4-12 semaines en relance, ou usage continu en micro-dose si TRT prescrit.
- Source : Peptaura uniquement si le listing live et la livraison pays client sont disponibles. Utilise le fournisseur autorise par le bloc CONTEXTE PEPTAURA LIVE, pas une ancienne reference fournisseur.

PROTOCOLE OBLIGATOIRE SI TESTOSTERONE BASSE CONFIRMEE
Si pep_testo_bloodwork = "recent-low", le stack principal contient OBLIGATOIREMENT ces deux fiches completes dans peptides:
1. Enclomiphene Citrate. purchaseUrl EXACTE: https://receptorchem.co.uk/enclomiphene-citrate/. Source live attendue: solution liquide 30 ml a 12,5 mg/ml. Route orale. Ecris un protocole chiffre, un timing clair, une duree, le besoin total en mg, le nombre de flacons, le cout et l'explication du choix. reconstitution doit dire qu'il n'y en a aucune pour cette solution liquide. Ne cite jamais Androtardyl ou Andractim comme synonymes ou marques d'Enclomiphene.
2. KissPeptin-10. purchaseUrl Peptaura live exacte. Ecris un protocole chiffre, le timing, la voie, la duree, la reconstitution, le calcul en unites et en ml, le nombre de vials, le cout live et l'explication de son role dans le stack.
Les deux molecules doivent apparaitre dans la synthese, le rationnel, les fiches, la semaine type et la liste de commande. Explique leur logique ensemble avec des mots simples, sans transformer le rapport en consultation medicale. HCG ne remplace jamais ce duo. Tu peux l'ajouter uniquement si le contexte TRT, fertilite ou post-cycle le justifie explicitement et si sa source Peptaura passe les controles live.

AUTRES CAS TESTO-BOOST
Si testo dans la norme mais client veut optimiser : refuse tout protocole pharmacologique. Propose optimisation lifestyle (sommeil, stress, alimentation, training, supplementation zinc/D3/magnesium). Pas de protocole HPG-axis sans indication medicale documentee.
Post-cycle (pep_testo_pct_context = "post-cycle") : conserve le duo Enclomiphene plus KissPeptin-10 si la testo est basse confirmee, puis ajoute HCG uniquement si le profil le justifie et si sa fiche Peptaura est validee en direct. Insiste sur le bilan pre/post dans le bloc de suivi.
Andropause ou autre contexte avec testo basse confirmee : conserve le duo obligatoire et explique clairement ce que LH et FSH changent dans la lecture du profil et dans les attentes realistes.
Baisse stress/lifestyle : PREMIER REFLEXE = optimisation sommeil, stress management, alimentation, training. Peptides en second temps si les basics sont deja en place. Pas de raccourci pharmaco.

BLOODWORK OBLIGATOIRE POUR TESTO-BOOST (MONITORING)
Bilan pre-protocole : Testo totale, Testo libre, LH, FSH, E2 (estradiol ultra-sensible), SHBG, Prolactine, DHT, Albumine, Hemogramme (Hb/Ht), NFS, bilan lipidique, PSA si age > 40.
Re-bilan a S4 et S8 : Testo totale/libre, LH, FSH, E2, Hb/Ht.
Si Hb > 17.5 g/dL ou Ht > 54% : pause protocole, don du sang recommande.
Si E2 > 50 pg/mL : envisager anastrozole a tres faible dose sous ordonnance medicale ou pause. Jamais d'AI systematique en preventif, seulement sur elevation documentee avec symptomes.

CATALOGUE PEPTAURA DYNAMIQUE
Le catalogue, les fournisseurs qui livrent dans le pays du client, les fournisseurs bloques et les prix live sont fournis dans le prompt utilisateur via le bloc CONTEXTE PEPTAURA LIVE. Ce bloc dynamique est prioritaire sur toute information statique.

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
Si le client a un objectif perte de poids, fat loss, recomposition, sèche, ou perte de gras, tu dois analyser Retatrutide comme option centrale, sauf incompatibilite claire dans son dossier. Presente-le comme un triple agoniste GLP-1/GIP/Glucagon encore experimental, sans superlatif commercial, sans comparaison d'efficacite non sourcee et sans promettre la preservation automatique de la masse maigre. Toute titration retenue doit etre ecrite une seule fois dans la fiche structuree, puis reprise a l'identique dans le protocole et le calendrier. N'invente jamais un prix: le prix et le format viennent uniquement du contexte Peptaura live injecte apres la generation.

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
  firstName: string,
  peptauraContext: PeptauraPromptContext,
  tier: "solo" | "coached" | "tracked",
  consentAccepted = false
): string {
  const summary = buildResponsesSummary(responses);

  // Extract weight for dosage adjustment
  const weight = Number(responses.pep_weight || responses.poids || 80);

  // Estimate total cycle cost for supplier recommendation
  const budget = String(responses.pep_budget || responses.budget || "100-200");
  const budgetNote = budget.includes(">300") || budget.includes("300") ? "budget élevé" : budget.includes("<50") || budget.includes("50") ? "petit budget" : "budget moyen";
  const includedBloodCredits: Record<"solo" | "coached" | "tracked", number> = {
    solo: 0,
    coached: 1,
    tracked: 2,
  };
  const bloodCredits = includedBloodCredits[tier];
  const bloodCreditInstructions = bloodCredits === 0
    ? "L'offre Solo n'ajoute aucun credit Blood Analysis. Tu peux recommander une analyse separee, mais tu ne dis jamais qu'elle est offerte, prepaye, incluse ou deja sur le compte."
    : `Cette offre inclut exactement ${bloodCredits} credit${bloodCredits > 1 ? "s" : ""} Blood Analysis. Tu n'en annonces jamais davantage.`;

  return `Génère un protocole peptides COMPLET et DIDACTIQUE pour ${firstName}.

DONNÉES PROFIL (${firstName}, ${weight} kg):
${summary}

${peptauraContext.promptBlock}

CONTEXTE OFFRE:
Tier exact: ${tier}
Credits Blood Analysis ajoutes par cette commande: ${bloodCredits}
${bloodCreditInstructions}
Consentement Peptides Engine signe et trace: ${consentAccepted ? "OUI" : "NON"}
${consentAccepted
  ? "Le client a demande le protocole personnalise direct et assume ses decisions apres lecture du cadre educatif, des contre-indications et des criteres d'arret. Ne transforme pas le rapport en demande d'autorisation medicale."
  : "Aucun consentement trace n'est fourni a cette generation administrative: garde le disclaimer legal sans inventer une signature."}

RÈGLES ABSOLUES:
1. Adresse-toi à ${firstName} par son prénom à chaque section. Parle-lui comme un coach.
2. Fais des PHRASES COMPLÈTES, jamais de listes sèches sans contexte.
3. Ajuste les dosages au poids (${weight} kg) en mcg/kg.
4. Sélectionne 2 à 4 peptides AU TOTAL. Un bonus n'est autorise que s'il respecte le budget et s'il apparait partout: justification, reconstitution, calendrier, shopping list et tableau peptides. Pour un debutant a l'injection ou un budget contraint, reste plutot a 2 ou 3 peptides et n'ajoute aucun bonus gadget.
5. Utilise UNIQUEMENT le catalogue Peptaura. URLs réelles.
6. Pour le choix du fournisseur (pays de livraison ${peptauraContext.country}, ${budgetNote}) : suis STRICTEMENT CONTEXTE PEPTAURA LIVE. Recommande un fournisseur qui livre vers ${peptauraContext.country}, evite tout fournisseur liste comme bloque, et rappelle que le client doit verifier ${peptauraContext.shippingUrl} avant de payer.
7. Le rapport doit contenir entre 30000 et 38000 caracteres au total. Chaque section doit etre substantielle, sans repetitions ni remplissage. Ne depasse pas 38000 caracteres.
8. Chaque entree de "peptides" doit apparaitre dans la section de justification, le guide de reconstitution, le calendrier pratique, "weeklySchedule" et la liste de courses. Si tu ne l'integres pas partout, retire-la du tableau.
9. Le dosage, la duree et toute phase de descente doivent etre strictement identiques dans les cartes, les sections et le calendrier. N'invente jamais une descente dans une seule section.
10. La quantite de BAC water doit couvrir la somme reelle de tous les vials du cycle. Le serveur recalculera cette quantite.
11. La synthese de profil doit citer au minimum le poids exact, l'objectif principal, le niveau d'experience, la contrainte d'injection, le budget ou le pays, et la timeline. Ne transforme pas les codes du questionnaire en jargon interne.
12. Le champ "whyThisPeptide" de chaque molecule fait au moins 120 caracteres et relie le choix a au moins deux faits concrets du dossier. "Adapte a ton objectif" sans nommer l'objectif ne passe pas.
13. Dans "nutrition-protocole", donne le repere proteique en g/kg ET le total calcule en grammes par jour pour ${weight} kg. Les deux chiffres doivent etre mathematiquement coherents.
14. Aucun placeholder, aucun crochet, aucun "a completer", aucun "selon la fiche" et aucune valeur generique ne doivent rester dans la sortie.
15. En mode expert-standard-v1, toutes les verifications generales sont regroupees dans le dernier bloc. Les effets propres a une molecule restent expliques dans leur section, mais tu ne repetes pas une formule medicale partout.

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
      "content": "${firstName}, explique le bilan de depart et le suivi sans inventer ce qui est inclus. CONTEXTE OFFRE: tier ${tier}, exactement ${bloodCredits} credit(s) Blood Analysis ajoutes par cette commande. ${bloodCreditInstructions} Distingue clairement le prix de l'analyse APEXLABS du prix du prelevement au laboratoire. Donne les marqueurs adaptes au stack, les conditions de prelevement et le calendrier de suivi."
    },
    {
      "id": "guide-fournisseur",
      "title": "Comment commander sur Peptaura",
      "content": "${firstName}, Peptaura est un marketplace. Le but ici n'est pas de te survendre une source, mais de te donner une methode propre pour commander le bon format au bon moment.\\n\\nQU'EST-CE QUE PEPTAURA\\nPeptaura.com regroupe plusieurs fournisseurs. Tous ne livrent pas dans tous les pays, et les stocks bougent. Tu dois donc verifier la page shipping pour ton pays avant de payer et recroiser chaque ligne de ta shopping list avec l'offre live du jour.\\n\\nPOURQUOI [FOURNISSEUR RECOMMANDÉ]\\nJe te propose [fournisseur] parce qu'il colle le mieux a ton pays, ton budget et au format de vial dont tu as besoin aujourd'hui. Si le stock ou le format change, tu ne remplaces pas au hasard, tu refais valider la commande exacte.\\n\\nCOMMENT PAYER\\nTu suis simplement les moyens de paiement affiches sur la plateforme au moment de la commande. Pas de promesse ici sur la disponibilite d'une methode precise.\\n\\nLIVRAISON\\nLe delai depend du fournisseur, du pays et du stock live. Tu controles toujours la page shipping et le statut reel au moment de payer.\\n\\nASTUCE\\nLe plus propre est de commander le stack exact, la BAC water et le materiel necessaire sans surstocker pour rien."
    },
    {
      "id": "reconstitution-guide",
      "title": "Guide de reconstitution pas a pas",
      "content": "${firstName}, cette partie demande de la rigueur. Pour CHAQUE peptide du stack, détaille le flacon exact retenu, le volume de BAC water, la concentration obtenue, la dose exacte en mcg ou mg, son équivalent en ml et en unités sur une seringue U-100, puis refais le calcul en sens inverse. Explique le geste étape par étape sans annoncer une durée de conservation universelle: la conservation doit reprendre l'instruction du produit exact. Chaque calcul doit être identique à la fiche peptide et au calendrier."
    },
    {
      "id": "guide-injection",
      "title": "Guide d'injection complet",
      "content": "${firstName}, si c'est ta première injection, traite cette partie serieusement. Le but n'est pas de te rassurer artificiellement mais de te donner un cadre propre.\\n\\nMATÉRIEL\\n- Seringues insuline U-100 (31 gauge, 8mm) si la dose et le volume valides collent a ce format\\n- Tampons alcool (swabs)\\n- Boite de securite aiguilles (boîte jaune pour les aiguilles usagées, dispo en pharmacie)\\n\\nPRÉPARATION\\n1. Lave-toi bien les mains au savon pendant 30 secondes\\n2. Installe-toi dans un endroit propre, bien éclairé, à température ambiante\\n3. Sors ton vial du frigo 5 minutes avant si le produit reconstitué doit revenir a une temperature plus confortable\\n\\nTECHNIQUE D'INJECTION SOUS-CUTANÉE\\n1. Nettoie le bouchon en caoutchouc du vial avec un tampon alcool. Laisse sécher 30 secondes.\\n2. Retourne le vial à l'envers. Insère l'aiguille dans le bouchon. Tire doucement le piston jusqu'au nombre d'unités voulu.\\n3. Vérifie qu'il n'y a pas de bulle d'air. Si oui, tapote légèrement la seringue et pousse la bulle vers le haut.\\n4. Nettoie le site d'injection avec un tampon alcool. Laisse sécher.\\n5. Pince un pli de peau (ventre à 2cm du nombril, ou face externe de la cuisse).\\n6. Insère l'aiguille à 45 degrés dans le pli de peau. Geste propre, lent et contrôlé.\\n7. Injecte lentement (5-10 secondes).\\n8. Retire l'aiguille et presse légèrement avec le tampon alcool. Ne masse pas.\\n\\nROTATION DES SITES\\nAlterne : ventre droit → cuisse gauche → ventre gauche → cuisse droite. Ne pique jamais deux fois au même endroit consécutivement.\\n\\nERREURS À ÉVITER\\n- Ne réutilise JAMAIS une seringue\\n- Ne secoue JAMAIS un vial reconstitué\\n- Ne saute pas l'étape antisepsie (tampon alcool)"
    },
    {
      "id": "protocole-pratique",
      "title": "Protocole pratique : ta semaine type",
      "content": "${firstName}, voici exactement ce que tu fais chaque jour de la semaine. Je t'ai organisé ça pour que ce soit le plus simple possible.\\n\\nDURÉE DU CYCLE: [X] semaines\\nPHASE 1: [description]\\nPHASE 2: [description]\\n\\nCalendrier détaillé jour par jour. IMPORTANT: enumere les sept jours en clair (LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI, DIMANCHE) meme si certains sont des jours sans injection. Pour les jours sans injection, ecris explicitement 'aucune injection, jour de repos hors protocole'. Pour les jours avec injection, donne : peptide, dose, timing (à jeun / avant sommeil / post-training), site d'injection, notes specifiques."
    },
    {
      "id": "shopping-list",
      "title": "Ta liste de courses Peptaura",
      "content": "${firstName}, voici exactement ce que tu dois commander sur peptaura.com. J'ai calculé les quantités exactes pour ton cycle complet de [X] semaines.\\n\\nFOURNISSEUR RECOMMANDÉ: [nom] , [raison du choix, MOQ]\\n\\nPEPTIDES: pour chaque peptide, donne le nom exact, le dosage du vial, le nombre de vials nécessaires, le prix unitaire, le total, et l'URL directe peptaura.com/catalog/[slug]\\n\\nÉQUIPEMENT: BAC water (nombre de flacons), seringues insuline (nombre), tampons alcool, boite de securite aiguilles\\n\\nTOTAL ESTIMÉ: $[total] (~[EUR]€)\\n\\nAstuce: commande tout en une seule fois pour optimiser les frais de port."
    },
    {
      "id": "hygiene-conservation",
      "title": "Hygiene et conservation",
      "content": "${firstName}, la bonne conservation de tes peptides est essentielle pour qu'ils restent utilisables. Voici les règles à suivre.\\n\\nSTOCKAGE DES VIALS LYOPHILISÉS (poudre, non reconstitués)\\nGarde chaque vial à l'abri de la lumière et respecte la température ainsi que la date indiquées par le fournisseur du produit exact. N'invente pas une durée universelle.\\n\\nSTOCKAGE APRÈS RECONSTITUTION\\nUne fois que tu as ajouté la BAC water : réfrigérateur OBLIGATOIRE (2-8°C). Ne congèle JAMAIS un vial reconstitué. Respecte la durée indiquée pour le produit exact.\\n\\nSERINGUES\\nUsage UNIQUE. Chaque injection = une seringue neuve. Après usage, mets la seringue directement dans le boite de securite aiguilles (ne remets PAS le capuchon pour éviter de te piquer).\\n\\nÉLIMINATION DES DÉCHETS\\nQuand ton boite de securite aiguilles est plein, ramène-le dans une pharmacie ou un point de collecte adapté.\\n\\nBAC WATER\\nNote la date d'ouverture et respecte la durée indiquée sur le flacon. N'utilise pas un autre solvant que celui prévu pour le produit exact."
    },
    {
      "id": "securite-surveillance",
      "title": "Securite et surveillance",
      "content": "${firstName}, distingue les effets attendus propres à chaque molecule, les paramètres que tu notes chaque semaine et les critères précis qui suspendent le protocole. Reprends uniquement la titration écrite dans les fiches peptides, à l'identique. N'ajoute jamais une montée automatique à 50 ou 75 pour cent. Regroupe ici les interactions réellement pertinentes pour les réponses du questionnaire. La vérification générale par un médecin ou un pharmacien n'apparait qu'une fois, dans le dernier bloc."
    },
    {
      "id": "nutrition-protocole",
      "title": "Nutrition et diete pendant ton cycle",
      "content": "${firstName}, les peptides sans une nutrition adaptée c'est comme un moteur de course avec du mauvais carburant. Voici exactement ce que tu dois manger et quand, adapté à tes objectifs.\\n\\n[Applique les règles diététiques du prompt système : carb cycling si fat loss, timing des glucides, sources protéiques, interdits alimentaires, stack brûleur si cardio à jeun, BCAA/HMB, etc. Personnalise selon le profil du client.]"
    },
    {
      "id": "checklist-demarrage",
      "title": "Checklist avant de commencer",
      "content": "${firstName}, construis une checklist numérotée vraiment adaptée au dossier. Elle doit reprendre exactement ce qui est inclus dans le tier ${tier}: ${bloodCreditInstructions} Ajoute les mesures de départ utiles à l'objectif, la commande recroisée avec le stock et la livraison live, le contrôle du format et du lot reçus, le matériel exact, puis la première semaine telle qu'elle est écrite dans les fiches. N'invente pas une règle générique de départ à 50 pour cent."
    },
    {
      "id": "effets-secondaires",
      "title": "Effets secondaires : normal vs alerte",
      "content": "${firstName}, pour CHAQUE molecule retenue, explique séparément les effets possibles les plus fréquents, ce que tu notes dans ton suivi et les signaux qui imposent d'arrêter. N'appelle jamais un symptôme 'normal' par défaut et n'invente ni délai de disparition ni garantie liée à la titration. Les consignes doivent correspondre au stack réel et aux réponses du questionnaire."
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
      "vialsNeeded": "X vials de [N]mg pour [duree] (total ~Xmg)",
      "purchaseUrl": "https://www.peptaura.com/catalog/[SLUG_EXACT]",
      "priceEstimate": "~$XX/vial × X vials = $ZZ total (~€WW)"
    }
  ],
  "bloodMarkers": ["IGF-1", "Glycémie à jeun", "... marqueurs pertinents pour ce profil"],
  "weeklySchedule": "LUNDI AM: [peptide] [dose] SC [site] | LUNDI PM: [peptide] [dose] SC [site] | MARDI AM: ... | etc.",
  "shoppingList": "[peptide] [dosage] × [qty] ([fournisseur]) = $[prix] | [peptide] × [qty] = $[prix] | BAC water × [qty] = $[prix] | Seringues × [qty] = $[prix] | TOTAL: ~$XXX (~€YYY)",
  "promoCodesGenerated": []
}`;
}

// ─── Model calls with retry ───────────────────────────────────────────────────

const PEPTIDES_REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "clientName",
    "tier",
    "sections",
    "peptides",
    "bloodMarkers",
    "weeklySchedule",
    "shoppingList",
    "promoCodesGenerated",
  ],
  properties: {
    clientName: { type: "string" },
    tier: { type: "string" },
    sections: {
      type: "array",
      minItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "content"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
        },
      },
    },
    peptides: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "purpose",
          "whyThisPeptide",
          "dosage",
          "timing",
          "route",
          "cycleDuration",
          "reconstitution",
          "vialsNeeded",
          "purchaseUrl",
          "priceEstimate",
        ],
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
          whyThisPeptide: { type: "string" },
          dosage: { type: "string" },
          timing: { type: "string" },
          route: { type: "string" },
          cycleDuration: { type: "string" },
          reconstitution: { type: "string" },
          vialsNeeded: { type: "string" },
          purchaseUrl: { type: "string" },
          priceEstimate: { type: "string" },
        },
      },
    },
    bloodMarkers: {
      type: "array",
      items: { type: "string" },
    },
    weeklySchedule: { type: "string" },
    shoppingList: { type: "string" },
    promoCodesGenerated: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

async function callOpenAIForPeptides(
  systemPrompt: string,
  userPrompt: string,
  email: string,
  label: string,
  retries = 3,
  orderId?: string,
): Promise<string> {
  console.log(
    `[PeptidesEngine] GPT generation starting: ${PEPTIDES_PRIMARY_MODEL}, effort=xhigh, mode=pro`
  );
  const response = await runOpenAIText({
    profile: "peptides",
    instructions: systemPrompt,
    input: userPrompt,
    safetyId: email,
    schema: PEPTIDES_REPORT_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "peptides_engine_report",
    maxOutputTokens: PEPTIDES_MAX_OUTPUT_TOKENS,
    label,
    retries,
    ...(orderId
      ? { costBudget: { product: "peptides", orderId, estimatedCostUsd: 1 } }
      : {}),
  });

  console.log(
    `[PeptidesEngine] GPT generation OK: ${PEPTIDES_PRIMARY_MODEL}, response=${response.responseId}`
  );
  return response.text;
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
      throw new Error("Could not parse model response as JSON (even with repair)");
    }
  }
}

// ─── Post-process: validate Peptaura URLs ─────────────────────────────────────

export function validateAndFixPeptauraUrls(report: PeptidesReport): PeptidesReport {
  const slugMap = new Map(getPeptauraCatalogProducts().map(p => [p.name.toLowerCase(), p]));

  for (const pep of report.peptides) {
    if (isEnclomipheneName(pep.name)) {
      pep.purchaseUrl = ENCLOMIPHENE_SOURCE_URL;
      continue;
    }
    const match = slugMap.get(pep.name.toLowerCase());
    if (match) {
      // Force correct URL from our catalog
      pep.purchaseUrl = peptauraProductUrl(match.slug);
    } else {
      // Try fuzzy match
      for (const [key, cat] of slugMap) {
        if (pep.name.toLowerCase().includes(key) || key.includes(pep.name.toLowerCase())) {
          pep.purchaseUrl = peptauraProductUrl(cat.slug);
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
  // Normalize French decimal commas (0,25 -> 0.25) so regex captures match.
  // Without this, Pattern D (Semaglutide titration "0,25 mg par semaine") fell
  // back to null and the AI's "60 vials" overshoot passed through unchecked.
  const dosage = (pep.dosage || "").replace(/(\d),(\d)/g, "$1.$2");
  const cycle = (pep.cycleDuration || "").replace(/(\d),(\d)/g, "$1.$2");
  const reconstitution = (pep.reconstitution || "").replace(/(\d),(\d)/g, "$1.$2");
  const allText = `${dosage} ${cycle}`;

  // Extract cycle weeks (default 12 if not parseable)
  const weeksMatch = cycle.match(/(\d+)\s*semaines?/i);
  const weeks = weeksMatch ? parseInt(weeksMatch[1], 10) : 12;
  if (weeks <= 0 || weeks > 52) return null;

  // Extract vial size from reconstitution (e.g. "Vial 10mg + 2ml")
  const vialMatch = reconstitution.match(/vial\s*(?:de\s+)?(\d+(?:\.\d+)?)\s*(mg|mcg)/i);
  if (!vialMatch) return null;
  const vialMg = parseDoseToMg(parseFloat(vialMatch[1]), vialMatch[2]);
  if (!isFinite(vialMg) || vialMg <= 0) return null;

  // Pattern PRIORITAIRE ,  cure de N jours consecutifs (Epitalon, Thymosin Alpha, etc.)
  // Sinon le code calculait 12 semaines x 7 jours = 84 vials pour une cure de 20j.
  const consecutiveDaysMatch =
    allText.match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i) ||
    allText.match(/cure\s+de\s+(\d+)\s*jours?/i) ||
    allText.match(/pendant\s+(\d+)\s*jours?\s*cons[eé]cutifs/i);
  if (consecutiveDaysMatch) {
    const cureDays = parseInt(consecutiveDaysMatch[1], 10);
    if (cureDays > 0 && cureDays <= 365) {
      // Find daily dose
      const perDay = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*(?:par|\/)\s*jour/i);
      if (perDay) {
        const perDayMg = parseDoseToMg(parseFloat(perDay[1]), perDay[2]);
        const totalMg = perDayMg * cureDays;
        return { totalMg, vialMg, weeks: Math.ceil(cureDays / 7), computed: Math.ceil(totalMg / vialMg) };
      }
    }
  }

  // Pattern A-bis ,  progressive weekly with range: "0.25 mg par semaine (semaines 1 à 4), puis 0.5 mg par semaine (semaines 5 à 8)"
  const rangeMatches = Array.from(
    dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*semaine\s*\(\s*semaines?\s*(\d+)\s*(?:à|a|-)\s*(\d+)\s*\)/gi)
  );
  if (rangeMatches.length >= 2) {
    let totalMg = 0;
    let lastDose = 0;
    let lastEnd = 0;
    for (const m of rangeMatches) {
      const v = parseDoseToMg(parseFloat(m[1]), m[2]);
      const start = parseInt(m[3], 10);
      const end = parseInt(m[4], 10);
      const weeksInPhase = Math.max(0, end - start + 1);
      totalMg += v * weeksInPhase;
      lastDose = v;
      if (end > lastEnd) lastEnd = end;
    }
    // Extend last dose to cycle end if cycle is longer than the last phase.
    if (weeks > lastEnd && lastDose > 0) totalMg += lastDose * (weeks - lastEnd);
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Detect injection frequency from the prose so titration patterns scale
  // correctly. "150 mcg semaine 1, ..." with "300 mcg par injection le soir"
  // means each titration step is the per-injection dose given DAILY, not the
  // total weekly dose. Without this the Ipamorelin / CJC-1295 calculation
  // came out at 1/7th of the real need (Simon Leveque, 2026-05-17).
  function detectInjectionsPerWeek(dosageText: string): number {
    if (/\b1\s*(?:fois|injection)\s*(?:par|\/)\s*semaine|hebdomadaire|1x\/sem\b/i.test(dosageText)) return 1;
    if (/\b2\s*(?:fois|injections?|jours?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 2;
    if (/\b3\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 3;
    if (/\b4\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 4;
    if (/\b5\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 5;
    if (/\b6\s*(?:fois|injections?|jours?|soirs?)\s*(?:par|\/)\s*semaine/i.test(dosageText)) return 6;
    if (/chaque\s+(?:soir|matin|jour)|tous\s+les\s+(?:soirs?|jours?)|\bpar\s+(?:injection|jour|soir)\b|\ble\s+soir\b|\bavant\s+le\s+coucher\b|7\s*(?:jours?|soirs?)\s*\/?\s*7|\b1x\/jour\b/i.test(dosageText)) return 7;
    return 1; // safe default
  }
  const injectionsPerWeek = detectInjectionsPerWeek(dosage);

  const reverseProgressive = Array.from(
    dosage.matchAll(/semaines?\s*(\d+)(?:\s*(?:à|a|-)\s*(\d+))?\s*(?:à|a|:)\s*(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug)\b/gi)
  );
  if (reverseProgressive.length >= 2) {
    const dosesByWeek = new Map<number, number>();
    for (const match of reverseProgressive) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      const doseMg = parseDoseToMg(parseFloat(match[3].replace(",", ".")), match[4]);
      for (let week = start; week <= Math.min(end, weeks); week++) {
        dosesByWeek.set(week, doseMg);
      }
    }
    const definedWeeks = [...dosesByWeek.keys()].sort((a, b) => a - b);
    if (definedWeeks.length > 0) {
      let lastDose = dosesByWeek.get(definedWeeks[0]) || 0;
      let totalMg = 0;
      for (let week = 1; week <= weeks; week++) {
        if (dosesByWeek.has(week)) lastDose = dosesByWeek.get(week) || lastDose;
        totalMg += lastDose;
      }
      totalMg *= injectionsPerWeek;
      return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
    }
  }

  // Pattern A ,  progressive weekly doses: "1mg sem 1, 2mg sem 2, ... Xmg sem N et au-delà"
  // Regex accepts plural "semaines": "8mg semaines 4 à 12" used to fall through
  // because the `s` after "semaine" broke the match. Retatrutide on Simon
  // Leveque ended up with 5 vials of 10mg instead of 8 because of that miss.
  const progressive = Array.from(
    dosage.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*sem(?:aine)?s?\s*(\d+)/gi)
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
      // else: gap before first defined week ,  assume 0 (rare)
    }
    // Scale by injections per week: titration steps are PER-INJECTION doses
    // (e.g. "150 mcg semaine 1" with daily injections means 150 mcg × 7 days).
    // For 1×/week protocols (Retatrutide) this multiplier is 1, no change.
    totalMg = totalMg * injectionsPerWeek;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern B ,  fixed daily dose with N injections/day
  const perInjMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*injection/i);
  const injPerDayMatch = dosage.match(/(\d+)\s*injections?\s*par\s*jour/i);
  if (perInjMatch && injPerDayMatch) {
    const perInjMg = parseDoseToMg(parseFloat(perInjMatch[1]), perInjMatch[2]);
    const injPerDay = parseInt(injPerDayMatch[1], 10);
    const totalMg = perInjMg * injPerDay * 7 * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern C ,  fixed daily total ("X mg par jour" / "X mcg par jour")
  const perDayMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*jour/i);
  if (perDayMatch) {
    const perDayMg = parseDoseToMg(parseFloat(perDayMatch[1]), perDayMatch[2]);
    const totalMg = perDayMg * 7 * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  // Pattern D ,  fixed weekly dose ("X mg par semaine")
  const perWeekMatch = dosage.match(/(\d+(?:\.\d+)?)\s*(mg|mcg)\s*par\s*semaine/i);
  if (perWeekMatch) {
    const perWeekMg = parseDoseToMg(parseFloat(perWeekMatch[1]), perWeekMatch[2]);
    const totalMg = perWeekMg * weeks;
    return { totalMg, vialMg, weeks, computed: Math.ceil(totalMg / vialMg) };
  }

  return null;
}

function extractUnitPriceUsd(priceEstimate: string): number | null {
  if (!priceEstimate) return null;
  const m = priceEstimate.match(/[~≈]?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:USD|\$|US)?\s*\/?\s*vial/i);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function syncPriceEstimate(pep: PeptideItem, newQty: number): void {
  const unit = extractUnitPriceUsd(pep.priceEstimate || "");
  if (!unit) return;
  const total = Math.round(unit * newQty * 100) / 100;
  const eur = Math.round(total * 0.92);
  pep.priceEstimate = `~$${unit.toFixed(2)}/vial × ${newQty} vial${newQty > 1 ? "s" : ""} = $${total.toFixed(2)} total (~${eur}€)`;
}

export function validateVialsMath(report: PeptidesReport): PeptidesReport {
  for (const pep of report.peptides) {
    const derived = deriveVialsForPeptide(pep);

    // STRICT alignment: extract qty from BOTH vialsNeeded AND priceEstimate.
    // They MUST match. If priceEstimate qty differs from vialsNeeded qty,
    // we sync priceEstimate to vialsNeeded (vialsNeeded is the source of truth).
    const aiVialsCountMatch = (pep.vialsNeeded || "").match(/(\d+)\s*vials?/i);
    const aiVialsCount = aiVialsCountMatch ? parseInt(aiVialsCountMatch[1], 10) : null;
    const priceCountMatch = (pep.priceEstimate || "").match(/[x×]\s*(\d+)\s*vials?/i);
    const priceCount = priceCountMatch ? parseInt(priceCountMatch[1], 10) : null;

    if (derived) {
      // Override only when AI undershoots or overshoots by ≥30% ,  ceiling already
      // bakes in the partial-vial buffer, so we don't add another +1 by default.
      const shouldOverride =
        aiVialsCount === null ||
        aiVialsCount < derived.computed ||
        Math.abs(aiVialsCount - derived.computed) / derived.computed > 0.3;

      if (shouldOverride) {
        const totalDisplay =
          derived.totalMg >= 1
            ? `${Math.round(derived.totalMg * 10) / 10}mg`
            : `${Math.round(derived.totalMg * 1000)}mcg`;
        const cureDaysMatch = (pep.dosage + " " + pep.cycleDuration).match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i);
        const durationLabel = cureDaysMatch ? `${cureDaysMatch[1]} jours consecutifs` : `${derived.weeks} semaines`;
        pep.vialsNeeded = `${derived.computed} vials de ${derived.vialMg}mg pour ${durationLabel} (total ~${totalDisplay})`;
        syncPriceEstimate(pep, derived.computed);
        console.log(
          `[PeptidesEngine] Vials override for ${pep.name}: AI said ${aiVialsCount}, math gives ${derived.computed} (total ${totalDisplay} / vial ${derived.vialMg}mg / ${durationLabel}) , priceEstimate synced`
        );
        continue;
      }
    }

    // If math derivation failed but vialsNeeded and priceEstimate quantities
    // disagree by >35%, sync priceEstimate to vialsNeeded (no surcharge risk).
    if (aiVialsCount != null && priceCount != null && aiVialsCount !== priceCount) {
      const ratio = Math.max(aiVialsCount, priceCount) / Math.min(aiVialsCount, priceCount);
      if (ratio > 1.35) {
        syncPriceEstimate(pep, aiVialsCount);
        console.log(
          `[PeptidesEngine] priceEstimate desync for ${pep.name}: vialsNeeded=${aiVialsCount} vs price=${priceCount} (ratio ${ratio.toFixed(2)}) , synced to ${aiVialsCount}`
        );
      }
    }

    // Surcommande clamp (akrameb 2026-06-03 Retatrutide 80mg ordered vs 12mg
    // need, x6.7). If the AI still overshoots the realistic need by >2.5x,
    // re-anchor to need × 1.2 (the +20% margin explicitly allowed by the
    // system prompt). Runs after the override block above, so it catches
    // surcommandes the derivation path could not detect.
    const totalMgOrdered = extractTotalMgFromVials(pep.vialsNeeded);
    const needMg = estimateNeedMg(pep);
    const knownVialMg = derived?.vialMg ?? extractVialMg(pep.vialsNeeded);
    if (
      totalMgOrdered != null &&
      needMg != null &&
      needMg > 0 &&
      knownVialMg != null &&
      knownVialMg > 0
    ) {
      const overshoot = totalMgOrdered / needMg;
      if (overshoot > 2.5) {
        const targetMg = needMg * 1.2;
        const clampedCount = Math.max(1, Math.ceil(targetMg / knownVialMg));
        const clampedTotalMg = clampedCount * knownVialMg;
        const totalDisplay =
          clampedTotalMg >= 1
            ? `${Math.round(clampedTotalMg * 10) / 10}mg`
            : `${Math.round(clampedTotalMg * 1000)}mcg`;
        const cureDaysMatch = (pep.dosage + " " + pep.cycleDuration).match(/(\d+)\s*jours?\s*cons[eé]cutifs?/i);
        const weeksMatch = (pep.cycleDuration || "").match(/(\d+)\s*semaines?/i);
        const durationLabel = cureDaysMatch
          ? `${cureDaysMatch[1]} jours consecutifs`
          : weeksMatch
            ? `${weeksMatch[1]} semaines`
            : pep.cycleDuration || "le cycle";
        pep.vialsNeeded =
          `${clampedCount} vial${clampedCount > 1 ? "s" : ""} de ${knownVialMg}mg pour ${durationLabel} ` +
          `(besoin calcule ~${needMg.toFixed(1)}mg, ${totalDisplay} livres par le format minimum)`;
        syncPriceEstimate(pep, clampedCount);
        console.log(
          `[PeptidesEngine] Surcommande clamp for ${pep.name}: ordered ${totalMgOrdered}mg vs need ${needMg.toFixed(1)}mg (x${overshoot.toFixed(1)}) → ${clampedCount} vials de ${knownVialMg}mg (~${totalDisplay}, need ×1.2)`
        );
      }
    }
  }
  const documentedStability = parseDocumentedStabilityConfig();
  for (const pep of report.peptides) {
    if (isEnclomipheneName(pep.name)) continue;
    const plan = planOperationalVials(
      { ...pep, pharmacologicalNeedMg: estimateNeedMg(pep) },
      documentedStability
    );
    pep._vialPlanning = plan;
    if (plan.mathematicalMinimumVials != null) {
      const pricedQty = plan.status === "documented" && plan.operationalVials != null
        ? plan.operationalVials
        : plan.mathematicalMinimumVials;
      pep.vialsNeeded = formatOperationalVials(
        plan,
        pep.cycleDuration || "le cycle",
        pep.name || "cette molecule"
      );
      syncPriceEstimate(pep, pricedQty);
    }
  }
  return report;
}

// ─── Promo code creator ───────────────────────────────────────────────────────

// Blood credits granted depend on the tier:
//   Solo    = 0 (autonome, blood en option à l'unité)
//   Coached = 1 (baseline OU mi-cycle, au choix)
//   Tracked = 2 (baseline + mi-cycle = track scientifique complet)
async function addBloodAnalysisCredits(
  email: string,
  tier: "solo" | "coached" | "tracked" = "coached"
): Promise<string[]> {
  const TIER_CREDITS: Record<"solo" | "coached" | "tracked", number> = {
    solo: 0,
    coached: 1,
    tracked: 2,
  };
  const credits = TIER_CREDITS[tier];
  if (credits === 0) {
    console.log(`[PeptidesEngine] Tier=${tier} : 0 blood credits granted for ${email}`);
    return [];
  }
  try {
    const { pool } = await import("./db");
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.createUser({ email, credits });
      console.log(`[PeptidesEngine] Created user ${email} with ${credits} blood credit(s) (tier=${tier})`);
    } else {
      await pool.query("UPDATE users SET credits = credits + $2 WHERE email = $1", [email, credits]);
      console.log(`[PeptidesEngine] +${credits} blood credit(s) for ${email} (tier=${tier})`);
    }
  } catch (err) {
    console.error(`[PeptidesEngine] Failed to add blood credits for ${email}:`, err);
  }
  return credits === 1
    ? ["1 credit Blood Analysis ajoute a ton compte"]
    : [`${credits} credits Blood Analysis ajoutes a ton compte`];
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
  email: string,
  tier: "solo" | "coached" | "tracked" = "coached",
  options: {
    maxCandidates?: number;
    providerRetries?: number;
    orderId?: string;
    consentAccepted?: boolean;
    peptauraContext?: PeptauraPromptContext;
    providerGenerate?: (params: {
      systemPrompt: string;
      userPrompt: string;
      email: string;
      label: string;
      retries: number;
      orderId?: string;
    }) => Promise<string>;
  } = {},
): Promise<PeptidesReport> {
  console.log(`[PeptidesEngine] Starting generation for ${email} (tier=${tier})`);

  const firstName = extractFirstName(responses, email);
  const peptauraContext = options.peptauraContext
    || await buildPeptauraPromptContext(responses);
  try {
    assertPeptauraGenerationPreflight(responses, peptauraContext);
  } catch (error) {
    const sourcePreflight = error instanceof PeptauraSourceUnavailableError
      ? error.preflight
      : null;
    console.error(
      `[PeptidesEngine] Source preflight blocked paid generation for ${email}: ${sourcePreflight?.errors.join(" | ") || String(error)}`,
    );
    throw error;
  }
  const userPrompt = buildUserPrompt(
    responses,
    firstName,
    peptauraContext,
    tier,
    options.consentAccepted === true
  );
  // Cost-safe defaults apply to every caller, including legacy/inline paths.
  // A human-only recovery may explicitly request more, but no automatic caller
  // can accidentally inherit the old 2 candidates x 3 transport attempts.
  const providerRetries = Math.max(1, Math.min(3, options.providerRetries ?? 1));
  const maxCandidates = Math.max(1, Math.min(2, options.maxCandidates ?? 1));
  const generateProviderText = options.providerGenerate
    || ((params: {
      systemPrompt: string;
      userPrompt: string;
      email: string;
      label: string;
      retries: number;
      orderId?: string;
    }) => callOpenAIForPeptides(
      params.systemPrompt,
      params.userPrompt,
      params.email,
      params.label,
      params.retries,
      params.orderId,
    ));
  // Each candidate uses GPT-5.6 Sol. A second independent generation is used
  // only when the first candidate fails a deterministic or client-facing gate.
  let report: PeptidesReport | null = null;
  let lastError = "";
  const providerCandidates: Array<{
    provider: "openai";
    model: string;
    generate: () => Promise<string>;
  }> = [
    {
      provider: "openai",
      model: PEPTIDES_PRIMARY_MODEL,
      generate: () => generateProviderText({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        email,
        label: "peptides-primary",
        retries: providerRetries,
        orderId: options.orderId,
      }),
    },
    {
      provider: "openai",
      model: PEPTIDES_PRIMARY_MODEL,
      generate: () =>
        generateProviderText({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: `${userPrompt}\n\nREGENERATION QUALITE: repars de zero. Controle avant de repondre les credits du tier, la presence de chaque peptide dans toutes les sections operationnelles, l'alignement des doses et des durees, les quantites de vials, la BAC water et la liste de commande.`,
          email,
          label: "peptides-strict-regeneration",
          retries: providerRetries,
          orderId: options.orderId,
        }),
    },
  ];
  const providers = providerCandidates.slice(0, maxCandidates);

  for (let attempt = 0; attempt < providers.length; attempt++) {
    const selected = providers[attempt];
    try {
      console.log(
        `[PeptidesEngine] Candidate ${attempt + 1}/${providers.length}: ${selected.provider}/${selected.model} for ${email}`
      );
      const rawResponse = await selected.generate();
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

      // CHECK 3b: peptides actively scheduled or ordered must exist in the
      // structured array. Narrative-only mentions can legitimately describe
      // past use, rejected options or comparisons and must not trigger a false
      // truncation alarm.
      const missingFromArray = findOperationalPeptidesMissingFromArray(report);
      if (missingFromArray.length >= 1) {
        const peptidesInArray = (report.peptides || []).map((p: any) =>
          String(p.name || "").toLowerCase()
        );
        throw new Error(`VALIDATION: peptides array incomplete , active schedule or shopping list has ${missingFromArray.join(", ")} but array has only ${peptidesInArray.join(", ")}. Likely jsonrepair truncation.`);
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

      console.log(`[PeptidesEngine] ✅ Structure OK: ${report.sections.length} sections, ${report.peptides.length} peptides, ${totalContent} chars`);

      // Deterministic post-processing is part of the provider evaluation. A
      // model only wins when the exact report that will be persisted passes.
      report = pruneUnintegratedBonusPeptides(report);
      if (report.peptides.length < 2) {
        throw new Error(
          `VALIDATION: seulement ${report.peptides.length} peptide(s) apres retrait des bonus non integres`
        );
      }
      report = validateAndFixPeptauraUrls(report);
      report = validateVialsMath(report);
      report = await applyLivePeptauraPricing(report, peptauraContext);
      report.qualityVersion = hasPeptidesHardRedFlag(responses)
        ? "medical-review-v1"
        : "expert-standard-v1";
      report = repairPeptidesReportContent(report, responses, tier);
      report = cleanReportContent(report, firstName);
      report._validationContext = buildPeptidesValidationContext(
        responses,
        peptauraContext.country,
        options.consentAccepted === true
      );
      report.promoCodesGenerated = [];
      report.clientName = firstName;
      report._generationMeta = {
        provider: selected.provider,
        model: selected.model,
        reasoningEffort: PEPTIDES_REASONING.effort,
        reasoningMode: PEPTIDES_REASONING.mode,
        generatedAt: new Date().toISOString(),
      };

      const finalValidation = validatePeptidesReport(report as any);
      if (!finalValidation.ok) {
        throw new Error(`FINAL_GATE: ${finalValidation.errors.slice(0, 12).join(" | ")}`);
      }
      if (finalValidation.warnings.length > 0) {
        console.warn(
          `[PeptidesEngine] Final gate warnings for ${email}: ${finalValidation.warnings.slice(0, 3).join(" | ")}`
        );
      }

      console.log(
        `[PeptidesEngine] ✅ Candidate accepted: ${selected.provider}/${selected.model}, quality=${report.qualityVersion || "unknown"}`
      );
      break;

    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(
        `[PeptidesEngine] ❌ Candidate rejected: ${selected.provider}/${selected.model}: ${lastError}`
      );
      report = null;
      const terminalProviderFailure =
        /OpenAI response timeout|request timed out|connection timeout|no credits remaining|insufficient_quota|invalid api key/i.test(lastError);
      if (terminalProviderFailure) {
        console.error("[PeptidesEngine] Provider failure is terminal, duplicate paid generation blocked");
        break;
      }
      if (attempt + 1 < providers.length) {
        console.log(`[PeptidesEngine] Starting strict full regeneration with ${PEPTIDES_PRIMARY_MODEL}, effort=xhigh, mode=pro`);
      }
    }
  }

  if (!report) {
    throw new Error(`[PeptidesEngine] All quality candidates failed: ${lastError}`);
  }

  const promoCodes = await addBloodAnalysisCredits(email, tier);
  report.promoCodesGenerated = promoCodes;

  // FINAL CHECK , log everything
  console.log(`[PeptidesEngine] ✅ FINAL: ${email}`);
  console.log(`[PeptidesEngine]   Sections: ${report.sections.length}`);
  console.log(`[PeptidesEngine]   Peptides: ${report.peptides.map(p => p.name).join(", ")}`);
  console.log(`[PeptidesEngine]   Promos: ${report.promoCodesGenerated.join(", ")}`);
  console.log(`[PeptidesEngine]   Content: ${report.sections.reduce((s, sec) => s + (sec.content?.length ?? 0), 0)} chars`);

  return report;
}
