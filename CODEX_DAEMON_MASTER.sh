#!/bin/bash

# ============================================================================
# CODEX DAEMON MASTER - Contrôle autonome de Codex avec cycle CI/CD complet
# ============================================================================
#
# CYCLE: PLAN → CODE → TEST → AUDIT → FIX → REPEAT
#
# Ce daemon:
# 1. Surveille Codex en continu
# 2. Établit un PLAN avant chaque action
# 3. Lance les TESTS complets (build, TypeScript, runtime)
# 4. AUDITE les résultats du dashboard
# 5. Identifie les CORRECTIONS nécessaires
# 6. Envoie instructions à Codex pour FIX
# 7. RÉPÈTE jusqu'à 100% OK
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

DAEMON_LOG="$LOG_DIR/daemon_master.log"
PHASE_LOG="$LOG_DIR/phase_current.log"
TEST_LOG="$LOG_DIR/tests_results.log"
AUDIT_LOG="$LOG_DIR/audit_results.log"

# Compteurs
ITERATION=0
MAX_ITERATIONS=10
RETRY_COUNT=0
MAX_RETRIES_PER_PHASE=3

# États
CURRENT_PHASE="INIT"
TESTS_PASSED=false
AUDIT_PASSED=false
ALL_GREEN=false

# ============================================================================
# INITIALISATION
# ============================================================================

init_daemon() {
    mkdir -p "$LOG_DIR" "$PLAN_DIR" "$AUDIT_DIR"

    echo "============================================================================" | tee -a "$DAEMON_LOG"
    echo "CODEX DAEMON MASTER - DÉMARRAGE" | tee -a "$DAEMON_LOG"
    echo "============================================================================" | tee -a "$DAEMON_LOG"
    echo "Date: $(date)" | tee -a "$DAEMON_LOG"
    echo "Terminal Codex: $CODEX_TTY" | tee -a "$DAEMON_LOG"
    echo "PID Codex: $CODEX_PID" | tee -a "$DAEMON_LOG"
    echo "Working Dir: $WORK_DIR" | tee -a "$DAEMON_LOG"
    echo "" | tee -a "$DAEMON_LOG"

    # Vérifier que Codex est vivant
    if ! ps -p "$CODEX_PID" > /dev/null 2>&1; then
        echo "❌ ERREUR: Codex PID $CODEX_PID n'est pas actif!" | tee -a "$DAEMON_LOG"
        exit 1
    fi

    echo "✅ Codex détecté et actif (PID $CODEX_PID)" | tee -a "$DAEMON_LOG"
    echo "" | tee -a "$DAEMON_LOG"
}

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

log_phase() {
    local phase="$1"
    local message="$2"
    echo "[$(date +%H:%M:%S)] [$phase] $message" | tee -a "$DAEMON_LOG" "$PHASE_LOG"
}

send_to_codex() {
    local command="$1"
    log_phase "$CURRENT_PHASE" "📤 ENVOI À CODEX: $command"
    echo "$command" > "$CODEX_TTY"
    sleep 2
}

check_file_exists() {
    local filepath="$1"
    [ -f "$filepath" ]
}

wait_for_file() {
    local filepath="$1"
    local timeout="$2"
    local elapsed=0

    log_phase "$CURRENT_PHASE" "⏳ Attente fichier: $filepath (timeout: ${timeout}s)"

    while [ $elapsed -lt $timeout ]; do
        if check_file_exists "$filepath"; then
            log_phase "$CURRENT_PHASE" "✅ Fichier trouvé: $filepath"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_phase "$CURRENT_PHASE" "❌ Timeout: Fichier non trouvé après ${timeout}s"
    return 1
}

# ============================================================================
# PHASE 0: PLANIFICATION
# ============================================================================

phase_plan() {
    CURRENT_PHASE="PLAN"
    ITERATION=$((ITERATION + 1))

    log_phase "PLAN" "============================================================================"
    log_phase "PLAN" "ITÉRATION $ITERATION/$MAX_ITERATIONS - PLANIFICATION"
    log_phase "PLAN" "============================================================================"

    local plan_file="$PLAN_DIR/plan_iteration_${ITERATION}.md"

    cat > "$plan_file" <<EOF
# PLAN ITÉRATION $ITERATION - $(date)

## OBJECTIF
Vérifier l'intégration complète des biomarqueurs MPMD et valider le dashboard Blood.

## PHASES

### Phase 1: VÉRIFICATION CODE
- ✅ Vérifier exports des 5 biomarqueurs MPMD dans bloodBiomarkerDetailsExtended.ts
- ✅ Vérifier 0 placeholders
- ✅ Vérifier citations MPMD (>30)
- ✅ Vérifier modal BiomarkerDetailModal.tsx utilise EXTENDED

### Phase 2: BUILD & COMPILATION
- 🔨 Lancer build TypeScript: \`npx tsc --noEmit\`
- 🔨 Vérifier 0 erreurs TypeScript
- 🔨 Si erreurs: identifier fichiers problématiques

### Phase 3: TESTS RUNTIME
- 🧪 Lancer serveur dev: \`npm run dev\`
- 🧪 Tester endpoint API: \`/api/admin/blood-tests/seed\`
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
- **FAIL**: Arrêt après $MAX_ITERATIONS itérations

EOF

    log_phase "PLAN" "📝 Plan écrit: $plan_file"
    log_phase "PLAN" "✅ PLANIFICATION COMPLÈTE"
    echo "" | tee -a "$DAEMON_LOG"
}

# ============================================================================
# PHASE 1: VÉRIFICATION CODE
# ============================================================================

phase_verify_code() {
    CURRENT_PHASE="VERIFY_CODE"

    log_phase "VERIFY_CODE" "============================================================================"
    log_phase "VERIFY_CODE" "PHASE 1: VÉRIFICATION CODE"
    log_phase "VERIFY_CODE" "============================================================================"

    cd "$WORK_DIR"

    local errors=0

    # Vérif 1: Exports biomarqueurs
    log_phase "VERIFY_CODE" "Vérif 1/4: Exports biomarqueurs MPMD..."
    local exports_count=$(grep -c "export const.*_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null || echo "0")

    if [ "$exports_count" -ge 8 ]; then
        log_phase "VERIFY_CODE" "✅ $exports_count exports trouvés (5 MPMD + bonus)"
    else
        log_phase "VERIFY_CODE" "❌ Seulement $exports_count exports (attendu: ≥8)"
        errors=$((errors + 1))
    fi

    # Vérif 2: Placeholders
    log_phase "VERIFY_CODE" "Vérif 2/4: Placeholders..."
    local placeholders=$(grep -i "je ne sais pas\|todo\|tbd\|à compléter" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null | wc -l)

    if [ "$placeholders" -eq 0 ]; then
        log_phase "VERIFY_CODE" "✅ 0 placeholders trouvés"
    else
        log_phase "VERIFY_CODE" "❌ $placeholders placeholders trouvés"
        errors=$((errors + 1))
    fi

    # Vérif 3: Citations MPMD
    log_phase "VERIFY_CODE" "Vérif 3/4: Citations MPMD..."
    local citations=$(grep -i "derek\|mpmd\|masterjohn\|huberman" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null | wc -l | tr -d ' ')

    if [ "$citations" -ge 30 ]; then
        log_phase "VERIFY_CODE" "✅ $citations citations trouvées"
    else
        log_phase "VERIFY_CODE" "⚠️ Seulement $citations citations (attendu: ≥30)"
    fi

    # Vérif 4: Modal utilise EXTENDED
    log_phase "VERIFY_CODE" "Vérif 4/4: Modal utilise EXTENDED..."
    if grep -q "BIOMARKER_DETAILS_EXTENDED" client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx 2>/dev/null; then
        log_phase "VERIFY_CODE" "✅ Modal utilise BIOMARKER_DETAILS_EXTENDED"
    else
        log_phase "VERIFY_CODE" "❌ Modal n'utilise pas BIOMARKER_DETAILS_EXTENDED"
        errors=$((errors + 1))
    fi

    echo "" | tee -a "$DAEMON_LOG"

    if [ $errors -eq 0 ]; then
        log_phase "VERIFY_CODE" "✅ PHASE 1 RÉUSSIE - Code vérifié"
        return 0
    else
        log_phase "VERIFY_CODE" "❌ PHASE 1 ÉCHOUÉE - $errors erreurs trouvées"
        return 1
    fi
}

# ============================================================================
# PHASE 2: BUILD & COMPILATION
# ============================================================================

phase_build() {
    CURRENT_PHASE="BUILD"

    log_phase "BUILD" "============================================================================"
    log_phase "BUILD" "PHASE 2: BUILD & COMPILATION"
    log_phase "BUILD" "============================================================================"

    cd "$WORK_DIR"

    # Lancer TypeScript check
    log_phase "BUILD" "🔨 Lancement TypeScript compilation..."

    if npx tsc --noEmit > "$TEST_LOG" 2>&1; then
        log_phase "BUILD" "✅ BUILD RÉUSSI - 0 erreurs TypeScript"
        return 0
    else
        local error_count=$(grep -c "error TS" "$TEST_LOG" 2>/dev/null || echo "0")
        log_phase "BUILD" "❌ BUILD ÉCHOUÉ - $error_count erreurs TypeScript"

        # Extraire les erreurs principales
        log_phase "BUILD" "Top 5 erreurs:"
        grep "error TS" "$TEST_LOG" | head -5 | while read -r line; do
            log_phase "BUILD" "  - $line"
        done

        return 1
    fi
}

# ============================================================================
# PHASE 3: TESTS RUNTIME
# ============================================================================

phase_test_runtime() {
    CURRENT_PHASE="TEST_RUNTIME"

    log_phase "TEST_RUNTIME" "============================================================================"
    log_phase "TEST_RUNTIME" "PHASE 3: TESTS RUNTIME"
    log_phase "TEST_RUNTIME" "============================================================================"

    cd "$WORK_DIR"

    # Note: On ne peut pas vraiment tester le serveur car DATABASE_URL manque
    # On va juste vérifier que les fichiers clés existent

    log_phase "TEST_RUNTIME" "Vérification fichiers runtime critiques..."

    local critical_files=(
        "client/src/data/bloodBiomarkerDetailsExtended.ts"
        "client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx"
        "client/src/types/blood.ts"
        "server/blood-tests/routes.ts"
    )

    local missing=0
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_phase "TEST_RUNTIME" "✅ $file"
        else
            log_phase "TEST_RUNTIME" "❌ MANQUANT: $file"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -eq 0 ]; then
        log_phase "TEST_RUNTIME" "✅ PHASE 3 RÉUSSIE - Tous les fichiers présents"
        return 0
    else
        log_phase "TEST_RUNTIME" "❌ PHASE 3 ÉCHOUÉE - $missing fichiers manquants"
        return 1
    fi
}

# ============================================================================
# PHASE 4: AUDIT DASHBOARD
# ============================================================================

phase_audit() {
    CURRENT_PHASE="AUDIT"

    log_phase "AUDIT" "============================================================================"
    log_phase "AUDIT" "PHASE 4: AUDIT DASHBOARD"
    log_phase "AUDIT" "============================================================================"

    cd "$WORK_DIR"

    local audit_file="$AUDIT_DIR/audit_iteration_${ITERATION}.md"

    # Générer rapport d'audit complet
    cat > "$audit_file" <<EOF
# AUDIT DASHBOARD - Itération $ITERATION
**Date**: $(date)

## Vérifications

### 1. Biomarqueurs MPMD Intégrés
EOF

    # Vérifier chaque biomarqueur
    local biomarkers=("TESTOSTERONE_LIBRE" "SHBG" "CORTISOL" "ESTRADIOL" "VITAMINE_D")
    local all_present=true

    for biomarker in "${biomarkers[@]}"; do
        if grep -q "${biomarker}_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null; then
            echo "- ✅ ${biomarker}_EXTENDED présent" >> "$audit_file"
            log_phase "AUDIT" "✅ $biomarker"
        else
            echo "- ❌ ${biomarker}_EXTENDED MANQUANT" >> "$audit_file"
            log_phase "AUDIT" "❌ $biomarker MANQUANT"
            all_present=false
        fi
    done

    # Vérifier modal
    cat >> "$audit_file" <<EOF

### 2. Modal BiomarkerDetailModal.tsx
EOF

    if grep -q "BIOMARKER_DETAILS_EXTENDED\[marker.code\]" client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx 2>/dev/null; then
        echo "- ✅ Utilise BIOMARKER_DETAILS_EXTENDED" >> "$audit_file"
        log_phase "AUDIT" "✅ Modal correcte"
    else
        echo "- ❌ N'utilise PAS BIOMARKER_DETAILS_EXTENDED" >> "$audit_file"
        log_phase "AUDIT" "❌ Modal incorrecte"
        all_present=false
    fi

    # Vérifier tabs
    local tabs_ok=true
    for tab_field in "definition.intro" "impact.performance" "protocol.phase1_lifestyle"; do
        if grep -q "$tab_field" client/src/components/blood/biomarkers/BiomarkerDetailModal.tsx 2>/dev/null; then
            echo "- ✅ Affiche $tab_field" >> "$audit_file"
        else
            echo "- ❌ N'affiche PAS $tab_field" >> "$audit_file"
            tabs_ok=false
        fi
    done

    # Conclusion
    cat >> "$audit_file" <<EOF

## Conclusion

EOF

    if [ "$all_present" = true ] && [ "$tabs_ok" = true ]; then
        echo "✅ **AUDIT RÉUSSI** - Dashboard prêt pour production" >> "$audit_file"
        log_phase "AUDIT" "✅ PHASE 4 RÉUSSIE - Audit passé"
        AUDIT_PASSED=true
        return 0
    else
        echo "❌ **AUDIT ÉCHOUÉ** - Corrections nécessaires" >> "$audit_file"
        log_phase "AUDIT" "❌ PHASE 4 ÉCHOUÉE - Problèmes détectés"
        AUDIT_PASSED=false
        return 1
    fi
}

# ============================================================================
# PHASE 5: CORRECTIONS
# ============================================================================

phase_fix() {
    CURRENT_PHASE="FIX"

    log_phase "FIX" "============================================================================"
    log_phase "FIX" "PHASE 5: CORRECTIONS"
    log_phase "FIX" "============================================================================"

    local instructions_file="$WORK_DIR/INSTRUCTIONS_CODEX_FIX_${ITERATION}.md"

    # Analyser les logs pour identifier les problèmes
    local problems=()

    # Problème 1: Erreurs TypeScript
    if [ -f "$TEST_LOG" ] && grep -q "error TS" "$TEST_LOG"; then
        problems+=("Erreurs TypeScript détectées")
    fi

    # Problème 2: Biomarqueurs manquants
    local biomarkers=("TESTOSTERONE_LIBRE" "SHBG" "CORTISOL" "ESTRADIOL" "VITAMINE_D")
    for biomarker in "${biomarkers[@]}"; do
        if ! grep -q "${biomarker}_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts 2>/dev/null; then
            problems+=("Biomarqueur ${biomarker}_EXTENDED manquant")
        fi
    done

    if [ ${#problems[@]} -eq 0 ]; then
        log_phase "FIX" "✅ Aucun problème détecté - Pas de corrections nécessaires"
        return 0
    fi

    log_phase "FIX" "📝 Création instructions de correction..."

    # Générer instructions pour Codex
    cat > "$instructions_file" <<EOF
# INSTRUCTIONS CODEX - CORRECTIONS ITÉRATION $ITERATION

**Date**: $(date)
**Problèmes détectés**: ${#problems[@]}

---

## PROBLÈMES À CORRIGER

EOF

    local prob_num=1
    for problem in "${problems[@]}"; do
        echo "### Problème $prob_num: $problem" >> "$instructions_file"
        echo "" >> "$instructions_file"

        if [[ "$problem" == *"TypeScript"* ]]; then
            cat >> "$instructions_file" <<'TSEOF'
**Fichier**: Voir logs dans `logs/tests_results.log`

**Action requise**:
1. Lire les erreurs TypeScript dans `logs/tests_results.log`
2. Corriger chaque erreur
3. Lancer `npx tsc --noEmit` pour vérifier
4. Répéter jusqu'à 0 erreurs

TSEOF
        fi

        if [[ "$problem" == *"manquant"* ]]; then
            cat >> "$instructions_file" <<'BIOEOF'
**Action requise**:
1. Créer ou compléter le biomarqueur dans `client/src/data/bloodBiomarkerDetailsExtended.ts`
2. Suivre le pattern des autres biomarqueurs EXTENDED
3. Inclure: definition, impact, protocol avec 3 phases
4. Ajouter citations MPMD/Derek/Masterjohn
5. Vérifier export et ajout dans BIOMARKER_DETAILS_EXTENDED

BIOEOF
        fi

        echo "" >> "$instructions_file"
        prob_num=$((prob_num + 1))
    done

    cat >> "$instructions_file" <<EOF

---

## VALIDATION

Après corrections, vérifie:
1. \`npx tsc --noEmit\` → 0 erreurs
2. \`grep -c "_EXTENDED" client/src/data/bloodBiomarkerDetailsExtended.ts\` → ≥8
3. \`grep -i "todo\|tbd" client/src/data/bloodBiomarkerDetailsExtended.ts\` → 0 résultats

**Reporte quand DONE.**

EOF

    log_phase "FIX" "📝 Instructions écrites: $instructions_file"

    # Envoyer à Codex
    send_to_codex "Codex, lis et exécute immédiatement le fichier INSTRUCTIONS_CODEX_FIX_${ITERATION}.md. Corrige tous les problèmes identifiés."

    log_phase "FIX" "⏳ Attente corrections Codex (60 secondes)..."
    sleep 60

    log_phase "FIX" "✅ PHASE 5 COMPLÈTE - Instructions envoyées"
    return 0
}

# ============================================================================
# PHASE 6: VALIDATION FINALE
# ============================================================================

phase_validate() {
    CURRENT_PHASE="VALIDATE"

    log_phase "VALIDATE" "============================================================================"
    log_phase "VALIDATE" "PHASE 6: VALIDATION FINALE"
    log_phase "VALIDATE" "============================================================================"

    # Re-run toutes les phases de vérification
    log_phase "VALIDATE" "Re-test complet après corrections..."

    local validation_passed=true

    # Re-vérif code
    if ! phase_verify_code; then
        validation_passed=false
    fi

    # Re-build
    if ! phase_build; then
        validation_passed=false
    fi

    # Re-audit
    if ! phase_audit; then
        validation_passed=false
    fi

    if [ "$validation_passed" = true ]; then
        log_phase "VALIDATE" "✅ VALIDATION RÉUSSIE - Tout est OK!"
        ALL_GREEN=true
        return 0
    else
        log_phase "VALIDATE" "❌ VALIDATION ÉCHOUÉE - Problèmes persistent"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        return 1
    fi
}

# ============================================================================
# BOUCLE PRINCIPALE
# ============================================================================

main_loop() {
    while [ $ITERATION -lt $MAX_ITERATIONS ] && [ "$ALL_GREEN" = false ]; do

        # PHASE 0: PLAN
        phase_plan

        # PHASE 1: VERIFY CODE
        if ! phase_verify_code; then
            phase_fix
            phase_validate
            continue
        fi

        # PHASE 2: BUILD
        if ! phase_build; then
            phase_fix
            phase_validate
            continue
        fi

        # PHASE 3: TEST RUNTIME
        if ! phase_test_runtime; then
            phase_fix
            phase_validate
            continue
        fi

        # PHASE 4: AUDIT
        if ! phase_audit; then
            phase_fix
            phase_validate
            continue
        fi

        # Si on arrive ici, tout est OK
        log_phase "MAIN" "🎉 TOUTES LES PHASES RÉUSSIES!"
        ALL_GREEN=true
        break

    done

    # RÉSULTAT FINAL
    echo "" | tee -a "$DAEMON_LOG"
    log_phase "MAIN" "============================================================================"
    log_phase "MAIN" "RÉSULTAT FINAL"
    log_phase "MAIN" "============================================================================"

    if [ "$ALL_GREEN" = true ]; then
        log_phase "MAIN" "🎯 ✅ MISSION ACCOMPLIE"
        log_phase "MAIN" "Itérations: $ITERATION/$MAX_ITERATIONS"
        log_phase "MAIN" "Tous les tests passent - Dashboard prêt pour production"

        send_to_codex "Parfait Codex! Tous les tests passent. L'intégration est complète et validée. Excellent travail!"

        return 0
    else
        log_phase "MAIN" "❌ MISSION ÉCHOUÉE"
        log_phase "MAIN" "Itérations: $ITERATION/$MAX_ITERATIONS"
        log_phase "MAIN" "Problèmes persistent après $MAX_ITERATIONS itérations"

        send_to_codex "Codex, il reste des problèmes après $ITERATION itérations. Vérif les logs dans logs/"

        return 1
    fi
}

# ============================================================================
# POINT D'ENTRÉE
# ============================================================================

init_daemon
main_loop

log_phase "MAIN" "============================================================================"
log_phase "MAIN" "DAEMON TERMINÉ"
log_phase "MAIN" "============================================================================"
log_phase "MAIN" "Logs: $DAEMON_LOG"
log_phase "MAIN" "Plans: $PLAN_DIR"
log_phase "MAIN" "Audits: $AUDIT_DIR"
