# 🎯 PLAN D'ACTION COMPLET - TRACKING & DASHBOARD

**Date:** 24 mars 2026
**Découvertes:** Système tracking email_tracking existe mais table vide (code ajouté après lancement)

---

## 📊 ÉTAT ACTUEL

### Sources de données
1. ✅ **SendPulse API** → 244 rapports envoyés (VÉRITÉ ABSOLUE)
2. ✅ **Base de données `audits`** → 100 audits, status SCHEDULED/READY/SENT
3. ❌ **Google Sheet** → 136 emails (manque 108 emails!) - SYNC CASSÉ
4. ❌ **Table `email_tracking`** → 0 lignes (code tracking ajouté récemment)

### Problèmes identifiés
1. Google Sheet ne sync pas tous les emails (manque 108)
2. Dashboard admin lit depuis Google Sheet (données incomplètes)
3. Table `email_tracking` vide (historique perdu)
4. Pas de source de vérité unique en DB

---

## ✅ SOLUTIONS À IMPLÉMENTER

### 1. FORCER ENVOI DES 3 CLIENTS BLOQUÉS (PRIORITÉ 1)

**Clients:**
- nicolasgourvenec1@orange.fr (READY depuis 14h)
- haykel007@gmail.com (SCHEDULED depuis 26h)
- brieuc.lgall@gmail.com (SCHEDULED depuis 26h)

**Endpoint à créer:**
```typescript
POST /api/admin/force-send-email
Body: { email: "..." }
```

**Action:**
1. Check audit existe et status READY/SCHEDULED
2. Forcer envoi immédiat via `sendReportReadyEmail`
3. Mettre à jour status à SENT
4. Logger dans `email_tracking`

---

### 2. MIGRER HISTORIQUE SENDPULSE VERS DB (PRIORITÉ 1)

**Objectif:** Importer les 244 emails SendPulse dans `email_tracking`

**Endpoint à créer:**
```typescript
POST /api/admin/import-sendpulse-history
Body: CSV ou JSON du fichier SendPulse
```

**Logique:**
1. Parser le CSV SendPulse (911 lignes)
2. Filtrer emails de rapports (Discovery/Anabolic/Ultimate)
3. Extraire: email, date, subject, status (Delivered/Not delivered)
4. Corréler avec orders pour trouver audit_id
5. Insérer dans `email_tracking` avec:
   - emailType: "sendReportReadyEmail" (ou déduire du subject)
   - recipientEmail
   - auditId (trouvé via order)
   - auditType (GRATUIT/PREMIUM/ELITE selon subject)
   - subject
   - sendpulseStatus: "success" si Delivered
   - sentAt: date du CSV
6. Return: `{ imported: 244, skipped: 15, errors: 0 }`

**Bénéfice:**
- Table `email_tracking` devient source de vérité
- Dashboard admin affiche vraies données
- Historique complet depuis le 17 mars

---

### 3. FIXER LE DASHBOARD ADMIN (PRIORITÉ 2)

**Actuellement:** Dashboard lit depuis Google Sheet (incomplet)

**Modification:**
```typescript
// AVANT (routes.ts - ligne ~4000)
app.get("/api/admin/stats", async (req, res) => {
  // Lit depuis Google Sheet ou calcule à la volée
  const stats = await getEmailTrackingStats(); // vide actuellement
  ...
});

// APRÈS
app.get("/api/admin/stats", async (req, res) => {
  const stats = await getEmailTrackingStats(); // lit depuis email_tracking

  // Stats réelles:
  const totalSent = await db.select().from(emailTracking);
  const deliveredCount = totalSent.filter(e => e.sendpulseStatus === "success");

  // Croiser avec audits table
  const auditsWithEmail = await db.query.audits.findMany({
    with: { emailTracking: true }
  });

  return {
    totalEmails: totalSent.length,
    delivered: deliveredCount.length,
    byAuditType: { GRATUIT: X, PREMIUM: Y, ELITE: Z },
    pending: audits.filter(a => a.reportDeliveryStatus === "SCHEDULED").length,
    ready: audits.filter(a => a.reportDeliveryStatus === "READY").length,
    sent: audits.filter(a => a.reportDeliveryStatus === "SENT").length
  };
});
```

**Sections dashboard à ajouter:**
1. **Email Delivery Stats** (depuis `email_tracking`)
   - Total envoyés
   - Taux de délivrance
   - Par type (Discovery/Anabolic/Ultimate)
   - Dernières 24h / 7 jours

2. **Audit Status** (depuis `audits`)
   - SCHEDULED (en attente envoi)
   - READY (prêt à envoyer)
   - SENT (envoyé)
   - GENERATING (en cours)

3. **Alertes temps réel**
   - Audits SCHEDULED > 48h (à forcer)
   - Audits READY > 12h (à forcer)
   - Emails failed (à renvoyer)

---

### 4. CORRIGER SYNC GOOGLE SHEET (PRIORITÉ 3)

**Problème actuel:**
- `googleSheetsService.ts` appelle `pushEmailToSheets` après envoi
- Mais 108 emails manquent → sync raté

**Debug nécessaire:**
1. Vérifier si env vars `GOOGLE_SHEETS_CLIENT_EMAIL` et `GOOGLE_SHEETS_PRIVATE_KEY` configurées
2. Vérifier logs SendPulse pour voir si `pushEmailToSheets` est appelé
3. Si configuré mais échoue → checker erreurs Google API
4. Si non configuré → configurer ou désactiver complètement

**Décision:**
- **Option A:** Fixer le sync Google Sheet (effort moyen, peu de valeur)
- **Option B:** Désactiver Google Sheet, tout en DB (RECOMMANDÉ)

**Si Option B:**
```typescript
// server/emailService.ts - ligne ~194
await logEmail({ ... }); // ✅ Garde ça

// Supprimer ou commenter:
// await pushEmailToSheets({ ... }); // ❌ Enlever
```

**Bénéfice Option B:**
- Source unique de vérité (DB)
- Pas de dépendance externe
- Dashboard admin plus fiable
- Google Sheet devient optionnel (export manuel si besoin)

---

### 5. CRÉER ENDPOINTS ADMIN MONITORING (PRIORITÉ 2)

**Nouveaux endpoints:**

```typescript
// 1. Stats temps réel
GET /api/admin/email-stats
Response: {
  totalSent: 244,
  delivered: 244,
  failed: 0,
  pending: 26, // audits SCHEDULED
  ready: 1,    // audits READY
  byType: { GRATUIT: 220, PREMIUM: 20, ELITE: 4 },
  last24h: 11,
  last7d: 244
}

// 2. Emails récents
GET /api/admin/emails-recent?limit=50
Response: [
  {
    id: "abc123",
    email: "client@example.com",
    auditType: "GRATUIT",
    subject: "Ton Discovery Scan est pret",
    status: "success",
    sentAt: "2026-03-24T07:30:00Z"
  },
  ...
]

// 3. Audits en attente
GET /api/admin/audits-pending
Response: {
  scheduled: [ /* 26 audits SCHEDULED */ ],
  ready: [ /* 1 audit READY */ ],
  stuck: [ /* audits SCHEDULED > 48h */ ]
}

// 4. Forcer envoi
POST /api/admin/force-send
Body: { auditId: "..." }
Response: { success: true, sent: true }

// 5. Importer historique
POST /api/admin/import-sendpulse
Body: { csvData: "..." }
Response: { imported: 244, skipped: 15 }
```

---

## 🚀 ORDRE D'IMPLÉMENTATION

### Phase 1: URGENT (maintenant)
1. ✅ Créer endpoint `/api/admin/force-send` → Envoyer les 3 emails bloqués
2. ✅ Créer endpoint `/api/admin/import-sendpulse` → Importer historique

### Phase 2: CORRECTIONS (aujourd'hui)
3. ✅ Modifier dashboard admin → Lire depuis `email_tracking` + `audits`
4. ✅ Ajouter stats temps réel dashboard
5. ✅ Ajouter alertes (SCHEDULED > 48h, READY > 12h)

### Phase 3: NETTOYAGE (demain)
6. ✅ Décider Google Sheet (fixer ou désactiver)
7. ✅ Tester tout le flow end-to-end
8. ✅ Documenter le système

---

## 📊 RÉSULTAT FINAL

**Avant:**
- ❌ 3 sources de données contradictoires
- ❌ Dashboard admin affiche 136 emails (faux)
- ❌ Pas d'historique en DB
- ❌ Google Sheet désynchronisé

**Après:**
- ✅ Source unique de vérité: `email_tracking` table
- ✅ Dashboard admin affiche 244 emails (vrai)
- ✅ Historique complet depuis 17 mars en DB
- ✅ Google Sheet optionnel (ou désactivé)
- ✅ Monitoring temps réel
- ✅ Alertes automatiques
- ✅ 3 emails bloqués envoyés

---

## 💡 RECOMMANDATIONS FUTURES

1. **Webhooks SendPulse** → Récupérer opens, clicks, bounces
2. **Retry automatique** → Audits SCHEDULED > 48h auto-retry
3. **Email templates** → Stocker en DB pour A/B testing
4. **Analytics dashboard** → Graphiques email delivery par jour
5. **Export CSV** → Permettre export email_tracking pour analyse

---

**Status:** 🟡 EN ATTENTE VALIDATION
**Prochaine étape:** Implémenter Phase 1 (force-send + import)
