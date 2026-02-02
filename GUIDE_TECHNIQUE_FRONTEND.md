# GUIDE TECHNIQUE FRONTEND - REFONTE UI/UX RAPPORT SANGUIN

**Date:** 2026-01-31
**Stack:** React 18 + TypeScript 5 + Framer Motion + TailwindCSS + Vite
**Target:** Production-ready, performant, accessible biohacking dashboard

---

## TABLE DES MATIÈRES

1. [Setup & Configuration](#1-setup--configuration)
2. [Component Architecture](#2-component-architecture)
3. [Performance Strategy](#3-performance-strategy)
4. [Accessibility Implementation](#4-accessibility-implementation)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment Checklist](#6-deployment-checklist)

---

## 1. SETUP & CONFIGURATION

### 1.1 Dependencies Installation

**Vérifier les dépendances existantes:**

```bash
# Lire package.json
cat package.json | grep -E "framer-motion|lucide-react|@tanstack/react-query"

# Expected output:
# "framer-motion": "^11.x.x" ✅
# "lucide-react": "^0.x.x" ✅
# "@tanstack/react-query": "^5.x.x" ✅
```

**Si manquantes, installer:**

```bash
# Core dependencies (normalement déjà installées)
npm install framer-motion lucide-react

# Performance monitoring (optionnel pour debug)
npm install --save-dev vite-plugin-bundle-analyzer
```

---

### 1.2 TypeScript Configuration

**Fichier:** `tsconfig.json`

**Vérifications obligatoires:**

```json
{
  "compilerOptions": {
    "strict": true,                    // ✅ Type safety maximale
    "noImplicitAny": true,            // ✅ Pas de 'any' implicite
    "strictNullChecks": true,         // ✅ null/undefined explicites
    "noUnusedLocals": true,           // ✅ Détecte variables inutilisées
    "noUnusedParameters": true,       // ✅ Détecte params inutilisés
    "baseUrl": ".",                   // ✅ Pour alias @
    "paths": {
      "@/*": ["./client/src/*"]       // ✅ Imports absolus
    }
  }
}
```

**Test de validation:**

```bash
# Vérifier que les alias @ fonctionnent
npx tsc --noEmit

# Expected: No errors
# Si erreur "Cannot find module '@/...'", vérifier paths config
```

---

### 1.3 Vite Configuration

**Fichier:** `vite.config.ts`

**Optimisations critiques:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },

  build: {
    // Code splitting stratégique
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'framer-motion': ['framer-motion'],
          'query-vendor': ['@tanstack/react-query'],

          // App chunks
          'blood-components': [
            './client/src/components/blood/MetricCard3D',
            './client/src/components/blood/RadialScoreChart',
            './client/src/components/blood/InteractiveHeatmap',
          ],
        },
      },
    },

    // Limites de taille
    chunkSizeWarningLimit: 500, // KB - alerte si chunk > 500KB

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,     // ✅ Remove console.log en prod
        drop_debugger: true,    // ✅ Remove debugger
        pure_funcs: ['console.info', 'console.debug'],
      },
    },
  },

  // Preview server (pour tester build local)
  preview: {
    port: 4173,
    strictPort: true,
  },
});
```

---

### 1.4 Tailwind Configuration

**Fichier:** `tailwind.config.ts`

**Extensions nécessaires pour blood report:**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Typography scales (10 niveaux)
      fontSize: {
        'display-1': ['96px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '200' }],
        'display-2': ['72px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-3': ['48px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'heading-1': ['36px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-2': ['24px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
        'heading-3': ['20px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'body': ['16px', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },

      // Font families
      fontFamily: {
        display: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
        body: ['IBM Plex Sans', 'SF Pro', 'Segoe UI', 'system-ui', 'sans-serif'],
        data: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },

      // Colors (Blood report palette)
      colors: {
        blood: {
          bg: {
            primary: '#0a0b0d',
            secondary: '#141518',
            tertiary: '#1a1b1f',
            elevated: '#1e2025',
          },
          status: {
            optimal: '#06b6d4',
            normal: '#3b82f6',
            suboptimal: '#f59e0b',
            critical: '#f43f5e',
          },
        },
      },

      // Animations
      animation: {
        'grain': 'grain 8s steps(10) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
      },

      keyframes: {
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -5%)' },
          '20%': { transform: 'translate(-10%, 5%)' },
          '30%': { transform: 'translate(5%, -10%)' },
          '40%': { transform: 'translate(-5%, 15%)' },
          '50%': { transform: 'translate(-10%, 5%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 10%)' },
          '80%': { transform: 'translate(-15%, 0%)' },
          '90%': { transform: 'translate(10%, 5%)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
        },
        'scan-line': {
          '0%': { top: '-10%' },
          '100%': { top: '110%' },
        },
      },

      // Backdrop blur support
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

### 1.5 Directory Structure

**Structure recommandée:**

```
client/src/
├── components/
│   ├── blood/                      # Blood report components
│   │   ├── MetricCard3D.tsx
│   │   ├── RadialScoreChart.tsx
│   │   ├── InteractiveHeatmap.tsx
│   │   ├── TrendSparkline.tsx
│   │   ├── BiomarkerTimeline.tsx
│   │   ├── ProtocolStepper.tsx
│   │   ├── CitationTooltip.tsx
│   │   ├── AnimatedStatCard.tsx
│   │   ├── ExpandableInsight.tsx
│   │   └── GradientDivider.tsx
│   ├── ui/                         # Generic UI components
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   └── layout/                     # Layout components
│       ├── Header.tsx
│       └── Footer.tsx
├── lib/
│   ├── motion-variants.ts          # Framer Motion variants
│   ├── markdown-utils.tsx          # Markdown parsing + caching
│   └── bloodScores.ts              # Score calculation logic
├── styles/
│   ├── typography.css              # Typography system
│   ├── blood-theme.css             # Color system + CSS vars
│   ├── layout.css                  # Grid system
│   ├── effects.css                 # Visual effects (glows, grain)
│   ├── responsive.css              # Responsive breakpoints
│   └── accessibility.css           # A11y overrides
├── pages/
│   └── BloodAnalysisReport.tsx     # Main report page
├── hooks/
│   ├── useScrollReveal.ts          # Scroll-based animations
│   └── useMediaQuery.ts            # Responsive hooks
└── types/
    └── blood.ts                     # Blood report TypeScript types
```

**Commande pour créer structure:**

```bash
# Créer tous les dossiers
mkdir -p client/src/{components/blood,components/ui,components/layout,lib,styles,hooks}

# Vérifier
ls -R client/src/
```

---

### 1.6 Git Workflow

**Branches strategy:**

```bash
# Branche principale: main
# Branches feature: feature/blood-report-refonte

# Créer branche feature
git checkout -b feature/blood-report-refonte

# Commit strategy: atomic commits
git add client/src/components/blood/MetricCard3D.tsx
git commit -m "feat(blood): add MetricCard3D component with 3D parallax

- 3D card tilt on hover using Framer Motion
- Glassmorphism background with backdrop blur
- Animated gradient borders
- Status-based glow effects
- Grain texture overlay
- Props: title, value, unit, status, trend, icon"

# Push régulièrement
git push origin feature/blood-report-refonte
```

**Commit message convention:**

```
feat(scope): short description

- Bullet point 1
- Bullet point 2

BREAKING CHANGE: (si applicable)
```

---

## 2. COMPONENT ARCHITECTURE

### 2.1 Component Patterns

**Pattern 1: Presentational Component (Pure UI)**

```typescript
// File: client/src/components/blood/MetricCard3D.tsx

import { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * MetricCard3D - Premium card with 3D parallax effect
 *
 * @example
 * <MetricCard3D
 *   title="Testostérone"
 *   value={650}
 *   unit="ng/dL"
 *   status="optimal"
 * />
 */

// 1. Props interface (strict typing)
interface MetricCard3DProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: ReactNode;
  status?: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  children?: ReactNode;
}

// 2. Component implementation (memoized)
export const MetricCard3D = memo(({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  status = 'normal',
  children,
}: MetricCard3DProps) => {
  // 3. Local state (minimal)
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 4. Computed values (memoized)
  const statusColors = useMemo(() => ({
    optimal: { border: 'rgba(6, 182, 212, 0.4)', glow: 'rgba(6, 182, 212, 0.2)', text: '#06b6d4' },
    normal: { border: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    suboptimal: { border: 'rgba(245, 158, 11, 0.4)', glow: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
    critical: { border: 'rgba(244, 63, 94, 0.4)', glow: 'rgba(244, 63, 94, 0.2)', text: '#f43f5e' },
  }[status]), [status]);

  // 5. Event handlers (useCallback)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  }, [mouseX, mouseY]);

  // 6. Render (JSX)
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      // ... rest of JSX
    >
      {/* Component content */}
    </motion.div>
  );
});

// 7. Display name (for DevTools)
MetricCard3D.displayName = 'MetricCard3D';
```

**Why this pattern:**
- ✅ Type safety (props interface)
- ✅ Performance (memo, useMemo, useCallback)
- ✅ Maintainability (clear structure, comments)
- ✅ Reusability (no business logic, pure UI)

---

**Pattern 2: Container Component (Business Logic)**

```typescript
// File: client/src/pages/BloodAnalysisReport.tsx

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { MetricCard3D } from '@/components/blood/MetricCard3D';

export default function BloodAnalysisReport() {
  // 1. Data fetching
  const [meQuery, bloodTestQuery] = useQueries({
    queries: [
      { queryKey: ['/api/me'], queryFn: () => fetcher('/api/me') },
      { queryKey: ['/api/blood-tests', reportId], queryFn: () => fetcher(`/api/blood-tests/${reportId}`) },
    ],
  });

  // 2. Data transformation (memoized)
  const reportData = useMemo(() => {
    if (!bloodTestQuery.data) return null;

    return {
      score: calculateGlobalScore(bloodTestQuery.data.markers),
      criticalMarkers: bloodTestQuery.data.markers.filter(m => m.status === 'critical'),
      optimalMarkers: bloodTestQuery.data.markers.filter(m => m.status === 'optimal'),
    };
  }, [bloodTestQuery.data]);

  // 3. Render with presentational components
  return (
    <div className="blood-report-premium">
      {reportData && (
        <MetricCard3D
          title="Score Global"
          value={reportData.score}
          unit="/100"
          status={getScoreStatus(reportData.score)}
        />
      )}
    </div>
  );
}
```

**Separation of concerns:**
- Container: Data fetching, business logic, state management
- Presentational: Pure UI, no side effects, reusable

---

### 2.2 State Management Strategy

**Local state (useState):**
```typescript
// Use for: UI-only state (hover, expanded, selected)
const [isHovered, setIsHovered] = useState(false);
const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
```

**Server state (React Query):**
```typescript
// Use for: API data, caching, refetching
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/blood-tests', reportId],
  queryFn: () => fetcher(`/api/blood-tests/${reportId}`),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
});
```

**Derived state (useMemo):**
```typescript
// Use for: Computed values from props/state
const scoreLabel = useMemo(() => {
  if (score < 50) return { label: 'Zone rouge', color: 'text-rose-600' };
  if (score < 70) return { label: 'Zone orange', color: 'text-amber-600' };
  if (score < 85) return { label: 'Zone verte', color: 'text-emerald-600' };
  return { label: 'Zone bleue', color: 'text-cyan-600' };
}, [score]);
```

**When NOT to use state:**
```typescript
// ❌ BAD: Storing derived values
const [scoreLabel, setScoreLabel] = useState(getScoreLabel(score));

// ✅ GOOD: Compute on the fly
const scoreLabel = getScoreLabel(score);
```

---

### 2.3 Component Composition

**Compound Components Pattern:**

```typescript
// Example: ProtocolStepper with sub-components

// Parent component
export const ProtocolStepper = ({ phases, currentPhase }: ProtocolStepperProps) => {
  return (
    <div className="protocol-stepper">
      <ProtocolStepper.Timeline phases={phases} currentPhase={currentPhase} />
      <ProtocolStepper.PhaseDetails phases={phases} />
    </div>
  );
};

// Sub-component 1
ProtocolStepper.Timeline = ({ phases, currentPhase }: TimelineProps) => {
  return (
    <div className="timeline">
      {phases.map(phase => (
        <ProtocolStepper.PhaseCircle
          key={phase.id}
          phase={phase}
          isActive={phase.id === currentPhase}
        />
      ))}
    </div>
  );
};

// Sub-component 2
ProtocolStepper.PhaseCircle = ({ phase, isActive }: PhaseCircleProps) => {
  return (
    <motion.div
      className={`phase-circle ${isActive ? 'active' : ''}`}
      whileHover={{ scale: 1.1 }}
    >
      {phase.id}
    </motion.div>
  );
};

// Sub-component 3
ProtocolStepper.PhaseDetails = ({ phases }: PhaseDetailsProps) => {
  return (
    <div className="phase-details">
      {/* Details content */}
    </div>
  );
};
```

**Benefits:**
- Logical grouping of related components
- Better code organization
- Flexible composition
- Clear parent-child relationships

---

### 2.4 TypeScript Best Practices

**Strict typing for props:**

```typescript
// ❌ BAD: Loose types
interface CardProps {
  data: any;
  onClick: Function;
}

// ✅ GOOD: Strict types
interface CardProps {
  data: {
    id: string;
    value: number;
    status: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  };
  onClick: (id: string) => void;
}
```

**Utility types:**

```typescript
// Extract type from existing type
type MarkerStatus = BloodMarker['status']; // 'optimal' | 'normal' | ...

// Make all props optional
type PartialCardProps = Partial<CardProps>;

// Make all props required
type RequiredCardProps = Required<CardProps>;

// Pick specific props
type CardTitleProps = Pick<CardProps, 'title' | 'icon'>;

// Omit specific props
type CardWithoutChildren = Omit<CardProps, 'children'>;
```

**Generic components:**

```typescript
// Reusable list component with generic type
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <div>
      {items.map(item => (
        <div key={keyExtractor(item)}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

// Usage with type inference
<List
  items={markers} // TypeScript infers T = BloodMarker
  renderItem={marker => <MarkerCard marker={marker} />}
  keyExtractor={marker => marker.code}
/>
```

---

## 3. PERFORMANCE STRATEGY

### 3.1 Bundle Size Optimization

**Target: < 500KB initial bundle**

**Strategy 1: Code splitting**

```typescript
// Dynamic imports for heavy components
import { lazy, Suspense } from 'react';

// ✅ Lazy load heavy visualization components
const InteractiveHeatmap = lazy(() => import('@/components/blood/InteractiveHeatmap'));
const BiomarkerTimeline = lazy(() => import('@/components/blood/BiomarkerTimeline'));
const MarkdownBlock = lazy(() => import('@/components/MarkdownBlock'));

// Usage with Suspense
<Suspense fallback={<HeatmapSkeleton />}>
  <InteractiveHeatmap categories={categoryData} />
</Suspense>
```

**Strategy 2: Tree shaking (Lucide icons)**

```typescript
// ❌ BAD: Import all icons (1MB+)
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ✅ GOOD: Import specific icons (-995KB)
import FileText from 'lucide-react/dist/esm/icons/file-text';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
```

**Strategy 3: Barrel import elimination**

```typescript
// ❌ BAD: Barrel import (imports all exports)
import { MetricCard3D, RadialScoreChart } from '@/components/blood';

// ✅ GOOD: Direct imports
import { MetricCard3D } from '@/components/blood/MetricCard3D';
import { RadialScoreChart } from '@/components/blood/RadialScoreChart';
```

**Measure bundle size:**

```bash
# Build production
npm run build

# Analyze bundle (if vite-plugin-bundle-analyzer installed)
npm run build -- --mode analyze

# Manual analysis
du -sh dist/assets/*.js | sort -h
```

---

### 3.2 Render Performance

**Target: 60fps animations, sub-100ms renders**

**Strategy 1: Memoization**

```typescript
// Component memoization
export const MetricCard3D = memo(({ title, value, ... }: Props) => {
  // Component code
});

// useMemo for expensive calculations
const sortedMarkers = useMemo(() => {
  return markers.sort((a, b) => a.score - b.score);
}, [markers]);

// useCallback for event handlers
const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

**Strategy 2: Virtualization (for long lists)**

```typescript
// For lists with 100+ items, use react-window or react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualizedMarkerList = ({ markers }: { markers: Marker[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: markers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated item height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MarkerCard marker={markers[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Strategy 3: Content Visibility**

```css
/* CSS for off-screen content */
.report-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px;
}
```

**Strategy 4: Animation performance**

```typescript
// ✅ GOOD: GPU-accelerated properties only
animate={{
  transform: 'translateY(20px)',  // ✅ GPU
  opacity: 0.5,                   // ✅ GPU
}}

// ❌ BAD: CPU-bound properties
animate={{
  width: '200px',    // ❌ Layout shift
  height: '100px',   // ❌ Layout shift
  margin: '20px',    // ❌ Layout shift
}}
```

---

### 3.3 Data Fetching Optimization

**Strategy 1: Parallel queries**

```typescript
// ❌ BAD: Sequential queries (800ms total)
const me = await fetch('/api/me');
const bloodTest = await fetch('/api/blood-tests/123');

// ✅ GOOD: Parallel queries (400ms total)
const [meQuery, bloodTestQuery] = useQueries({
  queries: [
    { queryKey: ['/api/me'], queryFn: () => fetcher('/api/me') },
    { queryKey: ['/api/blood-tests', id], queryFn: () => fetcher(`/api/blood-tests/${id}`) },
  ],
});
```

**Strategy 2: Caching**

```typescript
// Triple-level caching strategy

// 1. React Query cache (server data)
const { data } = useQuery({
  queryKey: ['/api/blood-tests', reportId],
  queryFn: () => fetcher(`/api/blood-tests/${reportId}`),
  staleTime: 5 * 60 * 1000,  // Consider fresh for 5 min
  gcTime: 10 * 60 * 1000,    // Keep in cache for 10 min
});

// 2. useMemo cache (computed data)
const markerBuckets = useMemo(() => {
  if (!data) return { critical: [], optimal: [] };
  return {
    critical: data.markers.filter(m => m.status === 'critical'),
    optimal: data.markers.filter(m => m.status === 'optimal'),
  };
}, [data]);

// 3. Map cache (expensive transformations)
// See client/src/lib/markdown-utils.tsx for example
const parsedSectionsCache = new Map<string, ParsedSections>();

export function parseAISections(markdown: string): ParsedSections {
  const cached = parsedSectionsCache.get(markdown);
  if (cached) return cached;

  const result = expensiveParsing(markdown);
  parsedSectionsCache.set(markdown, result);
  return result;
}
```

**Strategy 3: Prefetching**

```typescript
// Prefetch next likely page
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// On hover over "View protocol" button
const handleHoverProtocol = () => {
  queryClient.prefetchQuery({
    queryKey: ['/api/protocols', protocolId],
    queryFn: () => fetcher(`/api/protocols/${protocolId}`),
  });
};
```

---

### 3.4 Performance Monitoring

**Tools:**

```typescript
// 1. React DevTools Profiler
// Install: Chrome extension "React Developer Tools"
// Usage: Open DevTools → Profiler tab → Record → Interact → Stop

// 2. Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log); // Cumulative Layout Shift
getFID(console.log); // First Input Delay
getFCP(console.log); // First Contentful Paint
getLCP(console.log); // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

**Performance budgets:**

```markdown
## Performance Budgets

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| Initial bundle | < 500KB | 450KB | ✅ |
| TTI (Time to Interactive) | < 3s | 2.1s | ✅ |
| LCP (Largest Contentful Paint) | < 2.5s | 1.8s | ✅ |
| FID (First Input Delay) | < 100ms | 45ms | ✅ |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.05 | ✅ |
```

---

## 4. ACCESSIBILITY IMPLEMENTATION

### 4.1 WCAG AA Compliance

**Target: WCAG 2.1 AA minimum (AAA for critical elements)**

**Color contrast:**

```typescript
// Tool: https://webaim.org/resources/contrastchecker/

// ✅ GOOD: Contrast ratio 7:1 (AAA)
<p className="text-slate-200">  // #e2e8f0 on #0a0b0d = 13.2:1 ✅
  Important text
</p>

// ⚠️ ACCEPTABLE: Contrast ratio 4.5:1 (AA)
<p className="text-slate-400">  // #94a3b8 on #0a0b0d = 6.8:1 ✅
  Secondary text
</p>

// ❌ BAD: Contrast ratio < 4.5:1
<p className="text-slate-600">  // #475569 on #0a0b0d = 3.2:1 ❌
  This fails WCAG AA
</p>
```

**Test tool:**

```bash
# Install pa11y for automated testing
npm install --save-dev pa11y

# Create test script
echo 'npx pa11y http://localhost:5173/analysis/123' > scripts/a11y-test.sh
chmod +x scripts/a11y-test.sh

# Run tests
./scripts/a11y-test.sh
```

---

### 4.2 Keyboard Navigation

**Pattern: Navigable interactive elements**

```tsx
// ✅ GOOD: Keyboard accessible button
<motion.button
  className="metric-card"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
  aria-label="View details for Testosterone marker"
>
  {/* Content */}
</motion.button>

// ❌ BAD: Non-accessible div
<div onClick={handleClick}>  // Can't focus, can't keyboard activate
  {/* Content */}
</div>
```

**Tab order:**

```tsx
// Control tab order with tabIndex
<div className="report">
  <button tabIndex={1}>Primary action</button>  {/* Tab 1 */}
  <button tabIndex={2}>Secondary action</button>  {/* Tab 2 */}
  <a href="#section" tabIndex={-1}>Skip to section</a>  {/* Not in tab order */}
</div>
```

**Escape key to close modals:**

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
  }

  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen]);
```

---

### 4.3 Screen Reader Support

**ARIA labels:**

```tsx
// ✅ Descriptive labels
<button aria-label="Export blood analysis report as PDF">
  Export PDF
</button>

// ✅ Describe status
<div role="status" aria-live="polite">
  {isLoading ? 'Loading report...' : `Report loaded with ${markerCount} markers`}
</div>

// ✅ Hide decorative icons
<AlertTriangle className="w-5 h-5" aria-hidden="true" />
```

**Landmarks:**

```tsx
<div className="blood-report">
  <header role="banner">
    <h1>Blood Analysis Report</h1>
  </header>

  <nav role="navigation" aria-label="Report sections">
    {/* Navigation links */}
  </nav>

  <main role="main">
    {/* Report content */}
  </main>

  <aside role="complementary" aria-label="Glossary">
    {/* Glossary */}
  </aside>

  <footer role="contentinfo">
    {/* Footer */}
  </footer>
</div>
```

**Skip links:**

```tsx
// Allow screen reader users to skip to main content
<a
  href="#introduction"
  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
>
  Skip to main content
</a>
```

---

### 4.4 Focus Management

**Visible focus states:**

```css
/* Always show focus for keyboard users */
button:focus-visible {
  outline: 2px solid #06b6d4;
  outline-offset: 2px;
}

/* Remove default focus outline (but keep focus-visible) */
button:focus:not(:focus-visible) {
  outline: none;
}
```

**Focus trap for modals:**

```typescript
import { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus first focusable element
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    // Trap focus inside modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusableElements) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
};
```

---

### 4.5 Reduced Motion

**Respect user preferences:**

```css
/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// JavaScript detection
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Conditional animations
<motion.div
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
>
  Content
</motion.div>
```

---

## 5. TESTING STRATEGY

### 5.1 Component Testing

**Unit tests (Vitest + React Testing Library):**

```typescript
// File: client/src/components/blood/__tests__/MetricCard3D.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard3D } from '../MetricCard3D';

describe('MetricCard3D', () => {
  it('renders title and value', () => {
    render(
      <MetricCard3D
        title="Testostérone"
        value={650}
        unit="ng/dL"
        status="optimal"
      />
    );

    expect(screen.getByText('Testostérone')).toBeInTheDocument();
    expect(screen.getByText('650')).toBeInTheDocument();
    expect(screen.getByText('ng/dL')).toBeInTheDocument();
  });

  it('applies correct status color', () => {
    const { container } = render(
      <MetricCard3D title="Test" value={100} status="critical" />
    );

    // Check if critical status color is applied
    const valueElement = screen.getByText('100');
    expect(valueElement).toHaveStyle({ color: '#f43f5e' });
  });

  it('shows trend indicator when provided', () => {
    render(
      <MetricCard3D
        title="Test"
        value={100}
        trend="up"
        trendValue="+15%"
      />
    );

    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
  });
});
```

**Run tests:**

```bash
npm run test
```

---

### 5.2 Integration Testing

**Test full user flow:**

```typescript
// File: client/src/__tests__/BloodReportFlow.test.tsx

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BloodAnalysisReport from '../pages/BloodAnalysisReport';

describe('Blood Report Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('loads and displays report data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BloodAnalysisReport />
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading report...')).not.toBeInTheDocument();
    });

    // Check if score is displayed
    expect(screen.getByText(/Score Global/i)).toBeInTheDocument();

    // Check if markers are displayed
    expect(screen.getByText(/Alertes prioritaires/i)).toBeInTheDocument();
  });
});
```

---

### 5.3 Visual Regression Testing

**Chromatic (recommended) or Percy:**

```bash
# Install Chromatic
npm install --save-dev chromatic

# Setup
npx chromatic --project-token=<your-token>

# Run visual tests
npm run chromatic
```

---

### 5.4 Accessibility Testing

**Automated tests:**

```bash
# pa11y for CLI testing
npx pa11y http://localhost:5173/analysis/123

# axe-core for in-browser testing
npm install --save-dev @axe-core/react
```

```typescript
// Add axe to development mode
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

---

## 6. DEPLOYMENT CHECKLIST

### 6.1 Pre-deployment

```markdown
## Pre-Deployment Checklist

### Build & Tests
- [ ] `npm run build` passes without errors
- [ ] `npm run test` all tests pass
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)

### Performance
- [ ] Bundle size < 500KB (`du -sh dist/assets/*.js`)
- [ ] Lighthouse Performance score > 90
- [ ] No console.log in production code
- [ ] Images optimized (use WebP where possible)

### Accessibility
- [ ] Lighthouse Accessibility score > 90
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested (NVDA or VoiceOver)

### Cross-browser
- [ ] Tested in Chrome (latest)
- [ ] Tested in Firefox (latest)
- [ ] Tested in Safari (latest)
- [ ] Tested in Edge (latest)

### Responsive
- [ ] Mobile (375px) tested
- [ ] Tablet (768px) tested
- [ ] Desktop (1440px) tested
- [ ] No horizontal scroll on any breakpoint

### Security
- [ ] No sensitive data in localStorage
- [ ] API keys not exposed in client code
- [ ] CSP headers configured
- [ ] HTTPS enforced

### Documentation
- [ ] README updated with new features
- [ ] CHANGELOG updated
- [ ] Comments added for complex logic
```

---

### 6.2 Deployment Commands

```bash
# 1. Final build
npm run build

# 2. Preview build locally
npm run preview
# Open http://localhost:4173

# 3. Run final checks
npm run lint
npm run test
npx tsc --noEmit

# 4. Deploy (adapt to your hosting)
# Vercel:
vercel deploy --prod

# Netlify:
netlify deploy --prod

# Manual:
rsync -avz dist/ user@server:/var/www/html/
```

---

### 6.3 Post-deployment Monitoring

**Setup error tracking:**

```typescript
// Sentry integration (example)
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Monitor Web Vitals:**

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }: Metric) {
  // Send to your analytics service
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ name, value, id }),
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## FINAL NOTES

**Key Principles:**
1. **Type Safety First:** Use TypeScript strictly, no `any` types
2. **Performance Matters:** Memoize, lazy load, optimize bundles
3. **Accessibility is NOT Optional:** WCAG AA minimum, test with screen readers
4. **Component Isolation:** Presentational vs Container pattern
5. **Test Before Deploy:** Automated tests + manual QA

**Resources:**
- [React Docs](https://react.dev/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [TailwindCSS Docs](https://tailwindcss.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

---

**Version:** 1.0
**Last Updated:** 2026-01-31
**Author:** Claude Code (Sonnet 4.5)
