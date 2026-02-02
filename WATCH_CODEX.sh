#!/bin/bash

# WATCH CODEX - Surveillance en temps réel de ce que Codex fait

WORK_DIR="/Users/achzod/Desktop/neurocore/neurocore-github"
WATCH_LOG="/tmp/watch_codex.log"
LAST_MTIME_FILE="/tmp/last_mtime.txt"

cd "$WORK_DIR"

echo "============================================================================" | tee "$WATCH_LOG"
echo "🔍 SURVEILLANCE CODEX - DÉMARRÉE" | tee -a "$WATCH_LOG"
echo "$(date)" | tee -a "$WATCH_LOG"
echo "============================================================================" | tee -a "$WATCH_LOG"
echo "" | tee -a "$WATCH_LOG"

# Sauvegarder l'état initial des fichiers
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" | grep -v node_modules | sort > /tmp/files_before.txt

echo "📋 Fichiers surveillés: $(wc -l < /tmp/files_before.txt) fichiers TypeScript/JS" | tee -a "$WATCH_LOG"
echo "" | tee -a "$WATCH_LOG"

# Compteur
CHANGES_DETECTED=0
ITERATION=0

while true; do
    ITERATION=$((ITERATION + 1))

    # Chercher les fichiers modifiés dans les 10 dernières secondes
    MODIFIED=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.d.ts" \) -mtime -10s 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "dist")

    if [ -n "$MODIFIED" ]; then
        for file in $MODIFIED; do
            # Vérifier si c'est un nouveau changement
            LAST_REPORTED=$(grep "^$file$" /tmp/reported_files.txt 2>/dev/null)

            if [ -z "$LAST_REPORTED" ]; then
                CHANGES_DETECTED=$((CHANGES_DETECTED + 1))

                echo "[$(date +%H:%M:%S)] 📝 CHANGEMENT DÉTECTÉ: $file" | tee -a "$WATCH_LOG"

                # Marquer comme reporté
                echo "$file" >> /tmp/reported_files.txt

                # Analyser le type de changement
                if [[ "$file" == *".d.ts" ]]; then
                    echo "  └─ Type: Fichier de déclaration TypeScript" | tee -a "$WATCH_LOG"
                elif [[ "$file" == *"routes.ts"* ]]; then
                    echo "  └─ Type: Route serveur" | tee -a "$WATCH_LOG"
                elif [[ "$file" == *"biomarker"* ]]; then
                    echo "  └─ Type: Biomarqueur (critique!)" | tee -a "$WATCH_LOG"
                elif [[ "$file" == *"package.json"* ]]; then
                    echo "  └─ Type: Dépendances" | tee -a "$WATCH_LOG"
                fi

                echo "" | tee -a "$WATCH_LOG"
            fi
        done
    fi

    # Toutes les 30 secondes, faire un test TypeScript
    if [ $((ITERATION % 15)) -eq 0 ]; then
        echo "[$(date +%H:%M:%S)] 🔨 TEST TYPESCRIPT..." | tee -a "$WATCH_LOG"

        if npx tsc --noEmit > /tmp/ts_check.log 2>&1; then
            TS_ERRORS=0
            echo "  └─ ✅ 0 erreurs TypeScript" | tee -a "$WATCH_LOG"
        else
            TS_ERRORS=$(grep -c "error TS" /tmp/ts_check.log)
            echo "  └─ ❌ $TS_ERRORS erreurs TypeScript" | tee -a "$WATCH_LOG"

            # Afficher top 3 erreurs
            if [ $TS_ERRORS -gt 0 ]; then
                echo "  └─ Top 3:" | tee -a "$WATCH_LOG"
                grep "error TS" /tmp/ts_check.log | head -3 | while read line; do
                    FILE_LINE=$(echo "$line" | cut -d: -f1-2)
                    echo "     • $FILE_LINE" | tee -a "$WATCH_LOG"
                done
            fi
        fi

        echo "" | tee -a "$WATCH_LOG"

        # Si 0 erreurs, on peut s'arrêter
        if [ $TS_ERRORS -eq 0 ]; then
            echo "[$(date +%H:%M:%S)] 🎉 ✅ SUCCÈS! 0 erreurs TypeScript détectées!" | tee -a "$WATCH_LOG"
            echo "" | tee -a "$WATCH_LOG"
            echo "Changements détectés durant la surveillance: $CHANGES_DETECTED" | tee -a "$WATCH_LOG"
            echo "" | tee -a "$WATCH_LOG"
            echo "Pour voir les détails:" | tee -a "$WATCH_LOG"
            echo "  cat $WATCH_LOG" | tee -a "$WATCH_LOG"
            echo "" | tee -a "$WATCH_LOG"

            break
        fi
    fi

    sleep 2
done

echo "============================================================================" | tee -a "$WATCH_LOG"
echo "SURVEILLANCE TERMINÉE: $(date)" | tee -a "$WATCH_LOG"
echo "============================================================================" | tee -a "$WATCH_LOG"
