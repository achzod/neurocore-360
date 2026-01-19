# FINDINGS - EXPLORATION SYSTÈME NEUROCORE 360

**Date:** 2026-01-10
**Phase:** Exploration pré-tests

---

## ✅ PHOTOS DE TEST LOCALISÉES

### Dossier Principal
**Location:** `/Users/achzod/Desktop/neurocore/server/test-data/photos/`

**Contenu:**
```
front.jpeg  - 350KB
side.jpeg   - 298KB
back.jpeg   - 532KB
```

**Type:** Photos homme (probablement)

### Dossiers Alternatifs
- `/Users/achzod/Desktop/neurocore/client/src/assets/test-photos/` (même photos)
- `/Users/achzod/Desktop/neurocore/photos test/femme 1/` (VIDE ❌)

**Conclusion:**
- ✅ Photos homme disponibles pour tests
- ❌ Pas de photos femme de test
- **Action:** Tester Ultimate avec photos homme uniquement

---

## ✅ GARDE-FOUS VALIDATION RAPPORT

### Fichier: `server/reportValidator.ts`

### Seuils de Validation

#### Par Tier
```typescript
GRATUIT:
  - MIN_SECTION_LENGTH: 1500 chars
  - MIN_TOTAL_LENGTH: 15000 chars (~10 pages)

PREMIUM & ELITE:
  - MIN_SECTION_LENGTH: 2000 chars
  - MIN_TOTAL_LENGTH: 60000 chars (~40 pages)
```

#### Score Minimum
**MIN_VALIDATION_SCORE:** 60/100 (ligne 298)
- Si score < 60 → `reportDeliveryStatus = "NEEDS_REVIEW"`
- Si score < 60 → ❌ Email NOT sent
- Si score < 60 → ⚠️ Admin notification

### Calcul du Score

**Départ:** 100 points

**Pénalités:**
- Erreur: -15 points chacune
- Warning: -5 points chacun
- Section manquante: -10 points
- Section trop courte: -5 points
- Pattern IA détecté: -2 points (max -20)

**Bonus:**
- Rapport > 1.5x minimum: +5 points

### Checks de Validation

#### 1. Longueur Totale ✅
```typescript
if (totalChars < minLength) {
  errors.push(`Rapport trop court: ${totalChars} chars (minimum: ${minLength})`);
}
```

#### 2. Sections Présentes ✅
```typescript
for (const section of expectedSections) {
  if (section not found in txt) {
    missingSections.push(section);
    errors.push(`Section manquante: "${section}"`);
  }
}
```

#### 3. Sections Assez Longues ✅
```typescript
if (sectionLength < minSectionLength) {
  warnings.push(`Section trop courte: "${section}" - ${sectionLength} chars`);
}
```

#### 4. Patterns IA ✅
**Liste:** 100 patterns détectés
```
"il est important de noter que"
"n'hésitez pas à"
"en tant qu'assistant"
"chaque personne est différente"
... etc
```

**Seuils:**
- > 12 patterns → ERROR
- > 5 patterns → WARNING

#### 5. CTA Présent ✅
```typescript
CTA_MARKERS = [
  "coaching", "accompagnement", "formule",
  "offre", "programme", "achzodcoaching",
  "neurocore20", "promo", "réduction"
]

if (!hasCTA) {
  errors.push('CTA coaching/offre manquant dans le rapport');
}
```

#### 6. Section Review ✅ (PREMIUM seulement)
```typescript
REVIEW_MARKERS = [
  "avis", "review", "note", "étoile",
  "satisfaction", "feedback", "témoignage"
]

if (!hasReviewSection && tier !== 'GRATUIT') {
  warnings.push('Section demande de review/avis manquante');
}
```

#### 7. HTML Valide ✅
```typescript
if (reportHtml.length < 5000) {
  errors.push(`HTML trop court`);
}

if (!reportHtml.includes('<!DOCTYPE html')) {
  errors.push('HTML invalide');
}
```

#### 8. Pas de Placeholders ✅
```typescript
errorMarkers = [
  'NOTE (TECHNIQUE)',
  'incident temporaire',
  '[object Object]',
  '{{', '}}',  // Template placeholders
  'PLACEHOLDER'
]
```

#### 9. Personnalisation ✅
```typescript
personalMarkers = ['ton', 'ta', 'tes', 'toi', 'te ']

if (!hasPersonalization) {
  warnings.push('Manque de personnalisation (tutoiement)');
}
```

### Fonction Quick Validate
**Usage:** Progress monitoring pendant génération

Compte les sections détectées sans validation complète:
- Progress % = (sectionsDetected / expected) * 100
- Cap à 95% jusqu'à validation finale

---

## ✅ GARDE-FOU PHOTO (Ultimate Scan)

### Fichier: `server/reportJobManager.ts` lignes 220-235

### Check Photos Obligatoires
```typescript
const requiresPhotos = auditType === "ELITE";
const needsPhotos = requiresPhotos && photos.length < 3;

if (needsPhotos) {
  console.error(`Photos insuffisantes pour ${auditId} (${photos.length}/3)`);
  await storage.failReportJob(auditId, "NEED_PHOTOS");
  await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" });
  activeGenerations.delete(auditId);
  return; // ← STOP génération complètement
}
```

**Comportement:**
- ELITE (Ultimate) DOIT avoir 3 photos
- Si < 3 photos → Job fail immédiatement
- Status = "NEED_PHOTOS"
- Email NOT sent
- Frontend doit gérer ce cas

### Sources Photos Acceptées
```typescript
// Option 1: audit.photos (array direct)
if ((audit as any)?.photos && Array.isArray((audit as any).photos)) {
  photos = (audit as any).photos.filter(p => p.startsWith('data:') || p.length > 100);
}

// Option 2: Dans responses
else if (auditResponses.photoFront || auditResponses.photoSide || auditResponses.photoBack) {
  photos = [photoFront, photoSide, photoBack].filter(Boolean);
}

// Option 3: Direct sur audit (legacy)
else if ((audit as any)?.photoFront) {
  photos = [(audit as any).photoFront, photoSide, photoBack].filter(Boolean);
}
```

---

## ✅ GARDE-FOU RETRY LOGIC

### Fichier: `server/geminiPremiumEngine.ts` lignes 30-43

### Validation par Tier
```typescript
const ELITE_VALIDATION: Record<string, ContentValidation> = {
  analysis: { minChars: 6000, minLines: 75, maxRetries: 3 },
  protocol: { minChars: 9000, minLines: 120, maxRetries: 3 },
  summary: { minChars: 5000, minLines: 60, maxRetries: 3 },
  photo: { minChars: 7000, minLines: 85, maxRetries: 3 }
};

const PREMIUM_VALIDATION = {
  analysis: { minChars: 5000, minLines: 60, maxRetries: 3 },
  protocol: { minChars: 7000, minLines: 90, maxRetries: 3 },
  summary: { minChars: 4000, minLines: 50, maxRetries: 3 }
};
```

### Retry Process
```typescript
for (attempt = 1; attempt <= 3; attempt++) {
  const content = await callClaude(buildPrompt(attempt));

  if (content.length >= minChars && lineCount >= minLines) {
    return content; // ✅ Validé
  }

  if (attempt === 3) {
    console.warn(`Section trop courte après 3 tentatives. Using anyway.`);
    return content; // ⚠️ Accepte quand même au 3e retry
  }

  console.log(`Retry ${attempt} - Prompt renforcé`);
}
```

**Prompt au Retry:**
```
TENTATIVE 2+:
"ATTENTION CRITIQUE: Ta réponse précédente était BEAUCOUP TROP COURTE.
Tu DOIS écrire MINIMUM 120 lignes (~9000 caractères).
Développe CHAQUE mécanisme en détail. C'est un rapport PREMIUM que le client a PAYÉ."
```

---

## ✅ WORKFLOW EMAILS

### Fichier: `server/emailService.ts`

### Provider: SendPulse API
```typescript
SENDER_EMAIL = "coaching@achzodcoaching.com"
SENDER_NAME = "NEUROCORE 360"
Admin Email = "achzodyt@gmail.com"
```

### Types d'Emails

#### 1. sendReportReadyEmail() ✅
**Trigger:** Immédiatement après génération du rapport
**Condition:** `validationResult.score >= 60`
**Destinataire:** Client
**Contenu:**
- Badge tier (Gratuit/Premium/Elite)
- Lien vers le rapport
- Section demande d'avis (étoiles)
- Tracking pixel

**Flow:**
```typescript
// server/routes.ts ligne 305-323
if (score >= 60) {
  await storage.updateAudit(auditId, { reportDeliveryStatus: "READY" });
  const emailSent = await sendReportReadyEmail(email, auditId, auditType, baseUrl);

  if (emailSent) {
    await storage.updateAudit(auditId, {
      reportDeliveryStatus: "SENT",
      reportSentAt: new Date()
    });
    // Puis email admin
    await sendAdminEmailNewAudit(email, clientName, auditType, auditId);
  }
}
```

#### 2. sendAdminEmailNewAudit() ✅
**Trigger:** Immédiatement après envoi email client
**Destinataire:** Admin (achzodyt@gmail.com)
**Contenu:**
- Nom client
- Email client
- Type audit
- Audit ID
- Confirmation envoi client

#### 3. sendGratuitUpsellEmail() ⏰ J+2
**Trigger:** Cron job - 2 jours après `reportSentAt`
**Condition:**
- `audit.type === "GRATUIT"`
- `daysSinceSent >= 2 && daysSinceSent < 30`
- Email type "GRATUIT_UPSELL" pas encore envoyé
**Contenu:**
- Demande d'avis (si pas encore laissé)
- Upsell vers Premium
- Code promo **ANALYSE20** (-20%)
- CTA: `/audit-complet/questionnaire?promo=ANALYSE20`
- Avantages Premium listés
- Tracking pixel

#### 4. sendPremiumJ7Email() ⏰ J+7
**Trigger:** Cron job - 7 jours après `reportSentAt`
**Condition:**
- `audit.type === "PREMIUM" || audit.type === "ELITE"`
- `daysSinceSent >= 7 && daysSinceSent < 14`
- Email type "PREMIUM_J7" pas encore envoyé
**Contenu:**
- "Ça fait une semaine..."
- Demande d'avis (si pas encore laissé)
- CTA coaching avec formules (97€/247€/497€)
- Code promo **NEUROCORE20** (-20%)
- Tracking pixel

#### 5. sendPremiumJ14Email() ⏰ J+14
**Trigger:** Cron job - 14 jours après `reportSentAt`
**Condition CRITIQUE:**
- `audit.type === "PREMIUM" || audit.type === "ELITE"`
- `daysSinceSent >= 14 && daysSinceSent < 30`
- Email J+7 **envoyé mais PAS ouvert** (`!j7Email.openedAt`)
- Email type "PREMIUM_J14" pas encore envoyé
**Contenu:**
- "J'ai remarqué que tu n'as pas vu mon dernier message..."
- Dernière chance -20%
- CTA coaching urgent
- Code **NEUROCORE20**
- Option STOP en bas
- Tracking pixel

#### 6. sendPromoCodeEmail() 🎁
**Trigger:** Quand user soumet review
**Condition:** Review validée par admin
**Codes promo par produit:**
```typescript
DISCOVERY: -20% sur coaching
ANABOLIC_BIOSCAN: -49€ déduits (montant audit)
PRO_PANEL_360: -99€ déduits (montant audit)
BLOOD_ANALYSIS: -99€ déduits (montant audit)
BURNOUT: -39€ déduits (montant audit)
```
**Contenu:**
- Code promo personnalisé (format: PRENOM_PRODUIT_RANDOM)
- Box avec code en gros
- Réduction adaptée au produit
- CTA: achzodcoaching.com/formules-coaching

#### 7. sendAdminReviewNotification() 📝
**Trigger:** Quand user soumet review
**Destinataire:** Admin
**Contenu:**
- Rating (étoiles)
- Commentaire
- Type audit
- Email client
- Audit ID
- Action: valider/rejeter dans dashboard

#### 8. sendApexLabsWelcomeEmail() 🟡
**Trigger:** Inscription waitlist ApexLabs
**Design:** Black/Yellow (différent de NEUROCORE 360)
**Contenu:**
- Branding ApexLabs
- Liste des 5 produits
- Promesse contact perso

#### 9. sendMagicLinkEmail() 🔐
**Trigger:** Demande de connexion
**Expiration:** 1 heure
**Contenu:**
- Lien magic `/auth/verify?token=XXX&email=XXX`
- Warning expiration

### Cron Job Email Automation
**Endpoint:** `/api/admin/cron/emails`
**Fichier:** `server/routes.ts` lignes 2000-2060

**Logique:**
```typescript
1. Fetch tous les audits avec reportDeliveryStatus = "SENT"
2. Pour chaque audit:
   - Calculer daysSinceSent
   - Récupérer emailTracking existant

   Si GRATUIT et J >= 2:
     → sendGratuitUpsellEmail (si pas déjà envoyé)

   Si PREMIUM/ELITE et J >= 7:
     → sendPremiumJ7Email (si pas déjà envoyé)

   Si PREMIUM/ELITE et J >= 14:
     → Si J+7 envoyé mais PAS ouvert
     → sendPremiumJ14Email (si pas déjà envoyé)
```

**Safeguards:**
- Vérification `!trackingTypes.includes(emailType)` pour éviter duplicates
- Window temporelle pour chaque email (évite spam)
- Tracking des opens via pixel
- J+14 envoyé UNIQUEMENT si J+7 non ouvert

### Email Tracking System
**Table:** `email_tracking`
**Champs:**
- `id` (tracking ID)
- `audit_id`
- `email_type` (GRATUIT_UPSELL, PREMIUM_J7, PREMIUM_J14)
- `sent_at`
- `opened_at` (nullable)

**Pixel tracking:** `GET /api/track/email/:trackingId/open.gif`

### Statuts Report Delivery
```typescript
"GENERATING"    → En cours de génération
"READY"         → Généré, validation OK (score >= 60), email envoyé
"SENT"          → Email client livré avec succès
"NEEDS_REVIEW"  → Score < 60, email NON envoyé, admin review requis
"NEED_PHOTOS"   → ELITE sans 3 photos, email NON envoyé
"FAILED"        → Erreur génération ou max retries
"PENDING"       → En attente (timeout ou erreur)
```

### Email NON Envoyé Si:
❌ `validationResult.score < 60` → Status = "NEEDS_REVIEW"
❌ `auditType === "ELITE" && photos.length < 3` → Status = "NEED_PHOTOS"
❌ Erreur SendPulse API
❌ Credentials manquants

---

---

## ✅ ADMIN DASHBOARD

### Fichier: `client/src/pages/AdminDashboard.tsx`
**URL:** `/admin-dashboard`

### Authentification
**Méthode:** Session-based password
```typescript
ADMIN_PASSWORD = "badboy007"
sessionStorage.setItem("admin_auth", "true")
```

### 5 Onglets Principaux

#### 1. 📣 RELANCES (Tab principal)
**Sections:**

**A. Abandons questionnaire**
- Liste des questionnaires incomplets
- % de complétion affiché
- Action: "Relancer" → ouvre modal CTA custom
- Template pré-rempli avec code ANALYSE20
- API: `GET /api/admin/incomplete-questionnaires`

**B. Analyses GRATUITES (Upsell Premium)**
- Filtre: `type === "GRATUIT" && reportDeliveryStatus === "SENT"`
- Affiche: jours depuis envoi
- Action: "Envoyer Upsell" → `sendGratuitUpsellEmail`
- Code promo: **ANALYSE20** (-20%)
- API: `POST /api/admin/send-sequence-email`

**C. PREMIUM J+7**
- Filtre: `(PREMIUM || ELITE) && SENT && days >= 7`
- Affiche: jours depuis envoi, badge type audit
- Action: "Envoyer J+7" → `sendPremiumJ7Email`
- Contenu: Demande avis + CTA coaching
- Code promo: **NEUROCORE20** (-20%)
- API: `POST /api/admin/send-sequence-email`

**D. PREMIUM J+14 (Dernière chance)**
- Filtre: `(PREMIUM || ELITE) && SENT && days >= 14`
- Condition: Si J+7 non ouvert
- Affiche: jours depuis envoi, "urgence"
- Action: "Envoyer J+14" → `sendPremiumJ14Email`
- Contenu: Relance finale
- Code promo: **NEUROCORE20**
- API: `POST /api/admin/send-sequence-email`

#### 2. 📄 ANALYSES ENVOYÉES
**Données affichées:**
- Audit ID (8 premiers chars)
- Email client
- Date création
- Type audit (badge)
- Status (badge)
- reportDeliveryStatus (badge)

**Actions:**
- "Voir le rapport" → ouvre `/dashboard/{auditId}` en nouvelle fenêtre
- "Envoyer CTA" → modal pour email custom
- Bouton "Actualiser"

**API:** `GET /api/admin/audits`
**Filtre:** Tous les audits (pas seulement SENT)

#### 3. 🚫 ABANDONS
**Données:**
- Email
- Section actuelle / total
- % de complétion
- Status
- Date début
- Dernière activité

**Actions:**
- Affichage liste complète
- Modal CTA pour relance (via onglet Relances)

**API:** `GET /api/admin/incomplete-questionnaires`

#### 4. ⭐ AVIS (Reviews)
**Filtres:** Pending reviews seulement
**Données affichées:**
- Rating (étoiles visuelles)
- Commentaire
- Email client
- Type audit
- Date création

**Actions:**
- ✅ "Approuver" → `POST /api/admin/reviews/{id}/approve`
  - Avis devient visible sur le site
  - Email promo code envoyé au client
- ❌ "Rejeter" → `POST /api/admin/reviews/{id}/reject`
  - Avis supprimé de la liste
  - Pas de code promo envoyé

**Workflow après approbation:**
1. Review status = "approved"
2. Génération code promo personnalisé
3. Email `sendPromoCodeEmail` envoyé au client
4. Code enregistré dans DB

**API:**
- `GET /api/admin/reviews/pending`
- `POST /api/admin/reviews/:reviewId/approve`
- `POST /api/admin/reviews/:reviewId/reject`

#### 5. 🏷️ CODES PROMO
**Données affichées:**
- Code (uppercase)
- % réduction
- Description
- Valide pour (ALL / audit type spécifique)
- Max utilisations (null = illimité)
- Utilisations actuelles
- Status actif/inactif
- Date expiration
- Date création

**Actions:**
- ➕ "Créer code" → modal création
  - Champs: code, %, description, validFor, maxUses, expiresAt
  - Code auto uppercase
- 🔄 Toggle actif/inactif → `PUT /api/admin/promo-codes/{id}`
- Affichage compteur usages

**API:**
- `GET /api/admin/promo-codes`
- `POST /api/admin/promo-codes` (créer)
- `PUT /api/admin/promo-codes/{id}` (toggle status)

### Fonctionnalités Transverses

#### Modal "Envoyer CTA"
**Trigger:** Bouton "Envoyer CTA" dans onglet Audits ou Relances
**Champs:**
- Audit ID (auto-rempli)
- Subject
- Message (textarea)

**Utilisation:**
- Relance abandons questionnaire
- Emails custom admin vers client
- Flexible pour toute communication

**API:** `POST /api/admin/send-cta`

#### Métriques dans badges
- Analyses envoyées: nombre avec `reportDeliveryStatus === "SENT"`
- Abandons: total incomplete questionnaires
- Avis: total pending reviews
- Pas de métrique codes promo (affiche tous)

### API Endpoints Summary
```typescript
// Audits
GET  /api/admin/audits
POST /api/admin/send-cta

// Incomplete questionnaires
GET  /api/admin/incomplete-questionnaires

// Emails sequences
POST /api/admin/send-sequence-email
  body: { auditId, emailType: "GRATUIT_UPSELL" | "PREMIUM_J7" | "PREMIUM_J14" }

// Reviews
GET  /api/admin/reviews/pending
GET  /api/admin/reviews?status=...
POST /api/admin/reviews/:reviewId/approve
POST /api/admin/reviews/:reviewId/reject

// Promo codes
GET  /api/admin/promo-codes
POST /api/admin/promo-codes
PUT  /api/admin/promo-codes/:id

// Cron
GET  /api/admin/cron/emails (automated sequences)
```

### Améliorations Notées
**Onglet "Analyses envoyées":**
- ❌ Pas de bouton "Renvoyer email" direct
- ❌ Pas de bouton "Régénérer rapport"
- ⚠️ Pour renvoyer/régénérer → utiliser endpoints directs (pas d'UI)

**Métriques:**
- ✅ Compteurs temps réel dans badges
- ✅ Jours depuis envoi calculés dynamiquement
- ✅ Filtrage intelligent par type/status

**UX:**
- ✅ Animations Framer Motion
- ✅ Toasts feedback
- ✅ Loading states
- ✅ Modal forms

---

---

## ✅ CTAs PAR PRODUIT

### Fichiers analysés:
- `server/discovery-scan.ts`
- `server/burnout-detection.ts`
- `server/geminiPremiumEngine.ts`
- `server/reportValidator.ts`

### 1. Discovery Scan (GRATUIT → PREMIUM/ELITE)

**Fichier:** `server/discovery-scan.ts` lignes 1607-1773

#### CTA 1: ApexLabs Scans (Upsell direct)
**Positionnement:** Après les 4 sections d'analyse

**Produits proposés:**
1. **Anabolic Bioscan** (59€) - Badge "RECOMMANDÉ"
   - 15 analyses approfondies
   - Analyse photos (posture, composition)
   - Protocole nutrition détaillé
   - Stack suppléments personnalisé
   - Feuille de route 90 jours
   - CTA: `/offers/anabolic-bioscan`

2. **Ultimate Scan** (79€) - Badge "COMPLET"
   - Tout l'Anabolic Bioscan inclus
   - Sync wearables (Oura, Whoop, Garmin)
   - Analyse HRV avancée
   - Questions blessures & douleurs
   - Protocole réhabilitation
   - CTA: `/offers/ultimate-scan`

**Bonus Coaching Déduction:**
Table de prix avec déductions si passage au coaching après scan:
```
Formule        | 4 sem.       | 8 sem.       | 12 sem.
Essential      | 249→190€     | 399→340€     | 549→490€
Elite          | 399→340€     | 649→590€     | 899→840€
Private Lab    | 499→420€     | 799→720€     | 1199→1120€
```

#### CTA 2: Coaching Direct (Alternative sans scan)
**Positionnement:** Après CTA 1

**Message:**
- "Tu n'as pas envie ou besoin de faire un autre scan ?"
- Offre -20% sur coaching Achzod
- Code promo reçu après avis client
- CTA: achzodcoaching.com

**Formules Coaching avec -20%:**
```
Formule        | 4 sem.       | 8 sem.       | 12 sem.
Essential      | 249→199€     | 399→319€     | 549→439€
Elite          | 399→319€     | 649→519€     | 899→719€
Private Lab    | 499→399€     | 799→639€     | 1199→959€
```

### 2. Burnout Engine (STANDALONE → ANABOLIC/COACHING)

**Fichier:** `server/burnout-detection.ts` lignes 166-196

#### CTA 1: Anabolic Bioscan (59€)
**Message:**
- "Passe au scan complet pour décrypter les causes physiologiques"
- 15 domaines d'analyse
- Stack suppléments
- Plan 90 jours

#### CTA 2: Coaching Personnalisé
**Formules:**
- **Essential:** Suivi fondations
- **Elite:** Performance
- **Private Lab:** Coaching intensif, analyses avancées

**Bonus:** Si Anabolic Bioscan avant coaching → **59€ déduits à 100%**

**Code promo:** **NEUROCORE20** (-25% sur toutes formules)

**Contact:**
- Email: coaching@achzodcoaching.com
- Site: achzodcoaching.com

### 3. Anabolic Bioscan (PREMIUM → COACHING)

**Fichier:** `server/geminiPremiumEngine.ts`
**Sections générées:** 16 sections

**CTA détecté par validator:**
```typescript
CTA_MARKERS = [
  "coaching",
  "accompagnement",
  "formule",
  "offre",
  "programme",
  "achzodcoaching",
  "neurocore20",
  "analyse20",
  "promo",
  "réduction"
]
```

**Workflow email:**
- J+7: Email `sendPremiumJ7Email` avec CTA coaching + code **NEUROCORE20** (-20%)
- J+14: Si J+7 non ouvert → email `sendPremiumJ14Email` (dernière chance)

**Formules proposées dans email J+7:**
- Starter: 97€/mois
- Transform: 247€/3 mois (recommandé)
- Elite: 497€/6 mois

### 4. Ultimate Scan (ELITE → COACHING)

**Fichier:** `server/geminiPremiumEngine.ts`
**Sections générées:** 18 sections (+ photo analysis + biomécanique)

**CTA identique à Anabolic Bioscan:**
- Même workflow email J+7/J+14
- Même code promo NEUROCORE20
- Même formules coaching

### 5. Blood Analysis (STANDALONE → ???)

**Status:** ❌ Fichier non trouvé
**Note:** Produit potentiellement pas encore implémenté ou utilise un autre moteur

**À vérifier:**
- Quel moteur génère ce rapport ?
- Quel CTA est inclus ?

### Validation des CTAs

#### Règle validateur (`server/reportValidator.ts`):
**Obligation CTA présence:**
```typescript
if (!hasCTA) {
  errors.push('CTA coaching/offre manquant dans le rapport');
}
```

**Marqueurs détectés:**
- coaching, accompagnement, formule, offre, programme
- achzodcoaching, neurocore20, analyse20
- promo, réduction

**Section Review optionnelle** (PREMIUM/ELITE):
```typescript
if (!hasReviewSection && tier !== 'GRATUIT') {
  warnings.push('Section demande de review/avis manquante');
}
```

### Codes Promo par Produit

**ANALYSE20** (-20%):
- Discovery → Premium upgrade
- Abandons questionnaire (relance admin)
- Gratuit upsell email J+2

**NEUROCORE20** (-20%):
- Anabolic → Coaching
- Ultimate → Coaching
- Burnout → Coaching (mais marqué -25% dans code)
- Premium/Elite J+7 et J+14 emails

**Codes personnalisés** (après review):
- Format: `PRENOM_PRODUIT_RANDOM`
- Discovery: -20% coaching
- Anabolic: -49€ déduits
- Ultimate: -99€ déduits
- Burnout: -39€ déduits
- Blood: -99€ déduits

### Cohérence CTAs

✅ **Discovery → Anabolic/Ultimate:** Clair et explicite dans rapport
✅ **Anabolic → Coaching:** Via emails J+7/J+14 + CTA validé
✅ **Ultimate → Coaching:** Via emails J+7/J+14 + CTA validé
✅ **Burnout → Anabolic/Coaching:** CTA explicite dans rapport
❌ **Blood → ???:** Non vérifié (fichier manquant)

---

## ⏳ À EXPLORER

### 4. Job Management Complet
**Fichier:** `server/reportJobManager.ts`
- [ ] Cache system (`.cache-anthropic/`)
- [ ] Resume after crash
- [ ] Stuck job detection (threshold)
- [ ] Max retry attempts

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Photos localisées
2. ✅ Validation rules documentées
3. ✅ Photo check documenté
4. ✅ Workflow emails documenté
5. ✅ Admin dashboard documenté
6. ✅ CTAs documentés
7. 🎬 **PHASE 2: TESTS COMMENCE**
8. ⏳ Tester Discovery Scan end-to-end
9. ⏳ Tester Burnout Engine end-to-end
10. ⏳ Tester Anabolic Bioscan end-to-end
11. ⏳ Tester Ultimate Scan (4 variantes)

---

**Dernière mise à jour:** 2026-01-10 - Phase exploration terminée, tests démarrés

---

## 📋 RÉSUMÉ PHASE 1 (EXPLORATION)

### ✅ Complété

1. **Photos de test** → `/server/test-data/photos/` (3 photos homme)
2. **Validation système** → Score minimum 60/100, retry 3x, guard-rails complets
3. **Photo check Ultimate** → Requis exactement 3 photos sinon NEED_PHOTOS
4. **Workflow emails** → 9 types d'emails, cron jobs J+2/J+7/J+14, tracking opens
5. **Admin dashboard** → 5 onglets, relances auto, reviews, codes promo
6. **CTAs mappés** → Discovery→Anabolic/Ultimate, Anabolic→Coaching, Ultimate→Coaching, Burnout→Anabolic/Coaching
7. **Knowledge base** → 8 sources, 608 articles, 519k mots

### 🔍 Découvertes clés

- **Tous les engines utilisent Claude Opus 4.5** (Burnout migré ce jour)
- **Validation robuste** avec détection de 100+ patterns IA
- **Email automation** complète avec conditions et safeguards
- **Admin dashboard** fonctionnel pour relances et modération
- **CTAs cohérents** avec codes promo ANALYSE20 et NEUROCORE20

### 📊 Architecture vérifiée

```
5 PRODUITS:
├── Discovery Scan (GRATUIT) - 4 sections - Claude Sonnet 4.5
├── Anabolic Bioscan (PREMIUM) - 16 sections - Claude Opus 4.5
├── Ultimate Scan (ELITE) - 18 sections - Claude Opus 4.5 + photos
├── Burnout Engine (STANDALONE) - Claude Opus 4.5
└── Blood Analysis (STANDALONE) - ❌ Non implémenté/trouvé

GUARDRAILS:
├── Validation report: MIN score 60/100
├── Photo check: 3 photos required pour ELITE
├── Retry logic: 3 attempts avec prompts agressifs
├── Email conditions: score ≥60, photos OK, pas d'erreurs
└── Cron automation: J+2 GRATUIT, J+7/J+14 PREMIUM/ELITE

EMAILS:
├── Immédiat: sendReportReadyEmail (client) + sendAdminEmailNewAudit
├── J+2: sendGratuitUpsellEmail (GRATUIT → PREMIUM)
├── J+7: sendPremiumJ7Email (review + coaching CTA)
├── J+14: sendPremiumJ14Email (si J+7 non ouvert)
└── Review: sendPromoCodeEmail (codes personnalisés)
```

### 🎬 Phase 2: Tests lancés

**Fichier:** `BUGS_FOUND.md`
**Tests en cours:**
- ✅ Discovery Scan → Génération en cours
- ✅ Anabolic Bioscan → Génération en cours
- ❌ Burnout Engine → Bug détecté (schéma validation)

**Prochains tests:**
- Ultimate Scan homme sans wearables
- Ultimate Scan homme avec wearables
- Ultimate Scan femme (si photos dispo)

---

**Fin Phase 1 - 2026-01-10 15:24**

