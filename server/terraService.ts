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

// Data mapping from Terra to questionnaire questions
export const TERRA_DATA_MAPPING = {
  // HRV data -> skip HRV questions
  hrv: {
    questionIds: ["hrv-actuelle", "hrv-moyenne", "variabilite-cardiaque"],
    dataPath: "hrv.avg_hrv_sdnn",
    unit: "ms",
  },
  // Sleep data -> skip sleep questions
  sleep: {
    questionIds: [
      "duree-sommeil",
      "sommeil-profond",
      "reveils-nocturnes",
      "latence-endormissement",
      "qualite-sommeil",
    ],
    dataPath: "sleep",
    fields: {
      duration: "sleep.duration_in_bed_seconds",
      deepSleep: "sleep.duration_deep_sleep_state_seconds",
      remSleep: "sleep.duration_rem_sleep_state_seconds",
      awakenings: "sleep.num_awakenings",
      efficiency: "sleep.sleep_efficiency",
      latency: "sleep.sleep_latency_seconds",
    },
  },
  // Heart rate data -> skip HR questions
  heartRate: {
    questionIds: ["fc-repos", "fc-max", "frequence-cardiaque-repos"],
    dataPath: "heart_rate",
    fields: {
      resting: "heart_rate.hr_resting",
      avg: "heart_rate.hr_avg",
      max: "heart_rate.hr_max",
    },
  },
  // Activity data -> skip activity questions
  activity: {
    questionIds: ["pas-quotidiens", "activite-physique-quotidienne", "calories-brulees"],
    dataPath: "activity",
    fields: {
      steps: "activity.steps",
      calories: "activity.calories_total",
      activeMinutes: "activity.active_durations_data.activity_seconds",
    },
  },
  // SpO2 data
  spo2: {
    questionIds: ["saturation-oxygene", "spo2"],
    dataPath: "oxygen.avg_saturation_percentage",
    unit: "%",
  },
  // Body temperature
  temperature: {
    questionIds: ["temperature-corporelle", "temp-basale"],
    dataPath: "temperature.body_temperature_celsius",
    unit: "°C",
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
  hrv?: {
    avg_hrv_sdnn: number;
    avg_hrv_rmssd: number;
  };
  sleep?: {
    duration_in_bed_seconds: number;
    duration_deep_sleep_state_seconds: number;
    duration_rem_sleep_state_seconds: number;
    duration_light_sleep_state_seconds: number;
    num_awakenings: number;
    sleep_efficiency: number;
    sleep_latency_seconds: number;
  };
  heart_rate?: {
    hr_resting: number;
    hr_avg: number;
    hr_max: number;
    hr_min: number;
  };
  activity?: {
    steps: number;
    calories_total: number;
    distance_meters: number;
    active_duration_seconds: number;
  };
  oxygen?: {
    avg_saturation_percentage: number;
  };
  temperature?: {
    body_temperature_celsius: number;
  };
}

/**
 * Generate a Terra widget session for user authentication
 */
export async function generateTerraWidget(
  userId: string,
  providers?: TerraProvider[],
  redirectUrl?: string
): Promise<{ url: string; sessionId: string } | null> {
  if (!TERRA_CONFIG.API_KEY || !TERRA_CONFIG.DEV_ID) {
    console.warn("[Terra] API not configured - skipping widget generation");
    return null;
  }

  try {
    const response = await fetch(`${TERRA_CONFIG.BASE_URL}/auth/generateWidgetSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TERRA_CONFIG.API_KEY,
        "dev-id": TERRA_CONFIG.DEV_ID,
      },
      body: JSON.stringify({
        reference_id: userId,
        providers: providers?.join(",") || "OURA,GARMIN,FITBIT,WHOOP,POLAR,ULTRAHUMAN",
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
 * Map Terra data to questionnaire answers
 * Returns which questions can be skipped and their values
 */
export function mapTerraDataToAnswers(terraData: TerraData): {
  answers: Record<string, unknown>;
  skippedQuestionIds: string[];
} {
  const answers: Record<string, unknown> = {};
  const skippedQuestionIds: string[] = [];

  // HRV
  if (terraData.hrv?.avg_hrv_sdnn) {
    answers["hrv-actuelle"] = terraData.hrv.avg_hrv_sdnn;
    answers["hrv-moyenne"] = terraData.hrv.avg_hrv_sdnn;
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.hrv.questionIds);
  }

  // Sleep
  if (terraData.sleep) {
    const sleep = terraData.sleep;
    if (sleep.duration_in_bed_seconds) {
      answers["duree-sommeil"] = Math.round(sleep.duration_in_bed_seconds / 3600 * 10) / 10; // hours
    }
    if (sleep.duration_deep_sleep_state_seconds) {
      answers["sommeil-profond"] = Math.round(sleep.duration_deep_sleep_state_seconds / 60); // minutes
    }
    if (sleep.num_awakenings !== undefined) {
      answers["reveils-nocturnes"] = sleep.num_awakenings;
    }
    if (sleep.sleep_latency_seconds) {
      answers["latence-endormissement"] = Math.round(sleep.sleep_latency_seconds / 60); // minutes
    }
    if (sleep.sleep_efficiency) {
      answers["qualite-sommeil"] = sleep.sleep_efficiency >= 85 ? "excellent" :
                                   sleep.sleep_efficiency >= 75 ? "bon" :
                                   sleep.sleep_efficiency >= 65 ? "moyen" : "mauvais";
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.sleep.questionIds);
  }

  // Heart Rate
  if (terraData.heart_rate) {
    const hr = terraData.heart_rate;
    if (hr.hr_resting) {
      answers["fc-repos"] = hr.hr_resting;
      answers["frequence-cardiaque-repos"] = hr.hr_resting;
    }
    if (hr.hr_max) {
      answers["fc-max"] = hr.hr_max;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.heartRate.questionIds);
  }

  // Activity
  if (terraData.activity) {
    const activity = terraData.activity;
    if (activity.steps) {
      answers["pas-quotidiens"] = activity.steps;
    }
    if (activity.calories_total) {
      answers["calories-brulees"] = activity.calories_total;
    }
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.activity.questionIds);
  }

  // SpO2
  if (terraData.oxygen?.avg_saturation_percentage) {
    answers["saturation-oxygene"] = terraData.oxygen.avg_saturation_percentage;
    answers["spo2"] = terraData.oxygen.avg_saturation_percentage;
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.spo2.questionIds);
  }

  // Temperature
  if (terraData.temperature?.body_temperature_celsius) {
    answers["temperature-corporelle"] = terraData.temperature.body_temperature_celsius;
    skippedQuestionIds.push(...TERRA_DATA_MAPPING.temperature.questionIds);
  }

  return {
    answers,
    skippedQuestionIds: [...new Set(skippedQuestionIds)], // Remove duplicates
  };
}

/**
 * Handle Terra webhook events
 */
export async function handleTerraWebhook(
  payload: unknown,
  signature: string
): Promise<{ success: boolean; message: string }> {
  // Verify webhook signature
  // TODO: Implement signature verification with TERRA_CONFIG.WEBHOOK_SECRET

  const event = payload as any;

  switch (event.type) {
    case "auth":
      console.log(`[Terra] User authenticated: ${event.user?.reference_id} via ${event.user?.provider}`);
      // Store Terra user connection
      return { success: true, message: "Auth event processed" };

    case "deauth":
      console.log(`[Terra] User deauthenticated: ${event.user?.reference_id}`);
      return { success: true, message: "Deauth event processed" };

    case "user_reauth":
      console.log(`[Terra] User re-authenticated: ${event.user?.reference_id}`);
      return { success: true, message: "Reauth event processed" };

    default:
      // Data events (daily, sleep, body, etc.)
      console.log(`[Terra] Data event: ${event.type} for user ${event.user?.reference_id}`);
      return { success: true, message: "Data event processed" };
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
