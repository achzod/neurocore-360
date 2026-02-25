import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

const STATUS_SCORE: Record<MarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

type ScoredPdf = {
  file: string;
  markerCount: number;
  globalScore: number;
  statusCounts: Record<MarkerStatus, number>;
};

type ExtractedMarker = {
  markerId: string;
  value: number;
};

type SkippedPdf = {
  file: string;
  reason: string;
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const walkPdfFiles = (dir: string, acc: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPdfFiles(fullPath, acc);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const computeGlobalScore = (statuses: MarkerStatus[]): number => {
  if (!statuses.length) return 0;
  const total = statuses.reduce((sum, status) => sum + STATUS_SCORE[status], 0);
  return Math.round(total / statuses.length);
};

async function main() {
  // Required by modules imported by blood-analysis internals.
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/db";

  const { extractMarkersFromPdfText, analyzeBloodwork } = await import("../server/blood-analysis/index.js");

  const dataDir = path.resolve(process.cwd(), "data");
  const pdfFiles = walkPdfFiles(dataDir);
  assert(pdfFiles.length > 0, "No PDF files found in data/");

  const scored: ScoredPdf[] = [];
  const skipped: SkippedPdf[] = [];
  const extractedByFile = new Map<string, ExtractedMarker[]>();

  for (const file of pdfFiles) {
    try {
      const buffer = fs.readFileSync(file);
      const parsed = await pdf(buffer);
      const extracted = await extractMarkersFromPdfText(parsed.text || "", path.basename(file));
      extractedByFile.set(path.relative(process.cwd(), file), extracted as ExtractedMarker[]);
      const analysis = await analyzeBloodwork(extracted, { gender: "homme" });

      const statuses = analysis.markers.map((marker) => marker.status as MarkerStatus);
      const statusCounts: Record<MarkerStatus, number> = {
        optimal: statuses.filter((s) => s === "optimal").length,
        normal: statuses.filter((s) => s === "normal").length,
        suboptimal: statuses.filter((s) => s === "suboptimal").length,
        critical: statuses.filter((s) => s === "critical").length,
      };

      scored.push({
        file: path.relative(process.cwd(), file),
        markerCount: analysis.markers.length,
        globalScore: computeGlobalScore(statuses),
        statusCounts,
      });
    } catch (error) {
      skipped.push({
        file: path.relative(process.cwd(), file),
        reason: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  const withMarkers = scored.filter((item) => item.markerCount > 0);
  assert(withMarkers.length > 0, "No analyzable PDFs (0 markers extracted for all files).");

  const sortedByMarkers = [...withMarkers].sort((a, b) => b.markerCount - a.markerCount);
  const richest = sortedByMarkers[0];
  const richestHasIssue = richest.statusCounts.suboptimal + richest.statusCounts.critical > 0;

  assert(
    richestHasIssue,
    `Regression: richest PDF (${richest.file}) has no suboptimal/critical markers, suspicious classification.`
  );
  assert(
    richest.globalScore < 100,
    `Regression: richest PDF (${richest.file}) scored 100 despite non-optimal markers.`
  );

  const allHundred = withMarkers.every((item) => item.globalScore === 100);
  assert(!allHundred, "Regression: all analyzed PDFs are scored at 100.");

  const crFixturePath = "data/CR_195452.pdf";
  const crMarkers = extractedByFile.get(crFixturePath) || [];
  if (crMarkers.length) {
    const byId = new Map(crMarkers.map((m) => [m.markerId, m.value]));
    assert(
      byId.get("hdl") === 19,
      `Regression: ${crFixturePath} expected HDL=19 mg/dL, got ${String(byId.get("hdl"))}.`
    );
    assert(
      byId.get("testosterone_libre") === 11,
      `Regression: ${crFixturePath} expected testosterone_libre=11 pg/mL, got ${String(byId.get("testosterone_libre"))}.`
    );
    assert(
      !byId.has("lpa"),
      `Regression: ${crFixturePath} should not extract Lp(a) when only Apolipoproteine A1 is present.`
    );
  }

  for (const item of sortedByMarkers) {
    const nonOptimal = item.statusCounts.suboptimal + item.statusCounts.critical;
    if (nonOptimal > 0) {
      assert(
        item.globalScore < 100,
        `Regression: ${item.file} scored 100 with ${nonOptimal} suboptimal/critical markers.`
      );
    }
  }

  console.log("Blood score regression checks passed.");
  console.log(`Richest PDF: ${richest.file} (${richest.markerCount} markers, score ${richest.globalScore})`);
  console.log(`Skipped PDFs: ${skipped.length}`);
  for (const skip of skipped) {
    console.log(`SKIPPED\t${skip.file}\t${skip.reason}`);
  }
  for (const item of sortedByMarkers) {
    console.log(
      `${item.markerCount}\t${item.globalScore}\t${item.statusCounts.optimal}/${item.statusCounts.normal}/${item.statusCounts.suboptimal}/${item.statusCounts.critical}\t${item.file}`
    );
  }
}

main().catch((error) => {
  console.error("Blood score regression checks failed.");
  console.error(error);
  process.exit(1);
});
