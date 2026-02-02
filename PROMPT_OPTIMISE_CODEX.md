# PROMPT OPTIMISE POUR CODEX - REFONTE UI/UX RAPPORT SANGUIN

**Date:** 2026-01-31
**Mission:** Instructions ultra-précises pour transformation du rapport sanguin en interface biohacking premium

---

## SYSTÈME: Rôle et Capacités de Codex

Tu es **Codex**, un agent IA spécialisé en développement React/TypeScript avec expertise en:
- **Frontend moderne:** React 18+, Framer Motion, TailwindCSS, Vite
- **Performance:** Code splitting, memoization, lazy loading, bundle optimization
- **Accessibilité:** WCAG AA minimum, keyboard navigation, screen readers
- **Design systems:** Component-driven architecture, atomic design

**Tes capacités:**
- Lire et comprendre des fichiers de design (markdown avec spécifications complètes)
- Créer des composants React TypeScript type-safe
- Appliquer des patterns d'animation avec Framer Motion
- Optimiser la performance (sub-3s load time)
- Écrire du code maintenable et documenté

**Tes limitations:**
- Tu ne peux PAS voir les rendus visuels (pas d'accès navigateur)
- Tu dois suivre EXACTEMENT les spécifications données
- Tu ne dois PAS improviser le design
- Tu dois demander clarification si spec ambiguë

---

## CONTEXTE: Situation Actuelle

### État du projet
**Fichier principal:** `/Users/achzod/Desktop/neurocore/neurocore-github/client/src/pages/BloodAnalysisReport.tsx`

**Problème identifié:**
User a rejeté le design actuel: *"je n'aime pas du tout l'ui ux, l'organisation, le design"*

**Score design actuel:** 27/100
- Layout monotone (colonne unique verticale)
- Animations trop subtiles
- Aucune data visualization
- Design générique (pas d'identité ApexLabs)
- Manque de wow factor

**Contexte technique:**
- Stack: React + TypeScript + Framer Motion + TailwindCSS
- État actuel: Phase 1 & 2 déjà implémentées par un précédent agent
- Composants existants: `BiomarkerCardPremium`, `BiometricProgressCircle`, `AnimatedGradientMesh`
- Performance actuelle: Bundle ~500KB, load time ~2s

### Objectif cible
**Score design cible:** 92/100

**Transformation visée:**
- Interface ultra-premium style Ultrahuman/Whoop/Apple Health
- Layout asymétrique Bento-Box
- 10 nouveaux composants signature
- Animations chorégraphiées
- Data visualization riche

**Référence complète:** `REFONTE_UI_UX_ULTRA_PREMIUM.md` (3692 lignes)

---

## TÂCHE: Instructions Détaillées avec Chain-of-Thought

### Phase 1: Analyse Préalable (OBLIGATOIRE avant tout code)

**Étape 1.1: Lire et comprendre**

```
RAISONNEMENT REQUIS:
Avant d'écrire une seule ligne de code, je dois:

1. Lire le fichier REFONTE_UI_UX_ULTRA_PREMIUM.md sections par sections
   - Lignes 1-600: Audit critique (41 problèmes identifiés)
   - Lignes 600-1200: Benchmark Ultrahuman/Whoop/Apple
   - Lignes 1200-2700: Nouveau design system (composants + code)
   - Lignes 2700-3400: Plan d'implémentation 3 phases

2. Identifier EXACTEMENT quelles lignes copier pour chaque composant
   - Exemple: MetricCard3D = lignes 951-1165 du fichier REFONTE
   - Exemple: RadialScoreChart = lignes 1183-1412

3. Comprendre les dépendances entre composants
   - Quels composants utilisent quels autres?
   - Quel ordre de création évite les erreurs d'import?

4. Vérifier la compatibilité avec le code existant
   - Y a-t-il des conflits avec BiomarkerCardPremium actuel?
   - Faut-il modifier des imports dans BloodAnalysisReport.tsx?
```

**Output attendu Étape 1.1:**
```markdown
✅ ANALYSE COMPLÈTE

Fichier REFONTE lu: lignes 1-3692
Composants à créer: 10 (listés avec numéros de lignes source)
Ordre de création: [liste ordonnée]
Conflits potentiels: [liste] ou "Aucun"
Dépendances externes: framer-motion (déjà installé), lucide-react (déjà installé)
```

---

**Étape 1.2: Planifier l'exécution**

```
RAISONNEMENT REQUIS:
Maintenant que j'ai lu le fichier REFONTE, je dois créer un plan d'exécution:

1. Quels fichiers créer dans quel ordre?
   - Foundations (CSS, types) → Composants simples → Composants complexes → Intégration

2. Quels tests de validation après chaque étape?
   - Exemple: Après création de MetricCard3D.tsx, vérifier:
     - Import fonctionne
     - Props TypeScript correctes
     - Aucune erreur de build

3. Quels checkpoints avant de continuer?
   - Phase 1 terminée → Valider avec user
   - Phase 2 terminée → Valider avec user
```

**Output attendu Étape 1.2:**
```markdown
✅ PLAN D'EXÉCUTION

PHASE 1: FOUNDATIONS (8h estimées)
- [ ] Créer client/src/styles/typography.css (source: lignes 2100-2300)
- [ ] Créer client/src/styles/blood-theme.css (source: lignes 1850-2100)
- [ ] Créer client/src/lib/motion-variants.ts (source: lignes 1650-1850)
- [ ] Créer client/src/styles/layout.css (source: lignes 1200-1400)
- [ ] Créer client/src/styles/effects.css (source: lignes 2300-2500)

PHASE 2: COMPOSANTS (10h estimées)
- [ ] Créer MetricCard3D.tsx (source: lignes 951-1165)
- [ ] Créer RadialScoreChart.tsx (source: lignes 1183-1412)
- [ ] ... (8 autres composants)

PHASE 3: INTÉGRATION (6h estimées)
- [ ] Modifier BloodAnalysisReport.tsx (refactorisation sections)
- [ ] Ajouter animations chorégraphiées
- [ ] Tests responsive
```

---

### Phase 2: Exécution avec Validation Continue

**Étape 2.1: Créer les foundations**

Pour CHAQUE fichier foundation, suivre ce pattern:

```
AVANT D'ÉCRIRE LE CODE:
1. Je vérifie que je comprends le fichier source (REFONTE ligne X-Y)
2. Je vérifie où créer le fichier (chemin exact)
3. Je vérifie les imports nécessaires

PENDANT L'ÉCRITURE:
1. Je copie EXACTEMENT le code des lignes source
2. Je ne simplifie PAS
3. Je ne change PAS les valeurs de design (colors, spacing, etc.)

APRÈS ÉCRITURE:
1. Je vérifie qu'il n'y a pas d'erreurs TypeScript
2. Je vérifie que le fichier est importé correctement
3. Je teste (voir section Validation)
```

**Exemple concret: Créer typography.css**

```
✅ AVANT D'ÉCRIRE:
- Source: REFONTE_UI_UX_ULTRA_PREMIUM.md lignes 2100-2300
- Destination: /Users/achzod/Desktop/neurocore/neurocore-github/client/src/styles/typography.css
- Imports nécessaires: Aucun (fichier CSS)
- Import dans: client/src/index.css (ajouter @import './styles/typography.css';)

✅ PENDANT:
[Copier lignes 2100-2300 EXACTEMENT]

✅ APRÈS:
- [ ] Fichier créé et sauvegardé
- [ ] Import ajouté dans index.css
- [ ] Vérifier dans DevTools que les classes .display-1, .display-2, etc. existent
- [ ] Tester: Appliquer className="display-1" sur un <h1> et voir si font-size = 96px
```

---

**Étape 2.2: Créer les composants**

Pour CHAQUE composant, suivre ce pattern rigoureux:

```
TEMPLATE DE CRÉATION DE COMPOSANT:

1. ANALYSE PRÉALABLE
   - Nom du composant: [Nom]
   - Source: REFONTE lignes [X-Y]
   - Props attendues: [Liste TypeScript interfaces]
   - Dépendances: [framer-motion, lucide-react, etc.]
   - Utilisé dans: [quels fichiers l'importeront?]

2. CRÉATION DU FICHIER
   - Chemin: /Users/achzod/Desktop/neurocore/neurocore-github/client/src/components/blood/[Nom].tsx
   - Copier code source lignes [X-Y]
   - Ne PAS modifier:
     - Les valeurs de couleurs (#06b6d4, etc.)
     - Les valeurs de spacing (32px, etc.)
     - Les durées d'animation (2s, etc.)
     - Les easings (cubic-bezier, etc.)

3. VALIDATION IMMÉDIATE
   - [ ] Pas d'erreurs TypeScript (vérifier dans l'éditeur)
   - [ ] Imports fonctionnent (vérifier chemins relatifs)
   - [ ] Export default/nommé correct
   - [ ] Props interface complète et exportée

4. TEST ISOLATION
   - Créer un fichier test temporaire qui importe le composant
   - Vérifier qu'il render sans crash
   - Vérifier les props attendues fonctionnent
```

**Exemple concret: MetricCard3D**

```typescript
// ÉTAPE 1: ANALYSE
// Nom: MetricCard3D
// Source: REFONTE lignes 951-1165
// Props:
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

// ÉTAPE 2: CRÉATION
// Fichier: /Users/achzod/Desktop/neurocore/neurocore-github/client/src/components/blood/MetricCard3D.tsx
// [Copier code exact lignes 951-1165]

// ÉTAPE 3: VALIDATION
// ✅ TypeScript: OK (aucune erreur)
// ✅ Imports: framer-motion ✅, ReactNode from 'react' ✅
// ✅ Export: export const MetricCard3D ✅

// ÉTAPE 4: TEST
// Créer client/src/__tests__/MetricCard3D.test.tsx (temporaire)
import { MetricCard3D } from '@/components/blood/MetricCard3D';

// Test basique
<MetricCard3D
  title="Testostérone"
  value={650}
  unit="ng/dL"
  status="optimal"
/>
// → Doit render sans erreur
```

---

### Phase 3: Intégration dans BloodAnalysisReport.tsx

**Étape 3.1: Refactoriser les sections**

```
RAISONNEMENT REQUIS:
Je dois modifier BloodAnalysisReport.tsx pour:
1. Importer les nouveaux composants
2. Remplacer les sections actuelles par les nouvelles versions
3. Garder la logique métier intacte (useQuery, data fetching, etc.)
4. Ne PAS casser la fonctionnalité existante

PATTERN DE REFACTORISATION:
Pour chaque section à refactoriser:

AVANT:
<section id="overview">
  <div className="rounded-2xl...">
    {/* Ancien code */}
  </div>
</section>

APRÈS:
<section id="overview" className="section-overview">
  <div className="bento-grid-container">
    <RadialScoreChart score={displayScore} ... />
    <InteractiveHeatmap categories={categoryData} ... />
  </div>
</section>

VÉRIFICATIONS:
- [ ] La section "overview" existe toujours (liens de navigation fonctionnent)
- [ ] Les données sont passées correctement aux nouveaux composants
- [ ] Aucune régression (ancienne fonctionnalité marche toujours)
```

**Exemple concret: Refactoriser section Hero**

```typescript
// AVANT (lignes 535-574 de BloodAnalysisReport.tsx actuel)
<motion.section id="introduction" className="scroll-mt-24 report-section" variants={itemVariants}>
  <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
    <div className="flex items-center gap-3">
      <Info className="h-5 w-5 text-cyan-600" aria-hidden="true" />
      <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
        Introduction & guide de lecture
      </h2>
    </div>
    {/* ... */}
  </div>
</motion.section>

// APRÈS (nouveau code selon REFONTE lignes 2750-2850)
<motion.section
  id="hero"
  className="section-hero bento-grid-hero relative min-h-[600px]"
  variants={itemVariants}
>
  <AnimatedGradientMesh variant="complex" />

  <div className="grid grid-cols-12 gap-6">
    <div className="col-span-12 lg:col-span-8">
      <MetricCard3D
        title="Score Global Biométrique"
        value={displayScore}
        unit="/100"
        status={scoreStatus}
        icon={<Target className="w-6 h-6" />}
      >
        <p className="text-sm text-slate-400 mt-4">
          Analyse de {displayMarkersCount} marqueurs sanguins
        </p>
      </MetricCard3D>
    </div>

    <div className="col-span-12 lg:col-span-4">
      <AnimatedStatCard
        label="Marqueurs optimaux"
        value={optimalCount}
        icon={CheckCircle2}
        color="#06b6d4"
      />
    </div>
  </div>
</motion.section>

// VALIDATION:
// ✅ displayScore existe (ligne 383 du fichier actuel)
// ✅ displayMarkersCount existe (ligne 384)
// ✅ scoreStatus calculé depuis displayScore (à ajouter)
// ✅ optimalCount calculé depuis markerBuckets (à ajouter)
```

---

## CONTRAINTES: Limitations et Interdictions

### ❌ INTERDICTIONS ABSOLUES

1. **Ne JAMAIS improviser le design**
   ```
   ❌ MAUVAIS:
   // "Je pense que 24px serait mieux que 32px"
   className="p-6" // (décision personnelle)

   ✅ BON:
   // Source: REFONTE ligne 946 dit "Padding: 32px"
   className="p-8" // 32px = p-8 en Tailwind
   ```

2. **Ne JAMAIS simplifier le code source**
   ```
   ❌ MAUVAIS:
   // "Je vais retirer les animations, elles sont trop complexes"
   <div className="card">...</div>

   ✅ BON:
   // Code exact du REFONTE avec toutes les animations
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.4 }}
   >
     ...
   </motion.div>
   ```

3. **Ne JAMAIS modifier les valeurs de design**
   ```
   ❌ MAUVAIS:
   const colors = {
     optimal: '#00BCD4', // J'ai changé le cyan pour un autre bleu
   }

   ✅ BON:
   const colors = {
     optimal: '#06b6d4', // Copié exactement du REFONTE
   }
   ```

4. **Ne JAMAIS sauter des étapes de validation**
   ```
   ❌ MAUVAIS:
   // Créer 5 composants d'un coup sans tester

   ✅ BON:
   // Créer composant → Tester → Valider → Composant suivant
   ```

5. **Ne JAMAIS utiliser width/height dans les animations**
   ```
   ❌ MAUVAIS (cause layout shift, mauvaise perf):
   animate={{ width: '200px', height: '100px' }}

   ✅ BON (60fps garanti):
   animate={{ scale: 1.2, opacity: 1 }}
   ```

---

### ⚠️ POINTS D'ATTENTION CRITIQUES

1. **TypeScript strict mode**
   ```typescript
   // Toujours typer TOUTES les props
   ✅ BON:
   interface CardProps {
     title: string;
     score: number;
     status: 'optimal' | 'normal' | 'suboptimal' | 'critical'; // Union type strict
   }

   ❌ MAUVAIS:
   interface CardProps {
     title: any;
     score: any;
     status: string; // Trop permissif
   }
   ```

2. **Imports relatifs vs absolus**
   ```typescript
   ✅ BON (absolus avec alias @):
   import { MetricCard3D } from '@/components/blood/MetricCard3D';
   import { motion } from 'framer-motion';

   ❌ MAUVAIS (relatifs fragiles):
   import { MetricCard3D } from '../components/blood/MetricCard3D';
   ```

3. **Memoization obligatoire pour composants lourds**
   ```typescript
   ✅ BON:
   export const MetricCard3D = memo(({ title, value, ... }: MetricCard3DProps) => {
     // Component code
   });

   ❌ MAUVAIS (re-renders excessifs):
   export const MetricCard3D = ({ title, value, ... }: MetricCard3DProps) => {
     // Component code
   };
   ```

4. **Accessibility obligatoire**
   ```typescript
   ✅ BON:
   <motion.button
     aria-label={`Voir détails de ${category.label}`}
     onClick={handleClick}
   >

   ❌ MAUVAIS:
   <motion.div onClick={handleClick}>
   ```

5. **Performance: Code splitting**
   ```typescript
   ✅ BON (lazy load composants lourds):
   const InteractiveHeatmap = lazy(() => import('@/components/blood/InteractiveHeatmap'));

   ❌ MAUVAIS (bundle bloat):
   import { InteractiveHeatmap } from '@/components/blood/InteractiveHeatmap';
   ```

---

## VALIDATION: Vérification du Succès

### Checklist après CHAQUE composant créé

```markdown
VALIDATION COMPOSANT: [Nom du composant]

## Build & Types
- [ ] Pas d'erreurs TypeScript dans l'éditeur
- [ ] `npm run build` passe sans erreur
- [ ] Pas de warnings eslint critiques

## Props & Interface
- [ ] Interface TypeScript exportée
- [ ] Tous les props typés strictement (pas de 'any')
- [ ] Props optionnels marqués avec '?'
- [ ] Valeurs par défaut définies pour props optionnels

## Imports
- [ ] Tous les imports fonctionnent (pas de chemins cassés)
- [ ] Imports absolus avec alias '@' (pas de '../../')
- [ ] Lucide-react icons importés directement (pas de barrel import)

## Performance
- [ ] Composant wrappé dans memo() si plus de 50 lignes
- [ ] Animations utilisent uniquement transform + opacity
- [ ] Pas de calculs lourds dans le render (useMemo si nécessaire)

## Accessibility
- [ ] Éléments interactifs ont aria-label
- [ ] Icons décoratifs ont aria-hidden="true"
- [ ] Keyboard navigation fonctionne (Tab, Enter, Escape)
- [ ] Focus states visibles

## Visual
- [ ] Couleurs respectent la palette (#06b6d4, #3b82f6, etc.)
- [ ] Spacing respecte les specs (32px padding, etc.)
- [ ] Typography utilise les classes font-display, font-body, font-data
- [ ] Grain texture présente si spécifié
```

---

### Tests de validation globale (fin de Phase)

**Après Phase 1 (Foundations):**

```bash
# Test 1: Vérifier que les CSS sont chargés
# Dans DevTools Console:
getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')
# Attendu: "#0a0b0d"

# Test 2: Vérifier les classes typography
document.querySelector('.display-1')
# Attendu: font-size 96px

# Test 3: Vérifier motion variants
# Dans client/src/lib/motion-variants.ts existe
ls client/src/lib/motion-variants.ts
# Attendu: fichier existe
```

**Après Phase 2 (Composants):**

```bash
# Test 1: Tous les composants existent
ls client/src/components/blood/
# Attendu: 10 fichiers .tsx

# Test 2: Imports fonctionnent
grep -r "MetricCard3D" client/src/
# Attendu: Import dans BloodAnalysisReport.tsx

# Test 3: Build passe
npm run build
# Attendu: ✓ built in XXXms, no errors
```

**Après Phase 3 (Intégration):**

```bash
# Test 1: Lighthouse score
npm run build && npm run preview
# Ouvrir DevTools Lighthouse, run audit
# Attendu:
#   - Performance: >90
#   - Accessibility: >90
#   - Best Practices: >90

# Test 2: Bundle size
du -sh dist/assets/*.js
# Attendu: index-*.js < 500KB

# Test 3: Responsive
# Ouvrir en mobile (375px), tablet (768px), desktop (1440px)
# Attendu: Layout s'adapte sans overflow horizontal
```

---

### Métriques de succès finales

```markdown
## SCORE DESIGN FINAL

Avant refonte: 27/100
Cible: 92/100

### Breakdown:
1. Layout & Structure: [Score/20]
   - Grille Bento-Box implémentée: [Oui/Non]
   - Sections avec identité visuelle: [Oui/Non]
   - Sticky nav avec progression: [Oui/Non]

2. Data Visualization: [Score/20]
   - RadialScoreChart implémenté: [Oui/Non]
   - InteractiveHeatmap implémenté: [Oui/Non]
   - TrendSparkline implémenté: [Oui/Non]

3. Composants Premium: [Score/20]
   - 10 composants créés: [X/10]
   - Tous memoizés: [Oui/Non]
   - TypeScript strict: [Oui/Non]

4. Animations: [Score/20]
   - Page load choreography: [Oui/Non]
   - Scroll-based animations: [Oui/Non]
   - Hover micro-interactions: [Oui/Non]
   - 60fps garanti: [Oui/Non]

5. Performance: [Score/10]
   - Bundle < 500KB: [Oui/Non]
   - Load time < 3s: [Oui/Non]
   - Lighthouse > 90: [Oui/Non]

6. Accessibility: [Score/10]
   - WCAG AA: [Oui/Non]
   - Keyboard navigation: [Oui/Non]
   - Screen reader support: [Oui/Non]

TOTAL: [Score/100]
```

---

## EXEMPLES: Patterns Clés avec Before/After

### Exemple 1: Transformation d'une Section Standard

**BEFORE (actuel - générique):**

```tsx
<section id="overview" className="mt-10 scroll-mt-24">
  <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8">
    <h2 className="text-2xl font-semibold">Score global</h2>
    <BiometricProgressCircle score={displayScore} size={220} />
    <p className="text-sm text-slate-700">
      Ton score est {displayScore}/100
    </p>
  </div>
</section>
```

**AFTER (refonte - ultra-premium):**

```tsx
<motion.section
  id="overview"
  className="section-overview bento-grid-overview mt-16 scroll-mt-24"
  variants={sectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-100px" }}
>
  {/* Background gradient spécifique */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent" />
  </div>

  {/* Grille asymétrique */}
  <div className="grid grid-cols-12 gap-6 auto-rows-auto">
    {/* Score global - Large card */}
    <div className="col-span-12 lg:col-span-7 row-span-2">
      <MetricCard3D
        title="Score Biométrique Global"
        value={displayScore}
        unit="/100"
        status={getScoreStatus(displayScore)}
        icon={<Target className="w-6 h-6 text-cyan-400" />}
        trend={previousScore ? (displayScore > previousScore ? 'up' : 'down') : undefined}
        trendValue={previousScore ? `${Math.abs(displayScore - previousScore)} pts vs dernier test` : undefined}
      >
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Objectif 90 jours</span>
            <span className="text-emerald-400 font-semibold">{targetScore}/100</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(displayScore / targetScore) * 100}%` }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
          </div>
        </div>
      </MetricCard3D>
    </div>

    {/* Stats complémentaires - Small cards */}
    <div className="col-span-6 lg:col-span-5 lg:row-span-1">
      <AnimatedStatCard
        label="Marqueurs optimaux"
        value={optimalCount}
        icon={CheckCircle2}
        color="#06b6d4"
        trend={{ value: '+3 vs dernier test', direction: 'up' }}
      />
    </div>

    <div className="col-span-6 lg:col-span-5 lg:row-span-1">
      <AnimatedStatCard
        label="Alertes critiques"
        value={criticalCount}
        icon={AlertTriangle}
        color="#f43f5e"
      />
    </div>

    {/* Heatmap interactive - Full width */}
    <div className="col-span-12">
      <InteractiveHeatmap
        categories={[
          { key: 'hormonal', label: 'Hormonal', score: hormonalScore, markerCount: 8, criticalCount: 2 },
          { key: 'thyroid', label: 'Thyroïde', score: thyroidScore, markerCount: 5, criticalCount: 0 },
          // ... autres catégories
        ]}
        onCategoryClick={(key) => {
          // Scroll vers la section détaillée
          document.getElementById(`detail-${key}`)?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  </div>
</motion.section>
```

**Différences clés:**
1. ✅ Layout Bento-Box asymétrique (7 cols + 5 cols au lieu de centré)
2. ✅ MetricCard3D avec 3D parallax au lieu de card basique
3. ✅ AnimatedStatCard avec counter animation
4. ✅ InteractiveHeatmap cliquable (feature unique)
5. ✅ Animations chorégraphiées (whileInView, delays)
6. ✅ Gradient background contextuels
7. ✅ Micro-interactions partout (hover, click)

---

### Exemple 2: Création d'un Composant from Scratch

**ÉTAPES COMPLÈTES:**

**Étape 1: Lecture de la spec**

```markdown
SOURCE: REFONTE_UI_UX_ULTRA_PREMIUM.md lignes 1430-1538

COMPOSANT: TrendSparkline

DESCRIPTION:
Mini graphique inline montrant évolution d'un marqueur sur 30/90 jours

PROPS:
- data: number[] (valeurs historiques)
- width?: number (default 80px)
- height?: number (default 24px)
- color?: string (default '#06b6d4')
- showGradient?: boolean (default true)
- animationDelay?: number (default 0)

DESIGN SPECS:
- SVG path animé (strokeDashoffset)
- Gradient fill sous la courbe
- Point indicator sur dernière valeur
- Smooth curve (quadratic bezier)

UTILISATIONS:
- Dans BiomarkerCardPremium (montrer trend 30j)
- Dans section "Evolution" (multiple sparklines)
```

**Étape 2: Créer l'interface TypeScript**

```typescript
// File: client/src/components/blood/TrendSparkline.tsx

'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * TrendSparkline - Mini graphique inline pour tendances
 *
 * @example
 * <TrendSparkline
 *   data={[45, 48, 52, 55, 58]}
 *   color="#06b6d4"
 *   animationDelay={0.2}
 * />
 */
interface TrendSparklineProps {
  /** Valeurs historiques du marqueur (minimum 2 points) */
  data: number[];
  /** Largeur du graphique en pixels */
  width?: number;
  /** Hauteur du graphique en pixels */
  height?: number;
  /** Couleur de la ligne (hex ou rgba) */
  color?: string;
  /** Afficher le gradient fill sous la courbe */
  showGradient?: boolean;
  /** Délai avant animation (en secondes) */
  animationDelay?: number;
}

export const TrendSparkline = ({
  data,
  width = 80,
  height = 24,
  color = '#06b6d4',
  showGradient = true,
  animationDelay = 0,
}: TrendSparklineProps) => {
  // [Implementation suit...]
```

**Étape 3: Implémenter la logique (copie exacte du REFONTE)**

```typescript
  // Generate SVG path from data
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    // Create smooth curve using quadratic bezier
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      pathData += ` Q ${cpX} ${prev.y}, ${curr.x} ${curr.y}`;
    }

    return pathData;
  }, [data, width, height]);

  // [Reste de l'implémentation exactement comme lignes 1453-1538...]
```

**Étape 4: Valider le composant**

```bash
# Test 1: Build
npm run build
# ✅ Attendu: No errors

# Test 2: Import dans un autre fichier
# Créer client/src/__tests__/TrendSparkline.test.tsx
import { TrendSparkline } from '@/components/blood/TrendSparkline';

const TestPage = () => (
  <div className="p-8 bg-slate-900">
    <TrendSparkline
      data={[45, 48, 52, 55, 58, 62]}
      color="#06b6d4"
    />
  </div>
);

# Test 3: Vérifier visuel
npm run dev
# Ouvrir http://localhost:5173/__tests__/TrendSparkline.test
# ✅ Attendu: Voir un mini graphique bleu animé
```

---

### Exemple 3: Refactorisation avec Préservation de la Logique

**SCENARIO:**
Transformer la section "Alerts" actuelle en layout Bento-Box avec MetricCard3D

**BEFORE (actuel - logique à préserver):**

```tsx
<section id="alerts" className="mt-10 scroll-mt-24">
  <div className="rounded-2xl border bg-[--bg-secondary] p-8">
    <h2 className="text-2xl font-semibold">Alertes prioritaires</h2>

    {isLoadingReport ? (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <BiomarkerCardPremiumSkeleton key={`skeleton-${idx}`} />
        ))}
      </div>
    ) : criticalMarkers.length ? (
      <div className="grid gap-4 md:grid-cols-2">
        {criticalMarkers.map((marker) => (
          <BiomarkerCardPremium
            key={marker.code}
            marker={{
              name: marker.name,
              value: marker.value,
              unit: marker.unit,
              status: marker.status,
              normalMin: marker.normalMin,
              normalMax: marker.normalMax,
            }}
          />
        ))}
      </div>
    ) : (
      <div className="text-sm text-slate-700">
        Aucun marqueur critique détecté.
      </div>
    )}
  </div>
</section>
```

**AFTER (refonte - logique IDENTIQUE mais UI premium):**

```tsx
<motion.section
  id="alerts"
  className="section-alerts mt-20 scroll-mt-24 relative"
  variants={sectionVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
>
  {/* Section-specific gradient background */}
  <div className="absolute inset-0 -z-10 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-radial from-rose-500/8 via-transparent to-transparent" />
  </div>

  {/* Header avec divider animé */}
  <div className="mb-8">
    <div className="flex items-center gap-4 mb-4">
      <motion.div
        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <AlertTriangle className="w-6 h-6 text-rose-400" />
      </motion.div>
      <div>
        <h2 className="display-3 text-3xl font-bold text-slate-100">
          Alertes Prioritaires
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Marqueurs nécessitant une action immédiate
        </p>
      </div>
    </div>
    <GradientDivider color="rose" />
  </div>

  {/* Content - LOGIQUE IDENTIQUE */}
  {isLoadingReport ? (
    // ✅ Loading state preserved
    <div className="grid grid-cols-12 gap-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={`skeleton-${idx}`} className="col-span-12 md:col-span-6 lg:col-span-3">
          <MetricCard3DSkeleton />
        </div>
      ))}
    </div>
  ) : criticalMarkers.length ? (
    // ✅ Data mapping preserved, UI upgraded
    <div className="grid grid-cols-12 gap-6">
      {criticalMarkers.map((marker, idx) => {
        // Asymmetric grid sizing
        const colSpan = idx === 0 ? 'col-span-12' : 'col-span-12 md:col-span-6';

        return (
          <motion.div
            key={marker.code}
            className={colSpan}
            variants={itemVariants}
            custom={idx}
          >
            <MetricCard3D
              title={marker.name}
              value={marker.value}
              unit={marker.unit}
              status={marker.status}
              icon={<AlertTriangle className="w-5 h-5" />}
            >
              {/* Range visualization */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Min: {marker.normalMin}</span>
                  <span>Max: {marker.normalMax}</span>
                </div>
                <RangeBar
                  value={marker.value}
                  min={marker.normalMin}
                  max={marker.normalMax}
                  optimalMin={marker.optimalMin}
                  optimalMax={marker.optimalMax}
                />
              </div>

              {/* Trend if available */}
              {marker.trend && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Tendance 30j:</span>
                  <TrendSparkline
                    data={marker.trend}
                    color={marker.status === 'critical' ? '#f43f5e' : '#f59e0b'}
                    animationDelay={idx * 0.1}
                  />
                </div>
              )}
            </MetricCard3D>
          </motion.div>
        );
      })}
    </div>
  ) : (
    // ✅ Empty state preserved, UI upgraded
    <motion.div
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
      <p className="text-sm text-slate-300">
        Aucun marqueur critique détecté. Tous tes marqueurs sont dans des ranges acceptables.
      </p>
    </motion.div>
  )}
</motion.section>
```

**Points clés de préservation:**

1. ✅ **Logique conditionnelle identique:**
   - `isLoadingReport ?` → Skeleton
   - `criticalMarkers.length ?` → Display data
   - `: null` → Empty state

2. ✅ **Data mapping préservé:**
   - `criticalMarkers.map((marker) => ...)`
   - Props `marker.name`, `marker.value`, etc. intacts

3. ✅ **Keys préservées:**
   - `key={marker.code}` pour éviter re-renders

4. ✅ **Fonctionnalités ajoutées (non-breaking):**
   - Animations (whileInView)
   - Range visualization
   - Trend sparklines (si données disponibles)
   - Better empty state

---

## RÉCAPITULATIF: Checklist Globale

**Avant de commencer:**
- [ ] J'ai lu REFONTE_UI_UX_ULTRA_PREMIUM.md en entier
- [ ] J'ai compris les 10 composants à créer
- [ ] J'ai identifié les numéros de lignes source pour chaque composant
- [ ] J'ai vérifié les dépendances (framer-motion, lucide-react installés)

**Pendant l'exécution:**
- [ ] Je copie EXACTEMENT le code source (pas de simplification)
- [ ] Je teste CHAQUE composant avant de passer au suivant
- [ ] Je valide TypeScript (pas d'erreurs)
- [ ] Je valide les imports (chemins corrects)
- [ ] Je préserve la logique métier existante

**Après chaque phase:**
- [ ] npm run build passe sans erreur
- [ ] Pas de régression fonctionnelle
- [ ] Performance maintenue (bundle < 500KB)
- [ ] Accessibility vérifiée (keyboard nav fonctionne)

**Validation finale:**
- [ ] Score design >= 85/100
- [ ] Lighthouse Performance >= 90
- [ ] Lighthouse Accessibility >= 90
- [ ] User est satisfait du résultat visuel

---

## QUESTIONS FRÉQUENTES

**Q: Que faire si une spec est ambiguë?**
R: STOP. Demander clarification au user AVANT d'écrire du code. Ne JAMAIS deviner.

**Q: Puis-je optimiser le code source du REFONTE?**
R: NON. Copier exactement. L'optimisation vient APRÈS validation visuelle.

**Q: Le fichier REFONTE dit "32px padding" mais Tailwind n'a pas p-32?**
R: Utiliser la classe Tailwind équivalente: p-8 (8 * 4px = 32px). Vérifier dans la doc Tailwind.

**Q: Un composant a 300 lignes, dois-je le splitter?**
R: NON. Si le REFONTE le définit comme un composant unique, garder tel quel. Refactor après validation.

**Q: Comment gérer les couleurs custom pas dans Tailwind?**
R: Utiliser style inline: `style={{ color: '#06b6d4' }}` ou ajouter dans tailwind.config.ts.

**Q: L'animation est trop rapide/lente visuellement?**
R: Garder les valeurs du REFONTE d'abord. Noter pour ajustement après validation user.

---

**FIN DU PROMPT OPTIMISÉ**

**Version:** 1.0
**Dernière mise à jour:** 2026-01-31
**Auteur:** Claude Code (Sonnet 4.5)
**Review:** Achzod (Frontend Developer + Prompt Engineer + Senior Frontend)
