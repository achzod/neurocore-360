# 🔄 Google Sheets Auto-Update via Webhook

## Setup (2 minutes une seule fois)

### 1. Crée l'Apps Script

Ouvre le Google Sheet → Extensions → Apps Script → Colle ce code:

```javascript
const API_URL = 'https://apexlabs.onrender.com/api/admin/export/tracking-json';
const ADMIN_KEY = 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e';

/**
 * Remplir le sheet (appelable via webhook)
 */
function doPost(e) {
  updateSheet();
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Remplir le sheet (appelable via menu)
 */
function updateSheet() {
  try {
    const response = UrlFetchApp.fetch(API_URL, {
      headers: { 'x-admin-key': ADMIN_KEY },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('API error: ' + response.getResponseCode());
    }

    const json = JSON.parse(response.getContentText());
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Clear existing data
    sheet.clear();

    // Headers
    const headers = [
      'ID', 'Email', 'Type', 'Status',
      'Créé le', 'Généré le', 'Programmé pour', 'Envoyé le',
      'Score validation', 'Tentatives', 'Erreur'
    ];

    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#4285F4')
      .setFontColor('#FFFFFF');

    // Data rows
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

      // Color-code status column (D)
      const statusColors = {
        'SENT': '#D4EDDA',
        'SCHEDULED': '#FFF3CD',
        'READY': '#D1ECF1',
        'GENERATING': '#F8D7DA',
        'FAILED': '#F5C6CB',
        'NEEDS_REVIEW': '#FFE5B4'
      };

      rows.forEach((row, i) => {
        const status = row[3]; // Status column
        if (statusColors[status]) {
          sheet.getRange(i + 2, 4).setBackground(statusColors[status]);
        }
      });

      // Auto-resize columns
      for (let i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
      }
    }

    // Timestamp
    sheet.getRange(1, headers.length + 2).setValue('Dernière MàJ:');
    sheet.getRange(1, headers.length + 3).setValue(new Date());

    Logger.log('✅ Sheet updated: ' + rows.length + ' rows');
    return true;

  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
    throw error;
  }
}

/**
 * Format date
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

/**
 * Create custom menu
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 APEXLABS')
    .addItem('🔄 Mettre à jour maintenant', 'updateSheet')
    .addToUi();
}

/**
 * Test function
 */
function testUpdate() {
  updateSheet();
  SpreadsheetApp.getUi().alert('✅ Mise à jour terminée!');
}
```

### 2. Déploie le Web App

1. Dans Apps Script: **Déployer** → **Nouveau déploiement**
2. Type: **Application Web**
3. Description: "APEXLABS Webhook"
4. Exécuter en tant que: **Moi**
5. Qui a l'accès: **Tout le monde** (ou "Tout le monde dans ton organisation")
6. Clique **Déployer**
7. Autorise l'accès (première fois)
8. **COPIE L'URL DU WEB APP** (elle ressemble à: https://script.google.com/macros/s/AKfycbx.../exec)

### 3. Configure le webhook dans .env

Ajoute cette ligne dans `/Users/achzod/neurocore-360/.env`:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/TON_URL_ICI/exec
```

### 4. Test manuel

Dans le sheet:
- Menu **📊 APEXLABS** → **🔄 Mettre à jour maintenant**
- ✅ Le sheet se remplit automatiquement!

---

## Intégration Backend

Une fois l'URL webhook configurée, le backend appellera automatiquement le webhook à chaque nouvelle commande.

Le code d'intégration sera ajouté dans `server/googleSheetsTracking.ts`.

---

## Avantages

✅ **Zero config côté serveur** - pas besoin de service account Google
✅ **Automatique** - webhook appelé à chaque nouvelle commande
✅ **Sécurisé** - s'exécute avec TES permissions Google
✅ **Simple** - setup en 2 minutes
✅ **Bouton manuel** - refresh quand tu veux depuis le menu
