#!/bin/bash

# Script pour configurer les conversions tracking sur Render
# APEXLABS - Conversions Meta + Google Ads

echo "=========================================="
echo "CONFIGURATION CONVERSIONS TRACKING RENDER"
echo "=========================================="
echo ""

SERVICE_NAME="apexlabs"

# Meta Ads Account ID (connu)
META_AD_ACCOUNT_ID="2332690213646248"

echo "Configuration des variables d'environnement sur Render..."
echo ""

# Note: META_ACCESS_TOKEN doit être ajouté manuellement quand disponible
echo "⚠️  META_ACCESS_TOKEN manquant - le dashboard affichera un avertissement"
echo "   Pour le configurer plus tard:"
echo "   render env set META_ACCESS_TOKEN=\"TON_TOKEN\" --service $SERVICE_NAME"
echo ""

# Configure Meta Ad Account ID
echo "✅ Configuration META_AD_ACCOUNT_ID..."
render env set META_AD_ACCOUNT_ID="$META_AD_ACCOUNT_ID" --service $SERVICE_NAME

echo ""
echo "=========================================="
echo "CONFIGURATION TERMINÉE"
echo "=========================================="
echo ""
echo "Dashboard conversions disponible sur:"
echo "https://apexlabs.achzodcoaching.com/admin/conversions-tracker"
echo ""
echo "Notes:"
echo "- Google Ads: ✅ Fonctionne (via Google Analytics déjà installé)"
echo "- Meta Ads: ⚠️  Nécessite META_ACCESS_TOKEN"
echo ""
echo "Pour ajouter le token Meta plus tard:"
echo "render env set META_ACCESS_TOKEN=\"EAAG...\" --service $SERVICE_NAME"
echo ""
