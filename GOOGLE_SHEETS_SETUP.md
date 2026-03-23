# 📊 Configuration Google Sheets - Suivi APEXLABS

## Lien du Google Sheet
https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

---

## Option 1: Import manuel (immédiat)

### Télécharger le CSV

```bash
curl -H "x-admin-key: e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e" \
  "https://apexlabs.achzodcoaching.com/api/admin/export/tracking-csv" \
  -o tracking.csv
```

### Importer dans Google Sheets

1. Ouvrir le Google Sheet
2. Fichier → Importer
3. Onglet "Upload" → Sélectionner `tracking.csv`
4. Type d'import: "Remplacer les données actuelles"
5. Cliquer "Importer les données"

✅ **Done** - Les données sont maintenant dans le sheet

---

## Option 2: Import automatique avec Apps Script (recommandé)

### Étape 1: Ouvrir l'éditeur Apps Script

1. Dans Google Sheets, aller à **Extensions → Apps Script**
2. Supprimer le code par défaut
3. Copier-coller le script ci-dessous:

```javascript
/**
 * APEXLABS - Import automatique des données
 * Mise à jour toutes les heures
 */

const API_URL = 'https://apexlabs.achzodcoaching.com/api/admin/export/tracking-json';
const ADMIN_KEY = 'e9dadaff6333c1312109117c9eb747503e41079c863997ad6ff0d0dad5a2803e';

/**
 * Import manuel (bouton dans le menu)
 */
function importDataNow() {
  updateTrackingData();
  SpreadsheetApp.getUi().alert('✅ Données mises à jour avec succès!');
}

/**
 * Import automatique toutes les heures
 */
function setupAutomaticUpdates() {
  // Supprimer les anciens triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Créer nouveau trigger (toutes les heures)
  ScriptApp.newTrigger('updateTrackingData')
    .timeBased()
    .everyHours(1)
    .create();

  SpreadsheetApp.getUi().alert('✅ Mise à jour automatique activée (toutes les heures)');
}

/**
 * Récupère et met à jour les données
 */
function updateTrackingData() {
  try {
    const response = UrlFetchApp.fetch(API_URL, {
      headers: {
        'x-admin-key': ADMIN_KEY
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('API returned ' + response.getResponseCode());
    }

    const json = JSON.parse(response.getContentText());

    if (!json.success || !json.data) {
      throw new Error('Invalid API response');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feuille 1')
                  || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Clear existing data
    sheet.clear();

    // Headers
    const headers = [
      'ID', 'Email', 'Type', 'Status',
      'Créé le', 'Généré le', 'Programmé pour', 'Envoyé le',
      'Score validation', 'Tentatives', 'Erreur'
    ];

    // Format headers
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
    }

    // Color-code status column
    const statusColumn = 4; // Column D
    const statusRange = sheet.getRange(2, statusColumn, rows.length, 1);
    const statusRules = [
      { value: 'SENT', color: '#D4EDDA' },       // Vert clair
      { value: 'SCHEDULED', color: '#FFF3CD' },  // Jaune clair
      { value: 'READY', color: '#D1ECF1' },      // Bleu clair
      { value: 'GENERATING', color: '#F8D7DA' }, // Rouge clair
      { value: 'FAILED', color: '#F5C6CB' },     // Rouge
      { value: 'NEEDS_REVIEW', color: '#FFE5B4' } // Orange clair
    ];

    rows.forEach((row, index) => {
      const status = row[statusColumn - 1];
      const rule = statusRules.find(r => r.value === status);
      if (rule) {
        sheet.getRange(index + 2, statusColumn).setBackground(rule.color);
      }
    });

    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // Add timestamp
    sheet.getRange(1, headers.length + 2).setValue('Dernière mise à jour:');
    sheet.getRange(1, headers.length + 3).setValue(new Date());

    Logger.log('✅ Data updated successfully: ' + rows.length + ' rows');

  } catch (error) {
    Logger.log('❌ Error updating data: ' + error.message);
    throw error;
  }
}

/**
 * Format date for display
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
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 APEXLABS')
    .addItem('🔄 Mettre à jour maintenant', 'importDataNow')
    .addItem('⏰ Activer mise à jour auto (1h)', 'setupAutomaticUpdates')
    .addToUi();
}
```

### Étape 2: Autoriser le script

1. Cliquer sur **Enregistrer** (icône disquette)
2. Nommer le projet: "APEXLABS Tracking"
3. Fermer l'éditeur

### Étape 3: Premier import

1. Recharger le Google Sheet (F5)
2. Un nouveau menu **"📊 APEXLABS"** apparaît en haut
3. Cliquer sur **"📊 APEXLABS" → "🔄 Mettre à jour maintenant"**
4. Autoriser le script (première fois seulement)
5. Les données sont importées automatiquement!

### Étape 4: Activer les mises à jour automatiques

1. Cliquer sur **"📊 APEXLABS" → "⏰ Activer mise à jour auto (1h)"**
2. Confirmer
3. ✅ **Le sheet se mettra à jour automatiquement toutes les heures**

---

## Option 3: Endpoints API disponibles

### CSV Export (manuel)
```bash
GET /api/admin/export/tracking-csv
Headers: x-admin-key: <SECRET>
Response: CSV file download
```

### JSON Export (pour Apps Script)
```bash
GET /api/admin/export/tracking-json
Headers: x-admin-key: <SECRET>
Response: {
  success: true,
  data: [
    {
      id, email, type, status, createdAt, generatedAt,
      scheduledFor, sentAt, validationScore, attemptCount, errorMessage
    },
    ...
  ],
  total: number,
  updatedAt: string
}
```

### Stats agrégées
```bash
GET /api/admin/export/tracking-stats
Headers: x-admin-key: <SECRET>
Response: {
  success: true,
  stats: {
    totalAudits, byStatus, byType, generated, sent,
    averageValidationScore, failureRate
  }
}
```

---

## Structure des colonnes

| Colonne | Description | Exemple |
|---------|-------------|---------|
| **ID** | Identifiant court de l'audit | `3a5eac80` |
| **Email** | Email du client | `client@example.com` |
| **Type** | Type d'audit | `GRATUIT`, `PREMIUM`, `ELITE` |
| **Status** | État de livraison | `SCHEDULED`, `SENT`, `GENERATING` |
| **Créé le** | Date de création | `19/03/2026 09:18` |
| **Généré le** | Date de génération du rapport | `19/03/2026 09:25` |
| **Programmé pour** | Date de livraison prévue | `20/03/2026 09:18` |
| **Envoyé le** | Date d'envoi effectif | `20/03/2026 09:20` |
| **Score validation** | Score de qualité (0-100) | `95` |
| **Tentatives** | Nombre de tentatives de génération | `1` |
| **Erreur** | Message d'erreur si échec | `Validation failed...` |

---

## Color-coding automatique

Le script Apps Script applique des couleurs automatiques:

- 🟢 **SENT** - Vert clair (livré avec succès)
- 🟡 **SCHEDULED** - Jaune clair (en attente de livraison)
- 🔵 **READY** - Bleu clair (prêt à envoyer)
- 🟠 **GENERATING** - Rouge clair (en cours de génération)
- 🔴 **FAILED** - Rouge (échec)
- 🟠 **NEEDS_REVIEW** - Orange clair (nécessite vérification)

---

## Mise à jour recommandée

**Option 2 (Apps Script) est la meilleure solution:**
- ✅ Mise à jour automatique toutes les heures
- ✅ Bouton manuel pour refresh immédiat
- ✅ Color-coding automatique
- ✅ Timestamp de dernière mise à jour
- ✅ Aucune manipulation de fichiers CSV

**Configuration en 5 minutes, automatique ensuite!**
