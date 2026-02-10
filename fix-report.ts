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

async function fixReport() {
  const { storage } = await import("./server/storage.js");
  
  const reportId = "51d5f1b7-d08b-40b5-b0f8-3af67128aeba";
  
  // Read AI report from file
  const reportContent = fs.readFileSync(`blood-report-${reportId}.txt`, "utf-8");
  
  // Update the report in DB
  const { db } = await import("./server/db.js");
  const { bloodTests } = await import("./shared/drizzle-schema.js");
  const { eq } = await import("drizzle-orm");
  
  const report = await db.select().from(bloodTests).where(eq(bloodTests.id, reportId)).limit(1);
  
  if (report.length > 0) {
    const existing = report[0];
    const analysis = existing.analysis as any;
    
    // Add aiReport to analysis object
    analysis.aiReport = reportContent;
    
    await db.update(bloodTests)
      .set({ 
        analysis: analysis,
        status: "completed"
      })
      .where(eq(bloodTests.id, reportId));
    
    console.log("✅ Rapport mis à jour avec aiReport!");
    console.log(`📏 Longueur: ${reportContent.length} caractères`);
  } else {
    console.log("❌ Rapport non trouvé");
  }
}

fixReport().catch(console.error);
