#!/bin/bash

# MONITOR V2 - Surveillance daemon V2

DAEMON_PID=89404
LOG_FILE="/Users/achzod/Desktop/neurocore/neurocore-github/logs/daemon_v2.log"

echo "============================================================================"
echo "SURVEILLANCE DAEMON V2 - PID $DAEMON_PID"
echo "Démarré: $(date)"
echo "============================================================================"
echo ""

while true; do
    if ! ps -p $DAEMON_PID > /dev/null 2>&1; then
        echo "[$(date +%H:%M:%S)] ❌ DAEMON TERMINÉ"
        echo ""
        echo "=== RÉSULTAT FINAL ==="
        tail -30 "$LOG_FILE" 2>/dev/null

        if grep -q "SUCCÈS COMPLET" "$LOG_FILE" 2>/dev/null; then
            echo ""
            echo "🎯 ✅ MISSION ACCOMPLIE!"
        elif grep -q "MISSION INCOMPLÈTE" "$LOG_FILE" 2>/dev/null; then
            echo ""
            echo "⚠️ Mission incomplète"
        fi

        break
    fi

    # Statut actuel
    CURRENT_ITER=$(grep -oE "ITÉRATION [0-9]+/[0-9]+" "$LOG_FILE" 2>/dev/null | tail -1 || echo "ITÉRATION ?/?")
    LAST_PHASE=$(grep -oE "(PLANIFICATION|VÉRIFICATION CODE|BUILD TYPESCRIPT|AUDIT BIOMARQUEURS|DÉCISION|CORRECTIONS)" "$LOG_FILE" 2>/dev/null | tail -1 || echo "?")

    echo "[$(date +%H:%M:%S)] ✅ Actif - $CURRENT_ITER - Phase: $LAST_PHASE"

    sleep 20
done

echo ""
echo "============================================================================"
echo "SURVEILLANCE TERMINÉE: $(date)"
echo "============================================================================"
