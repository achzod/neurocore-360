const fs = require('fs');

const orders = JSON.parse(fs.readFileSync('/tmp/orders_march17.json', 'utf8'));
const auditsData = JSON.parse(fs.readFileSync('/tmp/all_audits.json', 'utf8'));
const audits = auditsData.audits;

// Create map of audits by ID for fast lookup
const auditMap = new Map();
audits.forEach(a => auditMap.set(a.id, a));

console.log('🔍 AUDIT COMPLET - 246 CLIENTS UN PAR UN');
console.log('━'.repeat(80));
console.log('');

const results = {
  SENT: [],
  SCHEDULED: [],
  READY: [],
  PENDING: [],
  GENERATING: [],
  NEED_PHOTOS: [],
  EMAIL_FAILED: [],
  MISSING: [],
  NULL_AUDIT_ID: []
};

const byDate = {};

// Analyze each order
orders.forEach((order, idx) => {
  const date = order.createdAt.substring(0, 10);
  if (!byDate[date]) byDate[date] = { total: 0, sent: 0, missing: 0, statuses: {} };
  byDate[date].total++;

  if (!order.auditId) {
    results.NULL_AUDIT_ID.push({
      email: order.email,
      productType: order.productType,
      createdAt: order.createdAt,
      orderId: order.id
    });
    byDate[date].missing++;
    byDate[date].statuses.NULL_AUDIT_ID = (byDate[date].statuses.NULL_AUDIT_ID || 0) + 1;
  } else {
    const audit = auditMap.get(order.auditId);
    if (!audit) {
      results.MISSING.push({
        email: order.email,
        productType: order.productType,
        auditId: order.auditId,
        createdAt: order.createdAt,
        orderId: order.id
      });
      byDate[date].missing++;
      byDate[date].statuses.MISSING = (byDate[date].statuses.MISSING || 0) + 1;
    } else {
      const status = audit.reportDeliveryStatus || 'UNKNOWN';
      results[status] = results[status] || [];
      results[status].push({
        email: order.email,
        productType: order.productType,
        auditId: order.auditId,
        status: status,
        createdAt: order.createdAt,
        orderId: order.id
      });

      if (status === 'SENT') {
        byDate[date].sent++;
      }
      byDate[date].statuses[status] = (byDate[date].statuses[status] || 0) + 1;
    }
  }
});

// Print statistics
console.log('📊 STATISTIQUES GLOBALES');
console.log('━'.repeat(80));
console.log('');
console.log(`✅ SENT (envoyés):              ${results.SENT.length}`);
console.log(`📅 SCHEDULED (programmés):      ${results.SCHEDULED.length}`);
console.log(`✅ READY (prêts):               ${results.READY.length}`);
console.log(`⏳ PENDING (en attente):        ${results.PENDING.length}`);
console.log(`🔄 GENERATING (génération):     ${results.GENERATING.length}`);
console.log(`📸 NEED_PHOTOS (photos):        ${(results.NEED_PHOTOS || []).length}`);
console.log(`❌ EMAIL_FAILED (échec email):  ${(results.EMAIL_FAILED || []).length}`);
console.log(`🔴 MISSING (audit manquant):    ${results.MISSING.length}`);
console.log(`⚠️  NULL_AUDIT_ID (pas d'ID):   ${results.NULL_AUDIT_ID.length}`);
console.log('');
console.log(`TOTAL: ${orders.length} commandes`);
console.log('');

// Print by date
console.log('━'.repeat(80));
console.log('📅 BREAKDOWN PAR DATE');
console.log('━'.repeat(80));
console.log('');

Object.keys(byDate).sort().forEach(date => {
  const d = byDate[date];
  const day = date.substring(8, 10);
  console.log(`📅 ${day} mars: ${d.total} commandes (${d.sent} envoyés, ${d.missing} manquants)`);
  Object.keys(d.statuses).forEach(status => {
    console.log(`   - ${status}: ${d.statuses[status]}`);
  });
});

console.log('');
console.log('━'.repeat(80));
console.log('🔴 DÉTAIL DES AUDITS MANQUANTS');
console.log('━'.repeat(80));
console.log('');

if (results.MISSING.length > 0) {
  console.log(`${results.MISSING.length} clients avec audit_id mais audit n'existe pas:`);
  console.log('');
  results.MISSING.slice(0, 20).forEach(r => {
    console.log(`  ${r.email} | ${r.productType} | ${r.auditId.substring(0, 8)}... | ${r.createdAt.substring(0, 10)}`);
  });
  if (results.MISSING.length > 20) {
    console.log(`  ... et ${results.MISSING.length - 20} autres`);
  }
}

if (results.NULL_AUDIT_ID.length > 0) {
  console.log('');
  console.log(`${results.NULL_AUDIT_ID.length} commandes sans audit_id (webhook n'a pas tourné):`);
  console.log('');
  results.NULL_AUDIT_ID.slice(0, 10).forEach(r => {
    console.log(`  ${r.email} | ${r.productType} | ${r.createdAt.substring(0, 10)}`);
  });
  if (results.NULL_AUDIT_ID.length > 10) {
    console.log(`  ... et ${results.NULL_AUDIT_ID.length - 10} autres`);
  }
}

console.log('');
console.log('━'.repeat(80));
console.log('✅ RÉSUMÉ');
console.log('━'.repeat(80));
console.log('');

const ok = results.SENT.length + results.SCHEDULED.length;
const problemes = results.MISSING.length + results.NULL_AUDIT_ID.length + (results.READY || []).length;

console.log(`✅ OK (SENT + SCHEDULED): ${ok}`);
console.log(`🔴 PROBLÈMES: ${problemes}`);
console.log(`   - ${results.MISSING.length} audits fantômes (audit_id existe mais pas l'audit)`);
console.log(`   - ${results.NULL_AUDIT_ID.length} sans audit_id (webhook jamais lancé)`);
console.log(`   - ${(results.READY || []).length} READY bloqués`);
console.log('');

// Save detailed results
fs.writeFileSync('/tmp/audit_complet_detaille.json', JSON.stringify(results, null, 2));
console.log('📄 Détails sauvegardés: /tmp/audit_complet_detaille.json');
console.log('');
