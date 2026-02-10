import fs from "fs";

// Load .env
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

import { db } from './server/db.js';
import { bloodTests } from './shared/drizzle-schema.js';
import { eq } from 'drizzle-orm';

async function checkReport() {
  const reportId = '51d5f1b7-d08b-40b5-b0f8-3af67128aeba';
  const report = await db.select().from(bloodTests).where(eq(bloodTests.id, reportId)).limit(1);

  if (report.length > 0) {
    const r = report[0];
    console.log('✅ Rapport trouvé');
    console.log('Status:', r.status);
    console.log('AI Report length:', r.aiReport?.length || 0, 'chars');
    console.log('Markers count:', r.markers?.length || 0);
  } else {
    console.log('❌ Rapport non trouvé');
  }
}

checkReport().catch(console.error);
