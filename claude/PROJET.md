# NEUROCORE 360 - Documentation Projet

## 🎯 Objectif du Projet

NEUROCORE 360 est une plateforme SaaS de génération d'audits santé/fitness personnalisés utilisant l'IA (GPT-5.2-2025-12-11).

### Flux Principal
1. L'utilisateur remplit un questionnaire détaillé (200+ questions)
2. Upload 3 photos obligatoires (face, profil, dos) pour les audits PREMIUM/ELITE
3. Paiement Stripe
4. L'IA génère un rapport personnalisé en TXT puis converti en HTML premium
5. Le rapport est envoyé par email et téléchargeable

### Tiers d'Audit
- **FREE** : Analyse basique sans photos
- **PREMIUM** : Analyse complète avec photos (79€)
- **ELITE** : Premium + coaching (149€)

## 🏗️ Architecture Technique

### Stack
- **Frontend**: React + Vite + Wouter + Framer Motion + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **AI**: OpenAI GPT-5.2-2025-12-11 (API Responses)
- **Paiement**: Stripe
- **Déploiement**: Render.com (auto-deploy depuis GitHub)

### URLs
- **Production**: https://neurocore-360.onrender.com
- **GitHub**: https://github.com/achzod/neurocore-360
- **Render Service ID**: `srv-d5b2vqmuk2gs73f1dke0`

## 📁 Structure des Fichiers Clés

### Backend (`/server`)

| Fichier | Rôle |
|---------|------|
| `routes.ts` | Tous les endpoints API (audits, export, paiement, admin) |
| `reportJobManager.ts` | Orchestration de la génération asynchrone des rapports |
| `openaiPremiumEngine.ts` | Appels OpenAI GPT-5.2, retry logic, génération par sections |
| `exportService.ts` | Conversion TXT → HTML premium (SVG charts, CSS, TOC) |
| `photoAnalysisAI.ts` | Analyse des photos corporelles via vision AI |
| `supplementEngine.ts` | Moteur de recommandation de compléments |
| `storage.ts` | Abstraction DB (PostgreSQL via Drizzle) |
| `stripeClient.ts` | Intégration paiement Stripe |
| `emailService.ts` | Envoi d'emails (rapport, notifications) |
| `analysisEngine.ts` | Calcul des scores depuis les réponses questionnaire |

### Frontend (`/client/src`)

| Fichier | Rôle |
|---------|------|
| `pages/Landing.tsx` | Page d'accueil avec pricing |
| `pages/Questionnaire.tsx` | Formulaire questionnaire multi-étapes |
| `pages/Checkout.tsx` | Page de paiement Stripe |
| `pages/Results.tsx` | Affichage du rapport généré |
| `pages/Admin.tsx` | Dashboard admin |

### Shared (`/shared`)

| Fichier | Rôle |
|---------|------|
| `schema.ts` | Types TypeScript + Zod schemas partagés |

### Config

| Fichier | Rôle |
|---------|------|
| `package.json` | Dépendances (attention: `@rollup/rollup-linux-x64-gnu` en optionalDependencies) |
| `tsconfig.json` | Config TypeScript (exclude Replit folders) |
| `drizzle.config.ts` | Config Drizzle ORM |

## 🔧 APIs et MCP

### Render MCP Server
Tu as accès au MCP Render pour:
- `mcp_render_list_services` - Lister les services
- `mcp_render_list_deploys` - Voir les déploiements
- `mcp_render_get_deploy` - Statut d'un deploy
- `mcp_render_list_logs` - Logs applicatifs (CRUCIAL pour debug)
- `mcp_render_get_service` - Détails service

**Service ID**: `srv-d5b2vqmuk2gs73f1dke0`

### Endpoints API Principaux

```
POST /api/audits                    # Créer un audit
GET  /api/audits/:id                # Récupérer un audit
GET  /api/audits/:id/narrative-status  # Statut génération (polling)
GET  /api/audits/:id/export/html    # Télécharger HTML
POST /api/create-checkout-session   # Paiement Stripe
GET  /api/admin/init-db             # Reset DB (dev only)
```

### Variables d'Environnement (Render)
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://...
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
```

## ⚠️ Problèmes Connus et Solutions

### 1. OpenAI "Empty Responses" (CRITIQUE)
**Symptôme**: GPT-5.2 renvoie des réponses vides fréquemment
**Cause**: Rate limits TPM (tokens per minute) + comportement du modèle
**Solution actuelle**:
- Retry avec backoff exponentiel (3 tentatives)
- Réduction adaptive de `max_completion_tokens`
- Fallback en "mode dégradé" avec texte minimal
- Circuit breaker si trop d'erreurs

**Code**: `server/openaiPremiumEngine.ts` → `callOpenAI()`

### 2. Séquencement Report Job
**Symptôme**: Audit marqué COMPLETED mais pas de HTML
**Cause**: `completeReportJob()` appelé AVANT génération HTML
**Fix appliqué**: Déplacer l'appel APRÈS sauvegarde du HTML

**Code**: `server/reportJobManager.ts` lignes 294-340

### 3. Photos Non Analysées
**Symptôme**: Rapport dit "pas de photos" alors qu'elles sont uploadées
**Cause**: Photos stockées dans `audit.responses` mais pas récupérées
**Fix appliqué**: 
- Fonction `extractPhotosFromAudit()` dans `routes.ts`
- Fail-fast si <3 photos pour PREMIUM/ELITE

### 4. Build Render Échoue
**Symptôme**: `Cannot find module @rollup/rollup-linux-x64-gnu`
**Fix**: Ajouté en `optionalDependencies` dans `package.json`

### 5. Rate Limits 429
**Symptôme**: Erreurs 429 fréquentes
**Solution**:
- Concurrence limitée à 2-3 sections parallèles
- Respect des headers `x-ratelimit-reset-*`
- Backoff + jitter

## 🧪 Comment Tester

### Script de Test Complet
```bash
cd /Users/achzod/Desktop/neurocore
RENDER_EXTERNAL_URL=https://neurocore-360.onrender.com npx tsx test-workflow-gpt-complet.ts
```

Ce script:
1. Crée un audit avec 3 photos homme
2. Poll le statut jusqu'à COMPLETED
3. Télécharge le HTML
4. Vérifie la qualité du rapport

### Vérifier Manuellement un Audit
```bash
# Statut
curl -s "https://neurocore-360.onrender.com/api/audits/{AUDIT_ID}/narrative-status" | jq

# Télécharger HTML
curl -s "https://neurocore-360.onrender.com/api/audits/{AUDIT_ID}/export/html" > rapport.html
```

## 📋 Checklist Qualité Rapport HTML

Le rapport doit avoir:
- [ ] TOC (Table des matières) toujours visible à gauche, animée
- [ ] Thème light par défaut (beige/crème/violet/noir)
- [ ] Prénom + email dans le header
- [ ] Pas d'emojis ni ASCII art
- [ ] Pas de "Info à clarifier" visible
- [ ] Radar "Profil 360" (pas "Profil Métabolique")
- [ ] Labels non tronqués
- [ ] CTA coaching avec cartes + boutons + garanties
- [ ] Règles nutrition (pas glucides 4h post-réveil si pas d'abdos, jeûne 16/8 si surpoids)
- [ ] "À confirmer avec kiné/ostéo" pour posture (pas "tests vidéo")
- [ ] Analyse photo réellement basée sur les photos uploadées

## 🚀 Workflow de Déploiement

1. Faire les modifications code
2. `git add -A && git commit -m "message"`
3. `git push origin main`
4. Render auto-deploy (ou Clear cache + Deploy manuel si besoin)
5. Vérifier avec `mcp_render_get_deploy` que status = "live"
6. Lancer le test

## 🔍 Debug Tips

### Voir les logs Render en temps réel
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 50,
  type: ["app"]
})
```

### Vérifier si le deploy est live
```typescript
mcp_render_list_deploys({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  limit: 3
})
```

### Problème fréquent: code pas déployé
Si tes changements ne sont pas pris en compte:
1. Vérifie que tu as `git push`
2. Vérifie que le deploy est "live" (pas "build_in_progress")
3. Si besoin, Clear cache + Deploy manuel sur Render dashboard

## 📞 Contact

- Email utilisateur test: achkou@gmail.com
- Email admin: achzodyt@gmail.com

