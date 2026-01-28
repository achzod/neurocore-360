# SPECS TECHNIQUES - REFONTE COMPLÈTE BLOOD ANALYSIS DASHBOARD

**Date**: 2026-01-28
**Version**: 1.0 - Implémentation complète
**Objectif**: Passer de 2/10 à 9/10 vs benchmarks (Ultrahuman, InsideTracker, Levels, Oura)

---

## 📋 TABLE DES MATIÈRES

1. [Executive Summary](#executive-summary)
2. [Architecture Globale](#architecture-globale)
3. [Data Flow](#data-flow)
4. [Structure Fichiers](#structure-fichiers)
5. [Wireframes Détaillés](#wireframes-détaillés)
6. [Algorithmes de Calcul](#algorithmes-de-calcul)
7. [Moteur Rédactionnel](#moteur-rédactionnel)
8. [Spécifications Composants](#spécifications-composants)
9. [Guide Implémentation](#guide-implémentation)
10. [Testing & Validation](#testing--validation)

---

## 1. EXECUTIVE SUMMARY

### État Actuel (Score: 2/10)

**Problèmes critiques**:
- ❌ Scroll infini (8,000-12,000px) → Navigation amateur
- ❌ Pas d'onglets → Tout mélangé dans une seule page
- ❌ 1 seul radar (buried à 40% scroll) → Manque de visualisation
- ❌ Dark theme caché (toggle invisible) → UX cassée
- ❌ Analyses 30x trop courtes (50 mots vs 2000 needed) → Contenu amateur
- ❌ Layout vertical boring → Pas de hiérarchie visuelle
- ❌ AI analysis = markdown dump → Lecture pénible

**Comparaison benchmarks**:
- Ultrahuman: 4-5 tabs, 3 radars, dark theme default, analyses riches
- InsideTracker: Dashboard/Plan/Foods/Supplements tabs, percentile rankings
- Levels: CGM dashboard avec Today/Insights/Trends, graphs multiples
- Oura: Readiness/Sleep/Activity tabs, multiple ring radars

### État Cible (Score: 9/10)

**Solutions**:
- ✅ **6 onglets** (Overview, Biomarkers, Analysis, Protocol, Trends, Sources)
- ✅ **3 radars** (Global, Panel, Percentile) tous visibles dans Overview
- ✅ **Dark theme** par défaut + toggle visible dans header
- ✅ **Sidebar navigation** avec progress tracking
- ✅ **Cards compactes** pour biomarqueurs (grid 3 colonnes)
- ✅ **Modal détails** avec 2000-3000 mots par marqueur critique
- ✅ **AI analysis structurée** avec sous-sections et formatting
- ✅ **Timeline visuelle** pour protocole d'optimisation

### Effort Estimé

**Total**: 24-35 heures

**Breakdown par phase**:
1. Tab system + routing: 8-12h
2. Sidebar navigation: 2-3h
3. Cards compactes + modal: 4-6h
4. Radars (2 nouveaux): 3-4h
5. AI analysis parser: 6-8h
6. Protocol timeline: 3-4h
7. Theme toggle visible: 30min
8. Testing + polish: 2-3h

---

## 2. ARCHITECTURE GLOBALE

### Vue d'ensemble

```
BloodAnalysisReport (Container)
├── BloodThemeContext (Theme provider)
├── BloodHeader (Logo + Theme toggle + Share)
├── BloodSidebar (Navigation + Progress)
└── BloodTabs (Main content)
    ├── OverviewTab
    │   ├── GlobalScoreCard
    │   ├── ThreeRadarsSection (Global + Panel + Percentile)
    │   ├── KeyAlertsSection
    │   └── QuickActionsSection
    ├── BiomarkersTab
    │   ├── FilterBar (Panel selector + Search)
    │   ├── BiomarkerGrid (3 cols cards)
    │   └── BiomarkerDetailModal (2000-3000 words)
    ├── AnalysisTab
    │   ├── AnalysisSubTabs (Systems, Patterns, Correlations)
    │   └── StructuredContent (parsed AI analysis)
    ├── ProtocolTab
    │   ├── ProtocolTimeline (0-30d, 30-90d, 90d+)
    │   ├── SupplementsTable
    │   └── LifestyleChecklist
    ├── TrendsTab (Placeholder v2)
    │   └── ComingSoonMessage
    └── SourcesTab
        └── CitationsByPanel
```

### Principes de Design

**1. Information Architecture**
- **Progressive disclosure**: Overview → Détails → Actions
- **Contexte avant détails**: Score global → Panels → Marqueurs
- **Hiérarchie claire**: 3 niveaux max (Tab → Section → Item)

**2. Visual Hierarchy**
- **Couleurs fonctionnelles**: Bleu (info), Orange (warning), Vert (success), Rouge (critical)
- **Typographie cohérente**: Inter font, 4 tailles (xs/sm/base/lg)
- **Espacement système**: 4px grid (4, 8, 12, 16, 24, 32, 48)

**3. Interaction Patterns**
- **Click to expand**: Cards → Modal pour détails longs
- **Hover for preview**: Tooltips pour définitions rapides
- **Tab navigation**: Keyboard accessible (← → arrows)
- **Scroll to section**: Sidebar links avec smooth scroll

**4. Performance**
- **Lazy loading**: Tabs chargés à la demande
- **Virtualization**: Si >50 marqueurs (pas nécessaire pour 39)
- **Image optimization**: Pas d'images (SVG icons seulement)
- **Bundle splitting**: Tabs séparés en code-split chunks

---

## 3. DATA FLOW

### Diagramme complet

```
[1. UPLOAD PDF]
     ↓
[2. EXTRACTION] (server/blood-analysis/index.ts)
     ↓ extractMarkers()
     ↓ validateRanges()
     ↓ 39 biomarkers extraits
     ↓
[3. PATIENT CONTEXT]
     ↓ responses (age, sex, BMI, sleep, training...)
     ↓
[4. CALCULATIONS]
     ↓
     ├── scoreCalculation()
     │   ├── markerScore (optimal=100, normal=80, suboptimal=55, critical=30)
     │   ├── panelScore (avg of markers in panel)
     │   └── globalScore (weighted avg of 6 panels)
     ↓
     ├── percentileRanking()
     │   ├── compareByAge(marker, age, sex)
     │   ├── compareByBMI(marker, bmi)
     │   └── percentile (0-100, higher=better)
     ↓
     ├── derivedMetrics()
     │   ├── anabolicIndex = f(testosterone, IGF1, cortisol, SHBG)
     │   ├── recompReadiness = f(insulin sensitivity, testosterone, thyroid)
     │   ├── diabetesRisk = f(glycemia, HbA1c, HOMA-IR, TG/HDL)
     │   └── inflammationScore = f(CRP, homocysteine, ferritin)
     ↓
     ├── correlations()
     │   ├── getCorrelationInsights(marker, value, patientContext)
     │   ├── Match patterns: low sleep → high cortisol
     │   └── Generate recommendations
     ↓
     └── aiAnalysis()
         ├── generateAIAnalysis(markers, correlations, context)
         ├── Claude Opus 4.5 (10,000+ chars)
         └── Structured markdown
     ↓
[5. STORAGE]
     ↓ Save to DB (reports table)
     ↓ reportId + accessKey
     ↓
[6. RENDERING] (BloodAnalysisReport.tsx)
     ↓
     ├── Fetch data: /api/blood-analysis/:reportId
     ├── Parse AI analysis → sections
     ├── Calculate UI metrics (alerts, priority actions)
     └── Render tabs + components
```

### Interfaces TypeScript

```typescript
// Types principaux
export interface BloodMarker {
  code: string;              // "testosterone_total"
  name: string;              // "Testostérone Totale"
  value: number;             // 520
  unit: string;              // "ng/dL"
  status: "optimal" | "normal" | "suboptimal" | "critical";
  score: number;             // 0-100 (optimal=100)
  optimalMin: number | null; // 600
  optimalMax: number | null; // 900
  normalMin: number | null;  // 300
  normalMax: number | null;  // 1000
  panel: PanelKey;           // "hormonal"
  percentile?: number;       // 0-100 (vs population)
}

export type PanelKey =
  | "hormonal"
  | "thyroid"
  | "metabolic"
  | "inflammatory"
  | "vitamins"
  | "liver_kidney";

export interface PanelScore {
  panel: PanelKey;
  score: number;        // 0-100 (avg of markers in panel)
  markersCount: number; // Nombre de marqueurs
  criticalCount: number;
  suboptimalCount: number;
}

export interface DerivedMetrics {
  anabolicIndex: number | null;     // 0-100
  recompReadiness: number | null;   // 0-100
  diabetesRisk: {
    score: number;                  // 0-100
    level: "low" | "moderate" | "high" | "very_high";
  };
  inflammationScore: number | null; // 0-100
}

export interface BloodReportData {
  reportId: string;
  patientName: string;
  patientAge: number;
  patientSex: "male" | "female";
  createdAt: string;

  // Scores
  globalScore: number;              // 0-100
  panelScores: PanelScore[];        // 6 panels

  // Marqueurs
  markers: BloodMarker[];           // 39 marqueurs

  // Métriques dérivées
  derivedMetrics: DerivedMetrics;

  // Contexte patient
  patientContext: {
    age: number;
    sex: string;
    bmi: number;
    sleep: string;
    training: string;
    calories: string;
    alcohol: string;
    stress: string;
    supplements: string;
  };

  // Analyses
  aiAnalysis: string;               // Markdown (10,000+ chars)
  correlations: CorrelationInsight[];

  // Protocol
  protocolSteps: ProtocolStep[];
  supplements: Supplement[];

  // Sources
  sources: Citation[];
}

export interface CorrelationInsight {
  markerCode: string;
  insight: string;                  // "Sleep <6h correlates with high cortisol"
  recommendation: string;           // "Prioritize 7h30-8h30 sleep"
  confidence: "low" | "medium" | "high";
}

export interface ProtocolStep {
  phase: "immediate" | "short_term" | "long_term"; // 0-30d, 30-90d, 90d+
  category: "lifestyle" | "supplement" | "retest";
  priority: "high" | "medium" | "low";
  action: string;
  duration: string;
  markers: string[];                // Codes des marqueurs impactés
}

export interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  brand: string | null;
  markers: string[];                // Codes des marqueurs impactés
  studies: string[];                // URLs ou DOI
}

export interface Citation {
  panel: PanelKey;
  text: string;
  url: string | null;
}
```

---

## 4. STRUCTURE FICHIERS

### Arborescence complète

```
client/src/
├── pages/
│   └── BloodAnalysisReport.tsx          [REFACTOR] Container principal
│
├── components/blood/
│   ├── BloodThemeContext.tsx            [EXISTS] Theme provider
│   ├── ThemeToggle.tsx                  [EXISTS] Toggle dark/light
│   ├── bloodTheme.ts                    [EXISTS] Couleurs
│   │
│   ├── BloodHeader.tsx                  [NEW] Header avec logo + toggle
│   ├── BloodSidebar.tsx                 [NEW] Navigation avec progress
│   ├── BloodTabs.tsx                    [NEW] Tab system wrapper
│   │
│   ├── tabs/
│   │   ├── OverviewTab.tsx              [NEW] Tab Overview
│   │   ├── BiomarkersTab.tsx            [NEW] Tab Biomarkers
│   │   ├── AnalysisTab.tsx              [NEW] Tab Analysis
│   │   ├── ProtocolTab.tsx              [NEW] Tab Protocol
│   │   ├── TrendsTab.tsx                [NEW] Tab Trends (placeholder)
│   │   └── SourcesTab.tsx               [NEW] Tab Sources
│   │
│   ├── overview/
│   │   ├── GlobalScoreCard.tsx          [NEW] Score global + animation
│   │   ├── ThreeRadarsSection.tsx       [NEW] 3 radars côte à côte
│   │   ├── GlobalRadar.tsx              [NEW] Radar 6 panels
│   │   ├── PanelRadar.tsx               [NEW] Radar marqueurs d'un panel
│   │   ├── PercentileRadar.tsx          [NEW] Radar percentiles
│   │   ├── KeyAlertsSection.tsx         [NEW] 3-5 alertes critiques
│   │   └── QuickActionsSection.tsx      [NEW] Actions rapides
│   │
│   ├── biomarkers/
│   │   ├── FilterBar.tsx                [NEW] Panel filter + search
│   │   ├── BiomarkerGrid.tsx            [NEW] Grid 3 colonnes
│   │   ├── BiomarkerCardCompact.tsx     [NEW] Card compacte
│   │   ├── BiomarkerDetailModal.tsx     [NEW] Modal détails longs
│   │   └── BiomarkerTabs.tsx            [NEW] Tabs modal (Définition/Impact/Protocole)
│   │
│   ├── analysis/
│   │   ├── AnalysisSubTabs.tsx          [NEW] Sub-tabs (Systems/Patterns/Correlations)
│   │   ├── StructuredContent.tsx        [NEW] Parser AI analysis
│   │   └── CorrelationCard.tsx          [NEW] Card corrélation
│   │
│   ├── protocol/
│   │   ├── ProtocolTimeline.tsx         [NEW] Timeline 3 phases
│   │   ├── PhaseCard.tsx                [NEW] Card phase
│   │   ├── SupplementsTable.tsx         [NEW] Tableau suppléments
│   │   └── LifestyleChecklist.tsx       [NEW] Checklist lifestyle
│   │
│   ├── trends/
│   │   └── ComingSoonMessage.tsx        [NEW] Message placeholder v2
│   │
│   ├── sources/
│   │   └── CitationsByPanel.tsx         [NEW] Citations groupées
│   │
│   └── shared/
│       ├── AnimatedNumber.tsx           [EXISTS] Count-up animation
│       ├── BloodRadar.tsx               [EXISTS] Radar chart base
│       ├── StatusBadge.tsx              [EXISTS] Badge status
│       ├── BiomarkerRangeIndicator.tsx  [EXISTS] Barre range
│       └── LoadingSpinner.tsx           [NEW] Spinner custom
│
├── data/
│   ├── bloodBiomarkerDetails.ts         [EXISTS] Détails marqueurs
│   └── bloodBiomarkerDetailsExtended.ts [NEW] Détails 2000-3000 mots
│
└── lib/
    ├── biomarkerCorrelations.ts         [EXISTS] Corrélations
    ├── bloodAnalysisParser.ts           [NEW] Parser AI analysis
    └── protocolGenerator.ts             [NEW] Génération protocole
```

### Fichiers à créer (NEW) vs modifier (REFACTOR)

**À créer (27 fichiers)**:
- 6 tabs components
- 9 overview components
- 5 biomarkers components
- 3 analysis components
- 4 protocol components
- 1 trends component
- 1 sources component
- 3 header/sidebar/tabs
- 1 loading spinner
- 2 data files
- 2 lib utils

**À modifier (1 fichier)**:
- `BloodAnalysisReport.tsx` → Devient container léger qui orchestre les tabs

**À garder intacts (6 fichiers)**:
- `BloodThemeContext.tsx`
- `ThemeToggle.tsx`
- `bloodTheme.ts`
- `AnimatedNumber.tsx`
- `BloodRadar.tsx`
- `StatusBadge.tsx`
- `BiomarkerRangeIndicator.tsx`
- `biomarkerCorrelations.ts`

---

## 5. WIREFRAMES DÉTAILLÉS

### 5.1 Layout Global (Desktop 1440px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER (h: 64px, bg: surface, border-bottom)                      │
│  ┌──────────┬────────────────────────────────────┬────────────────┐│
│  │ Logo     │          Titre Rapport             │ Toggle │ Share ││
│  │ (48px)   │       "Analyse Sanguine - Marc"    │ (40px) │(button│
│  └──────────┴────────────────────────────────────┴────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────────────────────┐
│ SIDEBAR  │  MAIN CONTENT (Tabs)                                     │
│ (w:240px)│  ┌─────────────────────────────────────────────────────┐ │
│          │  │ TAB BAR (6 tabs, h: 48px)                           │ │
│ Score:   │  │ [Overview] [Biomarkers] [Analysis] ...              │ │
│  ●──○    │  └─────────────────────────────────────────────────────┘ │
│  85/100  │  ┌─────────────────────────────────────────────────────┐ │
│          │  │                                                       │ │
│ Nav:     │  │  TAB CONTENT (Dynamic)                               │ │
│ • Overview│  │                                                       │ │
│ • Bio... │  │  OverviewTab / BiomarkersTab / AnalysisTab ...       │ │
│ • Ana... │  │                                                       │ │
│ • Pro... │  │  (See individual tab wireframes below)               │ │
│ • Tre... │  │                                                       │ │
│ • Sou... │  │                                                       │ │
│          │  │                                                       │ │
│ Progress:│  │                                                       │ │
│ ▓▓▓▓▓░░░ │  │                                                       │ │
│ 5/6 done │  │                                                       │ │
│          │  │                                                       │ │
│ [v] Light│  │                                                       │ │
│          │  └─────────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────┘
```

**Dimensions**:
- **Header**: Height 64px, full width, fixed top
- **Sidebar**: Width 240px, fixed left, scrollable
- **Main**: Width calc(100% - 240px), margin-left 240px
- **Tab bar**: Height 48px, sticky top (under header)
- **Content area**: Padding 24px, max-width 1200px, centered

**Responsive (Mobile <768px)**:
- Sidebar → Hamburger menu (overlay)
- Tabs → Horizontal scroll with arrow navigation
- Grid 3 cols → 1 col

---

### 5.2 Tab: Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ OVERVIEW TAB                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SECTION: Score Global (h: 180px, centered)                   │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │        ┌─────────┐                                      │  │  │
│  │  │        │   85    │  ← AnimatedNumber (count-up 0→85)   │  │  │
│  │  │        │  /100   │                                      │  │  │
│  │  │        └─────────┘                                      │  │  │
│  │  │      "Bon état général"                                 │  │  │
│  │  │   Top 15% (hommes 32 ans)                              │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SECTION: 3 Radars (grid 3 cols, gap: 24px)                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │  │
│  │  │ Global   │  │ Panel    │  │ Percentile│                  │  │
│  │  │ Radar    │  │ Radar    │  │ Radar    │                  │  │
│  │  │  (6 axes)│  │ (Hormones│  │ (Age/BMI)│                  │  │
│  │  │          │  │ selected)│  │          │                  │  │
│  │  │ [Chart]  │  │ [Chart]  │  │ [Chart]  │                  │  │
│  │  │  320px   │  │  320px   │  │  320px   │                  │  │
│  │  └──────────┘  └──────────┘  └──────────┘                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SECTION: Alertes Clés (3-5 cards, grid 1 col, gap: 12px)    │  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │ ⚠️ CRITIQUE: Testostérone 30% sous optimal              ││  │
│  │  │ 420 ng/dL (cible: 600-900) → Priorité #1               ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │ ⚠️ ATTENTION: Vitamine D insuffisante                   ││  │
│  │  │ 22 ng/mL (cible: 40-60) → Supplémenter                 ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │ ⚠️ ATTENTION: Glycémie limite                           ││  │
│  │  │ 105 mg/dL (cible: 70-100) → Contrôle glucidique        ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SECTION: Actions Rapides (grid 3 cols, buttons)             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │  │
│  │  │ Voir     │  │ Lire     │  │ Téléch.  │                  │  │
│  │  │ Protocole│  │ Analyse  │  │ PDF      │                  │  │
│  │  └──────────┘  └──────────┘  └──────────┘                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Dimensions Section**:
- Score global: Height 180px, max-width 600px, centré
- 3 radars: Grid 3 cols (chaque radar 320x320px)
- Alertes: Grid 1 col, chaque card min-height 80px
- Actions rapides: Grid 3 cols, buttons height 48px

**Couleurs Alertes**:
- Critique (rouge): `#EF4444` + background `rgba(239,68,68,0.1)`
- Attention (orange): `#F59E0B` + background `rgba(245,158,11,0.1)`
- Info (bleu): `theme.primaryBlue` + background `rgba(2,121,232,0.1)`

---

### 5.3 Tab: Biomarkers

```
┌─────────────────────────────────────────────────────────────────────┐
│ BIOMARKERS TAB                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ FILTER BAR (h: 60px, flex, gap: 16px)                       │  │
│  │  [Tous] [Hormones] [Thyroïde] [Métabolisme] ... [Search🔍] │  │
│  │   ^active   ^inactive                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ BIOMARKER GRID (grid 3 cols desktop, 1 col mobile, gap: 16px│  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ Testostérone│  │ SHBG        │  │ Estradiol   │        │  │
│  │  │ ────────────│  │ ────────────│  │ ────────────│        │  │
│  │  │ 420 ng/dL   │  │ 35 nmol/L   │  │ 28 pg/mL    │        │  │
│  │  │ [●──────○]  │  │ [───●───○]  │  │ [──●────○]  │        │  │
│  │  │ 30% sous ⬇️  │  │ Normal ✓    │  │ Optimal ✓   │        │  │
│  │  │             │  │             │  │             │        │  │
│  │  │ [Voir +]    │  │ [Voir +]    │  │ [Voir +]    │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ LH          │  │ FSH         │  │ Cortisol    │        │  │
│  │  │ ...         │  │ ...         │  │ ...         │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  │                                                              │  │
│  │  ... (repeat for all 39 markers)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Card Compact (dimensions)**:
- Width: calc((100% - 32px) / 3) → 3 colonnes desktop
- Height: auto (min 180px)
- Padding: 16px
- Border: 1px + border-left 2px (couleur selon status)

**Card Content**:
1. **Header** (flex justify-between):
   - Nom marqueur (text-sm font-semibold)
   - Badge status (optimal/normal/suboptimal/critical)
2. **Value** (text-2xl font-bold, color selon status)
3. **Range indicator** (barre visuelle avec dot position)
4. **Delta** (text-sm, icône + couleur):
   - 🔻 "30% sous" (orange)
   - ✅ "Optimal" (vert)
5. **Button "Voir +"** (text-xs, hover → modal)

**Modal détails** (triggered by "Voir +"):
- See section 5.4 below

---

### 5.4 Modal: Biomarker Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│ MODAL (w: 900px, max-h: 90vh, overflow-y: scroll)                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ HEADER (h: 64px, flex justify-between, border-bottom)      │   │
│  │  ┌──────────────────────────┬──────────┐                   │   │
│  │  │ Testostérone Totale      │ [Close X]│                   │   │
│  │  │ 420 ng/dL (Cible: 600-900)│         │                   │   │
│  │  └──────────────────────────┴──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ STATUS BAR (h: 80px, colored bg selon status)              │   │
│  │  ⚠️ CRITIQUE: 30% sous l'optimal                           │   │
│  │  Top 25% (hommes 32 ans)                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TABS (3 tabs: Définition / Impact / Protocole)             │   │
│  │  [Définition] [Impact] [Protocole]                         │   │
│  │   ^active                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ TAB CONTENT: Définition (2000-3000 mots)                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ ## C'est quoi exactement?                            │  │   │
│  │  │                                                        │  │   │
│  │  │ La testostérone totale mesure l'ensemble de la       │  │   │
│  │  │ testostérone circulante dans le sang, incluant la    │  │   │
│  │  │ fraction liée aux protéines (SHBG, albumine) et la   │  │   │
│  │  │ fraction libre (2-3%). C'est l'hormone anabolique    │  │   │
│  │  │ principale chez l'homme, produite à 95% par les      │  │   │
│  │  │ cellules de Leydig des testicules sous l'impulsion   │  │   │
│  │  │ de la LH (hormone lutéinisante) hypophysaire...      │  │   │
│  │  │                                                        │  │   │
│  │  │ [200-300 words paragraph 1]                          │  │   │
│  │  │ [200-300 words paragraph 2]                          │  │   │
│  │  │ [200-300 words paragraph 3]                          │  │   │
│  │  │                                                        │  │   │
│  │  │ ## Pourquoi c'est important?                         │  │   │
│  │  │ [300-400 words]                                      │  │   │
│  │  │                                                        │  │   │
│  │  │ ## Contexte clinique                                 │  │   │
│  │  │ [200-300 words]                                      │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Modal Tabs**:

1. **Définition** (2000-3000 mots):
   - C'est quoi exactement? (200-300 words)
   - Mécanisme physiologique (300-400 words)
   - Contexte clinique (200-300 words)
   - Causes de déficit (200-300 words)
   - Variation selon âge/sexe/BMI (200-300 words)
   - Études clés (citations) (100-200 words)

2. **Impact** (2000-3000 mots):
   - Performance (500-600 words):
     - Hypertrophie musculaire
     - Force maximale
     - Récupération
     - Composition corporelle
   - Santé (500-600 words):
     - Libido et fertilité
     - Énergie et humeur
     - Cognition et mémoire
     - Santé osseuse
   - Long-terme (500-600 words):
     - Risques cardiovasculaires
     - Syndrome métabolique
     - Espérance de vie
   - Études (300-400 words): 5-10 références avec DOI

3. **Protocole** (2000-3000 mots):
   - Phase 1: Lifestyle 0-30d (600-800 words):
     - Sommeil (quantité, qualité, horaires)
     - Entraînement (type, volume, intensité)
     - Nutrition (calories, macros, timing)
     - Stress management
     - Alcool et toxiques
   - Phase 2: Suppléments 30-90d (600-800 words):
     - Zinc (dosage, timing, brand, études)
     - Magnésium (dosage, timing, brand, études)
     - Vitamine D (dosage, timing, brand, études)
     - Ashwagandha (dosage, timing, brand, études)
     - Autres (boron, tongkat ali, etc.)
   - Phase 3: Retest 90d+ (200-300 words):
     - Quand retester
     - Marqueurs associés à revoir
     - Critères de succès
   - Cas particuliers (200-300 words):
     - Si lifestyle optimal mais toujours bas → TRT?
     - Contre-indications
     - Red flags

**Typographie Modal**:
- H2 (##): text-xl font-bold mb-4
- H3 (###): text-lg font-semibold mb-3
- Paragraph: text-sm leading-relaxed mb-4
- Bold: font-semibold
- Links: underline hover
- Lists: ml-6 list-disc

---

### 5.5 Tab: Analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│ ANALYSIS TAB                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SUB-TABS (3 tabs: Systems / Patterns / Correlations)        │  │
│  │  [Systems] [Patterns] [Correlations]                        │  │
│  │   ^active                                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SUB-TAB CONTENT: Systems (AI analysis parsed)               │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Système Hormonal (Score: 65/100)                  │  │  │
│  │  │                                                        │  │  │
│  │  │ Ton profil hormonal révèle 3 faiblesses majeures:    │  │  │
│  │  │                                                        │  │  │
│  │  │ 1. **Testostérone basse** (420 ng/dL, -30%)          │  │  │
│  │  │    La production endogène est limitée. Causes        │  │  │
│  │  │    probables: sommeil <6h (cortisol élevé inhibe     │  │  │
│  │  │    LH), déficit calorique chronique, stress...       │  │  │
│  │  │                                                        │  │  │
│  │  │ 2. **SHBG élevée** (55 nmol/L, +25%)                 │  │  │
│  │  │    Séquestre trop de testostérone libre. Liée à      │  │  │
│  │  │    faible apport lipides (<0.8g/kg)...               │  │  │
│  │  │                                                        │  │  │
│  │  │ 3. **Ratio T/E2** suboptimal (15:1, cible 20:1)      │  │  │
│  │  │    Aromatisation excessive, probablement due à       │  │  │
│  │  │    surpoids (20% body fat)...                        │  │  │
│  │  │                                                        │  │  │
│  │  │ [300-500 words par système]                          │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Système Thyroïde (Score: 78/100)                  │  │  │
│  │  │ [300-500 words]                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Système Métabolique (Score: 72/100)               │  │  │
│  │  │ [300-500 words]                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ... (6 systèmes total)                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Sub-tab: Patterns**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SUB-TAB CONTENT: Patterns (AI analysis parsed)              │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Pattern #1: Anabolisme freiné                     │  │  │
│  │  │                                                        │  │  │
│  │  │ **Marqueurs impliqués**:                              │  │  │
│  │  │ • Testostérone (-30%)                                 │  │  │
│  │  │ • IGF-1 (-15%)                                        │  │  │
│  │  │ • Cortisol (+22%)                                     │  │  │
│  │  │                                                        │  │  │
│  │  │ **Analyse**:                                          │  │  │
│  │  │ Ces 3 marqueurs convergent vers un profil catabolique.│  │  │
│  │  │ Le cortisol élevé (stress chronique + manque sommeil) │  │  │
│  │  │ inhibe l'axe HPG (hypothalamus → LH → testostérone).  │  │  │
│  │  │ En parallèle, IGF-1 bas suggère résistance GH ou      │  │  │
│  │  │ déficit calorique chronique...                        │  │  │
│  │  │                                                        │  │  │
│  │  │ **Impact**:                                           │  │  │
│  │  │ • Hypertrophie ralentie (-40% vs optimal)            │  │  │
│  │  │ • Récupération prolongée (+30% temps)                │  │  │
│  │  │ • Risque catabolisme musculaire                      │  │  │
│  │  │                                                        │  │  │
│  │  │ **Action prioritaire**:                               │  │  │
│  │  │ 1. Sommeil 7h30-8h30 pour baisser cortisol           │  │  │
│  │  │ 2. Calories +200-300 kcal pour relancer IGF-1        │  │  │
│  │  │ 3. Deload training pour réduire stress physiologique │  │  │
│  │  │                                                        │  │  │
│  │  │ [400-600 words par pattern]                          │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Pattern #2: Résistance insuline                   │  │  │
│  │  │ [400-600 words]                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ... (3-5 patterns total)                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Sub-tab: Correlations**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SUB-TAB CONTENT: Correlations (Lifestyle × Biomarkers)      │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Corrélation #1: Sommeil → Cortisol                   │  │  │
│  │  │ ────────────────────────────────────────────────────  │  │  │
│  │  │                                                        │  │  │
│  │  │ Ton profil: Sommeil <6h/nuit                          │  │  │
│  │  │ Résultat: Cortisol 18.5 μg/dL (+22% vs optimal)      │  │  │
│  │  │                                                        │  │  │
│  │  │ **Corrélation forte** (confidence: high)              │  │  │
│  │  │ Manque chronique de sommeil → Élévation cortisol      │  │  │
│  │  │ matinal persistant (HPA axis dysregulation)           │  │  │
│  │  │                                                        │  │  │
│  │  │ **Recommendation**:                                   │  │  │
│  │  │ Passer à 7h30-8h minimum/nuit, horaires fixes        │  │  │
│  │  │ (coucher 22h-23h, réveil 6h30-7h30)                  │  │  │
│  │  │                                                        │  │  │
│  │  │ **Impact attendu**:                                   │  │  │
│  │  │ -15-20% cortisol en 4-6 semaines                     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Corrélation #2: Entraînement → Testostérone         │  │  │
│  │  │ [Similar structure]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ... (5-10 correlations total)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5.6 Tab: Protocol

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROTOCOL TAB                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ TIMELINE (3 phases horizontales)                             │  │
│  │                                                              │  │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐          │  │
│  │  │ PHASE 1  │─────▶│ PHASE 2  │─────▶│ PHASE 3  │          │  │
│  │  │ 0-30d    │      │ 30-90d   │      │ 90d+     │          │  │
│  │  │ Lifestyle│      │Suppléments│      │ Retest   │          │  │
│  │  └──────────┘      └──────────┘      └──────────┘          │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PHASE 1: Lifestyle (0-30 jours) - PRIORITÉ                  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ 🔴 PRIORITÉ #1: Sommeil                              │  │  │
│  │  │ ────────────────────────────────────────────────────  │  │  │
│  │  │ • 7h30-8h minimum/nuit (actuellement <6h)            │  │  │
│  │  │ • Horaires fixes: coucher 22h-23h, réveil 6h30-7h30 │  │  │
│  │  │ • Chambre: <19°C, noir total, sans écrans 1h avant  │  │  │
│  │  │ • Magnésium bisglycinate 400mg 1h avant coucher     │  │  │
│  │  │                                                        │  │  │
│  │  │ **Marqueurs impactés**:                               │  │  │
│  │  │ • Cortisol: -15-20% attendu en 4-6 semaines         │  │  │
│  │  │ • Testostérone: +10-15% indirect                     │  │  │
│  │  │ • IGF-1: +8-12% via GH nocturne                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ 🟠 PRIORITÉ #2: Nutrition                            │  │  │
│  │  │ ────────────────────────────────────────────────────  │  │  │
│  │  │ • Calories: +200-300 kcal (passer de déficit à      │  │  │
│  │  │   maintenance pour relancer IGF-1)                   │  │  │
│  │  │ • Lipides: 1-1.2g/kg (actuellement <0.8g/kg)         │  │  │
│  │  │   → Soutenir production testostérone                 │  │  │
│  │  │ • Protéines: 2-2.2g/kg maintenu                      │  │  │
│  │  │ • Glucides: Timing peri-workout pour sensibilité     │  │  │
│  │  │   insuline                                           │  │  │
│  │  │                                                        │  │  │
│  │  │ **Marqueurs impactés**:                               │  │  │
│  │  │ • IGF-1: +15-20% en 6-8 semaines                     │  │  │
│  │  │ • Testostérone: +8-12% via lipides                   │  │  │
│  │  │ • SHBG: -10-15% (libère T libre)                     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ 🟡 PRIORITÉ #3: Entraînement                         │  │  │
│  │  │ [Similar structure]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PHASE 2: Suppléments (30-90 jours)                          │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ SUPPLEMENTS TABLE                                    │  │  │
│  │  │ ┌────────┬────────┬────────┬────────┬──────────────┐│  │  │
│  │  │ │ Nom    │ Dosage │ Timing │ Brand  │ Marqueurs    ││  │  │
│  │  │ ├────────┼────────┼────────┼────────┼──────────────┤│  │  │
│  │  │ │ Zinc   │ 30mg/j │ Soir   │ Thorne │ Testostérone ││  │  │
│  │  │ │        │        │ repas  │        │ SHBG, Immune ││  │  │
│  │  │ ├────────┼────────┼────────┼────────┼──────────────┤│  │  │
│  │  │ │ Vit D3 │ 5000UI │ Matin  │ NOW    │ Testostérone ││  │  │
│  │  │ │        │ /jour  │ repas  │ Foods  │ Immune, Os   ││  │  │
│  │  │ ├────────┼────────┼────────┼────────┼──────────────┤│  │  │
│  │  │ │ Ashwa- │ 600mg  │ Soir   │ KSM-66 │ Cortisol,    ││  │  │
│  │  │ │ gandha │ /jour  │        │        │ Testostérone ││  │  │
│  │  │ ├────────┼────────┼────────┼────────┼──────────────┤│  │  │
│  │  │ │ Mag.   │ 400mg  │ 1h pré │ Doctor │ Sommeil,     ││  │  │
│  │  │ │ Bisgly │ /jour  │ coucher│ Best   │ Cortisol     ││  │  │
│  │  │ └────────┴────────┴────────┴────────┴──────────────┘│  │  │
│  │  │                                                        │  │  │
│  │  │ **Budget total**: ~60-80€/mois                        │  │  │
│  │  │ **Études clés**: [Links to 5-10 studies]             │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PHASE 3: Retest (90 jours+)                                  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ • Refaire prise de sang complète à J+90              │  │  │
│  │  │ • Marqueurs prioritaires:                             │  │  │
│  │  │   - Testostérone (cible: 600-900 ng/dL)              │  │  │
│  │  │   - Cortisol (cible: <15 μg/dL)                      │  │  │
│  │  │   - Vitamine D (cible: 40-60 ng/mL)                  │  │  │
│  │  │ • Si amélioration <20%: envisager investigation      │  │  │
│  │  │   endocrinienne (échographie testiculaire, IRM       │  │  │
│  │  │   hypophyse, prolactine approfondie)                 │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5.7 Tab: Trends (Placeholder v2)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TRENDS TAB                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │                    [Icon: TrendingUp]                        │  │
│  │                                                              │  │
│  │              Suivi dans le temps - Bientôt disponible        │  │
│  │                                                              │  │
│  │  Cette fonctionnalité te permettra de:                      │  │
│  │  • Comparer tes analyses successives                        │  │
│  │  • Visualiser l'évolution de chaque marqueur               │  │
│  │  • Tracker l'efficacité du protocole                       │  │
│  │  • Identifier tendances long-terme                         │  │
│  │                                                              │  │
│  │  [Bouton: Être notifié du lancement]                       │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5.8 Tab: Sources

```
┌─────────────────────────────────────────────────────────────────────┐
│ SOURCES TAB                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ CITATIONS PAR PANEL                                          │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Hormones (12 références)                          │  │  │
│  │  │                                                        │  │  │
│  │  │ 1. Bassil N et al. (2009). "The benefits and risks   │  │  │
│  │  │    of testosterone replacement therapy"               │  │  │
│  │  │    Ther Clin Risk Manag. 5:427-448.                  │  │  │
│  │  │    https://doi.org/10.2147/TCRM.S3025                │  │  │
│  │  │                                                        │  │  │
│  │  │ 2. Travison TG et al. (2017). "The relationship      │  │  │
│  │  │    between testosterone and cardiovascular risk"      │  │  │
│  │  │    Eur Heart J. 38(33):2467-2474.                    │  │  │
│  │  │    https://doi.org/10.1093/eurheartj/ehx112          │  │  │
│  │  │                                                        │  │  │
│  │  │ ... (10 more citations)                              │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ ## Thyroïde (8 références)                           │  │  │
│  │  │ [Similar structure]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ... (6 panels total, 40-60 citations au total)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. ALGORITHMES DE CALCUL

### 6.1 Score Calculation

**Principe**: Chaque biomarqueur reçoit un score 0-100 basé sur son status.

```typescript
// Fonction principale
function calculateMarkerScore(marker: BloodMarker): number {
  const statusScores = {
    optimal: 100,
    normal: 80,
    suboptimal: 55,
    critical: 30,
  };

  return statusScores[marker.status];
}

// Exemple
const testosteroneMarker = {
  code: "testosterone_total",
  value: 420,
  status: "critical", // Déterminé par ranges
};
// Score = 30

const hdlMarker = {
  code: "hdl",
  value: 55,
  status: "optimal",
};
// Score = 100
```

**Score par panel**:

```typescript
function calculatePanelScore(markers: BloodMarker[], panel: PanelKey): number {
  const panelMarkers = markers.filter((m) => m.panel === panel);

  if (panelMarkers.length === 0) return 0;

  const totalScore = panelMarkers.reduce((sum, m) => {
    return sum + calculateMarkerScore(m);
  }, 0);

  return Math.round(totalScore / panelMarkers.length);
}

// Exemple: Panel Hormonal avec 8 marqueurs
// Testostérone: 30, SHBG: 80, Estradiol: 100, LH: 80,
// FSH: 80, Cortisol: 55, IGF-1: 55, DHEA-S: 80
// Total: 560 / 8 = 70

const hormonalScore = calculatePanelScore(markers, "hormonal");
// = 70
```

**Score global** (pondéré):

```typescript
function calculateGlobalScore(markers: BloodMarker[]): number {
  // Poids par panel (total = 1.0)
  const panelWeights: Record<PanelKey, number> = {
    hormonal: 0.25, // 25% - Le plus important pour perfs
    metabolic: 0.20, // 20% - Critique pour santé long-terme
    thyroid: 0.15, // 15% - Important pour métabolisme
    inflammatory: 0.15, // 15% - Récupération et santé
    vitamins: 0.15, // 15% - Fondations
    liver_kidney: 0.10, // 10% - Moins prioritaire si sain
  };

  let weightedSum = 0;
  let totalWeight = 0;

  (Object.keys(panelWeights) as PanelKey[]).forEach((panel) => {
    const panelScore = calculatePanelScore(markers, panel);
    if (panelScore > 0) {
      weightedSum += panelScore * panelWeights[panel];
      totalWeight += panelWeights[panel];
    }
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// Exemple avec scores panels:
// Hormonal: 70 (×0.25 = 17.5)
// Metabolic: 80 (×0.20 = 16.0)
// Thyroid: 85 (×0.15 = 12.75)
// Inflammatory: 75 (×0.15 = 11.25)
// Vitamins: 65 (×0.15 = 9.75)
// Liver/Kidney: 90 (×0.10 = 9.0)
// Total: 76.25 → 76

const globalScore = calculateGlobalScore(markers);
// = 76
```

---

### 6.2 Percentile Ranking

**Principe**: Compare valeur patient vs population référence (par âge, sexe, BMI).

```typescript
// Données de référence (simplifiées - en réalité plus granulaires)
interface ReferenceData {
  ageRanges: {
    min: number;
    max: number;
    sex: "male" | "female";
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  }[];
}

const TESTOSTERONE_REFERENCE: ReferenceData = {
  ageRanges: [
    {
      min: 20,
      max: 29,
      sex: "male",
      percentiles: { p10: 350, p25: 450, p50: 550, p75: 700, p90: 850 },
    },
    {
      min: 30,
      max: 39,
      sex: "male",
      percentiles: { p10: 320, p25: 420, p50: 520, p75: 650, p90: 800 },
    },
    // ... autres tranches d'âge
  ],
};

function calculatePercentile(
  markerCode: string,
  value: number,
  age: number,
  sex: "male" | "female"
): number | null {
  const refData = getReference(markerCode);
  if (!refData) return null;

  // Trouver la tranche d'âge appropriée
  const ageRange = refData.ageRanges.find(
    (r) => age >= r.min && age <= r.max && r.sex === sex
  );

  if (!ageRange) return null;

  const { percentiles } = ageRange;

  // Interpolation linéaire entre percentiles
  if (value <= percentiles.p10) return 10;
  if (value <= percentiles.p25) {
    return interpolate(value, percentiles.p10, percentiles.p25, 10, 25);
  }
  if (value <= percentiles.p50) {
    return interpolate(value, percentiles.p25, percentiles.p50, 25, 50);
  }
  if (value <= percentiles.p75) {
    return interpolate(value, percentiles.p50, percentiles.p75, 50, 75);
  }
  if (value <= percentiles.p90) {
    return interpolate(value, percentiles.p75, percentiles.p90, 75, 90);
  }
  return 90; // Au-dessus du 90e percentile
}

function interpolate(
  value: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number
): number {
  return Math.round(y1 + ((value - x1) * (y2 - y1)) / (x2 - x1));
}

// Exemple: Testostérone 420 ng/dL, homme 32 ans
const percentile = calculatePercentile("testosterone_total", 420, 32, "male");
// 420 est entre p25 (420) et p50 (520)
// Percentile = 25 + (420-420)/(520-420) * (50-25) = 25
// → Top 75% (100 - 25 = 75)
```

---

### 6.3 Derived Metrics

**Anabolic Index** (0-100):

```typescript
function calculateAnabolicIndex(markers: BloodMarker[]): number | null {
  const testosterone = markers.find((m) => m.code === "testosterone_total");
  const igf1 = markers.find((m) => m.code === "igf1");
  const cortisol = markers.find((m) => m.code === "cortisol");
  const shbg = markers.find((m) => m.code === "shbg");

  if (!testosterone || !igf1 || !cortisol) return null;

  // Formule pondérée
  const tScore = calculateMarkerScore(testosterone) * 0.40; // 40% du poids
  const igf1Score = calculateMarkerScore(igf1) * 0.30; // 30%
  const cortisolScore = calculateMarkerScore(cortisol) * 0.20; // 20%
  const shbgScore = shbg ? calculateMarkerScore(shbg) * 0.10 : 0; // 10%

  return Math.round(tScore + igf1Score + cortisolScore + shbgScore);
}

// Exemple:
// Testostérone: 420 ng/dL (critical) → 30 × 0.40 = 12
// IGF-1: 180 ng/mL (suboptimal) → 55 × 0.30 = 16.5
// Cortisol: 18.5 μg/dL (suboptimal) → 55 × 0.20 = 11
// SHBG: 55 nmol/L (suboptimal) → 55 × 0.10 = 5.5
// Total: 12 + 16.5 + 11 + 5.5 = 45 → Index anabolique faible
```

**Recomp Readiness** (0-100):

```typescript
function calculateRecompReadiness(markers: BloodMarker[]): number | null {
  const glycemia = markers.find((m) => m.code === "glycemia_fasting");
  const homa_ir = markers.find((m) => m.code === "homa_ir");
  const testosterone = markers.find((m) => m.code === "testosterone_total");
  const tsh = markers.find((m) => m.code === "tsh");

  if (!glycemia || !testosterone) return null;

  // Formule
  const glycemiaScore = calculateMarkerScore(glycemia) * 0.30; // 30%
  const homaScore = homa_ir ? calculateMarkerScore(homa_ir) * 0.25 : 0; // 25%
  const tScore = calculateMarkerScore(testosterone) * 0.25; // 25%
  const tshScore = tsh ? calculateMarkerScore(tsh) * 0.20 : 0; // 20%

  return Math.round(glycemiaScore + homaScore + tScore + tshScore);
}

// Exemple:
// Glycémie: 95 mg/dL (optimal) → 100 × 0.30 = 30
// HOMA-IR: 1.8 (normal) → 80 × 0.25 = 20
// Testostérone: 420 ng/dL (critical) → 30 × 0.25 = 7.5
// TSH: 2.2 mIU/L (optimal) → 100 × 0.20 = 20
// Total: 30 + 20 + 7.5 + 20 = 77.5 → Bonne aptitude recomp
// (mais limité par testostérone basse)
```

**Diabetes Risk** (0-100, higher = worse):

```typescript
function calculateDiabetesRisk(markers: BloodMarker[]): {
  score: number;
  level: "low" | "moderate" | "high" | "very_high";
} {
  const glycemia = markers.find((m) => m.code === "glycemia_fasting");
  const hba1c = markers.find((m) => m.code === "hba1c");
  const homa_ir = markers.find((m) => m.code === "homa_ir");
  const triglycerides = markers.find((m) => m.code === "triglycerides");
  const hdl = markers.find((m) => m.code === "hdl");

  // Score inversé (optimal = 0 points, critical = 100 points)
  let riskPoints = 0;

  if (glycemia) {
    const invScore = 100 - calculateMarkerScore(glycemia);
    riskPoints += invScore * 0.30; // 30% du poids
  }

  if (hba1c) {
    const invScore = 100 - calculateMarkerScore(hba1c);
    riskPoints += invScore * 0.25; // 25%
  }

  if (homa_ir) {
    const invScore = 100 - calculateMarkerScore(homa_ir);
    riskPoints += invScore * 0.25; // 25%
  }

  // Ratio TG/HDL (si disponibles)
  if (triglycerides && hdl) {
    const ratio = triglycerides.value / hdl.value;
    let ratioScore = 0;
    if (ratio < 1.0) ratioScore = 0; // Excellent
    else if (ratio < 2.0) ratioScore = 20; // Bon
    else if (ratio < 3.0) ratioScore = 50; // Moyen
    else ratioScore = 100; // Mauvais
    riskPoints += ratioScore * 0.20; // 20%
  }

  const finalScore = Math.round(riskPoints);

  // Déterminer le niveau de risque
  let level: "low" | "moderate" | "high" | "very_high";
  if (finalScore < 25) level = "low";
  else if (finalScore < 50) level = "moderate";
  else if (finalScore < 75) level = "high";
  else level = "very_high";

  return { score: finalScore, level };
}

// Exemple:
// Glycémie: 105 mg/dL (suboptimal) → inv = 45 × 0.30 = 13.5
// HbA1c: 5.8% (normal) → inv = 20 × 0.25 = 5
// HOMA-IR: 2.5 (suboptimal) → inv = 45 × 0.25 = 11.25
// TG/HDL: 120/50 = 2.4 → score 50 × 0.20 = 10
// Total: 13.5 + 5 + 11.25 + 10 = 39.75 → 40 (moderate risk)
```

---

## 7. MOTEUR RÉDACTIONNEL

### 7.1 Contenu Biomarqueurs (2000-3000 mots)

**Structure fichier** `bloodBiomarkerDetailsExtended.ts`:

```typescript
export interface BiomarkerDetailExtended {
  // Section 1: DÉFINITION (700-900 words total)
  definition: {
    intro: string; // 200-300 words - C'est quoi exactement
    mechanism: string; // 200-300 words - Mécanisme physiologique
    clinical: string; // 200-300 words - Contexte clinique
    ranges: {
      optimal: string;
      normal: string;
      suboptimal: string;
      critical: string;
      interpretation: string; // Explication des ranges
    };
    variations: string; // 100-200 words - Variations âge/sexe/BMI
    studies: string[]; // 3-5 citations clés
  };

  // Section 2: IMPACT (800-1000 words total)
  impact: {
    performance: {
      // 250-350 words
      hypertrophy: string;
      strength: string;
      recovery: string;
      bodyComp: string;
    };
    health: {
      // 250-350 words
      energy: string;
      mood: string;
      cognition: string;
      immunity: string;
    };
    longTerm: {
      // 250-350 words
      cardiovascular: string;
      metabolic: string;
      lifespan: string;
    };
    studies: string[]; // 5-10 citations
  };

  // Section 3: PROTOCOLE (800-1200 words total)
  protocol: {
    // Phase 1: Lifestyle (300-400 words)
    phase1_lifestyle: {
      duration: string; // "0-30 jours"
      sleep: string; // Quantité, qualité, horaires
      nutrition: string; // Calories, macros, timing
      training: string; // Type, volume, intensité
      stress: string; // Management techniques
      alcohol: string; // Limites
      expected_impact: string; // Résultats attendus
    };

    // Phase 2: Suppléments (300-500 words)
    phase2_supplements: {
      duration: string; // "30-90 jours"
      supplements: Array<{
        name: string;
        dosage: string;
        timing: string;
        brand: string;
        mechanism: string; // Comment ça marche
        studies: string[]; // Citations
      }>;
      budget: string; // Coût mensuel estimé
      expected_impact: string;
    };

    // Phase 3: Retest (100-200 words)
    phase3_retest: {
      duration: string; // "90 jours+"
      when: string; // Quand retester
      markers: string[]; // Marqueurs à retester
      success_criteria: string; // Comment évaluer succès
      next_steps: string; // Si amélioration insuffisante
    };

    // Cas particuliers (100-200 words)
    special_cases: {
      non_responders: string; // Si lifestyle optimal mais toujours bas
      contraindications: string;
      red_flags: string; // Quand consulter spécialiste
    };
  };
}
```

**Exemple complet: Testostérone Totale**

```typescript
export const TESTOSTERONE_TOTAL_EXTENDED: BiomarkerDetailExtended = {
  definition: {
    intro: `La testostérone totale mesure l'ensemble de la testostérone circulante dans le sang, incluant la fraction liée aux protéines de transport (SHBG et albumine, ~97-98%) et la fraction libre biologiquement active (~2-3%).

C'est l'hormone anabolique principale chez l'homme, produite à 95% par les cellules de Leydig des testicules sous l'impulsion de la LH (hormone lutéinisante) hypophysaire, elle-même régulée par la GnRH hypothalamique (axe HPG). Les 5% restants proviennent des glandes surrénales via la conversion de précurseurs comme la DHEA.

Chez la femme, la testostérone est produite à 25% par les ovaires, 25% par les surrénales, et 50% par conversion périphérique d'androgènes précurseurs. Les niveaux sont 10-20× plus faibles que chez l'homme mais jouent un rôle crucial dans la libido, la masse musculaire et la densité osseuse.

La testostérone circule principalement liée à la SHBG (60-70%), à l'albumine (30-38%), et sous forme libre (2-3%). Seules les fractions libre et liée à l'albumine (dite "biodisponible") sont capables d'interagir avec les récepteurs androgéniques (AR) des tissus cibles.`,

    mechanism: `La synthèse de testostérone suit la voie stéroïdogénique classique: cholestérol → prégnénolone → 17-hydroxypregnénolone → DHEA → androstènedione → testostérone. Cette cascade enzymatique implique CYP11A1, 3β-HSD, CYP17A1 et 17β-HSD.

La LH hypophysaire stimule les cellules de Leydig via le récepteur LH/CGR couplé aux protéines G, déclenchant la cascade AMPc → PKA → StAR (Steroidogenic Acute Regulatory protein) qui permet l'import de cholestérol dans les mitochondries, étape limitante de la stéroïdogenèse.

Une fois sécrétée, la testostérone exerce ses effets via liaison au récepteur androgénique (AR), récepteur nucléaire qui, une fois activé, se dimérise et transloque dans le noyau pour réguler la transcription de gènes cibles (croissance musculaire, libido, érythropoïèse, etc.).

Dans certains tissus (prostate, peau, follicules pileux), la testostérone est convertie en DHT (dihydrotestostérone) par la 5α-réductase, forme 2-3× plus puissante sur les AR. Inversement, l'enzyme aromatase peut la convertir en estradiol, notamment dans le tissu adipeux, expliquant pourquoi l'obésité s'associe à une testostérone basse et un estradiol élevé chez l'homme.`,

    clinical: `En clinique, la testostérone totale est le marqueur de première ligne pour évaluer l'hypogonadisme masculin. Valeurs de référence laboratoire classiques: 300-1000 ng/dL (10.4-34.7 nmol/L), mais ces ranges très larges masquent d'importantes variations selon l'âge.

Un homme de 25 ans avec 400 ng/dL est techniquement "dans la norme" mais se situe au niveau moyen d'un homme de 80 ans. Les guidelines endocrinologiques actuelles (Endocrine Society 2018) définissent l'hypogonadisme à <300 ng/dL + symptômes, mais de nombreux experts recommandent une cible >500-600 ng/dL pour perfs optimales chez l'homme jeune actif.

Causes principales de testostérone basse:
- **Hypogonadisme primaire** (testiculaire): Syndrome de Klinefelter, orchite, trauma, chimiothérapie
- **Hypogonadisme secondaire** (hypophysaire/hypothalamique): Adénome hypophysaire, hyperprolactinémie, syndrome de Kallmann
- **Hypogonadisme fonctionnel** (le plus fréquent chez l'athlète): Privation sommeil, stress chronique, déficit calorique, surentraînement, obésité

Le diagnostic nécessite 2 dosages matinaux à jeun (testostérone suit rythme circadien avec pic matinal). Associer dosage LH/FSH pour distinguer hypogonadisme primaire (LH/FSH élevées) vs secondaire (LH/FSH basses/normales).`,

    ranges: {
      optimal: "600-900 ng/dL (20.8-31.2 nmol/L)",
      normal: "400-599 ng/dL (13.9-20.7 nmol/L)",
      suboptimal: "300-399 ng/dL (10.4-13.8 nmol/L)",
      critical: "<300 ng/dL (<10.4 nmol/L)",
      interpretation: `**Optimal (600-900)**: Zone performante pour hypertrophie, force, libido, énergie. Permet anabolisme maximal sans risques associés à niveaux supraphysiologiques.

**Normal (400-599)**: Suffisant pour santé générale mais sous-optimal pour perfs. Hypertrophie ralentie, récupération limitée, libido moyenne.

**Suboptimal (300-399)**: Hypogonadisme borderline. Symptômes légers: fatigue, baisse libido, difficulté prendre muscle, accumulation graisse abdominale.

**Critical (<300)**: Hypogonadisme clinique. Symptômes francs: fatigue chronique, dépression, perte musculaire, dysfonction érectile, risque ostéoporose. Investigation endocrinienne urgente requise.`,
    },

    variations: `La testostérone décline physiologiquement avec l'âge: -1-2%/an après 30 ans. Niveaux moyens par décennie (hommes):
- 20-29 ans: 600-700 ng/dL
- 30-39 ans: 550-650 ng/dL
- 40-49 ans: 500-600 ng/dL
- 50-59 ans: 450-550 ng/dL
- 60-69 ans: 400-500 ng/dL
- 70+ ans: 300-450 ng/dL

Variation circadienne: pic matinal (6-8h) puis déclin -30% en soirée. Importance de doser le matin.

Impact BMI: obésité s'associe à testostérone basse via aromatisation accrue (graisse viscérale = activité aromatase élevée). Perte 10kg peut ↑ testostérone +100-150 ng/dL.

Facteurs lifestyle: manque sommeil (-15% si <5h/nuit), alcool régulier (-20%), stress chronique (cortisol ↑ inhibe LH), déficit calorique >20% (-25-30%).`,

    studies: [
      "Travison TG et al. (2017). Harmonized reference ranges for circulating testosterone levels in men of four cohort studies. J Clin Endocrinol Metab. 102(4):1161-1173.",
      "Bassil N et al. (2009). The benefits and risks of testosterone replacement therapy. Ther Clin Risk Manag. 5:427-448.",
      "Corona G et al. (2016). Body weight loss reverts obesity-associated hypogonadotropic hypogonadism: a systematic review and meta-analysis. Eur J Endocrinol. 174(5):R191-R206.",
    ],
  },

  impact: {
    performance: {
      hypertrophy: `La testostérone est l'hormone anabolique #1 pour l'hypertrophie musculaire. Elle agit via 3 mécanismes: (1) activation satellite cells → prolifération myonuclei, (2) stimulation synthèse protéique via mTOR pathway, (3) inhibition myostatine (régulateur négatif croissance).

Études montrent corrélation forte entre testostérone et gains masse maigre: différence +40-50% hypertrophie entre sujets testostérone haute (>700 ng/dL) vs basse (<400 ng/dL) à entraînement égal (Bhasin et al. 2001).

Testostérone basse → difficulté progresser en volume musculaire malgré entraînement optimal. Sujets hypogonadiques (<300 ng/dL) gagnent 60% moins de masse maigre que contrôles sur 12 semaines programme résistance (Sinha-Hikim et al. 2002).`,

      strength: `Impact direct sur force maximale via augmentation taille fibres Type II (fast-twitch), densité récepteurs androgéniques dans muscle, et optimisation recrutement neural.

Corrélation testostérone et 1RM squat/bench press: +10% testostérone = +3-5% force maximale (Schroeder et al. 2013). Sujets testostérone >650 ng/dL montrent +15-20% force vs sujets <400 ng/dL à masse musculaire équivalente.

Testostérone basse → stagnation charges, difficulté battre PRs, perte force relative malgré maintien masse. Red flag si régression force sans explication évidente (fatigue, blessure, désentraînement).`,

      recovery: `Testostérone accélère récupération post-training via: (1) stimulation synthèse protéique post-effort, (2) action anti-catabolique (contre cortisol), (3) amélioration sommeil profond (pic GH), (4) réduction inflammation (modulation cytokines).

Études: sujets testostérone haute récupèrent 30-40% plus vite (retour force baseline à 24h vs 48-72h). Testostérone basse → DOMS prolongés, fatigue persistante, besoin 3-4 jours entre sessions lourdes.

Impact pratique: testostérone >600 ng/dL permet 4-5 séances/semaine haute intensité. <400 ng/dL limite à 2-3 séances/semaine, sinon surentraînement.`,

      bodyComp: `Testostérone favorise partition nutriments vers muscle plutôt que graisse. Stimule lipolyse (dégradation graisse) via régulation HSL (hormone-sensitive lipase) et inhibe lipogenèse (stockage graisse) via downregulation LPL (lipoprotein lipase) dans adipocytes.

Hommes hypogonadiques: +20-30% masse grasse, surtout viscérale (androïde pattern). Réduction testostérone -100 ng/dL s'associe à gain +1-2kg graisse abdominale/an (Traish et al. 2009).

Traitement testostérone (TRT) chez hypogonadiques: -3-5kg graisse + +2-4kg muscle sur 6-12 mois, sans changement diète/training (Corona et al. 2013). Effet puissant sur recomp.`,
    },

    health: {
      energy: `Testostérone régule production énergie via multiple voies: mitochondriogenèse (biogenèse nouveaux mitochondries), expression GLUT4 (transport glucose muscle), sensibilité insuline, métabolisme thyroïdien.

Hypogonadisme = symptôme #1: fatigue chronique, surtout après-midi (crash 14-16h). 80-90% sujets testostérone <300 ng/dL rapportent fatigue persistante vs 20-30% sujets >600 ng/dL.

Traitement testostérone améliore énergie subjective de 40-60% sur échelles validées (Bhasin et al. 2018). Patients décrivent "regain de vie", motivation accrue, disparition besoin sieste.`,

      mood: `Testostérone agit comme neuromodulateur via récepteurs androgéniques dans amygdale, hippocampe, cortex préfrontal. Régule dopamine, sérotonine, GABA. Déficit testostérone s'associe à risque dépression ×2-3.

Études: hommes testostérone <300 ng/dL ont scores dépression 2× plus élevés vs >600 ng/dL (Shores et al. 2004). Traitement testostérone réduit symptômes dépressifs de 30-50% chez hypogonadiques (Pope et al. 2003).

Impact pratique: testostérone basse → irritabilité, anhédonie, perte confiance, anxiété sociale, découragement training. "Brain fog" et difficulté concentration.`,

      cognition: `Testostérone influence cognition via modulation plasticité synaptique hippocampale, neurogenèse, protection neuronale contre stress oxydatif. Récepteurs AR denses dans hippocampe (mémoire) et cortex préfrontal (fonctions exécutives).

Études: hommes testostérone haute (>600 ng/dL) montrent +10-15% performances tests mémoire spatiale, vitesse traitement information, attention soutenue vs testostérone basse (Cherrier et al. 2005).

Déclin testostérone avec âge contribue au déclin cognitif. Traitement testostérone chez hommes âgés hypogonadiques améliore mémoire verbale et spatiale (Muller et al. 2005).`,

      immunity: `Testostérone module fonction immunitaire: stimule production lymphocytes T, régule balance Th1/Th2, influence production cytokines. Hypogonadisme s'associe à immunodépression.

Paradoxe: testostérone haute = meilleure immunité contre infections mais risque auto-immunité réduit (hommes ont 4-10× moins maladies auto-immunes que femmes). Testostérone basse → infections respiratoires plus fréquentes, cicatrisation ralentie.

Pratiquement: athlètes testostérone basse rapportent +30-40% rhumes/grippe vs testostérone optimale. Testostérone >600 ng/dL = résilience immunitaire accrue.`,
    },

    longTerm: {
      cardiovascular: `Relation testostérone-santé cardiovasculaire complexe et dose-dépendante. Testostérone physiologique (300-900 ng/dL) = cardioprotecteur. Hypogonadisme (<300) = risque CV ×1.5-2.

Mécanismes protecteurs: vasodilatation (NO synthase), profil lipidique favorable (↓ LDL, ↑ HDL), sensibilité insuline, réduction inflammation, composition corporelle (↓ graisse viscérale).

Meta-analyse 2019 (Corona et al.): traitement testostérone chez hypogonadiques réduit mortalité cardiovasculaire -33%, infarctus -24%, AVC -20%. Testostérone basse non traitée = facteur risque CV majeur.

⚠️ Nuance: doses supraphysiologiques (>1000 ng/dL, TRT agressif ou stéroïdes) peuvent ↑ risques via polycythémie, HTA, LVH. Cible thérapeutique: 500-800 ng/dL.`,

      metabolic: `Testostérone = régulateur métabolique central. Déficit → syndrome métabolique: résistance insuline, dyslipidémie, HTA, obésité abdominale, inflammation chronique.

Études prospectives: chaque baisse -100 ng/dL testostérone = +14% risque diabète T2 (Grossmann et al. 2008). Hypogonadisme (<300) → risque syndrome métabolique ×4 vs testostérone normale.

Cercle vicieux: obésité → ↓ testostérone (aromatisation) → ↑ obésité (partition nutriments vers graisse) → ↓ testostérone. Breaking this cycle nécessite intervention multifactorielle (perte poids + traitement testostérone si indiqué).

Traitement testostérone chez hypogonadiques avec syndrome métabolique: amélioration HbA1c -0.4-0.6%, sensibilité insuline +20-30%, profil lipidique (Saad et al. 2017).`,

      lifespan: `Corrélation observée entre testostérone et longévité: hommes testostérone quintile supérieur (>550 ng/dL) ont mortalité toutes causes 20-30% inférieure vs quintile inférieur (<350 ng/dL).

Mécanismes: réduction facteurs risque CV, maintien masse musculaire (sarcopénie = prédicteur mortalité fort), densité osseuse (ostéoporose = fragilité), fonction cognitive, qualité vie.

Étude suédoise 2014 (Shores et al.): 1032 hommes >40 ans, suivi 11 ans. Testostérone <300 ng/dL non traitée: mortalité ×1.88. Testostérone <300 traitée: mortalité similaire à contrôles >500 ng/dL.

Recommandation: maintenir testostérone >500 ng/dL après 40 ans via lifestyle optimal + traitement si nécessaire = stratégie longévité validée.`,
    },

    studies: [
      "Bhasin S et al. (2001). Testosterone dose-response relationships in healthy young men. Am J Physiol Endocrinol Metab. 281(6):E1172-E1181.",
      "Corona G et al. (2019). Testosterone supplementation and cardiovascular risk: a systematic review and meta-analysis. Mayo Clin Proc. 94(6):1069-1078.",
      "Traish AM et al. (2009). The dark side of testosterone deficiency. J Androl. 30(1):1-17.",
      "Shores MM et al. (2014). Testosterone treatment and mortality in men with low testosterone levels. J Clin Endocrinol Metab. 97(6):2050-2058.",
      "Saad F et al. (2017). Testosterone deficiency and testosterone treatment in older men. Gerontology. 63(2):144-156.",
    ],
  },

  protocol: {
    phase1_lifestyle: {
      duration: "0-30 jours - PRIORITÉ ABSOLUE",

      sleep: `**Objectif: 7h30-8h minimum/nuit, horaires fixes**

Privation sommeil = cause #1 testostérone basse chez homme <40 ans. Chaque heure sommeil perdue = -15% testostérone (Leproult et al. 2011). 5h/nuit pendant 1 semaine réduit testostérone à niveaux 10-15 ans plus vieux.

**Action plan**:
- Coucher: 22h-23h (fenêtre optimale sécrétion GH/testostérone)
- Réveil: 6h30-7h30 (aligner rythme circadien)
- Chambre: <19°C, noir total (masque si besoin), silence
- Routine pré-sommeil: 0 écran 1h avant, lecture, douche tiède
- Suppléments: Magnésium bisglycinate 400mg 1h avant, éventuellement L-théanine 200mg

**Résultats attendus**: +10-20% testostérone en 4-6 semaines si privation chronique corrigée. Effet massif si actuellement <6h/nuit.`,

      nutrition: `**Objectif: Sortir du déficit calorique, optimiser macros pour testostérone**

Déficit calorique >10% = suppression testostérone -20-30% (Stiegler et al. 2006). Corps en mode survie → downregulation axe HPG pour préserver énergie.

**Action plan**:
1. **Calories**: Passer de déficit à maintenance ou léger surplus (+200-300 kcal)
   - Si actuellement 2200 kcal avec -500 déficit → monter à 2700 (maintenance)
   - Maintenir 2-4 semaines pour "reset" axe hormonal

2. **Lipides**: 1-1.2g/kg minimum (actuellement <0.8g/kg est insuffisant)
   - Cholestérol = précurseur testostérone (voie stéroïdogénique)
   - Focus graisses saturées/monoinsaturées: œufs entiers, viande rouge, huile olive, avocat
   - Éviter low-fat diet (<0.5g/kg) = catastrophe testostérone

3. **Protéines**: 2-2.2g/kg maintenu (déjà optimal)

4. **Glucides**: Timing peri-workout pour sensibilité insuline
   - 50-60% glucides quotidiens dans fenêtre 2h pré + 2h post-training
   - Éviter glucides simples seuls (pic insuline sans activité = stockage graisse)

**Résultats attendus**: +15-25% testostérone en 6-8 semaines si actuellement déficit chronique. Bonus: regain énergie, amélioration humeur, progression training.`,

      training: `**Objectif: Optimiser volume/intensité pour stimulation testostérone sans overtraining**

Entraînement résistance stimule testostérone aiguë (+20-40% post-séance) et chronique (+10-15% baseline). MAIS surentraînement (volume/fréquence excessif + récupération insuffisante) = effet inverse (↑ cortisol, ↓ testostérone).

**Action plan**:
1. **Fréquence**: 3-5 séances/semaine (actuellement si 6-7 → réduire)
2. **Volume**: 12-20 séries/groupe musculaire/semaine (sweet spot hypertrophie + hormones)
3. **Intensité**: Priorité composés lourds (squat, deadlift, bench, rows) à 75-85% 1RM
4. **Repos**: 2-3 min entre séries lourdes (séances <60min si possible)
5. **Cardio**: Limiter HIIT/cardio intense à 2-3×/semaine (excès ↑ cortisol)
6. **Deload**: Semaine -50% volume toutes 4-6 semaines (récupération systémique)

**À éviter**:
- Séances >90min quotidiennes (cortisol spike)
- Entraînement 2×/jour fréquent sans nutrition adéquate
- Cardio steady-state >45min régulier (catabolique)

**Résultats attendus**: +8-12% testostérone si actuellement overtrained. Progression force/hypertrophie déblocage.`,

      stress: `**Objectif: Réduire cortisol chronique élevé (antagoniste testostérone)**

Stress chronique → cortisol élevé persistant → inhibition GnRH hypothalamique → ↓ LH → ↓ testostérone. Relation inverse: cortisol ×1.5 = testostérone ÷1.3.

**Action plan**:
1. **Respiration**: 10min/jour cohérence cardiaque (5sec inspire, 5sec expire)
2. **Méditation**: 15-20min/jour (app Headspace, Calm, ou simple focus respiration)
3. **Marche nature**: 30min/jour minimum extérieur (lumière naturelle + mouvement léger)
4. **Coupures travail**: 0 email/calls après 19h, 1 jour/semaine off complet
5. **Adaptogènes**: Ashwagandha KSM-66 600mg/jour (phase 2) si stress persistant

**Résultats attendus**: -15-25% cortisol en 4-8 semaines si stress chronique. Testostérone remonte indirectement +10-15%.`,

      alcohol: `**Objectif: Éliminer ou réduire drastiquement**

Alcool = toxique testiculaire direct. Inhibe testostérone via 3 mécanismes: (1) dommage cellules Leydig, (2) ↑ aromatisation testostérone → estradiol, (3) perturbation sommeil (↓ REM/profond).

Dose-dépendant:
- 1-2 verres/jour: -6-9% testostérone
- 3-4 verres/jour: -15-20% testostérone
- Binge drinking (5+ verres): -25-35% testostérone 24-48h post

**Action plan**:
- **Idéal**: 0 alcool pendant 30 jours (phase 1 reset)
- **Minimum**: Max 2 verres/semaine, jamais veilles entraînement/sommeil prioritaire
- **Si social unavoidable**: Limiter dégâts (hydratation ++, NAC 600mg pré/post, sommeil +1h)

**Résultats attendus**: +10-18% testostérone si actuellement consommation régulière (3-4×/semaine). Bonus: meilleur sommeil, moins inflammation.`,

      expected_impact: `**Résultats combinés Phase 1 (30 jours)**:

Si application stricte des 5 piliers (sommeil, nutrition, training, stress, alcool):

- Testostérone: **+20-40% attendu** (ex: 420 → 500-590 ng/dL)
- Cortisol: -15-25%
- Énergie subjective: +40-60%
- Qualité sommeil: +50-70%
- Progression training: déblocage stagnation
- Composition corporelle: -1-2kg graisse, +0.5-1kg muscle (recomp naturel)

⚠️ **Important**: Ces résultats supposent testostérone basse d'origine fonctionnelle (lifestyle). Si hypogonadisme organique (testiculaire/hypophysaire), lifestyle seul insuffisant → consultation endocrino + potentiel TRT.

**Red flags nécessitant investigation médicale AVANT Phase 2**:
- Testostérone <250 ng/dL persistante malgré lifestyle optimal
- LH/FSH anormales (très hautes ou très basses)
- Symptômes sévères: gynécomastie, atrophie testiculaire, dysfonction érectile franche
- Prolactine >25 ng/mL (suspicion prolactinome)`,
    },

    phase2_supplements: {
      duration: "30-90 jours - Après optimisation lifestyle",

      supplements: [
        {
          name: "Zinc (picolinate ou bisglycinate)",
          dosage: "30mg/jour (25mg zinc élémentaire)",
          timing: "Soir avec repas (ou 2h séparé calcium/fer)",
          brand: "Thorne, NOW Foods, Life Extension",
          mechanism: `Cofacteur 300+ enzymes, dont aromatase (convertit testostérone → estradiol). Déficit zinc → aromatisation excessive → testostérone ↓, estradiol ↑.

Zinc inhibe aromatase compétitif, optimise LH signaling, protège cellules Leydig stress oxydatif. Athlètes perdent 1-2mg zinc/L sueur → déficit fréquent si entraînement intense.

Études:
- Prasad et al. (1996): Zinc 30mg/jour × 6 mois → testostérone +93% chez déficitaires
- Kilic et al. (2006): Zinc + exercice → testostérone +33% vs exercice seul`,
          studies: [
            "Prasad AS et al. (1996). Zinc status and serum testosterone in healthy adults. Nutrition. 12(5):344-348.",
            "Kilic M et al. (2006). Effect of zinc supplementation on serum testosterone in athletes. J Exerc Sci Fit. 4(1):56-60.",
          ],
        },
        {
          name: "Vitamine D3 (cholécalciférol)",
          dosage: "5000 UI/jour (si <30 ng/mL), puis 2000-3000 UI maintenance",
          timing: "Matin avec repas contenant graisses",
          brand: "NOW Foods, Thorne, Doctor's Best",
          mechanism: `Vitamine D = stéroïde hormone. Récepteurs VDR dans cellules Leydig, hypothalamus, hypophyse. Régule expression CYP enzymes stéroïdogéniques.

Déficit (<30 ng/mL) = quasi-universel hivers/bureaux. Corrélation linéaire: chaque +10 ng/mL vitamine D = +50-80 ng/dL testostérone (Pilz et al. 2011).

Études:
- Pilz S et al. (2011): Vitamine D 3332 UI/jour × 1 an → testostérone +25% (déficitaires)
- Wehr E et al. (2010): Corrélation vitamine D - testostérone dans cohorte 2299 hommes`,
          studies: [
            "Pilz S et al. (2011). Effect of vitamin D supplementation on testosterone. Horm Metab Res. 43(3):223-225.",
            "Wehr E et al. (2010). Association of vitamin D status with serum androgen levels in men. Clin Endocrinol. 73(2):243-248.",
          ],
        },
        {
          name: "Ashwagandha KSM-66 (extrait standardisé)",
          dosage: "600mg/jour (300mg × 2 ou 600mg soir)",
          timing: "Soir de préférence (effet relaxant)",
          brand: "KSM-66 (marque brevetée), Jarrow, NOW Foods",
          mechanism: `Adaptogène régule axe HPA (hypothalamus-pituitaire-surrénales). Réduit cortisol chronique élevé → lève inhibition GnRH → ↑ LH → ↑ testostérone.

Action GABAergique légère (anxiolytique naturel), améliore sommeil, réduit stress perçu -44% (échelles validées).

Études:
- Lopresti et al. (2019): Ashwagandha 600mg × 8 semaines → testostérone +14.7%, ↓ cortisol -27.9%
- Wankhede et al. (2015): Ashwagandha + résistance training → testostérone +15% vs placebo`,
          studies: [
            "Lopresti AL et al. (2019). A randomized, double-blind, placebo-controlled trial of ashwagandha on stress and testosterone. J Int Soc Sports Nutr. 16(1):10.",
            "Wankhede S et al. (2015). Effects of ashwagandha on muscle mass and strength. J Int Soc Sports Nutr. 12:43.",
          ],
        },
        {
          name: "Magnésium Bisglycinate",
          dosage: "400mg/jour (ou 300-500mg selon poids)",
          timing: "1h avant coucher",
          brand: "Doctor's Best, Thorne, Pure Encapsulations",
          mechanism: `Magnésium = cofacteur 300+ réactions, dont synthèse testostérone. Liaison magnésium-SHBG → libération testostérone libre (+24% dans étude Cinar et al. 2011).

Effet majeur via amélioration sommeil profond (↑ ondes delta) → pic GH nocturne optimal → synergie testostérone. Forme bisglycinate = absorption supérieure, 0 effet laxatif (vs oxyde).

Études:
- Cinar V et al. (2011): Magnésium 10mg/kg × 4 semaines + training → testostérone +24%
- Brilla LR et al. (1992): Magnésium supplémentation → ↑ testostérone libre athlètes`,
          studies: [
            "Cinar V et al. (2011). Effects of magnesium supplementation on testosterone in athletes. Biol Trace Elem Res. 140(1):18-23.",
            "Brilla LR et al. (1992). Magnesium-exercise interactions. Magnes Res. 5(3):193-199.",
          ],
        },
        {
          name: "Vitamine K2 MK-7 (optionnel avec D3)",
          dosage: "200mcg/jour",
          timing: "Avec vitamine D3 (synergie)",
          brand: "NOW Foods, Life Extension, Jarrow",
          mechanism: `Synergie vitamine D3/K2: K2 dirige calcium vers os (vs artères). Études suggèrent K2 stimule testostérone via activation ostéocalcine (protéine os → signaling Leydig cells).

Moins de preuves directes que zinc/D3, mais coût faible et bénéfice santé osseuse/CV établi. Considérer si dosage D3 >5000 UI/jour long-terme.`,
          studies: [
            "Iki M et al. (2006). Vitamin K2 and bone and cardiovascular health. Osteoporos Int. 17(12):1710-1715.",
          ],
        },
      ],

      budget: `**Coût mensuel total: 50-80€**

- Zinc 30mg (180 caps): ~15€ (6 mois) = 2.50€/mois
- Vitamine D3 5000 UI (360 softgels): ~18€ (12 mois) = 1.50€/mois
- Ashwagandha KSM-66 (60 caps): ~25€ (1 mois) = 25€/mois
- Magnésium Bisglycinate (120 caps): ~20€ (4 mois) = 5€/mois
- Vitamine K2 (optionnel, 120 caps): ~22€ (4 mois) = 5.50€/mois

**Total: ~40€/mois (sans K2) ou ~45€/mois (avec K2)**

Recommandation: Commencer zinc + D3 + magnésium (10€/mois) pendant 4 semaines. Si budget permet, ajouter Ashwagandha si stress élevé/cortisol haut.`,

      expected_impact: `**Résultats combinés Phase 1 + Phase 2 (90 jours total)**:

- Testostérone: **+30-60% vs baseline** (ex: 420 → 550-670 ng/dL)
  - Phase 1 (lifestyle): +20-40%
  - Phase 2 (suppléments): +10-20% additionnel
- Cortisol: -25-40% (surtout si Ashwagandha)
- Vitamine D: 40-60 ng/mL (optimal)
- Zinc sérique: >90 μg/dL (optimal)
- Qualité vie: amélioration franche tous domaines (énergie, libido, perfs, humeur)

⚠️ **Attentes réalistes**:
- Si testostérone baseline 400-500 ng/dL d'origine fonctionnelle → cible 600-750 ng/dL atteignable
- Si testostérone baseline <300 ng/dL persistante → amélioration modeste attendue, TRT potentiellement nécessaire (voir Phase 3)

**Quand abandonner lifestyle-only approach**:
- Après 90 jours optimisation stricte (lifestyle + suppléments), si testostérone reste <400 ng/dL + symptômes persistants → consultation endocrinologue pour bilan approfondi + discussion TRT`,
    },

    phase3_retest: {
      duration: "90 jours+ - Évaluation résultats",

      when: `**Timing retest: J+90 (3 mois après début Phase 1)**

Délai 90 jours nécessaire pour:
- Renouvellement complet spermatogenèse (74 jours)
- Adaptation métabolique aux changements lifestyle
- Accumulation effets suppléments (zinc/D3 = 6-12 semaines plateau)

**Conditions prise de sang**:
- Matinale: 7h-10h (pic circadien testostérone)
- À jeun: 10-12h (fiabilité marqueurs métaboliques)
- Repos: 48h post-entraînement intense (éviter suppression aiguë)
- Hydratation normale: pas surhydratation (dilue valeurs)`,

      markers: `**Panel complet retest (20-25 marqueurs)**:

**Hormones (priorité #1)**:
- Testostérone totale (ng/dL) → Cible >600
- Testostérone libre (pg/mL) ou calculée → Cible >100
- SHBG (nmol/L) → Cible 20-40
- Estradiol (pg/mL) → Cible 20-30, ratio T:E2 >20:1
- LH (mIU/mL) → Évaluer axe HPG
- FSH (mIU/mL) → Évaluer fonction testiculaire
- Prolactine (ng/mL) → Exclure hyperprolactinémie
- Cortisol matinal (μg/dL) → Cible <15

**Marqueurs associés**:
- Vitamine D (ng/mL) → Cible 40-60
- Zinc sérique (μg/dL) → Cible >90
- TSH, T3, T4 (évaluer thyroïde si énergie/métabolisme sub-optimal)
- Glycémie, HbA1c, HOMA-IR (si syndrome métabolique)
- Lipides complets (TG/HDL ratio, LDL, HDL)
- CRP-us (inflammation)
- ALT/AST (fonction hépatique)
- Hémogramme complet (exclure anémie, polyglobulie)`,

      success_criteria: `**Critères succès protocole**:

✅ **Succès complet**:
- Testostérone: +30-50% vs baseline ET >550 ng/dL
- Symptômes: amélioration ≥60% (énergie, libido, perfs, humeur)
- Marqueurs secondaires: vitamine D >40, cortisol <15, zinc >90
- → Continuer optimisation lifestyle, réévaluer 1×/an

⚠️ **Succès partiel**:
- Testostérone: +15-29% vs baseline OU 450-549 ng/dL
- Symptômes: amélioration 30-59%
- → Poursuivre 3 mois additionnels, investiguer facteurs limitants (stress persistant? sommeil sous-optimal? déficit calorique résiduel?)

❌ **Échec protocole**:
- Testostérone: <+15% ET <450 ng/dL
- Symptômes: amélioration <30%
- → Investigation endocrinienne approfondie (voir Next Steps ci-dessous)`,

      next_steps: `**Si amélioration insuffisante (<+20% testostérone après 90j)**:

**Examens complémentaires**:
1. **IRM hypophysaire** (exclure adénome, lésion compressive)
2. **Échographie testiculaire** (exclure atrophie, varicocèle, tumeur)
3. **Caryotype** (exclure Klinefelter si dysmorphie/gynécomastie)
4. **Panel complet hypophysaire**: GH, ACTH, cortisol, prolactine approfondie
5. **Test stimulation GnRH** (distinguer hypogonadisme primaire vs secondaire)

**Consultation endocrinologue**:
- Discussion TRT (Testosterone Replacement Therapy) si:
  - Testostérone confirmée <300 ng/dL sur 2 dosages + symptômes
  - Échec optimisation lifestyle 90 jours
  - LH/FSH basses (hypogonadisme secondaire) ou très hautes (primaire)
  - Âge >40 ans avec déclin symptomatique franc

**Options TRT** (sous supervision médicale):
- **Injections IM**: Énanthate/cypionate 100-200mg/semaine (gold standard)
- **Gel transdermal**: Androgel, Testogel (moins stable, transfert risque)
- **Pellets sous-cutanés**: Testopel (durée 3-6 mois, invasif)
- **Clomid/hCG** (si préservation fertilité prioritaire, stimule production endogène)

⚠️ **TRT = décision majeure**: Engagement vie, suppression production endogène, monitoring régulier (hématocrite, PSA, lipides). Toujours essayer lifestyle-first approach 90 jours minimum.`,
    },

    special_cases: {
      non_responders: `**"J'ai tout bien fait, testostérone toujours basse"**

Si après 90 jours lifestyle optimal + suppléments, testostérone reste <400 ng/dL:

**Causes possibles**:
1. **Hypogonadisme organique** (non fonctionnel):
   - Primaire: dommage testiculaire (trauma, orchite, crypto, chimio)
   - Secondaire: déficit GnRH/LH (adénome, Kallmann, prolactinome)
   → Investigation endocrinienne requise

2. **Facteurs cachés** (lifestyle non réellement optimal):
   - Sommeil: quantité ≠ qualité (apnée sommeil? REM insuffisant?)
   - Stress: chronique bas-grade sous-estimé (travail, finances, relation)
   - Alcool: sous-déclaration fréquente (weekends ++)
   - Calories: macro comptage imprécis, déficit résiduel
   - Entraînement: volume réel > perçu, récupération insuffisante

3. **Co-facteurs métaboliques**:
   - Obésité persistante (BMI >30, BF >25%) → aromatisation excessive
   - Diabète/pré-diabète → résistance insuline perturbe stéroïdogenèse
   - Hypothyroïdie subclinique → ralentit tous métabolismes
   → Traiter pathologies sous-jacentes en parallèle

**Action**:
- Tenir journal précis 2 semaines (sommeil, calories, alcool, stress, entraînement)
- Consultation endocrinologue + examens approfondis
- Discussion risques/bénéfices TRT si hypogonadisme confirmé organique`,

      contraindications: `**Qui NE doit PAS suivre ce protocole (ou avec précautions)**:

**Contre-indications absolues suppléments**:
- **Zinc >50mg/jour long-terme**: Toxicité cuivre (anémie, neutropénie)
- **Vitamine D >10,000 UI/jour sans monitoring**: Hypercalcémie, lithiases
- **Ashwagandha**: Hyperthyroïdie (stimule T3/T4), grossesse/allaitement
- **Magnésium high-dose**: Insuffisance rénale sévère

**Précautions lifestyle modifications**:
- **Déficit calorique**: Si IMC <20 ou BF <10% homme, ne PAS restreindre davantage
- **Entraînement**: Si historique troubles alimentaires, overtraining compulsif → suivi psychologique
- **Stress management**: Si dépression clinique, anxiété sévère → psychiatre/psychologue avant auto-gestion

**Contre-indications relatives TRT** (Phase 3):
- Cancer prostate (absolu)
- PSA >4 ng/mL non investigué
- Hématocrite >52% (risque thrombose)
- Apnée sommeil sévère non traitée (aggravée par TRT)
- Désir fertilité court-terme (TRT = azoospermie 6-12 mois)
- <25 ans sans investigation exhaustive (fermeture épiphyses)`,

      red_flags: `**Quand consulter endocrinologue AVANT d'essayer lifestyle-only**:

🚩 **Urgences endocriniennes**:
- Testostérone <200 ng/dL + symptômes francs
- Gynécomastie douloureuse rapide (suspicion prolactinome, tumeur testiculaire)
- Céphalées + troubles vision (suspicion adénome hypophysaire compressif)
- Atrophie testiculaire franche (<15mL volume)
- Dysfonction érectile complète + absence libido (combinaison rare si hypogonadisme seul)

🚩 **Red flags biologiques**:
- LH/FSH très élevées (>15-20 mIU/mL) = hypogonadisme primaire → investigation testiculaire
- Prolactine >25 ng/mL (homme) = hyperprolactinémie → IRM hypophysaire
- Estradiol >40-50 pg/mL (homme) = aromatisation excessive ou tumeur sécrétante
- HbA1c >7% = diabète non contrôlé → priorité glycémie avant testostérone
- ALT/AST >2-3× normale = hépatopathie → investigation hépatique avant suppléments

🚩 **Historique médical**:
- Chimiothérapie antérieure (gonadotoxique)
- Radiothérapie crânienne/pelvienne
- Trauma crânien sévère (lésion hypophysaire)
- Cryptorchidie opérée (risque fonction testiculaire réduite)
- Syndrome génétique connu (Klinefelter, Kallmann, etc.)

**Règle générale**: Si testostérone <300 ng/dL sur 1er dosage → refaire dosage + LH/FSH/prolactine AVANT lifestyle modifications. Si confirmé <300 + LH/FSH anormales → endocrinologue directement (ne pas perdre 3 mois).`,
    },
  },
};
```

---

## 8. SPÉCIFICATIONS COMPOSANTS

### 8.1 BloodTabs.tsx (Tab System)

**Fichier**: `client/src/components/blood/BloodTabs.tsx`

```typescript
import { useState } from "react";
import { motion } from "framer-motion";
import { useBloodTheme } from "./BloodThemeContext";
import OverviewTab from "./tabs/OverviewTab";
import BiomarkersTab from "./tabs/BiomarkersTab";
import AnalysisTab from "./tabs/AnalysisTab";
import ProtocolTab from "./tabs/ProtocolTab";
import TrendsTab from "./tabs/TrendsTab";
import SourcesTab from "./tabs/SourcesTab";
import { BloodReportData } from "../../types/blood";

interface BloodTabsProps {
  reportData: BloodReportData;
}

type TabKey = "overview" | "biomarkers" | "analysis" | "protocol" | "trends" | "sources";

interface Tab {
  key: TabKey;
  label: string;
  component: React.ComponentType<{ reportData: BloodReportData }>;
}

const TABS: Tab[] = [
  { key: "overview", label: "Overview", component: OverviewTab },
  { key: "biomarkers", label: "Biomarkers", component: BiomarkersTab },
  { key: "analysis", label: "Analysis", component: AnalysisTab },
  { key: "protocol", label: "Protocol", component: ProtocolTab },
  { key: "trends", label: "Trends", component: TrendsTab },
  { key: "sources", label: "Sources", component: SourcesTab },
];

export default function BloodTabs({ reportData }: BloodTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { theme, mode } = useBloodTheme();

  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component || OverviewTab;

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{
          backgroundColor: theme.background,
          borderColor: theme.borderDefault,
        }}
      >
        <div className="flex gap-1 px-6 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? theme.primaryBlue : theme.textSecondary,
                }}
              >
                {tab.label}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: theme.primaryBlue }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ActiveComponent reportData={reportData} />
        </motion.div>
      </div>
    </div>
  );
}
```

**Props**:
- `reportData`: BloodReportData - Données complètes du rapport

**State**:
- `activeTab`: TabKey - Tab actuellement active

**Comportement**:
- Click tab → Change activeTab + animation slide
- Active indicator (barre bleue) suit tab avec spring animation
- Content fade in/out entre tabs
- Tabs scrollables horizontalement sur mobile

---

### 8.2 BiomarkerCardCompact.tsx

**Fichier**: `client/src/components/blood/biomarkers/BiomarkerCardCompact.tsx`

```typescript
import { TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { useBloodTheme } from "../BloodThemeContext";
import { BloodMarker } from "../../../types/blood";
import StatusBadge from "../shared/StatusBadge";
import BiomarkerRangeIndicator from "../shared/BiomarkerRangeIndicator";

interface BiomarkerCardCompactProps {
  marker: BloodMarker;
  onClick: () => void;
}

export default function BiomarkerCardCompact({ marker, onClick }: BiomarkerCardCompactProps) {
  const { theme, mode } = useBloodTheme();

  // Calcul delta optimal
  const getDelta = () => {
    if (!marker.optimalMin || !marker.optimalMax) return null;

    const optimalMid = (marker.optimalMin + marker.optimalMax) / 2;
    const delta = ((marker.value - optimalMid) / optimalMid) * 100;

    if (marker.value >= marker.optimalMin && marker.value <= marker.optimalMax) {
      return { text: "Dans la zone optimale", icon: CheckCircle2, color: theme.primaryBlue };
    } else if (marker.value < marker.optimalMin) {
      const pct = Math.round(Math.abs(delta));
      return { text: `${pct}% sous l'optimal`, icon: TrendingDown, color: "#F59E0B" };
    } else {
      const pct = Math.round(delta);
      return { text: `${pct}% au-dessus`, icon: TrendingUp, color: "#10B981" };
    }
  };

  const delta = getDelta();

  // Couleur bordure gauche selon status
  const borderColor =
    marker.status === "optimal"
      ? "#10B981"
      : marker.status === "normal"
      ? theme.primaryBlue
      : marker.status === "suboptimal"
      ? "#F59E0B"
      : "#EF4444";

  return (
    <div
      className="rounded-lg border p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
      style={{
        borderColor: theme.borderDefault,
        borderLeftWidth: "3px",
        borderLeftColor: borderColor,
        backgroundColor: theme.surface,
      }}
      onClick={onClick}
    >
      {/* Header: Nom + Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold leading-tight" style={{ color: theme.textPrimary }}>
          {marker.name}
        </h3>
        <StatusBadge status={marker.status} />
      </div>

      {/* Valeur */}
      <div className="mb-3">
        <div
          className="text-2xl font-bold"
          style={{
            color:
              marker.status === "critical"
                ? "#EF4444"
                : marker.status === "suboptimal"
                ? "#F59E0B"
                : theme.primaryBlue,
          }}
        >
          {marker.value} <span className="text-sm font-normal">{marker.unit}</span>
        </div>
      </div>

      {/* Range Indicator */}
      <div className="mb-3">
        <BiomarkerRangeIndicator marker={marker} compact />
      </div>

      {/* Delta */}
      {delta && (
        <div className="flex items-center gap-2 mb-3">
          <delta.icon size={16} style={{ color: delta.color }} />
          <span className="text-xs font-medium" style={{ color: delta.color }}>
            {delta.text}
          </span>
        </div>
      )}

      {/* Percentile */}
      {marker.percentile && (
        <div className="text-xs" style={{ color: theme.textTertiary }}>
          Top {100 - marker.percentile}%
        </div>
      )}

      {/* Button "Voir +" */}
      <button
        className="mt-3 w-full py-1.5 text-xs font-medium rounded transition-colors"
        style={{
          backgroundColor: mode === "dark" ? "rgba(2,121,232,0.1)" : "rgba(2,121,232,0.05)",
          color: theme.primaryBlue,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            mode === "dark" ? "rgba(2,121,232,0.15)" : "rgba(2,121,232,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            mode === "dark" ? "rgba(2,121,232,0.1)" : "rgba(2,121,232,0.05)";
        }}
      >
        Voir détails
      </button>
    </div>
  );
}
```

**Props**:
- `marker`: BloodMarker - Données du marqueur
- `onClick`: () => void - Callback ouverture modal

**Features**:
- Bordure gauche colorée selon status (3px)
- Icône + couleur pour delta (TrendingDown orange, TrendingUp vert, CheckCircle bleu)
- Hover scale 1.02 + shadow
- Button "Voir détails" avec hover effect

---

### 8.3 BiomarkerDetailModal.tsx

**Fichier**: `client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx`

```typescript
import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBloodTheme } from "../BloodThemeContext";
import { BloodMarker } from "../../../types/blood";
import { getBiomarkerDetailExtended } from "../../../data/bloodBiomarkerDetailsExtended";
import ReactMarkdown from "react-markdown";

interface BiomarkerDetailModalProps {
  marker: BloodMarker;
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = "definition" | "impact" | "protocol";

export default function BiomarkerDetailModal({
  marker,
  isOpen,
  onClose,
}: BiomarkerDetailModalProps) {
  const { theme, mode } = useBloodTheme();
  const [activeTab, setActiveTab] = useState<ModalTab>("definition");

  const detail = getBiomarkerDetailExtended(marker.code);

  if (!isOpen || !detail) return null;

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "definition":
        return (
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                C'est quoi exactement?
              </h2>
              <ReactMarkdown className="prose prose-sm">{detail.definition.intro}</ReactMarkdown>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                Mécanisme physiologique
              </h2>
              <ReactMarkdown className="prose prose-sm">
                {detail.definition.mechanism}
              </ReactMarkdown>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                Contexte clinique
              </h2>
              <ReactMarkdown className="prose prose-sm">
                {detail.definition.clinical}
              </ReactMarkdown>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.textPrimary }}>
                Interprétation des ranges
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
                  <div className="font-semibold text-sm" style={{ color: "#10B981" }}>
                    Optimal: {detail.definition.ranges.optimal}
                  </div>
                  <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    {detail.definition.ranges.interpretation.split("**Normal")[0]}
                  </p>
                </div>
                {/* Répéter pour Normal, Suboptimal, Critical */}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.textPrimary }}>
                Études clés
              </h3>
              <ul className="space-y-2">
                {detail.definition.studies.map((study, i) => (
                  <li key={i} className="text-xs" style={{ color: theme.textSecondary }}>
                    {study}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        );

      case "impact":
        return (
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                Performance
              </h2>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: theme.primaryBlue }}>
                    Hypertrophie musculaire
                  </h4>
                  <ReactMarkdown className="prose prose-sm">
                    {detail.impact.performance.hypertrophy}
                  </ReactMarkdown>
                </div>
                {/* Répéter pour strength, recovery, bodyComp */}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                Santé
              </h2>
              {/* Similar structure */}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: theme.textPrimary }}>
                Long-terme
              </h2>
              {/* Similar structure */}
            </section>
          </div>
        );

      case "protocol":
        return (
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="h-8 w-1 rounded"
                  style={{ backgroundColor: theme.primaryBlue }}
                />
                <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
                  Phase 1: Lifestyle (0-30 jours)
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: "#10B981" }}>
                    Sommeil
                  </h4>
                  <ReactMarkdown className="prose prose-sm">
                    {detail.protocol.phase1_lifestyle.sleep}
                  </ReactMarkdown>
                </div>
                {/* Répéter pour nutrition, training, stress, alcohol */}
              </div>

              <div
                className="mt-4 p-4 rounded-lg"
                style={{ backgroundColor: "rgba(2,121,232,0.05)" }}
              >
                <h4 className="font-semibold text-sm mb-2" style={{ color: theme.primaryBlue }}>
                  Résultats attendus
                </h4>
                <ReactMarkdown className="prose prose-sm">
                  {detail.protocol.phase1_lifestyle.expected_impact}
                </ReactMarkdown>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 rounded" style={{ backgroundColor: "#F59E0B" }} />
                <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
                  Phase 2: Suppléments (30-90 jours)
                </h2>
              </div>

              <div className="space-y-4">
                {detail.protocol.phase2_supplements.supplements.map((supp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                    style={{
                      borderColor: theme.borderDefault,
                      backgroundColor: theme.surface,
                    }}
                  >
                    <h4 className="font-bold text-base mb-2" style={{ color: theme.primaryBlue }}>
                      {supp.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span style={{ color: theme.textTertiary }}>Dosage:</span>{" "}
                        <span style={{ color: theme.textPrimary }}>{supp.dosage}</span>
                      </div>
                      <div>
                        <span style={{ color: theme.textTertiary }}>Timing:</span>{" "}
                        <span style={{ color: theme.textPrimary }}>{supp.timing}</span>
                      </div>
                      <div>
                        <span style={{ color: theme.textTertiary }}>Brand:</span>{" "}
                        <span style={{ color: theme.textPrimary }}>{supp.brand}</span>
                      </div>
                    </div>
                    <ReactMarkdown className="prose prose-sm">{supp.mechanism}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-1 rounded" style={{ backgroundColor: "#10B981" }} />
                <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
                  Phase 3: Retest (90 jours+)
                </h2>
              </div>
              <ReactMarkdown className="prose prose-sm">
                {detail.protocol.phase3_retest.when}
              </ReactMarkdown>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: theme.background }}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: theme.borderDefault }}
              >
                <div>
                  <h2 className="text-xl font-bold" style={{ color: theme.textPrimary }}>
                    {marker.name}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    {marker.value} {marker.unit} (Cible: {marker.optimalMin}-{marker.optimalMax})
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: theme.textTertiary }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Status Bar */}
              <div
                className="px-6 py-3"
                style={{
                  backgroundColor:
                    marker.status === "critical"
                      ? "rgba(239,68,68,0.1)"
                      : marker.status === "suboptimal"
                      ? "rgba(245,158,11,0.1)"
                      : "rgba(2,121,232,0.1)",
                }}
              >
                <div
                  className="text-sm font-semibold"
                  style={{
                    color:
                      marker.status === "critical"
                        ? "#EF4444"
                        : marker.status === "suboptimal"
                        ? "#F59E0B"
                        : theme.primaryBlue,
                  }}
                >
                  {marker.status === "critical"
                    ? "⚠️ CRITIQUE"
                    : marker.status === "suboptimal"
                    ? "⚠️ ATTENTION"
                    : "✅ BON ÉTAT"}
                </div>
              </div>

              {/* Tabs */}
              <div
                className="px-6 flex gap-4 border-b"
                style={{ borderColor: theme.borderDefault }}
              >
                {[
                  { key: "definition", label: "Définition" },
                  { key: "impact", label: "Impact" },
                  { key: "protocol", label: "Protocole" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as ModalTab)}
                    className="relative py-3 text-sm font-medium"
                    style={{
                      color: activeTab === tab.key ? theme.primaryBlue : theme.textSecondary,
                    }}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <motion.div
                        layoutId="modalTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: theme.primaryBlue }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">{renderContent()}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Props**:
- `marker`: BloodMarker
- `isOpen`: boolean
- `onClose`: () => void

**Features**:
- Modal 900px width, 90vh max height
- 3 tabs internes (Définition/Impact/Protocole)
- Backdrop blur + dark overlay
- Animation framer-motion (scale + fade)
- Scroll content area avec header/tabs fixes
- Close on backdrop click ou X button

---

## 9. GUIDE IMPLÉMENTATION

### Phase 1: Tab System (8-12h)

**Ordre d'implémentation**:

1. **Créer BloodTabs.tsx** (2h)
   - Tab bar avec 6 tabs
   - State management (activeTab)
   - Animation layoutId pour indicator
   - Fade in/out content entre tabs

2. **Créer structure tabs/** (1h)
   - 6 fichiers vides: OverviewTab.tsx, BiomarkersTab.tsx, etc.
   - Props interface BloodReportData
   - Placeholder content "Coming soon"

3. **Intégrer dans BloodAnalysisReport.tsx** (1h)
   - Refactor: extraire data fetching
   - Remplacer content actuel par <BloodTabs reportData={data} />
   - Tester navigation entre tabs

4. **Implémenter OverviewTab.tsx** (4-6h)
   - GlobalScoreCard (score + animation)
   - ThreeRadarsSection (3 radars côte à côte)
   - KeyAlertsSection (3-5 alertes)
   - QuickActionsSection (3 buttons)

5. **Test & Debug** (2h)
   - Tab navigation smooth
   - Animations sans lag
   - Responsive mobile (tabs horizontal scroll)

**Résultat Phase 1**: Navigation tabs fonctionnelle, Overview tab complet, autres tabs placeholder.

---

### Phase 2: Sidebar Navigation (2-3h)

**Ordre d'implémentation**:

1. **Créer BloodSidebar.tsx** (1.5h)
   - Fixed left sidebar (240px width)
   - Score global display
   - Nav items (6 tabs)
   - Progress bar (completeness)
   - Theme toggle integration

2. **Intégrer layout** (30min)
   - Wrapper: `<div class="flex">`
   - Sidebar left (fixed)
   - Main content right (margin-left 240px)
   - Mobile: sidebar → hamburger menu

3. **Test responsive** (1h)
   - Desktop: sidebar always visible
   - Mobile <768px: sidebar hidden, hamburger toggle
   - Overlay backdrop mobile

**Résultat Phase 2**: Navigation sidebar fonctionnelle, progress tracking visible.

---

### Phase 3: Biomarkers Tab (4-6h)

**Ordre d'implémentation**:

1. **BiomarkerCardCompact.tsx** (2h)
   - Layout card (voir section 8.2)
   - Status badge, range indicator, delta
   - Hover effects
   - Click handler pour modal

2. **BiomarkersTab.tsx + FilterBar** (1h)
   - Panel filter buttons (Tous, Hormones, etc.)
   - Search input
   - Grid 3 colonnes (responsive 1 col mobile)
   - Map markers → BiomarkerCardCompact

3. **BiomarkerDetailModal.tsx** (2-3h)
   - Modal structure (header, tabs, content)
   - 3 internal tabs (Définition/Impact/Protocole)
   - Content rendering markdown
   - Animations open/close

4. **Intégrer bloodBiomarkerDetailsExtended.ts** (1h)
   - Créer fichier data avec structure définie
   - Implémenter 3-5 marqueurs prioritaires (testostérone, vitamine D, glycémie)
   - Autres marqueurs: fallback texte court

**Résultat Phase 3**: Tab Biomarkers complet avec cards, filtres, modal détails 2000-3000 mots.

---

### Phase 4: Radars (3-4h)

**Ordre d'implémentation**:

1. **GlobalRadar.tsx** (1h)
   - Radar 6 axes (6 panels)
   - Données: panelScores
   - Même composant base BloodRadar.tsx (déjà existe)

2. **PanelRadar.tsx** (1h)
   - Radar marqueurs d'un panel sélectionné
   - Dropdown panel selector
   - Données: markers filtered by panel

3. **PercentileRadar.tsx** (1h)
   - Radar percentiles critiques (top 5-10 markers)
   - Affichage percentile vs 100
   - Tooltip avec âge/sexe context

4. **Intégrer dans OverviewTab** (30min)
   - Section ThreeRadarsSection
   - Grid 3 cols
   - Chaque radar 320x320px

**Résultat Phase 4**: 3 radars visibles dans Overview, visualisation riche des données.

---

### Phase 5: Analysis Tab (6-8h)

**Ordre d'implémentation**:

1. **Parser AI analysis** (3-4h)
   - Créer bloodAnalysisParser.ts
   - Parser markdown AI → structured sections
   - Identifier: ## Système X, ## Pattern Y, ## Corrélation Z
   - Return: { systems: [], patterns: [], correlations: [] }

2. **AnalysisSubTabs.tsx** (1h)
   - 3 sub-tabs: Systems / Patterns / Correlations
   - State management activeSubTab
   - Content rendering

3. **StructuredContent.tsx** (1h)
   - Component affichage sections parsées
   - Styling markdown (prose class)
   - Collapse/expand long sections

4. **Intégrer dans AnalysisTab** (1h)
   - Fetch parsed analysis
   - Pass to AnalysisSubTabs
   - Test all 3 sub-tabs

**Résultat Phase 5**: Analysis tab avec contenu AI structuré, navigation sub-tabs.

---

### Phase 6: Protocol Tab (3-4h)

**Ordre d'implémentation**:

1. **ProtocolTimeline.tsx** (1.5h)
   - Timeline horizontale 3 phases
   - PhaseCard × 3 (0-30d, 30-90d, 90d+)
   - Color coding (bleu/orange/vert)

2. **SupplementsTable.tsx** (1h)
   - Table 5 colonnes (Nom/Dosage/Timing/Brand/Marqueurs)
   - Styling responsive
   - Links études

3. **LifestyleChecklist.tsx** (30min)
   - Checklist interactive
   - Sommeil, nutrition, training, stress, alcool
   - Checkboxes (local storage persistence optionnel)

4. **Intégrer dans ProtocolTab** (1h)
   - Layout: timeline → supplements → lifestyle
   - Data: generate from markers + correlations

**Résultat Phase 6**: Protocol tab complet avec timeline actionnable.

---

### Phase 7: Theme Toggle Visible (30min)

**Implémentation**:

1. **Intégrer ThemeToggle dans BloodHeader** (15min)
   - Import ThemeToggle component (déjà existe)
   - Position: top-right header
   - Entre titre et share button

2. **Test toggle** (15min)
   - Click → switch dark/light
   - Toutes pages respectent theme
   - Persistence localStorage

**Résultat Phase 7**: Dark theme accessible, UX fixée.

---

### Phase 8: Testing & Polish (2-3h)

**Checklist validation**:

- [ ] Build successful (`npm run build`)
- [ ] TypeScript no errors (`npx tsc --noEmit`)
- [ ] All 6 tabs navigable
- [ ] Sidebar navigation sync avec tabs
- [ ] Theme toggle visible et fonctionnel
- [ ] 39 biomarkers affichés avec cards compactes
- [ ] Modal détails ouvre/ferme correctement
- [ ] 3 radars affichés dans Overview
- [ ] Analysis parsé et structuré
- [ ] Protocol timeline lisible
- [ ] Responsive mobile (test 375px, 768px, 1440px)
- [ ] Animations smooth (pas de lag)
- [ ] Scores animés avec count-up
- [ ] Sources tab avec citations groupées
- [ ] Performance: First Contentful Paint <1.5s
- [ ] Accessibility: keyboard navigation fonctionne
- [ ] Cross-browser: Chrome, Safari, Firefox

**Tests sur rapports réels**:
- Tester avec 3-5 rapports différents
- Vérifier tous status (optimal/normal/suboptimal/critical)
- Vérifier edge cases (marqueurs null, panels incomplets)

---

## 10. TESTING & VALIDATION

### Tests Unitaires

**Fichiers à tester**:

1. **Algorithmes calcul** (`lib/bloodScores.ts`):
```typescript
describe("calculateMarkerScore", () => {
  it("should return 100 for optimal status", () => {
    expect(calculateMarkerScore({ status: "optimal" })).toBe(100);
  });

  it("should return 30 for critical status", () => {
    expect(calculateMarkerScore({ status: "critical" })).toBe(30);
  });
});

describe("calculateGlobalScore", () => {
  it("should calculate weighted average correctly", () => {
    const markers = [
      /* 39 test markers */
    ];
    const score = calculateGlobalScore(markers);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

2. **Parser AI analysis** (`lib/bloodAnalysisParser.ts`):
```typescript
describe("parseAIAnalysis", () => {
  it("should parse systems sections", () => {
    const markdown = `## Système Hormonal\nContent...`;
    const parsed = parseAIAnalysis(markdown);
    expect(parsed.systems).toHaveLength(1);
    expect(parsed.systems[0].title).toBe("Système Hormonal");
  });
});
```

3. **Percentile ranking** (`lib/percentileCalculator.ts`):
```typescript
describe("calculatePercentile", () => {
  it("should return percentile for valid marker", () => {
    const percentile = calculatePercentile("testosterone_total", 520, 32, "male");
    expect(percentile).toBeGreaterThan(0);
    expect(percentile).toBeLessThanOrEqual(100);
  });

  it("should return null for invalid marker", () => {
    const percentile = calculatePercentile("invalid_marker", 100, 30, "male");
    expect(percentile).toBeNull();
  });
});
```

### Tests Intégration

**Scénarios à tester**:

1. **Navigation flow**:
   - Overview → Biomarkers → Analysis → Protocol → Sources
   - Sidebar sync avec active tab
   - Browser back/forward buttons

2. **Filter & search**:
   - Filter par panel (Hormones, Thyroïde, etc.)
   - Search par nom marqueur
   - Reset filters

3. **Modal interactions**:
   - Ouvrir modal depuis card
   - Naviguer entre tabs modal
   - Fermer modal (X, backdrop, ESC key)

4. **Theme switching**:
   - Toggle dark → light → dark
   - Persistence après refresh
   - Tous composants respectent theme

### Tests Performance

**Métriques cibles**:

- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

**Outils**:
- Lighthouse (Chrome DevTools)
- WebPageTest.org
- Bundle analyzer (vite-bundle-visualizer)

**Optimisations si nécessaire**:
- Code splitting tabs (lazy load)
- Image optimization (si ajout images futures)
- Memoization composants lourds (radars, tables)
- Virtualization si >100 marqueurs (unlikely)

### Tests Accessibilité

**Checklist WCAG 2.1 AA**:

- [ ] Keyboard navigation: Tab, Shift+Tab, Enter, Esc
- [ ] Focus visible sur tous éléments interactifs
- [ ] Contraste couleurs ≥4.5:1 (text), ≥3:1 (UI)
- [ ] Labels sur tous form inputs
- [ ] ARIA labels sur icônes seules
- [ ] Headings hiérarchie correcte (h1 > h2 > h3)
- [ ] Skip links pour navigation rapide
- [ ] Screen reader friendly (test NVDA/VoiceOver)

**Outils**:
- axe DevTools (Chrome extension)
- WAVE (Web Accessibility Evaluation Tool)
- Lighthouse accessibility audit

---

## 11. MIGRATION & ROLLOUT

### Plan Migration

**Option A: Big Bang** (recommandé si 0 users actuels):
1. Développer refonte complète dans feature branch
2. Tester exhaustivement
3. Merge + deploy d'un coup
4. Monitorer 48h post-deploy

**Option B: Progressive** (si users existants):
1. Feature flag `BLOOD_DASHBOARD_V2`
2. Deploy refonte accessible via query param `?v=2`
3. Beta test avec 10-20% users
4. Fix bugs + polish
5. Rollout 100%
6. Supprimer ancien code après 2 semaines

### Rollback Plan

**Si bugs critiques post-deploy**:

1. **Hotfix**: Si bug mineur (styling, texte), fix + redeploy <1h
2. **Rollback**: Si bug majeur (crash, data incorrect), rollback version précédente
3. **Communication**: Notifier users si downtime >5min

**Rollback commandes**:
```bash
# Revert dernier commit
git revert HEAD
git push origin main

# Ou rollback Render deployment
# Via dashboard Render.com → Manual Deploy → Select previous commit
```

### Monitoring Post-Deploy

**Métriques à tracker (7 jours)**:

1. **Erreurs JS** (Sentry):
   - Taux erreur <0.1% sessions
   - 0 erreurs critiques (crash page)

2. **Performance** (Google Analytics):
   - Page load time <3s (p50), <5s (p95)
   - Bounce rate <20%

3. **Engagement** (Analytics custom events):
   - Temps moyen/page: 2-4min (Overview), 3-5min (Biomarkers)
   - Tabs visitées: moyenne 3-4/6 tabs
   - Modal ouvertures: 5-10 marqueurs/session

4. **Feedback users**:
   - NPS survey (email J+3 post-deploy)
   - Support tickets: catégoriser bugs vs feature requests

**Alertes critiques**:
- Error rate >1% → Slack alert immediate
- Page load >10s → Investigation performance
- Crash rate >0.5% → Rollback considéré

---

## 12. DOCUMENTATION FINALE

### README pour développeurs

**À créer**: `BLOOD_DASHBOARD_REFONTE.md`

```markdown
# Blood Analysis Dashboard - Refonte v2.0

## Architecture

- **Tab system**: 6 tabs (Overview, Biomarkers, Analysis, Protocol, Trends, Sources)
- **Sidebar navigation**: Fixed left, progress tracking
- **Theme**: Dark/Light toggle visible (top-right header)
- **Modal détails**: 2000-3000 mots par marqueur critique

## Structure fichiers

```
client/src/components/blood/
├── BloodTabs.tsx (main tab system)
├── BloodSidebar.tsx (navigation)
├── tabs/ (6 tab components)
├── biomarkers/ (cards + modal)
├── overview/ (score + radars)
├── analysis/ (AI parsing)
└── protocol/ (timeline + supplements)
```

## Développement local

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
npm run test:coverage
```

## Build production

```bash
npm run build
npm run preview
```

## Algorithmes clés

- **Score calcul**: optimal=100, normal=80, suboptimal=55, critical=30
- **Global score**: weighted avg (hormonal 25%, metabolic 20%, etc.)
- **Percentile ranking**: interpolation linéaire vs reference data
- **Derived metrics**: anabolicIndex, recompReadiness, diabetesRisk

## Content guidelines

- **Biomarker details**: 2000-3000 words (Définition 700-900, Impact 800-1000, Protocole 800-1200)
- **AI analysis**: Structured markdown with ## headers for parsing
- **Citations**: Format "Author et al. (Year). Title. Journal. DOI."

## Performance targets

- FCP <1.5s, LCP <2.5s, TTI <3.5s
- Bundle size <500KB gzipped
- Lighthouse score >90/100

## Maintenance

- Update bloodBiomarkerDetailsExtended.ts quand nouveaux marqueurs
- Review percentile data yearly (age/sex cohorts)
- Monitor Sentry errors weekly
```

---

## 13. CONCLUSION

### Résumé Effort

**Total estimé**: 24-35 heures

**Breakdown détaillé**:
- Phase 1 (Tab system): 8-12h
- Phase 2 (Sidebar): 2-3h
- Phase 3 (Biomarkers): 4-6h
- Phase 4 (Radars): 3-4h
- Phase 5 (Analysis): 6-8h
- Phase 6 (Protocol): 3-4h
- Phase 7 (Theme toggle): 30min
- Phase 8 (Testing): 2-3h

### Amélioration vs État Actuel

**Avant** (Score: 2/10):
- ❌ Scroll infini 8,000-12,000px
- ❌ Pas d'onglets
- ❌ 1 seul radar buried
- ❌ Dark theme caché
- ❌ Analyses 30x trop courtes
- ❌ Layout amateur

**Après** (Score cible: 9/10):
- ✅ 6 onglets organisés
- ✅ Navigation sidebar avec progress
- ✅ 3 radars visibles (Overview)
- ✅ Dark theme accessible (toggle header)
- ✅ Modal détails 2000-3000 mots
- ✅ Layout professionnel grid 3 cols
- ✅ Timeline protocole actionnable
- ✅ AI analysis structurée

### Prochaines Étapes

**Immédiat** (post-implémentation):
1. Lancer développement Phase 1 (Tab system)
2. Créer 3-5 marqueurs prioritaires dans bloodBiomarkerDetailsExtended.ts
3. Tester tab navigation + animations

**Court-terme** (semaine 2-3):
1. Compléter Phase 2-6
2. Tests exhaustifs (unit, intégration, performance)
3. Deploy staging + beta test

**Moyen-terme** (mois 2-3):
1. Compléter 39 marqueurs (2000-3000 mots chacun)
2. Optimiser parser AI analysis
3. Implémenter Trends tab (v2.1) avec graphs historiques

**Long-terme** (6 mois+):
1. Multi-language support (EN, ES, DE)
2. PDF export rapport complet
3. API publique pour intégrations externes

---

## 14. CONTACT & SUPPORT

**Questions implémentation**:
- Créer GitHub issue dans repo neurocore
- Tag: `blood-dashboard-refonte`

**Bugs post-deploy**:
- Sentry dashboard: https://sentry.io/neurocore
- Slack channel: #blood-dashboard-bugs

**Feature requests**:
- GitHub discussions
- User feedback form in-app

---

**FIN DES SPECS**

*Document version: 1.0*
*Date: 2026-01-28*
*Auteur: Claude Sonnet 4.5 pour ACHZOD*
*Status: Implémentation-ready*

