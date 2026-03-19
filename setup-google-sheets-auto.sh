#!/bin/bash
# Script de setup automatique Google Sheets

echo "📊 SETUP GOOGLE SHEETS AUTO-UPDATE"
echo ""
echo "Pour remplir automatiquement le Google Sheet, suis ces étapes:"
echo ""
echo "1️⃣  Crée un Service Account Google Cloud:"
echo "   → Ouvre: https://console.cloud.google.com/iam-admin/serviceaccounts"
echo "   → Clique 'CREATE SERVICE ACCOUNT'"
echo "   → Nom: apexlabs-sheets"
echo "   → Clique 'CREATE AND CONTINUE'"
echo "   → Rôle: Editor (ou juste Sheets API access)"
echo "   → Clique 'DONE'"
echo ""
echo "2️⃣  Crée une clé JSON:"
echo "   → Clique sur le service account créé"
echo "   → Onglet 'KEYS' → ADD KEY → Create new key → JSON"
echo "   → Télécharge le fichier JSON"
echo ""
echo "3️⃣  Partage le Google Sheet avec le service account:"
echo "   → Copie l'email du service account (dans le JSON: client_email)"
echo "   → Ouvre le Google Sheet: https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit"
echo "   → Clique 'Share' → Colle l'email → Role: Editor → Send"
echo ""
echo "4️⃣  Place le fichier JSON ici:"
echo "   → /Users/achzod/neurocore-360/google-service-account.json"
echo ""
echo "Appuie sur ENTER quand c'est fait..."
read

if [ ! -f "google-service-account.json" ]; then
  echo "❌ Fichier google-service-account.json introuvable"
  exit 1
fi

echo "✅ Configuration trouvée, remplissage du sheet..."

# Installer googleapis si nécessaire
npm install googleapis 2>/dev/null

# Exécuter le script de remplissage
node fill-google-sheet.js

echo "✅ Google Sheet rempli avec succès!"
