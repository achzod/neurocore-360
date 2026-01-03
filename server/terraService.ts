/**
 * NEUROCORE 360 - Terra API Integration
 *
 * Connects to 100+ wearables via Terra API:
 * - Apple Health, Oura, Whoop, Garmin, Fitbit, Samsung, Polar, etc.
 *
 * Data types synced:
 * - HRV (heart rate variability)
 * - Sleep (duration, phases, quality)
 * - Resting heart rate
 * - Steps & activity
 * - SpO2 (blood oxygen)
 * - Body temperature
 *
 * @see https://docs.tryterra.co
 */

export const TERRA_CONFIG = {
  API_KEY: process.env.TERRA_API_KEY || "",
  DEV_ID: process.env.TERRA_DEV_ID || "",
  WEBHOOK_SECRET: process.env.TERRA_WEBHOOK_SECRET || "",
  BASE_URL: "https://api.tryterra.co/v2",
};

/**
 * MULTI-SITE DISPATCHER CONFIGURATION
 *
 * Un seul compte Terra ($399/mois) peut alimenter plusieurs sites.
 * Le reference_id détermine vers quel site router les données.
 *
 * Format reference_id: "{site_prefix}_{user_id}"
 * Ex: "neurocore_user123", "site2_user456", "coaching_user789"
 */
export const TERRA_SITES_CONFIG: Record<string, {
  name: string;
  webhookUrl: string;
  apiKey?: string; // Optional: si le site distant a besoin d'authentification
}> = {
  // Site principal - Neurocore (traité localement)
  neurocore: {
    name: "Neurocore 360",
    webhookUrl: "local", // Traité directement sur ce serveur
  },
  // Site 2 - Configure ton autre projet ici
  site2: {
    name: "Site 2",
    webhookUrl: process.env.TERRA_SITE2_WEBHOOK_URL || "",
    apiKey: process.env.TERRA_SITE2_API_KEY,
  },
  // Site 3 - Configure ton troisième projet ici
  site3: {
    name: "Site 3",
    webhookUrl: process.env.TERRA_SITE3_WEBHOOK_URL || "",
    apiKey: process.env.TERRA_SITE3_API_KEY,
  },
};

/**
 * Parse le reference_id pour extraire le site prefix et le user_id
 */
export function parseReferenceId(referenceId: string): { sitePrefix: string; userId: string } {
  const parts = referenceId.split("_");
  if (parts.length >= 2) {
    const sitePrefix = parts[0];
    const userId = parts.slice(1).join("_");
    return { sitePrefix, userId };
  }
  // Default to neurocore if no prefix
  return { sitePrefix: "neurocore", userId: referenceId };
}

/**
 * Dispatch les données Terra vers le bon site
 */
export async function dispatchTerraData(
  referenceId: string,
  eventType: string,
  data: unknown
): Promise<{ dispatched: boolean; site: string; error?: string }> {
  const { sitePrefix, userId } = parseReferenceId(referenceId);
  const siteConfig = TERRA_SITES_CONFIG[sitePrefix];

  if (!siteConfig) {
    console.warn(`[Terra Dispatcher] Unknown site prefix: ${sitePrefix}, defaulting to neurocore`);
    return { dispatched: true, site: "neurocore" }; // Handle locally
  }

  // Si c'est le site local (neurocore), pas besoin de dispatcher
  if (siteConfig.webhookUrl === "local") {
    console.log(`[Terra Dispatcher] Handling locally for ${siteConfig.name}: ${userId}`);
    return { dispatched: true, site: siteConfig.name };
  }

  // Dispatcher vers le site distant
  if (!siteConfig.webhookUrl) {
    console.warn(`[Terra Dispatcher] No webhook URL configured for site: ${sitePrefix}`);
    return { dispatched: false, site: sitePrefix, error: "No webhook URL configured" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (siteConfig.apiKey) {
      headers["x-api-key"] = siteConfig.apiKey;
    }

    const response = await fetch(siteConfig.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: eventType,
        user_id: userId,
        original_reference_id: referenceId,
        data,
        dispatched_at: new Date().toISOString(),
        source: "neurocore-terra-dispatcher",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Terra Dispatcher] Failed to dispatch to ${siteConfig.name}: ${errorText}`);
      return { dispatched: false, site: siteConfig.name, error: errorText };
    }

    console.log(`[Terra Dispatcher] Successfully dispatched to ${siteConfig.name} for user: ${userId}`);
    return { dispatched: true, site: siteConfig.name };
  } catch (error) {
    console.error(`[Terra Dispatcher] Error dispatching to ${siteConfig.name}:`, error);
    return { dispatched: false, site: siteConfig.name, error: String(error) };
  }
}

// Supported providers
export const TERRA_PROVIDERS = [
  { id: "APPLE", name: "Apple Health", icon: "🍎", requiresWidget: true },
  { id: "OURA", name: "Oura Ring", icon: "💍", requiresWidget: false },
  { id: "WHOOP", name: "Whoop", icon: "⌚", requiresWidget: false },
  { id: "GARMIN", name: "Garmin", icon: "🏃", requiresWidget: false },
  { id: "FITBIT", name: "Fitbit", icon: "💪", requiresWidget: false },
  { id: "SAMSUNG", name: "Samsung Health", icon: "📱", requiresWidget: true },
  { id: "POLAR", name: "Polar", icon: "❄️", requiresWidget: false },
  { id: "ULTRAHUMAN", name: "Ultrahuman", icon: "🔬", requiresWidget: false },
  { id: "GOOGLE", name: "Google Fit", icon: "🟢", requiresWidget: true },
  { id: "WITHINGS", name: "Withings", icon: "⚖️", requiresWidget: false },
] as const;

export type TerraProvider = typeof TERRA_PROVIDERS[number]["id"];

// Data mapping from Terra to questionnaire questions - EXPANDED VERSION
export const TERRA_DATA_MAPPING = {
  // HRV data -> skip HRV questions
  hrv: {
    questionIds: ["hrv-actuelle", "hrv-moyenne", "variabilite-cardiaque", "hrv-sdnn", "hrv-rmssd"],
    dataPath: "hrv",
    unit: "ms",
  },
  // Sleep data -> skip sleep questions
  sleep: {
    questionIds: [
      "duree-sommeil",
      "sommeil-profond",
      "sommeil-leger",
      "sommeil-rem",
      "reveils-nocturnes",
      "latence-endormissement",
      "qualite-sommeil",
      "efficacite-sommeil",
      "heure-coucher",
      "heure-lever",
    ],
    dataPath: "sleep",
  },
  // Heart rate data -> skip HR questions
  heartRate: {
    questionIds: ["fc-repos", "fc-max", "fc-moyenne", "frequence-cardiaque-repos", "fc-min"],
    dataPath: "heart_rate",
  },
  // Activity & Steps data
  activity: {
    questionIds: [
      "pas-quotidiens",
      "nombre-pas",
      "activite-physique-quotidienne",
      "distance-parcourue",
      "etages-montes",
      "temps-actif",
      "temps-sedentaire",
    ],
    dataPath: "activity",
  },
  // Calories & Metabolism
  calories: {
    questionIds: [
      "calories-brulees",
      "calories-totales",
      "calories-actives",
      "calories-repos",
      "metabolisme-basal",
      "bmr",
      "tdee",
      "depense-energetique",
    ],
    dataPath: "calories",
  },
  // SpO2 data
  spo2: {
    questionIds: ["saturation-oxygene", "spo2", "oxygene-sang"],
    dataPath: "oxygen",
    unit: "%",
  },
  // Body temperature
  temperature: {
    questionIds: ["temperature-corporelle", "temp-basale", "temperature-peau"],
    dataPath: "temperature",
    unit: "°C",
  },
  // Stress & Recovery
  stress: {
    questionIds: ["niveau-stress", "score-stress", "score-recuperation", "recovery-score"],
    dataPath: "stress",
  },
  // Body composition
  body: {
    questionIds: [
      "poids",
      "masse-grasse",
      "masse-musculaire",
      "eau-corporelle",
      "masse-osseuse",
      "imc",
      "graisse-viscerale",
    ],
    dataPath: "body",
  },
  // Respiratory
  respiratory: {
    questionIds: ["frequence-respiratoire", "respiration-moyenne"],
    dataPath: "respiratory",
  },
  // VO2 Max
  vo2max: {
    questionIds: ["vo2max", "vo2-max", "capacite-aerobique"],
    dataPath: "vo2max",
  },
};

interface TerraUser {
  userId: string;
  provider: TerraProvider;
  terraUserId: string;
  connectedAt: Date;
  lastSync: Date | null;
  scopes: string[];
}

interface TerraData {
  // HRV
  hrv?: {
    avg_hrv_sdnn: number;
    avg_hrv_rmssd: number;
    min_hrv: number;
    max_hrv: number;
  };
  // Sleep - FULL DATA
  sleep?: {
    duration_in_bed_seconds: number;
    duration_asleep_seconds: number;
    duration_deep_sleep_state_seconds: number;
    duration_rem_sleep_state_seconds: number;
    duration_light_sleep_state_seconds: number;
    duration_awake_seconds: number;
    num_awakenings: number;
    sleep_efficiency: number;
    sleep_latency_seconds: number;
    sleep_score: number;
    bedtime_start: string;
    bedtime_end: string;
  };
  // Heart Rate
  heart_rate?: {
    hr_resting: number;
    hr_avg: number;
    hr_max: number;
    hr_min: number;
  };
  // Activity - EXPANDED
  activity?: {
    steps: number;
    calories_total: number;
    calories_active: number;
    distance_meters: number;
    active_duration_seconds: number;
    sedentary_seconds: number;
    floors_climbed: number;
    low_intensity_seconds: number;
    medium_intensity_seconds: number;
    high_intensity_seconds: number;
    activity_score: number;
  };
  // Calories & Metabolism
  calories?: {
    calories_total: number;
    calories_active: number;
    calories_bmr: number; // Basal Metabolic Rate
    net_calories: number;
  };
  // Oxygen / SpO2
  oxygen?: {
    avg_saturation_percentage: number;
    min_saturation_percentage: number;
    max_saturation_percentage: number;
  };
  // Temperature
  temperature?: {
    body_temperature_celsius: number;
    skin_temperature_celsius: number;
    deviation_from_baseline: number;
  };
  // Stress & Recovery
  stress?: {
    stress_level: number; // 0-100
    recovery_score: number;
    stress_duration_seconds: number;
    rest_duration_seconds: number;
  };
  // Body Composition
  body?: {
    weight_kg: number;
    body_fat_percentage: number;
    muscle_mass_kg: number;
    water_percentage: number;
    bone_mass_kg: number;
    bmi: number;
    visceral_fat: number;
    metabolic_age: number;
  };
  // Respiratory
  respiratory?: {
    breaths_per_minute_avg: number;
    breaths_per_minute_min: number;
    breaths_per_minute_max: number;
  };
  // VO2 Max
  vo2max?: {
    vo2_max: number;
    fitness_age: number;
  };
  // Menstruation (if applicable)
  menstruation?: {
    cycle_day: number;
    period_length_days: number;
    cycle_length_days: number;
    is_predicted_fertile: boolean;
  };
}

/**
 * Generate a Terra widget session for user authentication
 *
 * @param userId - L'ID utilisateur unique
 * @param sitePrefix - Le prefix du site (neurocore, site2, site3) pour le multi-site dispatcher
 * @param providers - Les providers à afficher dans le widget
 * @param redirectUrl - URL de redirection après auth réussie
 */
export async function generateTerraWidget(
  userId: string,
  sitePrefix: string = "neurocore",
  providers?: TerraProvider[],
  redirectUrl?: string
): Promise<{ url: string; sessionId: string; referenceId: string } | null> {
  if (!TERRA_CONFIG.API_KEY || !TERRA_CONFIG.DEV_ID) {
    console.warn("[Terra] API not configured - skipping widget generation");
    return null;
  }

  // Créer le reference_id avec le prefix du site pour le dispatcher
  const referenceId = `${sitePrefix}_${userId}`;

  try {
    const response = await fetch(`${TERRA_CONFIG.BASE_URL}/auth/generateWidgetSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TERRA_CONFIG.API_KEY,
        "dev-id": TERRA_CONFIG.DEV_ID,
      },
      body: JSON.stringify({
        reference_id: referenceId,
        providers: providers?.join(",") || "OURA,GARMIN,FITBIT,WHOOP,POLAR,ULTRAHUMAN,WITHINGS",
        language: "fr",
        auth_success_redirect_url: redirectUrl || `${process.env.BASE_URL || "https://neurocore-360.onrender.com"}/audit-complet/questionnaire?terra_success=true`,
        auth_failure_redirect_url: `${process.env.BASE_URL || "https://neurocore-360.onrender.com"}/audit-complet/questionnaire?terra_error=true`,
      }),
    });

    if (!response.ok) {
      console.error("[Terra] Widget generation failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      url: data.url,
      sessionId: data.session_id,
      referenceId, // Include the reference_id for tracking
    };
  } catch (error) {
    console.error("[Terra] Widget generation error:", error);
    return null;
  }
}

/**
 * Get user's health data from Terra
 */
export async function getTerraUserData(
  terraUserId: string,
  dataTypes: ("daily" | "sleep" | "body" | "activity" | "menstruation" | "nutrition")[] = ["daily", "sleep", "body", "activity"]
): Promise<TerraData | null> {
  if (!TERRA_CONFIG.API_KEY || !TERRA_CONFIG.DEV_ID) {
    console.warn("[Terra] API not configured");
    return null;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const results: TerraData = {};

    for (const dataType of dataTypes) {
      const response = await fetch(
        `${TERRA_CONFIG.BASE_URL}/${dataType}?user_id=${terraUserId}&start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
        {
          headers: {
            "x-api-key": TERRA_CONFIG.API_KEY,
            "dev-id": TERRA_CONFIG.DEV_ID,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Merge data into results
        if (data.data && data.data.length > 0) {
          const latestData = data.data[data.data.length - 1]; // Most recent
          Object.assign(results, latestData);
        }
      }
    }

    return results;
  } catch (error) {
    console.error("[Terra] Error fetching user data:", error);
    return null;
  }
}

/**
 * Map Terra data to questionnaire answers - FULL VERSION
 * Returns which questions can be skipped and their values
 */
export function mapTerraDataToAnswers(terraData: TerraData): {
  answers: Record<string, unknown>;
  skippedQuestionIds: string[];
  summary: Record<string, unknown>;
} {
  const answers: Record<string, unknown> = {};
  const skippedQuestionIds: string[] = [];
  const summary: Record<string, unknown> = {};

  // ========== HRV ==========
  if (terraData.hrv) {
    const hrv = terraData.hrv;
    if (hrv.avg_hrv_sdnn) {
      answers["hrv-actuelle"] = hrv.avg_hrv_sdnn;
      answers["hrv-moyenne"] = hrv.avg_hrv_sdnn;
      answers["hrv-sdnn"] = hrv.avg_hrv_sdnn;
      summary["hrv_sdnn_ms"] = hrv.avg_hrv_sdnn;
    }
    if (hrv.avg_hrv_rmssd) {
      answers["hrv-rmssd"] = hrv.avg_hrv_rmssd;
      summary["hrv_rmssd_ms"] = hrv.avg_hrv_rmssd;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.hrv.questionIds);
  }

  // ========== SLEEP ==========
  if (terraData.sleep) {
    const sleep = terraData.sleep;

    // Durée totale
    if (sleep.duration_in_bed_seconds) {
      const hours = Math.round(sleep.duration_in_bed_seconds / 3600 * 10) / 10;
      answers["duree-sommeil"] = hours;
      summary["sleep_duration_hours"] = hours;
    }

    // Sommeil profond
    if (sleep.duration_deep_sleep_state_seconds) {
      const mins = Math.round(sleep.duration_deep_sleep_state_seconds / 60);
      answers["sommeil-profond"] = mins;
      summary["deep_sleep_minutes"] = mins;
    }

    // Sommeil léger
    if (sleep.duration_light_sleep_state_seconds) {
      const mins = Math.round(sleep.duration_light_sleep_state_seconds / 60);
      answers["sommeil-leger"] = mins;
      summary["light_sleep_minutes"] = mins;
    }

    // Sommeil REM
    if (sleep.duration_rem_sleep_state_seconds) {
      const mins = Math.round(sleep.duration_rem_sleep_state_seconds / 60);
      answers["sommeil-rem"] = mins;
      summary["rem_sleep_minutes"] = mins;
    }

    // Réveils
    if (sleep.num_awakenings !== undefined) {
      answers["reveils-nocturnes"] = sleep.num_awakenings;
      summary["awakenings"] = sleep.num_awakenings;
    }

    // Latence
    if (sleep.sleep_latency_seconds) {
      const mins = Math.round(sleep.sleep_latency_seconds / 60);
      answers["latence-endormissement"] = mins;
      summary["sleep_latency_minutes"] = mins;
    }

    // Efficacité
    if (sleep.sleep_efficiency) {
      answers["efficacite-sommeil"] = sleep.sleep_efficiency;
      answers["qualite-sommeil"] = sleep.sleep_efficiency >= 85 ? "excellent" :
                                   sleep.sleep_efficiency >= 75 ? "bon" :
                                   sleep.sleep_efficiency >= 65 ? "moyen" : "mauvais";
      summary["sleep_efficiency_percent"] = sleep.sleep_efficiency;
    }

    // Score sommeil
    if (sleep.sleep_score) {
      summary["sleep_score"] = sleep.sleep_score;
    }

    // Heures coucher/lever
    if (sleep.bedtime_start) {
      answers["heure-coucher"] = sleep.bedtime_start;
      summary["bedtime"] = sleep.bedtime_start;
    }
    if (sleep.bedtime_end) {
      answers["heure-lever"] = sleep.bedtime_end;
      summary["wake_time"] = sleep.bedtime_end;
    }

    skippedQuestionIds.push(...TERRA_DATA_MAPPING.sleep.questionIds);
  }

  // ========== HEART RATE ==========
  if (terraData.heart_rate) {
    const hr = terraData.heart_rate;
    if (hr.hr_resting) {
      answers["fc-repos"] = hr.hr_resting;
      answers["frequence-cardiaque-repos"] = hr.hr_resting;
      summary["resting_hr_bpm"] = hr.hr_resting;
    }
    if (hr.hr_avg) {
      answers["fc-moyenne"] = hr.hr_avg;
      summary["avg_hr_bpm"] = hr.hr_avg;
    }
    if (hr.hr_max) {
      answers["fc-max"] = hr.hr_max;
      summary["max_hr_bpm"] = hr.hr_max;
    }
    if (hr.hr_min) {
      answers["fc-min"] = hr.hr_min;
      summary["min_hr_bpm"] = hr.hr_min;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.heartRate.questionIds);
  }

  // ========== ACTIVITY & STEPS ==========
  if (terraData.activity) {
    const act = terraData.activity;

    // Pas
    if (act.steps) {
      answers["pas-quotidiens"] = act.steps;
      answers["nombre-pas"] = act.steps;
      summary["daily_steps"] = act.steps;
    }

    // Distance
    if (act.distance_meters) {
      const km = Math.round(act.distance_meters / 100) / 10;
      answers["distance-parcourue"] = km;
      summary["distance_km"] = km;
    }

    // Étages
    if (act.floors_climbed) {
      answers["etages-montes"] = act.floors_climbed;
      summary["floors_climbed"] = act.floors_climbed;
    }

    // Temps actif
    if (act.active_duration_seconds) {
      const mins = Math.round(act.active_duration_seconds / 60);
      answers["temps-actif"] = mins;
      summary["active_minutes"] = mins;
    }

    // Temps sédentaire
    if (act.sedentary_seconds) {
      const mins = Math.round(act.sedentary_seconds / 60);
      answers["temps-sedentaire"] = mins;
      summary["sedentary_minutes"] = mins;
    }

    // Calories totales
    if (act.calories_total) {
      answers["calories-totales"] = act.calories_total;
      answers["calories-brulees"] = act.calories_total;
      summary["calories_total"] = act.calories_total;
    }

    // Calories actives
    if (act.calories_active) {
      answers["calories-actives"] = act.calories_active;
      summary["calories_active"] = act.calories_active;
    }

    // Score activité
    if (act.activity_score) {
      summary["activity_score"] = act.activity_score;
    }

    skippedQuestionIds.push(...TERRA_DATA_MAPPING.activity.questionIds);
  }

  // ========== CALORIES & METABOLISM ==========
  if (terraData.calories) {
    const cal = terraData.calories;

    if (cal.calories_bmr) {
      answers["metabolisme-basal"] = cal.calories_bmr;
      answers["bmr"] = cal.calories_bmr;
      answers["calories-repos"] = cal.calories_bmr;
      summary["bmr_calories"] = cal.calories_bmr;
    }

    if (cal.calories_total) {
      answers["tdee"] = cal.calories_total;
      answers["depense-energetique"] = cal.calories_total;
      summary["tdee_calories"] = cal.calories_total;
    }

    skippedQuestionIds.push(...TERRA_DATA_MAPPING.calories.questionIds);
  }

  // ========== SpO2 ==========
  if (terraData.oxygen) {
    const ox = terraData.oxygen;
    if (ox.avg_saturation_percentage) {
      answers["saturation-oxygene"] = ox.avg_saturation_percentage;
      answers["spo2"] = ox.avg_saturation_percentage;
      summary["spo2_avg_percent"] = ox.avg_saturation_percentage;
    }
    if (ox.min_saturation_percentage) {
      summary["spo2_min_percent"] = ox.min_saturation_percentage;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.spo2.questionIds);
  }

  // ========== TEMPERATURE ==========
  if (terraData.temperature) {
    const temp = terraData.temperature;
    if (temp.body_temperature_celsius) {
      answers["temperature-corporelle"] = temp.body_temperature_celsius;
      summary["body_temp_celsius"] = temp.body_temperature_celsius;
    }
    if (temp.skin_temperature_celsius) {
      answers["temperature-peau"] = temp.skin_temperature_celsius;
      summary["skin_temp_celsius"] = temp.skin_temperature_celsius;
    }
    if (temp.deviation_from_baseline) {
      summary["temp_deviation"] = temp.deviation_from_baseline;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.temperature.questionIds);
  }

  // ========== STRESS & RECOVERY ==========
  if (terraData.stress) {
    const stress = terraData.stress;
    if (stress.stress_level !== undefined) {
      answers["niveau-stress"] = stress.stress_level;
      answers["score-stress"] = stress.stress_level;
      summary["stress_level"] = stress.stress_level;
    }
    if (stress.recovery_score) {
      answers["score-recuperation"] = stress.recovery_score;
      answers["recovery-score"] = stress.recovery_score;
      summary["recovery_score"] = stress.recovery_score;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.stress.questionIds);
  }

  // ========== BODY COMPOSITION ==========
  if (terraData.body) {
    const body = terraData.body;
    if (body.weight_kg) {
      answers["poids"] = body.weight_kg;
      summary["weight_kg"] = body.weight_kg;
    }
    if (body.body_fat_percentage) {
      answers["masse-grasse"] = body.body_fat_percentage;
      summary["body_fat_percent"] = body.body_fat_percentage;
    }
    if (body.muscle_mass_kg) {
      answers["masse-musculaire"] = body.muscle_mass_kg;
      summary["muscle_mass_kg"] = body.muscle_mass_kg;
    }
    if (body.water_percentage) {
      answers["eau-corporelle"] = body.water_percentage;
      summary["water_percent"] = body.water_percentage;
    }
    if (body.bone_mass_kg) {
      answers["masse-osseuse"] = body.bone_mass_kg;
      summary["bone_mass_kg"] = body.bone_mass_kg;
    }
    if (body.bmi) {
      answers["imc"] = body.bmi;
      summary["bmi"] = body.bmi;
    }
    if (body.visceral_fat) {
      answers["graisse-viscerale"] = body.visceral_fat;
      summary["visceral_fat"] = body.visceral_fat;
    }
    if (body.metabolic_age) {
      summary["metabolic_age"] = body.metabolic_age;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.body.questionIds);
  }

  // ========== RESPIRATORY ==========
  if (terraData.respiratory) {
    const resp = terraData.respiratory;
    if (resp.breaths_per_minute_avg) {
      answers["frequence-respiratoire"] = resp.breaths_per_minute_avg;
      answers["respiration-moyenne"] = resp.breaths_per_minute_avg;
      summary["respiratory_rate"] = resp.breaths_per_minute_avg;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.respiratory.questionIds);
  }

  // ========== VO2 MAX ==========
  if (terraData.vo2max) {
    if (terraData.vo2max.vo2_max) {
      answers["vo2max"] = terraData.vo2max.vo2_max;
      answers["vo2-max"] = terraData.vo2max.vo2_max;
      answers["capacite-aerobique"] = terraData.vo2max.vo2_max;
      summary["vo2_max"] = terraData.vo2max.vo2_max;
    }
    if (terraData.vo2max.fitness_age) {
      summary["fitness_age"] = terraData.vo2max.fitness_age;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.vo2max.questionIds);
  }

  return {
    answers,
    skippedQuestionIds: [...new Set(skippedQuestionIds)],
    summary, // Raw data summary for the report
  };
}

/**
 * Handle Terra webhook events with MULTI-SITE DISPATCHER
 *
 * Ce webhook reçoit TOUS les événements Terra pour tous les sites,
 * puis les dispatch vers le bon site selon le reference_id.
 */
export async function handleTerraWebhook(
  payload: unknown,
  signature: string
): Promise<{ success: boolean; message: string; site?: string }> {
  // Verify webhook signature
  // TODO: Implement signature verification with TERRA_CONFIG.WEBHOOK_SECRET

  const event = payload as any;
  const referenceId = event.user?.reference_id || "";

  // Dispatch vers le bon site
  const dispatchResult = await dispatchTerraData(referenceId, event.type, event);

  // Si dispatché vers un site externe, on a fini
  if (dispatchResult.dispatched && dispatchResult.site !== "Neurocore 360") {
    return {
      success: true,
      message: `Event dispatched to ${dispatchResult.site}`,
      site: dispatchResult.site,
    };
  }

  // Sinon, traiter localement pour Neurocore
  switch (event.type) {
    case "auth":
      console.log(`[Terra] User authenticated: ${referenceId} via ${event.user?.provider}`);
      // Store Terra user connection
      return { success: true, message: "Auth event processed", site: "Neurocore 360" };

    case "deauth":
      console.log(`[Terra] User deauthenticated: ${referenceId}`);
      return { success: true, message: "Deauth event processed", site: "Neurocore 360" };

    case "user_reauth":
      console.log(`[Terra] User re-authenticated: ${referenceId}`);
      return { success: true, message: "Reauth event processed", site: "Neurocore 360" };

    default:
      // Data events (daily, sleep, body, etc.)
      console.log(`[Terra] Data event: ${event.type} for user ${referenceId}`);
      return { success: true, message: "Data event processed", site: "Neurocore 360" };
  }
}

/**
 * Check if Terra API is configured
 */
export function isTerraConfigured(): boolean {
  return !!(TERRA_CONFIG.API_KEY && TERRA_CONFIG.DEV_ID);
}

/**
 * Get list of supported providers with their status
 */
export function getSupportedProviders() {
  return TERRA_PROVIDERS.map((p) => ({
    ...p,
    available: isTerraConfigured(),
  }));
}
