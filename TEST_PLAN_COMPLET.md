# PLAN DE TEST COMPLET - NEUROCORE 360

**Date création:** 2026-01-10
**Objectif:** Vérifier end-to-end tous les produits avec garde-fous et workflows

---

## 📋 CHECKLIST GLOBALE

### Phase 1: Exploration & Documentation
- [ ] Explorer tous les garde-fous existants (validation, retry, checks)
- [ ] Localiser dossier photos Ultimate Scan (homme/femme)
- [ ] Documenter workflow emails (templates, triggers, conditions)
- [ ] Documenter admin dashboard features
- [ ] Mapper tous les CTAs et leurs destinations

### Phase 2: Tests par Produit (Ordre)
- [ ] **Discovery Scan** - Test complet
- [ ] **Burnout Engine** - Test complet
- [ ] **Anabolic Bioscan** - Test complet
- [ ] **Ultimate Scan SANS wearables** - Avec photos homme
- [ ] **Ultimate Scan SANS wearables** - Avec photos femme
- [ ] **Ultimate Scan AVEC wearables** - Avec photos homme
- [ ] **Ultimate Scan AVEC wearables** - Avec photos femme

### Phase 3: Validation Cross-Product
- [ ] Vérifier tous les emails reçus
- [ ] Vérifier admin dashboard pour tous les audits
- [ ] Tester tous les CTAs upgrade/downgrade
- [ ] Vérifier exports (PDF/HTML/ZIP)
- [ ] Vérifier review system

### Phase 4: Fixes & Documentation
- [ ] Documenter tous les bugs dans BUGS_FOUND.md
- [ ] Fixer bugs critiques
- [ ] Re-tester après fixes
- [ ] Commit final avec résumé

---

## 🔍 GARDE-FOUS À VÉRIFIER

### 1. Validation de Génération (server/anthropicEngine.ts)

**Location:** `server/anthropicEngine.ts` + `server/geminiPremiumEngine.ts`

#### Validation Rules par Tier
```typescript
ELITE_VALIDATION = {
  analysis: { minChars: 6000, minLines: 75, maxRetries: 3 },
  protocol: { minChars: 9000, minLines: 120, maxRetries: 3 },
  summary: { minChars: 5000, minLines: 60, maxRetries: 3 },
  photo: { minChars: 7000, minLines: 85, maxRetries: 3 }
}

PREMIUM_VALIDATION = {
  analysis: { minChars: 5000, minLines: 60, maxRetries: 3 },
  protocol: { minChars: 7000, minLines: 90, maxRetries: 3 },
  summary: { minChars: 4000, minLines: 50, maxRetries: 3 }
}

GRATUIT_VALIDATION = {
  // Plus permissif
  minChars: 3500,
  minLines: 90
}
```

**Tests à faire:**
- [ ] Vérifier qu'une section trop courte trigger retry
- [ ] Vérifier que retry max = 3
- [ ] Vérifier que le prompt devient plus agressif au retry
- [ ] Vérifier que si retry 3x échoue, section est quand même acceptée (avec warning)

### 2. Photo Validation (Ultimate Scan)

**Location:** `server/reportJobManager.ts` ligne 220-235

```typescript
const requiresPhotos = auditType === "ELITE";
const needsPhotos = requiresPhotos && photos.length < 3;

if (needsPhotos) {
  await storage.failReportJob(auditId, "NEED_PHOTOS");
  await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" });
  return; // ← STOP génération
}
```

**Tests à faire:**
- [ ] Créer Ultimate SANS photos → doit fail avec "NEED_PHOTOS"
- [ ] Créer Ultimate avec 1 photo → doit fail
- [ ] Créer Ultimate avec 2 photos → doit fail
- [ ] Créer Ultimate avec 3 photos → doit succeed

### 3. Report Quality Validation

**Location:** `server/reportValidator.ts` + `server/reportJobManager.ts` ligne 359-388

```typescript
const validation = validateReport(txtReport, htmlReport, tier);

if (!validation.isValid || validation.score < MIN_VALIDATION_SCORE) {
  // Save report but mark as NEEDS_REVIEW
  await storage.updateAudit(auditId, {
    reportDeliveryStatus: "NEEDS_REVIEW"
  });
  throw new Error("Validation échouée"); // ← Email NOT sent
}
```

**Tests à faire:**
- [ ] Vérifier MIN_VALIDATION_SCORE (doit être 60/100)
- [ ] Vérifier que rapport invalide → status "NEEDS_REVIEW"
- [ ] Vérifier qu'aucun email envoyé si NEEDS_REVIEW
- [ ] Vérifier admin notifié si NEEDS_REVIEW

### 4. Email Sending Logic

**Location:** À trouver (probablement `server/routes.ts` ou service email)

**Tests à faire:**
- [ ] Email envoyé seulement si status = "READY"
- [ ] Email contient bon lien vers rapport
- [ ] Email template correct par produit
- [ ] Email CTA upgrade fonctionnel

### 5. Job Status & Recovery

**Location:** `server/reportJobManager.ts`

**Features:**
- Cache progressif: `.cache-anthropic/`
- Resume après crash
- Stuck job detection (45 min threshold)
- Max retry attempts = 3

**Tests à faire:**
- [ ] Vérifier cache sauvegardé après chaque section
- [ ] Simuler crash → vérifier reprise
- [ ] Vérifier stuck job detection
- [ ] Vérifier max retry pas dépassé

---

## 🧪 TEST DISCOVERY SCAN

### Setup
```bash
# Endpoint test
POST /api/discovery-scan/create
{
  "email": "test-discovery@test.com",
  "responses": { ... }
}
```

### Checklist
- [ ] **Questionnaire:** Remplir ~50 questions FREE tier
- [ ] **Submit:** POST /api/discovery-scan/create
- [ ] **Vérifier:** auditId retourné
- [ ] **Vérifier:** narrativeReport généré immédiatement (pas async)
- [ ] **Vérifier:** 8 sections présentes
- [ ] **Vérifier:** globalScore calculé (0-10)
- [ ] **Vérifier:** metrics array (8 domaines)
- [ ] **Page rapport:** Accéder `/discovery/:id`
- [ ] **Design:** Thème ultrahuman jaune OK
- [ ] **Sections:** Toutes affichées correctement
- [ ] **Review:** Form review fonctionnel
- [ ] **CTA:** Upgrade vers Anabolic fonctionnel
- [ ] **Email:** ❓ Email envoyé ? (à vérifier)
- [ ] **Admin:** Audit visible dans dashboard admin

### Validation Attendue
- Chaque section >= 3500 chars
- Chaque section >= 90 lignes
- Contenu HTML bien formaté
- Pas de markdown artifacts (**, ##, ---)

### Bugs Potentiels
- [ ] Section trop courte
- [ ] Markdown non nettoyé
- [ ] Score calculé incorrectement
- [ ] Email non envoyé
- [ ] CTA cassé

---

## 🧪 TEST BURNOUT ENGINE

### Setup
```bash
POST /api/burnout-detection/analyze
{
  "email": "test-burnout@test.com",
  "responses": {
    "e1": "2", "e2": "3", ... (30 questions)
  }
}
```

### Checklist
- [ ] **Questionnaire:** 30 questions burnout (échelle 0-4)
- [ ] **Submit:** POST /api/burnout-detection/analyze
- [ ] **Vérifier:** ID retourné
- [ ] **Vérifier:** globalScore calculé (0-100 santé)
- [ ] **Vérifier:** phase détectée (alarme/resistance/epuisement)
- [ ] **Vérifier:** 6 sections générées
- [ ] **Vérifier:** metrics pour 6 catégories
- [ ] **Page rapport:** Accéder `/burnout/:id`
- [ ] **Design:** Couleur phase correcte (vert/orange/rouge)
- [ ] **Protocoles:** Stack suppléments adapté à la phase
- [ ] **CTA:** Upgrade vers coaching/Anabolic
- [ ] **Email:** ❓ Email envoyé ?
- [ ] **Admin:** Audit visible

### Validation Attendue
- Engine: Claude Opus 4.5 ✅
- Phase calculation correcte
- Protocoles phase-specific

### Bugs Potentiels
- [ ] Phase mal calculée
- [ ] Protocoles incorrects
- [ ] Couleur theme buggée
- [ ] Stack suppléments générique

---

## 🧪 TEST ANABOLIC BIOSCAN

### Setup
```bash
POST /api/audits/create
{
  "email": "test-anabolic@test.com",
  "type": "PREMIUM",
  "responses": { ... (150 questions) }
}
```

### Checklist
- [ ] **Questionnaire:** ~150 questions (FREE + ESSENTIAL)
- [ ] **Submit:** POST /api/audits/create
- [ ] **Vérifier:** auditId retourné
- [ ] **Vérifier:** Job started (status PENDING)
- [ ] **Poll:** GET /api/audits/:id/narrative-status
- [ ] **Attendre:** Status = READY (2-3 min)
- [ ] **Vérifier:** 16 sections générées
- [ ] **Vérifier:** Cache créé `.cache-anthropic/`
- [ ] **Vérifier:** TXT rapport ~30-35 pages
- [ ] **Page rapport:** Accéder `/anabolic/:id`
- [ ] **Design:** Thème émeraude OK
- [ ] **Sections:** Toutes parsées et affichées
- [ ] **Suppléments:** Stack généré correctement
- [ ] **Export:** PDF téléchargeable
- [ ] **Export:** HTML téléchargeable
- [ ] **Export:** ZIP téléchargeable
- [ ] **Review:** Form fonctionnel
- [ ] **CTA:** Upgrade vers Ultimate
- [ ] **Email:** Email "rapport prêt" reçu
- [ ] **Admin:** Job status visible

### Validation Attendue (PREMIUM)
- analysis: >= 5000 chars, >= 60 lignes
- protocol: >= 7000 chars, >= 90 lignes
- summary: >= 4000 chars, >= 50 lignes
- Retry max 3x si trop court

### Bugs Potentiels
- [ ] Section manquante (< 16)
- [ ] Section trop courte (validation fail)
- [ ] Cache non créé
- [ ] Job stuck
- [ ] Email non envoyé
- [ ] Export PDF cassé
- [ ] TXT mal parsé en sections

---

## 🧪 TEST ULTIMATE SCAN - SANS WEARABLES

### Photos à Utiliser
**Localiser:** `/Users/achzod/Desktop/neurocore/photos/` (à trouver)
- Photos homme: front, side, back
- Photos femme: front, side, back

### Test 1: Photos Homme SANS Wearables

#### Setup
```bash
POST /api/audits/create
{
  "email": "test-ultimate-homme@test.com",
  "type": "ELITE",
  "responses": { ... (210 questions, syncWearables: false) },
  "photos": ["base64_front", "base64_side", "base64_back"]
}
```

#### Checklist
- [ ] **Questionnaire:** ~210 questions (FREE + ESSENTIAL + ELITE)
- [ ] **Photos:** 3 photos homme uploadées
- [ ] **Wearables:** syncWearables = false
- [ ] **Submit:** POST /api/audits/create
- [ ] **Vérifier:** Photo analysis lancée AVANT génération TXT
- [ ] **Vérifier:** Photo analysis retourne insights
- [ ] **Vérifier:** Job status GENERATING
- [ ] **Attendre:** Status READY (3-4 min)
- [ ] **Vérifier:** 18 sections générées (16 + 2 photo)
- [ ] **Vérifier:** Sections photo contiennent insights visuels
- [ ] **Page rapport:** Accéder `/ultimate/:id`
- [ ] **Design:** Thème or/amber OK
- [ ] **Photos:** Affichées dans rapport
- [ ] **Sections photo:** "Analyse visuelle" + "Biomécanique" présentes
- [ ] **Export:** PDF avec photos incluses
- [ ] **Export:** ZIP avec photos séparées
- [ ] **Email:** Email "rapport prêt" reçu
- [ ] **Admin:** Photos visibles dans admin

#### Validation Attendue (ELITE)
- analysis: >= 6000 chars, >= 75 lignes
- protocol: >= 9000 chars, >= 120 lignes
- photo: >= 7000 chars, >= 85 lignes
- summary: >= 5000 chars, >= 60 lignes

#### Bugs Potentiels
- [ ] Photos non traitées → rapport quand même généré
- [ ] Sections photo manquantes
- [ ] Insights photo génériques
- [ ] Photos non incluses dans PDF
- [ ] Section photo < 7000 chars

### Test 2: Photos Femme SANS Wearables

**Répéter checklist ci-dessus avec photos femme**

---

## 🧪 TEST ULTIMATE SCAN - AVEC WEARABLES

### Test 3: Photos Homme AVEC Wearables

#### Setup
```bash
POST /api/audits/create
{
  "email": "test-ultimate-wearables@test.com",
  "type": "ELITE",
  "responses": {
    ...
    "syncWearables": true,
    "wearableData": {
      "avgHRV": 45,
      "avgRestingHR": 65,
      "avgSleepScore": 72,
      "avgSteps": 8500
    }
  },
  "photos": [...]
}
```

#### Checklist Supplémentaire
- [ ] **Wearables:** Données HRV/HR/Sleep intégrées
- [ ] **Sections:** Données wearables citées dans sections pertinentes
- [ ] **HRV analysis:** Section cardiovasculaire mentionne HRV réel
- [ ] **Sleep analysis:** Section sommeil mentionne score wearable
- [ ] **Validation:** Insights basés sur données réelles vs estimées

### Test 4: Photos Femme AVEC Wearables

**Répéter checklist ci-dessus avec photos femme + wearables**

---

## 📧 WORKFLOW EMAILS

### Emails à Vérifier

#### 1. Email Rapport Prêt (tous produits)
**Trigger:** Job status = READY
**Template:** À trouver
**Contenu attendu:**
- Nom du client
- Lien vers rapport
- CTA upgrade (si GRATUIT/PREMIUM)
- Branding ApexLabs

**Tests:**
- [ ] Discovery → email reçu
- [ ] Burnout → email reçu
- [ ] Anabolic → email reçu
- [ ] Ultimate → email reçu

#### 2. Email Erreur Génération
**Trigger:** Job status = FAILED
**Tests:**
- [ ] Simuler erreur → email admin reçu

#### 3. Email Review Submitted
**Trigger:** User soumet review
**Tests:**
- [ ] Soumettre review → email confirmation

#### 4. Email Upgrade Prompts
**Trigger:** User sur rapport GRATUIT
**Tests:**
- [ ] CTA email upgrade fonctionnel

---

## 🎛️ ADMIN DASHBOARD

### Features à Vérifier

**Location:** `/admin` ou `/admin-dashboard`

#### Checklist
- [ ] **Login:** Accès admin sécurisé
- [ ] **Liste audits:** Tous les audits visibles
- [ ] **Filtres:** Par type (GRATUIT/PREMIUM/ELITE)
- [ ] **Filtres:** Par status (PENDING/READY/FAILED)
- [ ] **Détails audit:** Voir réponses questionnaire
- [ ] **Détails audit:** Voir rapport généré
- [ ] **Détails audit:** Voir photos (Ultimate)
- [ ] **Job status:** Status génération en temps réel
- [ ] **Actions:** Forcer régénération
- [ ] **Actions:** Supprimer audit
- [ ] **Métriques:** Stats globales (nb audits, taux succès, etc.)
- [ ] **Reviews:** Voir toutes les reviews soumises

---

## 🔗 CTAs À VÉRIFIER

### Discovery Scan CTAs
- [ ] CTA "Débloquer Anabolic Bioscan" → `/offers/anabolic-bioscan`
- [ ] CTA Review → Form review fonctionnel
- [ ] Footer links → Fonctionnels

### Anabolic CTAs
- [ ] CTA "Upgrade Ultimate Scan" → `/offers/ultimate-scan`
- [ ] CTA Review → Form review
- [ ] CTA Coaching → Lien externe

### Ultimate CTAs
- [ ] CTA Coaching → Lien externe
- [ ] CTA Review → Form review

### Burnout CTAs
- [ ] CTA "Anabolic Bioscan" → `/offers/anabolic-bioscan`
- [ ] CTA Coaching → Lien externe

---

## 📊 EXPORTS À VÉRIFIER

### Pour Anabolic & Ultimate

#### PDF Export
- [ ] **Endpoint:** GET `/api/audits/:id/export/pdf`
- [ ] **Contenu:** Rapport formaté PDF
- [ ] **Photos:** Incluses si Ultimate
- [ ] **Taille:** Raisonnable (< 10MB)
- [ ] **Branding:** Logo ApexLabs présent

#### HTML Export
- [ ] **Endpoint:** GET `/api/audits/:id/export/html`
- [ ] **Contenu:** HTML standalone
- [ ] **Styling:** CSS inline
- [ ] **Lisibilité:** Offline readable

#### ZIP Export
- [ ] **Endpoint:** GET `/api/audits/:id/export/zip`
- [ ] **Contenu:** PDF + HTML + photos (si Ultimate)
- [ ] **Structure:** Organisé proprement

---

## 📂 DOSSIER PHOTOS

### Localisation
**À trouver:** `/Users/achzod/Desktop/neurocore/photos/` ou similaire

**Structure attendue:**
```
photos/
├── homme/
│   ├── front.jpg
│   ├── side.jpg
│   └── back.jpg
└── femme/
    ├── front.jpg
    ├── side.jpg
    └── back.jpg
```

**Actions:**
- [ ] Localiser le dossier
- [ ] Vérifier 6 photos disponibles (3 homme + 3 femme)
- [ ] Convertir en base64 pour tests
- [ ] Documenter chemins

---

## 🐛 DOCUMENTATION BUGS

**Fichier:** `BUGS_FOUND.md` (à créer au fur et à mesure)

**Format:**
```markdown
## BUG #001 - Section trop courte pas retried

**Produit:** Anabolic Bioscan
**Sévérité:** HAUTE
**Date:** 2026-01-10
**Description:** Section "Protocole Matin" générée avec 3200 chars au lieu de 7000 min
**Steps to reproduce:** ...
**Fix:** ...
**Status:** ❌ Non fixé
```

---

## ✅ ORDRE D'EXÉCUTION

1. **Phase Exploration** (1-2h)
   - Trouver dossier photos
   - Explorer garde-fous existants
   - Mapper workflow emails
   - Explorer admin dashboard

2. **Phase Tests Discovery** (30 min)
   - Créer audit test
   - Vérifier rapport
   - Documenter bugs

3. **Phase Tests Burnout** (30 min)
   - Créer audit test
   - Vérifier rapport
   - Documenter bugs

4. **Phase Tests Anabolic** (1h)
   - Créer audit test
   - Attendre génération
   - Vérifier rapport
   - Tester exports
   - Documenter bugs

5. **Phase Tests Ultimate** (2-3h)
   - 4 tests: homme/femme × avec/sans wearables
   - Vérifier photos traitées
   - Vérifier exports
   - Documenter bugs

6. **Phase Fixes** (variable)
   - Fixer bugs critiques
   - Re-tester
   - Commit fixes

7. **Phase Documentation Finale**
   - Résumé tests dans ce doc
   - Liste bugs fixés
   - Recommandations

---

**Status:** 🟡 En cours
**Dernière mise à jour:** 2026-01-10

