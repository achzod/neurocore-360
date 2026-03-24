const fs = require('fs');

console.log('🔍 ANALYSE SENDPULSE - HISTORIQUE COMPLET');
console.log('━'.repeat(100));
console.log('');

// Parse SendPulse CSV (separator is ; not ,)
const csv = fs.readFileSync('/tmp/sendpulse_history.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

console.log(`📊 Total lignes CSV: ${lines.length}`);
console.log('');

const headers = lines[0].split(';');
const emails = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (cols.length >= 4 && cols[3]) {
    const email = cols[3].toLowerCase().trim();
    const date = cols[1];
    const subject = cols[4] || '';
    const status = cols[6] || '';

    // Skip admin emails
    if (email === 'coaching@achzodcoaching.com' ||
        email === 'achzodyt@gmail.com' ||
        email === 'achkou@gmail.com' ||
        email.includes('@achzodcoaching.com') ||
        email.includes('@test.com')) {
      continue;
    }

    emails.push({
      email,
      date,
      subject,
      status,
      delivered: status.toLowerCase().includes('delivered')
    });
  }
}

console.log(`📧 Total emails (hors admin/test): ${emails.length}`);
console.log('');

// Count by status
const byStatus = {};
emails.forEach(e => {
  byStatus[e.status] = (byStatus[e.status] || 0) + 1;
});

console.log('📊 BREAKDOWN PAR STATUS:');
Object.keys(byStatus).sort().forEach(status => {
  console.log(`   ${status}: ${byStatus[status]}`);
});
console.log('');

// Count delivered
const delivered = emails.filter(e => e.delivered);
console.log(`✅ Emails délivrés: ${delivered.length} (${((delivered.length / emails.length) * 100).toFixed(1)}%)`);
console.log('');

// Get unique recipients
const uniqueEmails = new Set(emails.map(e => e.email));
console.log(`👥 Destinataires uniques: ${uniqueEmails.size}`);
console.log('');

// Analyze by subject type
const bySubject = {};
emails.forEach(e => {
  let type = 'OTHER';
  if (e.subject.includes('Discovery Scan')) type = 'DISCOVERY_SCAN';
  else if (e.subject.includes('Scan Anabolique')) type = 'ANABOLIC_SCAN';
  else if (e.subject.includes('Ultimate Scan')) type = 'ULTIMATE_SCAN';
  else if (e.subject.includes('Acces a ton espace')) type = 'ACCESS_LINK';
  else if (e.subject.includes('active ton code')) type = 'PROMO_CODE';
  else if (e.subject.includes('Nouvelle analyse')) type = 'ADMIN_NOTIF';

  bySubject[type] = (bySubject[type] || 0) + 1;
});

console.log('📊 BREAKDOWN PAR TYPE DE MAIL:');
Object.keys(bySubject).sort((a, b) => bySubject[b] - bySubject[a]).forEach(type => {
  console.log(`   ${type}: ${bySubject[type]}`);
});
console.log('');

// Filter only audit reports (Discovery, Anabolic, Ultimate)
const auditReports = emails.filter(e =>
  e.subject.includes('Discovery Scan') ||
  e.subject.includes('Scan Anabolique') ||
  e.subject.includes('Ultimate Scan')
);

console.log('━'.repeat(100));
console.log('📊 EMAILS DE RAPPORTS D\'AUDIT UNIQUEMENT:');
console.log('━'.repeat(100));
console.log('');
console.log(`📧 Total rapports envoyés: ${auditReports.length}`);
console.log(`✅ Rapports délivrés: ${auditReports.filter(e => e.delivered).length}`);
console.log(`👥 Clients uniques ayant reçu rapport: ${new Set(auditReports.map(e => e.email)).size}`);
console.log('');

// Group by date
const byDate = {};
auditReports.forEach(e => {
  const date = e.date.substring(0, 10);
  if (!byDate[date]) byDate[date] = [];
  byDate[date].push(e);
});

console.log('📅 BREAKDOWN PAR DATE (rapports uniquement):');
Object.keys(byDate).sort().forEach(date => {
  const emails = byDate[date];
  const uniqueRecipients = new Set(emails.map(e => e.email)).size;
  console.log(`   ${date}: ${emails.length} emails → ${uniqueRecipients} clients uniques`);
});
console.log('');

// Load orders
const orders = JSON.parse(fs.readFileSync('/tmp/orders_march17.json', 'utf8'));
const orderEmails = new Set(orders.map(o => o.email.toLowerCase().trim()));

console.log('━'.repeat(100));
console.log('🔍 COMPARAISON SENDPULSE vs COMMANDES:');
console.log('━'.repeat(100));
console.log('');

const sendpulseEmails = new Set(auditReports.map(e => e.email));

const inOrdersNotInSendpulse = [...orderEmails].filter(e => !sendpulseEmails.has(e));
const inSendpulseNotInOrders = [...sendpulseEmails].filter(e => !orderEmails.has(e));

console.log(`📦 Commandes payées: ${orderEmails.size}`);
console.log(`📧 Rapports envoyés (SendPulse): ${sendpulseEmails.size}`);
console.log(`🔴 Dans commandes mais PAS dans SendPulse: ${inOrdersNotInSendpulse.length}`);
console.log(`⚠️  Dans SendPulse mais PAS dans commandes: ${inSendpulseNotInOrders.length}`);
console.log('');

if (inOrdersNotInSendpulse.length > 0) {
  console.log('━'.repeat(100));
  console.log('🔴 CLIENTS PAYANTS MAIS PAS D\'EMAIL SENDPULSE:');
  console.log('━'.repeat(100));
  console.log('');

  // Group by date
  const missingByDate = {};
  inOrdersNotInSendpulse.forEach(email => {
    const order = orders.find(o => o.email.toLowerCase() === email);
    if (order) {
      const date = order.createdAt.substring(0, 10);
      if (!missingByDate[date]) missingByDate[date] = [];
      missingByDate[date].push(email);
    }
  });

  Object.keys(missingByDate).sort().forEach(date => {
    const day = date.substring(8, 10);
    console.log(`📅 ${day} mars: ${missingByDate[date].length} clients`);
  });
  console.log('');
  console.log(`TOTAL: ${inOrdersNotInSendpulse.length} clients n'ont JAMAIS reçu d'email SendPulse`);
  console.log('');
}

// Save results
fs.writeFileSync('/tmp/sendpulse_analysis.json', JSON.stringify({
  totalEmails: emails.length,
  delivered: delivered.length,
  uniqueRecipients: uniqueEmails.size,
  auditReports: auditReports.length,
  auditReportRecipients: sendpulseEmails.size,
  inOrdersNotInSendpulse,
  inSendpulseNotInOrders,
  byDate,
  bySubject
}, null, 2));

console.log('━'.repeat(100));
console.log('📄 FICHIER GÉNÉRÉ: /tmp/sendpulse_analysis.json');
console.log('━'.repeat(100));
console.log('');
