# CORRECTIONS NEUROCORE 360 - 2026-01-10

## 🎯 CONTEXTE

Suite au test Discovery Scan (ID: 188c1a52-53e0-4078-b607-516f518833e2), plusieurs problèmes critiques ont été identifiés:
1. Couleurs VERTES au lieu de JAUNE (style Ultrahuman)
2. Branding "NEUROCORE 360" au lieu de "ApexLabs by Achzod"
3. Code mort (geminiPremiumEngine) qui n'était plus utilisé
4. Marques IA ("-") encore présentes dans les rapports
5. Sections trop courtes (3 lignes au lieu de 20-30)

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. NETTOYAGE CODE MORT

**Fichiers supprimés:**
- ✅ `server/geminiPremiumEngine.ts` (1888 lignes) - MORT, remplacé par anthropicEngine.ts
- ✅ `server/geminiConfig.ts` - Configuration Gemini non utilisée
- ✅ `server/openaiPremiumEngine.ts` (24K) - MORT, reports use Claude Opus 4.5
- ✅ `server/openaiConfig.ts` (obsolète) - Recréé en stub minimal pour photoAnalysisAI

**Nouveau fichier créé:**
- ✅ `server/reportStructure.ts` - Contient les exports partagés:
  - `getSectionsForTier()`
  - `PROMPT_SECTION`
  - `SECTIONS_GRATUIT`, `SECTIONS_ANABOLIC`, `SECTIONS_ULTIMATE`
  - `getSectionInstructionsForTier()`
  - `SECTIONS_LOCKED_*` (pour teasers Discovery)

**Imports nettoyés:**
- ✅ `server/reportJobManager.ts` - Retire import geminiPremiumEngine, utilise anthropicEngine
- ✅ `server/anthropicEngine.ts` - Import depuis reportStructure.ts
- ✅ `server/reportValidator.ts` - Import depuis reportStructure.ts

**Moteur de génération confirmé:**
- **Claude Opus 4.5** (`claude-opus-4-5-20251101`) - SEUL moteur utilisé pour TOUS les produits
- Gemini: CODE MORT, jamais appelé
- OpenAI: Utilisé UNIQUEMENT pour photoAnalysisAI (GPT-4 Vision)

---

### 2. COULEURS - Style Ultrahuman (JAUNE #FCDD00)

**Avant:** Vert néon #0efc6d (NEUROCORE 360 legacy)
**Après:** Jaune #FCDD00 (Ultrahuman M1 Black style)

**Fichiers modifiés:**

#### `client/src/components/FullReport.tsx`
- ❌ **SUPPRIMÉ** thème "neurocore" (vert #0efc6d)
- ✅ **MODIFIÉ** thème "ultrahuman" M1 Black:
  ```typescript
  primary: '#FCDD00'  // était #E1E1E1 (gris)
  surface: '#0a0a0a'
  border: 'rgba(252, 221, 0, 0.15)'
  grid: 'rgba(252, 221, 0, 0.05)'
  glow: 'rgba(252, 221, 0, 0.2)'
  ```
- ✅ Ligne 396: `color = '#FCDD00'` (RadialProgress default)

#### `server/emailService.ts`
- ✅ COLORS.primary: `#FCDD00` (était #0efc6d)
- ✅ Gradient header: `linear-gradient(135deg, #FCDD00 0%, #d4af37 100%)` (était vert)
- ✅ Ligne 633 (review rewards): Gradient yellow

**4 thèmes conservés:**
1. **M1 Black** (dark, yellow #FCDD00) ← DEFAULT
2. **Fire** (dark, orange #FF4F00)
3. **Titanium** (light, black)
4. **Sand Stone** (light, beige #A85A32)

---

### 3. BRANDING - ApexLabs by Achzod

**Avant:** "NEUROCORE 360" partout
**Après:** "ApexLabs by Achzod"

#### `server/emailService.ts`
- ✅ Ligne 4: `SENDER_NAME = "ApexLabs by Achzod"` (était "NEUROCORE 360")
- ✅ Ligne 86: Email header logo: `"APEXLABS"` (était "NEUROCORE 360")
- ✅ Ligne 92: Email title: `"Scan Bio-Data"` (était "Audit Metabolique")
- ✅ Ligne 93: Subtitle: `"Analyse Métabolique Complète"` (était "15 Domaines d'Analyse")

**Branding cohérent:**
- Emails: **ApexLabs by Achzod**
- Dashboard: **Ultrahuman style** (4 thèmes disponibles)
- Footer: Achzod Coaching (conservé)

---

## ⚠️ BUGS RESTANTS À FIXER

### BUG #1: Sections COURTES (3 lignes au lieu de 20-30)

**Cause identifiée:** `server/anthropicEngine.ts` (ex-geminiPremiumEngine)
- Validation compte les **newlines** au lieu du **vrai contenu**
- Un paragraphe de 5000 chars SANS newlines = 1 ligne (échoue validation)
- Après 3 retries, le système ACCEPTE la section courte quand même

**Fichier:** `server/anthropicEngine.ts` (ou geminiPremiumEngine backup)
**Fix requis:**
1. Compter les **phrases** (split by `.` ou `!` ou `?`) au lieu des newlines
2. OU compter les **mots** divisés par 15-20 (estimation lignes)
3. Augmenter les seuils minimum

**Impact:** 🔴 CRITIQUE - Tous les rapports Premium/Elite sont trop courts

---

### BUG #2: Marques IA "-" toujours présentes

**Cause identifiée:** `server/reportValidator.ts`
- AI_PATTERNS (61 patterns) ne contient PAS de check pour "-"
- `cleanPremiumContent()` retire les bullets au DÉBUT des lignes (`/^\s*[-•]\s+/`)
- Mais les tirets DANS le texte ("This - that") restent

**Fix requis:**
1. Ajouter à AI_PATTERNS:
   ```typescript
   " - ",    // Tiret entouré d'espaces (liste inline)
   "- ",     // Début de ligne (backup si clean rate)
   ```
2. OU renforcer le regex de nettoyage

**Impact:** ⚠️ MAJEUR - Détection IA visible dans rapports

---

### BUG #3: Section "Analyse energie et recuperation" manquante (Discovery)

**Attendu:** 4 sections pour Discovery Scan
**Reçu:** 3 sections

**Sections manquantes:**
- "Analyse energie et recuperation"

**À investiguer:**
- Loop de génération dans anthropicEngine
- Condition qui skip cette section
- Crash silencieux pendant génération

**Impact:** 🔴 CRITIQUE - Tous les Discovery Scans incomplets

---

## 📊 RÉSUMÉ DES CHANGEMENTS

| Composant | Avant | Après | Status |
|-----------|-------|-------|--------|
| **Moteur génération** | Gemini (mort) | Claude Opus 4.5 | ✅ Confirmé |
| **Couleur primary** | Vert #0efc6d | Jaune #FCDD00 | ✅ Corrigé |
| **Branding emails** | NEUROCORE 360 | ApexLabs by Achzod | ✅ Corrigé |
| **Thèmes dashboard** | 4 (dont 1 vert) | 4 (Ultrahuman jaune) | ✅ Corrigé |
| **Code mort** | 4 fichiers (3000+ lignes) | Supprimé + stub | ✅ Nettoyé |
| **Sections courtes** | BUG validation | - | ❌ À fixer |
| **Marques IA "-"** | Non détecté | - | ❌ À fixer |
| **Section manquante** | Discovery 3/4 | - | ❌ À fixer |

---

## 🔧 PROCHAINES ÉTAPES

1. **Compiler et tester** - Vérifier que tout compile
2. **Fixer validation sections** - Correction bug comptage lignes
3. **Fixer détection tirets** - Ajouter pattern "-"
4. **Fixer section manquante** - Debug génération Discovery
5. **Re-tester Discovery Scan** - Test complet avec nouveau client
6. **Documenter prompts** - Extraire SECTION_INSTRUCTIONS complet depuis backup

---

## 📝 NOTES TECHNIQUES

### Extraction Gemini → ReportStructure

Les constantes suivantes ont été extraites de `geminiPremiumEngine.ts` (git backup):
- SECTIONS_GRATUIT, SECTIONS_ANABOLIC, SECTIONS_ULTIMATE
- getSectionsForTier()
- PROMPT_SECTION (prompt système principal 80 lignes)
- getSectionInstructionsForTier() (stub - à compléter)

**Note:** SECTION_INSTRUCTIONS complet (1000+ lignes) non extrait pour l'instant.
Backup disponible: `/tmp/gemini_backup.ts` (1888 lignes)

### Knowledge Base Confirmée

✅ Knowledge base est UTILISÉE - injection dans chaque section:
- Huberman Lab, SBS, Applied Metabolics, Examine, Peter Attia, ACHZOD
- 8-10 articles par section via `generateKnowledgeContext()`
- Base scientifique pour tous les protocoles

---

**Date:** 2026-01-10 17:50
**Branch:** main
**Auteur:** Claude Code (corrections post-test)
