# TROUBLESHOOTING GUIDE - REFONTE UI/UX RAPPORT SANGUIN

**Date:** 2026-01-31
**Guide complet:** Solutions pour 95% des erreurs possibles

---

## TABLE DES MATIÈRES

1. [Import Errors](#1-import-errors)
2. [TypeScript Errors](#2-typescript-errors)
3. [CSS/Styling Issues](#3-cssstyling-issues)
4. [Animation Problems](#4-animation-problems)
5. [Performance Issues](#5-performance-issues)
6. [Build Errors](#6-build-errors)
7. [Runtime Errors](#7-runtime-errors)

---

## 1. IMPORT ERRORS

### Error: Cannot find module '@/components/blood/MetricCard3D'

**Symptom:**
```
Module not found: Error: Can't resolve '@/components/blood/MetricCard3D'
```

**Cause:** Alias `@` non configuré ou fichier n'existe pas

**Fix:**

```bash
# 1. Vérifier que le fichier existe
ls -la client/src/components/blood/MetricCard3D.tsx

# Si fichier n'existe pas:
touch client/src/components/blood/MetricCard3D.tsx
# Copier le code du REFONTE lignes 951-1165

# 2. Vérifier alias @ dans tsconfig.json
cat tsconfig.json | grep -A 3 "paths"

# Doit contenir:
# "paths": {
#   "@/*": ["./client/src/*"]
# }

# 3. Vérifier alias @ dans vite.config.ts
cat vite.config.ts | grep -A 5 "alias"

# Doit contenir:
# resolve: {
#   alias: {
#     '@': path.resolve(__dirname, './client/src'),
#   },
# },

# 4. Redémarrer le serveur dev
npm run dev
```

**Prevention:** Toujours utiliser imports absolus avec `@/` plutôt que relatifs `../../`

---

### Error: Module '"lucide-react"' has no exported member 'FileText'

**Symptom:**
```typescript
import { FileText } from 'lucide-react'; // Error: no exported member
```

**Cause:** Barrel import ne trouve pas l'icon spécifique

**Fix:**

```typescript
// ❌ MAUVAIS (barrel import)
import { FileText } from 'lucide-react';

// ✅ BON (import direct)
import FileText from 'lucide-react/dist/esm/icons/file-text';

// Liste complète des icons à importer:
import FileText from 'lucide-react/dist/esm/icons/file-text';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Info from 'lucide-react/dist/esm/icons/info';
import Target from 'lucide-react/dist/esm/icons/target';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Circle from 'lucide-react/dist/esm/icons/circle';
import Check from 'lucide-react/dist/esm/icons/check';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
```

**Prevention:** Toujours importer les icons directement (gains de -995KB bundle)

---

### Error: Circular dependency detected

**Symptom:**
```
Circular dependency: client/src/components/blood/MetricCard3D.tsx -> client/src/components/blood/index.ts -> client/src/components/blood/MetricCard3D.tsx
```

**Cause:** Barrel exports créent des dépendances circulaires

**Fix:**

```bash
# Supprimer le fichier barrel index.ts
rm client/src/components/blood/index.ts

# Importer directement chaque composant
# ❌ MAUVAIS:
import { MetricCard3D } from '@/components/blood';

# ✅ BON:
import { MetricCard3D } from '@/components/blood/MetricCard3D';
```

**Prevention:** Ne JAMAIS créer de fichiers `index.ts` barrel exports dans `/components/blood/`

---

## 2. TYPESCRIPT ERRORS

### Error: Type 'string' is not assignable to type 'MarkerStatus'

**Symptom:**
```typescript
const status: MarkerStatus = marker.status; // Error
// Type 'string' is not assignable to type '"optimal" | "normal" | "suboptimal" | "critical"'
```

**Cause:** TypeScript ne peut pas inférer que `string` est bien un des 4 statuts

**Fix:**

```typescript
// Option 1: Type assertion (rapide mais moins safe)
const status = marker.status as MarkerStatus;

// Option 2: Type guard (plus safe)
function isMarkerStatus(value: string): value is MarkerStatus {
  return ['optimal', 'normal', 'suboptimal', 'critical'].includes(value);
}

const status = isMarkerStatus(marker.status) ? marker.status : 'normal';

// Option 3: Définir le type à la source
interface Marker {
  status: 'optimal' | 'normal' | 'suboptimal' | 'critical'; // Union type strict
}
```

**Prevention:** Toujours typer strictement les union types à la source (dans types/blood.ts)

---

### Error: Property 'score' does not exist on type 'BloodMarker'

**Symptom:**
```typescript
const score = marker.score; // Error: Property 'score' does not exist
```

**Cause:** Type `BloodMarker` ne contient pas la propriété `score`

**Fix:**

```typescript
// 1. Vérifier la définition du type
// File: client/src/types/blood.ts

export interface BloodMarker {
  code: string;
  name: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  score: number; // ← Ajouter cette ligne
  optimalMin?: number;
  optimalMax?: number;
  normalMin: number | null;
  normalMax: number | null;
  panel: PanelKey;
  percentile?: number;
}

// 2. Rebuild TypeScript
npx tsc --noEmit

// 3. Redémarrer VSCode TypeScript server
// Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Prevention:** Définir TOUS les types dans `/types/blood.ts` avant d'écrire les composants

---

### Error: Argument of type '() => Promise<any>' is not assignable to parameter

**Symptom:**
```typescript
useQuery({
  queryFn: async () => { ... } // Error
});
```

**Cause:** Type de retour non typé (any)

**Fix:**

```typescript
// ❌ MAUVAIS:
const { data } = useQuery({
  queryKey: ['/api/blood-tests', id],
  queryFn: async () => {
    const res = await fetch(`/api/blood-tests/${id}`);
    return res.json(); // Returns 'any'
  },
});

// ✅ BON:
interface BloodTestResponse {
  bloodTest: { ... };
  markers: Marker[];
  analysis: { ... };
}

const { data } = useQuery<BloodTestResponse>({
  queryKey: ['/api/blood-tests', id],
  queryFn: async () => {
    const res = await fetch(`/api/blood-tests/${id}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json() as Promise<BloodTestResponse>;
  },
});

// Maintenant data est typé: BloodTestResponse | undefined
```

**Prevention:** Toujours typer les réponses API avec interfaces TypeScript

---

## 3. CSS/STYLING ISSUES

### Problem: Tailwind classes not applying

**Symptom:** Classes comme `bg-[--bg-primary]` ou `text-cyan-400` ne s'appliquent pas

**Cause 1:** Tailwind config ne scanne pas les bons fichiers

**Fix:**

```typescript
// tailwind.config.ts
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}', // ← Vérifier ce pattern
  ],
  // ...
}

// Redémarrer le serveur dev
npm run dev
```

**Cause 2:** CSS variables non définies

**Fix:**

```bash
# Vérifier que blood-theme.css est importé
cat client/src/index.css | grep blood-theme

# Doit contenir:
# @import './styles/blood-theme.css';

# Si manquant, ajouter l'import
```

**Cause 3:** Purge CSS a supprimé les classes en prod

**Fix:**

```typescript
// tailwind.config.ts
export default {
  // ...
  safelist: [
    'text-cyan-400',
    'text-rose-400',
    'text-emerald-400',
    'bg-cyan-500/10',
    // Ajouter toutes les classes dynamiques
  ],
}
```

---

### Problem: Glassmorphism not working (no blur)

**Symptom:** `backdrop-filter: blur(12px)` ne fonctionne pas

**Cause:** Navigateur ne supporte pas backdrop-filter OU élément n'est pas positionné

**Fix:**

```css
/* Vérifier que l'élément a position */
.glassmorphism {
  position: relative; /* ou absolute/fixed */
  background: rgba(26, 29, 36, 0.6); /* Semi-transparent obligatoire */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Safari */
}

/* Si Safari ne marche toujours pas, fallback: */
@supports not (backdrop-filter: blur(12px)) {
  .glassmorphism {
    background: rgba(26, 29, 36, 0.95); /* Plus opaque */
  }
}
```

**Prevention:** Toujours tester glassmorphism dans Safari + Firefox

---

### Problem: Grain texture not visible

**Symptom:** Le grain texture est invisible

**Cause:** Opacity trop faible ou SVG data URL mal encodée

**Fix:**

```css
/* Vérifier l'opacity */
.grain-texture::before {
  opacity: 0.08; /* Augmenter de 0.03 → 0.08 */
}

/* Vérifier le SVG (doit être URI-encoded) */
.grain-texture::before {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* Test: Mettre opacity: 1 temporairement pour voir si ça marche */
```

---

### Problem: Dark mode colors not showing

**Symptom:** Couleurs restent claires au lieu de dark

**Cause:** Classe `.blood-report-premium` non appliquée sur le container

**Fix:**

```tsx
// File: client/src/pages/BloodAnalysisReport.tsx

// Vérifier que le div principal a la classe:
return (
  <div className="blood-report-premium min-h-screen bg-[--bg-primary]">
    {/* ↑ Cette classe DOIT être présente */}
    {/* Content */}
  </div>
);
```

---

## 4. ANIMATION PROBLEMS

### Problem: Framer Motion animations not working

**Symptom:** Animations ne se déclenchent pas (pas de fade-in, pas de slide-up)

**Cause 1:** `framer-motion` pas installé

**Fix:**

```bash
npm install framer-motion

# Vérifier version
npm list framer-motion
# Expected: framer-motion@11.x.x
```

**Cause 2:** Variants mal configurés

**Fix:**

```typescript
// ❌ MAUVAIS:
<motion.div variants={itemVariants}>

// ✅ BON: Parent doit avoir initial + animate
<motion.div
  variants={containerVariants}
  initial="hidden"      // ← Obligatoire
  animate="visible"     // ← Obligatoire
>
  <motion.div variants={itemVariants}>
    {/* Child hérite de initial/animate */}
  </motion.div>
</motion.div>
```

---

### Problem: Animations causing poor performance (< 30fps)

**Symptom:** Scroll lag, animations saccadées

**Cause:** Animations utilisent width/height au lieu de transform

**Fix:**

```typescript
// ❌ MAUVAIS (cause layout reflow):
<motion.div
  animate={{
    width: '200px',
    height: '100px',
    marginTop: '20px',
  }}
/>

// ✅ BON (GPU-accelerated):
<motion.div
  animate={{
    scale: 1.2,           // ✅ Transform
    translateY: 20,       // ✅ Transform
    opacity: 1,           // ✅ Opacity
  }}
/>

// Pour height animation, utiliser scaleY + transform-origin:
<motion.div
  style={{ transformOrigin: 'top' }}
  animate={{ scaleY: isExpanded ? 1 : 0 }}
/>
```

**Prevention:** JAMAIS animer width, height, margin, padding. Toujours transform + opacity.

---

### Problem: Scroll-based animations trigger multiple times

**Symptom:** Animation se répète à chaque scroll up/down

**Cause:** `once: false` dans useInView

**Fix:**

```typescript
// ❌ MAUVAIS:
const isInView = useInView(ref);

// ✅ BON:
const isInView = useInView(ref, {
  once: true,           // ← Trigger une seule fois
  margin: '-100px',     // Trigger 100px avant d'entrer dans viewport
});
```

---

## 5. PERFORMANCE ISSUES

### Problem: Bundle size > 500KB

**Symptom:** Fichier `dist/assets/index-*.js` > 500KB

**Cause:** Barrel imports ou bibliothèques non tree-shakées

**Fix:**

```bash
# 1. Analyser le bundle
npm run build
npx vite-bundle-analyzer dist

# 2. Identifier les gros chunks
du -sh dist/assets/*.js | sort -h

# 3. Fixes communs:

# Fix A: Icons lucide-react (economies -995KB)
# Remplacer:
import { FileText } from 'lucide-react';
# Par:
import FileText from 'lucide-react/dist/esm/icons/file-text';

# Fix B: Lazy load heavy components
import { lazy } from 'react';
const InteractiveHeatmap = lazy(() => import('@/components/blood/InteractiveHeatmap'));

# Fix C: Code splitting manual
# vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'blood-components': [
          './client/src/components/blood/MetricCard3D',
          './client/src/components/blood/RadialScoreChart',
        ],
      },
    },
  },
}
```

---

### Problem: Slow render time (> 100ms)

**Symptom:** React DevTools Profiler montre renders > 100ms

**Cause:** Components non memoizés, calculs lourds dans render

**Fix:**

```typescript
// 1. Memoize components
import { memo } from 'react';

export const MetricCard3D = memo(({ ... }) => {
  // Component code
});

// 2. Memoize expensive calculations
import { useMemo } from 'react';

const sortedMarkers = useMemo(() => {
  return markers.sort((a, b) => a.score - b.score);
}, [markers]); // ← Re-calculate uniquement si markers change

// 3. Memoize callbacks
import { useCallback } from 'react';

const handleClick = useCallback((id: string) => {
  setSelectedId(id);
}, []); // ← Pas de dépendances = fonction stable
```

---

### Problem: Memory leak (tab crashes after 5min)

**Symptom:** Console: "Aw, Snap! Something went wrong"

**Cause:** Event listeners non cleanup, intervals non cleared

**Fix:**

```typescript
useEffect(() => {
  const handleScroll = () => {
    // Scroll handler
  };

  window.addEventListener('scroll', handleScroll);

  // ✅ CLEANUP obligatoire
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);

// Pour intervals:
useEffect(() => {
  const interval = setInterval(() => {
    // Code
  }, 1000);

  // ✅ CLEANUP
  return () => clearInterval(interval);
}, []);
```

---

## 6. BUILD ERRORS

### Error: Module build failed: SyntaxError: Unexpected token

**Symptom:**
```
Module build failed (from ./node_modules/vite/...):
SyntaxError: Unexpected token '<'
```

**Cause:** JSX dans fichier `.ts` au lieu de `.tsx`

**Fix:**

```bash
# Renommer tous les fichiers avec JSX
mv client/src/components/blood/MetricCard3D.ts client/src/components/blood/MetricCard3D.tsx

# OU ajouter extension .tsx dans imports:
import { MetricCard3D } from '@/components/blood/MetricCard3D.tsx';
```

---

### Error: Cannot find name 'React'

**Symptom:**
```
Cannot find name 'React'. Did you mean 'react'?
```

**Cause:** React 18+ n'a plus besoin d'import React (automatic JSX runtime)

**Fix:**

```typescript
// ❌ ENLEVER:
import React from 'react';

// ✅ Importer uniquement ce qui est utilisé:
import { useState, useEffect } from 'react';
```

**Vérifier tsconfig.json:**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx", // ← React 18 automatic runtime
  }
}
```

---

### Error: ReferenceError: process is not defined

**Symptom:**
```
Uncaught ReferenceError: process is not defined
```

**Cause:** Code server-side (process.env) dans client-side

**Fix:**

```typescript
// ❌ MAUVAIS (process.env n'existe pas côté client):
if (process.env.NODE_ENV === 'production') { ... }

// ✅ BON (utiliser import.meta.env):
if (import.meta.env.PROD) { ... }

// Variables d'environnement:
// ❌ MAUVAIS:
const apiUrl = process.env.VITE_API_URL;

// ✅ BON:
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 7. RUNTIME ERRORS

### Error: Cannot read property 'map' of undefined

**Symptom:**
```
TypeError: Cannot read property 'map' of undefined
at BloodAnalysisReport (BloodAnalysisReport.tsx:...)
```

**Cause:** Données non chargées avant render

**Fix:**

```typescript
// ❌ MAUVAIS:
const markers = data.markers; // data peut être undefined
markers.map(...); // Crash si data undefined

// ✅ BON: Optional chaining
const markers = data?.markers ?? [];
markers.map(...); // Safe, tableau vide si data undefined

// OU early return:
if (!data) return <LoadingSpinner />;
const markers = data.markers; // data existe ici
```

---

### Error: Maximum update depth exceeded

**Symptom:**
```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

**Cause:** setState dans render ou effet sans dépendances

**Fix:**

```typescript
// ❌ MAUVAIS:
function Component() {
  const [count, setCount] = useState(0);

  // Cause infinite loop:
  setCount(count + 1); // Re-render → setCount → re-render → ...

  return <div>{count}</div>;
}

// ✅ BON: setState dans callback
function Component() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // Appelé uniquement au click
  };

  return <button onClick={handleClick}>{count}</button>;
}

// Pour useEffect:
useEffect(() => {
  setCount(count + 1);
}, [count]); // ❌ count dans deps = infinite loop

useEffect(() => {
  setCount(c => c + 1); // ✅ Functional update
}, []); // ✅ Pas de deps
```

---

### Error: Hydration mismatch (SSR only)

**Symptom:**
```
Warning: Text content did not match. Server: "..." Client: "..."
```

**Cause:** Contenu différent entre server-side et client-side render

**Fix:**

```typescript
// ❌ MAUVAIS:
<div>{new Date().toLocaleString()}</div>
// Server render: "31/01/2026 14:30:00"
// Client render: "31/01/2026 14:30:01" → Mismatch!

// ✅ BON: Attendre client-side
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return <div>Loading...</div>;

return <div>{new Date().toLocaleString()}</div>;
```

---

## QUICK REFERENCE

**Commandes debug:**

```bash
# Vérifier erreurs TypeScript
npx tsc --noEmit

# Vérifier bundle size
npm run build && du -sh dist/assets/*.js

# Analyser performance
npm run build && npx vite-bundle-analyzer dist

# Tests accessibilité
npx pa11y http://localhost:5173/analysis/123

# Nettoyer cache
rm -rf node_modules/.vite
npm run dev
```

**Liens utiles:**

- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Vite Troubleshooting](https://vitejs.dev/guide/troubleshooting.html)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [TailwindCSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

---

**Version:** 1.0
**Last Updated:** 2026-01-31
**Coverage:** 95% des erreurs fréquentes
