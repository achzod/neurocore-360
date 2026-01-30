import { Client } from "pg";
import {
  analyzeBloodwork,
  generateAIBloodAnalysis,
  getBloodworkKnowledgeContext,
} from "../server/blood-analysis/index.ts";

type BloodTestRow = {
  id: string;
  markers: any;
  analysis: any;
  patient_profile: any;
};

const getAgeFromDob = (dob?: string): string | undefined => {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const age = Math.floor((Date.now() - parsed.getTime()) / 31557600000);
  return Number.isFinite(age) ? String(age) : undefined;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const targetId = process.env.TARGET_ID?.trim();
  const baseQuery = "SELECT id, markers, analysis, patient_profile FROM blood_tests";
  const result = targetId
    ? await client.query<BloodTestRow>(`${baseQuery} WHERE id = $1`, [targetId])
    : await client.query<BloodTestRow>(`${baseQuery} ORDER BY created_at ASC`);

  console.log(`[Regen] Found ${result.rows.length} blood tests`);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const row of result.rows) {
    processed += 1;
    console.log(`[Regen] Processing ${processed}/${result.rows.length} - ${row.id}`);
    const markers = Array.isArray(row.markers) ? row.markers : [];
    const analysis = row.analysis || {};
    const patientProfile = row.patient_profile || analysis.patient || {};

    const genderRaw = String(patientProfile.gender || "homme").toLowerCase();
    const gender = genderRaw.startsWith("f") ? "femme" : "homme";
    const age = getAgeFromDob(patientProfile.dob);

    const inputs = markers
      .map((marker: any) => ({
        markerId: marker.code || marker.markerId,
        value: marker.value,
      }))
      .filter((marker: any) => typeof marker.markerId === "string" && typeof marker.value === "number");

    if (!inputs.length) {
      console.warn(`[Regen] ${row.id} skipped (no markers)`);
      continue;
    }

    try {
      const analysisResult = await analyzeBloodwork(inputs, {
        gender,
        age,
        objectives: undefined,
        medications: undefined,
      });
      const knowledgeContext = await getBloodworkKnowledgeContext(
        analysisResult.markers,
        analysisResult.patterns
      );
      console.log(`[Regen] Generating AI for ${row.id}...`);
      const aiAnalysis = await withTimeout(
        generateAIBloodAnalysis(
          analysisResult,
          {
            gender,
            age,
            prenom: patientProfile.prenom,
            nom: patientProfile.nom,
            poids: patientProfile.poids,
            taille: patientProfile.taille,
            sleepHours: patientProfile.sleepHours,
            trainingHours: patientProfile.trainingHours,
            calorieDeficit: patientProfile.calorieDeficit,
            alcoholWeekly: patientProfile.alcoholWeekly,
            stressLevel: patientProfile.stressLevel,
          },
          knowledgeContext
        ),
        900000
      );

      const updatedAnalysis = { ...analysis, aiAnalysis };
      await client.query(
        "UPDATE blood_tests SET analysis = $1, completed_at = NOW() WHERE id = $2",
        [JSON.stringify(updatedAnalysis), row.id]
      );
      updated += 1;
      console.log(`[Regen] Updated ${row.id} (${updated}/${processed})`);
    } catch (err) {
      failed += 1;
      console.error(`[Regen] Failed for ${row.id}:`, err);
    }

    await sleep(750);
  }

  console.log(`[Regen] Done. processed=${processed} updated=${updated} failed=${failed}`);
  await client.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
