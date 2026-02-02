# WORKFLOW EXÉCUTABLE - REFONTE UI/UX RAPPORT SANGUIN

**Instructions:** Suivre chaque étape dans l'ordre. Cocher uniquement quand l'étape est 100% terminée et validée.

---

## PHASE 1: FOUNDATIONS (Estimation: 8h)

### 1.1 Typography System (1h)

**Fichier source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 2100-2300

**Actions:**

- [ ] Créer le fichier `client/src/styles/typography.css`

```bash
touch client/src/styles/typography.css
```

- [ ] Copier le code EXACT des lignes 2100-2300 du fichier REFONTE dans typography.css

- [ ] Ajouter l'import dans `client/src/index.css` (en haut du fichier)

```css
/* Ajouter en ligne 1 de index.css */
@import './styles/typography.css';
```

- [ ] **Test de validation:**

```bash
# Lancer le serveur dev
npm run dev

# Ouvrir DevTools Console et tester:
getComputedStyle(document.documentElement).fontSize
# Attendu: "16px" ou similaire

# Vérifier qu'une classe existe:
# Ajouter temporairement <h1 className="display-1">Test</h1> dans BloodAnalysisReport
# Vérifier que font-size = 96px dans DevTools
```

- [ ] **Expected output:** Classes `.display-1` à `.caption` disponibles et fonctionnelles

---

### 1.2 Color System (1.5h)

**Fichier source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1850-2100

**Actions:**

- [ ] Créer le fichier `client/src/styles/blood-theme.css`

```bash
touch client/src/styles/blood-theme.css
```

- [ ] Copier le code EXACT des lignes 1850-2100 du fichier REFONTE

- [ ] **Modifier** `client/src/index.css`:
  - Supprimer les lignes 8-48 actuelles (`.blood-report-premium { ... }`)
  - Ajouter l'import:

```css
@import './styles/blood-theme.css';
```

- [ ] **Test de validation:**

```bash
# Dans DevTools Console:
getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')
# Attendu: "#0a0b0d"

getComputedStyle(document.documentElement).getPropertyValue('--status-optimal')
# Attendu: "#06b6d4"
```

- [ ] **Expected output:** Variables CSS `--bg-primary`, `--status-optimal`, etc. disponibles

---

### 1.3 Motion Variants (1.5h)

**Fichier source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1650-1850

**Actions:**

- [ ] Créer le fichier `client/src/lib/motion-variants.ts`

```bash
mkdir -p client/src/lib
touch client/src/lib/motion-variants.ts
```

- [ ] Copier le code EXACT des lignes 1650-1850 du fichier REFONTE

- [ ] **Test de validation:**

```typescript
// Ajouter import temporaire dans BloodAnalysisReport.tsx:
import { pageLoadVariants, scrollRevealVariants } from '@/lib/motion-variants';

console.log(pageLoadVariants); // Devrait logger l'objet variant
```

- [ ] **Expected output:** 10 variants exportés (pageLoadVariants, scrollRevealVariants, cardHoverVariants, etc.)

---

### 1.4 Layout System (2h)

**Fichier source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1200-1400

**Actions:**

- [ ] Créer le fichier `client/src/styles/layout.css`

```bash
touch client/src/styles/layout.css
```

- [ ] Copier le code EXACT des lignes 1200-1400 du fichier REFONTE

- [ ] Ajouter l'import dans `client/src/index.css`

```css
@import './styles/layout.css';
```

- [ ] **Modifier** `client/src/pages/BloodAnalysisReport.tsx`:
  - Remplacer le layout 2-colonnes actuel par grille Bento-Box
  - Voir code exact lignes 1250-1350 du fichier REFONTE pour exemple d'usage

- [ ] **Test de validation:**

```bash
# Vérifier que la classe .bento-grid existe
# DevTools → Elements → Chercher "bento-grid"
# Doit avoir display: grid; grid-template-columns: repeat(12, 1fr);
```

- [ ] **Expected output:** Grille 12 colonnes responsive fonctionnelle

---

### 1.5 Effects Library (2h)

**Fichier source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 2300-2500

**Actions:**

- [ ] Créer le fichier `client/src/styles/effects.css`

```bash
touch client/src/styles/effects.css
```

- [ ] Copier le code EXACT des lignes 2300-2500 du fichier REFONTE

- [ ] Ajouter l'import dans `client/src/index.css`

```css
@import './styles/effects.css';
```

- [ ] **Test de validation:**

```bash
# Ajouter temporairement une div avec la classe grain-texture:
# <div className="grain-texture w-full h-32 bg-slate-800">Test</div>

# Vérifier dans DevTools que le ::before avec background-image existe
```

- [ ] **Expected output:** Classes `.glassmorphism`, `.grain-texture`, `.glow-border` disponibles

---

**CHECKPOINT PHASE 1:**

```bash
# Vérifier que tout build sans erreur
npm run build

# Expected: ✓ built in XXXms, 0 errors

# Vérifier les fichiers créés
ls -la client/src/styles/
# Expected: typography.css, blood-theme.css, layout.css, effects.css

ls -la client/src/lib/
# Expected: motion-variants.ts
```

**Si checkpoint OK → Passer à Phase 2. Sinon → Debug avant de continuer.**

---

## PHASE 2: COMPOSANTS INNOVANTS (Estimation: 10h)

### 2.1 Core Display Components (3h)

#### Composant 1: MetricCard3D

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 951-1165

- [ ] Créer `client/src/components/blood/MetricCard3D.tsx`

```bash
mkdir -p client/src/components/blood
touch client/src/components/blood/MetricCard3D.tsx
```

- [ ] Copier le code EXACT lignes 951-1165

- [ ] **Test:**

```typescript
// Créer fichier test temporaire: client/src/__tests__/MetricCard3D.preview.tsx
import { MetricCard3D } from '@/components/blood/MetricCard3D';
import { Target } from 'lucide-react/dist/esm/icons/target';

export default function Preview() {
  return (
    <div className="p-8 bg-[--bg-primary] min-h-screen">
      <MetricCard3D
        title="Testostérone"
        value={650}
        unit="ng/dL"
        status="optimal"
        icon={<Target className="w-6 h-6" />}
      />
    </div>
  );
}

// Tester en visitant: http://localhost:5173/__tests__/MetricCard3D.preview
```

- [ ] **Expected:** Card avec 3D parallax au hover, glassmorphism, glow effect

---

#### Composant 2: RadialScoreChart

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1183-1412

- [ ] Créer `client/src/components/blood/RadialScoreChart.tsx`

```bash
touch client/src/components/blood/RadialScoreChart.tsx
```

- [ ] Copier le code EXACT lignes 1183-1412

- [ ] **Test:**

```typescript
// Test preview
import { RadialScoreChart } from '@/components/blood/RadialScoreChart';

export default function Preview() {
  return (
    <div className="p-8 bg-[--bg-primary] min-h-screen flex items-center justify-center">
      <RadialScoreChart
        score={75}
        maxScore={100}
        label="Score Global"
        targetScore={85}
        percentile={72}
        showComparison={true}
      />
    </div>
  );
}
```

- [ ] **Expected:** Score circulaire animé, gradient cyan→blue, counter animation 0→75

---

#### Composant 3: AnimatedStatCard

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 2362-2450

- [ ] Créer `client/src/components/blood/AnimatedStatCard.tsx`

```bash
touch client/src/components/blood/AnimatedStatCard.tsx
```

- [ ] Copier le code EXACT lignes 2362-2450

- [ ] **Expected:** Stat card compacte avec counter animation

---

### 2.2 Data Visualization (3h)

#### Composant 4: TrendSparkline

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1430-1538

- [ ] Créer `client/src/components/blood/TrendSparkline.tsx`

- [ ] Copier code lignes 1430-1538

- [ ] **Expected:** Mini graphique SVG animé

---

#### Composant 5: InteractiveHeatmap

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1774-1952

- [ ] Créer `client/src/components/blood/InteractiveHeatmap.tsx`

- [ ] Copier code lignes 1774-1952

- [ ] **Expected:** Heatmap 6 catégories cliquable

---

#### Composant 6: BiomarkerTimeline

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1544-1770

- [ ] Créer `client/src/components/blood/BiomarkerTimeline.tsx`

- [ ] Copier code lignes 1544-1770

- [ ] **Expected:** Timeline verticale avec points de données interactifs

---

### 2.3 Interactive Components (2.5h)

#### Composant 7: ProtocolStepper

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 1984-2187

- [ ] Créer `client/src/components/blood/ProtocolStepper.tsx`

- [ ] Copier code lignes 1984-2187

- [ ] **Expected:** Stepper 3 phases avec ligne animée

---

#### Composant 8: CitationTooltip

**Source:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` lignes 2191-2358

- [ ] Créer `client/src/components/blood/CitationTooltip.tsx`

- [ ] Copier code lignes 2191-2358

- [ ] **Expected:** Tooltip riche avec citation expert + delayed appearance (500ms)

---

#### Composant 9: ExpandableInsight

**Source:** Créer manuellement (pas dans REFONTE mais pattern standard)

- [ ] Créer `client/src/components/blood/ExpandableInsight.tsx`

```typescript
// Code à copier:
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react/dist/esm/icons/chevron-down';

interface ExpandableInsightProps {
  title: string;
  summary: string;
  details: string;
}

export const ExpandableInsight = ({ title, summary, details }: ExpandableInsightProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between text-left"
      >
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
          <p className="text-xs text-slate-400 mt-1">{summary}</p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-slate-300 mt-4 pt-4 border-t border-slate-700">
              {details}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

---

### 2.4 Visual Enhancement (1.5h)

#### Composant 10: GradientDivider

**Source:** Créer manuellement (pattern simple)

- [ ] Créer `client/src/components/blood/GradientDivider.tsx`

```typescript
// Code à copier:
import { motion } from 'framer-motion';

interface GradientDividerProps {
  color?: 'cyan' | 'rose' | 'emerald' | 'amber';
}

export const GradientDivider = ({ color = 'cyan' }: GradientDividerProps) => {
  const gradients = {
    cyan: 'from-transparent via-cyan-500 to-transparent',
    rose: 'from-transparent via-rose-500 to-transparent',
    emerald: 'from-transparent via-emerald-500 to-transparent',
    amber: 'from-transparent via-amber-500 to-transparent',
  };

  return (
    <motion.div
      className={`h-px w-full bg-gradient-to-r ${gradients[color]}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  );
};
```

---

**CHECKPOINT PHASE 2:**

```bash
# Vérifier que tous les composants existent
ls -la client/src/components/blood/
# Expected: 10 fichiers .tsx

# Build
npm run build
# Expected: 0 errors

# Vérifier imports
grep -r "import.*MetricCard3D" client/src/
# Si vide, c'est normal (pas encore utilisé)
```

---

## PHASE 3: INTÉGRATION & POLISH (Estimation: 6h)

### 3.1 Section Refactoring (2.5h)

**Modifier:** `client/src/pages/BloodAnalysisReport.tsx`

#### Étape 3.1.1: Importer les nouveaux composants

- [ ] Ajouter imports en haut du fichier:

```typescript
// Après les imports existants, ajouter:
import { MetricCard3D } from '@/components/blood/MetricCard3D';
import { RadialScoreChart } from '@/components/blood/RadialScoreChart';
import { InteractiveHeatmap } from '@/components/blood/InteractiveHeatmap';
import { TrendSparkline } from '@/components/blood/TrendSparkline';
import { AnimatedStatCard } from '@/components/blood/AnimatedStatCard';
import { ProtocolStepper } from '@/components/blood/ProtocolStepper';
import { CitationTooltip } from '@/components/blood/CitationTooltip';
import { GradientDivider } from '@/components/blood/GradientDivider';
import { ExpandableInsight } from '@/components/blood/ExpandableInsight';
import Target from 'lucide-react/dist/esm/icons/target';
```

---

#### Étape 3.1.2: Refactoriser Hero Section

- [ ] Trouver la section `id="introduction"` (ligne ~535)

- [ ] Remplacer par:

```tsx
<motion.section
  id="hero"
  className="section-hero relative min-h-[600px] scroll-mt-24"
  variants={itemVariants}
>
  <AnimatedGradientMesh />

  <div className="grid grid-cols-12 gap-6 relative z-10">
    <div className="col-span-12 lg:col-span-8">
      <MetricCard3D
        title="Score Biométrique Global"
        value={displayScore}
        unit="/100"
        status={displayScore >= 85 ? 'optimal' : displayScore >= 70 ? 'normal' : displayScore >= 50 ? 'suboptimal' : 'critical'}
        icon={<Target className="w-6 h-6" />}
      >
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Objectif 90 jours</span>
            <span className="text-emerald-400 font-semibold">{targetScore}/100</span>
          </div>
        </div>
      </MetricCard3D>
    </div>

    <div className="col-span-12 lg:col-span-4">
      <AnimatedStatCard
        label="Marqueurs analysés"
        value={displayMarkersCount}
        icon={FileText}
        color="#06b6d4"
      />
    </div>
  </div>
</motion.section>
```

---

#### Étape 3.1.3: Refactoriser Overview Section

- [ ] Trouver section `id="overview"` (ligne ~575)

- [ ] Remplacer le BiometricProgressCircle existant par RadialScoreChart:

```tsx
<RadialScoreChart
  score={displayScore}
  maxScore={100}
  label="Score Global"
  sublabel={scoreLabel.label}
  targetScore={targetScore}
  showComparison={true}
/>
```

---

#### Étape 3.1.4: Ajouter InteractiveHeatmap

- [ ] Dans la section "overview", après RadialScoreChart, ajouter:

```tsx
{/* Calcul des category scores */}
{(() => {
  const categories = PANEL_KEYS.map(key => {
    const panelMarkers = reportData?.markers.filter(m => m.panel === key) || [];
    const criticalCount = panelMarkers.filter(m => m.status === 'critical').length;
    const avgScore = panelMarkers.length
      ? panelMarkers.reduce((sum, m) => sum + m.score, 0) / panelMarkers.length
      : 0;

    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
      score: Math.round(avgScore),
      markerCount: panelMarkers.length,
      criticalCount,
    };
  });

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Vue système par système</h3>
      <InteractiveHeatmap
        categories={categories}
        onCategoryClick={(key) => {
          document.getElementById(`system-${key}`)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
})()}
```

---

### 3.2 Animations Polish (1.5h)

- [ ] Ajouter scroll reveal hook: Créer `client/src/hooks/useScrollReveal.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

export const useScrollReveal = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return { ref, isInView };
};
```

- [ ] Utiliser dans les sections:

```tsx
const { ref, isInView } = useScrollReveal();

<motion.section
  ref={ref}
  initial={{ opacity: 0, y: 50 }}
  animate={isInView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6 }}
>
  {/* Section content */}
</motion.section>
```

---

### 3.3 Responsive (1.5h)

- [ ] Créer `client/src/styles/responsive.css`

```css
/* Mobile first */
@media (max-width: 640px) {
  .display-1 { font-size: 48px; }
  .display-2 { font-size: 36px; }
  .display-3 { font-size: 28px; }

  .bento-grid-hero .col-span-8,
  .bento-grid-hero .col-span-4 {
    grid-column: span 12;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .display-1 { font-size: 72px; }
}

@media (min-width: 1025px) {
  /* Desktop - utilise les tailles par défaut */
}
```

- [ ] Importer dans `client/src/index.css`

```css
@import './styles/responsive.css';
```

---

### 3.4 Performance Final (0.5h)

- [ ] Lazy load heavy components:

```typescript
// En haut de BloodAnalysisReport.tsx
import { lazy, Suspense } from 'react';

const InteractiveHeatmap = lazy(() => import('@/components/blood/InteractiveHeatmap'));
const BiomarkerTimeline = lazy(() => import('@/components/blood/BiomarkerTimeline'));

// Usage:
<Suspense fallback={<div className="h-64 animate-pulse bg-slate-800 rounded-xl" />}>
  <InteractiveHeatmap categories={categoryData} />
</Suspense>
```

- [ ] Memoize expensive calculations:

```typescript
const categoryData = useMemo(() => {
  // Calcul expensive
  return PANEL_KEYS.map(key => ({...}));
}, [reportData?.markers]);
```

---

**CHECKPOINT PHASE 3:**

```bash
# Build final
npm run build

# Vérifier bundle size
du -sh dist/assets/*.js
# Expected: < 500KB pour index-*.js

# Test responsive
npm run preview
# Ouvrir http://localhost:4173/analysis/123
# Tester dans DevTools:
# - Mobile (375px)
# - Tablet (768px)
# - Desktop (1440px)
```

---

## VALIDATION FINALE

### Tests manuels

- [ ] Ouvrir rapport sanguin dans navigateur
- [ ] Vérifier que Hero section affiche MetricCard3D avec 3D parallax au hover
- [ ] Vérifier que RadialScoreChart anime le counter de 0 → score
- [ ] Vérifier que InteractiveHeatmap change de couleur au hover
- [ ] Scroll vers le bas et vérifier les scroll-reveal animations
- [ ] Tester keyboard navigation (Tab entre tous les éléments interactifs)
- [ ] Tester sur mobile (responsive)

---

### Tests automatiques

- [ ] Lighthouse audit:

```bash
# Ouvrir rapport
# DevTools → Lighthouse → Run audit
# Expected:
# - Performance: > 90
# - Accessibility: > 90
# - Best Practices: > 90
```

- [ ] TypeScript:

```bash
npx tsc --noEmit
# Expected: 0 errors
```

---

### Métriques finales

**Score Design:**

- Layout innovant: ✅ / ❌
- Data visualization: ✅ / ❌
- Animations fluides: ✅ / ❌
- Identité ApexLabs: ✅ / ❌

**Score attendu: >= 85/100**

---

**FIN DU WORKFLOW**

Si toutes les checkboxes sont cochées → Refonte terminée! 🎉

Si problèmes → Consulter TROUBLESHOOTING.md
