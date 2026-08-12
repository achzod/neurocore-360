/**
 * Offline-first, idempotent restoration of the six tracked Discovery datasets.
 *
 * Default mode is read-only and does not connect to PostgreSQL:
 *   npx tsx scripts/restore-discovery-knowledge.ts
 *
 * Production apply requires both an explicit flag and confirmation token:
 *   KB_RESTORE_APPLY=I_UNDERSTAND_878_UNIQUE \
 *     npx tsx scripts/restore-discovery-knowledge.ts --apply
 *
 * The apply path uses a temporary staging table and one transaction. It never
 * deletes or updates knowledge_base rows. Any mismatch rolls the transaction
 * back. The 12 known duplicate payloads are rejected before staging, leaving
 * exactly 878 unique articles from 890 tracked records.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type RestoreSource =
  | "huberman"
  | "examine"
  | "mpmd"
  | "peter_attia"
  | "renaissance_periodization"
  | "sbs";

interface SourceManifest {
  file: string;
  source: RestoreSource;
  category: string;
  expectedCount: number;
  expectedSha256: string;
}

export interface NormalizedKnowledgeArticle {
  source: RestoreSource;
  title: string;
  content: string;
  url: string;
  category: string;
  keywords: string[];
  scrapedAt: Date;
  contentHash: string;
}

export interface OfflineValidation {
  rawCount: number;
  uniqueCount: number;
  rejectedDuplicateCount: number;
  bySource: Record<string, { raw: number; unique: number }>;
  articles: NormalizedKnowledgeArticle[];
  domainCoverage: Record<string, number>;
  rawManifestHash: string;
  uniqueManifestHash: string;
}

export const SOURCES: readonly SourceManifest[] = [
  {
    file: "huberman-full.json",
    source: "huberman",
    category: "health_optimization",
    expectedCount: 367,
    expectedSha256: "3772b7ba4d87cb2b1bbb20b570a8f614ed5156cc4ca870d7a85de61b47988c79",
  },
  {
    file: "examine-full.json",
    source: "examine",
    category: "supplements",
    expectedCount: 43,
    expectedSha256: "fad4c308a6d053497a19c15d54dc223138208ddd908c72d4f0efb004be83df07",
  },
  {
    file: "mpmd-full.json",
    source: "mpmd",
    category: "hormones",
    expectedCount: 235,
    expectedSha256: "52e15cd61f1d88c50568789e4a7801b3de0b725e631902d33d6073f099025f6b",
  },
  {
    file: "peter-attia-full.json",
    source: "peter_attia",
    category: "longevity",
    expectedCount: 200,
    expectedSha256: "6499b9462bceeb1045647b6868c462d17dfc33b8b2dc2112879bb68bce3b3a07",
  },
  {
    file: "rp-full.json",
    source: "renaissance_periodization",
    category: "nutrition",
    expectedCount: 30,
    expectedSha256: "9ee72c8b151724d5f4523c11dfacc25bdadad2dbbc4a2fc32566c6e6d6d43e10",
  },
  {
    file: "sbs-full.json",
    source: "sbs",
    category: "training",
    expectedCount: 15,
    expectedSha256: "f9a2d81f16681e451353494a51efff54f877899f2afa3d1e79c2d50622ecad0a",
  },
] as const;

const EXPECTED_RAW_COUNT = 890;
const EXPECTED_UNIQUE_COUNT = 878;
const EXPECTED_DUPLICATE_COUNT = 12;
const EXPECTED_RAW_MANIFEST_HASH = "c6f6449ca5be2f97bc13f6b4208f0b8b1f2b6214748751861f469c9fc9d1dbb8";
const EXPECTED_UNIQUE_MANIFEST_HASH = "be7eb848902accc0245b42c46cd04dc38a4841d74c98e6954847a303c4e8d5a4";

// These are scraper failures with identical article bodies under distinct
// titles. They are rejected, never silently imported as separate knowledge.
const EXPECTED_DUPLICATE_GROUPS: Record<string, number> = {
  "8e3084f42b885448c1aa7e3ba4186360fb84b6c8b394d206ff4aef0b478f732d": 12,
  "45b0a447287f777655a69708aef109518aa8d7c45826b643abff91b97ba8da79": 2,
};

export const DISCOVERY_DOMAIN_TERMS: Record<string, string[]> = {
  sommeil: ["sleep", "sommeil", "circadian", "melatonin", "adenosine"],
  stress: ["stress", "cortisol", "anxiety", "anxiété", "nervous system"],
  energie: ["energy", "énergie", "fatigue", "mitochondria", "atp"],
  digestion: ["digestion", "gut", "microbiome", "bloating", "probiotic"],
  training: ["training", "exercise", "hypertrophy", "strength", "recovery"],
  nutrition: ["nutrition", "protein", "carbohydrate", "calorie", "insulin"],
  lifestyle: ["lifestyle", "light", "sunlight", "alcohol", "caffeine"],
  mindset: ["mindset", "motivation", "dopamine", "focus", "behavior"],
};

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedKeywords(article: Record<string, unknown>): string[] {
  const values = [article.keywords, article.tags, article.categories]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(values)];
}

function resolveScrapedAt(article: Record<string, unknown>): Date {
  const raw = article.scrapedAt || article.publishedAt || article.date;
  const parsed = typeof raw === "string" || raw instanceof Date ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new Error("missing_or_invalid_scraped_at");
  }
  return parsed;
}

function canonicalManifestHash(articles: NormalizedKnowledgeArticle[]): string {
  const rows = articles
    .map((article) => ({
      source: article.source,
      title: article.title,
      url: article.url,
      contentHash: article.contentHash,
    }))
    .sort((a, b) => `${a.source}\0${a.url}\0${a.title}`.localeCompare(`${b.source}\0${b.url}\0${b.title}`))
    .map((article) => `${article.source}\0${article.title}\0${article.url}\0${article.contentHash}`)
    .join("\n");
  return sha256(rows);
}

export function validateOfflineDatasets(repoRoot: string): OfflineValidation {
  const normalized: NormalizedKnowledgeArticle[] = [];
  const bySource: OfflineValidation["bySource"] = {};

  for (const config of SOURCES) {
    const filePath = path.join(repoRoot, "scraped-data", config.file);
    const bytes = fs.readFileSync(filePath);
    const fileHash = sha256(bytes);
    if (fileHash !== config.expectedSha256) {
      throw new Error(`${config.file}:sha256:${fileHash}/${config.expectedSha256}`);
    }

    const parsed = JSON.parse(bytes.toString("utf8"));
    const rows = Array.isArray(parsed) ? parsed : parsed?.articles;
    if (!Array.isArray(rows) || rows.length !== config.expectedCount) {
      throw new Error(`${config.file}:count:${Array.isArray(rows) ? rows.length : "invalid"}/${config.expectedCount}`);
    }

    bySource[config.source] = { raw: rows.length, unique: 0 };
    rows.forEach((value: unknown, index: number) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${config.file}:${index}:invalid_object`);
      }
      const article = value as Record<string, unknown>;
      const title = normalizeString(article.title || article.name);
      const content = normalizeString(article.content || article.text);
      const url = normalizeString(article.url);
      if (!title) throw new Error(`${config.file}:${index}:empty_title`);
      if (content.length < 100) throw new Error(`${config.file}:${index}:content_too_short:${content.length}`);
      if (!url) throw new Error(`${config.file}:${index}:empty_url`);
      try {
        new URL(url);
      } catch {
        throw new Error(`${config.file}:${index}:invalid_url`);
      }

      normalized.push({
        source: config.source,
        title,
        content,
        url,
        category: normalizeString(article.category) || config.category,
        keywords: normalizedKeywords(article),
        scrapedAt: resolveScrapedAt(article),
        // Must match the existing knowledge_base uniqueness contract.
        contentHash: sha256(content.substring(0, 5000)),
      });
    });
  }

  if (normalized.length !== EXPECTED_RAW_COUNT) {
    throw new Error(`raw_count:${normalized.length}/${EXPECTED_RAW_COUNT}`);
  }
  const rawManifestHash = canonicalManifestHash(normalized);
  if (rawManifestHash !== EXPECTED_RAW_MANIFEST_HASH) {
    throw new Error(`raw_manifest_hash:${rawManifestHash}/${EXPECTED_RAW_MANIFEST_HASH}`);
  }

  const byHash = new Map<string, NormalizedKnowledgeArticle[]>();
  for (const article of normalized) {
    const group = byHash.get(article.contentHash) || [];
    group.push(article);
    byHash.set(article.contentHash, group);
  }
  const actualDuplicateGroups = Object.fromEntries(
    [...byHash.entries()].filter(([, rows]) => rows.length > 1).map(([hash, rows]) => [hash, rows.length]),
  );
  if (JSON.stringify(actualDuplicateGroups) !== JSON.stringify(EXPECTED_DUPLICATE_GROUPS)) {
    throw new Error(`duplicate_groups:${JSON.stringify(actualDuplicateGroups)}`);
  }

  const articles = [...byHash.values()].map((rows) => rows[0]);
  const rejectedDuplicateCount = normalized.length - articles.length;
  if (articles.length !== EXPECTED_UNIQUE_COUNT || rejectedDuplicateCount !== EXPECTED_DUPLICATE_COUNT) {
    throw new Error(`dedupe:${articles.length}+${rejectedDuplicateCount}/${EXPECTED_RAW_COUNT}`);
  }
  for (const article of articles) bySource[article.source].unique += 1;

  const uniqueManifestHash = canonicalManifestHash(articles);
  if (uniqueManifestHash !== EXPECTED_UNIQUE_MANIFEST_HASH) {
    throw new Error(`unique_manifest_hash:${uniqueManifestHash}/${EXPECTED_UNIQUE_MANIFEST_HASH}`);
  }

  const domainCoverage: Record<string, number> = {};
  for (const [domain, terms] of Object.entries(DISCOVERY_DOMAIN_TERMS)) {
    const loweredTerms = terms.map((term) => term.toLowerCase());
    domainCoverage[domain] = articles.filter((article) => {
      const haystack = `${article.title}\n${article.content}\n${article.keywords.join(" ")}`.toLowerCase();
      return loweredTerms.some((term) => haystack.includes(term));
    }).length;
    if (domainCoverage[domain] === 0) throw new Error(`domain_without_offline_retrieval:${domain}`);
  }

  return {
    rawCount: normalized.length,
    uniqueCount: articles.length,
    rejectedDuplicateCount,
    bySource,
    articles,
    domainCoverage,
    rawManifestHash,
    uniqueManifestHash,
  };
}

async function applyValidatedArticles(validation: OfflineValidation): Promise<void> {
  if (process.env.KB_RESTORE_APPLY !== "I_UNDERSTAND_878_UNIQUE") {
    throw new Error("apply_confirmation_missing");
  }

  const { pool } = await import("../server/db");
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE kb_restore_stage (
        source varchar(50) NOT NULL,
        title text NOT NULL,
        content text NOT NULL,
        url text NOT NULL,
        category varchar(100) NOT NULL,
        keywords text[] NOT NULL,
        content_hash varchar(64) PRIMARY KEY,
        scraped_at timestamp NOT NULL
      ) ON COMMIT DROP
    `);

    for (const article of validation.articles) {
      await client.query(
        `INSERT INTO kb_restore_stage
          (source, title, content, url, category, keywords, content_hash, scraped_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          article.source,
          article.title,
          article.content,
          article.url,
          article.category,
          article.keywords,
          article.contentHash,
          article.scrapedAt,
        ],
      );
    }

    const staged = await client.query(`SELECT count(*)::int AS count FROM kb_restore_stage`);
    if (staged.rows[0].count !== EXPECTED_UNIQUE_COUNT) {
      throw new Error(`staging_count:${staged.rows[0].count}/${EXPECTED_UNIQUE_COUNT}`);
    }

    await client.query(`
      INSERT INTO knowledge_base
        (source, title, content, url, category, keywords, content_hash, scraped_at)
      SELECT source, title, content, url, category, keywords, content_hash, scraped_at
      FROM kb_restore_stage
      ON CONFLICT (content_hash) DO NOTHING
    `);

    const mismatch = await client.query(`
      SELECT count(*)::int AS count
      FROM kb_restore_stage stage
      LEFT JOIN knowledge_base live USING (content_hash)
      WHERE live.id IS NULL
         OR live.source IS DISTINCT FROM stage.source
         OR live.title IS DISTINCT FROM stage.title
         OR live.content IS DISTINCT FROM stage.content
         OR coalesce(live.url, '') IS DISTINCT FROM stage.url
    `);
    if (mismatch.rows[0].count !== 0) {
      throw new Error(`post_insert_exact_mismatch:${mismatch.rows[0].count}`);
    }

    for (const [domain, terms] of Object.entries(DISCOVERY_DOMAIN_TERMS)) {
      const regex = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const result = await client.query(
        `SELECT count(*)::int AS count
         FROM knowledge_base live
         JOIN kb_restore_stage stage USING (content_hash)
         WHERE lower(live.title) ~* $1
            OR lower(live.content) ~* $1
            OR live.keywords && $2::text[]`,
        [regex, terms.map((term) => term.toLowerCase())],
      );
      if (result.rows[0].count === 0) throw new Error(`domain_without_db_retrieval:${domain}`);
    }

    await client.query("COMMIT");
    committed = true;
  } finally {
    if (!committed) await client.query("ROLLBACK").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const validation = validateOfflineDatasets(repoRoot);
  const summary = {
    mode: process.argv.includes("--apply") ? "apply" : "dry-run",
    rawCount: validation.rawCount,
    uniqueCount: validation.uniqueCount,
    rejectedDuplicateCount: validation.rejectedDuplicateCount,
    bySource: validation.bySource,
    domainCoverage: validation.domainCoverage,
    rawManifestHash: validation.rawManifestHash,
    uniqueManifestHash: validation.uniqueManifestHash,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!process.argv.includes("--apply")) {
    console.log("DRY_RUN_PASS: no database connection or mutation performed");
    return;
  }
  await applyValidatedArticles(validation);
  console.log("APPLY_PASS: 878 exact unique articles are present; transaction committed");
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
