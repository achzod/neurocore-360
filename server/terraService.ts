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
// APPLE fonctionne via Terra Avengers App (l'user télécharge l'app iOS)
// 8 sources actives sur Terra (configurées dans dashboard)
// API = connexion directe 1 clic
// SDK = nécessite l'app Terra Avengers sur le téléphone
export const TERRA_PROVIDERS = [
  { id: "APPLE", name: "Apple Health", icon: "🍎", requiresWidget: true, note: "SDK - Via Terra Avengers App", active: true },
  { id: "OURA", name: "Oura Ring", icon: "💍", requiresWidget: false, note: "API", active: true },
  { id: "GARMIN", name: "Garmin", icon: "🏃", requiresWidget: false, note: "API", active: true },
  { id: "FITBIT", name: "Fitbit", icon: "💪", requiresWidget: false, note: "API", active: true },
  { id: "GOOGLE", name: "Google Fit", icon: "🟢", requiresWidget: true, note: "SDK - Via Terra Avengers App", active: true },
  { id: "SAMSUNG", name: "Samsung Health", icon: "📱", requiresWidget: true, note: "SDK - Via Terra Avengers App", active: true },
  { id: "ULTRAHUMAN", name: "Ultrahuman", icon: "🔬", requiresWidget: false, note: "API", active: true },
  { id: "WITHINGS", name: "Withings", icon: "⚖️", requiresWidget: false, note: "API", active: true },
  { id: "HUAWEI", name: "Huawei Health", icon: "📲", requiresWidget: false, note: "API - Web OAuth", active: true },
] as const;

export type TerraProvider = typeof TERRA_PROVIDERS[number]["id"];

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
 * IMPORTANT: Pour Apple Health sur iPhone, on utilise Terra Avengers App!
 * L'user télécharge l'app, connecte Apple Health, et les données arrivent via webhook.
 *
 * @param userId - L'ID utilisateur unique
 * @param sitePrefix - Le prefix du site (neurocore, site2, site3) pour le multi-site dispatcher
 * @param providers - Les providers à afficher dans le widget
 * @param redirectUrl - URL de redirection après auth réussie
 * @param useAppleHealth - Si true, active Terra Avengers pour Apple Health (iPhone users)
 */
export async function generateTerraWidget(
  userId: string,
  sitePrefix: string = "neurocore",
  providers?: TerraProvider[],
  redirectUrl?: string,
  useAppleHealth: boolean = true
): Promise<{ url: string; sessionId: string; referenceId: string } | null> {
  if (!TERRA_CONFIG.API_KEY || !TERRA_CONFIG.DEV_ID) {
    console.warn("[Terra] API not configured - skipping widget generation");
    return null;
  }

  // Créer le reference_id avec le prefix du site pour le dispatcher
  // IMPORTANT: sanitize le userId pour éviter les caractères spéciaux qui cassent l'URL
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const referenceId = `${sitePrefix}_${sanitizedUserId}_${Date.now()}`;

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
        providers: providers?.join(",") || "APPLE,OURA,GARMIN,FITBIT,GOOGLE,SAMSUNG,ULTRAHUMAN,WITHINGS,WHOOP,HUAWEI",
        language: "fr",
        // TERRA AVENGERS: Permet aux users iPhone de connecter Apple Health via l'app Terra Avengers
        // L'app est déjà sur l'App Store, l'user la télécharge et autorise Apple Health
        // Les données sont ensuite envoyées automatiquement à notre webhook
        use_terra_avengers_app: useAppleHealth,
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

  const pushAnswer = (id: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    answers[id] = value;
    skippedQuestionIds.push(id);
  };

  const mapHrvRange = (value: number): string => {
    if (value < 30) return "moins-30";
    if (value < 50) return "30-50";
    if (value < 70) return "50-70";
    return "70+";
  };

  const mapRestingHrRange = (value: number): string => {
    if (value < 50) return "moins-50";
    if (value < 60) return "50-60";
    if (value < 70) return "60-70";
    if (value < 80) return "70-80";
    return "80+";
  };

  const mapSleepHoursRange = (hours: number): string => {
    if (hours < 5) return "moins-5";
    if (hours < 6) return "5-6";
    if (hours < 7) return "6-7";
    if (hours < 8) return "7-8";
    return "8+";
  };

  const mapSleepQuality = (efficiency?: number): string | null => {
    if (efficiency === undefined || efficiency === null) return null;
    const percent = efficiency <= 1 ? efficiency * 100 : efficiency;
    if (percent >= 85) return "excellente";
    if (percent >= 75) return "bonne";
    if (percent >= 65) return "moyenne";
    return "mauvaise";
  };

  const mapSleepLatency = (minutes: number): string => {
    if (minutes <= 15) return "jamais";
    if (minutes <= 30) return "parfois";
    if (minutes <= 60) return "souvent";
    return "toujours";
  };

  const mapAwakenings = (count: number): string => {
    if (count <= 0) return "jamais";
    if (count <= 2) return "parfois";
    if (count <= 4) return "souvent";
    return "chaque-nuit";
  };

  const mapBedtime = (value: string): string | null => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const hour = date.getHours();
    if (hour < 22) return "avant-22h";
    if (hour < 23) return "22h-23h";
    if (hour < 24) return "23h-00h";
    return "apres-00h";
  };

  // ========== HRV ==========
  if (terraData.hrv) {
    const hrv = terraData.hrv;
    const hrvValue = hrv.avg_hrv_sdnn ?? hrv.avg_hrv_rmssd;
    if (hrvValue) {
      pushAnswer("hrv-mesure", "regulierement");
      pushAnswer("hrv-valeur", mapHrvRange(hrvValue));
      summary["hrv_ms"] = hrvValue;
    }
    if (hrv.avg_hrv_sdnn) {
      summary["hrv_sdnn_ms"] = hrv.avg_hrv_sdnn;
    }
    if (hrv.avg_hrv_rmssd) {
      summary["hrv_rmssd_ms"] = hrv.avg_hrv_rmssd;
    }
  }

  // ========== SLEEP ==========
  if (terraData.sleep) {
    const sleep = terraData.sleep;
    const totalSleepSeconds =
      sleep.duration_in_bed_seconds ||
      sleep.duration_asleep_seconds ||
      (sleep.duration_deep_sleep_state_seconds &&
      sleep.duration_light_sleep_state_seconds &&
      sleep.duration_rem_sleep_state_seconds
        ? sleep.duration_deep_sleep_state_seconds +
          sleep.duration_light_sleep_state_seconds +
          sleep.duration_rem_sleep_state_seconds
        : null);

    if (totalSleepSeconds) {
      const hours = Math.round((totalSleepSeconds / 3600) * 10) / 10;
      pushAnswer("heures-sommeil", mapSleepHoursRange(hours));
      summary["sleep_duration_hours"] = hours;
    }

    const efficiency = sleep.sleep_efficiency ?? sleep.sleep_score;
    const quality = mapSleepQuality(efficiency);
    if (quality) {
      pushAnswer("qualite-sommeil", quality);
      summary["sleep_quality_score"] = efficiency;
    }

    if (sleep.sleep_latency_seconds !== undefined) {
      const mins = Math.round(sleep.sleep_latency_seconds / 60);
      pushAnswer("endormissement", mapSleepLatency(mins));
      summary["sleep_latency_minutes"] = mins;
    }

    if (sleep.num_awakenings !== undefined) {
      pushAnswer("reveils-nocturnes", mapAwakenings(sleep.num_awakenings));
      summary["awakenings"] = sleep.num_awakenings;
    }

    if (sleep.bedtime_start) {
      const bedtimeBucket = mapBedtime(sleep.bedtime_start);
      if (bedtimeBucket) {
        pushAnswer("heure-coucher", bedtimeBucket);
        summary["bedtime"] = sleep.bedtime_start;
      }
    }
  }

  // ========== HEART RATE ==========
  if (terraData.heart_rate) {
    const hr = terraData.heart_rate;
    if (hr.hr_resting) {
      pushAnswer("fc-repos", mapRestingHrRange(hr.hr_resting));
      summary["resting_hr_bpm"] = hr.hr_resting;
    }
    if (hr.hr_avg) {
      summary["avg_hr_bpm"] = hr.hr_avg;
    }
    if (hr.hr_max) {
      summary["max_hr_bpm"] = hr.hr_max;
    }
    if (hr.hr_min) {
      summary["min_hr_bpm"] = hr.hr_min;
    }
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
  const terraUserId = event.user?.user_id || null;
  const provider = event.user?.provider || null;

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

  // Import storage dynamically to avoid circular dependency
  const { storage } = await import("./storage");

  // TOUJOURS sauvegarder les données en DB (très important !)
  try {
    await storage.saveTerraData(referenceId, terraUserId, provider, event.type, event);
    console.log(`[Terra] Saved ${event.type} data to DB for ${referenceId}`);
  } catch (err) {
    console.error(`[Terra] Failed to save data to DB:`, err);
  }

  // Traiter localement pour Neurocore
  switch (event.type) {
    case "auth":
      console.log(`[Terra] User authenticated: ${referenceId} via ${provider}`);
      return { success: true, message: "Auth event saved to DB", site: "Neurocore 360" };

    case "deauth":
      console.log(`[Terra] User deauthenticated: ${referenceId}`);
      return { success: true, message: "Deauth event saved to DB", site: "Neurocore 360" };

    case "user_reauth":
      console.log(`[Terra] User re-authenticated: ${referenceId}`);
      return { success: true, message: "Reauth event saved to DB", site: "Neurocore 360" };

    case "daily":
    case "sleep":
    case "body":
    case "activity":
    case "nutrition":
    case "menstruation":
      console.log(`[Terra] Health data (${event.type}) received for ${referenceId} - SAVED TO DB`);
      return { success: true, message: `${event.type} data saved to DB`, site: "Neurocore 360" };

    default:
      console.log(`[Terra] Unknown event type: ${event.type} for ${referenceId} - SAVED TO DB`);
      return { success: true, message: "Event saved to DB", site: "Neurocore 360" };
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
