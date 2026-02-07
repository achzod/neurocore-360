import fs from "fs";
import path from "path";

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

async function generateNewReport() {
  const now = new Date();
  const logPath = path.join(
    process.cwd(),
    `generation-log-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.txt`
  );

  const log = (...args: unknown[]) => {
    const line = args
      .map(a => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    try {
      // Console can throw EPIPE if the terminal/pipes died; keep going regardless.
      console.log(line);
    } catch {}
    try {
      fs.appendFileSync(logPath, `${line}\n`, "utf-8");
    } catch {}
  };

  const NO_AI = process.argv.includes("--no-ai");
  const FAST = process.argv.includes("--fast");
  if (FAST) process.env.BLOOD_ANALYSIS_FAST_MODE = "true";

  log("🩸 Génération d'un nouveau rapport blood analysis...\n");
  log(`📝 Log: ${logPath}\n`);

  // Sample blood test data
  const sampleMarkers = [
    {
      name: "Testostérone totale",
      markerId: "testosterone_total",
      value: 450,
      unit: "ng/dL"
    },
    {
      name: "Testostérone libre",
      markerId: "testosterone_libre",
      value: 8.5,
      unit: "pg/mL"
    },
    {
      name: "SHBG",
      markerId: "shbg",
      value: 35,
      unit: "nmol/L"
    },
    {
      name: "Estradiol",
      markerId: "estradiol",
      value: 28,
      unit: "pg/mL"
    },
    {
      name: "Cortisol matin",
      markerId: "cortisol",
      value: 15,
      unit: "µg/dL"
    },
    {
      name: "TSH",
      markerId: "tsh",
      value: 2.1,
      unit: "mIU/L"
    },
    {
      name: "T3 libre",
      markerId: "t3_libre",
      value: 3.2,
      unit: "pg/mL"
    },
    {
      name: "T4 libre",
      markerId: "t4_libre",
      value: 1.3,
      unit: "ng/dL"
    },
    {
      name: "Glycémie à jeun",
      markerId: "glycemie_jeun",
      value: 92,
      unit: "mg/dL"
    },
    {
      name: "HbA1c",
      markerId: "hba1c",
      value: 5.4,
      unit: "%"
    },
    {
      name: "Insuline à jeun",
      markerId: "insuline_jeun",
      value: 6.5,
      unit: "µIU/mL"
    },
    {
      name: "Vitamine D",
      markerId: "vitamine_d",
      value: 32,
      unit: "ng/mL"
    },
    {
      name: "Ferritine",
      markerId: "ferritine",
      value: 85,
      unit: "ng/mL"
    },
    {
      name: "CRP ultrasensible",
      markerId: "crp_us",
      value: 1.8,
      unit: "mg/L"
    },
    {
      name: "Cholestérol total",
      markerId: "cholesterol_total",
      value: 195,
      unit: "mg/dL"
    },
    {
      name: "HDL",
      markerId: "hdl",
      value: 55,
      unit: "mg/dL"
    },
    {
      name: "LDL",
      markerId: "ldl",
      value: 115,
      unit: "mg/dL"
    },
    {
      name: "Triglycérides",
      markerId: "triglycerides",
      value: 95,
      unit: "mg/dL"
    }
  ];

  const userProfile = {
    gender: "homme",
    age: "32",
    prenom: "Alex",
    objectives: "Gain musculaire et optimisation performance",
    poids: 78,
    taille: 180,
    sleepHours: 7,
    trainingHours: 5,
    stressLevel: 6,
    calorieDeficit: 0,
    alcoholWeekly: 2,
    email: "alex.demo@neurocore360.com"
  };

  try {
    const {
      analyzeBloodwork,
      generateAIBloodAnalysis,
      getBloodworkKnowledgeContext,
      BIOMARKER_RANGES,
      buildFallbackAnalysis,
      buildLifestyleCorrelations,
    } = await import("./server/blood-analysis/index.js");
    const { storage } = await import("./server/storage.js");

    log("📊 Analyse des marqueurs...");
    const analysisResult = await analyzeBloodwork(sampleMarkers, userProfile);

    log(`\n✅ Analyse terminée:`);
    log(`   - ${analysisResult.summary.optimal.length} marqueurs optimaux`);
    log(`   - ${analysisResult.summary.watch.length} marqueurs à surveiller`);
    log(`   - ${analysisResult.summary.action.length} marqueurs critiques`);
    log(`   - ${analysisResult.patterns.length} patterns détectés`);

    const knowledgeContext = await getBloodworkKnowledgeContext(
      analysisResult.markers,
      analysisResult.patterns
    );

    log(`\n🤖 Génération du rapport AI (${NO_AI ? "désactivée" : "peut prendre plusieurs minutes"})...`);
    const aiAnalysis = NO_AI || !process.env.ANTHROPIC_API_KEY
      ? buildFallbackAnalysis(analysisResult, userProfile)
      : await generateAIBloodAnalysis(analysisResult, userProfile, knowledgeContext);

    log(`\n✅ Analyse AI générée: ${aiAnalysis.length} caractères`);

    type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";
    const SCORE_BY_STATUS: Record<MarkerStatus, number> = {
      optimal: 100,
      normal: 80,
      suboptimal: 55,
      critical: 30,
    };

    const computeCategoryScores = (markers: Array<{ category?: string; status?: MarkerStatus }>) => {
      const buckets: Record<string, number[]> = {};
      for (const marker of markers) {
        const category = marker.category || "general";
        const status = marker.status || "normal";
        if (!buckets[category]) buckets[category] = [];
        buckets[category].push(SCORE_BY_STATUS[status]);
      }
      return Object.fromEntries(
        Object.entries(buckets).map(([category, scores]) => {
          const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
          return [category, Math.round(avg)];
        })
      );
    };

    const computeGlobalScore = (scoresMap: Record<string, number>) => {
      const scores = Object.values(scoresMap);
      if (scores.length === 0) return 0;
      return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    };

    const getGlobalLevel = (score: number | null | undefined): string | null => {
      if (score === null || score === undefined) return null;
      if (score >= 80) return "excellent";
      if (score >= 65) return "bon";
      if (score >= 50) return "moyen";
      return "critique";
    };

    const computeTemporalRisk = (markers: Array<{ status?: MarkerStatus }>) => {
      const critical = markers.filter((m) => m.status === "critical").length;
      const warning = markers.filter((m) => m.status === "suboptimal").length;
      const score = Math.min(100, critical * 20 + warning * 10);
      const level = score >= 70 ? "eleve" : score >= 40 ? "modere" : "faible";
      return { score, level, critical, warning };
    };

    const buildProtocolPhases = (markers: Array<{ name: string; status?: MarkerStatus }>) => {
      const phase1 = markers
        .filter((m) => m.status === "critical")
        .map((m) => `Priorite immediate: corriger ${m.name}.`);
      const phase2 = markers
        .filter((m) => m.status === "suboptimal")
        .map((m) => `Optimiser ${m.name} avec ajustements nutritionnels + lifestyle.`);
      const phase3 = [
        "Stabiliser les routines sommeil et entrainement.",
        "Planifier un controle sanguin a 90 jours.",
        "Consolider l'hygiene metabolique globale.",
      ];

      return [
        { id: "phase-1", title: "Jours 1-30", items: phase1.length ? phase1 : ["Aucune alerte critique detectee."] },
        { id: "phase-2", title: "Jours 31-90", items: phase2.length ? phase2 : ["Conserver les marqueurs dans le range optimal."] },
        { id: "phase-3", title: "Jours 91-180", items: phase3 },
      ];
    };

    const markers = analysisResult.markers.map((marker: any) => {
      const range = (BIOMARKER_RANGES as any)[marker.markerId];
      return {
        name: marker.name,
        code: marker.markerId,
        category: marker.category || "general",
        value: marker.value,
        unit: marker.unit,
        refMin: range?.normalMin ?? null,
        refMax: range?.normalMax ?? null,
        optimalMin: range?.optimalMin ?? null,
        optimalMax: range?.optimalMax ?? null,
        status: marker.status,
        interpretation: marker.interpretation,
      };
    });

    const categoryScores = computeCategoryScores(markers);
    const globalScore = computeGlobalScore(categoryScores);
    const globalLevel = getGlobalLevel(globalScore);
    const temporalRisk = computeTemporalRisk(markers);
    const protocolPhases = buildProtocolPhases(markers);

    const analysisPayload = {
      globalScore,
      globalLevel,
      categoryScores,
      systemScores: {},
      temporalRisk,
      summary: analysisResult.summary,
      patterns: analysisResult.patterns,
      recommendations: analysisResult.recommendations,
      followUp: analysisResult.followUp,
      alerts: analysisResult.alerts,
      aiAnalysis,
      aiReport: aiAnalysis, // Also save as aiReport for API compatibility
      protocolPhases,
      lifestyleCorrelations: buildLifestyleCorrelations(analysisResult.markers, userProfile),
      patient: userProfile,
    };

    // Ensure a user exists (blood_tests.user_id has an FK to users.id in production DB).
    const email = String(userProfile.email || "").trim().toLowerCase() || "alex.demo@neurocore360.com";
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.createUser({ email, name: userProfile.prenom || "Demo" });
      log(`👤 User created: ${user.id} (${user.email})`);
    } else {
      log(`👤 User found: ${user.id} (${user.email})`);
    }

    // Save to DB through the same storage layer used by the server routes.
    const created = await storage.createBloodTest({
      userId: user.id,
      fileName: "demo-seed",
      fileType: "application/json",
      fileSize: 0,
      status: "completed",
      error: null,
      markers,
      analysis: analysisPayload,
      patientProfile: userProfile,
      globalScore,
      globalLevel,
      createdAt: new Date(),
      completedAt: new Date(),
    });
    const reportId = created.id;

    log(`\n✅ Rapport sauvegardé dans la base de données (blood_tests): ${reportId}`);
    log(`\n📋 LIENS D'ACCÈS:\n`);
    log(`Dashboard (Ultrahuman-style):`);
    log(`https://neurocore-360.onrender.com/analysis/${reportId}?key=Badboy007\n`);
    log(`Modern Interface (Nouvelle avec tabs):`);
    log(`https://neurocore-360.onrender.com/blood-report/${reportId}?key=Badboy007\n`);
    log(`Local dev:`);
    log(`http://localhost:5000/blood-report/${reportId}\n`);

    // Save report to file
    const reportPath = path.join(process.cwd(), `blood-report-${reportId}.txt`);
    fs.writeFileSync(reportPath, aiAnalysis, "utf-8");
    log(`📄 Rapport sauvegardé: ${reportPath}`);

    process.exit(0);
  } catch (error) {
    try {
      console.error("❌ Erreur:", error);
    } catch {}
    process.exit(1);
  }
}

generateNewReport();
