# BLOOD ANALYSIS - SPECS PREMIUM (Inspiré Ultrahuman Blood Vision)

## EXECUTIVE SUMMARY

Dashboard Blood Analysis premium style Ultrahuman: minimal, data-dense, professionnel.
39 biomarqueurs analysés, ranges optimaux Huberman/Attia, protocoles actionnables.
Prix: 99€ one-time (MVP gratuit temporaire).

---

## 1. STRUCTURE & INFORMATION ARCHITECTURE

### **Page Produit** (`/offers/blood-analysis`)

```
SECTION 1: Hero
├── Headline: "Analyse Sanguine Avancée. 39 Biomarqueurs Optimaux."
├── Subheadline: "Déchiffre le langage caché de ton corps avec Claude Opus 4.5"
├── Trust signals: "4.7★ · 1800+ analyses · GDPR Compliant"
├── CTA Primary: "Analyser Mon Bilan — GRATUIT (MVP)"
├── CTA Secondary: "Voir un exemple de rapport"
└── Payment methods: [Stripe] [PayPal] [Crypto]

SECTION 2: Process (3 Steps)
├── Step 1: "Upload ton PDF" + icon
├── Step 2: "Analyse IA en 24h"
└── Step 3: "Reçois ton protocole"

SECTION 3: Biomarqueurs Coverage
├── "39 biomarqueurs · 6 panels d'analyse"
├── Expandable accordion par catégorie:
│   ├── 🟣 Panel Hormonal (10 marqueurs)
│   ├── 🔵 Panel Thyroïdien (5 marqueurs)
│   ├── 🔴 Panel Métabolique (9 marqueurs)
│   ├── 🟠 Panel Inflammatoire (5 marqueurs)
│   ├── 🟢 Panel Vitamines (5 marqueurs)
│   └── 🟦 Panel Hépatique/Rénal (5 marqueurs)
└── "Ranges optimaux vs normaux (Huberman, Attia, Examine)"

SECTION 4: Dashboard Preview (Bento Grid)
├── [Card] "Radars visuels interactifs"
├── [Card] "Détection patterns à risque"
├── [Card] "Protocoles de correction"
├── [Card] "Stack suppléments optimisé"
├── [Card] "Rapport PDF complet"
└── [Card] "Support par email"

SECTION 5: ⚠️ PDF Password Warning
├── Amber alert box
├── "PDF sans mot de passe requis"
├── Links: iLovePDF, SmallPDF
└── Icon: Alert triangle SVG

SECTION 6: Pricing
├── "99€ one-time" (crossed out: €149)
├── "Tout inclus" list
└── CTA: "Analyser Maintenant"

SECTION 7: FAQ (Accordion)
├── "Quels biomarqueurs sont analysés ?"
├── "Combien de temps pour les résultats ?"
├── "Puis-je commander un nouveau test sanguin ?"
├── "Les ranges sont-ils optimaux ou normaux ?"
├── "Que se passe-t-il si mon PDF a un mot de passe ?"
├── "Est-ce que c'est remboursé par la sécu ?"
└── "Comment recevoir mon rapport ?"

SECTION 8: Final CTA
├── "Prêt à optimiser ta santé ?"
└── CTA: "Lancer Mon Blood Analysis — 99€"
```

### **Dashboard Principal** (`/blood-dashboard/:reportId`)

```
LAYOUT: Sidebar + Main Content (67% / 33% desktop split)

SIDEBAR (Fixed Left, 280px)
├── Logo APEXLABS
├── Client Name + Email
├── Global Score Badge (radial, animated)
├── Navigation Tabs:
│   ├── [Icon] Overview
│   ├── [Icon] Biomarqueurs
│   └── [Icon] Insights
├── Theme Switcher (Light/Dark)
├── Export PDF Button
└── Scroll Progress Bar

MAIN CONTENT - TAB 1: OVERVIEW
├── Hero Score Card
│   ├── Radial gauge (Ultrahuman style)
│   ├── Score global /100
│   ├── Status: "Optimal" | "Normal" | "Action Requise"
│   └── Date du test
├── 6 Category Cards (Grid 2x3)
│   ├── Panel Hormonal → Score + status badge
│   ├── Panel Thyroïdien → Score + status badge
│   ├── Panel Métabolique → Score + status badge
│   ├── Panel Inflammatoire → Score + status badge
│   ├── Panel Vitamines → Score + status badge
│   └── Panel Hépatique → Score + status badge
├── Radar Chart (Systemic View)
│   ├── 6 axes (un par panel)
│   ├── Color-coded segments par status
│   └── Hover tooltips avec détails
└── Top 3 Action Items
    ├── Priority badges (High/Medium/Low)
    ├── Biomarqueur concerné
    └── Protocole recommandé (collapsed)

MAIN CONTENT - TAB 2: BIOMARQUEURS
├── Category Tabs (Sticky Top)
│   ├── [Tab] Tous (39)
│   ├── [Tab] Hormonal (10)
│   ├── [Tab] Thyroïde (5)
│   ├── [Tab] Métabolique (9)
│   ├── [Tab] Inflammatoire (5)
│   ├── [Tab] Vitamines (5)
│   └── [Tab] Hépatique/Rénal (5)
├── Biomarker Cards (Grid 1-col mobile, 2-col tablet, 3-col desktop)
│   ├── Header:
│   │   ├── Name + unit
│   │   ├── Status badge (color-coded)
│   │   └── Value (large, bold)
│   ├── Range Indicator
│   │   ├── Visual bar avec zones (critical/sub/normal/optimal)
│   │   ├── Current value marker
│   │   └── Labels: Normal [X-Y] · Optimal [X-Y]
│   ├── Trend Chart (mini sparkline si historique)
│   ├── Interpretation (collapsible)
│   │   ├── "Ton résultat"
│   │   └── Context Huberman/Attia
│   └── Recommendations (collapsible)
│       ├── Suppléments (dosages précis)
│       ├── Nutrition
│       └── Lifestyle
└── Filters: [Status: All/Optimal/Action] [Sort: Name/Status/Value]

MAIN CONTENT - TAB 3: INSIGHTS
├── AI Summary Card
│   ├── "Synthèse IA - Claude Opus 4.5"
│   ├── Résumé global (3-4 paragraphes)
│   └── Tone: Professionnel, actionnable
├── Detected Patterns
│   ├── Pattern cards avec badges
│   ├── "Résistance insuline détectée"
│   ├── Biomarqueurs impliqués (badges)
│   └── Causes + corrections
├── Protocol Stack
│   ├── "Ton Stack Optimisé"
│   ├── Morning supplements
│   ├── Evening supplements
│   ├── Nutrition guidelines
│   └── Lifestyle adjustments
├── Progress Projections (si historique)
│   ├── Trend charts projections
│   └── "Si tu suis les protocoles..."
└── Export Options
    ├── Download PDF button
    ├── Share link (copy to clipboard)
    └── Print-friendly view
```

---

## 2. DESIGN SYSTEM ULTRA-PRÉCIS

### **Color Palette**

```typescript
// Brand Colors
const BRAND = {
  primary: "#0171e3",       // Electric blue (Ultrahuman style)
  primaryHover: "#0060c9",
  accent: "#FCDD00",        // Yellow (APEXLABS signature)
  dark: "#000000",
  darkSurface: "#0a0a0a",
  light: "#FFFFFF",
  lightSurface: "#f7f7f7",
};

// Biomarker Status Colors
const STATUS = {
  optimal: {
    primary: "#10B981",     // Green
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.2)",
    text: "#059669",
  },
  normal: {
    primary: "#3B82F6",     // Blue
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.2)",
    text: "#2563EB",
  },
  suboptimal: {
    primary: "#F59E0B",     // Amber
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.2)",
    text: "#D97706",
  },
  critical: {
    primary: "#EF4444",     // Red
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.2)",
    text: "#DC2626",
  },
};

// Neutral Palette
const NEUTRAL = {
  text: {
    primary: "#000000",
    secondary: "rgba(0, 0, 0, 0.6)",
    tertiary: "rgba(0, 0, 0, 0.4)",
  },
  border: {
    light: "rgba(0, 0, 0, 0.08)",
    medium: "rgba(0, 0, 0, 0.12)",
    strong: "rgba(0, 0, 0, 0.2)",
  },
  bg: {
    surface: "#fafafa",
    hover: "#f5f5f5",
  },
};

// Dark Mode Overrides
const DARK = {
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.7)",
    tertiary: "rgba(255, 255, 255, 0.5)",
  },
  border: {
    light: "rgba(255, 255, 255, 0.08)",
    medium: "rgba(255, 255, 255, 0.12)",
    strong: "rgba(255, 255, 255, 0.2)",
  },
  bg: {
    base: "#000000",
    surface: "#0a0a0a",
    hover: "#1a1a1a",
  },
};
```

### **Typography System**

```typescript
// Font Family
fontFamily: "'Graphik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// Type Scale
const TYPE_SCALE = {
  hero: {
    size: "48px",           // Mobile: 32px
    weight: 500,
    lineHeight: "1.1",
    letterSpacing: "-2.72px",
  },
  h1: {
    size: "40px",           // Mobile: 28px
    weight: 500,
    lineHeight: "1.2",
    letterSpacing: "-1.6px",
  },
  h2: {
    size: "32px",           // Mobile: 24px
    weight: 500,
    lineHeight: "1.3",
    letterSpacing: "-1.28px",
  },
  h3: {
    size: "24px",           // Mobile: 20px
    weight: 500,
    lineHeight: "1.4",
    letterSpacing: "-0.72px",
  },
  h4: {
    size: "20px",
    weight: 500,
    lineHeight: "1.4",
    letterSpacing: "-0.4px",
  },
  body: {
    size: "16px",
    weight: 400,
    lineHeight: "1.5",
  },
  bodySmall: {
    size: "14px",
    weight: 400,
    lineHeight: "1.5",
  },
  caption: {
    size: "13px",
    weight: 400,
    lineHeight: "1.3",
  },
  button: {
    size: "15px",
    weight: 500,
    lineHeight: "1",
  },
};
```

### **Spacing System**

```typescript
// Base unit: 4px
const SPACING = {
  xs: "4px",      // 0.25rem
  sm: "8px",      // 0.5rem
  md: "12px",     // 0.75rem
  lg: "16px",     // 1rem
  xl: "24px",     // 1.5rem
  "2xl": "32px",  // 2rem
  "3xl": "48px",  // 3rem
  "4xl": "64px",  // 4rem
  "5xl": "96px",  // 6rem
};

// Section Padding
const SECTION_PADDING = {
  mobile: "4.8rem 1.6rem",    // 48px top/bottom, 16px left/right
  desktop: "10rem 2.4rem",    // 100px top/bottom, 24px left/right
};

// Card Padding
const CARD_PADDING = {
  mobile: "16px",
  tablet: "24px",
  desktop: "32px",
};

// Gap Patterns
const GAP = {
  tight: "8px",
  base: "12px",     // Mobile default
  comfortable: "16px",
  spacious: "24px", // Desktop default
};
```

### **Border Radius**

```typescript
const BORDER_RADIUS = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
};
```

### **Shadows**

```typescript
const SHADOWS = {
  card: "0px 0px 4px rgba(0, 0, 0, 0.04)",
  cardHover: "0px 4px 12px rgba(0, 0, 0, 0.08)",
  button: "0px 2px 8px rgba(1, 113, 227, 0.2)",
  modal: "0px 8px 32px rgba(0, 0, 0, 0.12)",
};
```

---

## 3. COMPONENTS UI À CRÉER

### **StatusBadge.tsx**

```typescript
interface StatusBadgeProps {
  status: 'optimal' | 'normal' | 'suboptimal' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

// Visual:
// [●] Optimal
// [!] Suboptimal
// [⚠] Critical
// [ⓘ] Normal

// Styling:
- Rounded pill (border-radius: 9999px)
- Background: status.bg
- Border: 1px solid status.border
- Text: status.text
- Icon + Label horizontal
- Padding: 4px 12px (sm), 6px 16px (md), 8px 20px (lg)
```

### **BiomarkerRangeIndicator.tsx**

```typescript
interface BiomarkerRangeIndicatorProps {
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  optimalMin?: number;
  optimalMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

// Visual:
// [====|-------|=====]
//   Critical | Normal | Critical
//     Sub  | Optimal | Sub
//           ▲ (current value marker)
//
// Labels below:
// Critical < X | Normal X-Y | Optimal X-Y | Critical > Z

// Styling:
- Height: 8px bar
- Zones color-coded (gradients between zones)
- Current value: Triangle marker above bar
- Tooltip on hover: "Ton résultat: X unit"
- Legend below: small text (13px), gray
```

### **BiomarkerCard.tsx** (Refactored)

```typescript
interface BiomarkerCardProps {
  marker: BiomarkerResult;
  showTrend?: boolean;
  defaultExpanded?: boolean;
}

// Structure:
<Card>
  <Header>
    <Name + Unit>
    <StatusBadge status={marker.status} />
  </Header>

  <Value large bold color-coded>
    {marker.value} {marker.unit}
  </Value>

  <BiomarkerRangeIndicator {...marker} />

  {showTrend && marker.history && (
    <TrendSparkline data={marker.history} />
  )}

  <Collapsible title="Interprétation">
    <Text>{marker.interpretation}</Text>
  </Collapsible>

  <Collapsible title="Recommandations">
    <RecommendationList items={marker.recommendations} />
  </Collapsible>
</Card>

// Styling:
- Background: white (dark: #0a0a0a)
- Border: 1px solid neutral.border.light
- Border-radius: 16px
- Padding: 24px (mobile: 16px)
- Shadow: SHADOWS.card
- Hover: SHADOWS.cardHover + scale(1.01)
- Transition: all 0.3s ease
```

### **CategoryScoreCard.tsx**

```typescript
interface CategoryScoreCardProps {
  category: string;
  icon: ReactNode;
  score: number;
  markerCount: number;
  status: 'optimal' | 'normal' | 'action';
}

// Visual:
// [Icon] Panel Hormonal
// 87/100
// [●] Optimal · 10 marqueurs
//
// Mini progress bar at bottom

// Styling:
- Same as BiomarkerCard base
- Icon: 48px, color-coded par category
- Score: 36px bold
- Status row: 14px, gray + badge
- Progress bar: 4px height, color-coded
```

### **RadialScoreGauge.tsx** (Ultrahuman style)

```typescript
interface RadialScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  status: 'optimal' | 'normal' | 'action';
}

// Visual:
// Circular progress (semi-circle ou full circle)
// Animated fill on mount
// Score inside (large number)
// Status label below

// Styling:
- SVG-based
- Gradient stroke color-coded
- Animation: stroke-dashoffset transition 1.5s ease
- Glow effect on optimal status
```

### **BiomarkerTrendChart.tsx**

```typescript
interface BiomarkerTrendChartProps {
  data: { date: string; value: number }[];
  normalRange: [number, number];
  optimalRange?: [number, number];
  unit: string;
}

// Using Recharts LineChart
// Features:
- Area fill for optimal/normal ranges (behind line)
- Line stroke color-coded par zone
- Dot on current value (larger)
- Tooltip avec date + value
- X-axis: dates (formatted)
- Y-axis: values + unit
- Grid: subtle (rgba opacity 0.1)
```

### **ActionItemCard.tsx**

```typescript
interface ActionItemCardProps {
  priority: 'high' | 'medium' | 'low';
  biomarker: string;
  protocol: string;
  details?: string;
}

// Visual:
// [!] HIGH PRIORITY
// Testostérone totale → 420 ng/dL
// Protocole: Zinc + Vit D + Sommeil
// [Expand for details ▼]

// Styling:
- Border-left: 4px solid (red/amber/blue selon priority)
- Background: priority.bg (subtle)
- Collapsible details section
- Icon badge for priority
```

---

## 4. COPY & MESSAGING FORMULAS

### **Headlines Pattern**

```
Formula: [Action Verb] + [Specific Metric] + [Timeframe/Outcome]

Exemples:
✅ "Décode Ton Sang. Optimise Ta Biologie. Deviens Apex."
✅ "39 Biomarqueurs Analysés. Protocoles Personnalisés. 24h."
✅ "Ranges Optimaux vs Normaux. Protocoles Evidence-Based."
```

### **Value Props Structure**

```
Formula: [Specific Number] + [Benefit Verb] + [Authority Reference]

Exemples:
✅ "39 biomarqueurs analysés selon ranges optimaux Huberman/Attia"
✅ "6 panels d'analyse avec protocoles evidence-based"
✅ "Claude Opus 4.5 analyse tes résultats en 24-48h"
```

### **CTA Wording Hierarchy**

```
Primary CTA:
- "Analyser Mon Bilan — GRATUIT (MVP)"
- "Lancer Mon Blood Analysis — 99€"
- "Décode Ton Sang Maintenant"

Secondary CTA:
- "Voir un Exemple de Rapport"
- "Parler à un Expert"
- "En Savoir Plus"

Tertiary:
- "Télécharger un Exemple PDF"
- "Lire la Méthodologie"
```

### **Trust Signals Language**

```
✅ "4.7★ basé sur 1800+ analyses"
✅ "Protocoles validés par Huberman Lab, Peter Attia, Examine.com"
✅ "Claude Opus 4.5 — Le modèle IA le plus avancé"
✅ "RGPD Compliant · Données cryptées"
✅ "Support expert disponible"
```

### **Objections Handling Copy**

```
Objection: "C'est quoi la différence avec mon labo ?"
→ "Les labos donnent des ranges NORMAUX (moyenne population).
   Nous donnons des ranges OPTIMAUX (performance maximale).
   Exemple: Testostérone 'normale' > 300. Optimale > 600."

Objection: "99€ c'est cher"
→ "Prix d'une consultation nutritionniste: 80-150€
   Prix d'un bilan labo complet: 200-400€
   Blood Analysis: 99€ one-time, tout inclus."

Objection: "Je ne comprends rien aux analyses"
→ "Chaque biomarqueur a une interprétation claire en français.
   Protocoles actionnables (dosages précis, marques recommandées).
   Support expert par email inclus."
```

---

## 5. FEATURES À IMPLÉMENTER (PAR PRIORITÉ)

### **Phase 1: MVP Core (URGENT)**

✅ Upload PDF bloodwork
✅ Extract biomarkers (manual input pour MVP)
✅ Analyze 39 biomarkers avec ranges optimaux
✅ Generate AI report (Claude Opus 4.5)
✅ Display dashboard avec 3 tabs (Overview/Biomarkers/Insights)
✅ Export PDF report
✅ Email delivery

**Tech Stack:**
- Frontend: React + TypeScript + Recharts + Framer Motion
- Backend: Node.js + Express (déjà fait)
- DB: PostgreSQL bloodAnalysisReports table (déjà fait)
- AI: Claude Opus 4.5 API (déjà configuré)

**Timeline: 2 semaines**

### **Phase 2: Premium Features (1 mois)**

🔲 OCR extraction automatique (Tesseract.js ou Google Vision API)
🔲 Multi-test comparison (historical tracking)
🔲 Trend charts pour chaque biomarker
🔲 Smart recommendations engine (règles + IA)
🔲 Supplement stack builder (Amazon Affiliate links)
🔲 Share report link (public/private toggle)
🔲 Mobile app (React Native)

### **Phase 3: Advanced (2-3 mois)**

🔲 Coaching intégration (book call avec expert)
🔲 Lab test ordering (partnership avec labos)
🔲 Recurring tests (subscription model)
🔲 Community features (compare anonyme)
🔲 API pour intégration tierces (Oura, WHOOP, etc.)

---

## 6. UX PATTERNS CRITIQUES

### **Onboarding Flow**

```
1. Landing /offers/blood-analysis
   → CTA "Analyser Mon Bilan"

2. Upload page /blood-analysis/upload
   → Drag & drop PDF
   → ⚠️ Warning si PDF password
   → Progress bar

3. Questionnaire /blood-analysis/questionnaire
   → 5-7 questions:
     - Sexe (homme/femme)
     - Âge
     - Objectifs (muscle, fat loss, energy, longevity)
     - Médicaments actuels
     - Suppléments actuels
   → Progress indicator (5/7)

4. Processing /blood-analysis/processing/:reportId
   → Animated loading state
   → "Claude Opus 4.5 analyse tes 39 biomarqueurs..."
   → Estimated time: 30s - 2min

5. Dashboard /blood-dashboard/:reportId
   → Full report avec 3 tabs
   → Email sent confirmation
```

### **Navigation Patterns**

```
Mobile:
- Bottom tab bar (3 icons + labels)
- Hamburger menu pour sidebar
- Swipe gestures entre tabs

Desktop:
- Fixed sidebar left (280px)
- Main content 67% width
- Right panel 33% (sticky action items)
- Smooth scroll behavior
```

### **Micro-interactions**

```
✅ Card hover: scale(1.01) + shadow transition
✅ Button hover: background darken + shadow
✅ Collapsible: smooth height transition (300ms)
✅ Score gauge: animated fill on mount (1500ms)
✅ Status badge: pulse animation si critical
✅ Tooltip: fade-in 200ms delay
✅ Page transitions: fade 300ms
```

### **Loading States**

```
✅ Skeleton screens (not spinners)
✅ Progressive loading: Hero → Cards → Charts
✅ Lazy load images/charts
✅ Suspense boundaries avec fallbacks
```

### **Error Handling**

```
✅ PDF upload errors → inline message + retry
✅ API errors → toast notification + contact support
✅ Missing data → placeholder + "Contacte-nous"
✅ Network errors → offline banner + retry
```

---

## 7. CONVERSION OPTIMIZATION

### **Trust Signals Placement**

```
Hero section:
✅ Reviews count + rating (4.7★ · 1800+)
✅ Payment methods (Stripe, PayPal, Crypto)
✅ GDPR badge

Before pricing:
✅ "Utilisé par 1800+ biohackers"
✅ Testimonials carousel (3-4 reviews)

Footer:
✅ Compliance: RGPD, ISO27001, Hébergé en EU
✅ Security: Données cryptées, HTTPS
```

### **Friction Reduction**

```
✅ No account creation required (email only)
✅ Magic link login (pas de password)
✅ Single-page checkout (Stripe embedded)
✅ Multiple payment methods
✅ Auto-save questionnaire progress
✅ Resume upload si interruption
```

### **Urgency/Scarcity**

```
❌ PAS de countdown timers (cringe)
❌ PAS de "Plus que 3 places" (fake scarcity)

✅ "MVP Gratuit - Profite avant lancement officiel"
✅ "Early adopter pricing: 99€ (val. 149€)"
✅ "Support prioritaire pour les 100 premiers"
```

### **Social Proof Strategy**

```
✅ Review cards avec:
   - Avatar + Name
   - Before/After metrics (ex: Testo 350→620)
   - Quote (2-3 lignes max)
   - Date

✅ Stats highlights:
   - "1800+ analyses réalisées"
   - "4.7★ moyenne satisfaction"
   - "92% recommandent à un ami"
```

---

## 8. RESPONSIVE BREAKPOINTS

```typescript
const BREAKPOINTS = {
  xs: "475px",    // Large phones
  sm: "640px",    // Tablets portrait
  md: "768px",    // Tablets landscape
  lg: "1024px",   // Desktop
  xl: "1280px",   // Large desktop
  "2xl": "1536px", // Ultra-wide
};

// Layout Shifts:
// < 768px: Single column, stacked cards, bottom nav
// 768px - 1024px: 2 columns, sidebar collapsible
// > 1024px: Fixed sidebar + 67%/33% split
```

---

## 9. PERFORMANCE REQUIREMENTS

```
✅ Lighthouse Score > 90 (all metrics)
✅ First Contentful Paint < 1.5s
✅ Time to Interactive < 3s
✅ Cumulative Layout Shift < 0.1
✅ Bundle size < 300KB (gzipped)
✅ Chart rendering < 500ms
✅ API response time < 2s (p95)
```

**Optimizations:**
- Code splitting par route
- Lazy load charts (React.lazy)
- Image optimization (WebP, lazy loading)
- CDN pour static assets
- Memoization (React.memo, useMemo)
- Virtualization si >50 biomarkers

---

## 10. DARK MODE IMPLEMENTATION

### **Nouveau Thème: "Blood Vision Dark"**

```typescript
{
  id: "blood-vision-dark",
  name: "Blood Vision Dark",
  type: "dark",
  colors: {
    primary: "#0171e3",       // Electric blue
    accent: "#FCDD00",        // Yellow
    background: "#000000",    // Pure black
    surface: "#0a0a0a",       // Slightly lighter
    surfaceHover: "#1a1a1a",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textTertiary: "rgba(255, 255, 255, 0.5)",

    // Status colors (same as light)
    optimal: "#10B981",
    normal: "#3B82F6",
    suboptimal: "#F59E0B",
    critical: "#EF4444",

    // Chart colors
    grid: "rgba(255, 255, 255, 0.05)",
    axis: "rgba(255, 255, 255, 0.2)",
    tooltip: "#1a1a1a",
  },
}
```

### **Toggle Implementation**

```typescript
// Persisté dans localStorage
// Toggle button dans sidebar
// Smooth transition (300ms) sur tous backgrounds/colors
// No flash on page load (SSR ou script in <head>)
```

---

## CONCLUSION & NEXT STEPS

**Objectif:** Dashboard premium niveau Ultrahuman pour Blood Analysis.

**Priorité 1 (2 semaines):**
1. Implémenter design system (colors, typo, spacing)
2. Créer composants base (StatusBadge, RangeIndicator, BiomarkerCard)
3. Dashboard 3-tab fonctionnel (Overview/Biomarkers/Insights)
4. Responsive mobile-first
5. Dark mode support

**Priorité 2 (1 mois):**
6. Trend charts pour historiques
7. AI Insights generation
8. PDF export pro
9. Onboarding flow complet
10. Performance optimization

**Priorité 3 (2-3 mois):**
11. OCR automatique
12. Multi-test comparison
13. Supplement stack builder
14. Mobile app

---

## CHECKLIST QUALITÉ

Avant de considérer le dashboard "prêt":

✅ Design matches Ultrahuman quality level
✅ All 39 biomarkers displayable
✅ Color-coded status system cohérent
✅ Mobile responsive parfait
✅ Dark mode sans bugs
✅ Charts performants (< 500ms render)
✅ Animations smooth (60fps)
✅ Accessibility WCAG 2.1 AA
✅ Error states handled
✅ Loading states élégants
✅ Copy professionnel sans fautes
✅ Trust signals présents
✅ CTA visibles mais pas agressifs
✅ Export PDF fonctionne
✅ Email delivery OK

**Si un seul ❌ → pas prêt pour production.**

---

*Specs basées sur analyse Ultrahuman Blood Vision + best practices Oura/WHOOP*
*Version 1.0 - 22 Jan 2026*
