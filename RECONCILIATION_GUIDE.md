# 🚨 GUIDE RÉCONCILIATION URGENTE - AUDITS MANQUANTS

**Status:** ✅ Déployé en production
**Date:** 24 mars 2026
**Launch date:** 17 mars 2026 (tout avant = tests internes)
**Commits:**
- `59e49219` - Endpoints admin réconciliation
- `cf12b8b1` - Fix webhook Stripe (création automatique audits)

---

## 🎯 OBJECTIF

Récupérer les **audits manquants** pour les **VRAIS clients** ayant payé depuis le lancement (≥ 17 mars 2026) mais n'ayant jamais reçu leur rapport.

**IMPORTANT:** Les requêtes filtrent automatiquement `created_at >= '2026-03-17'` pour exclure tous les tests internes avant le lancement officiel.

---

## ✅ CE QUI A ÉTÉ FIXÉ

### 1️⃣ Webhook Stripe (ROOT CAUSE)
**Problème:** Le webhook ne créait pas l'audit automatiquement
**Fix:** Webhook crée maintenant l'audit après paiement
**Impact:** Tous les nouveaux paiements créeront automatiquement leur audit

### 2️⃣ Endpoints Admin Réconciliation
**Nouveaux endpoints:**
- `POST /api/admin/reconcile-missing-audits` - Lance la réconciliation
- `GET /api/admin/reconciliation-stats` - Affiche le gap orders/audits

---

## 🚀 COMMENT LANCER LA RÉCONCILIATION

### Option 1: Via Admin Dashboard (RECOMMANDÉ)

**URL:**
```
https://apexlabs.achzodcoaching.com/admin
```

**Étapes:**
1. Se connecter au dashboard admin
2. Ouvrir la console du navigateur (F12)
3. Exécuter:

```javascript
// 1. Vérifier le gap actuel
fetch('/api/admin/reconciliation-stats', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
})
  .then(r => r.json())
  .then(data => console.log('📊 Stats:', data));

// 2. Lancer la réconciliation
fetch('/api/admin/reconcile-missing-audits', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
})
  .then(r => r.json())
  .then(data => console.log('✅ Résultat:', data));
```

**Résultat attendu:**
```json
{
  "success": true,
  "totalFound": 302,
  "created": 250,
  "failed": 2,
  "noData": 45,
  "needPhotos": 5,
  "errors": [...]
}
```

### Option 2: Via cURL

```bash
# 1. Obtenir le token admin (depuis localStorage dans le navigateur)
# 2. Lancer la réconciliation

curl -X POST https://apexlabs.achzodcoaching.com/api/admin/reconcile-missing-audits \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 3: Via Render Shell (si accès)

Si vous avez accès au shell Render:
```bash
npx tsx server/scripts/reconcile-missing-audits.ts
```

---

## 📊 INTERPRÉTATION DES RÉSULTATS

### Statuts possibles:

**✅ `created`**: Audit créé avec succès
- L'audit est créé
- Lié à la commande
- Génération du rapport lancée automatiquement
- Email envoyé sous 5-10 minutes

**❌ `noData`**: Pas de données questionnaire
- Client a payé SANS remplir le questionnaire
- Action requise: Contacter le client manuellement
- Lui demander de remplir le questionnaire via `/questionnaire`

**📸 `needPhotos`**: Photos manquantes (Ultimate Scan uniquement)
- Client a payé Ultimate Scan mais uploadé < 3 photos
- Action requise: Contacter le client
- Lui demander d'uploader 3 photos (face, profil, dos)

**❌ `failed`**: Erreur technique
- Vérifier les logs dans `errors` array
- Peut nécessiter intervention manuelle

---

## 🔍 VÉRIFICATION POST-RÉCONCILIATION

### 1. Vérifier le nombre d'audits créés

```bash
# Dans Render Shell ou via psql
SELECT COUNT(*) FROM audits WHERE created_at > NOW() - INTERVAL '1 hour';
```

### 2. Vérifier les reports générés

```bash
# Attendre 10 minutes puis vérifier
SELECT COUNT(*) FROM audits
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND report_delivery_status IN ('READY', 'SENT');
```

### 3. Vérifier les emails envoyés

Aller dans le dashboard admin → section "Recent Audits"
Filtrer par "Created today"
Vérifier le statut de chaque audit

---

## ⚠️ CAS PARTICULIERS

### Cas 1: Client sans données questionnaire (noData)

**Email type à envoyer:**

```
Objet: APEXLABS - Finalise ton analyse métabolique

Salut [Prénom],

Ton paiement pour [Product] a bien été reçu, merci !

Cependant, je constate que tu n'as pas encore rempli le questionnaire nécessaire pour générer ton rapport personnalisé.

👉 Remplis-le ici (5 min): https://apexlabs.achzodcoaching.com/questionnaire
   Email: [email du client]

Dès que c'est fait, je relance manuellement la génération de ton rapport.

Des questions ? Réponds à cet email.

APEXLABS by Achzod
```

### Cas 2: Ultimate Scan sans 3 photos (needPhotos)

**Email type à envoyer:**

```
Objet: APEXLABS Ultimate Scan - Photos manquantes

Salut [Prénom],

Ton paiement pour Ultimate Scan a bien été reçu !

Pour générer ton rapport complet avec analyse morphologique, j'ai besoin de 3 photos:
- Face (de face, torse nu, lumière naturelle)
- Profil (de côté, même setup)
- Dos (de dos, même setup)

👉 Remplit ou modifie tes photos ici:
https://apexlabs.achzodcoaching.com/questionnaire
Email: [email du client]

Dès réception, je lance ton analyse immédiatement.

APEXLABS by Achzod
```

---

## 🔄 MONITORING CONTINU

### Dashboard Admin - Stats en temps réel

Ajouter cet indicateur dans votre dashboard admin:

```typescript
// Fetch reconciliation stats every 5 minutes
useEffect(() => {
  const fetchStats = async () => {
    const res = await fetch('/api/admin/reconciliation-stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();

    // Show red badge if gap > 10
    if (data.gap > 10) {
      console.warn(`⚠️  ${data.gap} paid orders without audit!`);
    }
  };

  fetchStats();
  const interval = setInterval(fetchStats, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

### Alertes quotidiennes

Le script de monitoring quotidien (à venir) enverra un email admin chaque jour avec:
- Nombre d'audits créés
- Nombre de reports générés
- Nombre de reports envoyés
- Gap orders/audits actuel
- Alertes si gap > 10

---

## 📈 MÉTRIQUES DE SUCCÈS

**Note:** Les chiffres initiaux de 378/76/302 incluaient les tests internes avant le 17 mars.

**Avec filtre clients réels uniquement (≥ 17 mars):**
- Utilise `/api/admin/reconciliation-stats` pour voir les vrais chiffres
- Check le script `server/scripts/check-real-gap.ts` pour analyse détaillée

**Objectif après réconciliation:**
- Gap < 10 (seulement clients sans questionnaire ou photos)
- Taux de livraison > 90%
- Temps de livraison < 10 minutes

**Monitoring:**
- Check quotidien du gap
- Alerte si gap > 10
- Review hebdomadaire des cas "noData" et "needPhotos"

---

## 🆘 TROUBLESHOOTING

### Problème: Endpoint renvoie 401 Unauthorized

**Solution:** Token admin expiré
```javascript
// Regénérer le token admin via login
localStorage.setItem('adminToken', 'NOUVEAU_TOKEN');
```

### Problème: Endpoint timeout

**Solution:** Trop de commandes à traiter
- Lancer la réconciliation plusieurs fois (idempotent)
- Chaque execution traitera les commandes restantes

### Problème: Audits créés mais reports pas générés

**Vérifier:**
1. `ANTHROPIC_API_KEY` configuré dans Render
2. Logs Render pour erreurs génération
3. Queue de génération pas bloquée

**Fix rapide:**
```bash
# Via Render Shell
npx tsx server/scripts/regenerate-failed-reports.ts
```

---

## 📞 SUPPORT

**Si besoin d'aide:**
1. Vérifier les logs Render: https://dashboard.render.com
2. Consulter l'audit complet: `AUDIT_APEXLABS_URGENT_COMPLET.md`
3. Contacter Claude Code pour debug

---

## ✅ CHECKLIST FINALE

Après avoir lancé la réconciliation:

- [ ] Endpoint exécuté sans erreurs 500
- [ ] `created` > 200 (majorité des 302)
- [ ] `noData` < 50 (cas légitimes)
- [ ] `needPhotos` < 10 (Ultimate Scan)
- [ ] Attendre 10 min puis vérifier emails envoyés
- [ ] Contacter les clients `noData` et `needPhotos`
- [ ] Mettre en place monitoring quotidien
- [ ] Vérifier gap orders/audits chaque semaine

---

**Status:** 🚀 **PRÊT À LANCER**
**Impact:** Récupération de 302 clients + fix permanent du problème
**Temps estimé:** 5 minutes execution + 10 minutes génération reports

🔥 **GO BRO !**
