# 📧 SYSTÈME DE TRACKING EMAIL - APEXLABS

**Date:** 23 mars 2026
**Status:** ✅ **IMPLÉMENTÉ - PRÊT POUR MIGRATION DB**

---

## 🎯 OBJECTIF

Implémenter un système complet de tracking pour tous les emails automatiques envoyés par APEXLABS:
- **Copie automatique** de tous les emails à achkou@gmail.com
- **Tracking en base de données** pour analytics et monitoring
- **Export Google Sheets** pour suivi externe
- **Dashboard admin** pour visualisation

---

## ✅ FICHIERS CRÉÉS

### 1. `/server/emailTracking.ts` (266 lignes)

Service central de tracking des emails avec fonctions:

```typescript
// Log un email dans le système de tracking
logEmail(data: EmailTrackingData): Promise<string>

// Met à jour l'engagement (ouverture, clic, conversion)
updateEmailEngagement(trackingId: string, engagement: {...}): Promise<void>

// Stats pour le dashboard admin
getEmailTrackingStats(): Promise<EmailTrackingStats>

// Récupère les emails récents
getRecentEmails(limit: number): Promise<any[]>

// Export CSV pour Google Sheets
exportEmailTrackingCSV(): Promise<string>
```

**Constante importante:**
```typescript
export const ADMIN_EMAIL_CC = "achkou@gmail.com";
```

---

### 2. `/migrations/001_create_email_tracking.sql` (47 lignes)

Migration SQL pour créer la table `email_tracking`:

**Colonnes principales:**
- `id` - UUID unique
- `email_type` - Type d'email (sendReportReadyEmail, sendCTAEmail, etc.)
- `recipient_email` - Destinataire
- `recipient_name` - Nom du destinataire
- `audit_id` - ID de l'audit associé
- `audit_type` - Type d'audit (DISCOVERY, ULTIMATE, etc.)
- `subject` - Sujet de l'email
- `preview_text` - Aperçu du contenu
- `sendpulse_task_id` - ID de tâche SendPulse
- `sendpulse_status` - Status (success, failed, pending)
- `sendpulse_error` - Message d'erreur éventuel
- `opened` - Timestamp d'ouverture
- `clicked` - Timestamp de clic
- `converted` - Timestamp de conversion
- `conversion_type` - Type de conversion (ultimate_purchase, etc.)
- `metadata` - JSONB pour contexte additionnel
- `sent_at` - Date d'envoi
- `created_at` - Date de création

**Indexes pour performance:**
- `idx_email_tracking_recipient` - Sur recipient_email
- `idx_email_tracking_audit` - Sur audit_id
- `idx_email_tracking_type` - Sur email_type
- `idx_email_tracking_sent_at` - Sur sent_at DESC
- `idx_email_tracking_status` - Sur sendpulse_status

---

## 🔧 FICHIERS MODIFIÉS

### 1. `/shared/drizzle-schema.ts`

**Ajouté:** Table `emailTracking` avec schéma Drizzle ORM complet (45 lignes).

```typescript
export const emailTracking = pgTable("email_tracking", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  emailType: varchar("email_type", { length: 50 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  // ... 15+ colonnes
});
```

---

### 2. `/server/emailService.ts`

**Modifications:**

#### A. Import du service tracking (ligne 3)
```typescript
import { logEmail, ADMIN_EMAIL_CC, type EmailTrackingData } from "./emailTracking";
```

#### B. Fonction wrapper `sendEmailWithTracking()` (lignes 147-228)

Fonction centrale qui:
1. ✅ Ajoute **BCC** à `achkou@gmail.com` automatiquement
2. ✅ Appelle l'API SendPulse
3. ✅ **Log l'email** dans la base de données
4. ✅ Gère les erreurs et log les échecs
5. ✅ Supporte les pièces jointes (pour Blood Analysis)

```typescript
async function sendEmailWithTracking(
  emailPayload: {
    html: string;
    text: string;
    subject: string;
    from: { name: string; email: string };
    to: Array<{ email: string; name?: string }>;
  },
  trackingData: {
    emailType: string;
    recipientEmail: string;
    recipientName?: string;
    auditId?: string;
    auditType?: string;
    metadata?: Record<string, any>;
  }
): Promise<{ result: boolean; error?: any; message?: any }>
```

#### C. Modification des 11 fonctions d'envoi d'email

**Fonctions modifiées pour utiliser `sendEmailWithTracking`:**

1. ✅ `sendReportReadyEmail` - Email de rapport prêt
2. ✅ `sendBloodAnalysisHtmlEmail` - Blood Analysis avec PDF
3. ✅ `sendMagicLinkEmail` - Lien magique de connexion
4. ✅ `sendAdminEmailNewAudit` - Notification admin nouvel audit
5. ✅ `sendCTAEmail` - Email CTA personnalisé
6. ✅ `sendGratuitUpsellEmail` - Upsell Discovery → Anabolic
7. ✅ `sendPremiumJ7Email` - Follow-up J+7
8. ✅ `sendPremiumJ14Email` - Follow-up J+14
9. ✅ `sendPromoCodeEmail` - Email code promo
10. ✅ `sendAdminReviewNotification` - Notification avis admin
11. ✅ `sendApexLabsWelcomeEmail` - Email de bienvenue

**Changements par fonction:**
- ❌ Retiré: `const token = await getAccessToken();`
- ❌ Retiré: Appel direct `fetch("https://api.sendpulse.com/smtp/emails")`
- ✅ Ajouté: Appel `sendEmailWithTracking(emailPayload, trackingData)`
- ✅ Ajouté: Métadonnées de tracking spécifiques (promo codes, links, etc.)

---

### 3. `/server/googleSheetsTracking.ts`

**Ajouté 2 fonctions:**

```typescript
// Export combiné audits + emails CSV
export async function generateCombinedCSV(): Promise<{
  auditsCSV: string;
  emailsCSV: string;
}>

// Stats combinées pour dashboard
export async function getCombinedStats(): Promise<{
  audits: {...};
  emails: {...};
}>
```

---

### 4. `/server/routes.ts`

**Ajouté 4 endpoints API:**

#### A. `/api/admin/email-trackings` (GET)
Liste des emails trackés avec pagination.

**Paramètres:**
- `limit` (query, default: 50, max: 200)

**Réponse:**
```json
{
  "success": true,
  "trackings": [...],
  "total": 142
}
```

#### B. `/api/admin/email-trackings/stats` (GET)
Statistiques globales des emails.

**Réponse:**
```json
{
  "success": true,
  "stats": {
    "totalSent": 142,
    "byType": { "sendReportReadyEmail": 89, "sendCTAEmail": 23, ... },
    "successRate": 98.5,
    "openRate": 42.3,
    "clickRate": 18.7,
    "conversionRate": 5.2,
    "last24h": 12,
    "last7d": 89
  }
}
```

#### C. `/api/admin/email-trackings/export/csv` (GET)
Export CSV des emails trackés.

**Headers:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename=email-trackings.csv`

#### D. `/api/admin/tracking/combined-stats` (GET)
Stats combinées audits + emails.

**Réponse:**
```json
{
  "success": true,
  "stats": {
    "audits": {...},
    "emails": {...}
  }
}
```

**Note:** Fix duplicate import `getAuthPayload` (ligne 48 supprimée).

---

## 📊 SCHÉMA DE FONCTIONNEMENT

```
┌─────────────────────────────────────────────────────────┐
│  1. Email Function appelée                             │
│     (ex: sendReportReadyEmail)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  2. sendEmailWithTracking()                            │
│     - Ajoute BCC: achkou@gmail.com                     │
│     - Construit payload SendPulse                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  3. SendPulse API                                      │
│     POST /smtp/emails                                  │
│     → Email envoyé à recipient + BCC admin             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  4. logEmail()                                         │
│     - Insert dans DB (email_tracking table)            │
│     - Log: type, recipient, subject, status, metadata  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  5. notifyGoogleSheetUpdate()                          │
│     - Webhook vers Apps Script                         │
│     - Update Google Sheet automatiquement              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 CONFIGURATION REQUISE

### Variables d'environnement

Aucune nouvelle variable requise! Le système utilise les credentials SendPulse existants:

```bash
# Déjà configuré
SENDPULSE_USER_ID=...
SENDPULSE_SECRET=...
SENDER_EMAIL=coaching@achzodcoaching.com
SENDER_NAME=ApexLabs by Achzod

# Optionnel (pour Google Sheets auto-update)
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

---

## 📈 ANALYTICS DISPONIBLES

### Métriques trackées automatiquement:

1. **Volume:**
   - Total emails envoyés
   - Emails par type
   - Emails dernières 24h
   - Emails derniers 7 jours

2. **Délivrabilité:**
   - Taux de succès SendPulse
   - Taux d'échec
   - Messages d'erreur

3. **Engagement:**
   - Taux d'ouverture (via pixel tracking)
   - Taux de clic (via UTM)
   - Taux de conversion

4. **Attribution:**
   - Emails par audit
   - Emails par type d'audit (DISCOVERY, ULTIMATE, etc.)
   - Type de conversion (ultimate_purchase, anabolic_purchase, etc.)

---

## 🚀 DÉPLOIEMENT

### Étapes restantes:

1. **Appliquer la migration:**
   ```bash
   npm run db:push
   ```
   Ou manuellement:
   ```bash
   psql $DATABASE_URL < migrations/001_create_email_tracking.sql
   ```

2. **Build et test:**
   ```bash
   npm run build
   npm run dev
   ```

3. **Vérifier les endpoints:**
   - GET `/api/admin/email-trackings`
   - GET `/api/admin/email-trackings/stats`
   - GET `/api/admin/email-trackings/export/csv`
   - GET `/api/admin/tracking/combined-stats`

4. **Tester l'envoi d'un email:**
   - Créer un Discovery Scan
   - Vérifier que l'email arrive au destinataire
   - Vérifier que la copie arrive à achkou@gmail.com
   - Vérifier que l'email est loggé dans la DB
   - Vérifier que Google Sheets est notifié

---

## 🎯 UTILISATION

### Développeur: Envoyer un email tracké

```typescript
import { sendEmailWithTracking } from "./emailService";

const result = await sendEmailWithTracking(
  {
    html: encodeBase64(htmlContent),
    text: "Version texte brut",
    subject: "Mon sujet d'email",
    from: { name: "APEXLABS", email: "coaching@achzodcoaching.com" },
    to: [{ email: "client@example.com", name: "Client" }],
  },
  {
    emailType: "custom_email",
    recipientEmail: "client@example.com",
    recipientName: "Client",
    auditId: "audit-123",
    auditType: "ULTIMATE_SCAN",
    metadata: { campaign: "spring2026" },
  }
);

if (result.result) {
  console.log("✅ Email envoyé et tracké");
}
```

### Admin: Consulter les emails

**Via API:**
```bash
curl -H "Cookie: session_token=..." \
  https://apexlabs.achzodcoaching.com/api/admin/email-trackings?limit=50
```

**Via Google Sheets:**
1. Ouvrir: https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit
2. Les emails sont exportés automatiquement via webhook

**Via Dashboard (à implémenter):**
- Section "Email Tracking" dans AdminDashboard
- Affiche liste des emails avec filtres
- Affiche stats en temps réel

---

## 📝 EMAILS TRACKÉS

| Type d'email | Trigger | Contient upgrade CTA |
|--------------|---------|---------------------|
| `sendReportReadyEmail` | Rapport généré | ✅ Oui |
| `sendBloodAnalysisHtmlEmail` | Blood Analysis prêt | ✅ Oui (coaching) |
| `sendMagicLinkEmail` | Connexion dashboard | ❌ Non |
| `sendAdminEmailNewAudit` | Nouvel audit créé | ❌ Non (admin) |
| `sendCTAEmail` | Manuel par admin | ✅ Oui (personnalisé) |
| `sendGratuitUpsellEmail` | J+1 après Discovery | ✅ Oui (ANALYSE20) |
| `sendPremiumJ7Email` | J+7 après Anabolic | ✅ Oui (coaching) |
| `sendPremiumJ14Email` | J+14 après Anabolic | ✅ Oui (coaching) |
| `sendPromoCodeEmail` | Promo code créé | ✅ Oui (code promo) |
| `sendAdminReviewNotification` | Nouvel avis reçu | ❌ Non (admin) |
| `sendApexLabsWelcomeEmail` | Inscription waitlist | ❌ Non |

---

## 🔮 AMÉLIORATIONS FUTURES

### Phase 2 (optionnel):

1. **UI Admin Dashboard:**
   - Table interactive des emails
   - Filtres par type, date, statut
   - Graphiques d'engagement
   - Export CSV depuis UI

2. **Webhooks SendPulse:**
   - Recevoir les événements open/click depuis SendPulse
   - Update automatique des timestamps opened/clicked

3. **Segmentation avancée:**
   - Cohorts par engagement
   - Réengagement automatique des non-ouverts
   - A/B testing des sujets

4. **Templates d'email:**
   - Système de templates réutilisables
   - Variables personnalisables
   - Preview avant envoi

---

## ✅ CHECKLIST FINALE

- [x] Créer table email_tracking en Drizzle schema
- [x] Créer migration SQL
- [x] Créer service emailTracking.ts
- [x] Créer wrapper sendEmailWithTracking
- [x] Modifier 11 fonctions d'envoi d'email
- [x] Ajouter BCC automatique à achkou@gmail.com
- [x] Intégrer avec Google Sheets tracking
- [x] Créer 4 endpoints API
- [x] Fix duplicate import getAuthPayload
- [x] Vérifier build TypeScript (0 erreurs ajoutées)
- [x] Créer documentation complète
- [ ] Appliquer migration DB (npm run db:push)
- [ ] Tester en local
- [ ] Tester en production
- [ ] Commit et push
- [ ] Monitorer premiers emails trackés

---

## 📞 CONTACTS

**Admin email (reçoit TOUTES les copies):** achkou@gmail.com
**Google Sheets:** https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit
**SendPulse Dashboard:** https://login.sendpulse.com

---

**Système implémenté par:** Claude Code
**Date:** 23 mars 2026
**Version:** 1.0
**Status:** ✅ **PRÊT POUR MIGRATION DB ET DÉPLOIEMENT**
