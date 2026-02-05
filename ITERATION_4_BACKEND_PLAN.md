# ITERATION 4 - BACKEND ARCHITECTURE PLAN

Date: 2026-02-05
Objectif: Refactorer backend monolithique en architecture modulaire + database optimisée

---

## PROBLÈMES ACTUELS

### 1. Fichier Monolithique ❌
- `server/blood-analysis/index.ts`: **4000 lignes**
- Responsabilités multiples mélangées:
  - Extraction PDF (500 lignes)
  - Analyse marqueurs (800 lignes)
  - Génération AI (1500 lignes)
  - Calculs scores (400 lignes)
  - Utils (800 lignes)

### 2. Pas de Validation ❌
- Endpoints sans validation Zod
- Pas de type safety runtime
- Risque d'erreurs silencieuses

### 3. Database Schema Suboptimal ❌
```typescript
export const bloodTests = pgTable("blood_tests", {
  markers: jsonb("markers"), // ❌ Tout en JSONB
  analysis: jsonb("analysis"), // ❌ Pas de relations
});
```
- Impossible de query sur marqueurs individuels
- Pas de stats aggregées
- Pas d'indexes
- Pas d'audit trail

### 4. Pas de Queue System ❌
- Génération synchrone bloque le thread 15 min
- Pas de retry en cas d'échec
- Pas de priorités
- Un seul report à la fois

### 5. Pas de Rate Limiting ❌
- API non protégée
- Coût: 15 min CPU + $2 OpenAI par report
- Vulnérable à abuse

### 6. Pas de Tests ❌
- 0 tests unitaires
- 0 tests d'intégration
- 0% coverage

---

## ARCHITECTURE CIBLE

### Structure Modulaire

```
server/
├── blood-analysis/
│   ├── index.ts                    (100 lignes) - Exports
│   ├── routes.ts                   (150 lignes) - API routes
│   ├── extraction/
│   │   ├── index.ts
│   │   ├── pdfParser.ts           (200 lignes)
│   │   ├── markerExtractor.ts     (250 lignes)
│   │   └── unitNormalizer.ts      (100 lignes)
│   ├── analysis/
│   │   ├── index.ts
│   │   ├── markerAnalyzer.ts      (300 lignes)
│   │   ├── patternDetector.ts     (200 lignes)
│   │   └── scoreCalculator.ts     (150 lignes)
│   ├── ai/
│   │   ├── index.ts
│   │   ├── promptBuilder.ts       (400 lignes)
│   │   ├── reportGenerator.ts     (500 lignes)
│   │   └── multiPassValidator.ts  (200 lignes)
│   ├── utils/
│   │   ├── ranges.ts              (200 lignes)
│   │   ├── validations.ts         (100 lignes)
│   │   └── formatting.ts          (100 lignes)
│   └── validation/
│       └── schemas.ts             (150 lignes) - Zod schemas
│
├── queue/
│   ├── reportQueue.ts             (200 lignes) - BullMQ setup
│   └── workers.ts                 (300 lignes) - Job processors
│
├── middleware/
│   ├── rateLimit.ts               (80 lignes)
│   ├── auth.ts                    (100 lignes)
│   └── errorHandler.ts            (60 lignes)
│
├── cache/
│   └── redis.ts                   (100 lignes)
│
└── db/
    ├── migrations/
    │   └── 001_refactor_markers.sql
    └── schema/
        ├── users.ts
        ├── bloodTests.ts
        └── markers.ts
```

**Total:** ~3900 lignes (vs 4000 actuellement)
**Raison de stabilité:** Meilleure organisation, moins de duplication

---

## ÉTAPE 1: REFACTOR EXTRACTION (45 min)

### 1.1 - extraction/pdfParser.ts
```typescript
import pdf from 'pdf-parse';

export interface ParsedPDF {
  text: string;
  pages: number;
  metadata?: Record<string, unknown>;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.metadata,
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}
```

### 1.2 - extraction/markerExtractor.ts
```typescript
import { BIOMARKER_RANGES } from '../../../shared/biomarker-ranges';

export interface ExtractedMarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  method?: string;
}

export function extractMarkers(pdfText: string): ExtractedMarker[] {
  const markers: ExtractedMarker[] = [];

  // Patterns pour différents formats de labos
  const patterns = [
    /(\w+)\s+(\d+\.?\d*)\s+(\w+\/?\w*)/g,
    /(\w+)\s*:\s*(\d+\.?\d*)\s+(\w+)/g,
    // ... autres patterns
  ];

  for (const pattern of patterns) {
    const matches = [...pdfText.matchAll(pattern)];
    for (const match of matches) {
      const marker = normalizeMarker(match[1], match[2], match[3]);
      if (marker && isValidMarker(marker)) {
        markers.push(marker);
      }
    }
  }

  return deduplicateMarkers(markers);
}

function normalizeMarker(name: string, value: string, unit: string): ExtractedMarker | null {
  // Normalize name → code
  // Normalize unit
  // Parse value
  // ...
}
```

### 1.3 - extraction/unitNormalizer.ts
```typescript
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  glucose: {
    'mg/dL': 1,
    'mmol/L': 18.0182,
  },
  testosterone: {
    'ng/dL': 1,
    'nmol/L': 28.84,
  },
  // ... autres conversions
};

export function normalizeUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  markerCode: string
): number {
  const conversions = UNIT_CONVERSIONS[markerCode];
  if (!conversions) return value;

  const factor = conversions[toUnit] / conversions[fromUnit];
  return value * factor;
}
```

---

## ÉTAPE 2: VALIDATION ZOD (30 min)

### validation/schemas.ts
```typescript
import { z } from 'zod';

export const markerSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  value: z.number().positive(),
  unit: z.string().min(1).max(20),
  method: z.string().optional(),
});

export const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  age: z.number().int().min(18).max(120),
  gender: z.enum(['male', 'female']),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
});

export const uploadRequestSchema = z.object({
  profile: profileSchema,
});

export const analyzeRequestSchema = z.object({
  markers: z.array(markerSchema).min(1).max(50),
  profile: profileSchema.optional(),
});

export const comprehensiveReportRequestSchema = z.object({
  markers: z.array(markerSchema).min(3),
  profile: profileSchema,
});

// Validate helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
}
```

### Usage dans routes
```typescript
import { analyzeRequestSchema, validateRequest } from './validation/schemas';

app.post('/api/blood-analysis/analyze', async (req, res) => {
  try {
    // Validate
    const validated = validateRequest(analyzeRequestSchema, req.body);

    // Process
    const result = await analyzeMarkers(validated.markers, validated.profile);

    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

---

## ÉTAPE 3: DATABASE REFACTOR (60 min)

### Nouveau Schema (relationnel)

```typescript
// shared/drizzle-schema.ts

import { pgTable, uuid, varchar, decimal, integer, timestamp, text, jsonb } from 'drizzle-orm/pg-core';

// 1. Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  credits: integer('credits').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Blood tests table (principal)
export const bloodTests = pgTable('blood_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  pdfUrl: text('pdf_url'),
  profile: jsonb('profile'), // OK for flexible profile data
  globalScore: decimal('global_score', { precision: 5, scale: 2 }),
  aiReport: text('ai_report'),
  aiReportLength: integer('ai_report_length'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
});

// 3. Markers table (relationnel!)
export const markers = pgTable('markers', {
  id: uuid('id').primaryKey().defaultRandom(),
  bloodTestId: uuid('blood_test_id').references(() => bloodTests.id).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  value: decimal('value', { precision: 10, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'optimal' | 'normal' | 'suboptimal' | 'critical'
  score: integer('score').notNull(),
  normalMin: decimal('normal_min', { precision: 10, scale: 3 }),
  normalMax: decimal('normal_max', { precision: 10, scale: 3 }),
  optimalMin: decimal('optimal_min', { precision: 10, scale: 3 }),
  optimalMax: decimal('optimal_max', { precision: 10, scale: 3 }),
  percentile: decimal('percentile', { precision: 5, scale: 2 }),
  interpretation: text('interpretation'),
  panelId: varchar('panel_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Indexes
import { index } from 'drizzle-orm/pg-core';

export const markersBloodTestIdIndex = index('markers_blood_test_id_idx').on(markers.bloodTestId);
export const markersCodeIndex = index('markers_code_idx').on(markers.code);
export const markersStatusIndex = index('markers_status_idx').on(markers.status);
export const bloodTestsUserIdIndex = index('blood_tests_user_id_idx').on(bloodTests.userId);
export const bloodTestsStatusIndex = index('blood_tests_status_idx').on(bloodTests.status);
```

### Migration SQL
```sql
-- migrations/001_refactor_markers.sql

-- Create new tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  credits INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS blood_tests_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(20) NOT NULL,
  pdf_url TEXT,
  profile JSONB,
  global_score DECIMAL(5, 2),
  ai_report TEXT,
  ai_report_length INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  error TEXT
);

CREATE TABLE IF NOT EXISTS markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_test_id UUID REFERENCES blood_tests_new(id) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  value DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  normal_min DECIMAL(10, 3),
  normal_max DECIMAL(10, 3),
  optimal_min DECIMAL(10, 3),
  optimal_max DECIMAL(10, 3),
  percentile DECIMAL(5, 2),
  interpretation TEXT,
  panel_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX markers_blood_test_id_idx ON markers(blood_test_id);
CREATE INDEX markers_code_idx ON markers(code);
CREATE INDEX markers_status_idx ON markers(status);
CREATE INDEX blood_tests_user_id_idx ON blood_tests_new(user_id);
CREATE INDEX blood_tests_status_idx ON blood_tests_new(status);

-- Migrate data from old schema
-- TODO: Write migration script for existing data

-- Rename tables
ALTER TABLE blood_tests RENAME TO blood_tests_old;
ALTER TABLE blood_tests_new RENAME TO blood_tests;
```

### Avantages
✅ Queries rapides sur marqueurs individuels:
```typescript
// Find all SHBG < 20 across all reports
const lowSHBG = await db
  .select()
  .from(markers)
  .where(and(
    eq(markers.code, 'shbg'),
    lt(markers.value, 20)
  ));
```

✅ Stats aggregées:
```typescript
// Average testosterone by age group
const avgTesto = await db
  .select({
    ageGroup: sql<string>`FLOOR(CAST(profile->>'age' AS INTEGER) / 10) * 10`,
    avgValue: sql<number>`AVG(${markers.value})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(markers)
  .innerJoin(bloodTests, eq(markers.bloodTestId, bloodTests.id))
  .where(eq(markers.code, 'testosterone_total'))
  .groupBy(sql`FLOOR(CAST(profile->>'age' AS INTEGER) / 10) * 10`);
```

---

## ÉTAPE 4: QUEUE SYSTEM (45 min)

### Installation BullMQ + Redis
```bash
npm install bullmq ioredis
```

### queue/reportQueue.ts
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Queue definition
export const reportQueue = new Queue('blood-report-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs 7 days
    },
  },
});

// Job types
export interface ReportJob {
  reportId: string;
  markers: Array<{
    code: string;
    value: number;
    unit: string;
  }>;
  profile?: {
    age?: number;
    gender?: string;
  };
}

// Add job
export async function queueReportGeneration(job: ReportJob): Promise<string> {
  const addedJob = await reportQueue.add('generate', job, {
    priority: 1, // Higher priority for premium users
    jobId: job.reportId, // Idempotent
  });
  return addedJob.id!;
}

// Queue events
export const reportQueueEvents = new QueueEvents('blood-report-generation', {
  connection,
});

reportQueueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Report ${jobId} generated successfully`);
});

reportQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Report ${jobId} failed: ${failedReason}`);
});
```

### queue/workers.ts
```typescript
import { Worker } from 'bullmq';
import { reportQueue, ReportJob } from './reportQueue';
import { generateComprehensiveReport } from '../blood-analysis/ai/reportGenerator';
import { db } from '../db';
import { bloodTests } from '../../shared/drizzle-schema';
import { eq } from 'drizzle-orm';

// Worker process
export const reportWorker = new Worker(
  'blood-report-generation',
  async (job) => {
    const { reportId, markers, profile } = job.data as ReportJob;

    try {
      // Update status to processing
      await db
        .update(bloodTests)
        .set({ status: 'processing' })
        .where(eq(bloodTests.id, reportId));

      // Generate report (12-15 min)
      const report = await generateComprehensiveReport(markers, profile);

      // Save report
      await db
        .update(bloodTests)
        .set({
          status: 'completed',
          aiReport: report,
          aiReportLength: report.length,
          completedAt: new Date(),
        })
        .where(eq(bloodTests.id, reportId));

      return { success: true, reportLength: report.length };
    } catch (error) {
      // Save error
      await db
        .update(bloodTests)
        .set({
          status: 'failed',
          error: error.message,
        })
        .where(eq(bloodTests.id, reportId));

      throw error;
    }
  },
  {
    connection: reportQueue.opts.connection,
    concurrency: 2, // Process 2 reports in parallel
  }
);

reportWorker.on('completed', (job) => {
  console.log(`Worker completed job ${job.id}`);
});

reportWorker.on('failed', (job, error) => {
  console.error(`Worker failed job ${job?.id}: ${error.message}`);
});
```

### Usage dans routes
```typescript
// routes.ts
app.post('/api/blood-analysis/comprehensive-report', async (req, res) => {
  const { markers, profile } = validateRequest(comprehensiveReportRequestSchema, req.body);

  // Create blood test record
  const [bloodTest] = await db
    .insert(bloodTests)
    .values({
      userId: req.userId,
      status: 'pending',
      profile,
    })
    .returning();

  // Queue generation
  await queueReportGeneration({
    reportId: bloodTest.id,
    markers,
    profile,
  });

  res.json({
    success: true,
    reportId: bloodTest.id,
    status: 'queued',
    estimatedTime: '15 minutes',
  });
});

// Status check endpoint
app.get('/api/blood-analysis/report/:id/status', async (req, res) => {
  const { id } = req.params;

  const report = await db.query.bloodTests.findFirst({
    where: eq(bloodTests.id, id),
    columns: {
      id: true,
      status: true,
      completedAt: true,
      error: true,
    },
  });

  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  res.json({
    success: true,
    reportId: id,
    status: report.status,
    completedAt: report.completedAt,
    error: report.error,
  });
});
```

---

## ÉTAPE 5: RATE LIMITING (20 min)

### middleware/rateLimit.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

interface RateLimitOptions {
  windowMs: number; // Time window in ms
  max: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator = (req) => req.ip } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyGenerator(req)}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: await redis.ttl(key),
        });
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(); // Fail open
    }
  };
}

// Usage
export const reportGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour per user
  keyGenerator: (req) => req.userId || req.ip,
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 min
  keyGenerator: (req) => req.ip,
});
```

### Usage
```typescript
// routes.ts
app.post(
  '/api/blood-analysis/comprehensive-report',
  reportGenerationLimiter,
  async (req, res) => {
    // ...
  }
);

app.post(
  '/api/blood-tests/upload',
  uploadLimiter,
  async (req, res) => {
    // ...
  }
);
```

---

## ÉTAPE 6: REDIS CACHE (25 min)

### cache/redis.ts
```typescript
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Cache wrapper
export async function cached<T>(
  key: string,
  ttl: number, // seconds
  fn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Execute function
  const result = await fn();

  // Store in cache
  await redis.set(key, JSON.stringify(result), 'EX', ttl);

  return result;
}

// Invalidate pattern
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Usage
```typescript
// Cache report
app.get('/api/blood-analysis/report/:id', async (req, res) => {
  const { id } = req.params;

  const report = await cached(
    `report:${id}`,
    5 * 60, // 5 minutes
    async () => {
      return await db.query.bloodTests.findFirst({
        where: eq(bloodTests.id, id),
        with: {
          markers: true,
        },
      });
    }
  );

  res.json({ success: true, report });
});

// Invalidate when report updated
await db.update(bloodTests).set({ aiReport }).where(eq(bloodTests.id, reportId));
await redis.del(`report:${reportId}`);
```

### Cache RAG context
```typescript
// knowledge/storage.ts
export async function searchArticlesWithDiversityCached(
  keywords: string[],
  limit: number = 5,
  sources?: string[]
): Promise<ScrapedArticle[]> {
  const cacheKey = `rag:${keywords.join(',')}:${sources?.join(',') || 'all'}:${limit}`;

  return await cached(cacheKey, 60 * 60, async () => {
    return await searchArticlesWithDiversity(keywords, limit, sources);
  });
}
```

---

## GAINS ATTENDUS

### Performance:
- ✅ Report generation: non-blocking (queue)
- ✅ Database queries: 10x faster (indexes + relationnel)
- ✅ API response time: -40% (cache)
- ✅ Concurrent reports: 1 → 2-3 parallel

### Scalability:
- ✅ Queue handles load spikes
- ✅ Rate limiting protects resources
- ✅ Redis cache reduces DB load
- ✅ Horizontal scaling ready

### Maintainability:
- ✅ Fichiers <500 lignes
- ✅ Single Responsibility Principle
- ✅ Type safety (Zod + TypeScript)
- ✅ Testable units

### Reliability:
- ✅ Retry failed jobs (BullMQ)
- ✅ Error tracking per report
- ✅ Graceful degradation
- ✅ Audit trail

---

## ORDRE D'EXÉCUTION

1. ✅ Créer structure dossiers - 10 min
2. ✅ Refactor extraction (pdfParser, markerExtractor, unitNormalizer) - 45 min
3. ✅ Créer validation schemas Zod - 30 min
4. ✅ Créer nouveau database schema - 30 min
5. ✅ Écrire migration SQL - 30 min
6. ✅ Installer BullMQ + Redis - 10 min
7. ✅ Setup queue system - 45 min
8. ✅ Implémenter rate limiting - 20 min
9. ✅ Setup Redis cache - 25 min
10. ✅ Refactor routes avec validation - 30 min
11. ✅ Tests unitaires - 45 min
12. ✅ Commit & push - 5 min

**Total:** ~3h

---

**FIN PLAN ITERATION 4**
