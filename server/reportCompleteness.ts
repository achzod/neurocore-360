import { formatTxtToDashboard } from "./formatDashboard";

export interface CompletenessIssue {
  code: string;
  severity: "error" | "warning";
  section?: string;
  details: string;
}

export interface CompletenessReport {
  ok: boolean;
  errors: CompletenessIssue[];
  warnings: CompletenessIssue[];
  txtLength: number;
  htmlLength: number;
  sectionCount: number;
}

const WEEK_HEADER_RE = /^\s*SEMAINE\s+\d+\b/gm;
const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

type PromiseMode = "strict" | "loose";
const PROMISE_PATTERNS: Array<{ re: RegExp; label: string; mode: PromiseMode }> = [
  { re: /voici\s+(?:les?\s+)?(?:trois|3)\s+options?\b/gi, label: "voici_trois_options", mode: "strict" },
  { re: /voici\s+(?:les?\s+)?(?:quatre|4)\s+options?\b/gi, label: "voici_quatre_options", mode: "strict" },
  { re: /voici\s+(?:les?\s+)?(?:cinq|5)\s+options?\b/gi, label: "voici_cinq_options", mode: "strict" },
  { re: /voici\s+(?:les?\s+)?(?:deux|2)\s+options?\b/gi, label: "voici_deux_options", mode: "strict" },
  { re: /voici\s+(?:les?\s+)?(?:trois|3|quatre|4|cinq|5)\s+(?:etapes?|étapes?)/gi, label: "voici_etapes", mode: "strict" },
  { re: /voici\s+ce\s+qu['']\s*il\s+doit\s+inclure/gi, label: "voici_ce_qu_il_doit_inclure", mode: "loose" },
];

const MIN_TXT_LEN_BY_TIER: Record<string, number> = {
  ELITE: 80000,
  PREMIUM: 35000,
  GRATUIT: 5000,
};

function hasStrictListAfter(content: string, startIdx: number, scanLen: number = 1200): boolean {
  const window = content.slice(startIdx, startIdx + scanLen);
  if (/Option\s+[1-9]\b/i.test(window)) return true;
  if (/^\s*[1-9]\.\s+\S/m.test(window)) return true;
  if (/^\s*[-•*]\s+\S/m.test(window)) return true;
  return false;
}

function hasProseEnumAfter(content: string, startIdx: number, scanLen: number = 2000): boolean {
  const window = content.slice(startIdx, startIdx + scanLen);
  const lines = window.split(/\n+/).filter(l => l.trim().length > 200);
  if (lines.length === 0) return false;
  const candidate = lines[0];
  const enumerationMarkers = candidate.match(/[.,;:]/g) || [];
  return candidate.length >= 400 && enumerationMarkers.length >= 6;
}

export function checkReportCompleteness(
  txt: string,
  html: string,
  tier: string,
): CompletenessReport {
  const errors: CompletenessIssue[] = [];
  const warnings: CompletenessIssue[] = [];

  const minTxtLen = MIN_TXT_LEN_BY_TIER[tier] ?? 5000;
  if (!txt || txt.length < minTxtLen) {
    errors.push({
      code: "TXT_TOO_SHORT",
      severity: "error",
      details: `reportTxt is ${txt?.length || 0} chars, expected >= ${minTxtLen} for ${tier}`,
    });
  }

  let sectionCount = 0;
  let dashboard: any = null;
  try {
    dashboard = formatTxtToDashboard(txt || "");
    sectionCount = dashboard?.sections?.length || 0;
  } catch (e: any) {
    errors.push({ code: "DASHBOARD_PARSE_FAIL", severity: "error", details: e?.message || "unknown" });
  }

  if (tier === "ELITE" && sectionCount < 14) {
    errors.push({
      code: "ELITE_TOO_FEW_SECTIONS",
      severity: "error",
      details: `ELITE audit has ${sectionCount} sections, expected >= 14`,
    });
  }
  if (tier === "PREMIUM" && sectionCount < 8) {
    errors.push({
      code: "PREMIUM_TOO_FEW_SECTIONS",
      severity: "error",
      details: `PREMIUM audit has ${sectionCount} sections, expected >= 8`,
    });
  }

  if (dashboard?.sections) {
    for (const section of dashboard.sections as any[]) {
      const content: string = section?.content || "";
      const title: string = section?.title || "";
      if (!content.trim()) {
        errors.push({
          code: "EMPTY_SECTION",
          severity: "error",
          section: title,
          details: "Section content is empty after cleaning",
        });
        continue;
      }

      for (const pat of PROMISE_PATTERNS) {
        pat.re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pat.re.exec(content)) !== null) {
          const afterIdx = m.index + m[0].length;
          const fulfilled = pat.mode === "strict"
            ? hasStrictListAfter(content, afterIdx, 1200)
            : (hasStrictListAfter(content, afterIdx, 1200) || hasProseEnumAfter(content, afterIdx, 2500));
          if (!fulfilled) {
            errors.push({
              code: "UNFULFILLED_PROMISE",
              severity: "error",
              section: title,
              details: `Pattern "${pat.label}" found at offset ${m.index} but no ${pat.mode} list/enum content in following chars`,
            });
          }
        }
      }

      const lower = title.toLowerCase();
      const isWeeklyPlan = lower.includes("semaine par semaine") || lower.includes("plan d'action") || lower.includes("plan daction") || lower.includes("plan d action");
      if (isWeeklyPlan) {
        WEEK_HEADER_RE.lastIndex = 0;
        const weekMatches: Array<{ header: string; index: number }> = [];
        let wm: RegExpExecArray | null;
        while ((wm = WEEK_HEADER_RE.exec(content)) !== null) {
          weekMatches.push({ header: wm[0].trim(), index: wm.index });
        }
        weekMatches.forEach((match, i) => {
          const weekStart = match.index;
          const weekEnd = weekMatches[i + 1]?.index ?? content.length;
          const weekBlock = content.slice(weekStart, weekEnd);
          if (weekBlock.length < 800) return;
          const presentDays = WEEKDAYS.filter(day => {
            const re = new RegExp(`\\b${day}\\b\\.`, "i");
            return re.test(weekBlock);
          });
          // Two valid formats:
          //   A) Day-by-day breakdown -> must have ALL 7 days (else truncation)
          //   B) Thematic adjustments -> ZERO day mentions (AI chose narrative form)
          // Partial day presence (1-6) is the truncation signal.
          if (presentDays.length > 0 && presentDays.length < 7) {
            const missingDays = WEEKDAYS.filter(d => !presentDays.includes(d));
            errors.push({
              code: "WEEKLY_PLAN_MISSING_DAYS",
              severity: "error",
              section: title,
              details: `${match.header}: has ${presentDays.length}/7 days, missing ${missingDays.join(", ")}`,
            });
          }
        });
      }
    }
  }

  if (html && txt && html.length < txt.length * 0.5) {
    warnings.push({
      code: "HTML_MUCH_SHORTER_THAN_TXT",
      severity: "warning",
      details: `HTML (${html.length}ch) is less than 50% of TXT (${txt.length}ch). Possible stale/buggy HTML render.`,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    txtLength: txt?.length || 0,
    htmlLength: html?.length || 0,
    sectionCount,
  };
}
