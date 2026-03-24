const fs = require('fs');

console.log('🔍 ANALYSE APPROFONDIE - 30 CLIENTS SANS EMAIL SENDPULSE');
console.log('━'.repeat(100));
console.log('');

// Load data
const orders = JSON.parse(fs.readFileSync('/tmp/orders_march17.json', 'utf8'));
const auditsData = JSON.parse(fs.readFileSync('/tmp/all_audits.json', 'utf8'));
const sendpulseAnalysis = JSON.parse(fs.readFileSync('/tmp/sendpulse_analysis.json', 'utf8'));

const audits = auditsData.audits;
const missing30 = sendpulseAnalysis.inOrdersNotInSendpulse;

console.log(`🔴 Total clients sans email SendPulse: ${missing30.length}`);
console.log('');

// Create maps
const auditMap = new Map();
audits.forEach(a => auditMap.set(a.id, a));

const orderMap = new Map();
orders.forEach(o => orderMap.set(o.email.toLowerCase(), o));

console.log('━'.repeat(100));
console.log('📋 ANALYSE DÉTAILLÉE CLIENT PAR CLIENT:');
console.log('━'.repeat(100));
console.log('');

const results = [];

missing30.forEach((email, idx) => {
  const order = orderMap.get(email);

  if (!order) {
    console.log(`${idx + 1}. ⚠️  ${email} - PAS DE COMMANDE TROUVÉE`);
    return;
  }

  const audit = order.auditId ? auditMap.get(order.auditId) : null;
  const date = order.createdAt.substring(0, 10);
  const time = order.createdAt.substring(11, 19);
  const day = date.substring(8, 10);

  // Calculate hours since order
  const orderTime = new Date(order.createdAt);
  const now = new Date('2026-03-24T12:00:00Z'); // Approximate current time
  const hoursSince = Math.floor((now - orderTime) / (1000 * 60 * 60));

  const auditStatus = audit ? audit.reportDeliveryStatus : 'NO_AUDIT';
  const auditExists = !!audit;

  let explication = '';
  let action = '';

  if (!auditExists && !order.auditId) {
    explication = '❌ Pas d\'audit_id assigné';
    action = 'CRÉER audit_id puis générer audit';
  } else if (!auditExists && order.auditId) {
    explication = '👻 Audit fantôme (audit_id existe mais pas dans DB)';
    action = 'RÉCUPÉRER audit depuis questionnaire_progress';
  } else if (auditStatus === 'SCHEDULED') {
    if (hoursSince < 24) {
      explication = `📅 SCHEDULED - Envoi prévu (commandé il y a ${hoursSince}h)`;
      action = '✅ NORMAL - Attendre l\'envoi automatique';
    } else {
      explication = `⏰ SCHEDULED depuis ${hoursSince}h (devrait être envoyé)`;
      action = 'FORCER envoi maintenant';
    }
  } else if (auditStatus === 'READY') {
    explication = `✅ READY - Rapport prêt mais pas encore envoyé`;
    action = 'FORCER envoi maintenant';
  } else if (auditStatus === 'SENT') {
    explication = '🤔 DB dit SENT mais SendPulse n\'a rien envoyé';
    action = 'RENVOYER email (bug d\'envoi)';
  } else if (auditStatus === 'PENDING') {
    explication = `⏳ PENDING - Génération en cours`;
    action = 'Vérifier si génération bloquée';
  } else if (auditStatus === 'GENERATING') {
    explication = `⚙️ GENERATING - En cours de génération`;
    action = 'Attendre ou débloquer si bloqué';
  } else {
    explication = `❓ Status inconnu: ${auditStatus}`;
    action = 'Investiguer';
  }

  const record = {
    email,
    date,
    day,
    time,
    hoursSince,
    auditId: order.auditId || 'NULL',
    auditExists,
    auditStatus,
    explication,
    action
  };

  results.push(record);

  console.log(`${idx + 1}. ${email}`);
  console.log(`   📅 Commandé: ${day} mars ${time} (il y a ${hoursSince}h)`);
  console.log(`   🆔 Audit ID: ${order.auditId || 'NULL'}`);
  console.log(`   📝 Audit existe? ${auditExists ? 'OUI' : 'NON'}`);
  console.log(`   📊 Status: ${auditStatus}`);
  console.log(`   💡 ${explication}`);
  console.log(`   🎯 Action: ${action}`);
  console.log('');
});

console.log('━'.repeat(100));
console.log('📊 RÉSUMÉ PAR STATUS:');
console.log('━'.repeat(100));
console.log('');

const byStatus = {};
const byAction = {};

results.forEach(r => {
  byStatus[r.auditStatus] = (byStatus[r.auditStatus] || 0) + 1;
  byAction[r.action] = (byAction[r.action] || 0) + 1;
});

console.log('Status des audits:');
Object.keys(byStatus).sort((a, b) => byStatus[b] - byStatus[a]).forEach(status => {
  console.log(`   ${status}: ${byStatus[status]}`);
});
console.log('');

console.log('Actions requises:');
Object.keys(byAction).sort((a, b) => byAction[b] - byAction[a]).forEach(action => {
  console.log(`   ${action}: ${byAction[action]}`);
});
console.log('');

// Separate into categories
const normalScheduled = results.filter(r => r.action.includes('NORMAL'));
const needForce = results.filter(r => r.action.includes('FORCER'));
const needRecovery = results.filter(r => r.action.includes('RÉCUPÉRER'));
const needInvestigation = results.filter(r => r.action.includes('RENVOYER') || r.action.includes('Investiguer'));

console.log('━'.repeat(100));
console.log('🎯 PLAN D\'ACTION:');
console.log('━'.repeat(100));
console.log('');

console.log(`✅ OK - Envoi automatique prévu: ${normalScheduled.length} clients`);
if (normalScheduled.length > 0) {
  console.log('   Ces clients ont commandé récemment et leur email arrivera automatiquement');
  normalScheduled.forEach(r => console.log(`   - ${r.email} (${r.hoursSince}h)`));
  console.log('');
}

console.log(`🔴 FORCER ENVOI: ${needForce.length} clients`);
if (needForce.length > 0) {
  console.log('   Ces clients ont un audit READY/SCHEDULED depuis trop longtemps');
  needForce.forEach(r => console.log(`   - ${r.email} (${r.auditStatus}, ${r.hoursSince}h)`));
  console.log('');
}

console.log(`👻 RÉCUPÉRER AUDIT FANTÔME: ${needRecovery.length} clients`);
if (needRecovery.length > 0) {
  console.log('   Ces clients ont audit_id mais audit n\'existe pas en DB');
  needRecovery.forEach(r => console.log(`   - ${r.email}`));
  console.log('');
}

console.log(`🤔 INVESTIGUER: ${needInvestigation.length} clients`);
if (needInvestigation.length > 0) {
  console.log('   Ces clients ont un problème inhabituel');
  needInvestigation.forEach(r => console.log(`   - ${r.email} (${r.explication})`));
  console.log('');
}

// Save results
fs.writeFileSync('/tmp/missing_30_analysis.json', JSON.stringify({
  total: results.length,
  normalScheduled: normalScheduled.map(r => r.email),
  needForce: needForce.map(r => ({ email: r.email, status: r.auditStatus, hours: r.hoursSince })),
  needRecovery: needRecovery.map(r => r.email),
  needInvestigation: needInvestigation.map(r => ({ email: r.email, reason: r.explication })),
  fullReport: results
}, null, 2));

console.log('━'.repeat(100));
console.log('📄 FICHIER GÉNÉRÉ: /tmp/missing_30_analysis.json');
console.log('━'.repeat(100));
console.log('');
