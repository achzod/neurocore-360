# ARCHITECTURE COMPLETE - LES 5 PRODUITS NEUROCORE 360

**Date:** 2026-01-10
**Status:** Documentation complète après migration Peptides Engine vers Claude Opus 4.5

---

## 📊 TABLEAU RÉCAPITULATIF

| Produit | Tier | Prix | Questions | Engine | API Endpoint | Report Page | Design |
|---------|------|------|-----------|--------|--------------|-------------|--------|
| **Discovery Scan** | GRATUIT | 0€ | ~66 | Claude Opus 4.5 | `/api/discovery-scan/:id` | `DiscoveryScanReport.tsx` | Ultrahuman jaune |
| **Anabolic Bioscan** | PREMIUM | 59€ | ~137 | Claude Opus 4.5 | `/api/audits/:id/narrative` | `AnabolicScanReport.tsx` | Ultrahuman émeraude |
| **Ultimate Scan** | ELITE | 79€ | ~183 + photos | Claude Opus 4.5 | `/api/audits/:id/narrative` | `UltimateScanReport.tsx` | Ultrahuman or |
| **Peptides Engine** | STANDALONE | 99€ | ~45 | Claude Opus 4.5 ✅ | `/api/peptides-engine/:id` | `PeptidesEngineReport.tsx` | Ultrahuman amber |
| **Blood Analysis** | STANDALONE | 99€ | 39 biomarqueurs | Claude Sonnet 4.5 | `/api/blood-analysis/*` | `BloodDashboard.tsx` | Ultrahuman beta |

✅ = Récemment migré de Gemini 2.0 → Claude Opus 4.5

---

## 1️⃣ DISCOVERY SCAN (GRATUIT)

### 📝 Questionnaire
**Fichier:** `client/src/lib/questionnaire-tiers.ts`

**Questions:** ~50 (tier FREE)
```typescript
QUESTIONS_FREE[] = [
  // Section 1: Profil Base (8 questions)
  // Section 2: Santé Générale (5 questions)
  // Section 3: Sommeil (6 questions)
  // Section 4: Stress & Mental (6 questions)
  // Section 5: Énergie (5 questions)
  // Section 6: Digestion (5 questions)
  // Section 7: Training (5 questions)
  // Section 8: Nutrition (5 questions)
  // Section 9: Lifestyle (3 questions)
  // Section 10: Mindset (2 questions)
]
```

### 🔧 Engine de Génération
**Fichier:** `server/discovery-scan.ts`

**Process:**
1. `analyzeDiscoveryScan(responses)` → Calcule scores par domaine
2. `convertToNarrativeReport(result, responses)` → Génère 8 sections AI
3. Retour: `ReportData` avec sections HTML

**AI Model:**
- Primary: `claude-sonnet-4-20250514`
- Fallback: `claude-opus-4-5-20251101`

**Scoring:** 8 domaines (0-10 chacun)
- Sommeil, Stress, Énergie, Digestion, Training, Nutrition, Lifestyle, Mindset

### 🌐 API Endpoints
```javascript
POST /api/discovery-scan/analyze
// Input: { responses: DiscoveryResponses }
// Output: { success: true, narrativeReport: ReportData }

POST /api/discovery-scan/create
// Input: { email: string, responses: DiscoveryResponses }
// Output: { success: true, auditId: string, narrativeReport: ReportData }
// Crée l'audit + génère le rapport

GET /api/discovery-scan/:auditId
// Output: ReportData
```

### 📦 Format des Données
```typescript
interface ReportData {
  globalScore: number;           // 0-10
  metrics: Metric[];             // 8 domaines
  sections: SectionContent[];    // 8 sections
  clientName: string;
  generatedAt: string;
  auditType: "DISCOVERY";
}

interface SectionContent {
  id: string;                    // ex: "sommeil"
  title: string;                 // ex: "Sommeil & Récupération"
  subtitle?: string;
  content: string;               // HTML formaté
  chips?: string[];              // Tags
}
```

### 🎨 Page de Rapport
**Fichier:** `client/src/pages/DiscoveryScanReport.tsx` (714 lignes)

**Design:** Ultrahuman style
- **Thème primaire:** `#FCDD00` (jaune/gold)
- **Composants:** Sidebar, RadialProgress, MetricsRadar, Charts
- **Features:**
  - 4 thèmes au choix (M1 Black, Claude Creme, Titanium, Sand Stone)
  - Review system avec rating
  - CTA upgrade vers Anabolic
  - Export: Pas de PDF (gratuit)

---

## 2️⃣ ANABOLIC BIOSCAN (PREMIUM - 59€)

### 📝 Questionnaire
**Fichier:** `client/src/lib/questionnaire-tiers.ts`

**Questions:** ~150 (FREE + ESSENTIAL)
```typescript
QUESTIONS_ESSENTIAL[] = [
  // Nutrition Détaillée (18 Q)
  // Hormones Homme (11 Q, if sexe=homme)
  // Hormones Femme (15 Q, if sexe=femme)
  // Axes Cliniques (10 Q)
  // Suppléments (5 Q)
  // Biomarqueurs (10 Q)
  // Composition Corporelle (8 Q)
]
```

### 🔧 Engine de Génération
**Fichier:** `server/anthropicEngine.ts` (appelle `geminiPremiumEngine.ts` pour config)

**Process:**
1. `generateAndConvertAuditWithClaude()` → Génère 16 sections
2. Cache progressif: `.cache-anthropic/audit-anthropic-{id}.json`
3. Génération parallèle: Promise.all() pour toutes les sections
4. Validation: minChars + minLines + retry 3x
5. Output: TXT narrative (~30-35 pages)

**AI Model:** `claude-opus-4-5-20251101`

**Sections (16):**
```typescript
SECTIONS_ANABOLIC = [
  "Executive Summary",
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Analyse axes hormonaux",
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",
  "Plan Semaine par Semaine 30-60-90",
  "KPI et Tableau de Bord",
  "Stack Supplements Optimise",
  "Synthese et Prochaines Etapes"
]
```

### 🌐 API Endpoints
```javascript
POST /api/audits/create
// Input: { userId, email, type: "PREMIUM", responses }
// Output: { auditId, ... }
// Trigger: startReportGeneration(auditId)

GET /api/audits/:id/narrative
// Output: { txt, html, clientName, metadata, ... }

GET /api/audits/:id/narrative-status
// Output: { status: "PENDING" | "GENERATING" | "READY" | "FAILED" }

GET /api/audits/:id/export/pdf
GET /api/audits/:id/export/html
GET /api/audits/:id/export/zip
```

### 📦 Format des Données
```typescript
interface AuditResult {
  success: boolean;
  txt?: string;                  // Rapport TXT complet
  html?: string;                 // Version HTML
  clientName?: string;
  metadata?: {
    generationTimeMs: number;
    sectionsGenerated: number;
    modelUsed: string;
  };
}
```

### 🎨 Page de Rapport
**Fichier:** `client/src/pages/AnabolicScanReport.tsx`

**Design:** Ultrahuman style
- **Thème primaire:** `#10B981` (émeraude/green) pour PREMIUM
- **Composants:** Sidebar, RadialProgress, MetricsRadar
- **Features:**
  - Fetch TXT → Parse en sections
  - Review system
  - Export PDF/HTML/ZIP
  - CTA upgrade vers Ultimate

---

## 3️⃣ ULTIMATE SCAN (ELITE - 79€)

### 📝 Questionnaire
**Fichier:** `client/src/lib/questionnaire-tiers.ts`

**Questions:** ~210 (FREE + ESSENTIAL + ELITE)
```typescript
QUESTIONS_ELITE[] = [
  // Nutrition Timing (15 Q)
  // Cardio & Performance (12 Q)
  // HRV & Cardiaque (8 Q)
  // Blessures & Douleurs (15 Q)
  // Psychologie Mental (10 Q)
]

// + 3 Photos obligatoires
photos: {
  front: base64,
  side: base64,
  back: base64
}
```

### 🔧 Engine de Génération
**Fichier:** `server/anthropicEngine.ts` + `server/photoAnalysisAI.ts`

**Process:**
1. **Photo Analysis:** `analyzeBodyPhotosWithAI()` → Vision AI
2. **TXT Generation:** `generateAndConvertAuditWithClaude()` → 18 sections (16 + 2 photo)
3. **Merge:** Intègre insights photos dans rapport
4. Output: TXT complet (~40-50 pages) + photo analysis

**AI Models:**
- TXT: `claude-opus-4-5-20251101`
- Photos: Claude Vision API

**Sections (18 = Anabolic + 2 photo):**
```typescript
SECTIONS_ULTIMATE = [
  "Executive Summary",
  "Analyse visuelle et posturale complete",    // ← ELITE only (photos)
  "Analyse biomecanique et sangle profonde",   // ← ELITE only (photos)
  // ... + 15 autres sections d'Anabolic
]
```

### 📦 Photo Analysis Format
```typescript
interface PhotoAnalysis {
  fatDistribution: {
    visceral: "faible" | "modere" | "eleve";
    subcutaneous: "faible" | "modere" | "eleve";
    zones: string[];
    estimatedBF?: string;
    waistToHipRatio?: string;
  };
  posture: {
    headPosition: string;
    shoulderAlignment: string;
    spineAlignment: string;
    pelvicTilt: string;
    kneesAlignment: string;
    overallScore: number;
    issues: string[];
  };
  muscularBalance: { ... };
  biomechanics: { ... };
  recommendations: { ... };
}
```

### 🎨 Page de Rapport
**Fichier:** `client/src/pages/UltimateScanReport.tsx`

**Design:** Ultrahuman style
- **Thème primaire:** `#F59E0B` (or/amber) pour ELITE
- **Features:**
  - Sections photo spécialisées avec insights visuels
  - Export PDF/ZIP avec photos incluses
  - Review system + upgrade CTAs

---

## 4️⃣ PEPTIDES ENGINE (STANDALONE - 99€)

### 📝 Questionnaire
**Fichier:** `client/src/pages/PeptidesEnginePage.tsx`

**Questions:** ~45 (6 sections)
- Profil & objectifs
- Contexte sante
- Performance & composition
- Objectifs peptides
- Biomarqueurs
- Contraintes & attentes

### 🔧 Engine de Génération
**Fichier:** `server/peptides-engine.ts`

**Process:**
1. `computeMetrics(responses)` → 8 axes (recuperation, sommeil, cognition, libido, performance, composition, tendons, peau)
2. `getPeptidesKnowledge(responses)` → contexte connaissances + fallback interne
3. `generatePeptidesSection()` → 6 sections en parallele
4. Retour: `PeptidesReportData`

**AI Model:** ✅ `claude-opus-4-5-20251101` (via ANTHROPIC_CONFIG)

**Sections (6):**
```typescript
sections = [
  { id: "intro", title: "Profil peptides" },
  { id: "diagnostic", title: "Diagnostic de depart" },
  { id: "peptides", title: "Peptides recommandes" },
  { id: "protocoles", title: "Protocoles & timing" },
  { id: "stack", title: "Stack supplements" },
  { id: "execution", title: "Plan d'execution + coaching" }
]
```

### 🌐 API Endpoints
```javascript
POST /api/peptides-engine/analyze
POST /api/peptides-engine/create-checkout-session
POST /api/peptides-engine/confirm-session
POST /api/peptides-engine/save-progress
GET /api/peptides-engine/progress/:email
GET /api/peptides-engine/:id
POST /api/peptides-engine/regenerate
```

### 📦 Format des Données
```typescript
interface PeptidesReportData {
  globalScore: number;                    // 0-100
  clientName: string;
  generatedAt: string;
  metrics: {
    key: string;                          // ex: "recovery"
    label: string;                        // ex: "Recuperation"
    value: number;                        // 1-10
    max: number;                          // 10
    description: string;
  }[];
  sections: SectionContent[];
  profile?: {
    primaryGoal?: string;
    secondaryGoals?: string[];
    experience?: string;
    tolerance?: string;
    budget?: string;
    timeline?: string;
  };
}
```

### 🎨 Page de Rapport
**Fichier:** `client/src/pages/PeptidesEngineReport.tsx`

**Design:** Ultrahuman style
- Themes: M1 Black, Claude Creme, Titanium, Sand Stone
- Dashboard + radar + scores par axe
- CTA coaching avec 10 offres (avant/apres deduction)
- Review system

---

## 5️⃣ BLOOD ANALYSIS (STANDALONE - 99€)

### 📝 Input Data
**Fichier:** `client/src/lib/blood-questionnaire.ts`

**Biomarqueurs:** 39 au total répartis en 5 panels
```typescript
BLOOD_MARKERS = [
  // Panel Hormonal (10)
  "testosterone_total", "testosterone_free", "shbg", "estradiol",
  "lh", "fsh", "prolactin", "dhea_s", "cortisol", "igf_1",

  // Panel Thyroïdien (5)
  "tsh", "t4_free", "t3_free", "t3_reverse", "anti_tpo",

  // Panel Métabolique (9)
  "glucose", "hba1c", "insulin", "homa_ir", "triglycerides",
  "hdl", "ldl", "apob", "lp_a",

  // Panel Inflammatoire (5)
  "crp_hs", "homocysteine", "ferritin", "iron", "saturation",

  // Panel Vitamines (5)
  "vitamin_d", "vitamin_b12", "folate", "magnesium_rbc", "zinc"
]
```

### 🔧 Engine de Génération
**Fichier:** `server/blood-analysis/index.ts`

**Process:**
1. `analyzeBloodwork(markers)` → Compare vs ranges normaux/optimaux
2. Pattern detection automatique (Low T, Thyroid issues, etc.)
3. `generateAIBloodAnalysis()` → Claude génère interprétation
4. Output: Analysis structurée + AI narrative

**AI Model:** `claude-sonnet-4-20250514`

**Pattern Detection:**
```typescript
patterns = [
  "low_testosterone",
  "high_estrogen",
  "thyroid_hypo",
  "thyroid_hyper",
  "insulin_resistance",
  "inflammation_chronic",
  "vitamin_d_deficiency",
  "anemia",
  // ... etc
]
```

### 🌐 API Endpoints
```javascript
GET /api/blood-analysis/biomarkers
// Output: { markers: BiomarkerRange[], patterns: Pattern[] }

POST /api/blood-analysis/analyze
// Input: { markers: BloodMarkerInput[], profile: UserProfile }
// Output: { analysis: AnalysisResult, aiReport: string, sourcesUsed: string[] }

POST /api/blood-analysis/quick-check
// Quick analysis sans génération AI complète
```

### 📦 Format des Données
```typescript
interface BiomarkerRange {
  name: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  optimalMin: number;                    // ← DIFFÉRENCE CRITIQUE
  optimalMax: number;
  context: string;
  genderSpecific?: "homme" | "femme";
}

// Exemple: Testostérone
{
  name: "Testostérone totale",
  unit: "ng/dL",
  normalMin: 300,
  normalMax: 1000,
  optimalMin: 600,                       // ← Optimal bien plus haut
  optimalMax: 900,
  context: "<500 = suboptimal pour muscu",
  genderSpecific: "homme"
}
```

### 🎨 Page de Rapport
**Fichier:** `client/src/pages/BloodDashboard.tsx`

**Design:** Ultrahuman style (beta)
- Style Ultrahuman unifie (M1/Claude/Titanium/Sand)
- Radar charts pour panels
- Biomarker cards avec status
- Navigation par sections

**Features:**
- Upload PDF bilan sanguin
- Saisie manuelle des valeurs
- Export PDF avec charts
- Protocoles correctifs

---

## 🎨 DESIGNS & THEMES

### Design Pattern Actuel

**5 produits utilisent le style Ultrahuman:**
1. Discovery Scan → Ultrahuman jaune (`#FCDD00`)
2. Anabolic Bioscan → Ultrahuman émeraude (`#10B981`)
3. Ultimate Scan → Ultrahuman or (`#F59E0B`)
4. Peptides Engine → Ultrahuman amber (`#F59E0B`)
5. Blood Analysis → Ultrahuman beta (`#F4EDE3`)

**Composants communs:**
- `Sidebar` avec navigation sections
- `RadialProgress` pour score global
- `MetricsRadar` pour vue d'ensemble
- `Charts` (ProjectionChart, BarChart, Timeline)
- Theme switcher (4 thèmes disponibles)

**Design unifie:**
- Blood Analysis passe sur le meme layout Ultrahuman (beta, data statique pour le moment)

### ⚠️ PROBLÈME IDENTIFIÉ

**Actuellement:** Chaque produit a son propre fichier report (~700 lignes) avec code dupliqué

**Solution proposée:** Utiliser `FullReport.tsx` comme composant réutilisable

```typescript
// FullReport.tsx - Composant refactoré
interface FullReportProps {
  reportData: ReportData;
  initialTheme?: 'neurocore' | 'ultrahuman' | 'metabolic' | 'titanium';
}

export function FullReport({ reportData, initialTheme }: FullReportProps)
```

**Migration à faire:**
- ✅ FullReport.tsx refactoré (accepte props)
- ⏳ DiscoveryScanReport → wrapper qui fetch + passe à FullReport
- ⏳ AnabolicScanReport → wrapper qui fetch + passe à FullReport
- ⏳ UltimateScanReport → wrapper qui fetch + passe à FullReport
- ⏳ PeptidesEngineReport → wrapper qui fetch + passe à FullReport
- ❌ BloodDashboard → garde son design unique

---

## 🔄 DATA FLOW COMPLET

### Flow Général
```
1. User remplit questionnaire
   ↓
2. POST /api/[product]/create
   ↓
3. Backend: analyzeResponses() → scores
   ↓
4. Backend: generateReportWithAI() → Claude génère sections
   ↓
5. Backend: saveToDatabase(narrativeReport)
   ↓
6. Frontend: GET /api/[product]/:id
   ↓
7. Frontend: Display FullReport component
```

### Exemple: Discovery Scan
```
QuestionnaireDiscovery.tsx (client)
  → submitResponses()
    → POST /api/discovery-scan/create
      → server/discovery-scan.ts
        → analyzeDiscoveryScan(responses)
          → scores par domaine
        → convertToNarrativeReport()
          → Claude génère 8 sections
        → return ReportData
      → storage.createAudit({ narrativeReport })
  → navigate(/discovery/:id)
    → DiscoveryScanReport.tsx
      → fetch(/api/discovery-scan/:id)
        → display ReportData
```

### Exemple: Anabolic Bioscan
```
Questionnaire.tsx (client, tier=PREMIUM)
  → submitAudit()
    → POST /api/audits/create { type: "PREMIUM" }
      → server/routes.ts
        → storage.createAudit()
        → startReportGeneration(auditId)
          → server/reportJobManager.ts
            → generateAndConvertAuditWithClaude()
              → server/anthropicEngine.ts
                → Génère 16 sections en parallèle
                → Cache progressif
              → return { txt, html }
            → storage.updateAudit({ narrativeReport })
  → Poll /api/audits/:id/narrative-status
    → when READY → navigate(/anabolic/:id)
      → AnabolicScanReport.tsx
        → fetch(/api/audits/:id/narrative)
          → parse TXT → sections
          → display
```

---

## 📊 KNOWLEDGE BASE INTEGRATION

**Utilisé par:**
- ✅ Discovery Scan
- ✅ Anabolic Bioscan
- ✅ Ultimate Scan
- ✅ Peptides Engine
- ✅ Blood Analysis

**Sources (8 au total):**
```typescript
ALLOWED_SOURCES = [
  'huberman',                     // 100 articles
  'sbs',                          // 17 articles
  'applied_metabolics',           // 316 articles
  'examine',                      // 66 articles
  'peter_attia',                  // 28 articles
  'newsletter',                   // 68 articles (ACHZOD)
  'renaissance_periodization',    // 7 articles
  'mpmd'                          // 6 articles
]

TOTAL: 608 articles, 519k mots
```

**Intégration:**
```typescript
// Pour chaque section générée
const knowledgeContext = await generateKnowledgeContext(
  responses,
  sectionType
);

// Ajouté au prompt Claude
const prompt = `${basePrompt}\n\n${knowledgeContext}`;
```

---

## 💰 PRICING & BUSINESS MODEL

| Produit | Prix | Commission Stripe | Net |
|---------|------|-------------------|-----|
| Discovery Scan | 0€ | - | Lead magnet |
| Anabolic Bioscan | 59€ | ~2€ | ~57€ |
| Ultimate Scan | 79€ | ~3€ | ~76€ |
| Peptides Engine | 99€ | ~3€ | ~96€ |
| Blood Analysis | 99€ | ~3€ | ~96€ |

**Upsell Path:**
```
Discovery (gratuit)
  ↓ CTA upgrade
Anabolic (59€)
  ↓ CTA upgrade
Ultimate (79€)
  ↓ CTA coaching
Coaching Starter / Essential / Elite / Private Lab
```

---

## 🚀 NEXT STEPS

### Priorité HAUTE
1. ✅ Migrer Peptides Engine vers Claude Opus 4.5 (FAIT 2026-01-10)
2. ⏳ Migrer les 4 pages report vers FullReport.tsx (EN COURS)
3. ⏳ Tester chaque produit end-to-end
4. ⏳ Vérifier format données API ↔ FullReport

### Priorité MOYENNE
5. Documenter prompts Claude pour chaque produit
6. Optimiser cache system
7. Améliorer retry logic si sections trop courtes

### Priorité BASSE
8. A/B test prompts anti-IA
9. Enrichir RP et MPMD dans knowledge base
10. Monitoring coûts AI par produit

---

**Document créé le:** 2026-01-10
**Dernière mise à jour:** 2026-01-10 après migration Peptides Engine
**Auteur:** Claude Sonnet 4.5
