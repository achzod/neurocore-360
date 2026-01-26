# AUDIT BLOOD ANALYSIS REPORT
## Date: 2026-01-26
## URL Auditée: https://neurocore-360.onrender.com/analysis/f2ef68cf-1677-4ad1-9878-279686f787dc?key=Badboy007
## Fichier: client/src/pages/BloodAnalysisReport.tsx

---

## ❌ GAPS CRITIQUES vs SPECS

### 1. DESIGN SYSTEM - FAIL COMPLET

**Specs attendues (Ultrahuman-inspired):**
```css
Background: #000000 (noir pur)
Surfaces: #0a0a0a
Primary: rgb(2,121,232) (bleu électrique)
Text: rgba(255,255,255,1.0) (blanc)
```

**Implémenté actuellement:**
```css
Background: bg-[#f7f5f0] (beige/crème)
Text: text-slate-900 (noir sur beige)
Accent: #0f172a (slate foncé, pas bleu électrique)
```

**🔴 CRITIQUE:** Design complètement opposé aux specs. Ultrahuman = dark mode noir profond, nous = light mode beige.

---

### 2. TYPOGRAPHIE - FAIL

**Specs:**
```css
font-family: 'Graphik', -apple-system...
Hero: 96px desktop | 48px mobile, -2.72px letter-spacing
H1: 72px | 36px, -2px
H2: 48px | 28px, -1.2px
Body: 19px, line-height 1.6
```

**Implémenté:**
- Aucune mention de Graphik font
- Sizes: text-2xl (24px?), text-5xl (48px?), text-lg (18px?)
- Letter-spacing: aucun custom
- Pas de hierarchy cohérente Ultrahuman

**🔴 CRITIQUE:** Typographie Tailwind générique, pas Ultrahuman.

---

### 3. STRUCTURE 3-COUCHES PAR BIOMARQUEUR - MANQUANT

**Specs (Structure Ultrahuman):**
```
COUCHE 1 - Définition:
Hormone stéroïdienne produite testicules...

COUCHE 2 - Mécanisme pathologique:
<500 ng/dL = hypogonadisme potentiel
Causes: Stress ↑ cortisol, déficit calorique...

COUCHE 3 - Impact & Optimisation:
Performance: <600 → gains limités
Protocole: Sommeil 8h+, Ashwagandha 600mg...

RECHERCHE:
→ "Testosterone and cortisol..." (Volek, 1997)
```

**Implémenté:**
```tsx
<p className="mt-3 text-xs text-slate-600">
  {marker.interpretation || "Je detaille ce marqueur dans ta synthese experte."}
</p>
```

**🔴 CRITIQUE:** Une seule ligne d'interprétation générique. Pas de structure 3-couches, pas de protocole par marqueur, pas de citations.

---

### 4. CITATIONS SCIENTIFIQUES - MANQUANT COMPLET

**Specs:**
- 2-3 citations peer-reviewed par panel
- Format: "Research shows X. (Source: Journal, Year)"
- Links PubMed optionnels

**Implémenté:**
- ❌ ZÉRO citation visible
- ❌ Aucune référence scientifique
- ❌ Pas de liens PubMed

**🔴 CRITIQUE:** Killer feature specs = "ranges TRANSPARENTS + citations scientifiques". Citations = 0. Trust = 0.

---

### 5. CAS D'USAGE STORYTELLING - MANQUANT

**Specs:**
```markdown
Marc D., 34 ans, Entrepreneur

Baseline (Jan 2025):
• Testostérone: 420 ng/dL (suboptimal)
• HbA1c: 5.6% (pre-diabetic)

Protocole (12 semaines):
→ Sommeil: 8.5h/nuit
→ Ashwagandha 600mg, Zinc 30mg

Follow-up (Apr 2025):
• Testostérone: 680 ng/dL (+62%) ✅
• HbA1c: 5.1% (optimal) ✅

"Mon énergie est revenue, libido x2..."
```

**Implémenté:**
- ❌ Aucun cas d'usage
- ❌ Pas de storytelling
- ❌ Pas de progression mesurable

**🟡 MOYEN:** Tab "Historique" montre progression personnelle, mais pas de cas réels inspirants.

---

### 6. RANGES OPTIMAUX vs NORMAUX - PARTIELLEMENT OK

**Specs:**
```
Normal labo: 300-1000 ng/dL
Optimal Huberman: 600-900 ng/dL

Killer feature: Afficher PRÉCISÉMENT les deux ranges avec sources
```

**Implémenté:**
```tsx
<BiomarkerRangeIndicator
  value={marker.value}
  normalMin={marker.refMin}
  normalMax={marker.refMax}
  optimalMin={marker.optimalMin}
  optimalMax={marker.optimalMax}
/>
```

**✅ BON:** Les deux ranges sont affichés (normal + optimal).

**❌ MANQUE:**
- Pas de label "Normal labo" vs "Optimal Huberman/Attia"
- Pas de sources citées (Huberman Lab, Peter Attia, Derek MPMD)
- Pas d'explication pourquoi optimal ≠ normal

---

### 7. CORRÉLATIONS LIFESTYLE - MANQUANT

**Specs:**
```
[3 cards]
Sommeil: 6.2h/nuit → Testo -15%, Cortisol +12%
Training: 15h/sem → Cortisol +18%, Récup limitée
Nutrition: Déficit 35% → Testo -18%, Thyroïde ↓

"Users 8h+ ont +35% testo vs <6h"
```

**Implémenté:**
- ❌ Aucune corrélation lifestyle visible
- ❌ Pas de data interne "1800+ rapports"
- ❌ Pas de recommandations lifestyle data-driven

**🔴 CRITIQUE:** Specs mentionnent "corrélations lifestyle" comme feature clé. Rien n'est implémenté.

---

### 8. INFOGRAPHIQUES PAR PANEL - MANQUANT

**Specs:**
```
[Infographic Preview - 280x160px]
(Placeholder: 6 mini-gauges showing sample data with optimal zones)
```

**Implémenté:**
- ✅ Radar chart global (BloodRadar)
- ✅ Radar par système

**❌ MANQUE:**
- Pas d'infographiques éducatifs par panel
- Pas de visualisations custom type Ultrahuman

**🟡 MOYEN:** Radars OK mais pas infographiques riches.

---

### 9. PROTOCOLES - PARTIELLEMENT OK

**Specs:**
```
PROTOCOLE (si <600 ng/dL):
1. Sommeil 8h+ nuit (↑ sécrétion 30%)
2. Déficit calorique max 20%
3. Ashwagandha 600mg, Zinc 30mg, Vit D 5000 IU
4. Réduire alcool <2 verres/sem
5. Exercices composés 4x/semaine
```

**Implémenté:**
```tsx
{protocolPhases.map((phase) => (
  <Card>
    <p>{phase.title}</p> {/* Jours 1-30 */}
    <ul>
      {phase.items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  </Card>
))}
```

**✅ BON:** Protocoles par phases (Jours 1-30, 31-90, 91-180).

**❌ MANQUE:**
- Pas de protocoles SPÉCIFIQUES par biomarqueur
- Pas de dosages précis visibles (600mg, 30mg, 5000 IU)
- Pas de timing (matin, soir, post-training)

---

### 10. TAB "INSIGHTS" - FAIBLE

**Specs:**
```
Section 1: Patterns Diagnostiques
  1. [Alert] Low T Syndrome
     Causes: Stress chronique, déficit calorique
     Protocole: Sommeil 8h+, Ashwagandha...

Section 2: Corrélations Lifestyle (charts)
Section 3: Longitudinal (si multi-rapports)
```

**Implémenté:**
```tsx
<TabsContent value="insights">
  <Card>Synthese experte (ReactMarkdown)</Card>
  <Card>Patterns detectes (if analysis?.patterns)</Card>
  <Card>Alertes medicales (if analysis?.alerts)</Card>
</TabsContent>
```

**🟡 MOYEN:**
- ✅ Patterns détectés OK
- ❌ Pas de corrélations lifestyle
- ❌ Pas de charts lifestyle
- ❌ Longitudinal dans tab séparé, pas ici

---

## ✅ CE QUI MARCHE

### 1. Architecture Tabs ✅
- Dashboard, Systemes, Marqueurs, Protocoles, Insights, Historique, Simulateur, Export
- Navigation claire

### 2. Score Global ✅
- Score /100 calculé
- Niveau (Exceptionnel, Très bien, Correct, Attention, Prioritaire)
- Message contextuel
- Age bio calculé

### 3. Radar 8 Systèmes ✅
- Cardio, Hormonal, Metabolic, Inflammatory, Hepatic, Renal, Hemato, Thyroid
- Visualisation radar claire
- Score par système calculé

### 4. Biomarqueurs avec Ranges ✅
- Normal min/max
- Optimal min/max
- Status color-coded (optimal, normal, suboptimal, critical)
- BiomarkerRangeIndicator component

### 5. Patterns Détectés ✅
- analysis?.patterns (name, causes, protocol)
- Affichage conditionnel

### 6. Protocoles par Phases ✅
- Jours 1-30, 31-90, 91-180
- Items listés par phase

### 7. Historique ✅
- Graphique évolution scores
- Comparaison bilans multiples
- Delta affiché (+X pts depuis dernier bilan)

### 8. Export PDF ✅
- Button "Export PDF"
- Endpoint `/api/blood-tests/${id}/export/pdf`

### 9. Responsive ✅
- Grid adaptatif (lg:grid-cols-2, md:grid-cols-2)
- Mobile-friendly

### 10. Animations ✅
- Framer Motion (containerVariants, itemVariants)
- Smooth transitions

---

## 🔴 ACTIONS PRIORITAIRES

### PRIORITÉ 1: DESIGN SYSTEM (2-3 jours)

**Fichiers à modifier:**
- `client/src/pages/BloodAnalysisReport.tsx`
- Créer `client/src/styles/blood-ultrahuman.css` (custom CSS)

**Changes:**
```tsx
// AVANT
<div className="min-h-screen bg-[#f7f5f0] text-slate-900">

// APRÈS
<div className="min-h-screen bg-[#000000] text-white">
  <div className="pointer-events-none absolute inset-0 opacity-25"
    style={{
      backgroundImage: "radial-gradient(circle at 50% 0%, rgba(2,121,232,0.1) 0%, transparent 50%)",
    }}
  />
</div>
```

**Tous les bg-white → bg-[#0a0a0a]**
**Tous les text-slate-900 → text-white**
**Tous les text-slate-600 → rgba(255,255,255,0.7)**
**Tous les border-slate-200 → rgba(255,255,255,0.13)**

**Primary accent:**
```tsx
// AVANT
className="bg-[#0f172a]"

// APRÈS
className="bg-[rgb(2,121,232)]" // Electric blue
```

**Import Graphik font:**
```css
/* index.css */
@import url('https://fonts.cdnfonts.com/css/graphik');

body {
  font-family: 'Graphik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Hero */
.hero-text {
  font-size: 96px;
  font-weight: 500;
  letter-spacing: -2.72px;
}

@media (max-width: 768px) {
  .hero-text {
    font-size: 48px;
  }
}

/* H1 */
h1 {
  font-size: 72px;
  font-weight: 500;
  letter-spacing: -2px;
}

@media (max-width: 768px) {
  h1 {
    font-size: 36px;
  }
}

/* H2 */
h2 {
  font-size: 48px;
  font-weight: 500;
  letter-spacing: -1.2px;
}

@media (max-width: 768px) {
  h2 {
    font-size: 28px;
  }
}

/* Body */
body, p {
  font-size: 19px;
  font-weight: 400;
  line-height: 1.6;
}
```

---

### PRIORITÉ 2: STRUCTURE 3-COUCHES PAR BIOMARQUEUR (3-4 jours)

**Créer nouveau composant:**
```tsx
// client/src/components/blood/BiomarkerDetail.tsx
interface BiomarkerDetailProps {
  marker: {
    name: string;
    code: string;
    value: number;
    unit: string;
    status: MarkerStatus;
    refMin: number | null;
    refMax: number | null;
    optimalMin: number | null;
    optimalMax: number | null;
  };
}

export function BiomarkerDetail({ marker }: BiomarkerDetailProps) {
  // Fetch 3-layer content from backend
  const { data: detail } = useQuery({
    queryKey: [`/api/biomarkers/${marker.code}/detail`],
    queryFn: fetchBiomarkerDetail,
  });

  return (
    <Accordion>
      <AccordionTrigger>
        {marker.name} - {marker.value} {marker.unit}
      </AccordionTrigger>
      <AccordionContent>
        {/* COUCHE 1 - Définition */}
        <div className="mb-4">
          <p className="text-xs uppercase text-white/50">Définition</p>
          <p className="text-sm text-white/80 mt-2">
            {detail?.definition || "Chargement..."}
          </p>
        </div>

        {/* COUCHE 2 - Mécanisme */}
        <div className="mb-4">
          <p className="text-xs uppercase text-white/50">Mécanisme pathologique</p>
          <p className="text-sm text-white/80 mt-2">
            {detail?.mechanism || ""}
          </p>
        </div>

        {/* COUCHE 3 - Impact & Protocole */}
        <div className="mb-4">
          <p className="text-xs uppercase text-white/50">Impact & Optimisation</p>
          <p className="text-sm text-white/80 mt-2">
            {detail?.impact || ""}
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase text-white/50">Protocole</p>
            <ul className="space-y-1 text-sm text-white/70">
              {detail?.protocol?.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Citations */}
        <div>
          <p className="text-xs uppercase text-white/50">Recherche</p>
          <ul className="mt-2 space-y-1 text-xs text-white/60">
            {detail?.citations?.map((citation, i) => (
              <li key={i}>
                → <a href={citation.url} target="_blank" rel="noopener" className="underline hover:text-white">
                  {citation.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </AccordionContent>
    </Accordion>
  );
}
```

**Backend: Créer endpoint `/api/biomarkers/:code/detail`**
```typescript
// server/routes.ts
app.get("/api/biomarkers/:code/detail", async (req, res) => {
  const { code } = req.params;

  // Fetch from knowledge base or hardcoded JSON
  const detail = await getBiomarkerDetail(code);

  res.json(detail);
});

// server/blood-analysis/biomarker-details.ts
export const BIOMARKER_DETAILS = {
  testosterone_total: {
    definition: "Hormone stéroïdienne produite principalement par les testicules chez l'homme (90%) et les ovaires chez la femme. Elle régule la masse musculaire, la densité osseuse, la libido, l'humeur et la production de globules rouges.",
    mechanism: "Chez l'homme, des niveaux <500 ng/dL signalent un hypogonadisme potentiel, causé par:\n- Stress chronique élevant cortisol (↓ production testiculaire)\n- Déficit calorique prolongé (↓ signaux LH/FSH)\n- Surentraînement sans récupération adéquate\n- Aromatisation excessive vers estradiol (↑ masse grasse)\n\nDes niveaux >1000 ng/dL peuvent indiquer usage exogène ou tumeur testiculaire.",
    impact: "Performance: <600 ng/dL → gains musculaires limités, récupération ralentie\nLifestyle: <400 ng/dL → libido ↓, fatigue chronique, dépression",
    protocol: [
      "Sommeil 8h+ nuit (↑ sécrétion nocturne 30%)",
      "Déficit calorique max 20% (préserver axe HPG)",
      "Ashwagandha 600mg (soir)",
      "Zinc 30mg (matin)",
      "Vitamine D 5000 IU (si D <50 ng/mL)",
      "Réduire alcool (<2 verres/semaine)",
      "Exercices composés 4x/semaine (squats, deadlifts)"
    ],
    citations: [
      {
        text: "Testosterone and cortisol in relation to dietary nutrients (Volek et al., J Appl Physiol, 1997)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9124069/"
      },
      {
        text: "Effects of sleep restriction on testosterone in young healthy men (Leproult & Van Cauter, JAMA, 2011)",
        url: "https://pubmed.ncbi.nlm.nih.gov/21632481/"
      }
    ]
  },
  // Répéter pour LES 39 BIOMARQUEURS...
};
```

**⚠️ GROS TRAVAIL:** Rédiger 3-couches + protocole + 2-3 citations × 39 biomarqueurs = ~40-50h rédaction.

---

### PRIORITÉ 3: CITATIONS SCIENTIFIQUES VISIBLES (1 jour)

**Ajouter section "Sources" dans tab Insights:**
```tsx
<TabsContent value="insights">
  {/* ... existing content ... */}

  <Card className="border border-white/13 bg-[#0a0a0a] p-6 mt-6">
    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Sources scientifiques</p>
    <div className="mt-4 space-y-3 text-sm text-white/70">
      <div>
        <p className="font-semibold text-white">Panel Hormonal</p>
        <ul className="mt-2 space-y-1 text-xs text-white/60">
          <li>
            → <a href="https://pubmed.ncbi.nlm.nih.gov/9124069/" target="_blank" className="underline hover:text-white">
              Testosterone and cortisol in relation to dietary nutrients (Volek et al., J Appl Physiol, 1997)
            </a>
          </li>
          <li>
            → <a href="https://pubmed.ncbi.nlm.nih.gov/21632481/" target="_blank" className="underline hover:text-white">
              Sleep restriction effects on testosterone (Leproult & Van Cauter, JAMA, 2011)
            </a>
          </li>
        </ul>
      </div>
      {/* Répéter pour 6 panels */}
    </div>
  </Card>
</TabsContent>
```

---

### PRIORITÉ 4: CAS D'USAGE STORYTELLING (2 jours)

**Ajouter nouvelle section dans tab Dashboard:**
```tsx
<TabsContent value="dashboard">
  {/* ... existing content ... */}

  <Card className="border border-white/13 bg-[#0a0a0a] p-6 mt-6">
    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Success Stories</p>
    <p className="text-sm text-white/60 mt-2">Cas réels · Progression mesurable · Protocoles appliqués</p>

    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {CASE_STUDIES.map((story) => (
        <div key={story.id} className="rounded-xl border border-white/13 bg-[#0a0a0a] p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">
              {story.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{story.name}</p>
              <p className="text-xs text-white/50">{story.age} ans, {story.role}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-white/70">
            <div>
              <p className="text-white/50 uppercase">Baseline</p>
              <p className="mt-1">{story.baseline.marker}: {story.baseline.value} ({story.baseline.status})</p>
            </div>

            <div>
              <p className="text-white/50 uppercase">Protocole (12 sem)</p>
              <ul className="mt-1 space-y-1">
                {story.protocol.map((item, i) => (
                  <li key={i}>→ {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white/50 uppercase">Résultat</p>
              <p className="mt-1">{story.result.marker}: {story.result.value} ({story.result.delta}) ✅</p>
            </div>

            <blockquote className="border-l-2 border-[rgb(2,121,232)] pl-3 italic text-white/80">
              "{story.quote}"
            </blockquote>
          </div>
        </div>
      ))}
    </div>
  </Card>
</TabsContent>
```

**Data:**
```typescript
const CASE_STUDIES = [
  {
    id: "marc",
    initials: "MD",
    name: "Marc D.",
    age: 34,
    role: "Entrepreneur",
    baseline: {
      marker: "Testostérone totale",
      value: "420 ng/dL",
      status: "suboptimal"
    },
    protocol: [
      "Sommeil: 6.5h → 8.5h/nuit",
      "Ashwagandha 600mg, Zinc 30mg",
      "Déficit calorique: 40% → 15%",
      "Training volume: -30%"
    ],
    result: {
      marker: "Testostérone",
      value: "680 ng/dL",
      delta: "+62%"
    },
    quote: "Mon énergie est revenue, libido x2, focus au travail plus stable. Le rapport m'a donné un roadmap clair."
  },
  // 2 autres cas...
];
```

---

### PRIORITÉ 5: CORRÉLATIONS LIFESTYLE (3 jours)

**Backend: Collecter data lifestyle dans questionnaire**
```typescript
// server/blood-analysis/index.ts
interface LifestyleData {
  sleepHours: number;       // 6.5
  trainingHours: number;    // 15
  calorieDeficit: number;   // 35
  alcoholWeekly: number;    // 10
  stressLevel: number;      // 7/10
}

// Lors de l'analyse, calculer corrélations:
function analyzeLifestyleImpact(markers: Markers, lifestyle: LifestyleData) {
  const correlations: LifestyleCorrelation[] = [];

  // Sleep → Testosterone
  const testoMarker = markers.find(m => m.code === 'testosterone_total');
  if (testoMarker && lifestyle.sleepHours < 7) {
    const estimatedLoss = (7 - lifestyle.sleepHours) * 5; // -5% per hour under 7h
    correlations.push({
      factor: "Sommeil",
      current: `${lifestyle.sleepHours}h/nuit`,
      impact: `Testo -${estimatedLoss}%`,
      recommendation: "Target 8h+ pour restaurer production nocturne",
      evidence: "Users 8h+ ont +35% testo vs <6h (data interne 1800+ rapports)"
    });
  }

  // Training → Cortisol
  if (lifestyle.trainingHours > 12) {
    correlations.push({
      factor: "Training volume",
      current: `${lifestyle.trainingHours}h/sem`,
      impact: "Cortisol +18%, récup limitée",
      recommendation: "Réduire à 8-10h/sem optimal",
      evidence: "Surentraînement corrélé à ↑ cortisol, ↓ testo"
    });
  }

  // Calorie deficit → Hormones
  if (lifestyle.calorieDeficit > 30) {
    correlations.push({
      factor: "Nutrition",
      current: `Déficit ${lifestyle.calorieDeficit}%`,
      impact: "Testo -18%, Thyroïde ↓",
      recommendation: "Max 20% déficit soutenable",
      evidence: "Déficit >30% non soutenable pour hormones"
    });
  }

  return correlations;
}
```

**Frontend: Afficher dans tab Dashboard**
```tsx
<Card className="border border-white/13 bg-[#0a0a0a] p-6">
  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Corrélations Lifestyle</p>

  <div className="mt-4 grid gap-4 lg:grid-cols-3">
    {analysis?.lifestyleCorrelations?.map((corr) => (
      <div key={corr.factor} className="rounded-xl border border-white/13 bg-black/50 p-4">
        <p className="text-sm font-semibold text-white">{corr.factor}</p>
        <p className="text-xs text-white/50 mt-1">{corr.current}</p>

        <div className="mt-3 space-y-2 text-xs">
          <p className="text-[rgb(2,121,232)]">Impact: {corr.impact}</p>
          <p className="text-white/70">→ {corr.recommendation}</p>
        </div>

        <p className="mt-3 text-xs text-white/50 italic">{corr.evidence}</p>
      </div>
    ))}
  </div>
</Card>
```

---

## 📊 ESTIMATION TEMPS TOTAL

| Priorité | Tâche | Temps estimé |
|----------|-------|--------------|
| 1 | Design system (noir Ultrahuman) | 2-3 jours |
| 2 | Structure 3-couches (39 biomarqueurs) | 3-4 jours (rédaction 40-50h) |
| 3 | Citations scientifiques visibles | 1 jour |
| 4 | Cas d'usage storytelling | 2 jours |
| 5 | Corrélations lifestyle | 3 jours |
| **TOTAL** | | **11-13 jours** |

---

## 🎯 ROADMAP RECOMMANDÉE

### SPRINT 1 (Semaine 1): Design System
- [ ] Implémenter couleurs Ultrahuman (#000000, rgb(2,121,232))
- [ ] Import Graphik font + typographie
- [ ] Refactor tous les bg-white → bg-[#0a0a0a]
- [ ] Test responsive dark mode

### SPRINT 2 (Semaine 2): Content & Pédagogie
- [ ] Rédiger 3-couches pour 39 biomarqueurs (priorité top 10 d'abord)
- [ ] Ajouter citations scientifiques (2-3 par panel)
- [ ] Créer BiomarkerDetail component avec accordions

### SPRINT 3 (Semaine 3): Social Proof & Data
- [ ] Ajouter 3 cas d'usage storytelling
- [ ] Implémenter corrélations lifestyle backend
- [ ] Afficher corrélations dans dashboard

### SPRINT 4 (Semaine 4): Polish & QA
- [ ] Animations finales
- [ ] Test E2E
- [ ] Audit final vs specs

---

## ✅ CHECKLIST VALIDATION FINALE

### Design
- [ ] Background #000000 (noir Ultrahuman)
- [ ] Primary accent rgb(2,121,232) (bleu électrique)
- [ ] Graphik font loaded
- [ ] Typographie hierarchy correcte (96px hero, 72px H1, etc.)
- [ ] Letter-spacing custom (-2.72px, -2px, -1.2px)

### Content
- [ ] Structure 3-couches (def → mécanisme → impact) pour 39 biomarqueurs
- [ ] Protocoles détaillés (dosages + timing) par biomarqueur
- [ ] 2-3 citations scientifiques par panel (12-18 total)
- [ ] Links PubMed cliquables
- [ ] 3 cas d'usage storytelling avec progression mesurable

### Features
- [ ] Ranges optimaux vs normaux avec labels "Huberman/Attia"
- [ ] Corrélations lifestyle (sommeil, training, nutrition)
- [ ] Data evidence "1800+ rapports" cité
- [ ] Infographiques éducatifs par panel (optionnel Phase 2)

### UX
- [ ] Dark mode cohérent partout
- [ ] Animations smooth (Framer Motion)
- [ ] Responsive mobile tested
- [ ] Loading states OK
- [ ] Error states OK

---

## 🚀 ACTIONS IMMÉDIATES (Cette semaine)

1. **COMMIT actuel en branche `blood-v1-light`**
   ```bash
   git checkout -b blood-v1-light
   git push origin blood-v1-light
   ```

2. **Créer nouvelle branche `blood-v2-ultrahuman`**
   ```bash
   git checkout main
   git checkout -b blood-v2-ultrahuman
   ```

3. **Implémenter PRIORITÉ 1: Design System**
   - Modifier BloodAnalysisReport.tsx (couleurs)
   - Créer blood-ultrahuman.css (Graphik font)
   - Test responsive

4. **Push et deploy preview**
   ```bash
   git add .
   git commit -m "feat: Blood Analysis V2 - Ultrahuman design system

   - Background #000000 (noir pur)
   - Primary rgb(2,121,232) (bleu électrique)
   - Graphik font + typographie specs
   - Dark mode cohérent

   WIP: Structure 3-couches + citations à venir Sprint 2"
   git push origin blood-v2-ultrahuman
   ```

5. **Review avec moi avant de merger**

---

**Fichier audit:** `/Users/achzod/Desktop/neurocore/AUDIT_BLOOD_ANALYSIS_REPORT.md`
**Date:** 2026-01-26
**Status:** DRAFT → À valider avec Achzod
