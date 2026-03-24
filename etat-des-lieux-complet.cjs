const fs = require('fs');

console.log('🔍 ÉTAT DES LIEUX COMPLET - JOUR PAR JOUR - CLIENT PAR CLIENT');
console.log('━'.repeat(100));
console.log('');

// Load all data
const orders = JSON.parse(fs.readFileSync('/tmp/orders_march17.json', 'utf8'));
const auditsData = JSON.parse(fs.readFileSync('/tmp/all_audits.json', 'utf8'));
const audits = auditsData.audits;

// Parse Google Sheet
const csv = fs.readFileSync('/tmp/google_sheet_emails.csv', 'utf8');
const sheetLines = csv.split('\n').filter(l => l.trim());
const sheetData = [];

for (let i = 1; i < sheetLines.length - 2; i++) {
  const cols = sheetLines[i].split(',');
  if (cols.length >= 4 && cols[1]) {
    sheetData.push({
      id: cols[0],
      email: cols[1].toLowerCase().trim(),
      status: cols[3],
      cree: cols[4],
      envoye: cols[7]
    });
  }
}

// Create maps for fast lookup
const auditMap = new Map();
audits.forEach(a => auditMap.set(a.id, a));

const sheetMap = new Map();
sheetData.forEach(s => sheetMap.set(s.email, s));

// Process each order
const byDate = {};
const fullReport = [];

orders.forEach(order => {
  const date = order.createdAt.substring(0, 10);
  const day = date.substring(8, 10);

  if (!byDate[date]) {
    byDate[date] = {
      date,
      day,
      orders: [],
      total: 0,
      withAudit: 0,
      auditExists: 0,
      auditMissing: 0,
      emailSent: 0,
      emailScheduled: 0,
      emailReady: 0,
      noEmail: 0
    };
  }

  // Check audit
  const audit = order.auditId ? auditMap.get(order.auditId) : null;
  const auditExists = !!audit;
  const auditStatus = audit ? audit.reportDeliveryStatus : 'NO_AUDIT';

  // Check email in sheet
  const sheet = sheetMap.get(order.email.toLowerCase());
  const inSheet = !!sheet;
  const sheetStatus = sheet ? sheet.status : 'NOT_IN_SHEET';
  const emailSent = sheet && sheet.status === 'SENT';

  // Status final
  let finalStatus = 'UNKNOWN';
  if (emailSent) {
    finalStatus = 'EMAIL_SENT';
  } else if (inSheet && (sheetStatus === 'SCHEDULED' || sheetStatus === 'READY')) {
    finalStatus = 'EMAIL_PENDING';
  } else if (auditExists && auditStatus === 'SENT') {
    finalStatus = 'AUDIT_SENT_BUT_NO_SHEET';
  } else if (auditExists && (auditStatus === 'SCHEDULED' || auditStatus === 'READY')) {
    finalStatus = 'AUDIT_PENDING';
  } else if (auditExists) {
    finalStatus = 'AUDIT_EXISTS_NO_EMAIL';
  } else if (order.auditId) {
    finalStatus = 'AUDIT_MISSING';
  } else {
    finalStatus = 'NO_AUDIT_ID';
  }

  const record = {
    date,
    day,
    email: order.email,
    productType: order.productType,
    orderId: order.id,
    auditId: order.auditId || 'NULL',
    auditExists,
    auditStatus,
    inSheet,
    sheetStatus,
    emailSent,
    finalStatus,
    createdAt: order.createdAt
  };

  byDate[date].orders.push(record);
  byDate[date].total++;

  if (order.auditId) byDate[date].withAudit++;
  if (auditExists) byDate[date].auditExists++;
  if (!auditExists && order.auditId) byDate[date].auditMissing++;
  if (emailSent) byDate[date].emailSent++;
  if (sheetStatus === 'SCHEDULED') byDate[date].emailScheduled++;
  if (sheetStatus === 'READY') byDate[date].emailReady++;
  if (!inSheet) byDate[date].noEmail++;

  fullReport.push(record);
});

// Print report by date
console.log('📅 RAPPORT JOUR PAR JOUR');
console.log('━'.repeat(100));
console.log('');

Object.keys(byDate).sort().forEach(date => {
  const d = byDate[date];
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📅 ${d.day} MARS 2026`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📦 Total commandes: ${d.total}`);
  console.log(`✅ Avec audit_id: ${d.withAudit}`);
  console.log(`📝 Audit existe DB: ${d.auditExists}`);
  console.log(`🔴 Audit manquant: ${d.auditMissing}`);
  console.log(`📧 Email envoyé (SENT): ${d.emailSent}`);
  console.log(`📅 Email programmé: ${d.emailScheduled}`);
  console.log(`✅ Email prêt: ${d.emailReady}`);
  console.log(`🔴 Pas d'email: ${d.noEmail}`);
  console.log('');
  console.log('Détail clients:');

  d.orders.forEach((o, idx) => {
    const emoji = o.emailSent ? '✅' : (o.inSheet ? '📅' : '🔴');
    console.log(`${idx + 1}. ${emoji} ${o.email}`);
    console.log(`   Order: ${o.orderId}`);
    console.log(`   Audit ID: ${o.auditId}`);
    console.log(`   Audit existe? ${o.auditExists ? 'OUI' : 'NON'}`);
    console.log(`   Audit status: ${o.auditStatus}`);
    console.log(`   Dans Google Sheet? ${o.inSheet ? 'OUI' : 'NON'}`);
    console.log(`   Sheet status: ${o.sheetStatus}`);
    console.log(`   Email envoyé? ${o.emailSent ? 'OUI ✅' : 'NON 🔴'}`);
    console.log(`   Status final: ${o.finalStatus}`);
    console.log('');
  });
});

// Summary
console.log('━'.repeat(100));
console.log('📊 RÉSUMÉ GLOBAL');
console.log('━'.repeat(100));
console.log('');

const summary = {
  totalOrders: fullReport.length,
  emailSent: fullReport.filter(r => r.emailSent).length,
  emailPending: fullReport.filter(r => r.inSheet && !r.emailSent).length,
  noEmail: fullReport.filter(r => !r.inSheet).length,
  auditExists: fullReport.filter(r => r.auditExists).length,
  auditMissing: fullReport.filter(r => !r.auditExists && r.auditId !== 'NULL').length,
  noAuditId: fullReport.filter(r => r.auditId === 'NULL').length
};

console.log(`📦 Total commandes: ${summary.totalOrders}`);
console.log(`✅ Emails envoyés: ${summary.emailSent} (${((summary.emailSent / summary.totalOrders) * 100).toFixed(1)}%)`);
console.log(`📅 Emails en attente: ${summary.emailPending}`);
console.log(`🔴 Pas d'email du tout: ${summary.noEmail} (${((summary.noEmail / summary.totalOrders) * 100).toFixed(1)}%)`);
console.log(`📝 Audits existants: ${summary.auditExists}`);
console.log(`🔴 Audits manquants: ${summary.auditMissing}`);
console.log(`⚠️  Sans audit_id: ${summary.noAuditId}`);
console.log('');

// Save CSV
const csvHeaders = 'Date,Jour,Email,Type,Order_ID,Audit_ID,Audit_Existe,Audit_Status,Dans_Sheet,Sheet_Status,Email_Envoyé,Status_Final,Created_At\n';
const csvRows = fullReport.map(r =>
  `${r.date},${r.day},${r.email},${r.productType},${r.orderId},${r.auditId},${r.auditExists},${r.auditStatus},${r.inSheet},${r.sheetStatus},${r.emailSent},${r.finalStatus},${r.createdAt}`
).join('\n');

fs.writeFileSync('/tmp/etat_des_lieux_complet.csv', csvHeaders + csvRows);
fs.writeFileSync('/tmp/etat_des_lieux_complet.json', JSON.stringify({ byDate, summary, fullReport }, null, 2));

console.log('━'.repeat(100));
console.log('📄 FICHIERS GÉNÉRÉS:');
console.log('   /tmp/etat_des_lieux_complet.csv (Excel)');
console.log('   /tmp/etat_des_lieux_complet.json (JSON)');
console.log('━'.repeat(100));
console.log('');
