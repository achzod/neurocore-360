# PLAN ITÉRATION 1 - Jeu 29 jan 2026 14:08:36 +04

## OBJECTIF
Vérifier l'intégration complète des biomarqueurs MPMD et valider le dashboard Blood.

## PHASES

### Phase 1: VÉRIFICATION CODE
- ✅ Vérifier exports des 5 biomarqueurs MPMD dans bloodBiomarkerDetailsExtended.ts
- ✅ Vérifier 0 placeholders
- ✅ Vérifier citations MPMD (>30)
- ✅ Vérifier modal BiomarkerDetailModal.tsx utilise EXTENDED

### Phase 2: BUILD & COMPILATION
- 🔨 Lancer build TypeScript: `npx tsc --noEmit`
- 🔨 Vérifier 0 erreurs TypeScript
- 🔨 Si erreurs: identifier fichiers problématiques

### Phase 3: TESTS RUNTIME
- 🧪 Lancer serveur dev: `npm run dev`
- 🧪 Tester endpoint API: `/api/admin/blood-tests/seed`
- 🧪 Vérifier démarrage sans crash

### Phase 4: AUDIT DASHBOARD
- 📊 Analyser affichage modal biomarqueurs
- 📊 Vérifier que EXTENDED data s'affiche correctement
- 📊 Tester les 3 tabs (definition, impact, protocol)
- 📊 Vérifier suppléments avec dosages

### Phase 5: CORRECTIONS (si nécessaire)
- 🔧 Identifier problèmes bloquants
- 🔧 Écrire instructions claires pour Codex
- 🔧 Envoyer à Codex via terminal
- 🔧 Attendre corrections

### Phase 6: VALIDATION FINALE
- ✅ Re-test complet
- ✅ Vérifier que tous les problèmes sont résolus
- ✅ Marquer comme DONE ou RETRY

## CRITÈRES DE SUCCÈS

- [ ] 0 erreurs TypeScript
- [ ] Serveur démarre OK (ou DATABASE_URL seule erreur)
- [ ] Modal affiche biomarqueurs EXTENDED
- [ ] 5/5 biomarqueurs MPMD intégrés
- [ ] 0 placeholders
- [ ] Architecture production-ready

## SORTIE

- **SUCCESS**: Passer à surveillance continue
- **RETRY**: Itération suivante avec corrections
- **FAIL**: Arrêt après 10 itérations

