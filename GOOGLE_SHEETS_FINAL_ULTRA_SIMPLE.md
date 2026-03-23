# 📧 GOOGLE SHEETS - SETUP FINAL ULTRA-SIMPLE

## 🎯 TU FAIS 3 CLICS ET C'EST FINI POUR TOUJOURS

### ✅ ÉTAPE 1 : Ouvre le Google Sheet
https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

### ✅ ÉTAPE 2 : Ouvre Apps Script
Menu : **Extensions** → **Apps Script**

### ✅ ÉTAPE 3 : Copie-colle CE CODE (tout remplacer)

Supprime tout ce qu'il y a (Ctrl+A puis Suppr), et colle :

```javascript
/**
 * APEXLABS - AUTO-UPDATE EMAILS
 *
 * 100% AUTOMATIQUE - Aucune configuration nécessaire
 * Se met à jour toutes les heures automatiquement
 */

const API_URL = 'https://apexlabs.onrender.com/api/export/emails-for-sheets';
const READ_TOKEN = 'apexlabs_sheets_readonly_2026';

/**
 * Menu automatique qui apparaît au chargement
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 APEXLABS')
    .addItem('✅ ACTIVER AUTO-UPDATE (1 clic)', 'activerAutoUpdate')
    .addItem('🔄 Rafraîchir maintenant', 'manuelRefresh')
    .addSeparator()
    .addItem('ℹ️ Status', 'afficherStatus')
    .addToUi();
}

/**
 * ACTIVER AUTO-UPDATE - TU CLIQUES UNE FOIS ET C'EST FINI
 */
function activerAutoUpdate() {
  const ui = SpreadsheetApp.getUi();

  // Supprimer anciens triggers
  supprimerTriggers();

  // Créer trigger horaire
  ScriptApp.newTrigger('autoRefresh')
    .timeBased()
    .everyHours(1)
    .create();

  // Marquer comme activé
  PropertiesService.getScriptProperties().setProperty('AUTO_UPDATE_ACTIVE', 'true');

  // Premier refresh
  ui.alert('⏳ Activation en cours...\nPremier chargement des données...');

  const success = fetchAndUpdate();

  if (success) {
    ui.alert(
      '✅ AUTO-UPDATE ACTIVÉ!\n\n' +
      '✅ Données chargées\n' +
      '✅ Rafraîchissement automatique activé (toutes les heures)\n\n' +
      'C\'est FINI, tu touches plus à rien!\n' +
      'Le sheet se met à jour automatiquement maintenant.'
    );
  } else {
    ui.alert('⚠️ Erreur lors du chargement\n\nRéessaye dans 1 minute');
  }
}

/**
 * Rafraîchissement manuel
 */
function manuelRefresh() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('⏳ Chargement...');

  const success = fetchAndUpdate();

  if (success) {
    ui.alert('✅ Données mises à jour!');
  } else {
    ui.alert('❌ Erreur lors du rafraîchissement');
  }
}

/**
 * Rafraîchissement automatique (trigger)
 */
function autoRefresh() {
  fetchAndUpdate();
}

/**
 * FONCTION PRINCIPALE - Récupère et met à jour
 */
function fetchAndUpdate() {
  try {
    Logger.log('[APEXLABS] Fetching emails...');

    const response = UrlFetchApp.fetch(API_URL + '?token=' + READ_TOKEN, {
      method: 'GET',
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('❌ API error: ' + response.getResponseCode());
      return false;
    }

    const data = JSON.parse(response.getContentText());

    if (!data.success || !data.emails) {
      Logger.log('❌ Invalid response');
      return false;
    }

    // Obtenir la feuille "Emails"
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Emails');

    if (!sheet) {
      sheet = ss.insertSheet('Emails');
    }

    // Clear
    sheet.clear();

    // TITRE
    sheet.getRange(1, 1, 1, 13)
      .merge()
      .setValue('📧 EMAIL TRACKING - APEXLABS')
      .setFontSize(14)
      .setFontWeight('bold')
      .setBackground('#FCDD00')
      .setHorizontalAlignment('center');

    // Stats
    sheet.getRange(2, 1).setValue('Total emails: ' + data.emails.length);
    sheet.getRange(2, 6).setValue('Dernière MàJ: ' + new Date().toLocaleString('fr-FR'));

    // Headers (ligne 4)
    const headers = [
      'ID', 'Type Email', 'Destinataire', 'Nom', 'Audit ID', 'Type Audit',
      'Sujet', 'Status', 'Envoyé le', 'Ouvert le', 'Cliqué le',
      'Converti le', 'Type Conversion'
    ];

    sheet.getRange(4, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#FCDD00')
      .setFontColor('#000000');

    // Data rows (ligne 5+)
    if (data.emails.length > 0) {
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

      sheet.getRange(5, 1, rows.length, headers.length).setValues(rows);

      // Couleurs automatiques
      for (let i = 0; i < rows.length; i++) {
        const row = 5 + i;

        // Status column (colonne 8)
        const status = rows[i][7];
        if (status === 'success') {
          sheet.getRange(row, 8).setBackground('#D4EDDA'); // Vert
        } else if (status === 'failed') {
          sheet.getRange(row, 8).setBackground('#F5C6CB'); // Rouge
        } else {
          sheet.getRange(row, 8).setBackground('#FFF3CD'); // Jaune
        }

        // Ouvert = vert clair
        if (rows[i][9]) {
          sheet.getRange(row, 10).setBackground('#D1F2EB');
        }

        // Cliqué = vert moyen
        if (rows[i][10]) {
          sheet.getRange(row, 11).setBackground('#A9DFBF');
        }

        // Converti = vert foncé + gras
        if (rows[i][11]) {
          sheet.getRange(row, 12, 1, 2)
            .setBackground('#52BE80')
            .setFontWeight('bold')
            .setFontColor('#FFFFFF');
        }
      }
    }

    // Auto-resize
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // Freeze header
    sheet.setFrozenRows(4);

    Logger.log('✅ Sheet updated: ' + data.emails.length + ' emails');
    return true;

  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return false;
  }
}

/**
 * Format date français
 */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

/**
 * Supprimer anciens triggers
 */
function supprimerTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoRefresh') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * Afficher status
 */
function afficherStatus() {
  const ui = SpreadsheetApp.getUi();
  const active = PropertiesService.getScriptProperties().getProperty('AUTO_UPDATE_ACTIVE');

  if (active === 'true') {
    const triggers = ScriptApp.getProjectTriggers();
    const autoTrigger = triggers.find(t => t.getHandlerFunction() === 'autoRefresh');

    ui.alert(
      '✅ AUTO-UPDATE ACTIF\n\n' +
      (autoTrigger ? '✅ Rafraîchissement automatique: toutes les heures\n' : '⚠️ Trigger manquant (réactive avec le bouton)\n') +
      '\n' +
      'Tout fonctionne automatiquement!'
    );
  } else {
    ui.alert(
      '⚠️ AUTO-UPDATE PAS ENCORE ACTIVÉ\n\n' +
      'Clique sur:\n' +
      'Menu 📧 APEXLABS → ✅ ACTIVER AUTO-UPDATE'
    );
  }
}
```

### ✅ ÉTAPE 4 : Sauvegarde
**Fichier** → **Enregistrer** (ou Ctrl+S)

### ✅ ÉTAPE 5 : Retourne dans le Sheet
Ferme Apps Script, retourne dans le Sheet, **recharge** la page (F5)

### ✅ ÉTAPE 6 : Clique sur "ACTIVER AUTO-UPDATE"
Attends 10 secondes → tu vois le menu **📧 APEXLABS**

Clique → **✅ ACTIVER AUTO-UPDATE (1 clic)**

### ✅ ÉTAPE 7 : Autorise (PREMIÈRE FOIS SEULEMENT)
Google demande autorisation :
1. **Examiner les autorisations**
2. Choisis ton compte
3. **Paramètres avancés**
4. **Accéder à [projet]**
5. **Autoriser**

### ✅ C'EST FINI POUR TOUJOURS !

Message "✅ AUTO-UPDATE ACTIVÉ!" → **TOUT EST AUTOMATIQUE MAINTENANT**

---

## 🎁 CE QUE TU AS

✅ Feuille "Emails" qui se remplit automatiquement
✅ Toutes les heures, données actualisées
✅ Couleurs automatiques :
   - 🟢 Vert = Ouvert/Cliqué/Converti
   - 🟡 Jaune = En attente
   - 🔴 Rouge = Échec

✅ Bouton manuel si tu veux forcer le refresh

---

## 🚀 TOTAL : 7 ÉTAPES = 2 MINUTES

Après c'est **100% AUTOMATIQUE À VIE**

Tu touches plus jamais à rien, le sheet se met à jour tout seul !
