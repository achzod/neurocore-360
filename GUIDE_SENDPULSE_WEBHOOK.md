# 🎯 GUIDE: Configurer Webhook SendPulse pour Tracking CTA

**Date:** 24 mars 2026 17:00
**Objectif:** Recevoir automatiquement les events opens/clicks depuis SendPulse

---

## ✅ CE QUI EST FAIT

### 1. Infrastructure Backend
- ✅ Table `cta_tracking` créée en DB
- ✅ Endpoint webhook: `POST /api/webhooks/sendpulse`
- ✅ Endpoint stats: `GET /api/admin/cta-stats`
- ✅ Tests réussis (1 open, 1 click)

### 2. Structure CTA Tracking

```sql
CREATE TABLE cta_tracking (
  id VARCHAR(36) PRIMARY KEY,
  email_tracking_id VARCHAR(36),  -- Lien vers email_tracking
  event_type VARCHAR(50),          -- 'open', 'click', 'unsubscribe', 'bounce'
  url TEXT,                        -- URL cliquée (pour clicks)
  user_agent TEXT,
  ip_address VARCHAR(50),
  metadata JSONB,                  -- Données brutes SendPulse
  created_at TIMESTAMP
);
```

### 3. Events Trackés

- **open**: Email ouvert
- **click**: Lien cliqué
- **unsubscribe**: Désabonnement
- **bounce**: Email bounced

---

## 📋 CONFIGURATION SENDPULSE (À FAIRE)

### Étape 1: Aller dans SendPulse Dashboard

1. Connexion: https://login.sendpulse.com
2. Menu: **Settings** → **Webhooks**
3. Cliquer: **Add Webhook**

### Étape 2: Configurer le Webhook

**URL du Webhook:**
```
https://apexlabs.achzodcoaching.com/api/webhooks/sendpulse
```

**Events à sélectionner:**
- ☑️ Email Opened
- ☑️ Email Clicked
- ☑️ Email Bounced
- ☑️ Unsubscribed

**Method:** POST
**Content-Type:** application/json

### Étape 3: Tester le Webhook

SendPulse a un bouton "Test Webhook". Clique dessus pour vérifier que l'endpoint répond.

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Event tracked"
}
```

### Étape 4: Activer le Webhook

Une fois testé, active le webhook pour recevoir les events en temps réel.

---

## 🧪 TESTS RÉALISÉS

### Test 1: Email Open
```bash
curl -X POST "https://apexlabs.achzodcoaching.com/api/webhooks/sendpulse" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "email.open",
    "email": "test@example.com",
    "task_id": "test123",
    "timestamp": "2026-03-24T16:00:00Z"
  }'
```

**Résultat:** ✅ Success

### Test 2: Email Click
```bash
curl -X POST "https://apexlabs.achzodcoaching.com/api/webhooks/sendpulse" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "email.click",
    "email": "test@example.com",
    "url": "https://apexlabs.achzodcoaching.com/scan/abc123",
    "timestamp": "2026-03-24T16:05:00Z"
  }'
```

**Résultat:** ✅ Success

---

## 📊 STATS CTA DASHBOARD

### Endpoint Stats
```bash
curl -s "https://apexlabs.achzodcoaching.com/api/admin/cta-stats" \
  -H "x-admin-key: e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"
```

### Réponse Actuelle
```json
{
  "totalSent": 269,
  "opened": 0,
  "clicked": 0,
  "openRate": "0.0%",
  "clickRate": "0.0%",
  "clickToOpenRate": "0.0%",
  "byEventType": {
    "open": 1,
    "click": 1
  },
  "byUrl": {
    "https://apexlabs.achzodcoaching.com/scan/abc123": 1
  },
  "recentEvents": [...]
}
```

**Note:** opened/clicked = 0 car le tracking commence maintenant. Les futurs emails seront trackés automatiquement.

---

## 🎯 PROCHAINES ACTIONS

### Immédiat (5 min)
1. Aller sur SendPulse dashboard
2. Configurer webhook avec l'URL ci-dessus
3. Activer webhook
4. Tester avec le bouton "Test Webhook"

### Court terme (1h)
1. Envoyer un email test via APEXLABS
2. Ouvrir l'email
3. Cliquer sur un lien
4. Vérifier stats CTA dans dashboard admin

### Moyen terme (cette semaine)
1. Setup backups DB (S3, local PC)
2. Créer dashboard frontend pour visualiser stats CTA
3. A/B testing emails
4. Segmentation clients par engagement

---

## 🔍 MONITORING & DEBUG

### Logs Webhook
Les logs du webhook sont visibles dans les logs Render:
```bash
[SendPulseWebhook] Received webhook: {...}
[SendPulseWebhook] ✅ Tracked open for test@example.com
```

### Vérifier Events Reçus
```sql
SELECT * FROM cta_tracking ORDER BY created_at DESC LIMIT 10;
```

### Vérifier Emails Mis à Jour
```sql
SELECT recipient_email, opened, clicked 
FROM email_tracking 
WHERE opened IS NOT NULL OR clicked IS NOT NULL
ORDER BY sent_at DESC;
```

---

## 📝 NOTES IMPORTANTES

1. **Privacy:** Les IPs et user agents sont stockés pour analytics, conforme RGPD si anonymisé
2. **Performance:** Webhook est asynchrone, pas de ralentissement SendPulse
3. **Scaling:** Table `cta_tracking` peut stocker millions d'events (indexes optimisés)
4. **Backup:** Penser à inclure `cta_tracking` dans les backups DB

---

## ✅ CHECKLIST FINALE

- [x] Table `cta_tracking` créée
- [x] Webhook endpoint déployé
- [x] CTA stats endpoint fonctionnel
- [x] Tests webhook réussis
- [ ] Configuration SendPulse webhook (À FAIRE PAR TOI BRO!)
- [ ] Test avec vrai email envoyé
- [ ] Backups DB configurés

---

**Status:** 🟢 **PRÊT À CONFIGURER**

Une fois le webhook SendPulse activé, tous les futurs emails seront trackés automatiquement! 🚀
