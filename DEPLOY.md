# 🚀 DÉPLOIEMENT NEUROCORE 360 SUR RENDER

## ✅ Corrections appliquées
- `server/exportService.ts` : Design Dark Mode + CSS Homepage
- `server/formatDashboard.ts` : Parser robuste (18 sections, pas de doublons)

## 📦 Déploiement sur Render

### Option A : Via GitHub (recommandé)

1. **Crée un nouveau repo GitHub** (si pas déjà fait) :
   ```bash
   cd /Users/achzod/Desktop/neurocore/neurocore-prod
   git add .
   git commit -m "Initial commit - Neurocore 360 from Replit"
   git remote add origin https://github.com/TON_USERNAME/neurocore-360.git
   git push -u origin main
   ```

2. **Sur Render** (https://render.com) :
   - New > Web Service
   - Connect ton repo GitHub
   - Nom : `neurocore-360`
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`
   - Instance Type : Starter (gratuit) ou Pro

3. **Variables d'environnement** (dans Render Dashboard) :
   ```
   DATABASE_URL=postgresql://...  (copie depuis Replit)
   GEMINI_API_KEY=(optionnel, seulement si tu utilises Gemini)
   GEMINI_MODEL=(optionnel)
   SESSION_SECRET=(auto-généré)
   SMTP_HOST=smtp-pulse.com
   SMTP_PORT=587
   SMTP_FROM_EMAIL=coaching@achzodcoaching.com
   SMTP_USER=(ton email SendPulse)
   SMTP_PASS=(ton pass SendPulse)
   ```

4. **Deploy** : Render va auto-déployer à chaque push GitHub

### Option B : Déploiement manuel

Si tu veux pas GitHub, tu peux :
1. Zipper ce dossier
2. Upload sur Render via leur interface
3. Configurer les env vars manuellement

## 🗄️ Base de données

Tu as 2 options :

### Option 1 : Garder Replit Postgres (simple)
- Dans Render, mets `DATABASE_URL` avec l'URL de Replit
- Inconvénient : dépend de Replit

### Option 2 : Créer une DB sur Render (propre)
- Dans Render : New > PostgreSQL
- Copie la `DATABASE_URL` générée
- Lance les migrations : `npm run db:push`

## 🔍 Test du déploiement

Une fois déployé :
1. Va sur ton URL Render (ex: https://neurocore-360.onrender.com)
2. Teste l'upload de photos
3. Vérifie la génération du rapport HTML (design dark mode)

## ⚠️ Important

- Ne commit jamais de clés API (Gemini, OpenAI, etc.). Configure-les uniquement dans les env vars Render si tu en as besoin.
- Si tu utilises Gemini: choisis un modèle adapté au budget.
- Le premier build prend ~5-10 minutes

## 🆘 En cas de problème

1. Check les logs Render : Dashboard > Logs
2. Vérifie que toutes les env vars sont set
3. Ping-moi si ça marche pas
