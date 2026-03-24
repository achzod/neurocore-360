import { db } from './dist/server/db.js';
import { audits, orders } from './dist/shared/drizzle-schema.js';

(async () => {
  try {
    // Total audits
    const allAudits = await db.select().from(audits);
    console.log('=== AUDIT SYSTEM ANALYSIS ===\n');
    console.log('Total audits:', allAudits.length);

    // By reportDeliveryStatus
    const statusCounts = {};
    allAudits.forEach(a => {
      const status = a.reportDeliveryStatus || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n--- BY REPORT DELIVERY STATUS ---');
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log('  ', status.padEnd(20), ':', count);
    });

    // By type
    const typeCounts = {};
    allAudits.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    console.log('\n--- BY TYPE ---');
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log('  ', type.padEnd(20), ':', count);
    });

    // Completed but not sent
    const completedNotSent = allAudits.filter(a =>
      a.status === 'COMPLETED' &&
      a.reportDeliveryStatus !== 'SENT'
    );
    console.log('\n--- COMPLETED BUT NOT SENT ---');
    console.log('  Count:', completedNotSent.length);

    // List some examples
    if (completedNotSent.length > 0) {
      console.log('  Examples (first 5):');
      completedNotSent.slice(0, 5).forEach(a => {
        console.log('    -', a.id, '|', a.type, '|', a.reportDeliveryStatus || 'null', '|', new Date(a.createdAt).toISOString());
      });
    }

    // Failed audits
    const failed = allAudits.filter(a => a.reportDeliveryStatus === 'FAILED');
    console.log('\n--- FAILED AUDITS ---');
    console.log('  Count:', failed.length);

    // Needs review
    const needsReview = allAudits.filter(a => a.reportDeliveryStatus === 'NEEDS_REVIEW');
    console.log('\n--- NEEDS_REVIEW AUDITS ---');
    console.log('  Count:', needsReview.length);

    // Scheduled
    const scheduled = allAudits.filter(a => a.reportDeliveryStatus === 'SCHEDULED');
    console.log('\n--- SCHEDULED AUDITS ---');
    console.log('  Count:', scheduled.length);

    // Generating
    const generating = allAudits.filter(a => a.reportDeliveryStatus === 'GENERATING');
    console.log('\n--- GENERATING AUDITS ---');
    console.log('  Count:', generating.length);

    // Paid orders
    const allOrders = await db.select().from(orders);
    const paidOrders = allOrders.filter(o => o.status === 'paid');
    console.log('\n--- STRIPE ORDERS ---');
    console.log('  Total orders:', allOrders.length);
    console.log('  Paid orders:', paidOrders.length);
    console.log('  Pending orders:', allOrders.filter(o => o.status === 'pending').length);

    // Orders without audits
    const paidOrdersWithoutAudit = paidOrders.filter(o => !o.auditId);
    console.log('\n--- PAID ORDERS WITHOUT AUDIT ---');
    console.log('  Count:', paidOrdersWithoutAudit.length);
    if (paidOrdersWithoutAudit.length > 0) {
      console.log('  Examples (first 5):');
      paidOrdersWithoutAudit.slice(0, 5).forEach(o => {
        console.log('    -', o.id, '|', o.email, '|', o.productType, '|', new Date(o.createdAt).toISOString());
      });
    }

    // Gap analysis
    console.log('\n=== GAP ANALYSIS ===');
    console.log('  Paid orders:', paidOrders.length);
    console.log('  Audits SENT:', statusCounts['SENT'] || 0);
    console.log('  GAP:', paidOrders.length - (statusCounts['SENT'] || 0));
    console.log('  Orders without audit:', paidOrdersWithoutAudit.length);
    console.log('  Audits completed but not sent:', completedNotSent.length);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
