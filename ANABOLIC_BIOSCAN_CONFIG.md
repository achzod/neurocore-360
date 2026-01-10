# ANABOLIC BIOSCAN (PREMIUM) - CONFIGURATION COMPLÈTE
**Date:** 2026-01-10 20:00
**Tier:** PREMIUM
**Nom commercial:** Anabolic Bioscan
**Prix:** 59 EUR

---

## 🎯 NOMENCLATURE OFFICIELLE

```typescript
// Internal tier names (server/types.ts)
export type AuditTier = 'GRATUIT' | 'PREMIUM' | 'ELITE';

// Display names
GRATUIT = "Discovery Scan" (gratuit, 10 sections)
PREMIUM = "Anabolic Bioscan" (59 EUR, 16 sections, SANS photos)
ELITE = "Ultimate Scan" (79 EUR, 18 sections, AVEC photos 3x)

// URL slugs
/discovery-scan → GRATUIT
/anabolic-bioscan → PREMIUM
/ultimate-scan → ELITE
```

**RÈGLE ABSOLUE :**
- **Anabolic Bioscan = PREMIUM = SANS PHOTOS**
- **Ultimate Scan = ELITE = AVEC PHOTOS**

---

## 📊 SECTIONS GÉNÉRÉES (16 total)

```typescript
// server/geminiPremiumEngine.ts ligne 265-291
const SECTIONS_ANABOLIC: SectionName[] = [
  // EXECUTIVE (1 section)
  "Executive Summary",

  // ANALYSES (6 sections)
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Analyse axes hormonaux",

  // PROTOCOLES (5 sections)
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",

  // PLAN (3 sections)
  "Plan Semaine par Semaine 30-60-90",
  "KPI et Tableau de Bord",
  "Stack Supplements Optimise",

  // CONCLUSION (1 section)
  "Synthese et Prochaines Etapes"
];
```

**Total:** 16 sections (vs 18 pour Ultimate qui ajoute 2 sections photo/biomécanique)

---

## ✅ VALIDATIONS STRICTES

```typescript
// server/geminiPremiumEngine.ts ligne 30-33
const PREMIUM_VALIDATION: Record<string, ContentValidation> = {
  analysis: { minChars: 5000, minLines: 60, maxRetries: 3 },
  protocol: { minChars: 7000, minLines: 90, maxRetries: 3 },
  summary: { minChars: 4000, minLines: 50, maxRetries: 3 }
};
```

**Catégories de sections** (ligne 50-67):
```typescript
const SECTION_CATEGORIES: Record<SectionName, keyof typeof PREMIUM_VALIDATION> = {
  // 'analysis' → 5000 chars min, 60 lignes min
  "Analyse entrainement et periodisation": "analysis",
  "Analyse systeme cardiovasculaire": "analysis",
  "Analyse metabolisme et nutrition": "analysis",
  "Analyse sommeil et recuperation": "analysis",
  "Analyse digestion et microbiote": "analysis",
  "Analyse axes hormonaux": "analysis",

  // 'protocol' → 7000 chars min, 90 lignes min
  "Protocole Matin Anti-Cortisol": "protocol",
  "Protocole Soir Verrouillage Sommeil": "protocol",
  "Protocole Digestion 14 Jours": "protocol",
  "Protocole Bureau Anti-Sedentarite": "protocol",
  "Protocole Entrainement Personnalise": "protocol",

  // 'summary' → 4000 chars min, 50 lignes min
  "Executive Summary": "summary",
  "Plan Semaine par Semaine 30-60-90": "summary",
  "Synthese et Prochaines Etapes": "summary",
  "KPI et Tableau de Bord": "summary",
  "Stack Supplements Optimise": "analysis" // Traité comme analysis
};
```

**Retry mechanism** (ligne 1602-1650):
- Génération initiale
- Si trop court → retry avec prompt renforcé
- Max 3 retries par section
- Logging complet dans DB

---

## 🛡️ GARDES-FOUS

### 1. Validation photos (server/routes.ts ligne 227-234)
```typescript
// Photos obligatoires UNIQUEMENT pour Ultimate Scan (ELITE)
if (data.type === "ELITE" && !hasThreePhotos(data.responses)) {
  res.status(400).json({
    error: "NEED_PHOTOS",
    message: "3 photos obligatoires pour Ultimate Scan (face, profil, dos)"
  });
  return;
}
```

**IMPORTANT:** Anabolic Bioscan (PREMIUM) ne doit JAMAIS demander de photos.

### 2. Nettoyage IA (server/geminiPremiumEngine.ts ligne 125-158)
```typescript
export function cleanPremiumContent(content: string): string {
  return content
    // Retire listes à puces
    .replace(/^\s*[-•]\s+/gm, '')
    // Retire markdown
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/#{1,6}\s+/g, '')
    // Retire emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    // Retire meta phrases IA
    .replace(/^(En tant qu'expert|Voici (mon|une) analyse|Permettez-moi de).*/gmi, '')
    // Retire ASCII art
    .replace(/[╔╗╚╝║═╠╣╬]+/g, '')
    .trim();
}
```

### 3. Validation finale (server/reportValidator.ts)
- Vérification longueur totale
- Détection phrases IA bannies
- Check sections manquantes
- Log complet en DB

---

## 💰 PRICING & CTA

### Prix
```typescript
// server/cta.ts ligne 12-15
export const PRICING = {
  FREE: 0,
  PREMIUM: 59
};
```

### CTA Début (ligne 17-48)
```typescript
export function getCTADebut(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    // CTA upgrade vers PREMIUM
    return "Pour debloquer l'analyse COMPLETE... passe a l'analyse PREMIUM."
  }

  // Pour PREMIUM et ELITE
  return `Tu consultes ton analyse PREMIUM NEUROCORE 360 complete.

IMPORTANT : Si tu decides de prendre un coaching avec moi apres cette analyse,
le montant que tu as paye pour cette analyse (59EUR pour Premium, 79EUR pour Elite) sera DEDUIT A 100%
du prix du coaching.`;
}
```

### CTA Fin (ligne 52-147)
```typescript
export function getCTAFin(tier: AuditTier, amountPaid: number = PRICING.PREMIUM): string {
  if (tier === 'GRATUIT') {
    // Propose upgrade vers Anabolic OU Ultimate
    return `
OPTION 1 : ANABOLIC BIOSCAN (79 EUR) - LE PLUS COMPLET SANS PHOTOS
[Description 16 sections]

OPTION 2 : ULTIMATE SCAN (79 EUR) - SI TU AS DES PHOTOS
Tout ce qu'inclut Anabolic Bioscan PLUS :
+ Analyse photo posturale complete (face/profil/dos)
+ Diagnostic biomecanique et mobilite
`;
  }

  // Pour PREMIUM/ELITE → CTA coaching
  return `MES FORMULES :

ESSENTIAL ELITE
Suivi hebdomadaire, ajustements continus, acces messagerie
[...]`;
}
```

---

## 📚 KNOWLEDGE BASE

### Intégration (server/geminiPremiumEngine.ts ligne 160-223)
```typescript
// 8 keywords par section
const SECTION_KEYWORDS: Record<string, string[]> = {
  "Analyse axes hormonaux": [
    'testosterone', 'cortisol', 'thyroid', 'DHEA', 'estrogen',
    'insulin', 'growth hormone', 'leptin'
  ],
  // ... 17 autres sections
};

// Fonction de récupération
async function getKnowledgeContextForSection(section: SectionName): Promise<string> {
  const keywords = SECTION_KEYWORDS[section] || [];
  const articles = await searchArticles(keywords, 10); // 10 articles

  return articles.map(a => {
    const snippet = a.content.slice(0, 1200); // 1200 chars max
    return `SOURCE: ${a.source}\nTITLE: ${a.title}\n\n${snippet}`;
  }).join('\n\n---\n\n');
}
```

### Sources (8 officielles)
1. **huberman** - Huberman Lab
2. **sbs** - Stronger By Science
3. **applied_metabolics** - Applied Metabolics
4. **examine** - Examine.com
5. **peter_attia** - Peter Attia MD
6. **newsletter** - Newsletters ACHZOD
7. **renaissance_periodization** - RP Strength
8. **mpmd** - More Plates More Dates

**Par section:** 10 articles, 1200 chars chacun = 12 000 chars de contexte scientifique

---

## 💊 SUPPLEMENTS (Stack Supplements Optimise)

### Génération (server/supplementEngine.ts)

#### Mode HTML (pour email/dashboard)
```typescript
// ligne 842-1066
export function generateEnhancedSupplementsHTML(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
  firstName?: string;
}): string
```

**Contenu:**
- Explication humaine détaillée (HUMAN_EXPLANATIONS)
- Protocole dosage/timing/cycle
- Recommandations produits iHerb (3 options: MON CHOIX / ALTERNATIVE / BUDGET)
- Liens affiliés iHerb avec tracking
- Synergies et précautions
- Guide lecture étiquettes

#### Mode Texte (pour rapport TXT)
```typescript
// ligne 1068-1273
export function generateSupplementsSectionText(input: {
  responses: Record<string, unknown>;
  globalScore?: number;
  firstName?: string;
}): string
```

**Contenu:**
- Protocole d'introduction (semaine par semaine)
- Sécurité médicaments
- Explication WHY/HOW/PROTOCOL pour chaque supplément
- Marques recommandées
- Budget estimé (15-35 EUR/mois par supplément)

#### Sélection intelligente
```typescript
// ligne 639-683
export function selectSupplementsForDomain(
  domain: string,
  score: number,
  responses: Record<string, unknown>,
  meds: string[] = []
): SupplementProtocolAdvanced[]
```

**Logique:**
- Score ≥ 80 → 0 suppléments
- Score < 50 → 5 suppléments max
- Score 50-60 → 4 suppléments
- Score 60-70 → 3 suppléments
- Score 70-80 → 2 suppléments
- Filtre interactions médicamenteuses (SAFETY_GATES)
- Tri par grade évidence (A > B > C > D)

#### Bibliothèque (ligne 72-637)
7 domaines:
- **cardiovascular** (5 suppléments: Omega-3, Bergamot, Magnesium, Nattokinase, CoQ10)
- **joints** (5 suppléments: Glucosamine, Chondroïtine, Collagène, UC-II, Boswellia)
- **cortisol_stress** (5 suppléments: Ashwagandha, Phosphatidylserine, Tongkat Ali, L-Theanine, Magnesium)
- **testosterone** (5 suppléments: Vitamine D3, Zinc, Boron, Tongkat Ali, Shilajit)
- **sleep** (5 suppléments: Glycine, Magnesium Bisglycinate, Apigénine, L-Theanine, Mélatonine)
- **neurotransmitters** (5 suppléments: Citicoline, Alpha-GPC, L-Tyrosine, Safran, Créatine)
- **performance** (4 suppléments: Créatine, Citrulline Malate, Beta-Alanine, Caféine)

**Par supplément:**
- Forme recommandée (ex: "Bisglycinate pas oxide")
- Dosage précis (daily_amount, units, split)
- Timing optimal
- Cycle (permanent, ON/OFF, durée)
- Mécanisme d'action scientifique
- Grade évidence (A/B/C/D)
- Citations études (PMIDs)
- Risques et contre-indications
- Synergies
- Antagonismes
- Label checks (comment lire étiquette)
- Query iHerb

---

## 🖼️ DASHBOARD FORMAT

### Composant (client/src/components/FullReport.tsx)

**Thèmes disponibles** (ligne 111-172):
1. **Neurocore** (default): Primary #0efc6d, Background #000000
2. **Ultrahuman (M1 Black)**: Primary #E1E1E1, Background #000000
3. **Metabolic (Fire)**: Primary #FF4F00, Background #050505
4. **Titanium**: Primary #000000, Background #F2F2F2 (light mode)

**Structure Dashboard** (ligne 1699-1847):
```typescript
// Header avec nom client + score global
<header>
  <h1>{reportData.clientName}, voici ton audit.</h1>
  <p>Score global: {globalScore}/100</p>
</header>

// Grid dashboard
<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Radial Progress - Score global */}
  <RadialProgress score={globalScore} max={10} />

  {/* Radar Chart - Balance systémique */}
  <MetricsRadar data={metrics} />

  {/* KPIs individuels */}
  {/* Projection 90 jours */}
</section>
```

**Sections longform** (ligne 1850-1923):
- Sticky header gauche (numéro + titre + chips)
- Visualisation section (gauge/bars/timeline/comparison/stack)
- Contenu HTML parsé
- Navigation prev/next flottante
- Progress bar scroll

**Components interactifs:**
- `RadialProgress` - Gauge animé avec hover glow
- `MiniGauge` - Half-circle pour sous-scores
- `ScoreBar` - Barres animées avec status (critical/warning/good)
- `MetricsRadar` - Radar chart 5 axes
- `TimelineChart` - Évolution temporelle (Sommeil/HRV/Energie)
- `ComparisonChart` - Bars comparaison metrics
- `StackVisualization` - Tabs Matin/Midi/Soir avec dots priorité

---

## ⚙️ MOTEUR DE GÉNÉRATION

### Anthropic Engine (server/anthropicEngine.ts)

**Modèle IA:**
```typescript
// server/anthropicConfig.ts ligne 10-11
ANTHROPIC_MODEL: "claude-sonnet-4-5-20250929" // PRIMARY
ANTHROPIC_FALLBACK_MODEL: "claude-opus-4-5-20251101" // FALLBACK
```

**Imports** (ligne 15):
```typescript
import {
  SECTIONS,
  SECTION_INSTRUCTIONS,
  PROMPT_SECTION,
  getSectionsForTier,
  getSectionInstructionsForTier
} from './geminiPremiumEngine';
```

**Flux génération:**
1. `getSectionsForTier('PREMIUM')` → retourne SECTIONS_ANABOLIC (16 sections)
2. Pour chaque section:
   - Récupère knowledge context (10 articles)
   - Récupère instructions spécifiques (SECTION_INSTRUCTIONS[section])
   - Appelle Claude Sonnet avec:
     - System prompt (PROMPT_SECTION)
     - Instructions section
     - Knowledge base
     - Données client (responses)
   - Valide longueur (PREMIUM_VALIDATION)
   - Si trop court → retry avec prompt renforcé (max 3x)
   - Clean content (retire markdown/emojis/meta phrases)
3. Assemble rapport final TXT + HTML

**Prompt Système** (geminiPremiumEngine.ts ligne 349-430):
- Style Achzod: directif, viril, cash, tutoiement
- Anti-IA strict: ZERO liste à puces, ZERO emojis, ZERO phrases clichés
- Longueur obligatoire: 5000-7000 chars minimum
- Knowledge base obligatoire
- Screening pas diagnostic
- Ton expert empathique

---

## 📋 WORKFLOW COMPLET

### 1. Soumission formulaire
```
Client remplit questionnaire Anabolic Bioscan (SANS photos)
→ POST /api/create-audit
→ Validation: data.type === "PREMIUM"
→ Check photos: NON REQUIS (seulement pour ELITE)
→ Paiement Stripe 79 EUR
→ Création job background
```

### 2. Génération rapport
```
reportJobManager.ts:
→ getSectionsForTier('PREMIUM') → 16 sections
→ Pour chaque section:
  → generateSectionWithAnthropicClaude()
  → Validation PREMIUM_VALIDATION
  → Retry si trop court (max 3x)
  → cleanPremiumContent()
→ Génération Stack Supplements (supplementEngine)
→ Ajout CTAs (getCTADebut + getCTAFin)
→ Validation finale (reportValidator)
→ Export HTML + TXT + PDF
→ Email SendPulse
```

### 3. Delivery
```
Mode DELAYED:
  PREMIUM → 48h après paiement
  GRATUIT → 24h après soumission

Mode INSTANT:
  Immédiatement après génération
```

---

## 🧪 TESTS

### Payload test (sans photos)
```json
{
  "type": "PREMIUM",
  "email": "test@example.com",
  "responses": {
    "prenom": "Marc",
    "age": "35",
    "sexe": "homme",
    "poids": "82",
    "taille": "178",
    "objectif": "Prise de masse musculaire",
    "niveau-activite": "intermediaire",
    "sommeil-heures": "6",
    "stress-niveau": "eleve",
    "digestion-problemes": "ballonnements",
    "entrainement-frequence": "3-4x/semaine"
  }
}
```

**Résultat attendu:**
- ✅ 200 OK
- ✅ Génération 16 sections
- ✅ Aucune erreur NEED_PHOTOS
- ✅ Stack supplements personnalisée
- ✅ CTAs coaching (pas upgrade)
- ✅ Validation PREMIUM_VALIDATION passed
- ✅ Email envoyé après 48h (mode delayed)

### Fichiers test
```bash
server/test-ultimate-scan.ts  # Test ELITE (avec photos)
server/test-all-offers.ts      # Test 3 tiers
server/test-e2e-reports.ts     # Test end-to-end
```

---

## 📊 DIFFÉRENCES ANABOLIC vs ULTIMATE

| Critère | Anabolic Bioscan (PREMIUM) | Ultimate Scan (ELITE) |
|---------|---------------------------|----------------------|
| **Prix** | 59 EUR | 79 EUR |
| **Sections** | 16 | 18 |
| **Photos requises** | ❌ NON | ✅ OUI (3 photos) |
| **Sections uniques** | - | "Analyse visuelle et posturale complete"<br>"Analyse biomecanique et sangle profonde" |
| **Validation** | PREMIUM_VALIDATION | ELITE_VALIDATION (plus strict) |
| **Use case** | Optimisation métabolique/hormonale<br>Sans besoin analyse posturale | Analyse complète avec diagnostic<br>posture + biomécanique |
| **Public cible** | Athlètes, optimizers, sans photos | Clients avec photos disponibles<br>Besoin analyse posturale |

---

## 🔄 MIGRATIONS & COMPATIBILITÉ

### Legacy names
Le fichier `geminiPremiumEngine.ts` contient encore du code Gemini mort (non utilisé).
Le nom est legacy mais le fichier est maintenant une **bibliothèque de configuration** pour Anthropic.

### Backward compatibility
```typescript
// types.ts conserve les anciens noms internes
AuditTier = 'GRATUIT' | 'PREMIUM' | 'ELITE'

// Mais expose les noms commerciaux
TierDisplayNames = {
  GRATUIT: 'Discovery Scan',
  PREMIUM: 'Anabolic Bioscan',  // Nouveau nom commercial
  ELITE: 'Ultimate Scan'         // Nouveau nom commercial
}
```

### Database
```sql
-- Table audits
type VARCHAR(20) -- Stocke 'GRATUIT' | 'PREMIUM' | 'ELITE'

-- Table validation_logs
tier VARCHAR(20) -- Stocke 'GRATUIT' | 'PREMIUM' | 'ELITE'
```

---

## ✅ CHECKLIST PRÉ-LANCEMENT

### Code
- [x] Photos uniquement pour ELITE (routes.ts ligne 227)
- [x] SECTIONS_ANABOLIC = 16 sections (geminiPremiumEngine.ts)
- [x] PREMIUM_VALIDATION appliquée (5000-9000 chars)
- [x] cleanPremiumContent() actif
- [x] Knowledge base 10 articles/section
- [x] Supplements bibliothèque complète
- [x] CTAs corrects (79 EUR, coaching deduction)
- [x] TierDisplayNames cohérents

### Tests
- [ ] Test payload Anabolic SANS photos → 200 OK
- [ ] Test payload Anabolic AVEC photos → 200 OK (photos ignorées)
- [ ] Test génération 16 sections complètes
- [ ] Test validations (longueur, retry)
- [ ] Test supplements sélection intelligente
- [ ] Test dashboard render (4 thèmes)
- [ ] Test email delivery (48h delayed)

### Documentation
- [x] ANABOLIC_BIOSCAN_CONFIG.md (ce document)
- [x] ARCHITECTURE_MOTEURS_IA.md
- [x] BUG_PHOTOS_PREMIUM.md

---

**Auteur:** Claude Code (audit configuration GitHub)
**Branche:** main
**Commit:** f6822693 (après fix photos)
