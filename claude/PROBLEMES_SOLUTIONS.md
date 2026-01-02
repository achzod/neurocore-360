# Problèmes Rencontrés et Solutions

## 🔴 Problème #1: OpenAI Empty Responses (NON RÉSOLU)

### Symptômes
- GPT-5.2-2025-12-11 renvoie des réponses vides très fréquemment
- Logs: `[OpenAI] Empty response (Section X) tentative Y/8`
- Génération très lente (15-20 min au lieu de 5 min)
- Plusieurs sections en mode dégradé

### Cause
- Rate limits TPM (tokens per minute) de l'API OpenAI
- Le modèle GPT-5.2 semble plus sensible que les anciens modèles
- Prompts trop longs qui consomment beaucoup de tokens

### Solutions tentées
1. ✅ Retry avec backoff exponentiel
2. ✅ Réduction adaptive de `max_completion_tokens`
3. ✅ Circuit breaker (pause 3 min si burst d'erreurs)
4. ✅ Mode dégradé avec texte fallback
5. ✅ Concurrence réduite à 2 sections parallèles

### Solutions à essayer
1. **Fallback vers gpt-4.1** - Plus stable, moins d'empty responses
2. **Simplifier les prompts** - Réduire la taille des instructions
3. **Batching** - Générer 2-3 sections par appel au lieu de 1
4. **Augmenter délai entre appels** - Stagger de 500ms → 2s

### Code concerné
- `server/openaiPremiumEngine.ts` → `callOpenAI()`
- Variable: `OPENAI_SECTION_CONCURRENCY`
- Variable: `MAX_RETRIES`

---

## ✅ Problème #2: Report marqué COMPLETED sans HTML (RÉSOLU)

### Symptômes
- Audit status = "COMPLETED"
- Mais `/export/html` retourne erreur ou vide

### Cause
`completeReportJob()` était appelé AVANT la génération HTML

### Solution
Déplacé `completeReportJob()` APRÈS:
1. Génération du HTML
2. Validation (>1000 chars)
3. Sauvegarde en DB

### Commit
`9b4913f0` - "fix: ensure reportHtml is saved BEFORE marking job as COMPLETED"

---

## ✅ Problème #3: Photos non analysées (RÉSOLU)

### Symptômes
- Rapport dit "tu n'as fourni aucune photo"
- Alors que 3 photos uploadées

### Cause
- Photos stockées dans `audit.responses.photoFront/photoSide/photoBack`
- Mais le code cherchait dans `audit.photos`

### Solution
- Fonction `extractPhotosFromAudit()` dans `routes.ts`
- Cherche dans tous les emplacements possibles
- Fail-fast si <3 photos pour PREMIUM/ELITE

---

## ✅ Problème #4: Build Render échoue (RÉSOLU)

### Symptômes
```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
```

### Cause
Rollup cherche un binaire natif Linux, mais pas installé par défaut

### Solution
Ajouté dans `package.json`:
```json
"optionalDependencies": {
  "@rollup/rollup-linux-x64-gnu": "^4.40.0"
}
```

---

## ✅ Problème #5: Erreurs TypeScript (RÉSOLU)

### Symptômes
```
tsc: error TS2304: Cannot find name 'X'
```

### Causes multiples
- Imports manquants
- Types incorrects
- Dossiers Replit inclus par erreur

### Solutions
- Corrigé tous les imports
- Ajouté types manquants dans `shared/schema.ts`
- Exclu dossiers Replit dans `tsconfig.json`

---

## ✅ Problème #6: Rate Limit 429 (PARTIELLEMENT RÉSOLU)

### Symptômes
```
429 Rate limit reached for gpt-5.2 on tokens per min (TPM)
```

### Solution
- Headers `x-ratelimit-reset-*` respectés
- Backoff exponentiel + jitter
- Concurrence limitée à 2

### Amélioration possible
- Utiliser un modèle avec limites plus hautes
- Demander augmentation de quota à OpenAI

---

## ✅ Problème #7: TOC tronquée (RÉSOLU)

### Symptômes
- Table des matières pas toujours visible
- Labels tronqués

### Solution
- CSS `position: fixed` pour TOC
- Fonction `truncateAtWord()` pour couper proprement

---

## ✅ Problème #8: Emojis dans le rapport (RÉSOLU)

### Symptômes
- Emojis 🎯📸 dans un rapport "premium clinique"

### Solution
Filtrage dans `exportService.ts`:
```typescript
l = l.replace(/[🟢🟡🔴🧬🛡️📸🎯🚀⭐✅❌⚠️🌙☀️📑]/g, '').trim();
```

---

## ✅ Problème #9: Thème sombre par défaut (RÉSOLU)

### Symptômes
- Rapport s'ouvre en thème sombre
- Difficile à lire

### Solution
- `data-theme="light"` par défaut dans le HTML
- Palette beige/crème/violet/noir alignée sur homepage

---

## 📋 Checklist Debug Rapide

Quand quelque chose ne marche pas:

1. **Le deploy est-il live?**
   ```typescript
   mcp_render_list_deploys({serviceId: "srv-d5b2vqmuk2gs73f1dke0", limit: 1})
   ```

2. **Le code est-il pushé?**
   ```bash
   git log -1  # Vérifie le dernier commit local
   # Compare avec commit.id dans le deploy Render
   ```

3. **Y a-t-il des erreurs dans les logs?**
   ```typescript
   mcp_render_list_logs({resource: ["srv-d5b2vqmuk2gs73f1dke0"], limit: 30, level: ["error"]})
   ```

4. **L'audit progresse-t-il?**
   ```bash
   curl -s "https://neurocore-360.onrender.com/api/audits/{ID}/narrative-status" | jq
   ```

5. **OpenAI répond-il?**
   Cherche dans les logs:
   - `[OpenAI] Section "X" terminee` → OK
   - `[OpenAI] Empty response` → Problème
   - `[OpenAI] 429` → Rate limit

