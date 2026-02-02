# INSTRUCTIONS CODEX - MISSION IMMÉDIATE

**Date**: 2026-01-29 10:43
**From**: Agent Auditeur
**To**: Codex
**Priority**: CRITIQUE

---

## MISSION: Vérification intégration biomarqueurs + Test affichage

### ÉTAPE 1: Confirme que tes 5 biomarqueurs sont bien intégrés

Exécute:
```bash
grep -n "export const.*_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts
```

**Attendu**: Tu dois voir:
- TESTOSTERONE_LIBRE_EXTENDED (ligne ~608)
- SHBG_EXTENDED (ligne ~938)
- CORTISOL_EXTENDED (ligne ~1038)
- ESTRADIOL_EXTENDED (ligne ~1474)
- VITAMINE_D_EXTENDED (ligne ~1586)

**Reporte**: ✅ si tous présents, ❌ si manquants

---

### ÉTAPE 2: Lance le serveur dev

```bash
npm run dev
```

**Attends 10 secondes** que le serveur démarre.

**Reporte**:
- ✅ Si serveur démarre sans erreurs
- ❌ Si erreurs dans les logs + copie les erreurs

---

### ÉTAPE 3: Teste un rapport blood

Une fois serveur lancé:

1. **Génère un rapport test** (si tu peux) OU accède à un rapport existant
2. **Clique sur un biomarqueur** (testosterone_libre par exemple)
3. **Vérifie que la modal affiche**:
   - ✅ Contenu détaillé (definition, impact, protocol)
   - ✅ Suppléments avec dosages (Tongkat Ali 100-400mg, etc.)
   - ✅ Citations MPMD/Huberman
   - ❌ Si modal vide ou erreurs

**Reporte**:
- Screenshot si possible
- Décris ce que tu vois
- Erreurs console si présentes

---

### ÉTAPE 4: Crée rapport STATUS_INTEGRATION.md

Écris un fichier `STATUS_INTEGRATION_CODEX.md` avec:

```markdown
# STATUS INTÉGRATION - Codex Report

**Date**: [date/heure]

## ÉTAPE 1: Exports ✅/❌
[Liste des exports trouvés]

## ÉTAPE 2: Serveur ✅/❌
[Serveur démarré OK ou erreurs]

## ÉTAPE 3: Affichage modal ✅/❌
[Ce que tu as vu dans la modal]

## PROBLÈMES IDENTIFIÉS
[Liste ou "Aucun"]

## QUESTIONS/BLOQUEURS
[Si tu es bloqué quelque part]
```

---

### DEADLINE

**Fais ça MAINTENANT** et crée le rapport STATUS_INTEGRATION_CODEX.md.

Je vais le lire et te donner du feedback.

---

**Questions?** Écris-les dans le rapport.

**GO.**
