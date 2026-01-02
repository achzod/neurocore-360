# Quickstart - Reprendre le Projet

## 1. Contexte Rapide

NEUROCORE 360 = SaaS d'audits santé/fitness personnalisés par IA.
- Questionnaire → Photos → Paiement → Rapport HTML premium

**Problème actuel**: OpenAI GPT-5.2 renvoie des "empty responses" fréquentes, ralentissant la génération.

## 2. Commandes Essentielles

### Vérifier l'état du service
```typescript
mcp_render_list_deploys({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  limit: 1
})
// Vérifie que status = "live"
```

### Voir les logs
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 30,
  type: ["app"]
})
```

### Déployer du code
```bash
git add -A && git commit -m "message" && git push origin main
# Puis attendre que le deploy soit "live" avant de tester
```

### Lancer un test complet
```bash
cd /Users/achzod/Desktop/neurocore
RENDER_EXTERNAL_URL=https://neurocore-360.onrender.com npx tsx test-workflow-gpt-complet.ts
```

### Vérifier un audit
```bash
curl -s "https://neurocore-360.onrender.com/api/audits/{ID}/narrative-status" | jq
```

## 3. Fichiers à Connaître

| Fichier | Quand le modifier |
|---------|-------------------|
| `server/openaiPremiumEngine.ts` | Problèmes OpenAI, retry logic |
| `server/reportJobManager.ts` | Flow de génération, photos |
| `server/exportService.ts` | Style HTML, contenu rapport |
| `server/routes.ts` | Endpoints API |

## 4. Problème #1 à Résoudre

**Empty responses OpenAI**

Fichier: `server/openaiPremiumEngine.ts`

Options:
1. Ajouter fallback vers `gpt-4.1` (plus stable)
2. Réduire `max_completion_tokens` encore plus
3. Augmenter délai entre appels
4. Simplifier les prompts

## 5. Règles d'Or

1. **JAMAIS tester avant que le deploy soit "live"**
2. **TOUJOURS vérifier les logs Render après un test**
3. **Le code est correct, c'est OpenAI qui rate limit**
4. **Commit messages clairs pour traçabilité**

## 6. URLs Importantes

- Production: https://neurocore-360.onrender.com
- GitHub: https://github.com/achzod/neurocore-360
- Render Dashboard: https://dashboard.render.com

## 7. Audit de Test en Cours

ID: `f61ea12a-7dc9-46c1-9d84-561640cbf6b8`

Vérifie son statut:
```bash
curl -s "https://neurocore-360.onrender.com/api/audits/f61ea12a-7dc9-46c1-9d84-561640cbf6b8/narrative-status" | jq
```

## 8. Si Tout Semble Bloqué

1. Vérifie les logs Render pour des erreurs
2. Vérifie que le dernier commit est bien déployé
3. Si besoin: Clear cache + Deploy manuel sur Render dashboard
4. Redémarre le test

## 9. Documentation Complète

Lis dans cet ordre:
1. `PROJET.md` - Vue d'ensemble
2. `FICHIERS_CLES.md` - Détails techniques
3. `PROBLEMES_SOLUTIONS.md` - Historique des bugs
4. `EXIGENCES_CLIENT.md` - Ce que le client veut
5. `MCP_RENDER.md` - Guide des commandes Render

