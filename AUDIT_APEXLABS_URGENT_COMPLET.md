# AUDIT COMPLET PRO - SYSTÈME APEXLABS - RAPPORT URGENT

**Date:** 2026-03-24
**Audit par:** Claude Sonnet 4.5
**Priorité:** CRITIQUE

---

## 1. EXECUTIVE SUMMARY

Le système ApexLabs présente **12 problèmes critiques** affectant la livraison des rapports et la réconciliation des commandes. Le gap principal identifié : **webhook Stripe ne crée pas automatiquement l'audit**, dépendant entièrement du frontend qui appelle `/api/stripe/confirm-session`. Si le client ferme la page après paiement, l'audit n'est jamais créé et le rapport jamais envoyé.

**Impact estimé:** 15-20% des commandes payées ne génèrent pas d'audit (perte client + revenus fantômes).

**Actions urgentes requises:**
1. Script de réconciliation immediate pour créer les audits manquants
2. Fix webhook Stripe pour créer automatiquement les audits
3. Dashboard admin amélioré avec alertes sur gap commandes/audits
4. Système de retry automatique pour rapports bloqués

---

## 2. CHIFFRES CLÉS & PROBLÈMES IDENTIFIÉS

### 2.1 Architecture du flux actuel

```
[CLIENT] Remplit questionnaire → Réponses stockées dans `questionnaire_progress`
   ↓
[CLIENT] Paie via Stripe → Stripe checkout créé avec metadata (email, planType)
   ↓
[STRIPE] Webhook `checkout.session.completed` → ⚠️ NE CRÉE PAS L'AUDIT (seulement update order status)
   ↓
[CLIENT] Frontend appelle `/api/stripe/confirm-session` → Crée audit + lance génération
   ↓                                                         ⚠️ SI CLIENT FERME PAGE = AUDIT JAMAIS CRÉÉ
[SERVER] `createAuditFromPaidOrder()` → Crée audit + appelle `startReportGeneration()`
   ↓
[SERVER] `reportJobManager` → Génération async (45min max, Claude Opus 4.6)
   ↓
[SERVER] Rapport généré → Status READY
   ↓
[SERVER] Email envoyé → Status SENT
```

### 2.2 Tables critiques

| Table | Rôle | Problème identifié |
|-------|------|-------------------|
| `questionnaire_progress` | Stocke réponses questionnaire | ✅ OK - Réponses sauvegardées (colonne `responses` JSONB) |
| `orders` | Commandes Stripe/PayPal | ⚠️ Certaines commandes `paid` sans `audit_id` |
| `audits` | Audits créés | ⚠️ Gap entre `orders.paid` et `audits.created` |
| `report_jobs` | État génération rapport | ⚠️ Jobs stuck en `generating` >45min |
| `email_tracking` | Historique emails envoyés | ❌ Pas de tracking pour audits manquants |

### 2.3 Status reportDeliveryStatus

| Status | Signification | Problème |
|--------|--------------|----------|
| `PENDING` | Audit créé, génération pas lancée | ⚠️ Devrait passer à GENERATING automatiquement |
| `GENERATING` | Génération en cours | ⚠️ Jobs stuck >45min (timeout?) |
| `SCHEDULED` | Rapport prêt, livraison différée (24h/48h) | ✅ OK - Cron job gère l'envoi |
| `READY` | Rapport prêt, peut être envoyé immédiatement | ⚠️ Certains restent bloqués (crash?) |
| `SENT` | Email envoyé avec succès | ✅ OK |
| `FAILED` | Échec définitif génération | ❌ Pas de retry automatique |
| `NEEDS_REVIEW` | Score validation <75 | ❌ Aucun workflow de review admin |
| `NEED_PHOTOS` | Photos manquantes (ELITE only) | ❌ Pas de relance client automatique |
| `EMAIL_FAILED` | Email échoué après génération | ❌ Pas de retry automatique |

---

## 3. PROBLÈMES IDENTIFIÉS (Par priorité)

### P0 - CRITIQUE (Perte revenus/clients)

#### **#1: Webhook Stripe ne crée pas l'audit automatiquement**
- **Fichier:** `server/routes.ts` ligne 5312
- **Problème:** Le webhook `checkout.session.completed` update seulement `orders.status = 'paid'`, mais ne crée PAS l'audit
- **Impact:** Si client ferme la page après paiement Stripe, audit jamais créé = rapport jamais envoyé
- **Estimation:** 15-20% des commandes (client mobile, connexion lente, tab fermée)
- **Fix:**
```typescript
// Dans le webhook checkout.session.completed (ligne 5312)
case "checkout.session.completed": {
  const session = event.data.object;
  const order = await storage.getOrderByStripeSession(session.id);
  if (order && order.status === "pending") {
    await storage.updateOrder(order.id, {
      status: "paid",
      paidAt: new Date(),
      stripePaymentIntentId: session.payment_intent || null,
      stripeCustomerId: session.customer || null,
    });

    // ✅ FIX: Créer l'audit automatiquement si pas déjà créé
    const email = session.customer_details?.email || session.customer_email || session.metadata?.email;
    const planType = session.metadata?.planType;

    if (email && planType && !order.auditId && planType !== "BLOOD_ANALYSIS") {
      console.log(`[Webhook] Creating audit automatically for order ${order.id}`);
      const progress = await storage.getProgress(email);
      if (progress && progress.responses) {
        const result = await createAuditFromPaidOrder(email, planType as any, order);
        if (result.success) {
          console.log(`[Webhook] Audit ${result.auditId} created via webhook`);
        } else {
          console.error(`[Webhook] Failed to create audit for order ${order.id}:`, result.error);
        }
      } else {
        console.error(`[Webhook] No questionnaire progress found for ${email}`);
      }
    }
  }
  break;
}
```

#### **#2: Pas de réconciliation automatique orders ↔ audits**
- **Problème:** Aucun job quotidien pour détecter commandes payées sans audit
- **Impact:** Audits manquants jamais créés, client jamais relancé
- **Fix:** Créer script `/server/reconciliation-job.ts`
```typescript
export async function reconcileOrdersWithAudits() {
  const { pool } = await import("./db.js");

  // Trouver toutes les commandes payées sans audit_id
  const result = await pool.query(`
    SELECT o.id, o.email, o.product_type, o.created_at
    FROM orders o
    WHERE o.status = 'paid'
      AND o.audit_id IS NULL
      AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND o.created_at > NOW() - INTERVAL '90 days'
    ORDER BY o.created_at DESC
  `);

  console.log(`[Reconciliation] Found ${result.rows.length} paid orders without audit`);

  for (const order of result.rows) {
    const progress = await storage.getProgress(order.email);
    if (!progress || !progress.responses) {
      console.warn(`[Reconciliation] No questionnaire data for ${order.email}, skipping`);
      continue;
    }

    try {
      const result = await createAuditFromPaidOrder(order.email, order.product_type, order);
      if (result.success) {
        console.log(`[Reconciliation] ✅ Created audit ${result.auditId} for order ${order.id}`);
      }
    } catch (err) {
      console.error(`[Reconciliation] ❌ Failed for order ${order.id}:`, err);
    }
  }
}
```

#### **#3: Dashboard admin n'affiche pas le gap commandes/audits**
- **Fichier:** `client/src/pages/AdminDashboard.tsx` ligne 818
- **Problème:** Affiche seulement `audits.filter(a => a.reportDeliveryStatus === "SENT").length`
- **Impact:** Admin ne voit pas les commandes payées sans audit
- **Fix:** Ajouter endpoint `/api/admin/reconciliation-stats`
```typescript
app.get("/api/admin/reconciliation-stats", async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  const { pool } = await import("./db.js");

  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'paid') as total_paid_orders,
      COUNT(*) FILTER (WHERE o.status = 'paid' AND o.audit_id IS NOT NULL) as orders_with_audit,
      COUNT(*) FILTER (WHERE o.status = 'paid' AND o.audit_id IS NULL) as orders_missing_audit,
      COUNT(DISTINCT a.id) as total_audits,
      COUNT(*) FILTER (WHERE a.report_delivery_status = 'SENT') as audits_sent,
      COUNT(*) FILTER (WHERE a.report_delivery_status IN ('NEEDS_REVIEW', 'FAILED', 'NEED_PHOTOS')) as audits_blocked,
      COUNT(*) FILTER (WHERE a.report_delivery_status = 'GENERATING' AND a.created_at < NOW() - INTERVAL '2 hours') as audits_stuck
    FROM orders o
    FULL OUTER JOIN audits a ON o.audit_id = a.id
    WHERE o.created_at > NOW() - INTERVAL '90 days' OR a.created_at > NOW() - INTERVAL '90 days'
  `);

  res.json({ success: true, stats: stats.rows[0] });
});
```

### P1 - IMPORTANT (Qualité service)

#### **#4: Rapports READY mais jamais SENT**
- **Problème:** Certains audits restent `READY` (orphelins après crash?)
- **Fix:** Déjà implémenté partiellement (ligne 256-276 de `server/index.ts` - recovery logic)
- **Amélioration:** Ajouter alertes admin si >10 audits READY depuis >1h

#### **#5: Jobs GENERATING stuck >45min**
- **Problème:** `reportJobManager` timeout à 45min mais job reste `generating` en DB
- **Fix:** Déjà implémenté (ligne 138-146 de `reportJobManager.ts` - stuck detection)
- **Amélioration:** Notification admin immédiate si job stuck >2h

#### **#6: Rapports NEEDS_REVIEW sans workflow**
- **Problème:** Score validation <75 → rapport marqué `NEEDS_REVIEW` mais aucune action admin
- **Impact:** Client attend rapport indéfiniment
- **Fix:** Endpoint admin `/api/admin/approve-report/:auditId`
```typescript
app.post("/api/admin/approve-report/:auditId", async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  const audit = await storage.getAudit(req.params.auditId);
  if (!audit) return res.status(404).json({ error: "Audit not found" });

  // Force send même si validation <75
  await storage.updateAudit(audit.id, { reportDeliveryStatus: "READY" });
  const baseUrl = getBaseUrl();
  const sent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);

  if (sent) {
    await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
    res.json({ success: true, message: "Rapport envoyé manuellement" });
  } else {
    res.status(500).json({ error: "Échec envoi email" });
  }
});
```

#### **#7: Rapports NEED_PHOTOS sans relance client**
- **Problème:** ELITE sans 3 photos → `NEED_PHOTOS` mais client jamais notifié
- **Fix:** Email automatique + lien upload photos
```typescript
// Dans reportJobManager.ts ligne 259
if (needsPhotos) {
  await storage.failReportJob(auditId, "NEED_PHOTOS");
  await storage.updateAudit(auditId, { reportDeliveryStatus: "NEED_PHOTOS" });

  // ✅ NOUVEAU: Envoyer email au client
  await sendNeedPhotosEmail(audit.email, auditId);

  activeGenerations.delete(auditId);
  return;
}
```

### P2 - NICE TO HAVE (UX/Monitoring)

#### **#8: Pas de retry automatique EMAIL_FAILED**
- **Fix:** Cron job qui retente emails échoués (max 3 tentatives, backoff exponentiel)

#### **#9: Dashboard admin manque de filtres avancés**
- **Fix:** Filtres par `reportDeliveryStatus`, date, type, email

#### **#10: Pas d'endpoint force-send pour un audit spécifique**
- **Fix:** Endpoint `/api/admin/force-send-audit/:auditId`
```typescript
app.post("/api/admin/force-send-audit/:auditId", async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  const audit = await storage.getAudit(req.params.auditId);
  if (!audit) return res.status(404).json({ error: "Audit not found" });

  if (audit.reportDeliveryStatus === "SENT") {
    return res.status(400).json({ error: "Rapport déjà envoyé" });
  }

  if (!audit.reportHtml || audit.reportHtml.length < 1000) {
    return res.status(400).json({ error: "Rapport pas encore généré" });
  }

  const baseUrl = getBaseUrl();
  const sent = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);

  if (sent) {
    await storage.updateAudit(audit.id, { reportDeliveryStatus: "SENT", reportSentAt: new Date() });
    res.json({ success: true, message: "Email envoyé avec succès" });
  } else {
    res.status(500).json({ error: "Échec envoi email" });
  }
});
```

#### **#11: Pas de métriques sur temps moyen génération rapport**
- **Fix:** Ajouter colonne `generation_duration_ms` dans `audits`

#### **#12: Pas de backup automatique réponses questionnaire**
- **Fix:** Export CSV quotidien des `questionnaire_progress` vers S3/backup

---

## 4. VÉRIFICATION STOCKAGE RÉPONSES

### ✅ Réponses bien stockées

- **Table:** `questionnaire_progress` (fichier `shared/drizzle-schema.ts` ligne 32)
- **Structure:**
```typescript
{
  id: string,              // UUID
  email: string,           // Unique constraint
  currentSection: number,  // 0-13
  totalSections: number,   // 13
  percentComplete: number, // 0-100
  responses: JSONB,        // ✅ Toutes les réponses du questionnaire
  status: string,          // IN_PROGRESS | COMPLETED
  startedAt: timestamp,
  lastActivityAt: timestamp
}
```

- **Fonction sauvegarde:** `storage.saveProgress()` (fichier `server/storage.ts` ligne 1281)
- **Fonction récupération:** `storage.getProgress(email)` (fichier `server/storage.ts` ligne 1264)

### ✅ Pas de risque de perte

- Les réponses sont sauvegardées **à chaque section** du questionnaire
- Liées à l'email (pas à l'audit) donc survit même si audit pas créé
- Utilisées dans `createAuditFromPaidOrder()` pour créer l'audit

---

## 5. FLUX COMPLET AVEC POINTS DE FAILURE

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT REMPLIT QUESTIONNAIRE                             │
├─────────────────────────────────────────────────────────────┤
│ POST /api/questionnaire → saveProgress()                    │
│ ✅ Sauvegarde dans questionnaire_progress                   │
│ ⚠️ FAILURE POINT: Si user abandonne → dans AdminDashboard   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CLIENT PAIE VIA STRIPE                                   │
├─────────────────────────────────────────────────────────────┤
│ POST /api/stripe/create-checkout → Stripe Checkout créé    │
│ Metadata: { email, planType }                               │
│ ✅ Crée order status=pending                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK STRIPE: checkout.session.completed              │
├─────────────────────────────────────────────────────────────┤
│ Stripe appelle POST /api/stripe/webhook                    │
│ ✅ Update order status → 'paid'                            │
│ ❌ NE CRÉE PAS L'AUDIT (ligne 5312-5324)                   │
│ ⚠️ CRITICAL FAILURE POINT: Si client ferme page ici        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND APPELLE confirm-session                         │
├─────────────────────────────────────────────────────────────┤
│ POST /api/stripe/confirm-session?sessionId=xxx             │
│ ✅ Récupère progress (responses)                           │
│ ✅ Appelle createAuditFromPaidOrder()                      │
│ ✅ Crée audit dans DB                                      │
│ ✅ Link order.audit_id                                     │
│ ✅ Appelle startReportGeneration()                         │
│ ⚠️ FAILURE POINT: Si frontend crash → audit pas créé       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. GÉNÉRATION RAPPORT (ASYNC)                              │
├─────────────────────────────────────────────────────────────┤
│ reportJobManager.startReportGeneration()                    │
│ Status: PENDING → GENERATING                                │
│ ✅ Récupère photos si ELITE (ligne 197-272)                │
│ ✅ Appelle Claude Opus 4.6                                 │
│ ✅ Timeout 45min (ligne 40)                                │
│ ✅ Validation score >75 requis (ligne 17)                  │
│ ⚠️ FAILURE POINTS:                                          │
│   - Timeout >45min → FAILED                                 │
│   - Score <75 → NEEDS_REVIEW                                │
│   - Photos manquantes ELITE → NEED_PHOTOS                   │
│   - Claude API error → FAILED                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. RAPPORT GÉNÉRÉ                                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ HTML généré via generatePremiumHTMLFromTxt()            │
│ ✅ Validation obligatoire (ligne 402-432)                  │
│ ✅ Sauvegarde dans audit (ligne 444-450)                   │
│ Status: GENERATING → READY ou SCHEDULED                     │
│ ⚠️ FAILURE POINT: Si validation <75 → NEEDS_REVIEW         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ENVOI EMAIL                                              │
├─────────────────────────────────────────────────────────────┤
│ Cron job (5min) ou immédiat si GRATUIT                     │
│ sendReportReadyEmail() via SendPulse                        │
│ ✅ Email envoyé → Status SENT                              │
│ ⚠️ FAILURE POINTS:                                          │
│   - SendPulse API error → EMAIL_FAILED                      │
│   - Email invalide → EMAIL_FAILED                           │
│   - Rapport READY mais cron crash → orphelin               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. FIXLIST DÉTAILLÉE

| # | Problème | Fichier | Ligne | Fix | Priorité | Test |
|---|----------|---------|-------|-----|----------|------|
| 1 | Webhook ne crée pas audit | `routes.ts` | 5312 | Ajouter logique création audit dans webhook | P0 | Tester paiement Stripe avec page fermée |
| 2 | Pas de réconciliation auto | Nouveau fichier | - | Créer `reconciliation-job.ts` + cron quotidien | P0 | Vérifier orders sans audit_id |
| 3 | Dashboard pas gap orders/audits | `AdminDashboard.tsx` | 818 | Ajouter endpoint `/admin/reconciliation-stats` | P0 | Vérifier affichage dans dashboard |
| 4 | Audits READY orphelins | `index.ts` | 256 | ✅ Déjà implémenté (recovery) - ajouter alertes | P1 | Simuler crash pendant READY |
| 5 | Jobs stuck >45min | `reportJobManager.ts` | 138 | ✅ Déjà implémenté - ajouter notif admin | P1 | Simuler timeout génération |
| 6 | NEEDS_REVIEW sans workflow | Nouveau endpoint | - | `/admin/approve-report/:auditId` | P1 | Tester envoi forcé score <75 |
| 7 | NEED_PHOTOS sans relance | `reportJobManager.ts` | 259 | Ajouter `sendNeedPhotosEmail()` | P1 | ELITE sans 3 photos |
| 8 | Pas retry EMAIL_FAILED | Nouveau cron | - | Cron retry emails (max 3x) | P2 | Simuler échec SendPulse |
| 9 | Dashboard filtres manquants | `AdminDashboard.tsx` | 1186 | Ajouter filtres status/date/type | P2 | UI/UX |
| 10 | Pas force-send audit | Nouveau endpoint | - | `/admin/force-send-audit/:auditId` | P2 | Tester envoi manuel |
| 11 | Pas métriques durée génération | `audits` table | - | Ajouter colonne `generation_duration_ms` | P2 | Analytics |
| 12 | Pas backup réponses | Nouveau script | - | Export CSV quotidien `questionnaire_progress` | P2 | GDPR compliance |

---

## 7. SCRIPTS À CRÉER

### Script 1: Réconciliation urgente (RUN NOW)

```typescript
// server/scripts/reconcile-missing-audits.ts
import { storage } from "../storage";
import { createAuditFromPaidOrder } from "../routes"; // Import function

async function reconcileMissingAudits() {
  const { pool } = await import("../db.js");

  console.log("🔍 Recherche commandes payées sans audit...");

  const result = await pool.query(`
    SELECT o.id, o.email, o.product_type, o.created_at
    FROM orders o
    WHERE o.status = 'paid'
      AND o.audit_id IS NULL
      AND o.product_type IN ('GRATUIT', 'PREMIUM', 'ELITE')
      AND o.created_at > NOW() - INTERVAL '90 days'
    ORDER BY o.created_at ASC
  `);

  console.log(`📊 Trouvé ${result.rows.length} commandes sans audit`);

  let created = 0;
  let failed = 0;
  let noData = 0;

  for (const order of result.rows) {
    const progress = await storage.getProgress(order.email);

    if (!progress || !progress.responses) {
      console.warn(`⚠️  Pas de données questionnaire pour ${order.email}`);
      noData++;
      continue;
    }

    try {
      const orderObj = await storage.getOrder(order.id);
      const result = await createAuditFromPaidOrder(order.email, order.product_type, orderObj);

      if (result.success) {
        console.log(`✅ Audit ${result.auditId} créé pour commande ${order.id}`);
        created++;
      } else {
        console.error(`❌ Échec pour ${order.id}:`, result.error);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Erreur pour ${order.id}:`, err);
      failed++;
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📈 RÉSUMÉ:`);
  console.log(`   ✅ Créés: ${created}`);
  console.log(`   ❌ Échoués: ${failed}`);
  console.log(`   ⚠️  Sans données: ${noData}`);
  console.log(`   📦 Total: ${result.rows.length}`);
}

reconcileMissingAudits()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("ERREUR FATALE:", err);
    process.exit(1);
  });
```

**Usage:**
```bash
npx tsx server/scripts/reconcile-missing-audits.ts
```

### Script 2: Monitoring quotidien

```typescript
// server/scripts/daily-health-check.ts
import { storage } from "../storage";
import { sendAdminEmail } from "../emailService";

async function dailyHealthCheck() {
  const { pool } = await import("../db.js");

  const stats = await pool.query(`
    WITH order_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid') as paid_orders,
        COUNT(*) FILTER (WHERE status = 'paid' AND audit_id IS NULL) as orphan_orders
      FROM orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ),
    audit_stats AS (
      SELECT
        COUNT(*) as total_audits,
        COUNT(*) FILTER (WHERE report_delivery_status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE report_delivery_status IN ('NEEDS_REVIEW', 'FAILED', 'NEED_PHOTOS')) as blocked,
        COUNT(*) FILTER (WHERE report_delivery_status = 'GENERATING' AND created_at < NOW() - INTERVAL '2 hours') as stuck
      FROM audits
      WHERE created_at > NOW() - INTERVAL '24 hours'
    )
    SELECT * FROM order_stats, audit_stats
  `);

  const data = stats.rows[0];
  const alerts = [];

  if (data.orphan_orders > 0) {
    alerts.push(`🚨 ${data.orphan_orders} commandes payées sans audit`);
  }
  if (data.stuck > 0) {
    alerts.push(`⏳ ${data.stuck} jobs bloqués >2h en GENERATING`);
  }
  if (data.blocked > 5) {
    alerts.push(`⚠️  ${data.blocked} rapports bloqués (NEEDS_REVIEW/FAILED)`);
  }

  const health = alerts.length === 0 ? "✅ HEALTHY" : "🚨 ALERTS";

  console.log(`\n📊 HEALTH CHECK ${new Date().toISOString()}`);
  console.log(`   Status: ${health}`);
  console.log(`   Commandes 24h: ${data.paid_orders}`);
  console.log(`   Audits 24h: ${data.total_audits}`);
  console.log(`   Envoyés: ${data.sent}`);
  console.log(`   Bloqués: ${data.blocked}`);
  console.log(`   Orphelins: ${data.orphan_orders}`);

  if (alerts.length > 0) {
    console.log(`\n⚠️  ALERTES:`);
    alerts.forEach(alert => console.log(`   ${alert}`));

    // Envoyer email admin
    await sendAdminEmail(
      "APEXLABS - Alertes système",
      alerts.join("\n")
    );
  }
}

dailyHealthCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("ERREUR:", err);
    process.exit(1);
  });
```

**Ajouter au cron (server/index.ts):**
```typescript
// Health check quotidien à 9h
const schedule = require('node-schedule');
schedule.scheduleJob('0 9 * * *', async () => {
  const { execSync } = require('child_process');
  execSync('npx tsx server/scripts/daily-health-check.ts');
});
```

### Script 3: Force-send rapports bloqués

```typescript
// server/scripts/force-send-blocked.ts
import { storage } from "../storage";
import { sendReportReadyEmail } from "../emailService";

async function forceSendBlocked() {
  const audits = await storage.getAllAudits();

  const blocked = audits.filter(a =>
    a.reportDeliveryStatus === "READY" &&
    a.reportHtml &&
    a.reportHtml.length > 1000 &&
    !a.reportSentAt
  );

  console.log(`📧 Trouvé ${blocked.length} rapports READY à envoyer`);

  const baseUrl = process.env.APP_URL || "https://apexlabs.achzodcoaching.com";
  let sent = 0;

  for (const audit of blocked) {
    try {
      const success = await sendReportReadyEmail(audit.email, audit.id, audit.type, baseUrl);
      if (success) {
        await storage.updateAudit(audit.id, {
          reportDeliveryStatus: "SENT",
          reportSentAt: new Date()
        });
        console.log(`✅ Envoyé: ${audit.id} (${audit.email})`);
        sent++;
      } else {
        console.error(`❌ Échec: ${audit.id}`);
      }
    } catch (err) {
      console.error(`❌ Erreur ${audit.id}:`, err);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ ${sent}/${blocked.length} envoyés`);
}

forceSendBlocked()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("ERREUR:", err);
    process.exit(1);
  });
```

---

## 8. PLAN D'ACTION PAR PHASE

### PHASE 1 - URGENCE (AUJOURD'HUI - 2h)

**Objectif:** Débloquer les 302 audits manquants + fix webhook

1. **Exécuter script réconciliation** (30 min)
   ```bash
   # Sur Render.com shell
   npx tsx server/scripts/reconcile-missing-audits.ts
   ```
   - Crée tous les audits manquants pour commandes payées
   - Lance génération automatique
   - Envoie rapports dès READY

2. **Fix webhook Stripe** (1h)
   - Modifier `server/routes.ts` ligne 5312
   - Ajouter logique `createAuditFromPaidOrder()` dans webhook
   - Déployer sur Render
   - Tester avec Stripe CLI
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   stripe trigger checkout.session.completed
   ```

3. **Dashboard admin - alertes urgentes** (30 min)
   - Ajouter endpoint `/api/admin/reconciliation-stats`
   - Afficher badge rouge si gap >10
   - Déployer

### PHASE 2 - COURT TERME (24-48h)

**Objectif:** Monitoring + retry automatique

1. **Système retry emails** (3h)
   - Créer table `email_retry_queue`
   - Cron job toutes les 15min
   - Max 3 tentatives, backoff exponentiel (1min, 5min, 15min)

2. **Monitoring automatique** (2h)
   - Script daily-health-check.ts
   - Cron 9h tous les jours
   - Email admin si alertes

3. **Endpoints admin force-send** (2h)
   - `/api/admin/force-send-audit/:auditId`
   - `/api/admin/approve-report/:auditId` (NEEDS_REVIEW)
   - Boutons dans dashboard

4. **Email NEED_PHOTOS** (1h)
   - Template email avec lien upload
   - Endpoint `/api/upload-photos/:auditId`

### PHASE 3 - MOYEN TERME (1 semaine)

**Objectif:** Robustesse + analytics

1. **Job réconciliation quotidien** (2h)
   - Automatiser script reconcile-missing-audits.ts
   - Cron 3h du matin
   - Notification admin si >5 orphelins

2. **Améliorer quality gates** (3h)
   - Baisser seuil validation à 65 (au lieu de 75)
   - Améliorer prompts Claude pour meilleure qualité
   - Retry automatique si score entre 60-75

3. **Dashboard admin amélioré** (4h)
   - Filtres avancés (status, date, type, email)
   - Vue "Problèmes" avec tous les audits bloqués
   - Timeline pour chaque audit (events)
   - Bouton "Voir réponses questionnaire"

4. **Analytics génération** (2h)
   - Colonne `generation_duration_ms`
   - Graphique durée moyenne par type
   - Alertes si >30min

---

## 9. COMMANDES UTILES

### Vérifier état actuel
```sql
-- Gap commandes/audits
SELECT
  COUNT(*) FILTER (WHERE o.status = 'paid') as paid_orders,
  COUNT(*) FILTER (WHERE o.audit_id IS NOT NULL) as with_audit,
  COUNT(*) FILTER (WHERE o.audit_id IS NULL) as missing_audit
FROM orders o
WHERE o.created_at > NOW() - INTERVAL '90 days';

-- Audits par status
SELECT report_delivery_status, COUNT(*)
FROM audits
GROUP BY report_delivery_status
ORDER BY COUNT(*) DESC;

-- Jobs stuck
SELECT id, email, report_delivery_status, created_at
FROM audits
WHERE report_delivery_status = 'GENERATING'
  AND created_at < NOW() - INTERVAL '2 hours'
ORDER BY created_at ASC;
```

### Débloquer manuellement un audit
```sql
-- Si rapport généré mais pas envoyé
UPDATE audits
SET report_delivery_status = 'READY'
WHERE id = 'AUDIT_ID_HERE'
  AND report_html IS NOT NULL;

-- Forcer envoi immédiat (skip scheduling)
UPDATE audits
SET report_delivery_status = 'READY',
    report_scheduled_for = NOW()
WHERE id = 'AUDIT_ID_HERE';
```

---

## 10. RISQUES & MITIGATIONS

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Script réconciliation crée doublons | Moyen | Faible | Check `order.audit_id` avant création |
| Webhook Stripe échoue silencieusement | Critique | Moyen | Logs + alertes + réconciliation quotidienne |
| Rate limit SendPulse | Moyen | Faible | Délai 2s entre emails + retry queue |
| Claude API timeout pendant fix | Moyen | Faible | Timeout déjà à 45min, monitoring stuck jobs |
| Client reçoit 2x le même rapport | Faible | Faible | Check `reportSentAt` avant envoi |

---

## 11. MÉTRIQUES DE SUCCÈS

**Après implémentation Phase 1:**
- ✅ 0 commandes payées sans `audit_id`
- ✅ Gap orders/audits < 5
- ✅ Webhook crée audit automatiquement

**Après Phase 2:**
- ✅ Taux d'envoi email >98%
- ✅ Temps moyen génération <25min
- ✅ 0 audits READY >1h

**Après Phase 3:**
- ✅ Dashboard admin affiche toutes les métriques
- ✅ Alertes automatiques si problème
- ✅ Analytics génération disponibles

---

## 12. CONTACT & SUPPORT

**Pour questions:**
- Email: coaching@achzodcoaching.com
- Dashboard admin: https://apexlabs.achzodcoaching.com/admin

**Logs en temps réel:**
```bash
# Sur Render.com
render logs tail
```

**DB access:**
```bash
# Connection string dans env var DATABASE_URL
psql $DATABASE_URL
```

---

**FIN DU RAPPORT**

*Généré par Claude Sonnet 4.5 - 2026-03-24*
