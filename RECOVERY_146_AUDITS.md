# 🚨 RÉCUPÉRATION 146 AUDITS PERDUS

**Date:** 24 mars 2026
**Status:** 🚀 Endpoint déployé, en attente lancement

---

## 📊 SITUATION DÉCOUVERTE

```
✅ 246 commandes payées (depuis 17 mars)
✅ 246 ont un audit_id assigné
❌ Seulement 100 audits existent dans la table audits
🔴 146 AUDITS MANQUANTS !
```

**Pattern temporel:**
- 📅 18 mars: 101 audits manquants (lendemain du lancement!)
- 📅 19 mars: 33 audits manquants
- 📅 20-21 mars: 12 audits manquants
- 📅 Après le 21: 0 audit manquant

**Type:** Tous GRATUIT (Discovery Scan gratuit)

**Cause:** Bug au lancement - les audit_id étaient assignés aux orders mais les audits n'étaient jamais créés dans la table `audits` (ou supprimés après).

---

## 🔧 SOLUTION DÉPLOYÉE

**Endpoint créé:** `POST /api/admin/recover-lost-audits`

**Ce qu'il fait:**
1. Trouve toutes les commandes avec `audit_id` mais pas d'audit correspondant dans la table `audits`
2. Vérifie si les données questionnaire existent encore dans `questionnaire_progress`
3. Recrée les audits avec **l'audit_id ORIGINAL** de la commande
4. Préserve la date de création originale
5. Met le statut `PENDING` pour déclencher la génération automatique
6. Nettoie `questionnaire_progress` après succès

---

## 🚀 COMMANDE À LANCER (attendre 3-5 min que Render redéploie)

```bash
curl -X POST "https://apexlabs.achzodcoaching.com/api/admin/recover-lost-audits" \
  -H "x-admin-key: e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"
```

**Ou depuis la console admin:**
```javascript
fetch('/api/admin/recover-lost-audits', {
  method: 'POST',
  headers: { 'x-admin-key': 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e' }
})
  .then(r => r.json())
  .then(data => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RÉCUPÉRATION TERMINÉE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Trouvés: ${data.totalFound}`);
    console.log(`✅ Récupérés: ${data.recovered}`);
    console.log(`⚠️  Sans données: ${data.noData}`);
    console.log(`📸 Photos manquantes: ${data.needPhotos}`);
    console.log(`♻️  Déjà existants: ${data.alreadyExists}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
```

---

## 📈 RÉSULTATS ATTENDUS

**Scénario optimiste:**
```
✅ Récupérés: ~140-146 (données questionnaire encore présentes)
⚠️  Sans données: ~0-6 (client n'a jamais rempli questionnaire)
📸 Photos manquantes: 0 (tous GRATUIT, pas de photos requises)
```

**Scénario réaliste:**
```
✅ Récupérés: ~100-130 (questionnaire_progress peut avoir été nettoyé)
⚠️  Sans données: ~16-46 (données supprimées après timeout)
```

**Si sans données:**
- Contact manuel requis
- Demander au client de remplir le questionnaire à nouveau
- Relancer la création d'audit

---

## 🔄 APRÈS RÉCUPÉRATION

**Ce qui se passe automatiquement:**
1. Audits recréés avec status `PENDING`
2. Job automatique va les détecter
3. Génération des rapports lancée (Claude Opus 4.6)
4. Emails envoyés sous 5-10 minutes
5. Status passe à `SENT`

**Vérification (10 min après):**
```bash
curl -s "https://apexlabs.achzodcoaching.com/api/admin/reconciliation-stats" \
  -H "x-admin-key: e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"
```

Le `gap` devrait être proche de 0 !

---

## 📞 CAS PARTICULIERS

### Client sans données questionnaire

**Si `noData > 0`:** Ces clients ont payé SANS remplir le questionnaire.

**Action:**
1. Récupérer la liste des emails dans la réponse API (`errors` array)
2. Email template:

```
Objet: APEXLABS - Finalise ton Discovery Scan gratuit

Salut,

Ton Discovery Scan gratuit est prêt à être généré !

Pour recevoir ton rapport personnalisé, il me faut juste que tu remplisses le questionnaire (5 min):
👉 https://apexlabs.achzodcoaching.com/questionnaire

Une fois fait, ton rapport partira automatiquement !

APEXLABS by Achzod
```

---

## ✅ CHECKLIST

- [ ] Attendre 3-5 min (déploiement Render)
- [ ] Lancer l'endpoint de récupération
- [ ] Vérifier le nombre d'audits récupérés
- [ ] Attendre 10 min (génération + envoi)
- [ ] Vérifier le gap avec `/api/admin/reconciliation-stats`
- [ ] Contacter les clients "noData" si besoin
- [ ] Vérifier dans dashboard admin que les 146 audits apparaissent

---

## 🎯 IMPACT

**Avant récupération:**
- 146 clients ont payé mais n'ont JAMAIS reçu leur rapport
- Perte de confiance, manque à gagner CTA premium
- Image ternie

**Après récupération:**
- ~100-140 clients vont recevoir leur rapport (enfin!)
- Récupération possible de CTA premium (Discovery → Anabolic/Ultimate)
- Image restaurée

**Chiffres clés:**
- 146 audits × 20% conversion premium = ~29 ventes potentielles récupérées
- 29 ventes × 59€ moyen = ~1,711€ de CA récupérable

---

**Status:** 🕐 EN ATTENTE DÉPLOIEMENT RENDER (3-5 min)
**Action:** Lancer l'endpoint dès que déployé

🔥 **ON VA LES RÉCUPÉRER BRO !**
