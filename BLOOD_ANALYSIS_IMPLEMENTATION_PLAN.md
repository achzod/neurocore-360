# BLOOD ANALYSIS - PLAN D'IMPLÉMENTATION COMPLET

**Date**: 2026-01-20
**Objectif**: Implémenter Blood Analysis avec RAG knowledge base
**Stack**: Node.js, Express, Drizzle ORM, Claude Opus 4.5, React, TailwindCSS

---

## 🎯 ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Landing → Checkout → Upload → Questionnaire → Processing  │
│                                     ↓                       │
│                                  Email ← Dashboard          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Upload Handler                                          │
│     ↓                                                       │
│  2. OCR Service (Google Vision AI)                          │
│     ↓                                                       │
│  3. Biomarker Extraction & Validation                       │
│     ↓                                                       │
│  4. RAG Knowledge Retrieval                                 │
│     ↓                                                       │
│  5. Claude Opus 4.5 Analysis Generation                     │
│     ↓                                                       │
│  6. PDF Generation (Puppeteer)                              │
│     ↓                                                       │
│  7. Email Notification                                      │
│     ↓                                                       │
│  8. Dashboard API                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /blood-analysis                                            │
│  ├─ /                     (Landing page)                    │
│  ├─ /checkout             (Stripe payment)                  │
│  ├─ /onboarding           (Upload + Questionnaire)          │
│  └─ /dashboard/:reportId                                    │
│      ├─ /overview         (Main dashboard)                  │
│      ├─ /systems          (9 pages systèmes)                │
│      ├─ /recommendations  (Suppléments, nutrition, etc.)    │
│      ├─ /action-plan      (30 days plan)                    │
│      ├─ /interconnections (Biomarker relations)             │
│      └─ /export           (PDF download)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 PHASE 1: SETUP & INFRASTRUCTURE

### 1.1 Database Schema (Drizzle)

**Fichier**: `db/schema.ts`

```typescript
// Table: blood_analysis_reports
export const bloodAnalysisReports = pgTable('blood_analysis_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),

  // Upload files
  uploadedFiles: json('uploaded_files').$type<{name: string, url: string, size: number}[]>(),

  // OCR extraction
  extractedBiomarkers: json('extracted_biomarkers').$type<Record<string, {value: number, unit: string}>>(),
  missingBiomarkers: json('missing_biomarkers').$type<string[]>(),
  ocrConfidence: json('ocr_confidence').$type<Record<string, number>>(),

  // Questionnaire
  questionnaireData: json('questionnaire_data').$type<QuestionnaireData>(),

  // Analysis (full JSON from Claude Opus 4.5)
  analysis: json('analysis').$type<BloodAnalysis>(),

  // PDF
  pdfUrl: text('pdf_url'),

  // Metadata
  processingStatus: text('processing_status').notNull().default('pending'), // pending | processing | completed | failed
  processingError: text('processing_error'),
  aiModel: text('ai_model').default('claude-opus-4-5-20251101'),

  // Timestamps
  testDate: timestamp('test_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),

  // For future comparisons
  previousReportId: integer('previous_report_id').references(() => bloodAnalysisReports.id)
});

// Table: blood_analysis_purchases
export const bloodAnalysisPurchases = pgTable('blood_analysis_purchases', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  amount: integer('amount').notNull(), // 9900 (99.00 EUR in cents)
  status: text('status').notNull(), // succeeded | pending | failed
  reportId: integer('report_id').references(() => bloodAnalysisReports.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Table: knowledge_base_embeddings (pour RAG)
export const knowledgeBaseEmbeddings = pgTable('knowledge_base_embeddings', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'huberman' | 'attia' | 'mpmd' | etc.
  articleTitle: text('article_title'),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI embeddings
  metadata: json('metadata').$type<{url?: string, date?: string, topics?: string[]}>(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

**Types TypeScript**:

```typescript
// server/types/bloodAnalysis.ts
export interface QuestionnaireData {
  // Profile
  age: number;
  sex: 'male' | 'female';
  weight: number; // kg
  height: number; // cm
  waist: number; // cm
  bodyfat: string;
  goal: string;

  // Lifestyle
  trainingFrequency: string;
  trainingType: string[];
  sleepHours: number;
  sleepQuality: number; // 1-10
  stressLevel: number; // 1-10
  dietType: string;
  proteinIntake: string;

  // Symptoms
  symptoms: string[];
  energyLevel: number; // 1-10
  libido: number; // 1-10

  // Medical history
  medicalHistory: string[];
  familyHistory: string[];
  medications: string;
  steroidHistory: string;
  alcoholConsumption: string;
  smoking: string;

  // Supplements
  currentSupplements: {
    name: string;
    dosage: string;
    duration: string;
  }[];
}

export interface BloodAnalysis {
  globalHealthScore: number; // 0-100
  globalSummary: string;

  systems: {
    hormones: SystemAnalysis;
    metabolism: SystemAnalysis;
    thyroid: SystemAnalysis;
    inflammation: SystemAnalysis;
    lipids: SystemAnalysis;
    vitamins_minerals: SystemAnalysis;
    liver: SystemAnalysis;
    kidney: SystemAnalysis;
    blood_cells: SystemAnalysis;
  };

  interconnections: Interconnection[];

  recommendations: {
    supplements: SupplementRecommendation[];
    nutrition: NutritionRecommendation[];
    lifestyle: LifestyleRecommendation[];
    medicalFollowup: MedicalFollowup[];
  };

  actionPlan30Days: ActionPlanItem[];

  retestProtocol: {
    recommendedDate: string;
    priorityBiomarkers: string[];
    whyRetest: string;
    whatToExpect: string;
  };
}

export interface SystemAnalysis {
  score: number; // 0-100
  status: 'optimal' | 'suboptimal' | 'problematic' | 'critical';
  keyFindings: string[];
  detailedAnalysis: string;
  biomarkersDetail: BiomarkerDetail[];
}

export interface BiomarkerDetail {
  name: string;
  value: number;
  unit: string;
  status: 'optimal' | 'high_optimal' | 'normal' | 'suboptimal' | 'low' | 'very_low';
  optimalRange: { min: number; max: number };
  interpretation: string;
  whyItMatters: string;
  shortTermConsequences?: string;
  longTermConsequences?: string;
  contributingFactors: string[];
  interconnections: string[];
}

export interface Interconnection {
  biomarkers: string[];
  relationship: string;
  impact: string;
  action: string;
}

export interface SupplementRecommendation {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
  why: string;
  expectedImpact: string;
  synergies: string[];
  warnings: string[];
  sources?: string[]; // e.g., ["Huberman Lab #15", "Examine.com"]
}

export interface NutritionRecommendation {
  category: string;
  recommendation: string;
  why: string;
  how: string;
  impact: string;
}

export interface LifestyleRecommendation {
  category: string;
  recommendation: string;
  why: string;
  how: string[];
  impact: string;
}

export interface MedicalFollowup {
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  reason: string;
  whatToSay: string;
  testsToRequest: string[];
}

export interface ActionPlanItem {
  day?: number;
  week?: number;
  actions: string[];
  why: string;
}
```

### 1.2 Installer Dépendances

```bash
# OCR
npm install @google-cloud/vision

# Embeddings (pour RAG)
npm install openai
npm install pgvector

# PDF generation
npm install puppeteer

# Image processing
npm install sharp

# Validation
npm install zod
```

### 1.3 Variables d'Environnement

**Ajouter à `.env`**:

```env
# Google Cloud Vision (OCR)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# OpenAI (pour embeddings RAG)
OPENAI_API_KEY=sk-...

# Anthropic (déjà présent)
ANTHROPIC_API_KEY=...

# Stripe Blood Analysis
STRIPE_BLOOD_ANALYSIS_PRICE_ID=price_...

# Storage (S3, Cloudflare R2, ou local)
STORAGE_PROVIDER=local # ou 's3' ou 'r2'
STORAGE_BUCKET=blood-analysis-uploads
STORAGE_URL=http://localhost:5000/uploads
```

---

## 📋 PHASE 2: RAG KNOWLEDGE BASE

### 2.1 Script d'Indexation des Knowledge Bases

**Fichier**: `scripts/index-knowledge-bases.ts`

**Fonction**:
- Lit les 7 fichiers JSON (Huberman, Attia, etc.)
- Chunke le contenu en morceaux de ~500 tokens
- Génère embeddings OpenAI
- Stocke dans PostgreSQL avec pgvector

**Stratégie de chunking**:
- Par article pour sources courtes (MPMD, RP, SBS)
- Par section pour Huberman/Attia (articles très longs)

```typescript
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { db } from '../db';
import { knowledgeBaseEmbeddings } from '../db/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface KnowledgeSource {
  file: string;
  source: string;
  parseStrategy: 'full_article' | 'chunked';
}

const SOURCES: KnowledgeSource[] = [
  { file: 'huberman-full.json', source: 'huberman', parseStrategy: 'chunked' },
  { file: 'peter-attia-full.json', source: 'peter_attia', parseStrategy: 'chunked' },
  { file: 'mpmd-full.json', source: 'mpmd', parseStrategy: 'full_article' },
  { file: 'examine-full.json', source: 'examine', parseStrategy: 'full_article' },
  { file: 'masterjohn-full.json', source: 'masterjohn', parseStrategy: 'full_article' },
  { file: 'rp-full.json', source: 'rp', parseStrategy: 'full_article' },
  { file: 'sbs-full.json', source: 'sbs', parseStrategy: 'full_article' }
];

async function chunkText(text: string, maxTokens: number = 500): Promise<string[]> {
  // Simple chunking by sentences, aiming for ~maxTokens per chunk
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const estimatedTokens = (currentChunk + sentence).length / 4; // rough estimate

    if (estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dimensions, cheaper
    input: text
  });

  return response.data[0].embedding;
}

async function indexSource(sourceConfig: KnowledgeSource) {
  console.log(`\n📚 Indexing ${sourceConfig.source}...`);

  const filePath = path.join(__dirname, '../scraped-data', sourceConfig.file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const articles = data.articles || data;
  let totalChunks = 0;

  for (const article of articles) {
    const title = article.title || article.name || 'Untitled';
    const content = article.content || article.text || '';

    if (!content || content.length < 100) continue; // Skip empty

    let chunks: string[];

    if (sourceConfig.parseStrategy === 'chunked' && content.length > 2000) {
      chunks = await chunkText(content, 500);
    } else {
      chunks = [content];
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const embedding = await generateEmbedding(chunk);

      // Insert into DB
      await db.insert(knowledgeBaseEmbeddings).values({
        source: sourceConfig.source,
        articleTitle: title,
        content: chunk,
        embedding: embedding,
        metadata: {
          url: article.url,
          date: article.date,
          chunkIndex: chunks.length > 1 ? i : undefined,
          totalChunks: chunks.length > 1 ? chunks.length : undefined
        }
      });

      totalChunks++;

      if (totalChunks % 10 === 0) {
        console.log(`  ✓ ${totalChunks} chunks indexed...`);
      }

      // Rate limit: OpenAI allows ~3000 req/min for embeddings
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`✅ ${sourceConfig.source}: ${totalChunks} chunks indexed`);
}

async function main() {
  console.log('🚀 Starting Knowledge Base Indexation...\n');

  // Clear existing embeddings (optional, pour re-index)
  // await db.delete(knowledgeBaseEmbeddings);

  for (const source of SOURCES) {
    try {
      await indexSource(source);
    } catch (error) {
      console.error(`❌ Error indexing ${source.source}:`, error);
    }
  }

  console.log('\n✅ Indexation Complete!');
  process.exit(0);
}

main();
```

**Exécution**:
```bash
npx tsx scripts/index-knowledge-bases.ts
```

**Coût estimé OpenAI**:
- text-embedding-3-small: $0.02 / 1M tokens
- ~27 MB de texte ≈ 6.75M tokens
- Coût: ~$0.14 (négligeable)

### 2.2 RAG Retrieval Service

**Fichier**: `server/ragService.ts`

```typescript
import OpenAI from 'openai';
import { db } from '../db';
import { knowledgeBaseEmbeddings } from '../db/schema';
import { sql } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RAGContext {
  content: string;
  source: string;
  articleTitle: string;
  relevanceScore: number;
}

export async function retrieveRelevantContext(
  query: string,
  topK: number = 5,
  sources?: string[]
): Promise<RAGContext[]> {
  // Generate embedding for query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });

  const embedding = queryEmbedding.data[0].embedding;

  // Cosine similarity search using pgvector
  const results = await db.execute(sql`
    SELECT
      content,
      source,
      article_title,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as relevance_score
    FROM knowledge_base_embeddings
    ${sources ? sql`WHERE source = ANY(${sources})` : sql``}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${topK}
  `);

  return results.rows.map(row => ({
    content: row.content as string,
    source: row.source as string,
    articleTitle: row.article_title as string,
    relevanceScore: row.relevance_score as number
  }));
}

export async function buildRAGContextForBiomarker(
  biomarkerName: string,
  userValue: number,
  optimalRange: { min: number; max: number }
): Promise<string> {
  const queries = [
    `${biomarkerName} optimal range benefits`,
    `how to optimize ${biomarkerName} naturally`,
    `${biomarkerName} supplements protocols`,
    `${biomarkerName} lifestyle interventions`
  ];

  const allContexts: RAGContext[] = [];

  for (const query of queries) {
    const contexts = await retrieveRelevantContext(query, 3);
    allContexts.push(...contexts);
  }

  // Deduplicate and sort by relevance
  const uniqueContexts = Array.from(
    new Map(allContexts.map(c => [c.content, c])).values()
  ).sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Format for prompt
  let contextText = `## Relevant Research & Protocols for ${biomarkerName}\n\n`;

  for (const ctx of uniqueContexts.slice(0, 8)) {
    contextText += `### Source: ${ctx.source} - "${ctx.articleTitle}" (Relevance: ${(ctx.relevanceScore * 100).toFixed(1)}%)\n\n`;
    contextText += `${ctx.content.substring(0, 1000)}...\n\n`;
    contextText += `---\n\n`;
  }

  return contextText;
}
```

---

## 📋 PHASE 3: BACKEND BLOOD ANALYSIS

### 3.1 OCR Service

**Fichier**: `server/ocrService.ts`

```typescript
import vision from '@google-cloud/vision';
import sharp from 'sharp';

const client = new vision.ImageAnnotatorClient();

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const [result] = await client.textDetection(imageBuffer);
  const detections = result.textAnnotations;

  if (!detections || detections.length === 0) {
    throw new Error('No text detected in image');
  }

  // First annotation contains full text
  return detections[0].description || '';
}

export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  // Enhance image for better OCR
  return sharp(buffer)
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}
```

### 3.2 Biomarker Extraction

**Fichier**: `server/biomarkerExtractor.ts`

```typescript
const BIOMARKER_PATTERNS: Record<string, RegExp[]> = {
  testosterone_total: [
    /testost[ée]rone\s+totale?\s*:?\s*([0-9.,]+)\s*(ng\/ml|ng\/dl|nmol\/l)/i,
    /t[ée]sto\s+tot\s*:?\s*([0-9.,]+)/i,
  ],
  testosterone_free: [
    /testost[ée]rone\s+libre?\s*:?\s*([0-9.,]+)\s*(pg\/ml|pmol\/l)/i,
  ],
  // ... tous les 39 biomarqueurs
};

export interface ExtractedBiomarker {
  value: number;
  unit: string;
  confidence: number;
}

export function extractBiomarkers(ocrText: string): {
  extracted: Record<string, ExtractedBiomarker>;
  missing: string[];
} {
  const extracted: Record<string, ExtractedBiomarker> = {};
  const missing: string[] = [];

  for (const [biomarkerKey, patterns] of Object.entries(BIOMARKER_PATTERNS)) {
    let found = false;

    for (const pattern of patterns) {
      const match = ocrText.match(pattern);

      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[2] || '';

        extracted[biomarkerKey] = {
          value,
          unit,
          confidence: 0.95 // TODO: implement real confidence scoring
        };

        found = true;
        break;
      }
    }

    if (!found) {
      missing.push(biomarkerKey);
    }
  }

  return { extracted, missing };
}

// Unit conversions to standard
export function normalizeUnits(biomarkers: Record<string, ExtractedBiomarker>): Record<string, ExtractedBiomarker> {
  const normalized = { ...biomarkers };

  // Testosterone total: convert to ng/dL
  if (normalized.testosterone_total) {
    const { value, unit } = normalized.testosterone_total;

    if (unit.toLowerCase().includes('nmol')) {
      normalized.testosterone_total.value = value * 28.85;
      normalized.testosterone_total.unit = 'ng/dL';
    } else if (unit.toLowerCase().includes('ng/ml')) {
      normalized.testosterone_total.value = value * 100;
      normalized.testosterone_total.unit = 'ng/dL';
    }
  }

  // ... normaliser tous les biomarqueurs

  return normalized;
}
```

### 3.3 Analysis Generation avec RAG

**Fichier**: `server/bloodAnalysisEngine.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { buildRAGContextForBiomarker } from './ragService';
import type { BloodAnalysis, QuestionnaireData } from './types/bloodAnalysis';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en médecine fonctionnelle et optimisation de la santé, spécialisé dans l'interprétation d'analyses sanguines pour la performance et le biohacking.

Tu as accès à une knowledge base avec les protocoles des meilleurs experts:
- Dr. Andrew Huberman (Huberman Lab)
- Dr. Peter Attia (The Drive)
- Examine.com (études scientifiques)
- Chris Masterjohn PhD
- Renaissance Periodization
- Stronger By Science
- More Plates More Dates

TONE:
- Tutoiement (tu/ton/ta)
- Pédagogue mais pas condescendant
- Basé sur la science (cite sources si pertinent)
- Actionnable et concret
- Ni alarmiste ni trop rassurant

RANGES:
- Utilise les ranges OPTIMAUX (Huberman/Attia), pas juste "normaux" de labo
- Explique la différence entre "normal" et "optimal"

STRUCTURE:
- Retourne un JSON strict conforme au schema BloodAnalysis
- Détecte et explique les interconnexions entre biomarqueurs
- Cite les sources (ex: "[Source: Huberman Lab #15]") pour recommandations`;

export async function generateBloodAnalysis(
  extractedBiomarkers: Record<string, {value: number, unit: string}>,
  questionnaireData: QuestionnaireData
): Promise<BloodAnalysis> {

  // Build RAG context for key biomarkers
  const ragContexts: string[] = [];

  for (const [biomarkerKey, data] of Object.entries(extractedBiomarkers)) {
    if (isKeyBiomarker(biomarkerKey)) {
      const context = await buildRAGContextForBiomarker(
        biomarkerKey,
        data.value,
        getOptimalRange(biomarkerKey)
      );
      ragContexts.push(context);
    }
  }

  const ragContextFull = ragContexts.join('\n\n');

  // Build user prompt
  const userPrompt = `
# DONNÉES UTILISATEUR

## Profil
- Âge: ${questionnaireData.age} ans
- Sexe: ${questionnaireData.sex}
- Poids: ${questionnaireData.weight} kg
- Taille: ${questionnaireData.height} cm
- IMC: ${calculateBMI(questionnaireData.weight, questionnaireData.height).toFixed(1)}
- Tour de taille: ${questionnaireData.waist} cm
- % Graisse estimé: ${questionnaireData.bodyfat}
- Objectif: ${questionnaireData.goal}

## Lifestyle
- Entraînement: ${questionnaireData.trainingFrequency}, ${questionnaireData.trainingType.join(', ')}
- Sommeil: ${questionnaireData.sleepHours}h/nuit, qualité ${questionnaireData.sleepQuality}/10
- Stress: ${questionnaireData.stressLevel}/10
- Alimentation: ${questionnaireData.dietType}
- Protéines: ${questionnaireData.proteinIntake}

## Symptômes
${questionnaireData.symptoms.join(', ')}

## Historique Médical
${questionnaireData.medicalHistory.join(', ')}

## Suppléments Actuels
${questionnaireData.currentSupplements.map(s => `- ${s.name}: ${s.dosage} (depuis ${s.duration})`).join('\n')}

# BIOMARQUEURS MESURÉS

${formatBiomarkersForPrompt(extractedBiomarkers)}

# KNOWLEDGE BASE CONTEXT (Evidence-Based Protocols)

${ragContextFull}

# TA MISSION

Génère une analyse JSON COMPLÈTE conforme au schema BloodAnalysis TypeScript.

IMPORTANT:
1. Utilise les ranges optimaux de la knowledge base (Huberman/Attia), pas juste ranges labos
2. Cite les sources pour chaque recommandation importante (ex: "[Source: Huberman Lab #15]")
3. Détecte les interconnexions entre biomarqueurs (ex: Zinc bas → Testo basse)
4. Donne des dosages précis pour suppléments
5. Explique les conséquences court terme ET long terme si biomarqueur hors norme
6. Priorise les actions par impact (quick wins d'abord)

Génère maintenant l'analyse complète en JSON valide.
`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 16000,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: userPrompt
    }]
  });

  const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON
  const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  const analysis: BloodAnalysis = JSON.parse(jsonMatch[0]);

  return analysis;
}

function isKeyBiomarker(key: string): boolean {
  const keyBiomarkers = [
    'testosterone_total', 'testosterone_free', 'estradiol',
    'glucose_fasting', 'insulin_fasting',
    'tsh', 't3_free', 't4_free',
    'vitamin_d', 'b12',
    'hscrp', 'homocysteine'
  ];

  return keyBiomarkers.includes(key);
}

function getOptimalRange(biomarkerKey: string): { min: number; max: number } {
  // TODO: Load from knowledge base or constants
  const optimalRanges: Record<string, {min: number, max: number}> = {
    testosterone_total: { min: 550, max: 900 }, // ng/dL
    // ... tous les 39
  };

  return optimalRanges[biomarkerKey] || { min: 0, max: 0 };
}

function calculateBMI(weight: number, height: number): number {
  const heightMeters = height / 100;
  return weight / (heightMeters * heightMeters);
}

function formatBiomarkersForPrompt(biomarkers: Record<string, {value: number, unit: string}>): string {
  let text = '';

  for (const [key, data] of Object.entries(biomarkers)) {
    text += `- ${key}: ${data.value} ${data.unit}\n`;
  }

  return text;
}
```

### 3.4 Routes API

**Fichier**: `server/routes.ts` (ajouter routes Blood Analysis)

```typescript
// Purchase Blood Analysis
app.post('/api/blood-analysis/purchase', async (req, res) => {
  const { userId } = req.body;

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 9900, // 99.00 EUR
    currency: 'eur',
    metadata: {
      userId: userId.toString(),
      product: 'blood_analysis'
    }
  });

  // Save purchase record
  await db.insert(bloodAnalysisPurchases).values({
    userId,
    stripePaymentIntentId: paymentIntent.id,
    amount: 9900,
    status: 'pending'
  });

  res.json({ clientSecret: paymentIntent.client_secret });
});

// Upload blood test results
app.post('/api/blood-analysis/upload', upload.array('files'), async (req, res) => {
  const { userId } = req.body;
  const files = req.files as Express.Multer.File[];

  // Save files to storage
  const uploadedFiles = files.map(file => ({
    name: file.originalname,
    url: `/uploads/${file.filename}`,
    size: file.size
  }));

  // Create report record
  const [report] = await db.insert(bloodAnalysisReports).values({
    userId: parseInt(userId),
    uploadedFiles,
    processingStatus: 'pending'
  }).returning();

  res.json({ reportId: report.id });
});

// Submit questionnaire
app.post('/api/blood-analysis/:reportId/questionnaire', async (req, res) => {
  const { reportId } = req.params;
  const questionnaireData: QuestionnaireData = req.body;

  // Update report with questionnaire
  await db.update(bloodAnalysisReports)
    .set({ questionnaireData })
    .where(eq(bloodAnalysisReports.id, parseInt(reportId)));

  // Trigger processing (async job)
  processBloodAnalysis(parseInt(reportId));

  res.json({ success: true });
});

// Get report
app.get('/api/blood-analysis/:reportId', async (req, res) => {
  const { reportId } = req.params;

  const report = await db.query.bloodAnalysisReports.findFirst({
    where: eq(bloodAnalysisReports.id, parseInt(reportId))
  });

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json(report);
});

// Export PDF
app.get('/api/blood-analysis/:reportId/pdf', async (req, res) => {
  const { reportId } = req.params;

  const report = await db.query.bloodAnalysisReports.findFirst({
    where: eq(bloodAnalysisReports.id, parseInt(reportId))
  });

  if (!report || !report.pdfUrl) {
    return res.status(404).json({ error: 'PDF not found' });
  }

  res.redirect(report.pdfUrl);
});

async function processBloodAnalysis(reportId: number) {
  try {
    // Update status
    await db.update(bloodAnalysisReports)
      .set({ processingStatus: 'processing' })
      .where(eq(bloodAnalysisReports.id, reportId));

    // Get report
    const report = await db.query.bloodAnalysisReports.findFirst({
      where: eq(bloodAnalysisReports.id, reportId)
    });

    if (!report) throw new Error('Report not found');

    // Step 1: OCR
    const ocrTexts: string[] = [];
    for (const file of report.uploadedFiles) {
      const buffer = fs.readFileSync(file.url);
      const preprocessed = await preprocessImage(buffer);
      const text = await extractTextFromImage(preprocessed);
      ocrTexts.push(text);
    }

    // Step 2: Extract biomarkers
    const fullText = ocrTexts.join('\n');
    const { extracted, missing } = extractBiomarkers(fullText);
    const normalized = normalizeUnits(extracted);

    // Step 3: Generate analysis with RAG
    const analysis = await generateBloodAnalysis(normalized, report.questionnaireData);

    // Step 4: Generate PDF
    const pdfBuffer = await generateBloodAnalysisPDF(report, analysis);
    const pdfPath = `/uploads/pdfs/blood-report-${reportId}.pdf`;
    fs.writeFileSync(`./uploads/pdfs/blood-report-${reportId}.pdf`, pdfBuffer);

    // Step 5: Update report
    await db.update(bloodAnalysisReports)
      .set({
        extractedBiomarkers: normalized,
        missingBiomarkers: missing,
        analysis,
        pdfUrl: pdfPath,
        processingStatus: 'completed',
        completedAt: new Date()
      })
      .where(eq(bloodAnalysisReports.id, reportId));

    // Step 6: Send email
    await sendBloodAnalysisReadyEmail(report.userId, reportId, analysis.globalHealthScore);

  } catch (error) {
    console.error('Error processing blood analysis:', error);

    await db.update(bloodAnalysisReports)
      .set({
        processingStatus: 'failed',
        processingError: error.message
      })
      .where(eq(bloodAnalysisReports.id, reportId));
  }
}
```

---

## 📋 PHASE 4: FRONTEND

### 4.1 Routes

**Fichier**: `client/src/App.tsx` (ajouter routes)

```tsx
// Blood Analysis routes
<Route path="/blood-analysis">
  <Route index element={<BloodAnalysisLanding />} />
  <Route path="checkout" element={<BloodAnalysisCheckout />} />
  <Route path="onboarding" element={<BloodAnalysisOnboarding />} />
  <Route path="dashboard/:reportId">
    <Route index element={<BloodAnalysisDashboard />} />
    <Route path="systems/:system" element={<SystemDetailPage />} />
    <Route path="recommendations">
      <Route path="supplements" element={<SupplementsPage />} />
      <Route path="nutrition" element={<NutritionPage />} />
      <Route path="lifestyle" element={<LifestylePage />} />
    </Route>
    <Route path="action-plan" element={<ActionPlanPage />} />
    <Route path="interconnections" element={<InterconnectionsPage />} />
  </Route>
</Route>
```

### 4.2 Design System (Biohacking Futuriste)

**Fichier**: `client/src/styles/bloodAnalysis.css`

```css
/* Blood Analysis Theme - Biohacking Futuriste */

:root {
  /* Backgrounds */
  --blood-bg-primary: #0A0E27;
  --blood-bg-secondary: #151932;
  --blood-bg-card: rgba(20, 25, 45, 0.6);

  /* Accents */
  --blood-cyan: #00F0FF;
  --blood-orange: #FF6B00;
  --blood-green: #00FF9F;
  --blood-red: #FF3366;
  --blood-purple: #B87FFF;
  --blood-yellow: #FFD700;

  /* Text */
  --blood-text-primary: #FFFFFF;
  --blood-text-secondary: #A0AEC0;
  --blood-text-muted: #718096;

  /* Effects */
  --blood-glow-cyan: 0 0 20px rgba(0, 240, 255, 0.4);
  --blood-glow-orange: 0 0 20px rgba(255, 107, 0, 0.4);
}

.blood-dashboard {
  background: var(--blood-bg-primary);
  min-height: 100vh;
  color: var(--blood-text-primary);
  font-family: 'Inter', sans-serif;
}

.bio-card {
  background: var(--blood-bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bio-card:hover {
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: var(--blood-glow-cyan);
  transform: translateY(-2px);
}

.biomarker-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--blood-cyan), var(--blood-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
}

.status-optimal { color: var(--blood-green); }
.status-suboptimal { color: var(--blood-orange); }
.status-critical { color: var(--blood-red); }

/* Particles background */
#particles-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.scan-lines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 240, 255, 0.03),
    rgba(0, 240, 255, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
}
```

### 4.3 Components Clés

**SystemCard.tsx**, **BiomarkerDetailCard.tsx**, **SupplementCard.tsx**, etc.

(Voir workflow complet pour détails - trop long ici)

---

## 📋 PHASE 5: TESTING & DEPLOYMENT

### 5.1 Tests

```bash
# Test OCR
npx tsx scripts/test-ocr.ts

# Test RAG
npx tsx scripts/test-rag.ts

# Test full workflow
npx tsx scripts/test-blood-analysis-workflow.ts
```

### 5.2 Build

```bash
npm run build
```

### 5.3 Git Commit & Push

```bash
git add .
git commit -m "feat: implement Blood Analysis with RAG knowledge base

- Add 7 knowledge bases indexing (Huberman, Attia, MPMD, etc.)
- Implement RAG retrieval with pgvector
- Create Blood Analysis backend (OCR, biomarker extraction, Claude Opus 4.5 analysis)
- Build biohacking futuristic dashboard UI (14+ pages)
- Add PDF generation and email notifications
- Integrate optimal ranges from research (Huberman/Attia protocols)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

### 5.4 Deploy Verification

```bash
# Wait for Render auto-deploy
sleep 120

# Check deployment
curl -I https://neurocore-360.onrender.com

# Verify new routes
curl https://neurocore-360.onrender.com/api/blood-analysis/health
```

---

## 📊 ESTIMATION TEMPS & COÛTS

### Temps d'Implémentation

| Phase | Temps Estimé |
|-------|--------------|
| Setup & Infrastructure | 2h |
| RAG Knowledge Base | 3h |
| Backend Blood Analysis | 6h |
| Frontend Dashboard | 8h |
| PDF Generation | 2h |
| Testing | 2h |
| **TOTAL** | **~23h** |

### Coûts Opérationnels (par analyse)

| Service | Coût |
|---------|------|
| Google Cloud Vision (OCR) | $0.0015 |
| OpenAI Embeddings (RAG) | $0.00002 |
| Claude Opus 4.5 (16k tokens) | $0.24 |
| Storage (S3/R2) | $0.001 |
| **TOTAL par analyse** | **~$0.25** |

**Marge**: 99€ - 0.25€ = **98.75€ profit par analyse** (99.75%)

---

## ✅ CHECKLIST AVANT DEPLOY

- [ ] Database migrations applied
- [ ] Knowledge bases indexed (run `index-knowledge-bases.ts`)
- [ ] Environment variables configured
- [ ] Google Cloud Vision credentials configured
- [ ] Stripe Blood Analysis product created
- [ ] All TypeScript errors fixed
- [ ] Build successful (client + server)
- [ ] Git committed & pushed
- [ ] Render deployment triggered
- [ ] Production tested (upload → questionnaire → dashboard)

---

**FIN DU PLAN D'IMPLÉMENTATION**

**Status**: 📋 PLAN COMPLET - Prêt pour exécution étape par étape
