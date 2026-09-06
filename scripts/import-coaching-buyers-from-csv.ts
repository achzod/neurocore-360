import fs from "node:fs";
import path from "node:path";
import { storage } from "../server/storage";

const DEFAULT_CRM_PATH =
  "/Users/achzod/.openclaw/workspace/tasks/revenue_reactivation/campaign_execution_v4/ultra_boost_crm_warroom/MASTER_CRM_TRACKER_ALL_48766.csv";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
}

function isPositiveNumber(value: string | undefined): boolean {
  if (!value) return false;
  const numeric = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(numeric) && numeric > 0;
}

function normalizeEmail(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}

async function main() {
  const csvPath = path.resolve(process.argv[2] || DEFAULT_CRM_PATH);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV introuvable: ${csvPath}`);
  }

  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] || "");
  const emailIndex = headers.indexOf("email");
  const coachingOrdersIndex = headers.indexOf("coaching_orders");
  if (emailIndex < 0 || coachingOrdersIndex < 0) {
    throw new Error("Colonnes requises absentes: email, coaching_orders");
  }

  const coachingBuyers = new Set<string>();
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const email = normalizeEmail(cells[emailIndex]);
    if (!email || !email.includes("@")) continue;
    if (isPositiveNumber(cells[coachingOrdersIndex])) {
      coachingBuyers.add(email);
    }
  }

  const result = await storage.markCoachingBuyers(
    Array.from(coachingBuyers),
    "achzodcoaching_crm_csv",
  );

  console.log(JSON.stringify({
    csvPath,
    detectedCoachingBuyers: coachingBuyers.size,
    inserted: result.inserted,
    updated: result.updated,
    total: result.total,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
