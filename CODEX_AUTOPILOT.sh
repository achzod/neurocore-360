#!/bin/bash

# CODEX AUTOPILOT - Contrôle automatique du terminal Codex
# Ce script surveille ce que Codex fait et lui envoie des commandes automatiquement

CODEX_TTY="/dev/ttys006"
CODEX_PID="15856"
WORK_DIR="/Users/achzod/Desktop/neurocore/neurocore-github"
LOG_FILE="/tmp/codex_autopilot.log"

echo "=== CODEX AUTOPILOT DÉMARRÉ ===" | tee -a "$LOG_FILE"
echo "Terminal Codex: $CODEX_TTY" | tee -a "$LOG_FILE"
echo "PID Codex: $CODEX_PID" | tee -a "$LOG_FILE"
echo "$(date)" | tee -a "$LOG_FILE"

# Fonction pour envoyer une commande à Codex
send_to_codex() {
    local command="$1"
    echo "[$(date +%H:%M:%S)] ENVOI À CODEX: $command" | tee -a "$LOG_FILE"
    echo "$command" > "$CODEX_TTY"
    sleep 1
}

# Fonction pour attendre et vérifier
wait_and_check() {
    local seconds="$1"
    echo "[$(date +%H:%M:%S)] Attente ${seconds}s..." | tee -a "$LOG_FILE"
    sleep "$seconds"
}

# Fonction pour vérifier si un fichier existe
check_file() {
    local filepath="$1"
    if [ -f "$filepath" ]; then
        echo "[$(date +%H:%M:%S)] ✅ Fichier trouvé: $filepath" | tee -a "$LOG_FILE"
        return 0
    else
        echo "[$(date +%H:%M:%S)] ❌ Fichier manquant: $filepath" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Fonction pour vérifier le contenu d'un fichier
check_content() {
    local filepath="$1"
    local pattern="$2"
    if grep -q "$pattern" "$filepath" 2>/dev/null; then
        echo "[$(date +%H:%M:%S)] ✅ Pattern '$pattern' trouvé dans $filepath" | tee -a "$LOG_FILE"
        return 0
    else
        echo "[$(date +%H:%M:%S)] ❌ Pattern '$pattern' NON trouvé dans $filepath" | tee -a "$LOG_FILE"
        return 1
    fi
}

echo "" | tee -a "$LOG_FILE"
echo "=== MISSION: AUDIT BIOMARQUEURS MPMD ===" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ÉTAPE 1: Envoyer les instructions à Codex
echo "[ÉTAPE 1] Envoi des instructions d'audit à Codex..." | tee -a "$LOG_FILE"

# Vérifier si le fichier d'instructions existe
if check_file "$WORK_DIR/INSTRUCTIONS_CODEX_IMMEDIATE.md"; then
    send_to_codex "Lis le fichier INSTRUCTIONS_CODEX_IMMEDIATE.md et exécute toutes les étapes maintenant."
    wait_and_check 5
else
    echo "❌ ERREUR: Fichier d'instructions manquant!" | tee -a "$LOG_FILE"
fi

# ÉTAPE 2: Attendre que Codex traite (30 secondes)
echo "[ÉTAPE 2] Attente traitement Codex..." | tee -a "$LOG_FILE"
wait_and_check 30

# ÉTAPE 3: Vérifier si STATUS_INTEGRATION_CODEX.md a été créé
echo "[ÉTAPE 3] Vérification création rapport STATUS_INTEGRATION_CODEX.md..." | tee -a "$LOG_FILE"

RETRY_COUNT=0
MAX_RETRIES=5

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if check_file "$WORK_DIR/STATUS_INTEGRATION_CODEX.md"; then
        echo "✅ Rapport créé avec succès!" | tee -a "$LOG_FILE"

        # Vérifier le contenu du rapport
        if check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "MISSION ACCOMPLIE"; then
            echo "✅ Mission ACCOMPLIE détectée dans le rapport!" | tee -a "$LOG_FILE"
            break
        elif check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "PROBLÈMES IDENTIFIÉS"; then
            echo "⚠️ Problèmes détectés - Envoi demande de corrections..." | tee -a "$LOG_FILE"
            send_to_codex "Il y a des problèmes dans STATUS_INTEGRATION_CODEX.md. Corrige-les maintenant et crée un nouveau rapport."
            wait_and_check 30
        fi

        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "⏳ Tentative $RETRY_COUNT/$MAX_RETRIES - Rapport pas encore créé, attente..." | tee -a "$LOG_FILE"

        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            send_to_codex "Codex, as-tu fini d'exécuter les instructions INSTRUCTIONS_CODEX_IMMEDIATE.md ? Crée STATUS_INTEGRATION_CODEX.md maintenant."
            wait_and_check 20
        fi
    fi
done

# ÉTAPE 4: Lire et analyser le rapport
if [ -f "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "=== ANALYSE RAPPORT STATUS_INTEGRATION_CODEX.md ===" | tee -a "$LOG_FILE"

    # Vérifier les étapes
    if check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "ÉTAPE 1.*✅"; then
        echo "✅ ÉTAPE 1 validée" | tee -a "$LOG_FILE"
    fi

    if check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "ÉTAPE 2.*❌.*NON BLOQUANT"; then
        echo "⚠️ ÉTAPE 2 - Serveur KO mais non bloquant" | tee -a "$LOG_FILE"
    fi

    if check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "ÉTAPE 3.*✅"; then
        echo "✅ ÉTAPE 3 validée" | tee -a "$LOG_FILE"
    fi

    # Extraire les métriques
    echo "" | tee -a "$LOG_FILE"
    echo "MÉTRIQUES CLÉS:" | tee -a "$LOG_FILE"
    grep -E "Exports|Placeholders|Modal|Codes alignés" "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" | tee -a "$LOG_FILE"
fi

# ÉTAPE 5: Décision finale
echo "" | tee -a "$LOG_FILE"
echo "=== DÉCISION FINALE ===" | tee -a "$LOG_FILE"

if [ -f "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" ]; then
    if check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "INTÉGRATION RÉUSSIE"; then
        echo "🎯 ✅ MISSION ACCOMPLIE - Intégration biomarqueurs MPMD réussie!" | tee -a "$LOG_FILE"
        send_to_codex "Parfait! L'intégration est réussie. Merci Codex."
    elif check_content "$WORK_DIR/STATUS_INTEGRATION_CODEX.md" "PROBLÈMES IDENTIFIÉS"; then
        echo "⚠️ Problèmes détectés - Nouvelle itération nécessaire" | tee -a "$LOG_FILE"
        send_to_codex "Codex, corrige les problèmes identifiés dans le rapport et relance l'audit complet."
    else
        echo "❓ Statut inconnu - Vérification manuelle requise" | tee -a "$LOG_FILE"
    fi
else
    echo "❌ ÉCHEC - Aucun rapport généré après $MAX_RETRIES tentatives" | tee -a "$LOG_FILE"
    send_to_codex "Codex, pourquoi n'as-tu pas créé le rapport STATUS_INTEGRATION_CODEX.md? Exécute INSTRUCTIONS_CODEX_IMMEDIATE.md maintenant."
fi

echo "" | tee -a "$LOG_FILE"
echo "=== AUTOPILOT TERMINÉ ===" | tee -a "$LOG_FILE"
echo "Logs complets: $LOG_FILE" | tee -a "$LOG_FILE"
echo "$(date)" | tee -a "$LOG_FILE"
