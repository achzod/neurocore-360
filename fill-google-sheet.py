#!/usr/bin/env python3
"""
Remplit automatiquement le Google Sheet APEXLABS avec les données de tracking
"""
import json
import urllib.request
import sys

# Configuration
SHEET_ID = "1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ"
API_URL = "https://apexlabs.onrender.com/api/admin/export/tracking-json"
ADMIN_KEY = "e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e"

def fetch_data():
    """Récupère les données depuis l'API"""
    print("📡 Récupération des données depuis l'API...")
    req = urllib.request.Request(API_URL, headers={"x-admin-key": ADMIN_KEY})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())

    if not data.get("success"):
        print("❌ Erreur lors de la récupération des données")
        sys.exit(1)

    print(f"✅ {data['total']} audits récupérés")
    return data["data"]

def format_date(iso_date):
    """Formate une date ISO en format français"""
    if not iso_date:
        return ""
    from datetime import datetime
    dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
    return dt.strftime("%d/%m/%Y %H:%M")

def fill_sheet_with_gspread(data):
    """Remplit le sheet avec gspread"""
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        print("❌ gspread ou google-auth non installés")
        print("Installe avec: pip3 install gspread google-auth")
        sys.exit(1)

    # Charger les credentials
    try:
        scope = [
            'https://spreadsheets.google.com/feeds',
            'https://www.googleapis.com/auth/drive'
        ]
        creds = Credentials.from_service_account_file('google-service-account.json', scopes=scope)
        client = gspread.authorize(creds)
    except FileNotFoundError:
        print("❌ Fichier google-service-account.json introuvable")
        print("\n🔧 Crée un service account et télécharge le JSON:")
        print("   https://console.cloud.google.com/iam-admin/serviceaccounts")
        sys.exit(1)

    # Ouvrir le sheet
    print(f"📝 Connexion au Google Sheet...")
    sheet = client.open_by_key(SHEET_ID).sheet1

    # Clear existing data
    print("🧹 Nettoyage des données existantes...")
    sheet.clear()

    # Headers
    headers = [
        'ID', 'Email', 'Type', 'Status',
        'Créé le', 'Généré le', 'Programmé pour', 'Envoyé le',
        'Score validation', 'Tentatives', 'Erreur'
    ]

    # Préparer les données
    rows = [headers]
    for item in data:
        rows.append([
            item['id'][:8],
            item['email'],
            item['type'],
            item['status'],
            format_date(item['createdAt']),
            format_date(item['generatedAt']),
            format_date(item['scheduledFor']),
            format_date(item['sentAt']),
            item['validationScore'],
            item['attemptCount'],
            item['errorMessage']
        ])

    # Écrire toutes les données
    print(f"✍️  Écriture de {len(rows)-1} lignes...")
    sheet.update('A1', rows)

    # Formater les headers
    sheet.format('A1:K1', {
        'backgroundColor': {'red': 0.26, 'green': 0.52, 'blue': 0.96},
        'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}
    })

    # Color-code status column (column D)
    status_colors = {
        'SENT': {'red': 0.83, 'green': 0.93, 'blue': 0.85},       # Vert clair
        'SCHEDULED': {'red': 1, 'green': 0.95, 'blue': 0.8},      # Jaune clair
        'READY': {'red': 0.82, 'green': 0.93, 'blue': 0.95},      # Bleu clair
        'GENERATING': {'red': 0.97, 'green': 0.84, 'blue': 0.85}, # Rouge clair
        'FAILED': {'red': 0.96, 'green': 0.78, 'blue': 0.8},      # Rouge
        'NEEDS_REVIEW': {'red': 1, 'green': 0.9, 'blue': 0.71}    # Orange clair
    }

    for i, item in enumerate(data, start=2):
        status = item['status']
        if status in status_colors:
            sheet.format(f'D{i}', {'backgroundColor': status_colors[status]})

    # Ajouter timestamp
    sheet.update('M1', 'Dernière mise à jour:')
    from datetime import datetime
    sheet.update('N1', datetime.now().strftime("%d/%m/%Y %H:%M:%S"))

    print(f"✅ Google Sheet rempli avec succès!")
    print(f"🔗 https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit")

if __name__ == "__main__":
    data = fetch_data()
    fill_sheet_with_gspread(data)
