# 🚀 PRISE EN MAIN COMPLÈTE - PROJET NEUROCORE

**Date:** 31 janvier 2026
**Objectif:** Reprendre le relai complet du développement
**Statut:** Production (https://neurocore-360.onrender.com)

---

## 📊 VUE D'ENSEMBLE

### Stack Technique

**Frontend:**
- React 18.3.1 + TypeScript 5.6.3
- Vite 5.4.21 (build ultra-rapide)
- TailwindCSS 3.4.17 + design system custom
- Framer Motion 11.13.1 (animations)
- React Query 5.60.5 (data fetching)
- Wouter 3.3.5 (routing léger)
- Radix UI (composants accessibles)

**Backend:**
- Node.js + Express 4.21.2
- TypeScript 5.6.3 (exécuté via tsx)
- PostgreSQL + Drizzle ORM 0.39.3
- Multi-IA: Claude Opus 4.5, Gemini 2.0, GPT-4o

**Services tiers:**
- SendPulse (email marketing)
- Stripe (paiements)
- Terra API (wearables)
- Puppeteer (OCR/PDF)

### Architecture Projet

```
neurocore-github/
├── client/              # Frontend React
│   ├── src/
│   │   ├── pages/      # 38 pages (Landing, Rapports, Dashboard, Blog)
│   │   ├── components/ # UI + Blood + Apex + Ultrahuman
│   │   ├── lib/        # Utils, query client, markdown, scores
│   │   ├── data/       # Biomarqueurs, articles, citations
│   │   └── styles/     # Typography, theme, effects, responsive
│   └── public/         # Assets statiques
│
├── server/             # Backend Express
│   ├── index.ts        # Entry point (port 5000)
│   ├── routes.ts       # TOUS les endpoints (3557 lignes!)
│   ├── storage.ts      # Couche DB (2540 lignes)
│   ├── blood-analysis/ # Moteur analyse sang (105KB)
│   └── knowledge/      # Base de connaissances
│
├── shared/             # Code partagé
│   └── drizzle-schema.ts # Schema DB PostgreSQL
│
└── migrations/         # DB migrations
```

---

## 🎯 LES 5 PRODUITS PRINCIPAUX

### 1. Discovery Scan (GRATUIT)
- **Type:** Audit santé de base
- **Questions:** 50+
- **IA:** Claude Opus 4.5
- **Output:** Rapport 8 sections + dashboard Ultrahuman (thème jaune)
- **Route:** `/scan/:auditId`
- **CTA:** Upgrade vers Anabolic (59€)

### 2. Anabolic Bioscan (59€)
- **Type:** Audit complet biohacking
- **Questions:** 150+
- **IA:** Claude Opus 4.5
- **Output:** 16 sections + protocoles matin/soir/digestion
- **Route:** `/anabolic/:auditId`
- **Dashboard:** Ultrahuman (thème émeraude)

### 3. Ultimate Scan (79€)
- **Type:** Audit ultra-complet + photos + wearables
- **Questions:** 183
- **IA:** Claude Opus 4.5 + analyse posturale
- **Output:** 18 sections ultra-détaillées
- **Route:** `/ultimate/:auditId`
- **Dashboard:** Ultrahuman (thème or)

### 4. Blood Analysis (99€) ⚡ FOCUS REFONTE UI/UX
- **Type:** Analyse bilan sanguin
- **Input:** Upload PDF/Photo
- **IA:** Claude Sonnet 4.5
- **Output:** 39 biomarqueurs analysés, 6 panels, protocoles
- **Route:** `/blood-analysis`
- **Statut:** Refonte UI/UX en cours (ULTRA-PREMIUM DESIGN)

### 5. Peptides Engine (99€)
- **Type:** Protocole peptides personnalisé
- **Questions:** 45
- **IA:** Claude Opus 4.5
- **Output:** Stack peptides + dosages + timing
- **Route:** `/peptides/:auditId`
- **Bonus:** Ebook peptides offert

---

## 🩸 BLOOD ANALYSIS - ARCHITECTURE DÉTAILLÉE

### Flow Complet

```
1. UPLOAD
   User upload bilan (PDF/Photo) + questionnaire
   ↓ POST /api/blood-analysis/upload

2. OCR EXTRACTION
   Puppeteer (PDF → Text) + OpenAI Vision (Images)
   Regex parsing → { testosterone: "650 ng/dL", ... }
   ↓

3. VALIDATION
   39 biomarqueurs reconnus
   BIOMARKER_RANGES (Marek Health, Peter Attia, Examine.com)
   Status: optimal|normal|suboptimal|critical
   ↓

4. ANALYSE IA
   Claude Sonnet 4.5
   Input: Markers + Profil patient + Knowledge base
   Output: 6 panels analysés + patterns + protocoles + stack
   ↓

5. STOCKAGE DB
   Table: blood_analysis_reports (PostgreSQL)
   ↓

6. DASHBOARD
   BloodAnalysisDashboard.tsx (Ultrahuman style)
   MetricCard3D + RadialScoreChart + Heatmap + Timeline
```

### Composants Premium (créés par Codex)

```
client/src/components/blood/
├── MetricCard3D.tsx              # Carte 3D parallax hover
├── RadialScoreChart.tsx          # Chart score radial animé
├── InteractiveHeatmap.tsx        # Heatmap 6 catégories cliquable
├── BiomarkerTimeline.tsx         # Timeline évolution
├── ProtocolStepper.tsx           # Stepper protocoles multi-phases
├── CitationTooltip.tsx           # Tooltip citations hover
├── AnimatedStatCard.tsx          # Stat animée avec trend
├── TrendSparkline.tsx            # Sparkline mini-chart
├── ExpandableInsight.tsx         # Insight expandable
└── GradientDivider.tsx           # Divider avec gradient
```

### Panels Analysés (6)

1. **Hormonal Panel** (Testostérone, Estradiol, SHBG, LH, FSH, Prolactine)
2. **Thyroïde Panel** (TSH, T3, T4, Free T3, Free T4, Anti-TPO)
3. **Métabolique Panel** (Glucose, HbA1c, Insuline, HOMA-IR, Lipides)
4. **Inflammation Panel** (CRP, Homocystéine, Ferritine)
5. **Vitamines Panel** (Vitamine D, B12, Folates, Magnésium, Zinc)
6. **Foie/Rein Panel** (ALT, AST, GGT, Créatinine, eGFR)

### Database Schema

```sql
blood_analysis_reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  uploaded_files JSONB,
  extracted_biomarkers JSONB,  -- {testosterone: {value, unit, status}, ...}
  analysis JSONB,               -- Full AI analysis
  ai_report TEXT,               -- Markdown report
  pdf_url TEXT,
  processing_status VARCHAR(20), -- pending|processing|completed|failed
  created_at TIMESTAMP
)
```

---

## 🎨 REFONTE UI/UX EN COURS

### Problème Identifié

User a rejeté le design actuel:
> "je suis desolé mais j'aime pas du tout l'ui ux, l'organisation, le design"

**Issues:**
- Design trop basique/générique (dark mode + quelques glows)
- Layout monotone (2-column vertical)
- Manque de wow factor
- Data visualization absente
- Animations trop subtiles
- Emojis IA dans rapports (😊, 🔬)

### Solution: ULTRA-PREMIUM DESIGN

**Documents créés:**
1. `REFONTE_UI_UX_ULTRA_PREMIUM.md` (3692 lignes) - Design system complet
2. `PROMPT_OPTIMISE_CODEX.md` (1134 lignes) - Instructions chain-of-thought
3. `GUIDE_TECHNIQUE_FRONTEND.md` (1469 lignes) - Architecture production
4. `WORKFLOW_EXECUTABLE.md` (779 lignes) - Checklist exécutable
5. `TROUBLESHOOTING.md` (826 lignes) - 22 erreurs + solutions

**Objectif:**
- Design score: 27 → **92/100** (+241%)
- Style: Ultrahuman/Whoop/Apple Health Pro
- 10 composants innovants
- Animations 60fps
- WCAG AA compliant

**Approche Quick Wins:**
- Phase 1: Foundations (4h) - Typography, Colors, Animations
- Phase 2: Core Components (6h) - MetricCard3D, RadialChart, Heatmap
- Phase 3: Integration (2.5h) - Hero, Overview, Alerts sections
- **Total: 12.5h pour 80% du résultat**

### État Actuel Codex

✅ Codex a lu tous les fichiers d'instructions
✅ Codex a identifié les line ranges corrects dans REFONTE_UI_UX_ULTRA_PREMIUM.md
✅ Codex attend confirmation pour démarrer Phase 1

**Décisions confirmées:**
- ✅ Dark mode (#0a0b0d avec layers premium)
- ✅ Use line ranges found by Codex (937-1165, etc.)
- ✅ Create layout.css et effects.css par consolidation
- ✅ Focus Quick Wins (12.5h)

---

## 🔧 FICHIERS CRITIQUES À CONNAÎTRE

### Frontend

```typescript
// client/src/App.tsx (130 lignes)
// Routing principal
<Route path="/blood-analysis" component={BloodAnalysisStart} />
<Route path="/analysis/:reportId" component={BloodAnalysisDashboard} />

// client/src/pages/BloodAnalysisDashboard.tsx (965 lignes)
// Dashboard principal blood report
// Utilise: React Query, Framer Motion, Radix UI
// Components: MetricCard3D, RadialScoreChart, Heatmap

// client/src/lib/queryClient.ts
// Configuration React Query (staleTime, cacheTime)

// client/src/lib/markdown-utils.tsx (108 lignes)
// Triple-level caching: parsing, normalize, highlight
// Map cache pour éviter re-parsing

// client/src/data/bloodBiomarkerDetails.ts
// Détails 39 biomarqueurs avec ranges optimaux
```

### Backend

```typescript
// server/routes.ts (3557 lignes!)
// TOUS les endpoints API
POST   /api/blood-analysis/upload
POST   /api/blood-analysis/analyze
GET    /api/blood-analysis/report/:reportId
GET    /api/blood-analysis/optimal-ranges/:markerId

// server/blood-analysis/index.ts (105KB!)
// Moteur analyse sang complet
// Functions: extractMarkersFromPdfText(), generateAIBloodAnalysis()
// BIOMARKER_RANGES definitions

// server/storage.ts (2540 lignes)
// Couche abstraction DB
// Functions: createBloodReport(), getBloodReport()

// shared/drizzle-schema.ts
// Schema PostgreSQL complet
// Tables: users, audits, blood_analysis_reports, waitlist_subscribers
```

### Configuration

```typescript
// tsconfig.json
// Paths: "@/*" → "client/src/*", "@shared/*" → "shared/*"

// vite.config.ts
// Alias: @ → client/src, @shared → shared, @assets → attached_assets

// tailwind.config.ts
// Fonts: JetBrains Mono (display/data), IBM Plex Sans (body)
// Colors: blood report status (optimal/normal/suboptimal/critical)

// drizzle.config.ts
// Schema: shared/drizzle-schema.ts
// Dialect: PostgreSQL
```

---

## 🌐 API ENDPOINTS PRINCIPAUX

### Questionnaire & Audits
```
POST   /api/questionnaire/save-progress
GET    /api/questionnaire/progress/:email
POST   /api/audits/create
GET    /api/audits/:id
POST   /api/audits/:id/regenerate
GET    /api/audits/:id/export/pdf|html|zip
```

### Blood Analysis
```
POST   /api/blood-analysis/upload          # Upload bilan + questionnaire
POST   /api/blood-analysis/analyze         # Analyse IA
GET    /api/blood-analysis/report/:id      # Get rapport complet
GET    /api/blood-analysis/biomarkers      # Liste biomarqueurs
GET    /api/blood-analysis/optimal-ranges/:id
```

### Waitlist (ApexLabs)
```
POST   /api/waitlist/subscribe             # Email capture
GET    /api/waitlist/spots                 # Nombre de spots restants
GET    /api/admin/waitlist                 # Admin dashboard (protected)
```

### Admin
```
GET    /api/admin/incomplete-questionnaires
GET    /api/admin/audits
POST   /api/admin/audits/:id/status
```

---

## 📚 DATA SOURCES

### Articles Blog

```typescript
// client/src/data/sarmsArticles.ts
export const SARMS_ARTICLES = [
  { id: 1, slug: "ostarine-mk-2866", title: "Ostarine (MK-2866)", ... },
  { id: 2, slug: "rad-140-testolone", title: "RAD-140 (Testolone)", ... },
  // ... 8 articles traduits FR
]
// CTA: Tous vers ebook gratuit SARMs

// client/src/data/peptidesArticles.ts
export const PEPTIDES_ARTICLES = [
  { id: 1, slug: "bpc-157", title: "BPC-157", ... },
  { id: 2, slug: "tb-500", title: "TB-500", ... },
  // ... Articles peptides
]

// client/src/data/ultrahumanArticles.ts
// Articles scrappés + traduits Ultrahuman
```

### Biomarqueurs

```typescript
// client/src/data/bloodBiomarkerDetails.ts
export const BIOMARKER_DETAILS = {
  testosterone: {
    name: "Testostérone Totale",
    unit: "ng/dL",
    optimalRange: { male: [650, 900], female: [25, 70] },
    normalRange: { male: [300, 1000], female: [15, 80] },
    role: "Hormone androgène primaire...",
    lowSymptoms: ["Fatigue", "Perte masse musculaire", ...],
    highSymptoms: ["Agressivité", "Acné", ...],
    improvement: ["Musculation", "Sommeil qualité", "Zinc", ...],
    citations: ["Marek Health 2024", "Peter Attia MD", ...]
  },
  // ... 38 autres biomarqueurs
}
```

### Citations Scientifiques

```typescript
// client/src/data/bloodPanelCitations.ts
export const BLOOD_PANEL_CITATIONS = {
  hormonal: [
    {
      number: 1,
      text: "Marek Health - Testosterone Optimization (2024)",
      url: "https://marekhealth.com/..."
    },
    // ...
  ],
  // ... 6 panels
}
```

---

## 🚀 COMMANDES ESSENTIELLES

### Development

```bash
# Démarrer dev server (client + server)
npm run dev
# → Client: http://localhost:5000
# → Server: http://localhost:5000/api

# Build production
npm run build
# → Output: dist/public/ (frontend)
# → Output: dist/index.cjs (backend bundled)

# Démarrer production
npm start
```

### Database

```bash
# Générer migration
npm run db:generate

# Appliquer migrations
npm run db:migrate

# Push schema direct (dev only)
npm run db:push

# Ouvrir Drizzle Studio
npm run db:studio
# → http://localhost:4983
```

### Type Checking

```bash
# Check types frontend + backend
npm run check

# Watch mode
npm run check -- --watch
```

---

## 🔐 VARIABLES D'ENVIRONNEMENT

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# IA APIs
ANTHROPIC_API_KEY="sk-ant-..."      # Claude (primary blood analysis)
GEMINI_API_KEY="..."                # Gemini (primary audits)
OPENAI_API_KEY="sk-..."             # OpenAI (fallback)

# SendPulse (emails)
SENDPULSE_CLIENT_ID="..."
SENDPULSE_CLIENT_SECRET="..."
SENDPULSE_APEXLABS_ADDRESSBOOK_ID="..." # Waitlist ApexLabs

# JWT
JWT_SECRET="random-secret-key"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Terra (wearables, optional)
TERRA_API_KEY="..."
TERRA_DEV_ID="..."
TERRA_SECRET="..."
```

---

## 🐛 BUGS CONNUS & FIXES EN COURS

### Issues Prioritaires

1. **Emojis IA dans rapports** ⚠️
   - Problème: Claude génère parfois emojis (😊, 🔬)
   - Fix: Ajouter post-processing regex removal
   - Status: À faire

2. **Tirets longs** ⚠️
   - Problème: IA génère "—" au lieu de "-"
   - Fix: Replace dans markdown parser
   - Status: À faire

3. **Citations manquantes** ⚠️
   - Problème: Pas de tooltips citations
   - Fix: Component CitationTooltip créé par Codex
   - Status: En cours (refonte UI/UX)

4. **Bundle size élevé** ⚠️
   - Problème: Lucide-react import all (1MB)
   - Fix: Direct imports (6KB per icon)
   - Status: Partiellement corrigé

5. **Focus states manquants** ⚠️
   - Problème: Accessibilité keyboard navigation
   - Fix: Ajouter dans accessibility.css
   - Status: À faire

### Fixes Appliqués

✅ Barrel imports lucide-react → Direct imports
✅ Sequential queries → Parallel useQueries
✅ Markdown parsing → Triple-level caching
✅ No memoization → memo() + useMemo()

---

## 📊 MÉTRIQUES PERFORMANCE

### Avant Optimizations (Codex baseline)

- Design Score: **11/40**
- Performance Score: **35/100**
- Bundle Size: ~800KB initial
- TTI: ~4s
- Lighthouse: 65

### Après Phase 1+2 Codex

- Design Score: **30/40** (+173%)
- Performance Score: **80/100** (+129%)
- Bundle Size: ~500KB initial
- TTI: ~2s
- Lighthouse: 85

### Objectif Final (après refonte UI/UX)

- Design Score: **92/100** (+241% vs baseline)
- Performance Score: **95/100**
- Bundle Size: <500KB initial
- TTI: <2s
- Lighthouse: >90
- WCAG: AA compliant

---

## 🎨 DESIGN SYSTEM

### Typography (10 niveaux)

```css
.display-1  { font-size: 96px; }  /* Hero titles */
.display-2  { font-size: 72px; }
.display-3  { font-size: 60px; }
.heading-1  { font-size: 48px; }
.heading-2  { font-size: 36px; }
.heading-3  { font-size: 24px; }
.body-large { font-size: 18px; }
.body       { font-size: 16px; }
.body-small { font-size: 14px; }
.caption    { font-size: 12px; }
```

### Colors

```css
/* Blood Report Status */
--status-optimal:      #06b6d4;  /* Cyan */
--status-normal:       #3b82f6;  /* Blue */
--status-suboptimal:   #f59e0b;  /* Amber */
--status-critical:     #f43f5e;  /* Rose */

/* Backgrounds (6 levels) */
--bg-primary:    #0a0b0d;  /* Darkest */
--bg-secondary:  #141518;
--bg-tertiary:   #1a1b1f;
--bg-card:       #202127;
--bg-elevated:   #28292f;
--bg-overlay:    #303137;

/* ApexLabs */
--neuro-dark:    #050505;
--neuro-accent:  #FCDD00;  /* Yellow */
--neuro-signal:  #00FF41;  /* Green matrix */
```

### Animations

```typescript
// client/src/lib/motion-variants.ts
export const pageLoadVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } }
};

export const counterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
```

---

## 🧪 TESTING (À IMPLÉMENTER)

### Stack Recommandé

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "playwright": "^1.40.0",
    "axe-core": "^4.8.0"
  }
}
```

### Tests Prioritaires

1. **Unit tests critiques**
   - `bloodScores.ts` - Calcul scores
   - `markdown-utils.tsx` - Parsing + cache
   - `biomarker-colors.ts` - Status colors
   - `normalizeMarkerName()` - Backend normalization

2. **Integration tests**
   - Blood analysis upload flow
   - Questionnaire save/load
   - Waitlist subscription
   - PDF export

3. **E2E tests (Playwright)**
   - Complete blood analysis journey
   - Discovery Scan completion
   - Waitlist signup
   - Admin dashboard

4. **Accessibility tests**
   - axe-core automated
   - Keyboard navigation
   - Screen reader
   - Color contrast

---

## 🚢 DEPLOYMENT

### Production (Render.com)

**URL:** https://neurocore-360.onrender.com

**Config:**
- Build Command: `npm run build`
- Start Command: `npm start`
- Auto-deploy: branch `main`
- Environment: 15+ variables configurées

**Health Check:**
```bash
curl https://neurocore-360.onrender.com/api/health
# → { status: "ok", timestamp: "..." }
```

### Deploy Manual

```bash
# 1. Build
npm run build

# 2. Test local
npm start
# → http://localhost:5000

# 3. Push to main
git add .
git commit -m "feat: ..."
git push origin main

# → Auto-deploy Render (5-10min)
```

---

## 📖 DOCUMENTATION COMPLÈTE

### Fichiers à lire en priorité

1. **PROJECT_CONTEXT.md** - Source de vérité projet
2. **ARCHITECTURE_5_PRODUITS.md** - Specs 5 produits
3. **GUIDE_TECHNIQUE_FRONTEND.md** - Architecture frontend
4. **REFONTE_UI_UX_ULTRA_PREMIUM.md** - Design system complet
5. **AUDIT_IMPLEMENTATION_CODEX.md** - État actuel refonte

### Agents Installés (21)

**Performance & Optimization:**
- react-performance-optimization
- web-vitals-optimizer
- performance-engineer
- react-performance-optimizer
- performance-profiler
- database-optimizer
- dx-optimizer

**Frontend & Architecture:**
- frontend-developer
- ui-ux-designer
- nextjs-architecture-expert
- typescript-pro

**Testing & Quality:**
- test-engineer
- code-reviewer
- web-accessibility-checker

**Documentation:**
- technical-writer
- api-documenter
- changelog-generator

**DevOps & Backend:**
- deployment-engineer
- backend-architect

**Debugging & Security:**
- debugger
- error-detective
- api-security-audit

**Business & Design:**
- content-marketer
- architect-review

**AI & Prompts:**
- prompt-engineer
- seo-analyzer

### Skills Installés (4)

- senior-frontend (scripts + références)
- react-best-practices (références)
- frontend-design
- algorithmic-art

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat (Cette semaine)

1. **Terminer refonte UI/UX Blood Report**
   - Codex prêt à démarrer Phase 1 (Foundations)
   - Quick Wins: 12.5h pour 80% résultat
   - Objectif: Design 92/100

2. **Fix bugs critiques**
   - Supprimer emojis IA
   - Remplacer tirets longs
   - Ajouter focus states

3. **Performance optimization**
   - Code splitting
   - Lazy loading
   - Bundle analysis

### Court terme (2 semaines)

4. **Tests unitaires critiques**
   - Setup Vitest
   - bloodScores.ts
   - markdown-utils.tsx
   - normalizeMarkerName()

5. **Accessibility audit**
   - axe-core automated
   - Keyboard navigation
   - Screen reader testing
   - WCAG AA compliance

6. **Documentation**
   - Enrichir README
   - API documentation
   - Guide contribution

### Moyen terme (1 mois)

7. **Code refactoring**
   - Split routes.ts (3557 lignes)
   - Extract business logic
   - Service layer

8. **E2E tests**
   - Playwright setup
   - Critical journeys
   - CI/CD pipeline

9. **Analytics & Monitoring**
   - Posthog/Mixpanel
   - Error tracking (Sentry)
   - Performance monitoring

---

## 💡 TIPS POUR REPRENDRE LE RELAI

### Démarrage rapide

```bash
# 1. Clone + install
git clone <repo>
cd neurocore-github
npm install

# 2. Setup env vars
cp .env.example .env
# → Remplir DATABASE_URL, ANTHROPIC_API_KEY, etc.

# 3. Setup DB
npm run db:push
npm run db:studio  # Vérifier tables créées

# 4. Start dev
npm run dev
# → http://localhost:5000
```

### Explorer le code

```bash
# Ouvrir Drizzle Studio (voir DB)
npm run db:studio

# Analyser bundle size
npm run build
npx vite-bundle-visualizer dist/stats.html

# Check types
npm run check

# Chercher TODOs
grep -r "TODO\|FIXME\|XXX" client/src server/
```

### Debugging

```bash
# Logs backend (server console)
console.log('[DEBUG]', data);

# React Query DevTools (déjà configuré)
# → Onglet browser React Query DevTools

# Network tab (voir API calls)
# → DevTools → Network → Filter: /api/

# Database queries (Drizzle logs)
# → Activer DEBUG=drizzle:* npm run dev
```

### Git Workflow

```bash
# Branches
main         # Production auto-deploy
develop      # Dev branch (si besoin)

# Commits conventionnels
git commit -m "feat: add blood timeline component"
git commit -m "fix: remove emoji from AI reports"
git commit -m "perf: optimize lucide-react imports"
git commit -m "docs: update README with setup"
```

---

## 🆘 RESSOURCES UTILES

### Documentation externe

- **Drizzle ORM:** https://orm.drizzle.team/
- **React Query:** https://tanstack.com/query/latest
- **Framer Motion:** https://www.framer.com/motion/
- **Radix UI:** https://www.radix-ui.com/
- **Tailwind CSS:** https://tailwindcss.com/
- **Wouter:** https://github.com/molefrog/wouter
- **Claude API:** https://docs.anthropic.com/

### Design inspiration

- **Ultrahuman:** https://ultrahuman.com
- **Whoop:** https://www.whoop.com
- **Apple Health:** Apple Fitness+ app
- **Levels:** https://www.levelshealth.com

### Knowledge sources (Blood Analysis)

- **Marek Health:** https://marekhealth.com/
- **Peter Attia MD:** https://peterattiamd.com/
- **Examine.com:** https://examine.com/
- **Huberman Lab:** https://hubermanlab.com/
- **Renaissance Periodization:** https://rpstrength.com/

---

## ✅ CHECKLIST PRISE EN MAIN

- [ ] Lire PROJECT_CONTEXT.md
- [ ] Lire ARCHITECTURE_5_PRODUITS.md
- [ ] Setup environnement local (npm install + .env)
- [ ] Démarrer dev server (npm run dev)
- [ ] Explorer DB avec Drizzle Studio
- [ ] Tester un flow complet (Discovery Scan ou Blood Analysis)
- [ ] Lire REFONTE_UI_UX_ULTRA_PREMIUM.md
- [ ] Comprendre architecture components/blood/
- [ ] Explorer API routes (server/routes.ts)
- [ ] Tester admin dashboard
- [ ] Vérifier production (https://neurocore-360.onrender.com)
- [ ] Lire GUIDE_TECHNIQUE_FRONTEND.md
- [ ] Review agents et skills installés
- [ ] Planifier prochaines étapes

---

**Créé:** 31 janvier 2026
**Par:** Assistant (Agent a9969cd)
**Pour:** Reprendre le relai complet du projet Neurocore

**Note:** Ce document est un guide de prise en main. Pour des détails techniques approfondis, consulter les 20+ fichiers de documentation dans le repo.
