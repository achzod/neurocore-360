const fs = require('fs');

// Parse CSV
const csv = fs.readFileSync('/tmp/google_sheet_emails.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

console.log('🔍 ANALYSE GOOGLE SHEET - EMAILS ENVOYÉS PAR APEXLABS');
console.log('━'.repeat(80));
console.log('');

const headers = lines[0].split(',');
const data = [];

// Skip header and last 2 lines (metadata)
for (let i = 1; i < lines.length - 2; i++) {
  const cols = lines[i].split(',');
  if (cols.length >= 4 && cols[1]) { // Has email
    data.push({
      id: cols[0],
      email: cols[1].toLowerCase().trim(),
      type: cols[2],
      status: cols[3],
      cree: cols[4],
      genere: cols[5],
      programme: cols[6],
      envoye: cols[7],
      score: cols[8],
      tentatives: cols[9],
      erreur: cols[10]
    });
  }
}

console.log(`📊 TOTAL LIGNES GOOGLE SHEET: ${data.length}`);
console.log('');

// Count by status
const byStatus = {};
data.forEach(row => {
  byStatus[row.status] = (byStatus[row.status] || 0) + 1;
});

console.log('📈 BREAKDOWN PAR STATUS (GOOGLE SHEET):');
Object.keys(byStatus).sort().forEach(status => {
  console.log(`   ${status}: ${byStatus[status]}`);
});
console.log('');

// Get emails from my 246 orders
const orders = JSON.parse(fs.readFileSync('/tmp/orders_march17.json', 'utf8'));
const orderEmails = new Set(orders.map(o => o.email.toLowerCase().trim()));

console.log(`📦 TOTAL COMMANDES (depuis 17 mars): ${orderEmails.size}`);
console.log('');

// Compare
const sheetEmails = new Set(data.map(d => d.email));

const inSheetNotInOrders = [...sheetEmails].filter(e => !orderEmails.has(e));
const inOrdersNotInSheet = [...orderEmails].filter(e => !sheetEmails.has(e));

console.log('━'.repeat(80));
console.log('🔍 COMPARAISON GOOGLE SHEET vs COMMANDES');
console.log('━'.repeat(80));
console.log('');
console.log(`✅ Dans Google Sheet: ${sheetEmails.size} emails`);
console.log(`✅ Dans commandes: ${orderEmails.size} emails`);
console.log(`📧 Dans Sheet mais PAS dans commandes: ${inSheetNotInOrders.length}`);
console.log(`🔴 Dans commandes mais PAS dans Sheet: ${inOrdersNotInSheet.length}`);
console.log('');

if (inOrdersNotInSheet.length > 0) {
  console.log('━'.repeat(80));
  console.log('🔴 CLIENTS PAYANTS MAIS PAS DANS GOOGLE SHEET (emails jamais envoyés?):');
  console.log('━'.repeat(80));
  console.log('');

  // Group by date
  const byDate = {};
  inOrdersNotInSheet.forEach(email => {
    const order = orders.find(o => o.email.toLowerCase() === email);
    if (order) {
      const date = order.createdAt.substring(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({
        email: order.email,
        type: order.productType,
        auditId: order.auditId,
        date: order.createdAt
      });
    }
  });

  Object.keys(byDate).sort().forEach(date => {
    const day = date.substring(8, 10);
    console.log(`📅 ${day} mars: ${byDate[date].length} clients`);
    byDate[date].slice(0, 5).forEach(c => {
      console.log(`   - ${c.email} (${c.type})`);
    });
    if (byDate[date].length > 5) {
      console.log(`   ... et ${byDate[date].length - 5} autres`);
    }
  });
}

console.log('');
console.log('━'.repeat(80));
console.log('📧 EMAILS AVEC STATUS "SENT" DANS GOOGLE SHEET:');
console.log('━'.repeat(80));
console.log('');

const sent = data.filter(d => d.status === 'SENT');
console.log(`✅ TOTAL SENT: ${sent.length}`);
console.log('');

// Save results
fs.writeFileSync('/tmp/google_sheet_analysis.json', JSON.stringify({
  sheetTotal: data.length,
  ordersTotal: orderEmails.size,
  inSheetNotInOrders,
  inOrdersNotInSheet,
  byStatus,
  sent: sent.map(s => s.email)
}, null, 2));

console.log('📄 Résultats sauvegardés: /tmp/google_sheet_analysis.json');
console.log('');
