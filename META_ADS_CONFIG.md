# Configuration Meta Ads API - APEXLABS

**Date de création:** 21 mars 2026
**Dernière mise à jour:** 21 mars 2026

---

## 🔑 Identifiants Meta

### Application Meta (AchZod CAPI)
- **App ID:** 785203317993340
- **App Name:** AchZod CAPI

### Business Manager (AchZod)
- **Business ID:** 154360125427333
- **Business Name:** AchZod

### Ad Account
- **Ad Account ID:** 2332690313646248
- **Ad Account ID (avec préfixe):** `act_2332690313646248`

---

## 🎫 Access Token

### Token Longue Durée (60 jours)
```
EAALKI2TYb3wBRDZA8sExjZA1VlPUZCFjzhTZBZCcQZCafY5hgDfholbyFsteb1ulf7wEs7klaf2QkrdF6guCrnv1GGMdZAoj4FCmojnteyfDvyeVIECtxfyUMYXRgkoHDLc3cTqdC5nCCJQWm7ZBNPaCMXo6k9ufX8ZBcPD4PZCjTs4ufdYnE9rkbu8gZCr3QZDZD
```

**Expiration:** 20 mai 2026
**Permissions:** `ads_management`, `ads_read`, `business_management`, `public_profile`

### ⚠️ Important : Renouveler le token
Le token expire le **20 mai 2026**. Pour le renouveler :

1. Aller sur https://developers.facebook.com/tools/explorer/
2. Sélectionner l'app **AchZod CAPI**
3. Cocher les permissions : `ads_management`, `ads_read`, `business_management`
4. Cliquer sur **Generate Access Token**
5. Aller sur https://developers.facebook.com/tools/debug/accesstoken/
6. Coller le token et cliquer sur **Extend Access Token**
7. Mettre à jour la variable `META_ACCESS_TOKEN` sur Render

---

## 🔧 Variables d'environnement Render

### Production (render.com)
```bash
META_ACCESS_TOKEN=EAALKI2TYb3wBRDZA8sExjZA1VlPUZCFjzhTZBZCcQZCafY5hgDfholbyFsteb1ulf7wEs7klaf2QkrdF6guCrnv1GGMdZAoj4FCmojnteyfDvyeVIECtxfyUMYXRgkoHDLc3cTqdC5nCCJQWm7ZBNPaCMXo6k9ufX8ZBcPD4PZCjTs4ufdYnE9rkbu8gZCr3QZDZD
META_AD_ACCOUNT_ID=act_2332690313646248
```

---

## 📊 Utilisation dans le code

### Endpoint API
**Route:** `/conversions?key=ADMIN_SECRET`

**Fichier:** `server/conversionTracker.ts`

**Fonction:** `fetchMetaAdsConversions()`

**API appelée:**
```
GET https://graph.facebook.com/v18.0/act_{ad_account_id}/insights
```

**Paramètres:**
- `access_token`: META_ACCESS_TOKEN
- `fields`: spend,impressions,clicks,ctr,cpc,actions,action_values
- `time_range`: last_24h / last_7d / last_30d
- `level`: account

---

## 🧪 Test du token

Pour tester si le token fonctionne :

```bash
curl "https://graph.facebook.com/v18.0/act_2332690313646248/insights?access_token=EAALKI2TYb3wBRDZA8sExjZA1VlPUZCFjzhTZBZCcQZCafY5hgDfholbyFsteb1ulf7wEs7klaf2QkrdF6guCrnv1GGMdZAoj4FCmojnteyfDvyeVIECtxfyUMYXRgkoHDLc3cTqdC5nCCJQWm7ZBNPaCMXo6k9ufX8ZBcPD4PZCjTs4ufdYnE9rkbu8gZCr3QZDZD&fields=spend,impressions,clicks&time_range={since:'2026-03-20',until:'2026-03-21'}&level=account"
```

---

## 📱 Liens utiles

- **Graph API Explorer:** https://developers.facebook.com/tools/explorer/
- **Access Token Debugger:** https://developers.facebook.com/tools/debug/accesstoken/
- **Meta Business Suite:** https://business.facebook.com/
- **Ads Manager:** https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=2332690313646248
- **Documentation Meta Marketing API:** https://developers.facebook.com/docs/marketing-apis

---

## 🚨 Troubleshooting

### Erreur: "Invalid OAuth access token"
- Le token a expiré → Renouveler (voir section ci-dessus)
- Permissions manquantes → Vérifier dans Access Token Debugger

### Erreur: "Unsupported get request"
- Vérifier que `META_AD_ACCOUNT_ID` a bien le préfixe `act_`

### Dashboard affiche 0
- Vérifier les variables d'environnement sur Render
- Vérifier que le compte publicitaire a bien des données
- Tester le token avec curl (voir section Test)

---

**Maintenu par:** Claude Code
**Contact:** achkou@gmail.com
