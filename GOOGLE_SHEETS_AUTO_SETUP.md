# 📧 GOOGLE SHEETS EMAILS - SETUP AUTOMATIQUE

## 🎯 TU FAIS JUSTE 3 CLICS, C'EST TOUT

### ✅ ÉTAPE 1 : Ouvre ton Sheet
https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

### ✅ ÉTAPE 2 : Ouvre Apps Script
Dans le menu: **Extensions** → **Apps Script**

### ✅ ÉTAPE 3 : Copie-colle le code ci-dessous

Sélectionne TOUT le code existant (Ctrl+A), supprime-le, et colle ce code :

```javascript
/**
 * APEXLABS - AUTO-SETUP AUTOMATIQUE
 *
 * TU CLIQUES JUSTE SUR "INSTALLER" DANS LE MENU ET C'EST FINI
 */

const API_BASE_URL = 'https://apexlabs.onrender.com';

/**
 * MENU AUTOMATIQUE qui apparaît au chargement du sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 APEXLABS AUTO-SETUP')
    .addItem('✅ INSTALLER (1 clic = tout automatique)', 'installAutoUpdate')
    .addItem('🔄 Rafraîchir maintenant', 'manualRefresh')
    .addSeparator()
    .addItem('ℹ️ Status', 'showStatus')
    .addToUi();
}

/**
 * INSTALLATION AUTOMATIQUE - TU CLIQUES ET C'EST FINI
 */
function installAutoUpdate() {
  const ui = SpreadsheetApp.getUi();

  // 1. Demander le token admin (UNE SEULE FOIS)
  const result = ui.prompt(
    '🔑 Token Admin requis',
    '1. Va sur https://apexlabs.onrender.com/admin\n' +
    '2. Ouvre DevTools (F12) → Application → Cookies\n' +
    '3. Copie la valeur de "session_token"\n' +
    '4. Colle-la ci-dessous:\n',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) {
    ui.alert('❌ Installation annulée');
    return;
  }

  const token = result.getResponseText().trim();

  if (!token || token.length < 20) {
    ui.alert('❌ Token invalide (trop court)');
    return;
  }

  // 2. Sauvegarder le token de manière sécurisée
  PropertiesService.getScriptProperties().setProperty('ADMIN_TOKEN', token);

  // 3. Créer la feuille "Emails" si elle n'existe pas
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let emailSheet = ss.getSheetByName('Emails');
  if (!emailSheet) {
    emailSheet = ss.insertSheet('Emails');
  }

  // 4. Créer le trigger automatique (refresh toutes les heures)
  deleteTriggers(); // Supprimer anciens triggers
  ScriptApp.newTrigger('autoRefresh')
    .timeBased()
    .everyHours(1)
    .create();

  // 5. Premier refresh immédiat
  ui.alert('⏳ Installation en cours...\nPremier chargement des données...');

  const success = fetchAndUpdateEmails();

  if (success) {
    ui.alert(
      '✅ INSTALLATION TERMINÉE!\n\n' +
      '✅ Feuille "Emails" créée\n' +
      '✅ Données chargées\n' +
      '✅ Rafraîchissement automatique activé (toutes les heures)\n\n' +
      'Tu peux fermer cette fenêtre, tout est automatique maintenant!'
    );
  } else {
    ui.alert(
      '⚠️ Installation OK mais erreur de chargement\n\n' +
      'Vérifie ton token admin et réessaye:\n' +
      'Menu 🚀 APEXLABS AUTO-SETUP → ✅ INSTALLER'
    );
  }
}

/**
 * Rafraîchissement manuel (via menu)
 */
function manualRefresh() {
  const ui = SpreadsheetApp.getUi();

  const token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!token) {
    ui.alert('❌ Pas encore installé!\n\nClique sur: Menu → ✅ INSTALLER');
    return;
  }

  ui.alert('⏳ Chargement des données...');
  const success = fetchAndUpdateEmails();

  if (success) {
    ui.alert('✅ Données mises à jour!');
  } else {
    ui.alert('❌ Erreur lors du rafraîchissement\n\nVérifie ton token admin');
  }
}

/**
 * Rafraîchissement automatique (trigger)
 */
function autoRefresh() {
  fetchAndUpdateEmails();
}

/**
 * FONCTION PRINCIPALE - Récupère et met à jour le sheet
 */
function fetchAndUpdateEmails() {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');

    if (!token) {
      Logger.log('❌ Token non configuré');
      return false;
    }

    // Appeler l'API
    Logger.log('[APEXLABS] Fetching emails...');

    const response = UrlFetchApp.fetch(API_BASE_URL + '/api/admin/email-trackings/export/sheets', {
      method: 'GET',
      headers: {
        'Cookie': 'session_token=' + token
      },
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

    // TITRE + TIMESTAMP
    sheet.getRange(1, 1).setValue('📧 EMAIL TRACKING - APEXLABS')
      .setFontSize(14)
      .setFontWeight('bold')
      .setBackground('#FCDD00');

    sheet.getRange(1, 10).setValue('Dernière MàJ:');
    sheet.getRange(1, 11).setValue(new Date())
      .setNumberFormat('dd/MM/yyyy HH:mm');

    sheet.getRange(2, 1).setValue('Total emails: ' + data.emails.length);

    // Headers (ligne 4)
    const headers = [
      'ID', 'Type Email', 'Destinataire', 'Nom', 'Audit ID', 'Type Audit',
      'Sujet', 'Status', 'Envoyé le', 'Ouvert le', 'Cliqué le',
      'Converti le', 'Type Conversion'
    ];

    sheet.getRange(4, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#FCDD00')
      .setFontColor('#000000');

    // Data rows (à partir de ligne 5)
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

      // Color-code status column (H = colonne 8)
      for (let i = 0; i < rows.length; i++) {
        const status = rows[i][7]; // Status column
        let color = '#FFFFFF';

        if (status === 'success') color = '#D4EDDA'; // Vert
        else if (status === 'failed') color = '#F5C6CB'; // Rouge
        else if (status === 'pending') color = '#FFF3CD'; // Jaune

        sheet.getRange(5 + i, 8).setBackground(color);
      }

      // Color-code ouvertures/clics/conversions
      for (let i = 0; i < rows.length; i++) {
        // Ouvert = vert clair
        if (rows[i][9]) { // Colonne "Ouvert le"
          sheet.getRange(5 + i, 10).setBackground('#D1F2EB');
        }
        // Cliqué = vert moyen
        if (rows[i][10]) { // Colonne "Cliqué le"
          sheet.getRange(5 + i, 11).setBackground('#A9DFBF');
        }
        // Converti = vert foncé
        if (rows[i][11]) { // Colonne "Converti le"
          sheet.getRange(5 + i, 12, 1, 2).setBackground('#52BE80')
            .setFontWeight('bold');
        }
      }
    }

    // Auto-resize toutes les colonnes
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // Freeze header row
    sheet.setFrozenRows(4);

    Logger.log('✅ Sheet updated: ' + data.emails.length + ' emails');
    return true;

  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return false;
  }
}

/**
 * Format date
 */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

/**
 * Supprimer anciens triggers
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoRefresh') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * Afficher le status
 */
function showStatus() {
  const ui = SpreadsheetApp.getUi();
  const token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');

  if (!token) {
    ui.alert(
      '❌ PAS ENCORE INSTALLÉ\n\n' +
      'Clique sur:\n' +
      'Menu 🚀 APEXLABS AUTO-SETUP → ✅ INSTALLER'
    );
    return;
  }

  const triggers = ScriptApp.getProjectTriggers();
  const autoTrigger = triggers.find(t => t.getHandlerFunction() === 'autoRefresh');

  ui.alert(
    '✅ INSTALLATION ACTIVE\n\n' +
    '✅ Token admin configuré\n' +
    (autoTrigger ? '✅ Auto-refresh activé (toutes les heures)\n' : '⚠️ Auto-refresh désactivé\n') +
    '\n' +
    'Tout fonctionne automatiquement!'
  );
}
```

### ✅ ÉTAPE 4 : Sauvegarde
Clique sur **Fichier** → **Enregistrer** (ou Ctrl+S)

### ✅ ÉTAPE 5 : Retourne dans le Sheet
Ferme l'onglet Apps Script, retourne dans ton Google Sheet, et **recharge la page** (F5)

### ✅ ÉTAPE 6 : Clique sur "INSTALLER"
Attends 10 secondes, tu vas voir un nouveau menu **🚀 APEXLABS AUTO-SETUP** apparaître en haut

Clique dessus → **✅ INSTALLER (1 clic = tout automatique)**

### ✅ ÉTAPE 7 : Entre ton token
Une fenêtre s'ouvre qui te demande ton token admin.

**Comment avoir ton token (30 secondes):**
1. Ouvre https://apexlabs.onrender.com/admin dans un nouvel onglet
2. Fais clic droit → **Inspecter** (ou F12)
3. En haut, clique sur **Application** (ou **Storage**)
4. Dans la barre de gauche : **Cookies** → **https://apexlabs.onrender.com**
5. Clique sur la ligne **session_token**
6. **Copie** la valeur (c'est un long texte genre a1b2c3d4...)
7. **Colle** dans la fenêtre du Google Sheet
8. Clique **OK**

### ✅ ÉTAPE 8 : Autorise l'accès (PREMIÈRE FOIS SEULEMENT)
Google va te demander d'autoriser le script.
1. Clique **Examiner les autorisations**
2. Choisis ton compte Google
3. Clique **Paramètres avancés**
4. Clique **Accéder à [nom du projet]**
5. Clique **Autoriser**

### ✅ C'EST FINI !

Le script va :
- ✅ Créer une feuille "Emails"
- ✅ Charger toutes les données
- ✅ Activer le rafraîchissement automatique toutes les heures
- ✅ Te montrer un message "✅ INSTALLATION TERMINÉE!"

---

## 🎁 CE QUE TU AS MAINTENANT

### Feuille "Emails" avec :
- Tous les emails envoyés (J+2, J+7, J+14, etc.)
- Destinataire, sujet, status
- Dates : envoyé, ouvert, cliqué, converti
- **Couleurs automatiques** :
  - 🟢 Vert = Email ouvert/cliqué/converti
  - 🟡 Jaune = En attente
  - 🔴 Rouge = Échec

### Mise à jour automatique :
- ✅ **Toutes les heures** automatiquement
- ✅ **Bouton manuel** pour forcer la mise à jour quand tu veux

### Menu personnalisé :
- 🔄 **Rafraîchir maintenant** - Force la mise à jour
- ℹ️ **Status** - Vérifie que tout fonctionne

---

## 🐛 SI ÇA MARCHE PAS

### "Je vois pas le menu 🚀 APEXLABS AUTO-SETUP"
→ Recharge la page du Google Sheet (F5)
→ Attends 10-15 secondes

### "Erreur lors du chargement"
→ Vérifie que ton token est correct
→ Refais : Menu → ✅ INSTALLER avec un nouveau token

### "Token invalide"
→ Le token a peut-être expiré
→ Récupère un nouveau token (étape 7)
→ Refais : Menu → ✅ INSTALLER

---

## ✅ TOTAL : 8 CLICS ET C'EST FINI

Après c'est 100% automatique, tu touches plus à rien !
