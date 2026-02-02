# INSTRUCTIONS - Ce que tu dois dire à Codex

**Date**: $(date)

---

## 🎯 OBJECTIF

Corriger les 2 erreurs TypeScript restantes pour avoir un build 100% propre.

---

## 📋 STATUT ACTUEL

✅ **Ce qui fonctionne**:
- 5/5 biomarqueurs MPMD intégrés
- 9 exports dans bloodBiomarkerDetailsExtended.ts
- 0 placeholders
- 36 citations MPMD/Derek/Masterjohn/Huberman
- Modal affiche correctement les EXTENDED
- Architecture production-ready

❌ **Ce qui reste**:
- 2 erreurs TypeScript dans le serveur (pdf-parse)

---

## 💬 CE QUE TU DOIS DIRE À CODEX (copie-colle)

```
Codex, il reste 2 erreurs TypeScript à corriger:

1. server/blood-analysis/routes.ts:46
2. server/blood-tests/routes.ts:5

Erreur: Could not find a declaration file for module 'pdf-parse/lib/pdf-parse.js'

Solution la plus rapide:

Crée le fichier server/types/pdf-parse.d.ts avec:

declare module 'pdf-parse/lib/pdf-parse.js';

Fais-le maintenant. Je surveille avec un script qui teste en temps réel.
```

---

## 🔍 CE QUE JE FAIS PENDANT CE TEMPS

J'ai lancé un **script de surveillance** (PID: 90529) qui:

1. ✅ Détecte chaque fichier que Codex modifie en temps réel
2. ✅ Lance `npx tsc --noEmit` toutes les 30 secondes
3. ✅ T'affiche les résultats dans les logs
4. ✅ S'arrête automatiquement quand 0 erreurs détectées

**Logs en temps réel**:
```bash
tail -f /tmp/watch_codex.log
```

---

## 📊 RÉSULTAT ATTENDU

Après que Codex crée `server/types/pdf-parse.d.ts`:

1. Le watcher va détecter le nouveau fichier
2. Le watcher va lancer `npx tsc --noEmit`
3. Si 0 erreurs: ✅ SUCCÈS - Le watcher s'arrête
4. Si encore erreurs: ❌ Je te dirai quoi dire ensuite

**Temps estimé**: 2-3 minutes

---

## 🚨 SI CODEX NE RÉPOND PAS OU SE TROMPE

Dis-moi et je corrige directement (5 minutes).

---

## ✅ QUAND C'EST FINI

Le watcher affichera:
```
🎉 ✅ SUCCÈS! 0 erreurs TypeScript détectées!
```

Et je te ferai un rapport final complet.

---

**GO - Parle à Codex maintenant!**
