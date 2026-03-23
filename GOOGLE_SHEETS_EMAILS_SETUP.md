# 📧 GOOGLE SHEETS - TRACKING EMAILS RELANCE

**Objectif:** Tracker TOUS les emails de relance (J+1, J+3, J+7, J+14) + conversions dans Google Sheets

**Sheet URL:** https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

---

## 🎯 CE QUI EST TRACKÉ

### Emails de Relance Automatiques
1. **Discovery (GRATUIT)**
   - J+2: `sendGratuitUpsellEmail` - Upsell vers Anabolic/Ultimate

2. **Anabolic/Ultimate (PREMIUM/ELITE)**
   - J+7: `sendPremiumJ7Email` - Demande avis + coaching
   - J+14: `sendPremiumJ14Email` - Dernière chance coaching (si J+7 non ouvert)

### Métriques Trackées
- Type d'email envoyé
- Destinataire
- Audit associé
- Date d'envoi
- Status SendPulse (success/failed)
- Ouverture (timestamp)
- Clic (timestamp)
- Conversion (timestamp + type)

---

## 📊 STRUCTURE GOOGLE SHEETS

### Feuille 1: "Audits"
Colonnes existantes (tracking audits)

### Feuille 2: "Emails" ← **À CRÉER**
| Colonne | Description | Exemple |
|---------|-------------|---------|
| ID | ID court email | a1b2c3d4 |
| Type | Type d'email | sendGratuitUpsellEmail |
| Email | Destinataire | client@example.com |
| Nom | Nom destinataire | Jean Dupont |
| Audit ID | ID audit associé | abc123 |
| Type Audit | Type audit | GRATUIT |
| Subject | Sujet email | Ton Discovery Scan est prêt |
| Status | Status SendPulse | success |
| Envoyé le | Timestamp envoi | 23/03/2026 10:30 |
| Ouvert le | Timestamp ouverture | 23/03/2026 14:20 |
| Cliqué le | Timestamp clic | 23/03/2026 14:25 |
| Converti le | Timestamp conversion | 23/03/2026 15:00 |
| Type Conversion | Type conversion | ultimate_purchase |

---

## 🔧 SETUP - Apps Script Google Sheets

### Étape 1: Créer le Script

1. Ouvrir le Google Sheet
2. **Extensions** → **Apps Script**
3. Copier-coller le code ci-dessous
4. **Fichier** → **Enregistrer**

```javascript
/**
 * APEXLABS - Email Tracking Google Sheets Auto-Update
 *
 * Fetch les emails depuis l'API et met à jour le sheet automatiquement
 */

const API_BASE_URL = 'https://apexlabs.onrender.com';
const ADMIN_AUTH_TOKEN = 'YOUR_ADMIN_SESSION_TOKEN_HERE'; // À remplacer

/**
 * Fonction appelée pour mettre à jour les données
 */
function updateEmailTracking() {
  try {
    Logger.log('[APEXLABS] Fetching email tracking data...');

    const response = UrlFetchApp.fetch(API_BASE_URL + '/api/admin/email-trackings/export/sheets', {
      method: 'GET',
      headers: {
        'Cookie': `session_token=${ADMIN_AUTH_TOKEN}`
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('[ERROR] API returned: ' + response.getResponseCode());
      return;
    }

    const data = JSON.parse(response.getContentText());

    if (!data.success || !data.emails) {
      Logger.log('[ERROR] Invalid response format');
      return;
    }

    // Obtenir ou créer la feuille "Emails"
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Emails');

    if (!sheet) {
      sheet = ss.insertSheet('Emails');
    }

    // Clear existing data
    sheet.clear();

    // Headers
    const headers = [
      'ID', 'Type', 'Email', 'Nom', 'Audit ID', 'Type Audit',
      'Subject', 'Status', 'Envoyé le', 'Ouvert le', 'Cliqué le',
      'Converti le', 'Type Conversion'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#FCDD00');

    // Data rows
    const rows = data.emails.map(email => [
      email.id.substring(0, 8),
      email.emailType,
      email.recipientEmail,
      email.recipientName || '',
      email.auditId ? email.auditId.substring(0, 8) : '',
      email.auditType || '',
      email.subject || '',
      email.sendpulseStatus || 'pending',
      email.sentAt ? formatDate(email.sentAt) : '',
      email.opened ? formatDate(email.opened) : '',
      email.clicked ? formatDate(email.clicked) : '',
      email.converted ? formatDate(email.converted) : '',
      email.conversionType || ''
    ]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // Add summary at top
    const summary = [
      ['📧 EMAIL TRACKING - APEXLABS'],
      ['Total emails: ' + data.emails.length],
      ['Dernière mise à jour: ' + new Date().toLocaleString('fr-FR')],
      ['']
    ];

    sheet.insertRowsBefore(1, summary.length);
    sheet.getRange(1, 1, summary.length, 1).setValues(summary);
    sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');

    Logger.log('[SUCCESS] Updated ' + data.emails.length + ' emails');

  } catch (error) {
    Logger.log('[ERROR] ' + error.toString());
  }
}

/**
 * Format date pour affichage
 */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

/**
 * Créer un trigger automatique (toutes les heures)
 */
function createHourlyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Create new hourly trigger
  ScriptApp.newTrigger('updateEmailTracking')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('[SUCCESS] Hourly trigger created');
}

/**
 * Menu personnalisé
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 APEXLABS')
    .addItem('🔄 Mettre à jour les emails', 'updateEmailTracking')
    .addItem('⚙️ Activer mise à jour auto (1h)', 'createHourlyTrigger')
    .addToUi();
}
```

### Étape 2: Configurer le Token

1. Dans le script, remplacer `YOUR_ADMIN_SESSION_TOKEN_HERE` par ton token admin
2. Pour obtenir le token:
   - Aller sur https://apexlabs.onrender.com/admin
   - DevTools → Application → Cookies
   - Copier la valeur de `session_token`

### Étape 3: Activer les Mises à Jour Auto

1. Dans Google Sheets, menu **📧 APEXLABS**
2. Cliquer **⚙️ Activer mise à jour auto (1h)**
3. Autoriser le script (première fois uniquement)

---

## 🌐 ENDPOINT API

### GET /api/admin/email-trackings/export/sheets

**Auth:** Cookie `session_token` admin requis

**Réponse:**
```json
{
  "success": true,
  "emails": [
    {
      "id": "a1b2c3d4",
      "emailType": "sendGratuitUpsellEmail",
      "recipientEmail": "client@example.com",
      "recipientName": "Jean Dupont",
      "auditId": "abc123",
      "auditType": "GRATUIT",
      "subject": "Ton Discovery Scan est prêt",
      "sendpulseStatus": "success",
      "sentAt": "2026-03-23T10:30:00Z",
      "opened": "2026-03-23T14:20:00Z",
      "clicked": "2026-03-23T14:25:00Z",
      "converted": "2026-03-23T15:00:00Z",
      "conversionType": "ultimate_purchase"
    }
  ],
  "stats": {
    "totalSent": 142,
    "successRate": 98.5,
    "openRate": 42.3,
    "clickRate": 18.7,
    "conversionRate": 5.2
  }
}
```

---

## 📈 ANALYTICS DISPONIBLES

### Vue d'ensemble
- Total emails envoyés
- Taux de succès SendPulse
- Taux d'ouverture
- Taux de clic
- Taux de conversion

### Par Type d'Email
- sendGratuitUpsellEmail (J+2 Discovery)
- sendPremiumJ7Email (J+7 Anabolic/Ultimate)
- sendPremiumJ14Email (J+14 si J+7 non ouvert)
- sendReportReadyEmail (email initial rapport prêt)
- etc.

### Par Audit
- Tous les emails envoyés pour un audit donné
- Timeline des interactions
- Conversion finale

---

## 🎯 OBJECTIF: CONVERSION

**Métriques Clés à Surveiller:**

1. **Taux d'ouverture J+2 Discovery** (objectif: >40%)
   - Si faible → améliorer subject line

2. **Taux de clic J+2 Discovery** (objectif: >20%)
   - Si faible → améliorer CTAs dans email

3. **Conversion Discovery → Ultimate/Anabolic** (objectif: >5%)
   - Tracker les conversions depuis emails vs rapport web

4. **J+7 Anabolic/Ultimate opened** (objectif: >50%)
   - Si faible → segment non engagé

5. **J+14 recovery rate** (objectif: >10% des J+7 non-ouverts)
   - Dernière chance coaching

---

## 🔄 FRÉQUENCE MISE À JOUR

- **Automatique:** Toutes les heures (via trigger Apps Script)
- **Manuel:** Menu Google Sheets → 📧 APEXLABS → 🔄 Mettre à jour

---

## 🐛 TROUBLESHOOTING

### "Error fetching data"
- Vérifier le token admin est valide
- Vérifier l'API est accessible
- Vérifier logs Apps Script: **Extensions** → **Apps Script** → **Exécutions**

### "Unauthorized"
- Token expiré, obtenir un nouveau token admin
- Remplacer dans le script et sauvegarder

### Données manquantes
- Vérifier l'endpoint API retourne bien les données
- Test manuel: `curl -H "Cookie: session_token=..." https://apexlabs.onrender.com/api/admin/email-trackings/export/sheets`

---

## ✅ CHECKLIST SETUP

- [ ] Apps Script créé dans Google Sheets
- [ ] Token admin configuré dans le script
- [ ] Script testé manuellement (▶️ Run)
- [ ] Trigger automatique activé (1h)
- [ ] Feuille "Emails" créée avec données
- [ ] Colonnes lisibles et formatées
- [ ] Menu personnalisé "📧 APEXLABS" visible

---

**Setup réalisé par:** Claude Code
**Date:** 23 mars 2026
**Status:** ✅ **PRÊT À CONFIGURER**
