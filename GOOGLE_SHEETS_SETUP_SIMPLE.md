# 📧 GOOGLE SHEETS - SETUP ULTRA SIMPLE

**Objectif:** Voir TOUS les emails de relance (J+2, J+7, J+14) automatiquement dans Google Sheets

---

## 🎯 RÉSULTAT FINAL

Tu vas avoir une feuille "Emails" dans ton Google Sheet qui se met à jour toute seule toutes les heures avec :
- Tous les emails envoyés
- Qui les a reçus
- S'ils ont été ouverts
- S'ils ont cliqué
- S'ils ont acheté

**Lien du Sheet:** https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit

---

## 📋 ÉTAPE 1 : OUVRIR LE GOOGLE SHEET

1. Clique sur ce lien : https://docs.google.com/spreadsheets/d/1DihvbVfke7wFtmHN7N2Q9gEicIN9bnzGTZEqhXXwQRQ/edit
2. Normalement tu vois déjà une feuille "Audits" avec tous tes audits

---

## 📋 ÉTAPE 2 : OUVRIR L'ÉDITEUR DE SCRIPT

1. Dans le menu du haut, clique sur **Extensions**
2. Puis clique sur **Apps Script**
3. Une nouvelle page s'ouvre avec un éditeur de code (comme VSCode mais en ligne)

---

## 📋 ÉTAPE 3 : RÉCUPÉRER TON TOKEN ADMIN

**C'est le truc le plus important, c'est comme un mot de passe pour que le script puisse accéder à l'API**

### Comment avoir ton token :

1. Ouvre https://apexlabs.achzodcoaching.com/admin dans un nouvel onglet
2. Connecte-toi si nécessaire
3. Fais **clic droit** n'importe où → **Inspecter** (ou F12)
4. En haut de la fenêtre qui s'ouvre, clique sur **Application** (ou **Storage** selon ton navigateur)
5. Dans la barre de gauche, clique sur **Cookies** → **https://apexlabs.achzodcoaching.com**
6. Trouve la ligne qui s'appelle **session_token**
7. Clique sur la valeur (ça ressemble à un truc genre `a1b2c3d4e5f6...`)
8. Fais **Ctrl+C** (ou Cmd+C sur Mac) pour copier

**🚨 IMPORTANT:** Ne partage JAMAIS ce token, c'est ton accès admin !

---

## 📋 ÉTAPE 4 : COLLER LE CODE DANS APPS SCRIPT

1. Retourne dans l'onglet **Apps Script** (étape 2)
2. Tu vois un éditeur avec du code par défaut
3. **SUPPRIME TOUT** ce qu'il y a (Ctrl+A puis Suppr)
4. **COPIE-COLLE** le code ci-dessous :

```javascript
/**
 * APEXLABS - Email Tracking Google Sheets Auto-Update
 */

const API_BASE_URL = 'https://apexlabs.achzodcoaching.com';
const ADMIN_AUTH_TOKEN = 'COLLE_TON_TOKEN_ICI'; // ← REMPLACE PAR TON TOKEN

/**
 * Fonction pour mettre à jour les emails
 */
function updateEmailTracking() {
  try {
    Logger.log('[APEXLABS] Fetching email tracking data...');

    const response = UrlFetchApp.fetch(API_BASE_URL + '/api/admin/email-trackings/export/sheets', {
      method: 'GET',
      headers: {
        'Cookie': 'session_token=' + ADMIN_AUTH_TOKEN
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('[ERROR] API returned: ' + response.getResponseCode());
      SpreadsheetApp.getUi().alert('Erreur API: ' + response.getResponseCode() + '\n\nVérifie ton token admin !');
      return;
    }

    const data = JSON.parse(response.getContentText());

    if (!data.success || !data.emails) {
      Logger.log('[ERROR] Invalid response format');
      SpreadsheetApp.getUi().alert('Erreur: Réponse API invalide');
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

    // Headers (ligne 1)
    const headers = [
      'ID', 'Type Email', 'Email Destinataire', 'Nom', 'Audit ID', 'Type Audit',
      'Sujet', 'Status', 'Envoyé le', 'Ouvert le', 'Cliqué le',
      'Converti le', 'Type Conversion'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#FCDD00');

    // Data rows (à partir de ligne 2)
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

    Logger.log('[SUCCESS] Updated ' + data.emails.length + ' emails');
    SpreadsheetApp.getUi().alert('✅ Mis à jour: ' + data.emails.length + ' emails');

  } catch (error) {
    Logger.log('[ERROR] ' + error.toString());
    SpreadsheetApp.getUi().alert('❌ Erreur: ' + error.toString());
  }
}

/**
 * Format date pour affichage français
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
  SpreadsheetApp.getUi().alert('✅ Mise à jour automatique activée (toutes les heures)');
}

/**
 * Menu personnalisé
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 APEXLABS')
    .addItem('🔄 Mettre à jour maintenant', 'updateEmailTracking')
    .addItem('⚙️ Activer mise à jour auto (1h)', 'createHourlyTrigger')
    .addToUi();
}
```

5. Dans le code, trouve la ligne :
```javascript
const ADMIN_AUTH_TOKEN = 'COLLE_TON_TOKEN_ICI';
```

6. Remplace `COLLE_TON_TOKEN_ICI` par ton token de l'étape 3
   - Garde bien les guillemets `'` avant et après !
   - Ça doit ressembler à : `const ADMIN_AUTH_TOKEN = 'a1b2c3d4e5f6...';`

7. Clique sur **Fichier** → **Enregistrer** (ou Ctrl+S)

---

## 📋 ÉTAPE 5 : TESTER LE SCRIPT

1. En haut de l'éditeur, tu vois une liste déroulante avec "updateEmailTracking"
2. Clique sur le bouton **▶️ Exécuter** (Run) juste à côté
3. **PREMIÈRE FOIS SEULEMENT:** Google va te demander d'autoriser le script
   - Clique sur "Examiner les autorisations"
   - Choisis ton compte Google
   - Clique sur "Paramètres avancés"
   - Clique sur "Accéder à [nom du projet] (non sécurisé)"
   - Clique sur "Autoriser"
4. Le script s'exécute (attends 5-10 secondes)
5. Une popup apparaît : "✅ Mis à jour: X emails"

**Si ça marche pas:**
- Vérifie que ton token est correct
- Vérifie qu'il n'y a pas d'espaces avant/après le token
- Regarde les logs : **Affichage** → **Journaux** (ou Logs)

---

## 📋 ÉTAPE 6 : ACTIVER LA MISE À JOUR AUTOMATIQUE

1. Retourne dans le Google Sheet (pas Apps Script)
2. Recharge la page (F5)
3. Tu vois maintenant un nouveau menu **📧 APEXLABS** en haut
4. Clique dessus → **⚙️ Activer mise à jour auto (1h)**
5. Une popup apparaît : "✅ Mise à jour automatique activée"

**C'est bon !** Maintenant le sheet se met à jour tout seul toutes les heures.

---

## 📋 ÉTAPE 7 : VÉRIFIER QUE ÇA MARCHE

1. Dans ton Google Sheet, tu dois voir une nouvelle feuille **"Emails"** en bas
2. Clique dessus
3. Tu vois toutes les colonnes :
   - ID | Type Email | Email Destinataire | Nom | etc.
4. Et toutes les lignes avec les emails envoyés

**Pour mettre à jour manuellement à tout moment:**
- Menu **📧 APEXLABS** → **🔄 Mettre à jour maintenant**

---

## ✅ C'EST FINI !

Maintenant tu as :
- ✅ Une feuille "Emails" qui se remplit automatiquement
- ✅ Mise à jour toutes les heures
- ✅ Bouton pour mettre à jour manuellement quand tu veux
- ✅ Toutes les infos : envoyé, ouvert, cliqué, converti

---

## 🐛 PROBLÈMES ?

### "Erreur API: 401"
→ Ton token est expiré ou incorrect
→ Refais l'étape 3 pour avoir un nouveau token
→ Remplace dans le script et sauvegarde

### "Erreur API: 500"
→ L'API a un problème
→ Attends 5 minutes et réessaie
→ Ou contacte-moi

### Je vois pas le menu "📧 APEXLABS"
→ Recharge la page Google Sheets (F5)
→ Attends 10 secondes que le menu apparaisse

### La feuille "Emails" est vide
→ Peut-être qu'il n'y a pas encore d'emails envoyés
→ Ou l'API ne retourne rien
→ Teste en créant un nouveau Discovery Scan

---

**Besoin d'aide ?** Appelle-moi et on fait ça ensemble en partage d'écran !
