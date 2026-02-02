#!/bin/bash

# MONITOR DAEMON - Surveillance en temps réel du daemon master

DAEMON_PID=80543
DAEMON_LOG="/Users/achzod/Desktop/neurocore/neurocore-github/logs/daemon_master.log"
MONITOR_LOG="/tmp/monitor_daemon.log"

echo "============================================================================" | tee "$MONITOR_LOG"
echo "SURVEILLANCE DAEMON CODEX - PID $DAEMON_PID" | tee -a "$MONITOR_LOG"
echo "Démarré: $(date)" | tee -a "$MONITOR_LOG"
echo "============================================================================" | tee -a "$MONITOR_LOG"
echo "" | tee -a "$MONITOR_LOG"

# Surveiller en boucle
while true; do
    # Vérifier si le daemon est toujours actif
    if ! ps -p $DAEMON_PID > /dev/null 2>&1; then
        echo "[$(date +%H:%M:%S)] ❌ DAEMON TERMINÉ (PID $DAEMON_PID)" | tee -a "$MONITOR_LOG"

        # Afficher les dernières lignes du log
        echo "" | tee -a "$MONITOR_LOG"
        echo "=== DERNIÈRES LIGNES DU LOG DAEMON ===" | tee -a "$MONITOR_LOG"
        tail -30 "$DAEMON_LOG" 2>/dev/null | tee -a "$MONITOR_LOG"

        # Vérifier le résultat
        if grep -q "MISSION ACCOMPLIE" "$DAEMON_LOG" 2>/dev/null; then
            echo "" | tee -a "$MONITOR_LOG"
            echo "🎯 ✅ SUCCÈS: Mission accomplie!" | tee -a "$MONITOR_LOG"
        elif grep -q "MISSION ÉCHOUÉE" "$DAEMON_LOG" 2>/dev/null; then
            echo "" | tee -a "$MONITOR_LOG"
            echo "❌ ÉCHEC: Mission échouée" | tee -a "$MONITOR_LOG"
        fi

        break
    fi

    # Afficher statut actuel
    local current_phase=$(tail -1 "$DAEMON_LOG" 2>/dev/null | grep -oE '\[.*?\]' | head -1 || echo "[UNKNOWN]")
    echo "[$(date +%H:%M:%S)] ✅ Daemon actif - Phase: $current_phase" | tee -a "$MONITOR_LOG"

    # Attendre 30 secondes avant prochaine vérif
    sleep 30
done

echo "" | tee -a "$MONITOR_LOG"
echo "============================================================================" | tee -a "$MONITOR_LOG"
echo "SURVEILLANCE TERMINÉE: $(date)" | tee -a "$MONITOR_LOG"
echo "============================================================================" | tee -a "$MONITOR_LOG"
