import fs from 'fs';

async function main() {
  if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=\s]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      const val = m[2];
      if (process.env[key] == null) process.env[key] = val;
    }
  }

  const { db } = await import('./server/db.ts');
  const { bloodAnalysisReports } = await import('./shared/drizzle-schema.ts');
  const { eq, desc } = await import('drizzle-orm');

  const rows = await db
    .select({
      id: bloodAnalysisReports.id,
      createdAt: bloodAnalysisReports.createdAt,
      email: bloodAnalysisReports.email,
      aiReport: bloodAnalysisReports.aiReport,
    })
    .from(bloodAnalysisReports)
    .where(eq(bloodAnalysisReports.email, 'alex.demo@neurocore360.com'))
    .orderBy(desc(bloodAnalysisReports.createdAt))
    .limit(5);

  console.log(
    rows.map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      email: r.email,
      aiLen: (r.aiReport || '').length,
    }))
  );

  await (db as any).$client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
