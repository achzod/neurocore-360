# 🚀 REMPLISSAGE GOOGLE SHEET - SOLUTION LA PLUS RAPIDE

## Option A: Apps Script (30 secondes, puis 100% auto)

1. Ouvre le Google Sheet: https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

2. Extensions → Apps Script

3. Colle ce code (remplace tout):

```javascript
const API_URL = 'https://apexlabs.onrender.com/api/admin/export/tracking-json';
const ADMIN_KEY = 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e';

function remplirMaintenant() {
  const response = UrlFetchApp.fetch(API_URL, {
    headers: { 'x-admin-key': ADMIN_KEY }
  });
  const json = JSON.parse(response.getContentText());
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  sheet.clear();
  
  const headers = ['ID', 'Email', 'Type', 'Status', 'Créé le', 'Généré le', 'Programmé pour', 'Envoyé le', 'Score validation', 'Tentatives', 'Erreur'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
       .setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  
  const rows = json.data.map(item => [
    item.id.substring(0, 8),
    item.email,
    item.type,
    item.status,
    formatDate(item.createdAt),
    formatDate(item.generatedAt),
    formatDate(item.scheduledFor),
    formatDate(item.sentAt),
    item.validationScore,
    item.attemptCount,
    item.errorMessage
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  SpreadsheetApp.getUi().alert('✅ ' + rows.length + ' audits importés!');
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📊 APEXLABS')
    .addItem('🔄 Remplir maintenant', 'remplirMaintenant')
    .addToUi();
}
```

4. Enregistre (Ctrl+S)

5. Retourne au sheet (recharge la page F5)

6. Menu "📊 APEXLABS" → "🔄 Remplir maintenant"

7. ✅ DONE! Le sheet est rempli!

---

## Option B: Télécharge le CSV et importe manuellement

Le CSV est déjà téléchargé: `/Users/achzod/neurocore-360/tracking-apexlabs.csv`

1. Ouvre le Google Sheet
2. Fichier → Importer
3. Upload → Sélectionne `tracking-apexlabs.csv`
4. Type: "Remplacer les données"
5. Importer

