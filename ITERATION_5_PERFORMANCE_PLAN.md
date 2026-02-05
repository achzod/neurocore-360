# ITERATION 5 - PERFORMANCE & TESTS PLAN

Date: 2026-02-05
Objectif: Optimiser performance AI + ajouter tests + monitoring

---

## PROBLÈMES ACTUELS

### 1. AI Generation Lente ❌
- **Durée:** 12-15 minutes par rapport
- **Breakdown:**
  - PDF parsing: 2-5s
  - Marker extraction: 1-2s
  - Analysis: 1-2s
  - **AI generation: 12-15 min** ← BOTTLENECK (95% du temps)
  - Multi-pass validation: 1-2 min

### 2. Pas de Cache ❌
- RAG context recalculé à chaque fois
- Pas de cache pour rapports similaires
- Pas de cache prompt templates

### 3. Pas de Monitoring ❌
- Pas de tracking erreurs
- Pas de métriques performance
- Pas d'alertes
- Debugging difficile

### 4. Pas de Tests ❌
- 0 tests unitaires
- 0 tests d'intégration
- 0 tests E2E
- 0% coverage

### 5. Bundle Size Non Optimisé ❌
- ~450KB bundle initial
- Pas de tree shaking optimal
- Recharts entier chargé
- Framer Motion non optimisé

---

## ÉTAPE 1: OPTIMISER AI GENERATION (60 min)

### Problème: 12-15 minutes

### Solution 1: Utiliser Sonnet au lieu d'Opus
```typescript
// ai/reportGenerator.ts

// AVANT:
const response = await anthropic.messages.create({
  model: "claude-opus-4-5-20251101", // Slow, expensive
  max_tokens: 100000,
  // ...
});

// APRÈS:
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929", // 4x faster, 4x cheaper
  max_tokens: 100000,
  // ...
});
```

**Gain:** 15 min → 4-5 min (-67%)
**Trade-off:** Légèrement moins de profondeur (acceptable pour V6)

### Solution 2: Streaming AI Response
```typescript
// ai/reportGenerator.ts
export async function generateComprehensiveReportStreaming(
  markers: unknown[],
  profile?: unknown,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 100000,
    messages: [{ role: "user", content: prompt }],
  });

  let fullReport = '';

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullReport += chunk.delta.text;
      onChunk?.(chunk.delta.text);
    }
  }

  return fullReport;
}
```

**Gain:** User voit le rapport se générer en temps réel (UX++)
**Implémentation:** WebSocket pour push chunks au frontend

### Solution 3: Paralléliser RAG queries
```typescript
// AVANT: Séquentiel (6s)
const ragContext = await getRAGContext(markers);
const deepDive = await getDeepDiveContext(markers);
const patterns = await detectPatterns(markers);

// APRÈS: Parallèle (2s)
const [ragContext, deepDive, patterns] = await Promise.all([
  getRAGContext(markers),
  getDeepDiveContext(markers),
  detectPatterns(markers)
]);
```

**Gain:** 6s → 2s (-67%)

### Solution 4: Cache prompt templates
```typescript
// ai/promptBuilder.ts
const PROMPT_CACHE = new Map<string, string>();

export function buildPrompt(
  markers: unknown[],
  profile: unknown,
  ragContext: string
): string {
  const cacheKey = `${markers.length}:${profile?.gender}`;

  if (PROMPT_CACHE.has(cacheKey)) {
    const template = PROMPT_CACHE.get(cacheKey)!;
    return interpolateTemplate(template, { markers, profile, ragContext });
  }

  const prompt = /* ... build prompt ... */;
  PROMPT_CACHE.set(cacheKey, prompt);
  return prompt;
}
```

**Gain:** 100-200ms saved

### Total Gains:
- 15 min → 4-5 min (**-67%**)
- Streaming → UX perçue instantanée
- Coût: $15/rapport → $4/rapport (-73%)

---

## ÉTAPE 2: WEBSOCKET STREAMING (45 min)

### Backend: Setup WebSocket
```typescript
// server/index.ts
import { WebSocketServer } from 'ws';
import { server } from './app';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const reportId = new URL(req.url!, 'http://localhost').searchParams.get('reportId');

  if (!reportId) {
    ws.close();
    return;
  }

  console.log(`Client connected for report ${reportId}`);

  ws.on('close', () => {
    console.log(`Client disconnected from report ${reportId}`);
  });

  // Store connection
  reportConnections.set(reportId, ws);
});

// Map to track connections
const reportConnections = new Map<string, WebSocket>();

export function sendChunkToClient(reportId: string, chunk: string) {
  const ws = reportConnections.get(reportId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
  }
}

export function sendStatusToClient(reportId: string, status: string) {
  const ws = reportConnections.get(reportId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'status', data: status }));
  }
}
```

### Intégrer dans worker
```typescript
// queue/workers.ts
import { sendChunkToClient, sendStatusToClient } from '../index';

export const reportWorker = new Worker(
  'blood-report-generation',
  async (job) => {
    const { reportId, markers, profile } = job.data;

    try {
      sendStatusToClient(reportId, 'processing');

      // Generate with streaming
      const report = await generateComprehensiveReportStreaming(
        markers,
        profile,
        (chunk) => {
          // Send chunk to client in real-time
          sendChunkToClient(reportId, chunk);
        }
      );

      sendStatusToClient(reportId, 'completed');

      await db.update(bloodTests).set({
        status: 'completed',
        aiReport: report,
        completedAt: new Date(),
      }).where(eq(bloodTests.id, reportId));

      return { success: true };
    } catch (error) {
      sendStatusToClient(reportId, 'failed');
      throw error;
    }
  },
  { concurrency: 2 }
);
```

### Frontend: Connect WebSocket
```typescript
// client/src/hooks/useReportStream.ts
import { useEffect, useState } from 'react';

export const useReportStream = (reportId: string) => {
  const [report, setReport] = useState('');
  const [status, setStatus] = useState<'connecting' | 'processing' | 'completed' | 'failed'>('connecting');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}?reportId=${reportId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'chunk') {
        setReport(prev => prev + message.data);
      } else if (message.type === 'status') {
        setStatus(message.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('failed');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [reportId]);

  return { report, status };
};
```

### Usage dans composant
```typescript
// BloodAnalysisDashboard/index.tsx
const { report, status } = useReportStream(reportId);

if (status === 'processing') {
  return (
    <div className="space-y-4">
      <h3>Génération en cours...</h3>
      <ReactMarkdown>{report}</ReactMarkdown>
      <Loader2 className="animate-spin" />
    </div>
  );
}
```

---

## ÉTAPE 3: MONITORING (30 min)

### Setup Sentry
```bash
npm install @sentry/node @sentry/react
```

### Backend
```typescript
// server/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});

export { Sentry };
```

### Middleware
```typescript
// server/middleware/errorHandler.ts
import { Sentry } from '../monitoring/sentry';
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);

  // Send to Sentry
  Sentry.captureException(error, {
    extra: {
      userId: req.userId,
      path: req.path,
      method: req.method,
    },
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
  });
}

// Usage
app.use(errorHandler);
```

### Frontend
```typescript
// client/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Custom metrics
```typescript
// server/monitoring/metrics.ts
import { Sentry } from './sentry';

export function trackReportGeneration(
  reportId: string,
  duration: number,
  success: boolean
) {
  Sentry.metrics.distribution('report.generation.duration', duration, {
    tags: { success: success.toString() },
  });

  if (!success) {
    Sentry.metrics.increment('report.generation.failed');
  }
}

export function trackAPICall(endpoint: string, statusCode: number, duration: number) {
  Sentry.metrics.distribution('api.response_time', duration, {
    tags: { endpoint, status: statusCode.toString() },
  });
}
```

---

## ÉTAPE 4: TESTS UNITAIRES (90 min)

### Setup Vitest
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
```

### Test: markerExtractor
```typescript
// server/blood-analysis/extraction/__tests__/markerExtractor.test.ts
import { describe, it, expect } from 'vitest';
import { extractMarkers } from '../markerExtractor';

describe('extractMarkers', () => {
  it('should extract markers from standard format', () => {
    const pdfText = `
      Glucose: 95 mg/dL
      HbA1c: 5.2 %
      Testosterone: 650 ng/dL
    `;

    const markers = extractMarkers(pdfText);

    expect(markers).toHaveLength(3);
    expect(markers[0]).toEqual({
      code: 'glucose',
      name: 'Glucose',
      value: 95,
      unit: 'mg/dL',
    });
  });

  it('should normalize units', () => {
    const pdfText = 'Testosterone: 22.5 nmol/L';
    const markers = extractMarkers(pdfText);

    expect(markers[0].value).toBeCloseTo(650, 0); // 22.5 * 28.84 ≈ 650 ng/dL
    expect(markers[0].unit).toBe('ng/dL');
  });

  it('should deduplicate markers', () => {
    const pdfText = `
      Glucose: 95 mg/dL
      Glucose: 95 mg/dL
    `;

    const markers = extractMarkers(pdfText);
    expect(markers).toHaveLength(1);
  });

  it('should handle invalid values', () => {
    const pdfText = 'Glucose: N/A mg/dL';
    const markers = extractMarkers(pdfText);

    expect(markers).toHaveLength(0);
  });
});
```

### Test: scoreCalculator
```typescript
// server/blood-analysis/analysis/__tests__/scoreCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMarkerScore, calculatePanelScore } from '../scoreCalculator';

describe('calculateMarkerScore', () => {
  it('should score optimal marker as 100', () => {
    const score = calculateMarkerScore({
      value: 85,
      optimalMin: 80,
      optimalMax: 100,
    });

    expect(score).toBe(100);
  });

  it('should score normal marker as 80', () => {
    const score = calculateMarkerScore({
      value: 75,
      normalMin: 60,
      normalMax: 100,
      optimalMin: 80,
      optimalMax: 100,
    });

    expect(score).toBe(80);
  });

  it('should score critical marker as 30', () => {
    const score = calculateMarkerScore({
      value: 150,
      normalMin: 60,
      normalMax: 100,
    });

    expect(score).toBeLessThanOrEqual(40);
  });
});

describe('calculatePanelScore', () => {
  it('should calculate weighted average', () => {
    const markers = [
      { status: 'optimal', weight: 1 }, // 100
      { status: 'normal', weight: 1 },  // 80
      { status: 'suboptimal', weight: 1 }, // 55
    ];

    const score = calculatePanelScore(markers);
    expect(score).toBeCloseTo((100 + 80 + 55) / 3, 0); // ≈ 78
  });
});
```

### Test: React hooks
```typescript
// client/src/hooks/__tests__/useBloodReport.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBloodReport } from '../useBloodReport';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBloodReport', () => {
  it('should fetch report successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        report: { id: '123', email: 'test@example.com' },
      }),
    });

    const { result } = renderHook(() => useBloodReport('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: '123',
      email: 'test@example.com',
    });
  });

  it('should handle error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Not found' }),
    });

    const { result } = renderHook(() => useBloodReport('invalid'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
```

### Test: React components
```typescript
// client/src/components/blood/__tests__/RadialScoreChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadialScoreChart } from '../RadialScoreChart';

describe('RadialScoreChart', () => {
  it('should render score', () => {
    render(<RadialScoreChart score={85} maxScore={100} size={200} />);

    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should render with correct color for optimal score', () => {
    const { container } = render(<RadialScoreChart score={85} maxScore={100} size={200} />);

    const path = container.querySelector('path');
    expect(path).toHaveAttribute('stroke', expect.stringContaining('10B981')); // Green
  });

  it('should render with correct color for critical score', () => {
    const { container } = render(<RadialScoreChart score={35} maxScore={100} size={200} />);

    const path = container.querySelector('path');
    expect(path).toHaveAttribute('stroke', expect.stringContaining('EF4444')); // Red
  });
});
```

### Run tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run specific test
npm test markerExtractor
```

### Target coverage: 60%+
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## ÉTAPE 5: BUNDLE OPTIMIZATION (30 min)

### 1. Lazy load Recharts
```typescript
// AVANT:
import { LineChart, Line, XAxis, YAxis } from 'recharts';

// APRÈS:
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
```

### 2. Tree shake Framer Motion
```typescript
// AVANT:
import { motion } from 'framer-motion';

// APRÈS (m pour LazyMotion):
import { LazyMotion, domAnimation, m } from 'framer-motion';

<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }}>...</m.div>
</LazyMotion>
```

### 3. Vite bundle analyzer
```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'bundle-stats.html' }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', 'recharts'],
          'utils': ['wouter', 'react-markdown'],
        },
      },
    },
  },
});
```

### 4. Compression
```bash
npm install -D vite-plugin-compression
```

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'brotli' }),
  ],
});
```

### Target: <300KB gzipped
- Before: ~450KB
- After: ~285KB (-37%)

---

## GAINS ATTENDUS

### Performance AI:
- ✅ Report generation: 15min → 5min (-67%)
- ✅ Cost per report: $15 → $4 (-73%)
- ✅ Streaming: Real-time feedback
- ✅ Parallel processing: 2-3 reports simultanés

### Frontend Performance:
- ✅ Bundle size: 450KB → 285KB (-37%)
- ✅ Time to Interactive: 3.5s → 2.2s (-37%)
- ✅ Lighthouse score: 75 → 92

### Code Quality:
- ✅ Test coverage: 0% → 60%+
- ✅ 85 tests unitaires
- ✅ CI/CD ready
- ✅ Monitoring actif

### Reliability:
- ✅ Error tracking (Sentry)
- ✅ Performance metrics
- ✅ Alerts on failures
- ✅ Debugging 10x plus rapide

---

## ORDRE D'EXÉCUTION

1. ✅ Changer modèle Opus → Sonnet - 10 min
2. ✅ Implémenter streaming AI - 30 min
3. ✅ Setup WebSocket backend - 25 min
4. ✅ Hook frontend useReportStream - 20 min
5. ✅ Paralléliser RAG queries - 15 min
6. ✅ Setup Sentry backend - 15 min
7. ✅ Setup Sentry frontend - 15 min
8. ✅ Setup Vitest - 10 min
9. ✅ Écrire tests unitaires - 90 min
10. ✅ Bundle optimization - 30 min
11. ✅ Tests E2E (Playwright) - 45 min
12. ✅ Documentation - 20 min
13. ✅ Commit & push - 5 min

**Total:** ~4h

---

## SCRIPT CI/CD (Bonus)

### .github/workflows/ci.yml
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: Build
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e
```

---

**FIN PLAN ITERATION 5**

**SCORE FINAL PROJETÉ: 9.1/10**

| Catégorie | Avant | Après | Amélioration |
|-----------|-------|-------|--------------|
| Contenu Médical | 8.5/10 | 9.5/10 | +12% |
| Frontend React | 7.0/10 | 9.0/10 | +29% |
| UI/UX Design | 6.5/10 | 9.0/10 | +38% |
| Architecture | 7.5/10 | 9.0/10 | +20% |
| Performance | 6.0/10 | 9.0/10 | +50% |
| **GLOBAL** | **7.2/10** | **9.1/10** | **+26%** |
