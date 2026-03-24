# 🎯 PLAN TRACKING PARFAIT - APEXLABS

**Date:** 24 mars 2026, 15h30
**Objectif:** Tracking COMPLET des commandes + CTA emails avec backups multiples

---

## 📊 ÉTAT ACTUEL (Ce qu'on a accompli aujourd'hui)

### ✅ FAIT
1. **Endpoints créés**
   - POST `/api/admin/force-send-email` ✅
   - POST `/api/admin/import-sendpulse-history` ✅
   - GET `/api/admin/email-stats` ✅
   - GET `/api/admin/audits-pending` ✅

2. **Clients bloqués envoyés**
   - nicolasgourvenec1@orange.fr ✅
   - haykel007@gmail.com ✅

3. **Analyse complète**
   - 246 commandes analysées ✅
   - SendPulse: 244 emails envoyés (réel) ✅
   - Découvert: 30 manquants (pas 104!) ✅

### ⏳ EN COURS
- Import historique SendPulse vers DB (déploiement Render en cours)

---

## 🎯 PLAN TRACKING PARFAIT

### 1. TRACKING CTA EMAILS (SendPulse API)

**Objectif:** Tracker tous les clics sur les CTA dans les emails

**SendPulse API disponible:**
```
GET /api/campaigns/{campaign_id}/events
- Retourne: opens, clicks, unsubscribes, bounces
```

**Webhooks SendPulse:**
```
POST https://apexlabs.achzodcoaching.com/api/webhooks/sendpulse
Events:
- email.open
- email.click
- email.unsubscribe
- email.bounce
```

**Implémentation:**

#### A. Créer endpoint webhook SendPulse
```typescript
POST /api/webhooks/sendpulse
Body: {
  event: "email.click",
  email: "client@example.com",
  task_id: "abc123",
  url: "https://apexlabs.com/scan/xyz",
  timestamp: "2026-03-24T..."
}

Actions:
1. Recevoir event SendPulse
2. Identifier email_tracking ID
3. Update email_tracking table:
   - opened: true + timestamp si email.open
   - clicked: true + timestamp si email.click
   - clickedUrl: url cliquée
4. Log dans nouvelle table cta_tracking:
   - id, email_tracking_id, event_type, url, timestamp
```

#### B. Créer table `cta_tracking`
```sql
CREATE TABLE cta_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_tracking_id UUID REFERENCES email_tracking(id),
  event_type VARCHAR(50), -- 'open', 'click', 'unsubscribe', 'bounce'
  url TEXT, -- URL cliquée (pour clicks)
  user_agent TEXT,
  ip_address TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

#### C. Dashboard CTA Stats
```typescript
GET /api/admin/cta-stats
Response: {
  totalSent: 244,
  opened: 180, // 73.8%
  clicked: 45,  // 18.4%
  byUrl: {
    "/scan/": 30,
    "/ultimate/": 10,
    "/anabolic/": 5
  },
  byEmail: [
    { email: "client@example.com", opened: true, clicked: true, urls: [...] }
  ]
}
```

---

### 2. BACKUP DB MULTIPLES

**Objectif:** 3 backups automatiques + 1 manuel local

#### A. Backup Render (Intégré)
```bash
# Déjà actif sur Render
- Automatic daily backups
- 7 days retention
- Manual backup on demand
```

**Action:** ✅ Déjà configuré (inclus dans plan Render)

#### B. Backup externe (Supabase / AWS S3)
```bash
# Script backup automatique quotidien
0 2 * * * node /path/to/backup-db.js

# backup-db.js:
1. Export Postgres via pg_dump
2. Compress .tar.gz
3. Upload vers S3 / Supabase Storage
4. Rotate old backups (keep 30 days)
```

**Fichier:** `scripts/backup-db-external.js`

#### C. Backup local PC
```bash
# Script à lancer manuellement ou cron local
./scripts/backup-db-local.sh

# Actions:
1. SSH/API vers Render Postgres
2. pg_dump vers /Users/achzod/backups/apexlabs/
3. Filename: apexlabs_backup_2026-03-24.sql.gz
4. Keep last 14 backups
```

**Fichier:** `scripts/backup-db-local.sh`

---

### 3. SYNC GOOGLE SHEETS (Optionnel)

**Objectif:** Sync auto email_tracking + cta_tracking vers Google Sheets

#### Option A: Désactiver (Recommandé)
- DB = source unique de vérité
- Google Sheets = export manuel si besoin
- Dashboard admin lit depuis DB

#### Option B: Activer sync unidirectionnel
```typescript
// Chaque nuit à 3h
0 3 * * * node scripts/sync-to-google-sheets.js

Actions:
1. SELECT * FROM email_tracking WHERE updated > last_sync
2. SELECT * FROM cta_tracking WHERE updated > last_sync
3. Push vers Google Sheets API
4. Update last_sync timestamp
```

**Recommandation:** Option A (désactiver)

---

## 🗂️ STRUCTURE FICHIERS À CRÉER

### Scripts
```
scripts/
├── backup-db-external.js    # Backup vers S3/Supabase
├── backup-db-local.sh        # Backup local PC
├── sync-to-google-sheets.js  # Sync DB → Google Sheets (optionnel)
└── test-cta-tracking.js      # Test webhooks SendPulse
```

### Endpoints
```typescript
// server/routes.ts
POST /api/webhooks/sendpulse     # Receive SendPulse events
GET  /api/admin/cta-stats         # CTA analytics
GET  /api/admin/backup-status     # Backup status
POST /api/admin/trigger-backup    # Manual backup
```

### Database
```sql
-- Migration 002: CTA Tracking
CREATE TABLE cta_tracking (...);
CREATE INDEX idx_cta_email_tracking ON cta_tracking(email_tracking_id);
CREATE INDEX idx_cta_timestamp ON cta_tracking(timestamp);
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1: Finir import actuel (5 min)
- [x] Fix bug `db is not defined`
- [ ] Attendre déploiement Render
- [ ] Import 244 emails SendPulse
- [ ] Vérifier email_tracking table remplie

### Phase 2: Tracking CTA (2h)
- [ ] Créer table `cta_tracking`
- [ ] Créer endpoint `POST /api/webhooks/sendpulse`
- [ ] Configurer webhook sur SendPulse dashboard
- [ ] Tester avec email test
- [ ] Créer endpoint `GET /api/admin/cta-stats`
- [ ] Ajouter stats CTA au dashboard admin

### Phase 3: Backups (1h)
- [ ] Vérifier backup Render actif
- [ ] Créer `scripts/backup-db-external.js` (S3)
- [ ] Créer `scripts/backup-db-local.sh` (PC local)
- [ ] Tester les 3 backups
- [ ] Setup cron jobs

### Phase 4: Dashboard admin upgrade (1h)
- [ ] Ajouter section "CTA Analytics"
- [ ] Ajouter section "Backups Status"
- [ ] Graphiques open rate / click rate
- [ ] Export CSV email_tracking + cta_tracking

---

## 🔥 PROCHAINES ÉTAPES IMMÉDIATES

1. **Maintenant:**
   - Attendre déploiement Render (5 min)
   - Import SendPulse history
   - Vérifier dashboard stats

2. **Aujourd'hui:**
   - Setup webhook SendPulse CTA
   - Créer table cta_tracking
   - Test tracking CTA

3. **Cette semaine:**
   - Setup backups externes
   - Setup backup local PC
   - Dashboard admin v2

---

## 💾 BACKUP STRATEGY FINALE

```
┌─────────────────────────────────────────┐
│         SOURCE DE VÉRITÉ                │
│    PostgreSQL Render (Production)      │
└─────────────────────────────────────────┘
              │
              ├──> Backup 1: Render auto (daily, 7 days)
              ├──> Backup 2: S3/Supabase (daily, 30 days)
              ├──> Backup 3: Local PC (manual, 14 backups)
              └──> Export: Google Sheets (optionnel, read-only)
```

---

## 📊 TRACKING STRATEGY FINALE

```
Email envoyé (SendPulse)
    │
    ├──> email_tracking table (DB)
    │    ├── emailType
    │    ├── recipientEmail
    │    ├── sendpulseStatus: success/failed
    │    └── sentAt
    │
    └──> Webhook SendPulse
         │
         ├──> Event: email.open
         │    └──> Update email_tracking.opened
         │
         ├──> Event: email.click
         │    ├──> Update email_tracking.clicked
         │    └──> Insert cta_tracking (url clicked)
         │
         └──> Event: email.bounce
              └──> Update email_tracking.sendpulseStatus: bounced
```

---

**Status:** 📝 PLAN PRÊT
**Prochaine action:** Finir import SendPulse puis implémenter Phase 2
