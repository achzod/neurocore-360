# INSTRUCTIONS CODEX - ITÉRATION 3

**Date**: Jeu 29 jan 2026 16:49:21 +04

## PROBLÈMES DÉTECTÉS

### Erreurs TypeScript

**Fichiers concernés**:
- server/blood-analysis/routes.ts:46
- server/blood-tests/routes.ts:5

**Erreur**: Module 'pdf-parse/lib/pdf-parse.js' sans types

**SOLUTION RAPIDE**:
```bash
npm i --save-dev @types/pdf-parse
```

OU créer `server/types/pdf-parse.d.ts`:
```typescript
declare module 'pdf-parse/lib/pdf-parse.js';
```

**ACTION**: Applique UNE des 2 solutions maintenant.


## VALIDATION

Après corrections:
1. npx tsc --noEmit → 0 erreurs
2. Vérifier exports ≥8
3. Vérifier 0 placeholders

**Reporte DONE quand terminé.**
