import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { audits } from './server/db/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const auditId = '9cb48521-f6cd-4308-9a39-82eb5dbe6a6c';

async function checkReport() {
  try {
    const audit = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);

    if (!audit || audit.length === 0) {
      console.log('Audit not found');
      process.exit(1);
    }

    const report = audit[0];
    const narrativeReport = report.narrativeReport as any;

    console.log('Type:', report.type);
    console.log('Report Delivery Status:', report.reportDeliveryStatus);

    if (narrativeReport?.txt) {
      const txtLength = narrativeReport.txt.length;
      const preview = narrativeReport.txt.substring(0, 1000);
      console.log('\nTXT Length:', txtLength, 'chars');
      console.log('\n=== PREVIEW (first 1000 chars) ===');
      console.log(preview);
      console.log('=== END PREVIEW ===\n');

      // Count sections
      const sectionMatches = narrativeReport.txt.match(/^[A-Z\s]{10,}$/gm);
      console.log('Detected section titles:', sectionMatches?.length || 0);
      if (sectionMatches) {
        console.log('Sections:', sectionMatches.slice(0, 20));
      }
    } else {
      console.log('No TXT in narrativeReport');
      console.log('narrativeReport keys:', Object.keys(narrativeReport || {}));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

checkReport();
