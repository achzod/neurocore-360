#!/bin/bash

# ============================================================================
# CODEX DAEMON V2 - Version corrigée avec boucle fonctionnelle
# ============================================================================

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

CODEX_TTY="/dev/ttys006"
CODEX_PID="15856"
WORK_DIR="/Users/achzod/Desktop/neurocore/neurocore-github"
LOG_DIR="$WORK_DIR/logs"
PLAN_DIR="$WORK_DIR/plans"
AUDIT_DIR="$WORK_DIR/audits"

DAEMON_LOG="$LOG_DIR/daemon_v2.log"
TEST_LOG="$LOG_DIR/tests_v2.log"

ITERATION=0
MAX_ITERATIONS=10

# ============================================================================
# INIT
# ============================================================================

mkdir -p "$LOG_DIR" "$PLAN_DIR" "$AUDIT_DIR"

log_msg() {
    echo "[$(date +%H:%M:%S)] $1" | tee -a "$DAEMON_LOG"
}

send_to_codex() {
    echo "$1" > "$CODEX_TTY"
    log_msg "📤 ENVOYÉ À CODEX: $1"
    sleep 2
}

log_msg "============================================================================"
log_msg "CODEX DAEMON V2 - DÉMARRAGE"
log_msg "============================================================================"
log_msg "Max itérations: $MAX_ITERATIONS"
log_msg "Codex PID: $CODEX_PID"
log_msg ""

# Vérifier Codex vivant
if ! ps -p "$CODEX_PID" > /dev/null 2>&1; then
    log_msg "❌ ERREUR: Codex PID $CODEX_PID non actif!"
    exit 1
fi

log_msg "✅ Codex actif"

# ============================================================================
# BOUCLE PRINCIPALE
# ============================================================================

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))

    log_msg ""
    log_msg "============================================================================"
    log_msg "ITÉRATION $ITERATION/$MAX_ITERATIONS"
    log_msg "============================================================================"

    # ========================================================================
    # PHASE 1: PLAN
    # ========================================================================

    log_msg ""
    log_msg "📝 PHASE 1: PLANIFICATION"

    PLAN_FILE="$PLAN_DIR/plan_v2_iteration_${ITERATION}.md"

    cat > "$PLAN_FILE" <<EOF
# PLAN ITÉRATION $ITERATION - $(date)

## OBJECTIF
Valider intégration biomarqueurs MPMD et corriger erreurs TypeScript

## PHASES
1. Vérifier code (exports, placeholders, citations, modal)
2. Build TypeScript (npx tsc --noEmit)
3. Auditer dashboard (5 biomarqueurs MPMD)
4. Si erreurs: envoyer instructions à Codex
5. Attendre corrections
6. Re-tester

## CRITÈRES SUCCÈS
- 0 erreurs TypeScript
- 5/5 biomarqueurs MPMD intégrés
- Modal affiche EXTENDED

EOF

    log_msg "✅ Plan créé: $PLAN_FILE"

    # ========================================================================
    # PHASE 2: VÉRIFICATION CODE
    # ========================================================================

    log_msg ""
    log_msg "🔍 PHASE 2: VÉRIFICATION CODE"

    cd "$WORK_DIR"

    CODE_ERRORS=0

    # Vérif exports
    EXPORTS=$(grep -c "export const.*_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null || echo "0")
    if [ "$EXPORTS" -ge 8 ]; then
        log_msg "✅ Exports: $EXPORTS trouvés"
    else
        log_msg "❌ Exports: seulement $EXPORTS (attendu ≥8)"
        CODE_ERRORS=$((CODE_ERRORS + 1))
    fi

    # Vérif placeholders
    PLACEHOLDERS=$(grep -i "je ne sais pas\|todo\|tbd" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PLACEHOLDERS" -eq 0 ]; then
        log_msg "✅ Placeholders: 0"
    else
        log_msg "❌ Placeholders: $PLACEHOLDERS trouvés"
        CODE_ERRORS=$((CODE_ERRORS + 1))
    fi

    # Vérif citations
    CITATIONS=$(grep -i "derek\|mpmd\|masterjohn\|huberman" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CITATIONS" -ge 30 ]; then
        log_msg "✅ Citations: $CITATIONS trouvées"
    else
        log_msg "⚠️ Citations: $CITATIONS (attendu ≥30)"
    fi

    # Vérif modal
    if grep -q "BIOMARKER_DETAILS_EXTENDED" client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx 2>/dev/null; then
        log_msg "✅ Modal utilise EXTENDED"
    else
        log_msg "❌ Modal n'utilise pas EXTENDED"
        CODE_ERRORS=$((CODE_ERRORS + 1))
    fi

    if [ $CODE_ERRORS -gt 0 ]; then
        log_msg "❌ Code: $CODE_ERRORS erreurs trouvées"
    else
        log_msg "✅ Code: vérification passée"
    fi

    # ========================================================================
    # PHASE 3: BUILD TYPESCRIPT
    # ========================================================================

    log_msg ""
    log_msg "🔨 PHASE 3: BUILD TYPESCRIPT"

    if npx tsc --noEmit > "$TEST_LOG" 2>&1; then
        TS_ERRORS=0
        log_msg "✅ Build: 0 erreurs TypeScript"
    else
        TS_ERRORS=$(grep -c "error TS" "$TEST_LOG" 2>/dev/null || echo "0")
        log_msg "❌ Build: $TS_ERRORS erreurs TypeScript"

        # Afficher top 3 erreurs
        log_msg "Top 3 erreurs:"
        grep "error TS" "$TEST_LOG" | head -3 | while read -r line; do
            log_msg "  - $(echo $line | cut -d: -f1-3)"
        done
    fi

    # ========================================================================
    # PHASE 4: AUDIT BIOMARQUEURS
    # ========================================================================

    log_msg ""
    log_msg "📊 PHASE 4: AUDIT BIOMARQUEURS"

    AUDIT_FILE="$AUDIT_DIR/audit_v2_iteration_${ITERATION}.md"

    cat > "$AUDIT_FILE" <<EOF
# AUDIT ITÉRATION $ITERATION - $(date)

## Biomarqueurs MPMD
EOF

    BIOMARKERS_OK=0
    BIOMARKERS=("TESTOSTERONE_LIBRE" "SHBG" "CORTISOL" "ESTRADIOL" "VITAMINE_D")

    for biomarker in "${BIOMARKERS[@]}"; do
        if grep -q "${biomarker}_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null; then
            echo "- ✅ $biomarker" >> "$AUDIT_FILE"
            log_msg "✅ $biomarker"
            BIOMARKERS_OK=$((BIOMARKERS_OK + 1))
        else
            echo "- ❌ $biomarker MANQUANT" >> "$AUDIT_FILE"
            log_msg "❌ $biomarker MANQUANT"
        fi
    done

    if [ $BIOMARKERS_OK -eq 5 ]; then
        log_msg "✅ Audit: 5/5 biomarqueurs OK"
    else
        log_msg "❌ Audit: $BIOMARKERS_OK/5 biomarqueurs"
    fi

    # ========================================================================
    # PHASE 5: DÉCISION
    # ========================================================================

    log_msg ""
    log_msg "🎯 PHASE 5: DÉCISION"

    TOTAL_ERRORS=$((CODE_ERRORS + TS_ERRORS))

    if [ $CODE_ERRORS -eq 0 ] && [ $TS_ERRORS -eq 0 ] && [ $BIOMARKERS_OK -eq 5 ]; then
        log_msg ""
        log_msg "============================================================================"
        log_msg "🎉 ✅ MISSION ACCOMPLIE!"
        log_msg "============================================================================"
        log_msg "Itération: $ITERATION/$MAX_ITERATIONS"
        log_msg "Code: ✅ Parfait"
        log_msg "Build: ✅ 0 erreurs"
        log_msg "Biomarqueurs: ✅ 5/5"
        log_msg ""

        send_to_codex "Parfait Codex! Tous les tests passent. Mission accomplie!"

        break
    else
        log_msg "⚠️ Problèmes détectés:"
        log_msg "  - Erreurs code: $CODE_ERRORS"
        log_msg "  - Erreurs TypeScript: $TS_ERRORS"
        log_msg "  - Biomarqueurs OK: $BIOMARKERS_OK/5"

        # ====================================================================
        # PHASE 6: CORRECTIONS
        # ====================================================================

        log_msg ""
        log_msg "🔧 PHASE 6: ENVOI CORRECTIONS À CODEX"

        INSTRUCTIONS_FILE="$WORK_DIR/INSTRUCTIONS_CODEX_V2_ITER${ITERATION}.md"

        cat > "$INSTRUCTIONS_FILE" <<EOF
# INSTRUCTIONS CODEX - ITÉRATION $ITERATION

**Date**: $(date)

## PROBLÈMES DÉTECTÉS

EOF

        if [ $TS_ERRORS -gt 0 ]; then
            cat >> "$INSTRUCTIONS_FILE" <<'TSEOF'
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

TSEOF
        fi

        if [ $CODE_ERRORS -gt 0 ]; then
            cat >> "$INSTRUCTIONS_FILE" <<'CODEEOF'

### Erreurs Code

Vérifier:
- Exports dans bloodBiomarkerDetailsExtended.ts (attendu: ≥8)
- 0 placeholders dans le fichier
- Modal BiomarkerDetailModal.tsx utilise BIOMARKER_DETAILS_EXTENDED

**ACTION**: Corrige ces problèmes.

CODEEOF
        fi

        if [ $BIOMARKERS_OK -lt 5 ]; then
            cat >> "$INSTRUCTIONS_FILE" <<'BIOEOF'

### Biomarqueurs manquants

**ACTION**: Vérifie que les 5 biomarqueurs MPMD sont exportés:
- TESTOSTERONE_LIBRE_EXTENDED
- SHBG_EXTENDED
- CORTISOL_EXTENDED
- ESTRADIOL_EXTENDED
- VITAMINE_D_EXTENDED

BIOEOF
        fi

        cat >> "$INSTRUCTIONS_FILE" <<EOF

## VALIDATION

Après corrections:
1. npx tsc --noEmit → 0 erreurs
2. Vérifier exports ≥8
3. Vérifier 0 placeholders

**Reporte DONE quand terminé.**
EOF

        log_msg "📝 Instructions créées: $INSTRUCTIONS_FILE"

        send_to_codex "Codex, lis et exécute INSTRUCTIONS_CODEX_V2_ITER${ITERATION}.md MAINTENANT. Corrige tous les problèmes."

        log_msg "⏳ Attente corrections (90 secondes)..."
        sleep 90

        log_msg "✅ Corrections envoyées, passage itération suivante"
    fi

    log_msg ""
    log_msg "FIN ITÉRATION $ITERATION"

done

# ============================================================================
# RÉSULTAT FINAL
# ============================================================================

log_msg ""
log_msg "============================================================================"
log_msg "DAEMON V2 - RÉSULTAT FINAL"
log_msg "============================================================================"

cd "$WORK_DIR"

# Test final
if npx tsc --noEmit > "$TEST_LOG" 2>&1; then
    FINAL_TS_ERRORS=0
else
    FINAL_TS_ERRORS=$(grep -c "error TS" "$TEST_LOG" 2>/dev/null || echo "0")
fi

FINAL_EXPORTS=$(grep -c "export const.*_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null || echo "0")

if [ $FINAL_TS_ERRORS -eq 0 ] && [ $FINAL_EXPORTS -ge 8 ]; then
    log_msg "🎯 ✅ SUCCÈS COMPLET"
    log_msg "Itérations utilisées: $ITERATION/$MAX_ITERATIONS"
    log_msg "Erreurs TypeScript: 0"
    log_msg "Biomarqueurs: $FINAL_EXPORTS exports"

    send_to_codex "Mission accomplie Codex! Tout est parfait."

    exit 0
else
    log_msg "⚠️ MISSION INCOMPLÈTE"
    log_msg "Itérations: $ITERATION/$MAX_ITERATIONS"
    log_msg "Erreurs TS: $FINAL_TS_ERRORS"
    log_msg "Exports: $FINAL_EXPORTS"

    if [ $ITERATION -ge $MAX_ITERATIONS ]; then
        log_msg "❌ Max itérations atteint"
        send_to_codex "Codex, max itérations atteint. Vérifier logs dans logs/"
    fi

    exit 1
fi
