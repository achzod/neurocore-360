# ARCHITECTURE MOTEURS IA - NEUROCORE 360
**Date:** 2026-01-10 19:00
**Source:** Analyse complète du GitHub (branche main)

---

## 🎯 VUE D'ENSEMBLE

NEUROCORE 360 utilise **3 SYSTÈMES DE GÉNÉRATION COMPLÈTEMENT INDÉPENDANTS**, chacun avec ses propres prompts, validations et configuration.

**Aucun code partagé entre les 3 systèmes** (sauf knowledge base commune).

---

## 1️⃣ SYSTÈME PREMIUM/ELITE (Anabolic Bioscan + Ultimate Scan)

### Fichiers
- **anthropicEngine.ts** (576 lignes) - Moteur de génération
- **geminiPremiumEngine.ts** (1888 lignes) - Bibliothèque de prompts/validations (legacy name)

### Architecture
```typescript
// anthropicEngine.ts ligne 15
import {
  SECTIONS,
  SECTION_INSTRUCTIONS,
  PROMPT_SECTION,
  getSectionsForTier,
  getSectionInstructionsForTier
} from './geminiPremiumEngine';
```

**geminiPremiumEngine.ts** = Bibliothèque centrale, PAS un moteur
- Contient le code Gemini legacy (non utilisé)
- Exporte TOUTES les validations et prompts
- Utilisé uniquement par anthropicEngine.ts

### Modèle IA
```typescript
// Via ANTHROPIC_CONFIG.ANTHROPIC_MODEL
PRIMARY: claude-sonnet-4-5-20250929  // Default
FALLBACK: claude-opus-4-5-20251101
```

### Sections Générées
- **PREMIUM (Anabolic):** 16 sections
- **ELITE (Ultimate):** 18 sections (+ 2 sections photo/biomécanique)

### Validations Strictes
```typescript
// PREMIUM_VALIDATION (Anabolic Bioscan)
analysis:  { minChars: 5000, minLines: 60,  maxRetries: 3 }
protocol:  { minChars: 7000, minLines: 90,  maxRetries: 3 }
summary:   { minChars: 4000, minLines: 50,  maxRetries: 3 }

// ELITE_VALIDATION (Ultimate Scan)
analysis:  { minChars: 6000, minLines: 75,  maxRetries: 3 }
protocol:  { minChars: 9000, minLines: 120, maxRetries: 3 }
summary:   { minChars: 5000, minLines: 60,  maxRetries: 3 }
photo:     { minChars: 7000, minLines: 85,  maxRetries: 3 }
```

### Knowledge Base Integration
```typescript
// SECTION_KEYWORDS: Record<string, string[]>
// 18 sections → 8 keywords chacune

// getKnowledgeContextForSection()
- 8 sources: huberman, sbs, applied_metabolics, examine, peter_attia, newsletter, RP, mpmd
- 10 articles par section
- 1200 chars par article
```

### Nettoyage IA
```typescript
// cleanPremiumContent()
- Retire meta phrases ("En tant qu'expert", "Voici mon analyse")
- Retire markdown (**, ##, __)
- Retire bullets (-, •)
- Retire emojis
- Retire ASCII art
```

### Prompt Système
**PROMPT_SECTION** (80+ lignes, ligne 349 geminiPremiumEngine.ts)
- Style Achzod (directif, viril, cash, tutoiement)
- Anti-IA strict (interdictions absolues)
- Longueur obligatoire 5000-7000 chars
- Knowledge base obligatoire
- Screening pas diagnostic

### Instructions Spécifiques
**SECTION_INSTRUCTIONS** (1000+ lignes, ligne 431-1543 geminiPremiumEngine.ts)
- Instructions détaillées pour chaque section (40-80 lignes chacune)
- Exemples: Executive Summary, Analyse hormonale, Protocoles, etc.

---

## 2️⃣ SYSTÈME PEPTIDES ENGINE (Standalone)

### Fichier
- **peptides-engine.ts** (autonome) - moteur dedie peptides

### Architecture
```typescript
// peptides-engine.ts
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CONFIG } from "./anthropicConfig";
import { searchArticles, searchFullText } from "./knowledge/storage";
```

**N'importe PAS de geminiPremiumEngine** - systeme completement independant

### Modèle IA
```typescript
model: ANTHROPIC_CONFIG.ANTHROPIC_MODEL  // claude-opus-4-5-20251101
```

### Sections Générées
6 sections fixes:
1. Intro (profil peptides)
2. Diagnostic de depart
3. Peptides recommandes
4. Protocoles & timing
5. Stack supplements
6. Execution + CTA coaching

### Prompts Spécifiques
```typescript
// const prompts: Record<string, string>
{
  intro: "Tu es Achzod, expert peptides... [prompt intro]",
  diagnostic: "Tu es Achzod. Diagnostic detaille... [prompt diagnostic]",
  peptides: "Tu es Achzod. Peptides recommandes... [prompt peptides]",
  protocoles: "Tu es Achzod. Protocoles detaillees... [prompt protocoles]",
  stack: "Tu es Achzod. Stack supplements... [prompt stack]",
  execution: "Tu es Achzod. Plan d'execution + CTA... [prompt execution]"
}
```

### Validations
Validations strictes:
- Minimum lignes / mots par section
- Suppression mentions de sources et de marques
- Sanitization "je" (pas de "nous/on")

### Knowledge Base
```typescript
// getPeptidesKnowledge()
const articles = await searchArticles(keywords, 6);
const full = await searchFullText(keywords);
```
- 6 articles + fallback interne si contexte trop court
- Mêmes sources autorisées que Premium/Elite

### Anti-IA Rules
```typescript
// sanitizePeptidesContent()
- Retire emojis
- Retire "Sources" / "References"
- Interdit citations directes
```

---

## 3️⃣ SYSTÈME DISCOVERY SCAN (Gratuit)

### Fichier
- **discovery-scan.ts** (2343 lignes) - 100% autonome

### Architecture
```typescript
// discovery-scan.ts ligne 13-14
import Anthropic from '@anthropic-ai/sdk';
import { searchArticles, searchFullText } from './knowledge/storage';
```

**N'importe PAS de geminiPremiumEngine** - système complètement indépendant

### Modèle IA
```typescript
// HARDCODÉ - PAS via config!
// Ligne 980 et 1314
model: 'claude-sonnet-4-20250514'
```

### Sections Générées
**10 sections** (pas 4 comme dans geminiPremiumEngine.ts!):
1. Message d'ouverture (intro)
2. Lecture globale (synthèse)
3-10. 8 domaines (sommeil, stress, energie, digestion, training, nutrition, lifestyle, mindset)

### Prompts Spécifiques
```typescript
// Ligne 648: DISCOVERY_SYSTEM_PROMPT (80 lignes)
"Tu es Achzod, coach sportif d'elite...
RÈGLES ANTI-IA ABSOLUES...
OBJECTIF: Analyser et expliquer les blocages SANS recommandations..."

// Ligne 690: SECTION_SYSTEM_PROMPT (section-specific)
"Tu es Achzod. Tu generes UNE SEULE section d'analyse pour le domaine {domain}..."

// Ligne 724+: SECTION_INSTRUCTIONS: Record<string, string>
{
  sommeil: "INSTRUCTIONS SPECIFIQUES POUR SOMMEIL... [40+ lignes]",
  stress: "INSTRUCTIONS SPECIFIQUES POUR STRESS... [40+ lignes]",
  // ... 8 domaines
}
```

### Validations
```typescript
// Ligne 913: "WITH VALIDATION: Minimum 20 lines, retry if too short"
// Ligne 1011: VALIDATION: Check minimum length

// Beaucoup plus permissif que Premium/Elite
- Minimum 20 lignes (vs 60-120 pour Premium/Elite)
- Retry si trop court
```

### Knowledge Base
```typescript
// Ligne 1111
const articles = await searchArticles(keywords.slice(0, 5), 6);
```
- 6 articles par section
- 5 keywords max
- Mêmes sources

### Génération
```typescript
// Ligne 1475: convertToNarrativeReport()
// Génère les 10 sections en PARALLÈLE via Promise.all()
const aiContentPromises = domains.map(async (domain) => {
  const knowledgeContext = await getKnowledgeContextForDomain(domain);
  const content = await generateSectionContentAI(domain, score, responses, knowledgeContext);
  return { domain, content };
});
```

---

## 📊 COMPARAISON DES 3 SYSTÈMES

| Critère | Premium/Elite | Peptides | Discovery |
|---------|--------------|---------|-----------|
| **Fichier moteur** | anthropicEngine.ts | peptides-engine.ts | discovery-scan.ts |
| **Bibliothèque prompts** | geminiPremiumEngine.ts | Interne | Interne |
| **Modèle** | ANTHROPIC_CONFIG (Sonnet) | ANTHROPIC_CONFIG (Opus) | Hardcode Sonnet |
| **Sections** | 16-18 | 6 | 10 |
| **Validation chars** | 5000-9000 | 2200-3000 | Aucune stricte |
| **Validation lignes** | 60-120 | 18 min | 20 min |
| **KB articles/section** | 10 (1200 chars) | 6 | 6 |
| **Retries** | 3 max | 2 + fallback | Retry si court |
| **cleanPremiumContent()** | ✅ Oui | ✅ sanitizePeptidesContent() | ❌ Non |
| **Indépendant** | ❌ Dependance geminiPremiumEngine | ✅ 100% autonome | ✅ 100% autonome |

---

## 🔧 KNOWLEDGE BASE (PARTAGÉ)

### Fichier Commun
`server/knowledge/storage.ts`

### Fonction
```typescript
export async function searchArticles(
  keywords: string[],
  limit: number,
  sources?: string[]
): Promise<Article[]>
```

### Sources (8 officielles)
1. **huberman** - Huberman Lab
2. **sbs** - Stronger By Science
3. **applied_metabolics** - Applied Metabolics
4. **examine** - Examine.com
5. **peter_attia** - Peter Attia
6. **newsletter** - Newsletters ACHZOD
7. **renaissance_periodization** - RP
8. **mpmd** - More Plates More Dates

### Utilisé par
- ✅ anthropicEngine.ts (via getKnowledgeContextForSection)
- ✅ peptides-engine.ts (via getPeptidesKnowledge)
- ✅ discovery-scan.ts (via getKnowledgeContextForDomain)

---

## ⚠️ POINTS CRITIQUES IDENTIFIÉS

### 1. Inconsistance Discovery
**geminiPremiumEngine.ts** dit Discovery = 4 sections (SECTIONS_GRATUIT)
**discovery-scan.ts** génère réellement 10 sections

→ geminiPremiumEngine.ts n'est PAS utilisé par Discovery!

### 2. Modèles différents
- Premium/Elite: Via config (Sonnet primary, Opus fallback)
- Peptides: Via config (Opus primary, OpenAI fallback)
- Discovery: **Hardcodé** Sonnet (pas de fallback)

### 3. Validations absentes
- Discovery: Seulement 20 lignes min
- Peptides: Validations min chars/mots + sanitize
- → Seul Premium/Elite a validations 5000-9000 chars

### 4. Nettoyage IA
- Premium/Elite: `cleanPremiumContent()` retire tirets et marques IA
- Peptides: Nettoyage post-generation (sanitizePeptidesContent)
- Discovery: Aucun nettoyage post-génération

---

## 🎯 ARCHITECTURE CORRECTE CONFIRMÉE

```
NEUROCORE 360
├── Premium/Elite (Anabolic + Ultimate)
│   ├── anthropicEngine.ts (moteur)
│   ├── geminiPremiumEngine.ts (bibliothèque prompts/validations)
│   ├── Modèle: ANTHROPIC_CONFIG (Sonnet → Opus fallback)
│   ├── Validations: 5000-9000 chars, 60-120 lignes
│   └── KB: 10 articles/section, 1200 chars
│
├── Peptides Engine (Standalone)
│   ├── peptides-engine.ts (100% autonome)
│   ├── Modèle: ANTHROPIC_CONFIG (Sonnet → Opus fallback)
│   ├── Validations: Aucune
│   └── KB: 6 articles/section
│
└── Discovery Scan (Gratuit)
    ├── discovery-scan.ts (100% autonome)
    ├── Modèle: Hardcodé 'claude-sonnet-4-20250514'
    ├── Validations: 20 lignes min
    └── KB: 6 articles/section

Knowledge Base (shared)
└── server/knowledge/storage.ts
    └── 8 sources: Huberman, SBS, AM, Examine, Attia, Newsletter, RP, MPMD
```

---

## 📝 CONCLUSION

**geminiPremiumEngine.ts n'est PAS un moteur**, c'est une **bibliothèque de configuration** utilisée UNIQUEMENT par anthropicEngine.ts.

Le nom est legacy (ancien système Gemini), mais le fichier contient maintenant:
- ✅ Prompts système (PROMPT_SECTION)
- ✅ Instructions détaillées par section (SECTION_INSTRUCTIONS)
- ✅ Validations strictes (PREMIUM_VALIDATION, ELITE_VALIDATION)
- ✅ Keywords knowledge base (SECTION_KEYWORDS)
- ✅ Fonctions utilitaires (cleanPremiumContent, getKnowledgeContextForSection)
- ⚠️ Code Gemini mort (non utilisé, présent pour backward compatibility)

**Les 3 systèmes sont complètement indépendants** et ne partagent que la knowledge base.

---

**Auteur:** Claude Code (analyse architecture GitHub)
**Branche:** main
**Commit:** 93202ef6
