# 🔄 Workflow Complet de Génération et Livraison de Rapports

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Cycle de vie d'un audit](#cycle-de-vie-dun-audit)
3. [Système de monitoring automatique](#système-de-monitoring-automatique)
4. [Traçabilité et logging](#traçabilité-et-logging)
5. [Endpoints admin](#endpoints-admin)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Base de données](#base-de-données)

---

## Vue d'ensemble

Le système génère des rapports d'analyse personnalisés pour chaque utilisateur en 3 phases:
1. **Création** - L'audit est créé après paiement/soumission du questionnaire
2. **Génération** - Claude Opus 4.5 génère le rapport (10-45 min)
3. **Livraison** - Le rapport est envoyé par email 24h après création

**Garantie zéro erreur**: Le système de monitoring automatique détecte et relance les jobs problématiques toutes les 10 minutes.

---

## Cycle de vie d'un audit

### Phase 1: Création (instantané)

```
User complète questionnaire → POST /api/stripe/confirm-session
│
├── createAudit()
│   ├── Audit créé en DB (table: audits)
│   ├── Status: GENERATING
│   └── reportScheduledFor: now + 24h
│
├── Email admin envoyé immédiatement ✉️
│   └── coaching@achzodcoaching.com
│
└── startReportGeneration()
    ├── Job créé (table: report_jobs)
    ├── Status: pending
    └── attemptCount: 1
```

**Tables DB modifiées:**
- `audits`: nouvelle ligne créée
- `orders`: auditId lié
- `report_jobs`: job de génération créé
- `monitoring_logs`: action "AUDIT_CREATED" loggée

---

### Phase 2: Génération (10-45 minutes)

```
generateReportAsync()
│
├── Status: generating
├── Progression trackée (0% → 100%)
│
├── Étapes:
│   ├── 1. Normalisation des réponses
│   ├── 2. Analyse photos (si ELITE)
│   ├── 3. Génération Claude Opus 4.5
│   │   ├── Sections générées une par une
│   │   ├── Validation en temps réel
│   │   └── Timeout: 45 min
│   ├── 4. Conversion TXT → HTML Premium
│   └── 5. Validation qualité (score min: 75/100)
│
├── ✅ Si validation OK:
│   ├── narrativeReport sauvegardé
│   ├── reportTxt et reportHtml sauvegardés
│   ├── Status: READY → SCHEDULED
│   ├── Job status: completed
│   └── Artifact sauvegardé (table: report_artifacts)
│
└── ❌ Si validation NOK:
    ├── narrativeReport sauvegardé (avec erreurs)
    ├── Status: NEEDS_REVIEW
    ├── Job status: failed
    ├── Email client NON envoyé
    └── Monitoring va le régénérer auto
```

**Critères de validation (score min 75/100):**
- ✅ Longueur minimale respectée (GRATUIT: 8000 chars, PREMIUM: 15000 chars)
- ✅ Toutes les sections présentes et complètes
- ✅ Pas de patterns IA suspects ("as an AI", "I cannot", etc.)
- ✅ Pas de sources visibles
- ✅ Pas de pronoms collectifs ("nous", "client")
- ✅ Pas d'emojis
- ✅ CTA coaching présent
- ✅ Structure HTML valide
- ✅ Pas de placeholders/erreurs

**Tables DB modifiées:**
- `report_jobs`: status updated (generating → completed/failed)
- `audits`: narrativeReport, reportTxt, reportHtml, reportDeliveryStatus
- `report_artifacts`: version du rapport archivée
- `monitoring_logs`: actions loggées

---

### Phase 3: Livraison (24h après création)

```
Cron scheduled delivery (toutes les 5 min)
│
├── Vérifie audits SCHEDULED où reportScheduledFor <= NOW
│
├── Pour chaque audit:
│   ├── Status: SCHEDULED → READY
│   ├── sendReportReadyEmail()
│   │   ├── Email envoyé via SendPulse
│   │   └── Template HTML personnalisé
│   │
│   ├── ✅ Si email envoyé:
│   │   ├── Status: SENT
│   │   ├── reportSentAt: now
│   │   └── ✓ Client notifié
│   │
│   └── ❌ Si email échoué:
│       ├── Status: SCHEDULED
│       ├── Retry au prochain cron (5 min)
│       └── Max 5 retries pour blood reports
│
└── Recovery des rapports orphelins:
    └── READY/SENDING > 10 min → SCHEDULED
```

**Tables DB modifiées:**
- `audits`: reportDeliveryStatus (SCHEDULED → SENT), reportSentAt
- `monitoring_logs`: action "EMAIL_DELIVERED" loggée

---

## Système de monitoring automatique

### Déclenchement

**Cron automatique**: Toutes les 10 minutes
**Endpoint manuel**: `POST /api/admin/run-monitoring-now`

### Détection et correction automatiques

#### 1. Jobs GENERATING bloqués (> 2h)

```
Détection: audits en GENERATING créés il y a > 2h

Action automatique:
├── Vérifier attemptCount < 3
├── Si max atteint: Status → FAILED
└── Sinon:
    ├── Supprimer old job
    ├── startReportGeneration()
    ├── attemptCount++
    └── Log: "RESTART_STUCK_GENERATING"
```

#### 2. Jobs NEEDS_REVIEW (validation échouée)

```
Détection: audits en NEEDS_REVIEW

Action automatique:
├── Vérifier attemptCount < 3
├── Si max atteint: skip (reste NEEDS_REVIEW)
└── Sinon:
    ├── Clear old narrativeReport
    ├── Supprimer old job
    ├── startReportGeneration() avec prompts renforcés
    ├── attemptCount++
    └── Log: "REGENERATE_NEEDS_REVIEW"
```

#### 3. Jobs FAILED (génération échouée)

```
Détection: audits en FAILED

Action automatique:
├── Vérifier attemptCount < 3
├── Si max atteint: skip (reste FAILED)
└── Sinon:
    ├── startReportGeneration()
    ├── attemptCount++
    └── Log: "RETRY_FAILED"
```

### Statistiques de monitoring

```typescript
interface MonitoringStats {
  generatingStuck: number;      // Jobs GENERATING relancés
  needsReviewFixed: number;     // Jobs NEEDS_REVIEW régénérés
  failedRetried: number;        // Jobs FAILED retry
  errors: Array<{auditId, error}>; // Erreurs rencontrées
}
```

---

## Traçabilité et logging

### Table monitoring_logs

Toutes les actions automatiques sont tracées:

```sql
CREATE TABLE monitoring_logs (
  id SERIAL PRIMARY KEY,
  audit_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- Type d'action
  metadata JSONB,                 -- Détails (attemptCount, reason, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Types d'actions loggées:**
- `AUDIT_CREATED` - Création de l'audit
- `RESTART_STUCK_GENERATING` - Relance job bloqué
- `REGENERATE_NEEDS_REVIEW` - Régénération après validation échouée
- `RETRY_FAILED` - Retry après échec
- `EMAIL_DELIVERED` - Email client livré
- `EMAIL_FAILED` - Échec envoi email

**Récupération de l'historique:**
```bash
GET /api/admin/audits/:id/monitoring-history
```

### Logs serveur

Format standardisé:
```
[Monitoring] Action: description - auditId: xxx
[ReportJobManager] Generation COMPLETED for xxx in 25.3s
[Email] ✅ Report ready email sent successfully to xxx
```

---

## Endpoints admin

### Monitoring

```bash
# Lancer monitoring manuel (ne pas attendre cron)
POST /api/admin/run-monitoring-now
Headers: x-admin-key: <SECRET>

# Voir historique monitoring d'un audit
GET /api/admin/audits/:id/monitoring-history
Headers: x-admin-key: <SECRET>
```

### Gestion des jobs

```bash
# Relancer tous les jobs GENERATING bloqués (> 2h)
POST /api/admin/force-restart-stuck-jobs
Headers: x-admin-key: <SECRET>
Response: {success: true, message: "X rapport(s) bloqué(s) relancé(s)", restarted: [...]}

# Régénérer manuellement des audits NEEDS_REVIEW
POST /api/admin/force-regenerate-failed
Headers: x-admin-key: <SECRET>
Body: {auditIds: ["xxx", "yyy"]}
Response: {success: true, message: "X rapport(s) en cours de régénération", regenerated: [...]}
```

### Diagnostic

```bash
# Voir détails de validation d'un audit
GET /api/admin/audits/:id/validation-details
Headers: x-admin-key: <SECRET>
Response: {
  audit: {id, email, type, status, createdAt},
  validation: {score, isValid, errors, warnings},
  job: {status, attemptCount, error},
  reportGenerated: boolean,
  reportLength: number
}

# Voir tous les audits
GET /api/admin/audits?limit=200
Headers: x-admin-key: <SECRET>
```

---

## Gestion des erreurs

### Retry automatique

Chaque job a **maximum 3 tentatives**.

**Tentative 1:**
- Génération normale avec Claude Opus 4.5
- Si échec → attemptCount = 1

**Tentative 2:**
- Monitoring détecte job bloqué/failed
- Relance automatique après 10 min (cron)
- Si échec → attemptCount = 2

**Tentative 3:**
- Dernier retry automatique
- Si échec → attemptCount = 3 → FAILED permanent

**Après 3 échecs:**
- Status: FAILED (ne sera plus retry auto)
- Nécessite intervention manuelle admin
- Visible dans dashboard admin

### Types d'erreurs possibles

| Erreur | Cause | Solution auto |
|--------|-------|---------------|
| GENERATING stuck | Crash serveur, timeout AI | Restart auto (monitoring) |
| NEEDS_REVIEW | Validation échouée (score < 75) | Regenerate auto (monitoring) |
| FAILED | Erreur Claude API, timeout | Retry auto (monitoring) |
| EMAIL_FAILED | SendPulse down, email invalide | Retry cron (5 min) |
| NEED_PHOTOS | Photos manquantes (ELITE only) | Notification user, no retry |

---

## Base de données

### Tables principales

#### audits
```sql
- id: UUID
- email: TEXT
- type: TEXT (GRATUIT, PREMIUM, ELITE)
- responses: JSONB
- scores: JSONB
- narrativeReport: JSONB  -- {txt, html, clientName, metadata, validationResult}
- reportTxt: TEXT
- reportHtml: TEXT
- reportDeliveryStatus: TEXT  -- GENERATING, READY, SCHEDULED, SENT, NEEDS_REVIEW, FAILED
- reportScheduledFor: TIMESTAMP  -- now + 24h
- reportSentAt: TIMESTAMP
- reportGeneratedAt: TIMESTAMP
- createdAt: TIMESTAMP
```

#### report_jobs
```sql
- id: SERIAL
- audit_id: TEXT (FK → audits.id)
- status: TEXT  -- pending, generating, completed, failed
- progress: INTEGER (0-100)
- current_section: TEXT
- error: TEXT
- attempt_count: INTEGER
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
- last_progress_at: TIMESTAMP
```

#### report_artifacts (archivage)
```sql
- id: SERIAL
- audit_id: TEXT
- tier: TEXT
- engine: TEXT  -- "anthropic"
- model: TEXT  -- "claude-opus-4-5"
- txt: TEXT
- html: TEXT
- created_at: TIMESTAMP
```

#### monitoring_logs (traçabilité)
```sql
- id: SERIAL
- audit_id: TEXT
- action: TEXT
- metadata: JSONB
- created_at: TIMESTAMP
```

### Indexes critiques

```sql
CREATE INDEX idx_audits_delivery_status ON audits(report_delivery_status);
CREATE INDEX idx_audits_scheduled_for ON audits(report_scheduled_for);
CREATE INDEX idx_audits_created_at ON audits(created_at);
CREATE INDEX idx_report_jobs_audit_id ON report_jobs(audit_id);
CREATE INDEX idx_report_jobs_status ON report_jobs(status);
CREATE INDEX idx_monitoring_logs_audit_id ON monitoring_logs(audit_id);
```

---

## Garanties du système

✅ **Zéro perte de rapport**: Tous les rapports générés sont archivés dans `report_artifacts`
✅ **Retry automatique**: Maximum 3 tentatives par job avec monitoring intelligent
✅ **Traçabilité complète**: Toutes les actions loggées dans `monitoring_logs`
✅ **Recovery automatique**: Jobs bloqués détectés et relancés toutes les 10 min
✅ **Email garantie**: Cron delivery retry toutes les 5 min jusqu'à succès
✅ **Audit trail**: Historique complet disponible via API admin

---

## Dashboard Admin

**URL**: https://apexlabs.onrender.com/admin
**Auth**: Clé admin dans sessionStorage

**Fonctionnalités:**
- 📊 Vue d'ensemble des audits (total, par status, par type)
- 🔍 Filtrage par status de livraison
- 📧 Détails de validation pour NEEDS_REVIEW
- 🔄 Relance manuelle des jobs problématiques
- 📈 Historique de monitoring par audit
- 💳 Gestion des commandes et remboursements
- 🎁 Gestion des codes promo

---

## Support et debugging

### Vérifier l'état d'un audit

```bash
# 1. Récupérer l'audit
curl -H "x-admin-key: <SECRET>" \
  "https://apexlabs.onrender.com/api/admin/audits?limit=1000" \
  | jq '.audits[] | select(.id == "AUDIT_ID")'

# 2. Voir détails de validation
curl -H "x-admin-key: <SECRET>" \
  "https://apexlabs.onrender.com/api/admin/audits/AUDIT_ID/validation-details"

# 3. Voir historique monitoring
curl -H "x-admin-key: <SECRET>" \
  "https://apexlabs.onrender.com/api/admin/audits/AUDIT_ID/monitoring-history"
```

### Forcer la régénération

```bash
# Régénérer un audit spécifique
curl -X POST -H "x-admin-key: <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"auditIds": ["AUDIT_ID"]}' \
  "https://apexlabs.onrender.com/api/admin/force-regenerate-failed"
```

### Logs en temps réel

```bash
# Sur Render.com
Dashboard → Service → Logs → Live tail
Filtrer: "[Monitoring]", "[ReportJobManager]", "[Email]"
```

---

**Dernière mise à jour**: 2026-03-19
**Version**: 2.0 (avec monitoring automatique)
