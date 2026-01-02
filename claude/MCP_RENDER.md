# Guide MCP Render

## Configuration

Tu as accès au MCP Server Render qui permet de gérer les déploiements et voir les logs.

**Service ID**: `srv-d5b2vqmuk2gs73f1dke0`
**Service Name**: `neurocore-360`
**URL**: https://neurocore-360.onrender.com

## Commandes MCP Disponibles

### Lister les services
```typescript
mcp_render_list_services()
```

### Voir les déploiements récents
```typescript
mcp_render_list_deploys({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  limit: 5
})
```

**Réponse importante**: Vérifie le champ `status`:
- `build_in_progress` → En cours de build
- `live` → Déployé et actif ✅
- `build_failed` → Échec du build ❌

### Détails d'un déploiement spécifique
```typescript
mcp_render_get_deploy({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  deployId: "dep-xxxxx"
})
```

### Voir les logs applicatifs (CRUCIAL)
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 50,
  type: ["app"]  // "app" pour logs applicatifs, "build" pour logs de build
})
```

**Filtres utiles**:
- `level: ["error"]` - Seulement les erreurs
- `text: ["OpenAI"]` - Filtrer par texte

### Voir les métriques
```typescript
mcp_render_get_metrics({
  resourceId: "srv-d5b2vqmuk2gs73f1dke0",
  metricTypes: ["cpu_usage", "memory_usage"]
})
```

## Workflow de Déploiement

### 1. Après modification du code
```bash
git add -A
git commit -m "description"
git push origin main
```

### 2. Vérifier que le deploy démarre
```typescript
mcp_render_list_deploys({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  limit: 1
})
```
→ Devrait montrer un nouveau deploy avec `status: "build_in_progress"`

### 3. Attendre que le deploy soit live
```typescript
// Attendre ~1-2 minutes puis:
mcp_render_get_deploy({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  deployId: "dep-xxxxx"  // L'ID du deploy en cours
})
```
→ Attendre `status: "live"`

### 4. Lancer les tests SEULEMENT quand c'est live
```bash
RENDER_EXTERNAL_URL=https://neurocore-360.onrender.com npx tsx test-workflow-gpt-complet.ts
```

## Patterns de Debug

### Le code ne semble pas à jour
1. Vérifie que tu as `git push`
2. Vérifie le commit ID dans le deploy:
```typescript
mcp_render_list_deploys({serviceId: "srv-d5b2vqmuk2gs73f1dke0", limit: 1})
// Regarde commit.id et commit.message
```
3. Si besoin, Clear cache + Deploy manuel sur https://dashboard.render.com

### Erreurs OpenAI dans les logs
Cherche ces patterns:
- `[OpenAI] Empty response` → Rate limit ou problème modèle
- `[OpenAI] 429` → Rate limit TPM
- `[OpenAI] Erreur` → Erreur générique

### Voir si la génération progresse
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 20,
  type: ["app"],
  text: ["Section"]  // Voir les sections générées
})
```

### Voir les erreurs seulement
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 30,
  level: ["error"]
})
```

## Commandes NON disponibles via MCP

Ces actions doivent être faites via le dashboard Render:
- Clear build cache
- Restart service
- Modifier variables d'environnement
- Supprimer un service

Dashboard: https://dashboard.render.com

## Exemple de Session Complète

```typescript
// 1. Vérifier l'état actuel
const deploys = await mcp_render_list_deploys({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  limit: 1
});
console.log(deploys[0].status); // "live" ?

// 2. Après un git push, attendre le nouveau deploy
// ... attendre 60s ...

// 3. Vérifier que le nouveau deploy est live
const newDeploy = await mcp_render_get_deploy({
  serviceId: "srv-d5b2vqmuk2gs73f1dke0",
  deployId: deploys[0].id
});
if (newDeploy.status !== "live") {
  // Attendre encore
}

// 4. Lancer le test
// run_terminal_cmd: RENDER_EXTERNAL_URL=... npx tsx test-workflow-gpt-complet.ts

// 5. Surveiller les logs pendant le test
const logs = await mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 30,
  type: ["app"]
});
// Analyser les logs pour détecter les problèmes
```

