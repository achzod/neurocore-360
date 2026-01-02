# État Actuel du Projet - 2 Janvier 2026

## 🔴 Problème en Cours

### Génération de rapport bloquée par "empty responses" OpenAI

**Audit de test actuel**: `f61ea12a-7dc9-46c1-9d84-561640cbf6b8`

**Symptômes**:
- GPT-5.2-2025-12-11 renvoie des réponses vides très fréquemment
- Plusieurs sections passent en "mode dégradé" (contenu minimal)
- La génération est très lente (bloquée autour de 25-30%)

**Logs typiques**:
```
[OpenAI] Empty response (Analyse visuelle et posturale complete) (streak 3) tentative 3/8 cap=722
[OpenAI] Empty response (Analyse visuelle et posturale complete): fallback en mode degrade
[OpenAI] Burst de réponses vides: réduction concurrence à 2 pendant 3 minutes
```

## ✅ Corrections Récentes Appliquées

### 1. Séquencement Report Job (commit 9b4913f0)
- `completeReportJob()` est maintenant appelé APRÈS la génération HTML
- Validation que le HTML fait >1000 caractères
- Logging détaillé du flow

### 2. Endpoint export/html amélioré
- Utilise `audit.reportHtml` en priorité
- Fallback sur `narrativeReport.html`
- Génération à la volée en dernier recours

### 3. Photos obligatoires
- Fail-fast si <3 photos pour PREMIUM/ELITE
- Status `NEED_PHOTOS` retourné

## 📊 Statut des Fonctionnalités

| Fonctionnalité | Status | Notes |
|----------------|--------|-------|
| Questionnaire | ✅ OK | Multi-étapes, validation |
| Upload photos | ✅ OK | 3 photos obligatoires |
| Paiement Stripe | ✅ OK | Webhooks configurés |
| Analyse photos | ⚠️ Partiel | Fonctionne mais rate limits |
| Génération TXT | ⚠️ Lent | Empty responses fréquentes |
| Conversion HTML | ✅ OK | Si TXT généré |
| Export HTML | ✅ OK | Endpoint fonctionnel |
| Email rapport | ✅ OK | Via Resend |
| TOC interactive | ✅ OK | Toujours visible |
| Thème light | ✅ OK | Par défaut |
| Radar Profil 360 | ✅ OK | Labels non tronqués |

## 🎯 Prochaines Actions Prioritaires

### P0 - Critique
1. **Résoudre les empty responses OpenAI**
   - Options:
     - Réduire encore `max_completion_tokens` (actuellement 750-1000)
     - Passer à un modèle plus stable (gpt-4.1 en fallback)
     - Simplifier les prompts
     - Augmenter le délai entre les appels

2. **Vérifier que le rapport HTML est bien généré et stocké**
   - Surveiller l'audit `f61ea12a-7dc9-46c1-9d84-561640cbf6b8`
   - Si COMPLETED, vérifier que `/export/html` renvoie du contenu

### P1 - Important
3. **Améliorer la robustesse du mode dégradé**
   - Le texte dégradé actuel est trop générique
   - Personnaliser avec les données client disponibles

4. **Réduire le temps de génération**
   - Actuellement ~15-20 min avec tous les retries
   - Cible: <5 min

## 🔧 Commandes Utiles

### Vérifier statut audit en cours
```bash
curl -s "https://neurocore-360.onrender.com/api/audits/f61ea12a-7dc9-46c1-9d84-561640cbf6b8/narrative-status" | jq
```

### Voir les logs récents
```typescript
mcp_render_list_logs({
  resource: ["srv-d5b2vqmuk2gs73f1dke0"],
  limit: 30,
  type: ["app"]
})
```

### Relancer un test complet
```bash
cd /Users/achzod/Desktop/neurocore
RENDER_EXTERNAL_URL=https://neurocore-360.onrender.com npx tsx test-workflow-gpt-complet.ts
```

## 📝 Notes pour le Prochain Agent

1. **Ne lance JAMAIS de test avant que le deploy soit "live"**
2. **Vérifie toujours les logs Render après un test**
3. **Les "empty responses" sont le problème #1 à résoudre**
4. **Le code est correct, c'est OpenAI qui rate limit**

### Pistes d'amélioration pour les empty responses:
- Utiliser `gpt-4.1` comme fallback (plus stable)
- Réduire la taille des prompts (actuellement très longs)
- Implémenter un vrai circuit breaker avec pause globale
- Considérer batching de sections (6 appels au lieu de 12)

